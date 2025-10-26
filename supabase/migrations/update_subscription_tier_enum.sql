-- Update subscription_tier enum to include new values
-- First, we need to drop the column if it exists, then recreate the enum

-- Drop the column if it exists (this will also drop the constraint)
ALTER TABLE clubs DROP COLUMN IF EXISTS subscription_tier;

-- Drop the old enum type if it exists
DROP TYPE IF EXISTS subscription_tier;

-- Create the new enum type with all values
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'premium', 'ultimate');

-- Add the column back with the new default
ALTER TABLE clubs ADD COLUMN subscription_tier subscription_tier DEFAULT 'ultimate';

-- For development/testing, ensure all clubs are set to 'ultimate'
UPDATE clubs SET subscription_tier = 'ultimate' WHERE subscription_tier IS NULL;
