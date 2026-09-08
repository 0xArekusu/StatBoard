-- Migration v1.1.2 — Changelog (multilingue)
-- La table app_changelogs est créée par v1.1.0_changelog.sql.
-- Au lancement, l'app affiche une seule fois la ligne dont "version" correspond
-- EXACTEMENT à la version installée (Constants.expoConfig.version) — voir hooks/useAppUpdateCheck.ts.
--
-- Format localisé (depuis v1.1.2) :
--   title : objet { "fr": "...", "en": "...", "de": "...", "es": "..." }  (stocké en texte JSON)
--   items : objet { "fr": [ { emoji, title, text } ], "en": [...], ... }
-- Le hook résout la langue active, avec repli langue courante → fr → en → première dispo.
-- L'ancien format non localisé (title texte simple, items = tableau) reste supporté.
-- published = false : passer à true une fois le build disponible sur les stores.

COMMENT ON COLUMN app_changelogs.items IS 'Release highlights localisés: { "fr": [{ emoji, title, text }], "en": [...], "de": [...], "es": [...] }. Ancien format (tableau simple non localisé) toujours accepté par le client.';
COMMENT ON COLUMN app_changelogs.title IS 'Titre localisé (texte JSON): { "fr": "...", "en": "...", ... }. Ancien format (texte simple) toujours accepté.';

INSERT INTO app_changelogs (version, title, items, published)
VALUES (
  '1.1.2',
  '{"fr":"Quoi de neuf ?","en":"What''s new?","de":"Was ist neu?","es":"¿Qué hay de nuevo?"}',
  '{
    "fr": [
      {"emoji":"🌍","title":"Application multilingue","text":"Coach Assistant est maintenant disponible en français, anglais, allemand et espagnol. Choisissez votre langue depuis l''écran de connexion."},
      {"emoji":"📱","title":"Mode paysage optimisé","text":"Nouvelle barre de score compacte, terrain et barre d''actions masquables : plus d''espace pour suivre le match en direct."},
      {"emoji":"🏷️","title":"Sponsors","text":"Meilleur positionnement des logos sur iOS et en mode portrait."},
      {"emoji":"✨","title":"Améliorations","text":"Export PDF revu, correction de l''affichage des statistiques du joueur n°0 et navigation plus fluide dans les effectifs."}
    ],
    "en": [
      {"emoji":"🌍","title":"Multilingual app","text":"Coach Assistant is now available in French, English, German and Spanish. Pick your language from the login screen."},
      {"emoji":"📱","title":"Improved landscape mode","text":"New compact score bar, plus a hideable court and action bar: more room to follow the game live."},
      {"emoji":"🏷️","title":"Sponsors","text":"Better logo positioning on iOS and in portrait mode."},
      {"emoji":"✨","title":"Improvements","text":"Revamped PDF export, fixed stats for jersey number 0 and smoother roster navigation."}
    ],
    "de": [
      {"emoji":"🌍","title":"Mehrsprachige App","text":"Coach Assistant ist jetzt auf Französisch, Englisch, Deutsch und Spanisch verfügbar. Wähle deine Sprache im Anmeldebildschirm."},
      {"emoji":"📱","title":"Optimierter Querformat-Modus","text":"Neue kompakte Punkteleiste, ausblendbares Spielfeld und Aktionsleiste: mehr Platz, um das Spiel live zu verfolgen."},
      {"emoji":"🏷️","title":"Sponsoren","text":"Bessere Platzierung der Logos unter iOS und im Hochformat."},
      {"emoji":"✨","title":"Verbesserungen","text":"Überarbeiteter PDF-Export, korrigierte Statistiken für Trikotnummer 0 und flüssigere Navigation in den Kadern."}
    ],
    "es": [
      {"emoji":"🌍","title":"Aplicación multilingüe","text":"Coach Assistant ya está disponible en francés, inglés, alemán y español. Elige tu idioma desde la pantalla de inicio de sesión."},
      {"emoji":"📱","title":"Modo horizontal optimizado","text":"Nueva barra de marcador compacta, con pista y barra de acciones ocultables: más espacio para seguir el partido en directo."},
      {"emoji":"🏷️","title":"Patrocinadores","text":"Mejor posicionamiento de los logotipos en iOS y en modo vertical."},
      {"emoji":"✨","title":"Mejoras","text":"Exportación de PDF renovada, corregidas las estadísticas del dorsal 0 y navegación más fluida por las plantillas."}
    ]
  }'::jsonb,
  false
)
ON CONFLICT (version) DO NOTHING;
