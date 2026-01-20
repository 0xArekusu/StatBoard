# LiveMatch Components

Ce dossier contient les composants utilisés dans l'écran de match en direct ([LiveMatchScreen.tsx](../../screens/LiveMatchScreen.tsx)).

## 🏀 Vue d'ensemble

Le système de **Live Match** permet le tracking en temps réel des statistiques de basketball pendant un match. Les composants sont optimisés pour une interaction rapide et fluide pendant le jeu.

## 📁 Structure

```
LiveMatch/
├── index.ts              # Exports centralisés
├── CourtView.tsx         # Terrain interactif avec markers
├── MatchHeader.tsx       # Score, timer, périodes
└── MatchToolbar.tsx      # Barre d'outils (annuler, filtres, historique)
```

## 🧩 Composants

### **CourtView**

Affiche le terrain de basketball avec visualisation des actions.

**Responsabilités** :
- Affichage du terrain SVG interactif
- Placement des markers colorés selon les actions
- Filtrage des actions par type et joueur
- Animation fade-in/out du dernier marker quand stats cachées
- Gestion du clic sur le terrain

**Props** :
```typescript
{
  onCourtClick: (x: number, y: number) => void;
  events: MatchEvent[];                    // Actions du match
  showMarkers: boolean;                    // Afficher/masquer les markers
  filterMode: FilterMode;                  // Filtre actif (ALL, SHOOTING, etc.)
  selectedPlayerIds: string[];             // Joueurs sélectionnés pour filtrage
  clubLogoUrl: string | null;              // Logo au centre du terrain
  courtBackgroundColor: string;            // Couleur du parquet
  courtLineColor: string;                  // Couleur des lignes
}
```

**Features** :
- **Markers colorés** : Chaque action a sa couleur (voir `ActionTypes.ts`)
- **Filtrage** : Par type d'action (tirs, rebonds, fautes...) et par joueur
- **Animation temporaire** : Quand `showMarkers=false`, affiche brièvement le dernier marker (2s)
- **Coordonnées normalisées** : Les positions sont en 0-1, converties en SVG

**Utilisation** :
```typescript
<CourtView
  onCourtClick={handleCourtClick}
  events={matchEvents}
  showMarkers={showMarkers}
  filterMode={filterMode}
  selectedPlayerIds={[]}
  clubLogoUrl={club.logoUrl}
  courtBackgroundColor={club.courtBackgroundColor}
  courtLineColor={club.courtLineColor}
/>
```

---

### **MatchHeader**

Header du match affichant le score, le timer et les contrôles de période.

**Responsabilités** :
- Affichage du score (2 équipes)
- Timer du match avec bouton play/pause
- Indicateur de période (Q1, Q2, MT1, MT2...)
- Bouton de passage à la période suivante
- Bouton de substitution
- Boutons de score rapide adversaire (+1, +2, +3) si `trackOpponentStats=false`

**Props** :
```typescript
{
  match: {
    myTeamName?: string;
    opponent?: string;
    scoreHome: number;
    scoreAway: number;
    location: TeamId;              // HOME ou AWAY
    trackOpponentStats?: boolean;  // Si false, affiche boutons +1/+2/+3
  };
  timer: number;                   // Temps en secondes
  quarter: number;                 // Période actuelle (1-based)
  maxPeriods: number;              // Nombre total de périodes (4 ou 2)
  isRunning: boolean;              // Timer en cours
  onToggleTimer: () => void;
  onNextQuarter: () => void;
  onOpenSubstitution: () => void;
  onOpponentScoreSimple?: (value: number) => void;
}
```

**Layout** :
```
┌────────────────────────────────────────────┐
│  [Score]      [Timer]      [Score]         │
│  Équipe A      Q1 →        Équipe B        │
│  [CHANGT]   [▶ PLAY]       [+1][+2][+3]    │
└────────────────────────────────────────────┘
```

**Features** :
- **Score dynamique** : Adapte l'affichage selon `match.location` (HOME/AWAY)
- **Timer monospace** : Affichage style chronomètre (MM:SS)
- **Bouton play/pause** : Change de couleur selon l'état
- **Score rapide** : Si l'adversaire n'a pas de stats détaillées, boutons +1/+2/+3

**Helpers utilisés** :
- `formatTime(seconds)` : Convertit 125 → "02:05"
- `getPeriodLabel(quarter, maxPeriods)` : Retourne "Q1", "MT2", etc.

---

### **MatchToolbar**

Barre d'outils en bas de l'écran pour les actions secondaires.

**Responsabilités** :
- Bouton **Annuler** : Annuler la dernière action
- Bouton **Filtres** : Ouvrir le modal de filtres
- Bouton **Vue** : Toggle affichage des markers sur le terrain
- Bouton **Test** : Générer des données mock (dev)
- Bouton **Historique** : Ouvrir la liste des actions

**Props** :
```typescript
{
  filterMode: FilterMode;
  showMarkers: boolean;
  isGeneratingMockData: boolean;
  onUndo: () => void;
  onOpenFilter: () => void;
  onToggleMarkers: () => void;
  onGenerateMock: () => void;
  onOpenHistory: () => void;
}
```

**Features** :
- **Indicateurs visuels** : Les boutons actifs changent de couleur
- **Confirmation mock** : Alerte avant de générer des données test
- **Position fixe** : `position: absolute, bottom: 0`

---

## 🔄 Flow d'interaction

### 1. Action depuis le terrain

```
User clique sur terrain
    ↓
CourtView.onCourtClick(x, y)
    ↓
LiveMatchScreen stocke coordinates
    ↓
Ouvre ActionModal pour sélection type
    ↓
User sélectionne joueur + action
    ↓
Event créé avec coordinates
    ↓
Marker apparaît sur CourtView
```

### 2. Gestion du timer

```
User clique Play/Pause
    ↓
MatchHeader.onToggleTimer()
    ↓
LiveMatchScreen toggle isRunning
    ↓
useEffect démarre interval (1s)
    ↓
Timer décompte
    ↓
Affichage mis à jour via formatTime()
```

### 3. Passage de période

```
User clique bouton →
    ↓
MatchHeader.onNextQuarter()
    ↓
LiveMatchScreen vérifie si fin du match
    ↓
Si non: Incrémente quarter, reset timer
    ↓
Si oui: Ouvre EndMatchModal
```

## 📊 Types et constantes

### **MatchEvent** (interface)

Représente une action enregistrée pendant le match.

```typescript
interface MatchEvent {
  id: string;
  action_type: string;           // ActionType (SHOT, REBOUND, FOUL...)
  specification?: string;        // Sous-type (MADE, MISSED, OFFENSIVE...)
  points?: number;               // Points marqués (1, 2, 3)
  playerId?: string;
  playerNumber?: number;         // Numéro de maillot
  teamId: "HOME" | "AWAY";
  timestamp: number;
  description: string;           // Ex: "#23 - Tir à 2pts réussi"
  coordinates?: { x: number; y: number };  // Position 0-1
  period_number?: number;
  time_in_period?: number;
}
```

### **FilterMode** (enum)

Modes de filtrage des actions sur le terrain.

```typescript
enum FilterMode {
  ALL = "ALL",
  SHOOTING = "SHOOTING",
  REBOUNDS = "REBOUNDS",
  FOULS = "FOULS",
  TURNOVERS = "TURNOVERS",
  BLOCKS = "BLOCKS",
  STEALS = "STEALS"
}
```

### **TeamId** (enum)

Identifiant d'équipe.

```typescript
enum TeamId {
  HOME = "HOME",
  AWAY = "AWAY"
}
```

## 🎨 Couleurs des markers

Les couleurs sont définies dans `src/models/ActionTypes.ts` via `getActionColor()` :

| Action | Couleur |
|--------|---------|
| Tir réussi 2pts | Vert (#22c55e) |
| Tir réussi 3pts | Violet (#a855f7) |
| Tir raté | Rouge (#ef4444) |
| Rebond offensif | Orange (#f97316) |
| Rebond défensif | Bleu (#3b82f6) |
| Faute | Jaune (#eab308) |
| Turnover | Rose (#ec4899) |
| Block | Cyan (#06b6d4) |
| Steal | Emeraude (#10b981) |

## 🔧 Helpers

Les composants utilisent des helpers centralisés :

### `utils/liveMatchHelpers.ts`
- `formatTime(seconds: number): string` - Format MM:SS
- `getPeriodLabel(quarter: number, maxPeriods: number): string` - "Q1", "MT2"
- `getActionDescription(event: MatchEvent): string` - Description textuelle

### `utils/matchDataConverters.ts`
- `convertActionsToMatchEvents(actions: Action[]): MatchEvent[]`
- `calculateScoresFromActions(actions: Action[]): { home: number; away: number }`

## 📚 Dépendances

- **BasketballCourtSVG** : Composant SVG du terrain ([BasketballCourtSVG.tsx](../BasketballCourtSVG.tsx))
- **ActionTypes** : Types et couleurs d'actions ([src/models/ActionTypes.ts](../../src/models/ActionTypes.ts))
- **liveMatchConstants** : Constantes ([constants/liveMatchConstants.ts](../../constants/liveMatchConstants.ts))
- **ThemeContext** : Thème de l'app ([src/contexts/ThemeContext.tsx](../../src/contexts/ThemeContext.tsx))

## 🚀 Utilisation

```typescript
import { CourtView, MatchHeader, MatchToolbar } from "../components/LiveMatch";

// Dans LiveMatchScreen
<View style={styles.container}>
  <MatchHeader
    match={matchData}
    timer={timer}
    quarter={currentQuarter}
    maxPeriods={totalPeriods}
    isRunning={isTimerRunning}
    onToggleTimer={handleToggleTimer}
    onNextQuarter={handleNextQuarter}
    onOpenSubstitution={handleOpenSubstitution}
    onOpponentScoreSimple={handleOpponentScoreSimple}
  />

  <CourtView
    onCourtClick={handleCourtClick}
    events={events}
    showMarkers={showMarkers}
    filterMode={filterMode}
    selectedPlayerIds={selectedPlayerIds}
    clubLogoUrl={club?.logoUrl}
    courtBackgroundColor={club?.courtBackgroundColor}
    courtLineColor={club?.courtLineColor}
  />

  <MatchToolbar
    filterMode={filterMode}
    showMarkers={showMarkers}
    isGeneratingMockData={isGeneratingMockData}
    onUndo={handleUndo}
    onOpenFilter={handleOpenFilter}
    onToggleMarkers={handleToggleMarkers}
    onGenerateMock={handleGenerateMock}
    onOpenHistory={handleOpenHistory}
  />
</View>
```

## 🔗 Voir aussi

- [LiveMatchScreen.tsx](../../screens/LiveMatchScreen.tsx) - Écran principal
- [LiveMatchModals.tsx](../LiveMatchModals.tsx) - Modals du match live
- [constants/liveMatchConstants.ts](../../constants/liveMatchConstants.ts) - Constantes
- [utils/liveMatchHelpers.ts](../../utils/liveMatchHelpers.ts) - Helpers
- [MatchActionGrid.tsx](../MatchActionGrid.tsx) - Grille de sélection d'actions
