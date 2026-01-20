# Utils - Helper Functions

Ce dossier contient des **fonctions utilitaires** réutilisables à travers l'application. Ces helpers sont spécifiques au domaine métier du basketball.

## 📁 Fichiers

```
utils/
├── liveMatchHelpers.ts       # Helpers pour le match en direct
├── matchDataConverters.ts    # Conversion de données match
├── logger.ts                 # Wrapper pour LoggerService
└── mockActions.ts            # Données de test (dev)
```

---

## 🔧 liveMatchHelpers.ts

Fonctions utilitaires pour l'écran de match en direct.

### **formatTime()**

Convertit des secondes en format MM:SS.

```typescript
formatTime(seconds: number): string
```

**Exemples** :
```typescript
formatTime(125)  // → "02:05"
formatTime(600)  // → "10:00"
formatTime(45)   // → "00:45"
formatTime(0)    // → "00:00"
```

**Usage** :
```typescript
import { formatTime } from "../utils/liveMatchHelpers";

const timer = 125; // seconds
const displayTime = formatTime(timer); // "02:05"
```

---

### **getActionDescription()**

Génère une description textuelle en français d'une action.

```typescript
getActionDescription(action: any, playerName: string): string
```

**Paramètres** :
- `action` : Action de la BDD (avec `action_type`, `specification`, `points`, `player_number`)
- `playerName` : Nom du joueur

**Retour** :
- Description formatée avec numéro de joueur (ex: `"23 - LeBron (+3)"`)

**Exemples** :
```typescript
const action1 = {
  action_type: ActionType.SHOT,
  specification: ShotSpecification.MADE,
  points: 3,
  player_number: 23
};
getActionDescription(action1, "LeBron")
// → "23 - LeBron (+3)"

const action2 = {
  action_type: ActionType.SHOT,
  specification: ShotSpecification.MISSED,
  points: 2,
  player_number: 10
};
getActionDescription(action2, "Kobe")
// → "10 - Kobe Raté (2pts)"

const action3 = {
  action_type: ActionType.REBOUND,
  specification: ReboundSpecification.DEFENSIVE,
  player_number: 34
};
getActionDescription(action3, "Shaq")
// → "34 - Shaq Rebond Déf"
```

**Actions supportées** :
| Action | Specification | Description |
|--------|---------------|-------------|
| SHOT | MADE (3pts) | `"XX - Nom (+3)"` |
| SHOT | MADE (2pts) | `"XX - Nom (+2)"` |
| SHOT | MADE (1pt) | `"XX - Nom (+1)"` |
| SHOT | MISSED (3pts) | `"XX - Nom Raté (3pts)"` |
| SHOT | MISSED (2pts) | `"XX - Nom Raté (2pts)"` |
| SHOT | MISSED (1pt) | `"XX - Nom Raté (LF)"` |
| REBOUND | DEFENSIVE | `"XX - Nom Rebond Déf"` |
| REBOUND | OFFENSIVE | `"XX - Nom Rebond Off"` |
| FOUL | - | `"XX - Faute Nom"` |
| ASSIST | - | `"XX - Nom Passe décisive"` |
| STEAL | - | `"XX - Nom Interception"` |
| BLOCK | - | `"XX - Nom Contre"` |
| TURNOVER | - | `"XX - Nom Perte de balle"` |

**Cas spécial** : Score rapide adversaire (numéro 9999) :
```typescript
const action = {
  action_type: ActionType.SHOT,
  specification: ShotSpecification.MADE,
  points: 2,
  player_number: 9999,
  team: Team.OPPONENT
};
getActionDescription(action, "Adversaire")
// → "Adversaire +2" (sans numéro)
```

---

### **getPeriodLabel()**

Retourne le label d'une période selon le format du match.

```typescript
getPeriodLabel(periodNumber: number, maxPeriods: number = 4): string
```

**Paramètres** :
- `periodNumber` : Numéro de période (1-based)
- `maxPeriods` : Nombre total de périodes (2 ou 4)

**Retour** :
- Label de période : `"Q1"`, `"MT2"`, `"OT1"`, etc.

**Exemples** :
```typescript
// Format 4 quarters
getPeriodLabel(1, 4)  // → "Q1"
getPeriodLabel(2, 4)  // → "Q2"
getPeriodLabel(4, 4)  // → "Q4"
getPeriodLabel(5, 4)  // → "OT1" (overtime)
getPeriodLabel(6, 4)  // → "OT2"

// Format 2 halves (mi-temps)
getPeriodLabel(1, 2)  // → "MT1"
getPeriodLabel(2, 2)  // → "MT2"
getPeriodLabel(3, 2)  // → "OT1"
```

---

## 🔄 matchDataConverters.ts

Fonctions de conversion entre formats de données (BDD ↔ UI).

### **convertActionToMatchEvent()**

Convertit une action de la BDD en `MatchEvent` pour l'UI.

```typescript
convertActionToMatchEvent(
  action: DatabaseAction,
  players: DatabasePlayer[],
  opponentName?: string
): MatchEvent
```

**Paramètres** :
- `action` : Action depuis la BDD SQLite
- `players` : Liste des joueurs (pour récupérer le nom)
- `opponentName` : Nom de l'adversaire (défaut: "Adversaire")

**Retour** :
- `MatchEvent` : Objet formaté pour l'UI avec description, coordonnées, etc.

**Exemple** :
```typescript
const dbAction = {
  id: 42,
  player_number: 23,
  team: Team.MY_TEAM,
  action_type: ActionType.SHOT,
  specification: ShotSpecification.MADE,
  points: 3,
  semantic_x: 0.8,
  semantic_y: 0.3,
  period_number: 2,
  time_in_period: 360
};

const event = convertActionToMatchEvent(dbAction, players, "Lakers");
// {
//   id: "evt-42",
//   action_type: "SHOT",
//   specification: "MADE",
//   points: 3,
//   playerId: "player-uuid-123",
//   playerNumber: 23,
//   teamId: "HOME",
//   coordinates: { x: 0.8, y: 0.3 },
//   description: "23 - LeBron (+3)",
//   period_number: 2,
//   time_in_period: 360
// }
```

---

### **convertActionsToMatchEvents()**

Convertit un tableau d'actions en tableau de `MatchEvent`.

```typescript
convertActionsToMatchEvents(
  actions: DatabaseAction[],
  players: DatabasePlayer[],
  opponentName?: string
): MatchEvent[]
```

**Usage** :
```typescript
const events = convertActionsToMatchEvents(actionsFromDB, players, "Lakers");
// → Array of MatchEvent objects
```

---

### **calculateScoresFromActions()**

Calcule les scores à partir des actions (compte uniquement les tirs réussis).

```typescript
calculateScoresFromActions(
  actions: DatabaseAction[],
  isHome: boolean = true
): { scoreHome: number; scoreAway: number }
```

**Paramètres** :
- `actions` : Toutes les actions du match
- `isHome` : Mon équipe joue à domicile (`true`) ou à l'extérieur (`false`)

**Retour** :
- Objet avec `scoreHome` et `scoreAway`

**Logique** :
- Compte uniquement les actions avec `specification === ShotSpecification.MADE`
- Si `isHome === true` :
  - `Team.MY_TEAM` → `scoreHome`
  - `Team.OPPONENT` → `scoreAway`
- Si `isHome === false` :
  - `Team.MY_TEAM` → `scoreAway`
  - `Team.OPPONENT` → `scoreHome`

**Exemple** :
```typescript
const actions = [
  { action_type: "SHOT", specification: "MADE", points: 3, team: Team.MY_TEAM },
  { action_type: "SHOT", specification: "MADE", points: 2, team: Team.OPPONENT },
  { action_type: "SHOT", specification: "MISSED", points: 2, team: Team.MY_TEAM }, // Pas compté
];

const scores = calculateScoresFromActions(actions, true);
// → { scoreHome: 3, scoreAway: 2 }
```

---

## 📝 logger.ts

Wrapper autour de [LoggerService](../services/LoggerService.ts) pour faciliter l'utilisation.

### **Fonctions disponibles**

```typescript
logInfo(tag: string, message: string, data?: any): void
logWarn(tag: string, message: string, data?: any): void
logError(tag: string, message: string, data?: any): void
getLogs(): Promise<string>
clearLogs(): void
shareLogs(): void
setLoggingEnabled(enabled: boolean): void
getLogFilePath(): string
```

### **Usage**

```typescript
import { logInfo, logError } from "../utils/logger";

// Dans un composant/screen
logInfo("DashboardScreen", "Screen mounted");

// Avec données supplémentaires
logInfo("TeamService", "Team created", { teamId: team.id, name: team.name });

// Erreurs
try {
  await someAsyncOperation();
} catch (error) {
  logError("MatchSync", "Failed to sync match", { error: error.message });
}

// Warnings
logWarn("PlayerCard", "Missing player photo", { playerId });
```

### **Niveaux de log**

| Niveau | Fonction | Usage |
|--------|----------|-------|
| INFO | `logInfo()` | Informations générales, events |
| WARN | `logWarn()` | Avertissements, données manquantes |
| ERROR | `logError()` | Erreurs, exceptions |

### **Format des logs**

```
[2025-01-20 15:30:45] [INFO] [DashboardScreen] Screen mounted
[2025-01-20 15:30:50] [ERROR] [MatchSync] Failed to sync match | {"error": "Network error"}
```

### **Gestion des logs**

```typescript
// Récupérer les logs
const logs = await getLogs();
console.log(logs);

// Partager les logs (ouvre share dialog)
await shareLogs();

// Effacer les logs
clearLogs();

// Activer/désactiver
setLoggingEnabled(false); // Désactive en production
```

**Note** : Les logs sont sauvegardés dans un fichier local via Expo FileSystem.

---

## 🎲 mockActions.ts

Fichier de génération de données de test pour le développement.

### **generateMockActions()**

Génère des actions aléatoires pour tester le match en direct.

```typescript
generateMockActions(
  matchId: number,
  totalPeriods: number,
  periodDuration: number
): DatabaseAction[]
```

**Usage** :
```typescript
import { generateMockActions } from "../utils/mockActions";

const mockActions = generateMockActions(matchId, 4, 10);
// → Array de ~50 actions aléatoires réparties sur 4 périodes
```

### **MOCK_ROSTER / MOCK_OPPONENT_ROSTER**

Rosters de test pour le développement.

```typescript
export const MOCK_ROSTER = [
  { player_id: "1", player_number: 23, player_name: "LeBron James", team: "MyTeam" },
  { player_id: "2", player_number: 30, player_name: "Stephen Curry", team: "MyTeam" },
  // ...
];

export const MOCK_OPPONENT_ROSTER = [
  { player_id: "opp1", player_number: 24, player_name: "Kobe Bryant", team: "Opponent" },
  // ...
];
```

---

## 🔗 Types utilisés

### **DatabaseAction**

Format d'une action dans la BDD SQLite.

```typescript
interface DatabaseAction {
  id: number;
  player_number: number;
  team: Team.MY_TEAM | Team.OPPONENT;
  action_type: string;
  specification?: string;
  points?: number;
  semantic_x: number | null;
  semantic_y: number | null;
  timestamp?: string;
  period_number: number;
  time_in_period: number;
}
```

### **DatabasePlayer**

Format d'un joueur dans la BDD.

```typescript
interface DatabasePlayer {
  player_id?: string | null;
  player_number: number;
  player_name: string;
  team: "MyTeam" | "Opponent";
}
```

### **MatchEvent**

Format d'un événement pour l'UI (voir [liveMatchConstants.ts](../constants/liveMatchConstants.ts)).

---

## 💡 Bonnes pratiques

### Quand créer un helper ?

Créer un helper quand :
- ✅ La fonction est réutilisée dans 2+ fichiers
- ✅ La logique est complexe et mérite d'être isolée
- ✅ La fonction est pure (pas d'effets de bord)
- ✅ La fonction est spécifique au domaine métier

Ne PAS créer de helper pour :
- ❌ Logique métier qui appartient au service
- ❌ Logique UI qui appartient au composant
- ❌ Fonction utilisée une seule fois

### Nommage

- **Verbes** pour actions : `formatTime()`, `calculateScore()`, `convertAction()`
- **get** pour récupération : `getActionDescription()`, `getPeriodLabel()`
- **is/has** pour booléens : `isValidAction()`, `hasCoordinates()`

### TypeScript

- Toujours typer les paramètres et le retour
- Utiliser des interfaces pour les objets complexes
- Documenter avec JSDoc

```typescript
/**
 * Description de la fonction
 * @param param1 - Description du paramètre
 * @param param2 - Description du paramètre
 * @returns Description du retour
 */
export function myHelper(param1: string, param2: number): string {
  // ...
}
```

---

## 📚 Voir aussi

- [src/utils/](../src/utils/) - Helpers généraux (non-métier)
- [services/LoggerService.ts](../services/LoggerService.ts) - Service de logging
- [constants/liveMatchConstants.ts](../constants/liveMatchConstants.ts) - Types `MatchEvent`, `TeamId`
- [src/models/ActionTypes.ts](../src/models/ActionTypes.ts) - Types d'actions
