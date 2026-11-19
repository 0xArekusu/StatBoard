-- Migration v1.1.6 — Changelog (multilingue)
-- La table app_changelogs est créée par v1.1.0_changelog.sql.
-- Au lancement, l'app affiche une seule fois la ligne dont "version" correspond
-- EXACTEMENT à la version installée (Constants.expoConfig.version) — voir hooks/useAppUpdateCheck.ts.
--
-- La v1.1.6 est une version de correctifs d'affichage : les statistiques du PDF
-- et le score du panneau de filtres du match live. Elle doit exister en propre,
-- la ligne 1.1.5 ne serait jamais affichée aux utilisateurs qui passent de 1.1.5
-- à 1.1.6.
--
-- Format localisé (depuis v1.1.2) :
--   title : objet { "fr": "...", "en": "...", "de": "...", "es": "..." }  (stocké en texte JSON)
--   items : objet { "fr": [ { emoji, title, text } ], "en": [...], ... }
-- Le hook résout la langue active, avec repli langue courante → fr → en → première dispo.
-- published = false : passer à true une fois le build disponible sur les stores.

INSERT INTO app_changelogs (version, title, items, published)
VALUES (
  '1.1.6',
  '{"fr":"Quoi de neuf ?","en":"What''s new?","de":"Was ist neu?","es":"¿Qué hay de nuevo?"}',
  '{
    "fr": [
      {"emoji":"📄","title":"Statistiques du PDF corrigées","text":"Le PDF d''un match attribuait à un joueur les statistiques du joueur portant le même numéro dans l''équipe adverse : ses points, ses tirs, ses rebonds et ses fautes étaient gonflés, et le total de l''équipe additionnait les points des deux camps. Chaque joueur affiche désormais ses propres statistiques, identiques à celles de la feuille de match. Réexportez vos anciens matchs pour obtenir un PDF juste."},
      {"emoji":"🎯","title":"Cartes de tir corrigées","text":"La carte des tirs d''un joueur incluait aussi les tirs du joueur adverse portant le même numéro. Elle ne montre plus que les siens."},
      {"emoji":"🔢","title":"Score des filtres corrigé","text":"Pendant un match, le score affiché dans le panneau de filtres comptait les tirs manqués en plus des tirs réussis. Il correspond désormais exactement au score du match, et le filtre par période donne le bon total pour chaque quart-temps."}
    ],
    "en": [
      {"emoji":"📄","title":"Fixed PDF statistics","text":"A game PDF credited each player with the statistics of the player wearing the same number on the opposing team: points, shots, rebounds and fouls were inflated, and the team total added both teams'' points. Each player now shows his own statistics, matching the scoresheet. Re-export your older games to get a correct PDF."},
      {"emoji":"🎯","title":"Fixed shot charts","text":"A player''s shot chart also included the shots of the opposing player with the same number. It now shows his shots only."},
      {"emoji":"🔢","title":"Fixed filter score","text":"During a game, the score shown in the filter panel counted missed shots along with made ones. It now matches the game score exactly, and the period filter gives the right total for each quarter."}
    ],
    "de": [
      {"emoji":"📄","title":"PDF-Statistiken korrigiert","text":"Im PDF eines Spiels wurden einem Spieler die Statistiken des Spielers mit derselben Nummer im gegnerischen Team zugerechnet: Punkte, Würfe, Rebounds und Fouls waren zu hoch, und die Teamsumme enthielt die Punkte beider Teams. Jeder Spieler zeigt jetzt seine eigenen Statistiken, identisch mit dem Spielbericht. Exportiere ältere Spiele erneut, um ein korrektes PDF zu erhalten."},
      {"emoji":"🎯","title":"Wurfkarten korrigiert","text":"Die Wurfkarte eines Spielers enthielt auch die Würfe des gegnerischen Spielers mit derselben Nummer. Sie zeigt jetzt nur noch seine eigenen."},
      {"emoji":"🔢","title":"Filter-Ergebnis korrigiert","text":"Während eines Spiels zählte das Ergebnis im Filterbereich auch Fehlwürfe mit. Es entspricht jetzt genau dem Spielstand, und der Periodenfilter liefert die richtige Summe je Viertel."}
    ],
    "es": [
      {"emoji":"📄","title":"Estadísticas del PDF corregidas","text":"El PDF de un partido atribuía a un jugador las estadísticas del jugador con el mismo número del equipo rival: sus puntos, tiros, rebotes y faltas estaban inflados, y el total del equipo sumaba los puntos de ambos bandos. Cada jugador muestra ahora sus propias estadísticas, idénticas a las del acta. Vuelve a exportar tus partidos anteriores para obtener un PDF correcto."},
      {"emoji":"🎯","title":"Mapas de tiro corregidos","text":"El mapa de tiros de un jugador incluía también los tiros del jugador rival con el mismo número. Ahora solo muestra los suyos."},
      {"emoji":"🔢","title":"Marcador de los filtros corregido","text":"Durante un partido, el marcador del panel de filtros contaba también los tiros fallados. Ahora coincide exactamente con el marcador del partido, y el filtro por periodo da el total correcto de cada cuarto."}
    ]
  }'::jsonb,
  false
)
ON CONFLICT (version) DO NOTHING;
