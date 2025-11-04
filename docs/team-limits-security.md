# Sécurité des limites d'équipes et de matchs

## Problèmes identifiés

Avant cette correction, plusieurs problèmes de sécurité et d'architecture existaient :

### 1. Validation uniquement côté client
- Un utilisateur malveillant pouvait bypasser la validation en appelant directement l'API Supabase
- Aucune protection côté serveur n'empêchait la création d'équipes/matchs au-delà de la limite

### 2. Limites codées en dur dans le code
- Les limites étaient définies dans le code client (`models/Subscription.ts`)
- Impossible de modifier les limites sans déployer une nouvelle version de l'app
- Pas de source unique de vérité (code SQL vs code TypeScript peuvent diverger)
- Impossible de faire des offres personnalisées pour certains clubs

## Solution implémentée

### 1. Table `subscription_plans` (Source de vérité unique)

**Migration:** `supabase/migrations/create_subscription_plans_table.sql`

Cette table centralise toutes les limites :

| Colonne | Type | Description |
|---------|------|-------------|
| `tier` | subscription_tier | Clé primaire (free, basic, premium, ultimate) |
| `name` | TEXT | Nom du plan |
| `max_teams` | INTEGER | Nombre max d'équipes approuvées |
| `max_local_matches` | INTEGER | Nombre max de matchs stockés localement |
| `can_sync_to_server` | BOOLEAN | Peut synchroniser vers le serveur |

**Valeurs par défaut :**

| Plan | Nom | Max équipes | Max matchs locaux | Sync serveur |
|------|-----|-------------|-------------------|--------------|
| free | Gratuit | 0 | 3 | ❌ |
| basic | Basic | 1 | Illimité | ✅ |
| premium | Premium | 3 | Illimité | ✅ |
| ultimate | Ultimate | 9 | Illimité | ✅ |

### 2. Validation côté serveur (Triggers PostgreSQL)

**Migration:** `supabase/migrations/add_team_limit_validation.sql` (mise à jour)

**Fonction PostgreSQL** `check_team_approval_limit()` qui :
- Lit les limites depuis la table `subscription_plans` (pas de code en dur !)
- Compte les équipes approuvées existantes
- Vérifie si la limite est atteinte
- Bloque l'opération si la limite est dépassée

**Triggers** sur la table `teams` :
- `validate_team_approval_limit_insert` : vérifie lors de l'INSERT
- `validate_team_approval_limit_update` : vérifie lors de l'UPDATE du status

### 3. Service côté client mis à jour

**Fichier:** `services/SubscriptionService.ts`

Nouvelles fonctionnalités :
- `getLimitsForTier(tier)` : **Async**, récupère les limites depuis la BDD
- Cache de 5 minutes pour éviter trop de requêtes
- Fallback vers les limites codées en dur si la BDD est inaccessible
- `getLimitsForTierSync(tier)` : **Deprecated**, utilise le cache ou fallback

### Logique de validation

- Les équipes en statut `pending` **ne comptent PAS** dans la limite
- Seules les équipes `approved` comptent
- La validation se déclenche :
  - Lors de la création d'une équipe avec `status = 'approved'`
  - Lors du changement de statut vers `'approved'`

### Validation côté client (conservée)

**Fichiers:**
- `services/SubscriptionService.ts` : méthode `canCreateTeam()` (mise à jour)
- `services/TeamService.ts` : vérifie avant création
- `models/Subscription.ts` : définit les limites de fallback

La validation côté client reste utile pour :
- Fournir un feedback immédiat à l'utilisateur
- Éviter des requêtes inutiles au serveur
- Améliorer l'UX

## Avantages de la nouvelle architecture

✅ **Source unique de vérité** : les limites sont dans la BDD
✅ **Double validation** : client + serveur
✅ **Protection contre le bypass** : impossible de contourner la limite
✅ **Modifiable sans redéploiement** : UPDATE sur la table `subscription_plans`
✅ **Offres personnalisées possibles** : possibilité d'ajouter des plans custom
✅ **Message d'erreur clair** : indique le plan et invite à upgrader
✅ **Performance** : cache côté client (5 minutes)

## Application des migrations

Pour appliquer ces migrations sur votre instance Supabase :

```bash
# Via Supabase CLI
supabase db push

# Ou via le dashboard Supabase : SQL Editor
# 1. create_subscription_plans_table.sql
# 2. add_team_limit_validation.sql (sera automatiquement mis à jour)
```

## Modifier les limites

Pour changer les limites d'un plan (sans redéployer l'app) :

```sql
-- Exemple : passer le plan Premium à 5 équipes max
UPDATE subscription_plans
SET max_teams = 5,
    updated_at = NOW()
WHERE tier = 'premium';
```

## Tests recommandés

### Test 1 : Validation des limites
1. Créer un club avec plan "basic" (limite: 1 équipe)
2. Créer une première équipe → doit être approuvée ✅
3. Tenter de créer/approuver une 2ème équipe → doit être bloquée ❌
4. Vérifier le message d'erreur retourné
5. Upgrader le club vers "premium"
6. Tenter de créer/approuver une 2ème équipe → doit fonctionner ✅

### Test 2 : Récupération depuis la BDD
1. Ouvrir l'app et créer une équipe
2. Vérifier dans les logs que les limites sont bien récupérées depuis `subscription_plans`
3. Modifier la limite dans la BDD (via SQL)
4. Attendre 5 minutes (expiration du cache)
5. Vérifier que la nouvelle limite est appliquée

### Test 3 : Fallback en cas d'erreur BDD
1. Couper la connexion réseau
2. Vérifier que l'app utilise les limites de fallback
3. L'app doit continuer à fonctionner (mode dégradé)
