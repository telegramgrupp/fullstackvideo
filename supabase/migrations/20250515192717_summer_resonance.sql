/*
  # Add test users for email login

  1. Changes
    - Enable pgcrypto extension
    - Add test users to auth.users table
  
  2. Security
    - Use encrypted passwords
    - Set email_confirmed_at to allow immediate login
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES
('test_user_1', 'test1@example.com', crypt('password123', gen_salt('bf')), NOW()),
('test_user_2', 'test2@example.com', crypt('password123', gen_salt('bf')), NOW())
ON CONFLICT (id) DO NOTHING;