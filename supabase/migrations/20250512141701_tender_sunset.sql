/*
  # Fix transactions RLS policies and constraints

  1. Changes
    - Update RLS policies for transactions table to properly handle purchase transactions
    - Add constraints to ensure transaction amounts match their types
    - Ensure proper user authentication checks
  
  2. Security
    - Maintain user data isolation
    - Validate transaction types and amounts
    - Allow authenticated users to create valid purchase transactions
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
    AND (
      (type = 'purchase' AND amount > 0)
      OR (type = 'spend' AND amount < 0)
    )
    AND status = 'completed'
  );

-- Add policy for service role
CREATE POLICY "Service role can manage all transactions"
  ON transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);