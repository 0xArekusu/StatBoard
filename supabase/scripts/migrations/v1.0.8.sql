-- Migration v1.0.8

-- Create app_config table for remote configuration (force update, feature flags, etc.)
CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE app_config DISABLE ROW LEVEL SECURITY;

INSERT INTO app_config (key, value)
VALUES ('minimum_version', '1.0.7')
ON CONFLICT (key) DO NOTHING;
