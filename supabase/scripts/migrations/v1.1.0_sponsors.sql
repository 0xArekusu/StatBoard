-- Migration v1.1.0 — Sponsor feature
-- Adds:
--   1. 'sponsor' value to subscription_tier enum
--   2. platform_sponsors table (managed by app owner)
--   3. club_sponsors table (managed by sponsor-tier clubs)
--   4. match_sponsors JSONB column on matches (snapshot at match creation)

-- ====================================
-- 1. Extend subscription_tier enum
-- ====================================
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'sponsor';

-- ====================================
-- 2. TABLE: platform_sponsors
-- Sponsors configured by the app owner, displayed on all non-sponsor-tier clubs.
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
  priority      INT NOT NULL DEFAULT 1 CHECK (priority IN (1, 2, 3, 4, 5, 6)),
  start_date    TIMESTAMPTZ,
  end_date      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE platform_sponsors IS 'Sponsors sold by the app owner. Priority 1–4 = on-court zones (SVG), 5 = side banner left, 6 = side banner right.';
COMMENT ON COLUMN platform_sponsors.priority IS '1 = on-court right above center, 2 = on-court left below center, 3 = on-court left above center, 4 = on-court right below center, 5 = side banner left, 6 = side banner right';

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
-- Sponsors configured by clubs on the 'sponsor' subscription tier.
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

COMMENT ON TABLE club_sponsors IS 'Custom sponsors configured by clubs on the sponsor tier. Priority 1–4 = on-court zones (SVG), 5 = side banner left, 6 = side banner right.';
COMMENT ON COLUMN club_sponsors.priority IS '1 = on-court right above center, 2 = on-court left below center, 3 = on-court left above center, 4 = on-court right below center, 5 = side banner left, 6 = side banner right';

CREATE INDEX IF NOT EXISTS idx_club_sponsors_club_id ON club_sponsors(club_id);

ALTER TABLE club_sponsors ENABLE ROW LEVEL SECURITY;

-- Club owners can manage their own sponsors (only if on sponsor tier)
CREATE POLICY "Club owners can manage their sponsors" ON club_sponsors
  USING (
    EXISTS (
      SELECT 1 FROM clubs
      WHERE clubs.id = club_sponsors.club_id
        AND clubs.owner_id = auth.uid()
        AND clubs.subscription_tier = 'sponsor'
    )
  );

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
