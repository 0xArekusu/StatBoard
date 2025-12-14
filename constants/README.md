# Constants

Constantes centralisées pour l'application. **Source unique de vérité** pour tous les types d'actions, statuts de match, formats, etc.

## 📦 Utilisation

```typescript
// ✅ RECOMMANDÉ : Import depuis constants/
import {
  MatchStatus,
  Team,
  MATCH_FORMATS,
  ActionType,
  ShotSpecification,
} from '../constants';

// ❌ ÉVITER : Import direct depuis d'autres endroits
import { ActionType } from '../src/models/ActionTypes'; // Non recommandé
```

## 📚 Constantes disponibles

### Match Formats

```typescript
import { MATCH_FORMATS, MATCH_FORMAT_LABELS, getPeriodLabel } from '../constants';

// Formats disponibles
MATCH_FORMATS.TWO_HALVES    // '2_halves'
MATCH_FORMATS.FOUR_QUARTERS // '4_quarters'

// Labels en français
MATCH_FORMAT_LABELS[MATCH_FORMATS.TWO_HALVES]
// { singular: 'mi-temps', plural: 'mi-temps', short: 'MT' }

// Fonction helper
getPeriodLabel(MATCH_FORMATS.TWO_HALVES, 1) // "1ère mi-temps"
getPeriodLabel(MATCH_FORMATS.FOUR_QUARTERS, 3) // "3e quart-temps"
```

### Match Status

```typescript
import { MatchStatus } from '../constants';

// Statuts disponibles (enum)
MatchStatus.IN_PROGRESS // 'in_progress'
MatchStatus.COMPLETED   // 'completed'
MatchStatus.ABANDONED   // 'abandoned'

// Utilisation
const status: MatchStatus = MatchStatus.COMPLETED;
if (match.status === MatchStatus.IN_PROGRESS) { }
```

### Teams

```typescript
import { Team } from '../constants';

// Identifiants d'équipe (enum)
Team.MY_TEAM   // 'MyTeam'
Team.OPPONENT  // 'Opponent'

// Utilisation
const team: Team = Team.MY_TEAM;
if (action.team === Team.OPPONENT) { }
```

### Action Types

```typescript
import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
  ACTION_TYPE_FR,
  isShotMade,
} from '../constants';

// Types d'actions
ActionType.SHOT      // "shot"
ActionType.REBOUND   // "rebound"
ActionType.FOUL      // "foul"
ActionType.ASSIST    // "assist"
ActionType.STEAL     // "steal"
ActionType.BLOCK     // "block"
ActionType.TURNOVER  // "turnover"

// Spécifications de tir
ShotSpecification.MADE   // "made"
ShotSpecification.MISSED // "missed"

// Labels en français
ACTION_TYPE_FR[ActionType.SHOT] // "Tir"

// Fonction helper
isShotMade(ShotSpecification.MADE) // true
```


## ✨ Bonnes pratiques

### ✅ À faire

```typescript
// Utiliser les enums et constantes
if (match.status === MatchStatus.IN_PROGRESS) { }
if (action.team === Team.MY_TEAM) { }

// Utiliser les types TypeScript
const status: MatchStatus = MatchStatus.COMPLETED;
const team: Team = Team.OPPONENT;

// Utiliser les fonctions helper
const label = getPeriodLabel(MATCH_FORMATS.TWO_HALVES, 1);
```

### ❌ À éviter

```typescript
// ❌ Magic strings
if (match.status === 'in_progress') { }
if (team === 'MyTeam') { }

// ❌ Import direct depuis d'autres fichiers
import { ActionType } from '../src/models/ActionTypes';
import { MatchStatus } from '../src/models/types';

// ❌ Dupliquer les constantes
const MY_TEAM = 'MyTeam'; // Utiliser Team.MY_TEAM
```

## 🔗 Fichiers

- **[matchConstants.ts](./matchConstants.ts)** : Constantes de formats de match
- **[types.ts](../src/models/types.ts)** : Enums MatchStatus et Team
- **[ActionTypes.ts](../src/models/ActionTypes.ts)** : Types d'actions (enum)
- **[index.ts](./index.ts)** : Point d'export central (utilisez celui-ci !)
- **[routes.ts](./routes.ts)** : Routes de navigation

## 📝 Convention de nommage

- **Constantes** : `UPPER_SNAKE_CASE` (ex: `MATCH_STATUS`, `TEAMS`)
- **Types** : `PascalCase` (ex: `MatchStatus`, `TeamType`)
- **Enums** : `PascalCase` avec valeurs en `lowercase` (ex: `ActionType.SHOT = "shot"`)
- **Labels** : `CONSTANT_NAME_LABELS` (ex: `MATCH_STATUS_LABELS`)
- **Fonctions** : `camelCase` (ex: `getPeriodLabel`, `isMatchActive`)

## 🎯 Migration

Si vous voyez du code utilisant des magic strings, remplacez-les par les enums :

```typescript
// Avant
if (action.type === 'shot') { }
if (team === 'MyTeam') { }
if (match.status === 'in_progress') { }

// Après
import { ActionType, Team, MatchStatus } from '../constants';

if (action.type === ActionType.SHOT) { }
if (team === Team.MY_TEAM) { }
if (match.status === MatchStatus.IN_PROGRESS) { }
```
