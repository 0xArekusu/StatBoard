-- Create subscription_plans table to store limits for each tier
CREATE TABLE IF NOT EXISTS subscription_plans (
  tier subscription_tier PRIMARY KEY,
  name TEXT NOT NULL,
  max_teams INTEGER NOT NULL DEFAULT 0,
  max_local_matches INTEGER NOT NULL DEFAULT 3,
  can_sync_to_server BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (tier, name, max_teams, max_local_matches, can_sync_to_server)
VALUES
  ('free', 'Gratuit', 0, 3, false),
  ('basic', 'Basic', 1, 999999, true),
  ('premium', 'Premium', 3, 999999, true),
  ('ultimate', 'Ultimate', 9, 999999, true)
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name,
  max_teams = EXCLUDED.max_teams,
  max_local_matches = EXCLUDED.max_local_matches,
  can_sync_to_server = EXCLUDED.can_sync_to_server,
  updated_at = NOW();

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read subscription plans (public information)
CREATE POLICY "Subscription plans are viewable by everyone"
  ON subscription_plans
  FOR SELECT
  USING (true);

-- Policy: Only service role can modify subscription plans
-- (This will be enforced by Supabase RLS, only admins via SQL can modify)

-- Update the check_team_approval_limit function to use the database table
CREATE OR REPLACE FUNCTION check_team_approval_limit()
RETURNS TRIGGER AS $$
DECLARE
  club_subscription subscription_tier;
  current_team_count INTEGER;
  max_teams INTEGER;
BEGIN
  -- Only check limit when approving a team (status changes to 'approved')
  -- For INSERT: check if new team is being created as 'approved'
  -- For UPDATE: check if status is changing TO 'approved'
  IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR
     (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') THEN

    -- Get the club's subscription tier
    SELECT subscription_tier INTO club_subscription
    FROM clubs
    WHERE id = NEW.club_id;

    -- If club not found, reject
    IF club_subscription IS NULL THEN
      RAISE EXCEPTION 'Club not found';
    END IF;

    -- Get max teams from subscription_plans table
    SELECT sp.max_teams INTO max_teams
    FROM subscription_plans sp
    WHERE sp.tier = club_subscription;

    -- If plan not found, default to 0
    IF max_teams IS NULL THEN
      max_teams := 0;
    END IF;

    -- Count current approved teams (excluding deleted and excluding current team if updating)
    SELECT COUNT(*) INTO current_team_count
    FROM teams
    WHERE club_id = NEW.club_id
      AND status = 'approved'
      AND is_deleted = false
      AND (TG_OP = 'INSERT' OR id != NEW.id); -- Exclude current team when updating

    -- Check if limit is reached
    IF current_team_count >= max_teams THEN
      RAISE EXCEPTION 'Team limit reached for subscription tier %. Current approved teams: %, Max allowed: %. Upgrade your subscription to add more teams.',
        club_subscription, current_team_count, max_teams;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE subscription_plans IS 'Stores subscription tier limits for teams and matches. These limits are enforced server-side via triggers and can be read by clients.';
