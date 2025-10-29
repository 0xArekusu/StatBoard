# Guide d'utilisation - Synchronisation des matchs

## 📋 Vue d'ensemble

Le système de synchronisation permet de sauvegarder les matchs terminés sur le serveur Supabase avec toutes les actions des joueurs.

### ✅ Prérequis pour la synchronisation

1. **Utilisateur connecté** : L'utilisateur doit être authentifié
2. **Abonnement payant** : Pas de sync pour les utilisateurs freemium (`free`)
3. **Match terminé** : Seuls les matchs avec `status = 'completed'` peuvent être synchronisés

---

## 🗄️ Structure de la base de données

### Table `matches` (Supabase)

```sql
- id (UUID)
- club_id (UUID, nullable)
- team_id (UUID, nullable)
- team_a_name (TEXT)
- team_b_name (TEXT)
- match_format ('2_halves' | '4_quarters')
- period_duration (INTEGER)
- final_score_a (INTEGER)
- final_score_b (INTEGER)
- score_manually_adjusted (BOOLEAN)
- created_by (UUID)
- local_match_id (INTEGER) -- Référence au match SQLite local
- played_at (TIMESTAMP)
- synced_at (TIMESTAMP)
```

### Table `match_players` (Supabase)

```sql
- id (UUID)
- match_id (UUID)
- player_id (UUID, nullable) -- Lien vers players (NULL si temporaire)
- player_number (INTEGER)
- player_name (TEXT)
- team ('A' | 'B')
- is_starter (BOOLEAN)
- photo_url (TEXT, nullable)
- actions (JSONB) -- Toutes les actions du joueur
- total_points, total_shots, etc. (INTEGER) -- Stats précalculées
- is_temporary (BOOLEAN) -- true si player_id = NULL
```

### Format du JSON `actions`

```typescript
[
  {
    action_type: "shot",
    specification: "made_2pts",
    points: 2,
    semantic_x: 0.5,
    semantic_y: 0.3,
    action_order: 1,
    period_number: 1,
    time_in_period: 580,
    timestamp: "2025-10-28T14:23:45Z"
  },
  {
    action_type: "rebound",
    specification: "defensive",
    semantic_x: 0.2,
    semantic_y: 0.8,
    action_order: 2,
    period_number: 1,
    time_in_period: 575,
    timestamp: "2025-10-28T14:23:50Z"
  }
]
```

---

## 💻 Utilisation dans le code

### 1. Avec le hook `useMatchSync`

```typescript
import { useMatchSync } from '../src/hooks/useMatchSync';

function MatchSummaryScreen() {
  const { isSyncing, error, syncMatch, checkEligibility } = useMatchSync();
  const [matchId, setMatchId] = useState(123);

  // Vérifier si le match peut être synchronisé
  const handleCheckEligibility = async () => {
    const result = await checkEligibility(matchId);

    if (result.canSync) {
      console.log('✅ Le match peut être synchronisé');
    } else {
      console.log('❌ Sync impossible:', result.reason);
      // Afficher un message à l'utilisateur
      Alert.alert('Synchronisation impossible', result.reason);
    }
  };

  // Synchroniser le match
  const handleSyncMatch = async () => {
    const result = await syncMatch(matchId);

    if (result.success) {
      console.log('✅ Match synchronisé:', result.matchId);
      Alert.alert('Succès', 'Match synchronisé avec succès !');
    } else {
      console.log('❌ Erreur:', result.error);
      Alert.alert('Erreur', result.error);
    }
  };

  return (
    <View>
      <Button
        title="Vérifier si sync possible"
        onPress={handleCheckEligibility}
      />

      <Button
        title={isSyncing ? "Synchronisation..." : "Synchroniser le match"}
        onPress={handleSyncMatch}
        disabled={isSyncing}
      />

      {error && <Text style={{color: 'red'}}>{error}</Text>}
    </View>
  );
}
```

### 2. Synchroniser tous les matchs en attente

```typescript
import { useMatchSync } from '../src/hooks/useMatchSync';

function SyncAllMatchesButton() {
  const { isSyncing, syncAllPending } = useMatchSync();

  const handleSyncAll = async () => {
    const result = await syncAllPending();

    console.log(`✅ ${result.synced} matchs synchronisés`);
    console.log(`❌ ${result.failed} échecs`);

    if (result.errors.length > 0) {
      console.log('Erreurs:', result.errors);
    }

    Alert.alert(
      'Synchronisation terminée',
      `${result.synced} matchs synchronisés\n${result.failed} échecs`
    );
  };

  return (
    <Button
      title={isSyncing ? "Sync en cours..." : "Synchroniser tous les matchs"}
      onPress={handleSyncAll}
      disabled={isSyncing}
    />
  );
}
```

### 3. Utilisation directe du service (sans hook)

```typescript
import { supabase } from '../src/config/supabase';
import { MatchSyncService } from '../src/services/api/MatchSyncService';

const syncService = new MatchSyncService(supabase);

// Vérifier l'éligibilité
const eligibility = await syncService.checkSyncEligibility(matchId);

if (eligibility.canSync) {
  // Synchroniser
  const result = await syncService.syncMatch(matchId);

  if (result.success) {
    console.log('Match synced:', result.matchId);
  }
}
```

---

## 🔒 Sécurité et permissions

### Row Level Security (RLS)

Les policies Supabase garantissent que :

1. **Lecture** : Un utilisateur peut voir :
   - Ses propres matchs
   - Les matchs de son club (si membre)

2. **Écriture** : Un utilisateur peut :
   - Créer ses propres matchs
   - Modifier/Supprimer ses propres matchs

### Vérifications côté client

Avant de synchroniser, le service vérifie automatiquement :

```typescript
✅ Utilisateur authentifié ?
✅ Match terminé (status = 'completed') ?
✅ Pas déjà synchronisé ?
✅ Abonnement payant (si club_id) ?
```

---

## 📊 Workflow complet

```
1. Match en cours
   └─> BoardScreen
       └─> Actions enregistrées dans SQLite

2. Fin du match
   └─> MatchSummaryScreen
       └─> Match marqué comme 'completed'

3. Synchronisation (optionnel)
   └─> Bouton "Sauvegarder sur le serveur"
       ├─> Vérification éligibilité
       │   ├─> User connecté ?
       │   ├─> Abonnement payant ?
       │   └─> Match terminé ?
       │
       └─> Sync vers Supabase
           ├─> INSERT match dans table matches
           ├─> INSERT players avec actions JSON
           └─> UPDATE local match.synced_to_server = true
```

---

## 🚀 Déploiement

### 1. Appliquer la migration SQL

```bash
# Depuis le projet
cd supabase
supabase db push
```

Ou directement dans Supabase Dashboard > SQL Editor :

```sql
-- Copier le contenu de :
-- supabase/migrations/create_matches_and_match_players_tables.sql
```

### 2. Vérifier les tables

```sql
-- Vérifier que les tables existent
SELECT * FROM matches LIMIT 1;
SELECT * FROM match_players LIMIT 1;

-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename IN ('matches', 'match_players');
```

---

## 🐛 Debug et logs

### Activer les logs détaillés

```typescript
// Dans MatchSyncService.ts, tous les logs sont déjà présents :
console.log('✅ Match synced successfully');
console.error('❌ Error syncing match:', error);
```

### Vérifier l'état de sync local

```sql
-- Dans SQLite (local)
SELECT id, team_a_name, status, synced_to_server
FROM matches
WHERE status = 'completed';
```

### Vérifier les données sur Supabase

```sql
-- Dans Supabase
SELECT m.id, m.team_a_name, m.local_match_id,
       COUNT(mp.id) as player_count
FROM matches m
LEFT JOIN match_players mp ON mp.match_id = m.id
GROUP BY m.id;
```

---

## 🔄 Cas d'usage avancés

### Lier un joueur temporaire à la table players (après coup)

```sql
-- Si tu veux lier un joueur temporaire à un joueur existant
UPDATE match_players
SET player_id = 'uuid-du-joueur-existant',
    is_temporary = false
WHERE id = 'uuid-du-match-player';
```

### Requêtes analytics multi-matchs

```sql
-- Stats globales d'un joueur sur tous ses matchs
SELECT
  player_id,
  player_name,
  SUM(total_points) as total_points,
  SUM(total_shots) as total_shots,
  SUM(total_shots_made) as total_shots_made,
  ROUND(SUM(total_shots_made)::DECIMAL / NULLIF(SUM(total_shots), 0) * 100, 2) as fg_percentage,
  COUNT(DISTINCT match_id) as matches_played
FROM match_players
WHERE player_id = 'uuid-du-joueur'
GROUP BY player_id, player_name;
```

### Replay d'un match (récupérer toutes les actions)

```typescript
const { data: matchPlayers } = await supabase
  .from('match_players')
  .select('*')
  .eq('match_id', matchUuid);

// Pour chaque joueur, récupérer ses actions
matchPlayers.forEach(player => {
  player.actions.forEach(action => {
    // Replacer l'action sur le terrain avec semantic_x, semantic_y
    drawActionOnCourt(action);
  });
});
```

---

## ✅ Checklist de validation

Avant de considérer la feature comme complète :

- [x] Migration SQL appliquée sur Supabase
- [x] Service `MatchSyncService` créé
- [x] Hook `useMatchSync` créé
- [x] Vérification subscription tier intégrée
- [ ] UI pour bouton "Sauvegarder sur le serveur" (à ajouter dans MatchSummaryScreen)
- [ ] Tests manuels avec utilisateur freemium (sync refusé)
- [ ] Tests manuels avec utilisateur premium (sync accepté)
- [ ] Gestion de la liaison player_id (si applicable)
- [ ] Tests de replay terrain avec actions JSON

---

## 📚 Fichiers créés/modifiés

1. **Migration SQL** : `supabase/migrations/create_matches_and_match_players_tables.sql`
2. **Types** : `src/services/api/types/SupabaseMatchTypes.ts`
3. **Service** : `src/services/api/MatchSyncService.ts`
4. **Hook** : `src/hooks/useMatchSync.ts`
5. **Repository** : `src/services/database/MatchRepository.ts` (ajout de `updateSyncStatus` et `findUnsyncedCompletedMatches`)
6. **Documentation** : `MATCH_SYNC_USAGE.md` (ce fichier)
