-- ====================================
-- TABLE: admins
-- Stores admin users with special privileges
-- ====================================

CREATE TABLE IF NOT EXISTS admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE admins IS 'Stores admin users with special privileges. No roles, just a simple lookup table.';

-- Index
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);

-- ====================================
-- ROW LEVEL SECURITY
-- ====================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own admin status
-- This prevents non-admins from seeing who is admin
CREATE POLICY "Users can read their own admin status" ON admins
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Nobody can insert/update/delete via client
-- Admins must be managed via Supabase dashboard or service role
CREATE POLICY "No client mutations on admins" ON admins
  FOR ALL
  USING (false);
