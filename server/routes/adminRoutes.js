import express from 'express';
import { supabaseAdmin as supabase } from '../lib/supabaseAdmin.js';

export default function adminRoutes() {
  const router = express.Router();

  // Admin login
  router.post('/login', async (req, res) => {
    console.log('Admin login attempt received:', req.body);
    
    const { password } = req.body;
    
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('password', password)
        .single();
      
      if (error || !data) {
        console.log('Admin login failed: invalid password');
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid password' 
        });
      }
      
      console.log('Admin login successful');
      res.json({ 
        success: true,
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Server error' 
      });
    }
  });

  // Get admin stats
  router.get('/stats', async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [
        { count: userCount },
        { count: onlineUserCount },
        { count: matchCount },
        { count: matchesTodayCount },
        { data: transactions },
        { data: transactionsToday },
        { count: reportCount },
        { count: reportsTodayCount }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_online', true),
        supabase.from('matches').select('*', { count: 'exact', head: true }),
        supabase.from('matches').select('*', { count: 'exact', head: true }).gte('started_at', today.toISOString()),
        supabase.from('transactions').select('amount').eq('type', 'spend'),
        supabase.from('transactions').select('amount').eq('type', 'spend').gte('created_at', today.toISOString()),
        supabase.from('reports').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString())
      ]);
      
      const totalCoinsSpent = transactions?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
      const coinsSpentToday = transactionsToday?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
      
      res.json({
        totalUsers: userCount,
        onlineUsers: onlineUserCount,
        totalMatches: matchCount,
        matchesToday: matchesTodayCount,
        totalCoinsSpent,
        coinsSpentToday,
        totalReports: reportCount,
        reportsToday: reportsTodayCount
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}