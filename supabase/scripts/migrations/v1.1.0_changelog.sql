-- Migration v1.1.0 — Changelog
-- Table keyed by app version. On launch, the app looks up the row matching the
-- EXACT installed version (Constants.expoConfig.version) and shows the changelog
-- once (see hooks/useAppUpdateCheck.ts).
-- Independent from app_config.minimum_version, which only drives the force-update block.

CREATE TABLE IF NOT EXISTS app_changelogs (
  version    TEXT PRIMARY KEY,                       -- e.g. "1.1.0", matches the build version
  title      TEXT,                                   -- optional, app falls back to a default heading
  items      JSONB NOT NULL DEFAULT '[]'::jsonb,     -- [{ emoji, title, text }]
  published  BOOLEAN NOT NULL DEFAULT false,         -- stage the row before store release, then flip to true
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE app_changelogs IS 'Release notes shown once after an update. Key = installed app version. published=false lets you stage the row before the store release.';
COMMENT ON COLUMN app_changelogs.items IS 'Release highlights: [{ emoji, title, text }]. title required, emoji and text optional. Ex: {"emoji":"🏀","title":"Sponsors","text":"..."}.';

ALTER TABLE app_changelogs ENABLE ROW LEVEL SECURITY;

-- Public read access to published versions only (guests included, before login).
CREATE POLICY "Anyone can read published changelogs" ON app_changelogs
  FOR SELECT
  USING (published = true);

-- 1.1.0 content — flip published to true once the build is live on the stores.
INSERT INTO app_changelogs (version, title, items, published)
VALUES (
  '1.1.0',
  'Quoi de neuf ?',
  '[
    {"emoji":"🏀","title":"Sponsors sur le terrain","text":"Affichez les logos de vos partenaires sur le parquet et dans vos rapports PDF."},
    {"emoji":"⚠️","title":"Détail des fautes","text":"Précisez le type de faute au moment de la saisie pour un suivi plus fin."},
    {"emoji":"🗑️","title":"Suppression de matchs","text":"Supprimez définitivement un match terminé depuis l''historique."},
    {"emoji":"✨","title":"Améliorations","text":"Export PDF plus fiable et diverses optimisations."}
  ]'::jsonb,
  false
)
ON CONFLICT (version) DO NOTHING;
