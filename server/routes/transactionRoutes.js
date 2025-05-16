import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin as supabase } from '../lib/supabaseAdmin.js';

export default function transactionRoutes() {
  const router = express.Router();

  // Get user transactions
  router.get('/user/:userId', async (req, res) => {
    const userId = req.params.userId;
    console.log('📊 Fetching transactions for user:', userId);
    
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching transactions:', {
          userId,
          error: error.message,
          details: error.details,
          hint: error.hint
        });
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch transactions'
        });
      }

      console.log(`✅ Successfully fetched ${transactions?.length || 0} transactions for user:`, userId);
      res.json({ success: true, data: transactions });
    } catch (error) {
      console.error('💥 Unexpected error fetching transactions:', {
        userId,
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Unexpected error'
      });
    }
  });

  // Create transaction
  router.post('/', async (req, res) => {
    const { userId, amount, type, reason } = req.body;
    console.log('🔄 Processing new transaction:', {
      userId,
      amount,
      type,
      reason,
      timestamp: new Date().toISOString()
    });

    try {
      // Validate input
      if (!userId || amount === undefined || !type || !reason) {
        console.warn('⚠️ Invalid transaction request:', {
          userId,
          amount,
          type,
          reason,
          missingFields: {
            userId: !userId,
            amount: amount === undefined,
            type: !type,
            reason: !reason
          }
        });
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }

      // Validate transaction type
      if (!['purchase', 'spend'].includes(type)) {
        console.warn('⚠️ Invalid transaction type:', {
          userId,
          type,
          allowedTypes: ['purchase', 'spend']
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid transaction type'
        });
      }

      // Get user and validate existence
      console.log('👤 Fetching user data:', userId);
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('coins')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('❌ User fetch error:', {
          userId,
          error: userError?.message,
          details: userError?.details,
          userFound: !!user
        });
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      console.log('💰 Current user balance:', {
        userId,
        coins: user.coins
      });

      // Validate amount
      const absAmount = Math.abs(amount);
      if (absAmount <= 0) {
        console.warn('⚠️ Invalid transaction amount:', {
          userId,
          amount,
          absAmount
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid amount'
        });
      }

      // Check sufficient balance for spend transactions
      if (type === 'spend' && user.coins < absAmount) {
        console.warn('⚠️ Insufficient coins for transaction:', {
          userId,
          currentCoins: user.coins,
          requestedAmount: absAmount,
          deficit: absAmount - user.coins
        });
        return res.status(400).json({
          success: false,
          error: 'Insufficient coins'
        });
      }

      // Calculate new balance
      const newBalance = type === 'purchase' 
        ? user.coins + absAmount
        : user.coins - absAmount;

      console.log('💱 Transaction calculation:', {
        userId,
        oldBalance: user.coins,
        amount: absAmount,
        type,
        newBalance
      });

      // Create transaction record first
      console.log('📝 Creating transaction record...');
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          id: uuidv4(),
          user_id: userId,
          amount: type === 'purchase' ? absAmount : -absAmount,
          type,
          reason,
          status: 'completed'
        })
        .select()
        .single();

      if (transactionError) {
        console.error('❌ Transaction creation error:', {
          userId,
          error: transactionError.message,
          details: transactionError.details,
          hint: transactionError.hint
        });
        return res.status(500).json({
          success: false,
          error: 'Failed to create transaction'
        });
      }

      console.log('✅ Transaction record created:', {
        transactionId: transaction.id,
        userId,
        amount: transaction.amount
      });

      // Update user's balance
      console.log('💰 Updating user balance...');
      const { error: updateError } = await supabase
        .from('users')
        .update({ coins: newBalance })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Balance update error:', {
          userId,
          oldBalance: user.coins,
          newBalance,
          error: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });

        // Rollback transaction if balance update fails
        console.log('🔄 Rolling back transaction:', transaction.id);
        const { error: rollbackError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transaction.id);

        if (rollbackError) {
          console.error('❌ Rollback failed:', {
            transactionId: transaction.id,
            error: rollbackError.message
          });
        } else {
          console.log('✅ Transaction rolled back successfully');
        }
          
        return res.status(500).json({
          success: false,
          error: 'Failed to update balance'
        });
      }

      console.log('✅ Transaction completed successfully:', {
        transactionId: transaction.id,
        userId,
        oldBalance: user.coins,
        newBalance,
        type,
        amount: transaction.amount
      });

      res.json({
        success: true,
        data: {
          transaction,
          newBalance
        }
      });

    } catch (error) {
      console.error('💥 Unexpected transaction error:', {
        userId,
        error: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      res.status(500).json({
        success: false,
        error: error.message || 'Unexpected error during transaction'
      });
    }
  });

  return router;
}
