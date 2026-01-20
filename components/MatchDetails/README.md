# MatchDetails Components

Ce dossier contient les composants utilisés dans l'écran de détails de match post-jeu ([MatchDetailsScreen.tsx](../../screens/MatchDetailsScreen.tsx)).

## 📊 Vue d'ensemble

L'écran **MatchDetails** affiche les statistiques détaillées d'un match terminé à travers **4 onglets** :
1. **Stats** - Tableau statistiques complètes
2. **Cards** - Vue carte par joueur
3. **Court** - Visualisation des actions sur le terrain
4. **Evolution** - Graphique d'évolution du score

## 📁 Structure

```
MatchDetails/
├── index.ts                  # Exports centralisés
├── StatsTab.tsx              # Onglet tableau de stats
├── CardsTab.tsx              # Onglet cartes joueurs
├── CourtTab.tsx              # Onglet terrain avec filtres
├── EvolutionTab.tsx          # Onglet évolution du score
├── SharedComponents.tsx      # Composants partagés (ShootingBar)
├── PlayerDetailModal.tsx     # Modal détails d'un joueur
└── StatsLegendModal.tsx      # Modal légende des stats
```

## 🧩 Composants principaux

### **StatsTab**

Tableau de statistiques avec colonnes triables.

**Responsabilités** :
- Afficher les stats de tous les joueurs dans un tableau
- Tri par colonne (cliquable) : MIN, PTS, 2PT%, 3PT%, REB, AST, etc.
- Navigation vers détails joueur
- Affichage de la légende des stats

**Props** :
```typescript
{
  stats: PlayerStats[];              // Stats calculées par joueur
  sortBy: SortBy;                    // Colonne de tri actuelle
  sortOrder: SortOrder;              // ASC ou DESC
  handleSort: (column: SortBy) => void;
  setViewPlayer: (player: PlayerStats) => void;
}
```

**Features** :
- **Colonnes triables** : Clic sur header pour trier
- **Indicateur de tri** : Flèche ▲ ou ▼
- **Avatar joueur** : Photo + numéro
- **Légende** : Bouton "?" pour expliquer les abréviations
- **Scroll horizontal** : Pour voir toutes les colonnes

**Stats affichées** :
| Stat | Description |
|------|-------------|
| MIN | Minutes jouées |
| PTS | Points marqués |
| 2PM-2PA | Tirs 2pts réussis-tentés |
| 2PT% | Pourcentage 2pts |
| 3PM-3PA | Tirs 3pts réussis-tentés |
| 3PT% | Pourcentage 3pts |
| FTM-FTA | Lancers francs réussis-tentés |
| FT% | Pourcentage lancers francs |
| REB | Rebonds (OFF + DEF) |
| AST | Passes décisives |
| STL | Interceptions |
| BLK | Contres |
| TO | Pertes de balle |
| PF | Fautes |

---

### **CardsTab**

Vue en cartes des joueurs avec stats principales.

**Responsabilités** :
- Afficher chaque joueur dans une carte
- Barre de pourcentage de tir visuelle
- Tri des cartes (même critère que StatsTab)
- Navigation vers détails joueur

**Props** :
```typescript
{
  stats: PlayerStats[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  handleSort: (column: SortBy) => void;
  setViewPlayer: (player: PlayerStats) => void;
}
```

**Layout d'une carte** :
```
┌─────────────────────────────────────┐
│  [Avatar]  Joueur Name          #23 │
│            MIN: 32 | PTS: 18         │
│  ████████░░ 45% FG                   │
│  REB: 5 | AST: 3 | STL: 2           │
└─────────────────────────────────────┘
```

**Features** :
- **ShootingBar** : Barre de progression colorée selon le %
- **Tri rapide** : Dropdown pour changer le tri
- **Scroll vertical** : Liste scrollable
- **Tap pour détails** : Ouvre PlayerDetailModal

---

### **CourtTab**

Visualisation des actions sur le terrain avec filtres avancés.

**Responsabilités** :
- Afficher le terrain avec markers d'actions
- Filtres par type d'action (tirs, rebonds, etc.)
- Filtres par joueur (sélection multiple)
- Toggle équipe (Nous / Adversaire)

**Props** :
```typescript
{
  stats: PlayerStats[];
  actions: any[];                           // Toutes les actions du match
  selectedActionTypes: ActionFilterType[];  // Types d'actions filtrées
  setSelectedActionTypes: (types: ActionFilterType[]) => void;
  selectedSpecifications: string[];         // Spécifications (MADE, MISSED...)
  setSelectedSpecifications: (specs: string[]) => void;
  selectedPlayers: number[];                // Joueurs sélectionnés
  setSelectedPlayers: (players: number[]) => void;
  courtBackgroundColor: string;
  courtLineColor: string;
  logoUri: any;
  activeTeamFilter: "MyTeam" | "Opponent";
}
```

**Features** :
- **Filtres multiples** :
  - Type d'action (Tirs, Rebonds, Fautes, etc.)
  - Spécification (Réussi, Raté, Offensif, Défensif...)
  - Joueur (sélection multiple)
  - Équipe (Nous / Adversaire)
- **Markers colorés** : Couleurs selon type d'action
- **Court responsive** : Adapté portrait/landscape
- **Sélection joueur** : Tap sur avatar pour filtrer

**ActionFilterType** :
```typescript
enum ActionFilterType {
  SHOT = "SHOT",
  REBOUND = "REBOUND",
  FOUL = "FOUL",
  TURNOVER = "TURNOVER",
  STEAL = "STEAL",
  BLOCK = "BLOCK",
  ASSIST = "ASSIST"
}
```

---

### **EvolutionTab**

Graphique d'évolution du score au fil du match.

**Responsabilités** :
- Tableau score par période (Q1, Q2, Q3, Q4, OT...)
- Graphique linéaire de progression du score
- Visualisation de l'écart entre les équipes

**Props** :
```typescript
{
  match: any;         // Données du match (teams, location, etc.)
  actions: any[];     // Toutes les actions pour calculer progression
  colors: any;        // Theme colors
}
```

**Features** :
- **Tableau périodes** :
  ```
  │ Q1 │ Q2 │ Q3 │ Q4 │ Total │
  ├────┼────┼────┼────┼───────┤
  │ 18 │ 22 │ 15 │ 20 │  75   │ (Nous)
  │ 15 │ 18 │ 20 │ 22 │  75   │ (Eux)
  ```
- **Graphique SVG** :
  - Ligne pour chaque équipe
  - Points à chaque action qui change le score
  - Labels sur les axes
  - Responsive

**Calculs** :
- Score période par période : Somme des points dans chaque période
- Progression : Point par point au fil des actions
- Support overtime : OT1, OT2, OT3...

**Helper** :
```typescript
function getPeriodLabel(periodNumber: number, totalPeriods: number): string {
  // Returns: "Q1", "Q2", "MT1", "MT2", "OT1", etc.
}
```

---

## 🧩 Composants partagés

### **SharedComponents.tsx**

Composants réutilisés par plusieurs onglets.

#### **ShootingBar**

Barre de progression pour visualiser les pourcentages.

```typescript
<ShootingBar
  made={8}
  attempted={15}
  label="2PT"
  barColors={SHOOTING_BAR_COLORS}
/>
```

**Affichage** :
```
2PT: 8/15 (53%)
████████░░░░░░░░
```

**Couleurs** :
- < 30% : Rouge
- 30-39% : Orange
- 40-49% : Jaune
- 50%+ : Vert

---

## 🎭 Modals

### **PlayerDetailModal**

Modal affichant toutes les stats détaillées d'un joueur.

**Features** :
- Stats complètes (mêmes que StatsTab)
- Chart du % de tir
- Liste de toutes les actions du joueur
- Bouton fermer

**Ouverture** : Tap sur joueur dans StatsTab ou CardsTab

---

### **StatsLegendModal**

Modal expliquant les abréviations des stats.

**Contenu** :
```
MIN  - Minutes jouées
PTS  - Points marqués
2PM  - Tirs à 2 points réussis
2PA  - Tirs à 2 points tentés
...
```

**Ouverture** : Bouton "?" dans StatsTab

---

## 📊 Types et interfaces

### **PlayerStats** (interface)

Stats calculées pour un joueur.

```typescript
interface PlayerStats {
  playerId: string;
  playerName: string;
  playerNumber: number;
  minutes: number;
  points: number;
  twoPointsMade: number;
  twoPointsAttempted: number;
  threePointsMade: number;
  threePointsAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  // Calculated percentages
  twoPointPercentage?: number;
  threePointPercentage?: number;
  freeThrowPercentage?: number;
  fieldGoalPercentage?: number;
}
```

### **SortBy** (enum)

Colonnes de tri disponibles.

```typescript
enum SortBy {
  PLAYER = "PLAYER",
  MIN = "MIN",
  PTS = "PTS",
  FG = "FG",
  FG_PCT = "FG_PCT",
  TWO_PT = "TWO_PT",
  TWO_PT_PCT = "TWO_PT_PCT",
  THREE_PT = "THREE_PT",
  THREE_PT_PCT = "THREE_PT_PCT",
  FT = "FT",
  FT_PCT = "FT_PCT",
  REB = "REB",
  AST = "AST",
  STL = "STL",
  BLK = "BLK",
  TO = "TO",
  PF = "PF"
}
```

### **SortOrder** (enum)

```typescript
enum SortOrder {
  ASC = "ASC",
  DESC = "DESC"
}
```

---

## 🔄 Flow d'interaction

### 1. Navigation entre onglets

```
User tap sur onglet
    ↓
MatchDetailsScreen change activeTab state
    ↓
Render du composant correspondant
    ↓
Stats recalculées (useMemo)
```

### 2. Tri des stats

```
User clique header colonne
    ↓
StatsTab.handleSort(column)
    ↓
MatchDetailsScreen toggle sortOrder si même colonne
    ↓
Stats re-triées (useMemo)
    ↓
Affichage mis à jour
```

### 3. Filtrage du terrain

```
User sélectionne joueur dans CourtTab
    ↓
setSelectedPlayers([...ids])
    ↓
Actions filtrées par playerId
    ↓
Markers mis à jour sur terrain
```

---

## 🎨 Constantes

Toutes les constantes sont dans `constants/matchDetailsConstants.ts` :

```typescript
// Types
SortBy, SortOrder, PlayerStats, ActionFilterType

// Mappings
ACTION_FILTER: { label: string; value: ActionFilterType }[]
SPECIFICATION_LABELS: { [key: string]: string }

// Labels
STAT_LABELS: { [key in SortBy]: string }
```

---

## 🚀 Utilisation

```typescript
import {
  StatsTab,
  CardsTab,
  CourtTab,
  EvolutionTab,
  PlayerDetailModal,
  StatsLegendModal
} from "../components/MatchDetails";

// Dans MatchDetailsScreen
const renderActiveTab = () => {
  switch (activeTab) {
    case 0:
      return <StatsTab stats={stats} sortBy={sortBy} ... />;
    case 1:
      return <CardsTab stats={stats} sortBy={sortBy} ... />;
    case 2:
      return <CourtTab actions={actions} selectedPlayers={selectedPlayers} ... />;
    case 3:
      return <EvolutionTab match={match} actions={actions} colors={colors} />;
  }
};
```

---

## 📚 Voir aussi

- [MatchDetailsScreen.tsx](../../screens/MatchDetailsScreen.tsx) - Écran parent
- [constants/matchDetailsConstants.ts](../../constants/matchDetailsConstants.ts) - Constantes
- [BasketballCourtSVG.tsx](../BasketballCourtSVG.tsx) - Terrain SVG
- [PlayerAvatar.tsx](../PlayerAvatar.tsx) - Avatar joueur
- [src/theme/colors.ts](../../src/theme/colors.ts) - SHOOTING_BAR_COLORS
