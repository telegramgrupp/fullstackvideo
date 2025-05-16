/*
  # Add age column to users table

  1. Changes
    - Add age column to users table
    - Add check constraint for valid age range
    - Add index for age-based filtering
  
  2. Security
    - Maintain existing RLS policies
    - Ensure age is within valid range (18-100)
*/

-- Add age column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS age integer;

-- Add check constraint for valid age range
ALTER TABLE users ADD CONSTRAINT age_range_check 
  CHECK (age IS NULL OR (age >= 18 AND age <= 100));

-- Create index for age-based filtering
CREATE INDEX IF NOT EXISTS users_age_idx ON users (age);