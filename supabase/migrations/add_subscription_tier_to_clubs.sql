-- Add subscription_tier column to clubs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'subscription_tier'
  ) THEN
    CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'premium', 'ultimate');
  END IF;
END $$;

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier DEFAULT 'ultimate';

-- For development/testing, set all existing clubs to 'ultimate' to not block dev
UPDATE clubs SET subscription_tier = 'ultimate' WHERE subscription_tier IS NULL;
