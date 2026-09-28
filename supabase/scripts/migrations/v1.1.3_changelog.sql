-- Migration v1.1.3 — Changelog (multilingue)
-- La table app_changelogs est créée par v1.1.0_changelog.sql.
-- Au lancement, l'app affiche une seule fois la ligne dont "version" correspond
-- EXACTEMENT à la version installée (Constants.expoConfig.version) — voir hooks/useAppUpdateCheck.ts.
--
-- Format localisé (depuis v1.1.2) :
--   title : objet { "fr": "...", "en": "...", "de": "...", "es": "..." }  (stocké en texte JSON)
--   items : objet { "fr": [ { emoji, title, text } ], "en": [...], ... }
-- Le hook résout la langue active, avec repli langue courante → fr → en → première dispo.
-- published = false : passer à true une fois le build disponible sur les stores.

INSERT INTO app_changelogs (version, title, items, published)
VALUES (
  '1.1.3',
  '{"fr":"Quoi de neuf ?","en":"What''s new?","de":"Was ist neu?","es":"¿Qué hay de nuevo?"}',
  '{
    "fr": [
      {"emoji":"🎯","title":"Statistiques de tirs corrigées","text":"Les lancers francs étaient comptés deux fois : dans la colonne Tirs et dans la colonne LF. Les totaux et les pourcentages de réussite sont désormais justes, et les tirs correspondent bien à la somme des 2 points et des 3 points, comme sur une feuille de marque FIBA."},
      {"emoji":"🔄","title":"+/- fiabilisé","text":"Les remplacements n''étaient pas enregistrés lors des matchs joués à l''extérieur, ce qui rendait le +/- incohérent. C''est corrigé pour vos prochains matchs."}
    ],
    "en": [
      {"emoji":"🎯","title":"Corrected shooting stats","text":"Free throws were counted twice: in the Shots column and in the FT column. Totals and shooting percentages are now accurate, and shots match the sum of 2-pointers and 3-pointers, just like on a FIBA scoresheet."},
      {"emoji":"🔄","title":"Reliable +/-","text":"Substitutions were not being recorded during away games, which made +/- inconsistent. This is fixed for your upcoming games."}
    ],
    "de": [
      {"emoji":"🎯","title":"Korrigierte Wurfstatistiken","text":"Freiwürfe wurden doppelt gezählt: in der Spalte Würfe und in der Spalte FW. Summen und Trefferquoten sind jetzt korrekt, und die Würfe entsprechen der Summe aus 2- und 3-Punkte-Würfen, wie auf einem FIBA-Spielbericht."},
      {"emoji":"🔄","title":"Zuverlässiger +/-","text":"Bei Auswärtsspielen wurden Wechsel nicht gespeichert, wodurch der +/- unstimmig war. Für deine kommenden Spiele ist das behoben."}
    ],
    "es": [
      {"emoji":"🎯","title":"Estadísticas de tiro corregidas","text":"Los tiros libres se contaban dos veces: en la columna Tiros y en la columna TL. Los totales y los porcentajes de acierto ya son correctos, y los tiros corresponden a la suma de los de 2 y 3 puntos, como en un acta FIBA."},
      {"emoji":"🔄","title":"+/- fiable","text":"Los cambios no se registraban en los partidos como visitante, lo que hacía el +/- incoherente. Queda corregido para tus próximos partidos."}
    ]
  }'::jsonb,
  false
)
ON CONFLICT (version) DO NOTHING;
