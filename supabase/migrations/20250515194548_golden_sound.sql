-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to generate a UUID from email
CREATE OR REPLACE FUNCTION generate_consistent_uuid(email text)
RETURNS uuid AS $$
BEGIN
  -- Use MD5 to generate a consistent hash from email, then convert to UUID
  RETURN CAST(CONCAT(
    SUBSTR(MD5(email), 1, 8), '-',
    SUBSTR(MD5(email), 9, 4), '-',
    SUBSTR(MD5(email), 13, 4), '-',
    SUBSTR(MD5(email), 17, 4), '-',
    SUBSTR(MD5(email), 21, 12)
  ) AS uuid);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Insert test users with proper authentication setup
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  banned_until,
  reauthentication_token,
  is_sso_user,
  deleted_at
)
VALUES
  -- test1@example.com user
  (
    '00000000-0000-0000-0000-000000000000',
    generate_consistent_uuid('test1@example.com'),
    'authenticated',
    'authenticated',
    'test1@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Test User 1", "gender": "male", "country": "US"}',
    FALSE,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    FALSE,
    NULL
  ),
  -- test2@example.com user
  (
    '00000000-0000-0000-0000-000000000000',
    generate_consistent_uuid('test2@example.com'),
    'authenticated',
    'authenticated',
    'test2@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Test User 2", "gender": "female", "country": "US"}',
    FALSE,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    FALSE,
    NULL
  )
ON CONFLICT (email) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  updated_at = NOW(),
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Ensure identities are set up correctly
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  id,
  id,
  json_build_object('sub', id::text, 'email', email),
  'email',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email IN ('test1@example.com', 'test2@example.com')
ON CONFLICT (provider, provider_id) DO NOTHING;