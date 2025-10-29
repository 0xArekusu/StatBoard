# Structure de la base de données SQLite locale

## Vue d'ensemble
La base de données SQLite locale stocke les matchs en cours et terminés avant leur synchronisation avec Supabase. Après synchronisation réussie, les données locales sont supprimées pour économiser de l'espace.

---

## Table: `matches`

Stocke les informations générales sur chaque match.

### Colonnes

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identifiant unique du match |
| `team_a_name` | TEXT | NOT NULL | Nom ou UUID de l'équipe A (selon si équipe du club ou non) |
| `team_b_name` | TEXT | NOT NULL | Nom ou UUID de l'équipe B (selon si équipe du club ou non) |
| `status` | TEXT | NOT NULL, CHECK | Statut du match: 'in_progress', 'completed', 'paused', 'abandoned' |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date/heure de création |
| `started_at` | DATETIME | NULL | Date/heure de début du match |
| `ended_at` | DATETIME | NULL | Date/heure de fin du match |
| `team_mode` | TEXT | NOT NULL, CHECK | Mode d'équipe: 'A', 'B', ou 'both' (indique quelle(s) équipe(s) sont gérées) |
| `match_format` | TEXT | NOT NULL, CHECK, DEFAULT '2_halves' | Format du match: '2_halves' ou '4_quarters' |
| `period_duration` | INTEGER | NOT NULL, DEFAULT 1200 | Durée d'une période en secondes (défaut 20 min) |
| `current_period` | INTEGER | DEFAULT 1 | Période en cours |
| `time_elapsed` | INTEGER | DEFAULT 0 | Temps écoulé dans la période en cours (secondes) |
| `final_score_a` | INTEGER | DEFAULT 0 | Score final de l'équipe A |
| `final_score_b` | INTEGER | DEFAULT 0 | Score final de l'équipe B |
| `score_manually_adjusted` | INTEGER | DEFAULT 0 | 1 si le score a été ajusté manuellement, 0 sinon |
| `last_updated` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Dernière mise à jour |
| `synced_to_server` | INTEGER | DEFAULT 0 | 1 si synchronisé avec Supabase, 0 sinon |
| `created_with_tier` | TEXT | DEFAULT 'not_connected' | Tier d'abonnement lors de la création |
| `club_id` | TEXT | NULL | UUID du club (si match lié à un club) |
| `team_id` | TEXT | NULL | UUID de l'équipe du club qui joue |

### Logique des équipes
- Si `team_id` existe:
  - `team_mode = 'A'` → l'équipe A est du club, `team_a_name` contient l'UUID de l'équipe
  - `team_mode = 'B'` → l'équipe B est du club, `team_b_name` contient l'UUID de l'équipe
  - `team_mode = 'both'` → les deux équipes sont gérées, les noms sont conservés
- Si pas de `team_id`: équipes temporaires, les noms sont des chaînes de caractères

---

## Table: `match_players`

Stocke les joueurs participant à chaque match, avec leurs actions compactées en JSON après la fin du match.

### Colonnes

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identifiant unique |
| `match_id` | INTEGER | NOT NULL, FOREIGN KEY | Référence au match |
| `player_id` | TEXT | NULL | UUID du joueur dans la table players (NULL pour joueurs temporaires) |
| `player_number` | INTEGER | NOT NULL | Numéro du joueur |
| `player_name` | TEXT | NOT NULL | Nom du joueur |
| `team` | TEXT | NOT NULL, CHECK | Équipe: 'A' ou 'B' |
| `is_starter` | INTEGER | NOT NULL, DEFAULT 1 | 1 si titulaire, 0 si remplaçant |
| `actions` | TEXT | NULL | JSON des actions du joueur (rempli après fin du match, NULL pendant le match) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date/heure de création |

### UNIQUE constraint
- (`match_id`, `player_number`, `team`)

### Format JSON des actions (après compactage)
```json
[
  {
    "action_type": "tir",
    "specification": "reussi",
    "points": 2,
    "semantic_x": 0.65,
    "semantic_y": 0.71,
    "action_order": 1,
    "period_number": 1,
    "time_in_period": 120,
    "timestamp": "2025-01-15T19:33:46.947Z"
  },
  ...
]
```

---

## Table: `match_actions`

Stocke les actions individuelles **pendant le match en cours**. Après la fin du match, ces données sont compactées dans `match_players.actions` puis supprimées.

### Colonnes

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identifiant unique de l'action |
| `match_id` | INTEGER | NOT NULL, FOREIGN KEY | Référence au match |
| `team` | TEXT | NOT NULL, CHECK | Équipe: 'A' ou 'B' |
| `player_number` | INTEGER | NOT NULL | Numéro du joueur |
| `action_type` | TEXT | NOT NULL | Type d'action (tir, rebond, passe, etc.) |
| `specification` | TEXT | NOT NULL | Spécification (reussi, manque, offensif, etc.) |
| `points` | INTEGER | NULL | Points marqués (pour les tirs) |
| `semantic_x` | REAL | NOT NULL | Position X normalisée (0-1) |
| `semantic_y` | REAL | NOT NULL | Position Y normalisée (0-1) |
| `timestamp` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Horodatage de l'action |
| `action_order` | INTEGER | NOT NULL | Ordre séquentiel de l'action |
| `period_number` | INTEGER | NOT NULL | Numéro de la période |
| `time_in_period` | INTEGER | NOT NULL | Temps écoulé dans la période (secondes) |

### Index
- `idx_match_actions_match_id` sur `match_id`
- `idx_match_actions_timestamp` sur `timestamp`

### Cycle de vie
1. **Pendant le match**: Les actions sont enregistrées ligne par ligne dans cette table (insertion rapide)
2. **Fin du match**:
   - Les actions sont regroupées par joueur
   - Converties en JSON et stockées dans `match_players.actions`
   - Toutes les lignes de `match_actions` pour ce match sont supprimées
3. **Résultat**: Économie de ~95% d'espace disque pour les matchs terminés

---

## Index globaux

- `idx_match_actions_match_id` : Accélère la recherche d'actions par match
- `idx_match_actions_timestamp` : Accélère le tri chronologique des actions
- `idx_match_players_match_id` : Accélère la recherche de joueurs par match

---

## Flux de données

### 1. Création d'un match
```
BoardScreen → MatchManager.startMatch()
           → MatchRepository.create()
           → INSERT INTO matches
           → MatchPlayerRepository.createBatch()
           → INSERT INTO match_players (sans actions)
```

### 2. Pendant le match
```
Action sur le terrain → ActionRepository.createBatch()
                     → INSERT INTO match_actions
```

### 3. Fin du match
```
BoardScreen → MatchManager.endMatch()
           → MatchRepository.completeMatch() (status = 'completed')
           → ActionRepository.compactMatchActions()
              1. SELECT * FROM match_actions WHERE match_id = ?
              2. Grouper par joueur
              3. UPDATE match_players SET actions = ? (JSON)
              4. DELETE FROM match_actions WHERE match_id = ?
```

### 4. Synchronisation avec Supabase
```
MatchSummaryScreen → MatchSyncService.syncMatch()
                  → Lire match, players (avec actions compactées), etc.
                  → INSERT dans Supabase
                  → DELETE match local (cascade sur players et actions)
```

---

## Différences entre SQLite et Supabase

| Aspect | SQLite (local) | Supabase (serveur) |
|--------|----------------|-------------------|
| Nom des colonnes équipes | `team_a_name`, `team_b_name` | `team_a`, `team_b` |
| Actions pendant match | Table `match_actions` séparée | N/A (seulement matchs terminés) |
| Actions après match | JSON dans `match_players.actions` | JSONB dans `match_players.actions` |
| Joueurs temporaires | `player_id IS NULL` | `player_id IS NULL` |
| Persistance | Supprimé après sync | Permanent |

---

## Notes importantes

1. **Compactage automatique**: Les actions sont compactées automatiquement à la fin de chaque match pour économiser de l'espace

2. **Lecture intelligente**: `ActionRepository.getActionsForMatch()` lit automatiquement:
   - Depuis `match_actions` si le match est en cours
   - Depuis `match_players.actions` (JSON) si le match est terminé

3. **Suppression après sync**: Après synchronisation réussie avec Supabase, toutes les données locales du match sont supprimées

4. **player_id**:
   - Renseigné si le joueur vient de la table `players` du club
   - NULL si joueur temporaire (ajouté en pré-game)

5. **team_id vs team_a_name/team_b_name**:
   - Si équipe du club: le champ correspondant contient l'UUID de l'équipe
   - Si équipe temporaire: le champ contient le nom en texte libre
   - `team_mode` indique quelle équipe (A/B/both) est gérée
