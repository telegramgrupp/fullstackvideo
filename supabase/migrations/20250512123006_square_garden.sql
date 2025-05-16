/*
  # Fix transactions RLS policies

  1. Changes
    - Update RLS policies for transactions table to allow authenticated users to create transactions
    - Add policy for service role to manage transactions
  
  2. Security
    - Maintain user data isolation
    - Allow service role to bypass RLS for administrative functions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;
DROP POLICY IF EXISTS "Service role can manage all transactions" ON transactions;

-- Create new policies with proper checks
CREATE POLICY "Users can create own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    AND type IN ('purchase', 'spend')
    AND (
      (type = 'spend' AND amount < 0) OR
      (type = 'purchase' AND amount > 0)
    )
  );

-- Add policy for service role
CREATE POLICY "Service role can manage all transactions"
  ON transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);