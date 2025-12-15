# New Match Components

Ce dossier contient tous les composants utilisés dans le flow de création de match ([NewMatchScreen.tsx](../../screens/NewMatchScreen.tsx)).

## Architecture

Le flow de création de match est divisé en 2 étapes :

### Step 1 : Configuration du match
- Sélection de l'équipe
- Nom de l'adversaire
- Format du match (4 QT / 2 MT)
- Lieu (Domicile / Extérieur)
- Option : Statistiques adverses

### Step 2 : Feuille de match
- Sélection des joueurs présents (Mon équipe)
- Désignation du 5 de départ
- Ajout de renforts temporaires
- Configuration de l'effectif adverse (optionnel)

## Composants

### Communs
- **`MatchHeader`** : Header avec navigation et barre de progression
- **`MatchFooter`** : Footer avec bouton d'action (Suivant / Coup d'envoi)

### Step 1 - Configuration
- **`TeamSelector`** : Affichage de l'équipe sélectionnée
- **`OpponentInput`** : Input pour le nom de l'adversaire
- **`MatchFormatSelector`** : Sélecteur de format avec présets (4QT/2MT) et ajustements personnalisés
- **`LocationSelector`** : Toggle Domicile/Extérieur
- **`OpponentStatsToggle`** : Option pour activer le tracking des stats adverses

### Step 2 - Rosters
- **`RosterTabSwitch`** : Toggle animé entre "NOUS" et "EUX"
- **`HomeRosterView`** : Vue complète de l'effectif de mon équipe
  - **`PlayerRosterCard`** : Card joueur avec checkbox (sélection) et étoile (titulaire)
  - **`AddPlayerForm`** : Formulaire d'ajout de renfort
- **`OpponentRosterView`** : Vue complète de l'effectif adverse
  - **`OpponentPlayerCard`** : Card joueur adverse avec étoile et bouton supprimer

## Constantes

Toutes les constantes sont centralisées dans [`constants/matchConstants.ts`](../../constants/matchConstants.ts) :

```typescript
// Types
MatchCreationStep = 1 | 2

// Présets de format
MATCH_FORMAT_PRESETS = {
  QUARTERS: { totalPeriods: 4, periodDuration: 10 },
  HALVES: { totalPeriods: 2, periodDuration: 20 }
}

// Limites
ROSTER_LIMITS = {
  MIN_PLAYERS: 1,
  STARTERS: 5,
  QUICK_ADD: { SMALL: 5, LARGE: 8 },
  PERIOD: { MIN: 1, MAX: 8 },
  DURATION: { MIN: 1, MAX: 60 }
}

// Messages
MATCH_VALIDATION_MESSAGES
MATCH_CREATION_BUTTON_LABELS
MATCH_CREATION_INFO_MESSAGES
MATCH_CREATION_FORM_LABELS
MATCH_ROSTER_TAB_LABELS
```

## Couleurs

Les couleurs sont centralisées dans le theme ([`src/theme/`](../../src/theme/)) :

- `BRAND_COLORS` : Couleurs primaires (orange)
- `SLATE_COLORS` : Couleurs neutres (gris)
- `STATUS_COLORS` : Couleurs de statut (succès, erreur, etc.)
- `UI_COLORS` : Couleurs d'éléments UI (étoiles, badges)
- `OPACITY` : Constantes d'opacité

## Utilisation

```typescript
import {
  MatchHeader,
  TeamSelector,
  OpponentInput,
  MatchFormatSelector,
  LocationSelector,
  OpponentStatsToggle,
  RosterTabSwitch,
  HomeRosterView,
  OpponentRosterView,
  MatchFooter,
} from "../components/NewMatch";
```

## Bénéfices de cette architecture

✅ **Composants réutilisables** : Chaque composant est indépendant et réutilisable
✅ **Maintenabilité** : Code organisé et facile à maintenir
✅ **Lisibilité** : Fichier principal réduit de 1990 lignes à 648 lignes
✅ **Constantes centralisées** : Facile de modifier les textes et limites
✅ **Thème unifié** : Utilisation cohérente des couleurs
✅ **TypeScript** : Typage complet avec interfaces claires
✅ **Commentaires JSDoc** : Documentation inline pour chaque fonction

## Statistiques

- **Fichier original** : ~1990 lignes
- **Fichier refactorisé** : ~648 lignes (-67%)
- **Composants créés** : 14
- **Constantes ajoutées** : 10 groupes
- **Couleurs ajoutées au theme** : 4
