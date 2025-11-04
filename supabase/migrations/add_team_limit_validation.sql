-- Function to check team limit when approving teams
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

    -- Define max teams per subscription tier
    max_teams := CASE club_subscription
      WHEN 'free' THEN 0
      WHEN 'basic' THEN 1
      WHEN 'premium' THEN 3
      WHEN 'ultimate' THEN 9
      ELSE 0
    END;

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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS validate_team_creation_limit ON teams;
DROP TRIGGER IF EXISTS validate_team_approval_limit_insert ON teams;
DROP TRIGGER IF EXISTS validate_team_approval_limit_update ON teams;

-- Create trigger that runs BEFORE INSERT on teams table
CREATE TRIGGER validate_team_approval_limit_insert
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION check_team_approval_limit();

-- Create trigger that runs BEFORE UPDATE on teams table
CREATE TRIGGER validate_team_approval_limit_update
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION check_team_approval_limit();

-- Note:
-- This trigger allows creating teams with status 'pending' without limit
-- The limit is only enforced when approving teams (status = 'approved')
