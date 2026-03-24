-- Migration v1.0.4
-- Add license_number column to players table (optional field)
ALTER TABLE players ADD COLUMN IF NOT EXISTS license_number TEXT;