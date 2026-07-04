-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_votes ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- DOWNLOADS
CREATE POLICY "Users can view own downloads" ON downloads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own downloads" ON downloads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own downloads" ON downloads
  FOR DELETE USING (auth.uid() = user_id);

-- REQUESTS
CREATE POLICY "Anyone can view requests" ON requests
  FOR SELECT USING (true);

CREATE POLICY "Users can create requests" ON requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update requests" ON requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- REQUEST VOTES
CREATE POLICY "Anyone can view votes" ON request_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can vote" ON request_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own vote" ON request_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Add admin role column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create admin check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
