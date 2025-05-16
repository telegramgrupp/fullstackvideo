/*
  # Add max file size column to matches table

  1. Changes
    - Add max_file_size column to matches table
    - Set default max file size to 100MB
    - Add check constraint to ensure valid file sizes
  
  2. Security
    - Maintain existing RLS policies
    - Add validation for file size limits
*/

-- Add max_file_size column with default 100MB (in bytes)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS max_file_size bigint DEFAULT 104857600;

-- Add check constraint to ensure valid file sizes
ALTER TABLE matches ADD CONSTRAINT matches_max_file_size_check 
  CHECK (max_file_size > 0 AND max_file_size <= 524288000); -- Max 500MB

-- Update existing matches to have the default max file size
UPDATE matches SET max_file_size = 104857600 WHERE max_file_size IS NULL;