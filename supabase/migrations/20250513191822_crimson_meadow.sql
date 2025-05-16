/*
  # Add user profile fields

  1. Changes
    - Add bio and interests columns to users table
    - Set default values and constraints
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add bio column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;

-- Add interests column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';

-- Add check constraint for interests array length
ALTER TABLE users ADD CONSTRAINT interests_length_check 
  CHECK (array_length(interests, 1) <= 15);