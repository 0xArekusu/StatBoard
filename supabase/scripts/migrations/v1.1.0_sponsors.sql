-- Migration v1.1.0 — Sponsor feature
-- Adds:
--   1. can_configure_sponsors flag on subscription_plans (grants sponsor config to 'ultimate' — no dedicated tier)
--   2. platform_sponsors table (managed by app owner)
--   3. club_sponsors table (managed by clubs whose plan allows it)
--   4. match_sponsors JSONB column on matches (snapshot at match creation)
--   5. is_paid flag on platform_sponsors (paid partner vs. default/fallback branding)

-- ====================================
-- 1. Grant sponsor configuration via a plan flag (no dedicated subscription tier)
-- ====================================
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS can_configure_sponsors BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN subscription_plans.can_configure_sponsors IS 'Whether clubs on this tier can configure their own court sponsors (club_sponsors table) instead of the default platform sponsors.';

UPDATE subscription_plans SET can_configure_sponsors = true WHERE tier = 'ultimate';

-- ====================================
-- 2. TABLE: platform_sponsors
-- Sponsors configured by the app owner, displayed on clubs without their own club_sponsors.
-- Up to 6 active at a time. Ordered by priority (1–6).
-- Zones 1–4: on-court (SVG). Zones 5–6: side banners outside the court (RN Image overlay).
-- ====================================
CREATE TABLE IF NOT EXISTS platform_sponsors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  logo_url      TEXT NOT NULL,
  logo_url_dark TEXT,           -- light-colored variant for dark court backgrounds
  website_url   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_paid       BOOLEAN NOT NULL DEFAULT true, -- false = default/fallback branding (e.g. Coach Assistant), excluded from PDF "official partners" sections
  priority      INT NOT NULL DEFAULT 1 CHECK (priority IN (1, 2, 3, 4, 5, 6)),
  start_date    TIMESTAMPTZ,
  end_date      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Existing installs: add the column if the table already existed before this migration ran
ALTER TABLE platform_sponsors ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT true;

COMMENT ON TABLE platform_sponsors IS 'Sponsors sold by the app owner. Priority 1–4 = on-court zones (SVG), 5 = side banner left, 6 = side banner right.';
COMMENT ON COLUMN platform_sponsors.priority IS '1 = on-court right above center, 2 = on-court left below center, 3 = on-court left above center, 4 = on-court right below center, 5 = side banner left, 6 = side banner right';
COMMENT ON COLUMN platform_sponsors.is_paid IS 'true = real paid partner (shown in PDF "Match présenté par" / "Partenaires officiels"), false = default/fallback branding shown on court only.';

-- Only app admins manage this table — no RLS needed, but disable public access
ALTER TABLE platform_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform_sponsors" ON platform_sponsors
  USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
  );

CREATE POLICY "Anyone can read active platform_sponsors" ON platform_sponsors
  FOR SELECT
  USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

-- ====================================
-- 3. TABLE: club_sponsors
-- Sponsors configured by clubs whose subscription plan has can_configure_sponsors = true.
-- Up to 6 active per club (priority 1–6).
-- Zones 1–4: on-court (SVG). Zones 5–6: side banners outside the court (RN Image overlay).
-- ====================================
CREATE TABLE IF NOT EXISTS club_sponsors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  logo_url      TEXT NOT NULL,
  logo_url_dark TEXT,           -- light-colored variant for dark court backgrounds
  website_url   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  priority      INT NOT NULL DEFAULT 1 CHECK (priority IN (1, 2, 3, 4, 5, 6)),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE club_sponsors IS 'Custom sponsors configured by clubs whose subscription plan has can_configure_sponsors = true. Priority 1–4 = on-court zones (SVG), 5 = side banner left, 6 = side banner right.';
COMMENT ON COLUMN club_sponsors.priority IS '1 = on-court right above center, 2 = on-court left below center, 3 = on-court left above center, 4 = on-court right below center, 5 = side banner left, 6 = side banner right';

CREATE INDEX IF NOT EXISTS idx_club_sponsors_club_id ON club_sponsors(club_id);

ALTER TABLE club_sponsors ENABLE ROW LEVEL SECURITY;

-- No owner-write policy: club_sponsors is configured by the app owner (admin/service role)
-- for now, not by club owners themselves. Only read access is exposed to clients.

-- Club members can read their club's sponsors
CREATE POLICY "Club members can read club sponsors" ON club_sponsors
  FOR SELECT
  USING (is_club_member(club_id));

-- ====================================
-- 4. Add match_sponsors to matches
-- Snapshot of sponsors at match creation time (for PDF reports).
-- Format: [{ priority: 1|2|3|4, logo_url, logo_url_dark, name, source }]
-- ====================================
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_sponsors JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN matches.match_sponsors IS 'Sponsor snapshot at match creation. [{priority, logo_url, logo_url_dark, name, source}] — priority 1–4, logo_url_dark is the light variant for dark courts, source is club|platform|fallback';
