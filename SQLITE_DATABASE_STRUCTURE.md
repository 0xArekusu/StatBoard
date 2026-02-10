# Structure de la base de données SQLite locale

## Vue d'ensemble
La base de données SQLite locale stocke les matchs en cours et terminés avant leur synchronisation avec Supabase. Après synchronisation réussie, les données locales sont supprimées pour économiser de l'espace.

---

## Table: `matches`

Stocke les informations générales sur chaque match avec les joueurs embarqués dans une colonne JSON.

### Colonnes

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID du match |
| `club_id` | TEXT | NULL | UUID du club (si match lié à un club) |
| `team_id` | TEXT | NULL | UUID de l'équipe du club qui joue |
| `my_team_name` | TEXT | NULL | Nom de mon équipe |
| `opponent_name` | TEXT | NOT NULL | Nom de l'équipe adverse |
| `is_home` | INTEGER | NOT NULL, DEFAULT 1 | 1 si à domicile, 0 si à l'extérieur |
| `total_periods` | INTEGER | NOT NULL, DEFAULT 4 | Nombre de périodes (2 ou 4) |
| `period_duration` | INTEGER | NOT NULL, DEFAULT 600 | Durée d'une période en secondes (défaut 10 min) |
| `overtime_duration` | INTEGER | NOT NULL, DEFAULT 300 | Durée d'une prolongation en secondes (défaut 5 min) |
| `overtime_periods` | INTEGER | NOT NULL, DEFAULT 0 | Nombre de prolongations jouées |
| `my_team_score` | INTEGER | NOT NULL, DEFAULT 0 | Score de mon équipe |
| `opponent_score` | INTEGER | NOT NULL, DEFAULT 0 | Score de l'équipe adverse |
| `score_manually_adjusted` | INTEGER | DEFAULT 0 | 1 si le score a été ajusté manuellement, 0 sinon |
| `status` | TEXT | NOT NULL, DEFAULT 'in_progress' | Statut: 'in_progress', 'completed', 'cancelled' |
| `current_period` | INTEGER | DEFAULT 1 | Période en cours |
| `time_elapsed` | INTEGER | DEFAULT 0 | Temps écoulé dans la période en cours (secondes) |
| `track_opponent_stats` | INTEGER | DEFAULT 0 | 1 si on track les stats adverses, 0 sinon |
| `players` | TEXT | DEFAULT '[]' | JSON array des joueurs |
| `player_stats` | TEXT | DEFAULT '{}' | JSON object des stats (legacy, non utilisé) |
| `club_logo_url` | TEXT | NULL | URL du logo du club |
| `court_background_color` | TEXT | NULL | Couleur de fond du terrain |
| `court_line_color` | TEXT | NULL | Couleur des lignes du terrain |
| `created_by` | TEXT | NULL | UUID de l'utilisateur créateur |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date/heure de création |
| `started_at` | DATETIME | NULL | Date/heure de début du match |
| `ended_at` | DATETIME | NULL | Date/heure de fin du match |
| `synced_at` | DATETIME | NULL | Date/heure de synchronisation |
| `last_updated` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Dernière mise à jour |
| `synced_to_server` | INTEGER | DEFAULT 0 | 1 si synchronisé avec Supabase, 0 sinon |
| `created_with_tier` | TEXT | DEFAULT 'not_connected' | Tier d'abonnement lors de la création |

### Format JSON players
```json
[
  {
    "player_id": "uuid-xxx",
    "player_number": 7,
    "player_name": "John Doe",
    "team": "MyTeam",
    "is_starter": true,
    "photo_url": "https://...",
    "on_court": 1,
    "playing_time_seconds": 360
  }
]
```

---

## Table: `match_actions`

Stocke les actions individuelles pendant et après le match.

### Colonnes

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID de l'action |
| `match_id` | TEXT | NOT NULL, FOREIGN KEY | UUID du match |
| `team` | TEXT | NOT NULL, CHECK | Équipe: 'MyTeam' ou 'Opponent' |
| `player_number` | INTEGER | NOT NULL | Numéro du joueur |
| `action_type` | TEXT | NOT NULL | Type d'action (shot, rebound, assist, etc.) |
| `specification` | TEXT | NOT NULL | Spécification (made, missed, defensive, etc.) |
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

---

## Flux de données

### 1. Création d'un match
```
NewMatchScreen → MatchManager.startMatch()
              → MatchRepository.create() (génère UUID)
              → INSERT INTO matches
              → MatchPlayerRepository.createBatch()
              → UPDATE matches.players (JSON)
```

### 2. Pendant le match
```
LiveMatchScreen → Action utilisateur
                → ActionRepository.create() (génère UUID)
                → INSERT INTO match_actions
```

### 3. Fin du match
```
LiveMatchScreen → MatchManager.endMatch()
               → MatchRepository.completeMatch() (status = 'completed')
```

### 4. Synchronisation avec Supabase
```
MatchDetailsScreen → MatchSyncService.syncMatch()
                   → Lire match + players (JSON) + actions
                   → INSERT dans Supabase
                   → DELETE match local (cascade sur actions)
```

---

## Différences entre SQLite et Supabase

| Aspect | SQLite (local) | Supabase (serveur) |
|--------|----------------|-------------------|
| IDs | UUID (TEXT) | UUID (PostgreSQL UUID) |
| Players | JSON dans matches.players | JSONB dans matches.players |
| Actions | Table match_actions avec UUIDs | JSONB dans matches.player_stats |
| Persistance | Supprimé après sync | Permanent |

---

## Notes importantes

1. **UUIDs partout**: Tous les IDs (matches, actions) sont des UUIDs générés côté client pour éviter les conflits de synchronisation

2. **Players embarqués**: Les joueurs sont stockés en JSON dans la colonne `matches.players`, pas dans une table séparée

3. **Actions séparées**: Les actions restent dans une table séparée `match_actions` pour faciliter les requêtes pendant le match

4. **Suppression après sync**: Après synchronisation réussie avec Supabase, toutes les données locales du match sont supprimées

5. **player_id**:
   - Renseigné si le joueur vient de la table `players` du club
   - NULL si joueur temporaire (créé pour le match)
