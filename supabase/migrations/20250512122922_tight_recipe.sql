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

-- Create new policies with proper checks
CREATE POLICY "Users can create own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid()::text = user_id
    AND (type IN ('purchase', 'spend'))
  );

-- Add policy for service role
CREATE POLICY "Service role can manage all transactions"
  ON transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);