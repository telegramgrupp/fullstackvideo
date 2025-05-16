-- USERS
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text NOT NULL,
  gender text,
  country text,
  coins integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  is_online boolean DEFAULT false,
  is_banned boolean DEFAULT false
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id),
  amount integer NOT NULL,
  type text NOT NULL,
  reason text,
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- MATCHES
CREATE TABLE IF NOT EXISTS matches (
  id text PRIMARY KEY,
  peer_a text REFERENCES users(id),
  peer_b text REFERENCES users(id),
  is_fake boolean DEFAULT false,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration integer,
  updated_at timestamptz DEFAULT now(),
  video_url text
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read matches they're part of"
  ON matches
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = peer_a OR auth.uid()::text = peer_b);

CREATE POLICY "Users can create matches"
  ON matches
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = peer_a);

CREATE POLICY "Users can update own matches"
  ON matches
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = peer_a);

-- REPORTS
CREATE TABLE IF NOT EXISTS reports (
  id text PRIMARY KEY,
  reporter_id text REFERENCES users(id),
  reported_id text REFERENCES users(id),
  match_id text REFERENCES matches(id),
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  resolved boolean DEFAULT false
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = reporter_id);

CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = reporter_id);

-- ADMINS
CREATE TABLE IF NOT EXISTS admins (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Replace this with a real password or define `app.admin_password` in your Supabase env vars
INSERT INTO admins (password)
VALUES (coalesce(current_setting('app.admin_password', true), 'admin123'));