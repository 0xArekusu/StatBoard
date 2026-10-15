-- Migration v1.1.4 — Changelog (multilingue)
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
  '1.1.4',
  '{"fr":"Quoi de neuf ?","en":"What''s new?","de":"Was ist neu?","es":"¿Qué hay de nuevo?"}',
  '{
    "fr": [
      {"emoji":"⏱️","title":"Temps de jeu corrigé","text":"Le temps de jeu continuait d''avancer pendant les pauses entre les périodes, et un match complet se terminait à 39:45 au lieu de 40:00. Il est désormais reconstitué à partir de vos remplacements — et vos matchs déjà enregistrés sont recalculés automatiquement."},
      {"emoji":"🕐","title":"Prolongations justes","text":"Une prolongation est maintenant comptée à sa vraie durée, qui est enregistrée et appliquée à toutes les prolongations du match. Reprendre un match interrompu pendant une prolongation repart du bon chronomètre."}
    ],
    "en": [
      {"emoji":"⏱️","title":"Corrected playing time","text":"Playing time kept running during the breaks between periods, and a full game ended at 39:45 instead of 40:00. It is now rebuilt from your substitutions — and your already recorded games are recalculated automatically."},
      {"emoji":"🕐","title":"Accurate overtimes","text":"An overtime is now counted at its real length, which is saved and applied to every overtime of the game. Resuming a game interrupted during an overtime restarts from the right clock."}
    ],
    "de": [
      {"emoji":"⏱️","title":"Korrigierte Spielzeit","text":"Die Spielzeit lief in den Pausen zwischen den Perioden weiter, und ein komplettes Spiel endete bei 39:45 statt 40:00. Sie wird nun aus deinen Wechseln rekonstruiert — und deine bereits erfassten Spiele werden automatisch neu berechnet."},
      {"emoji":"🕐","title":"Korrekte Verlängerungen","text":"Eine Verlängerung wird jetzt mit ihrer tatsächlichen Dauer gezählt, die gespeichert und auf alle Verlängerungen des Spiels angewendet wird. Ein in der Verlängerung unterbrochenes Spiel wird mit der richtigen Uhr fortgesetzt."}
    ],
    "es": [
      {"emoji":"⏱️","title":"Tiempo de juego corregido","text":"El tiempo de juego seguía avanzando durante los descansos entre periodos, y un partido completo terminaba en 39:45 en lugar de 40:00. Ahora se reconstruye a partir de tus cambios — y tus partidos ya registrados se recalculan automáticamente."},
      {"emoji":"🕐","title":"Prórrogas exactas","text":"Una prórroga se cuenta ahora con su duración real, que queda guardada y se aplica a todas las prórrogas del partido. Retomar un partido interrumpido durante una prórroga arranca con el cronómetro correcto."}
    ]
  }'::jsonb,
  false
)
ON CONFLICT (version) DO NOTHING;
