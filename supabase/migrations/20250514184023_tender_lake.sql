/*
  # Add chat features and match history

  1. New Tables
    - `messages` table for storing chat messages
      - `id` (uuid, primary key)
      - `match_id` (reference to matches)
      - `sender_id` (reference to users)
      - `content` (text)
      - `is_super` (boolean)
      - `created_at` (timestamp)
    
  2. Changes
    - Add `chat_enabled` column to matches table
    
  3. Security
    - Enable RLS on messages table
    - Add policies for message access control
*/

-- Add chat_enabled column to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS chat_enabled boolean DEFAULT true;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text REFERENCES matches(id) ON DELETE CASCADE,
  sender_id text REFERENCES users(id),
  content text NOT NULL,
  is_super boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_message_length CHECK (char_length(content) > 0 AND char_length(content) <= 1000)
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read messages from their matches"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.peer_a = auth.uid()::text OR matches.peer_b = auth.uid()::text)
    )
  );

CREATE POLICY "Users can send messages to their matches"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.peer_a = auth.uid()::text OR matches.peer_b = auth.uid()::text)
      AND matches.chat_enabled = true
    )
  );