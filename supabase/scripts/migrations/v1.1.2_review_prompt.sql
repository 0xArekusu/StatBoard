-- Migration v1.1.2 — Review prompt threshold
-- Rend configurable à distance le seuil de déclenchement du popup "notez-nous"
-- (nombre de signaux positifs — fin de match, export PDF... — avant affichage),
-- réutilise app_config comme minimum_version (v1.0.8).

INSERT INTO app_config (key, value)
VALUES ('review_prompt_score_threshold', '3')
ON CONFLICT (key) DO NOTHING;
