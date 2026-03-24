# Coach Assistant - Contexte du Projet

## 🏀 Vue d'ensemble

**Coach Assistant** est une application mobile React Native permettant aux entraîneurs de basketball de gérer leurs équipes et suivre les statistiques de match en temps réel.

### Technologies principales
- **Framework** : React Native 0.81.5 + Expo ~54
- **Langage** : TypeScript ~5.9
- **Base de données** : SQLite (local) + Supabase (cloud sync)
- **Navigation** : React Navigation (Bottom Tabs + Native Stack)
- **State Management** : React Context API
- **UI** : React Native SVG, Reanimated, Bottom Sheet

## 📁 Structure du projet

```
coach-assistant/
├── .claude/                    # Documentation Claude Code
├── screens/                    # Écrans principaux de l'app
│   ├── authentication/         # Login, Register, AuthScreen
│   ├── club/                   # Gestion clubs et équipes
│   ├── DashboardScreen.tsx     # Écran d'accueil
│   ├── NewMatchScreen.tsx      # Création de match
│   ├── LiveMatchScreen.tsx     # Match en direct
│   ├── MatchDetailsScreen.tsx  # Détails post-match
│   └── HistoryScreen.tsx       # Historique des matchs
├── components/                 # Composants réutilisables
│   ├── NewMatch/               # Flow création match (DOCUMENTED ✓)
│   ├── LiveMatch/              # Composants match live
│   ├── MatchDetails/           # Onglets détails match
│   ├── Club/                   # Gestion des clubs
│   ├── dashboard/              # Composants dashboard
│   └── icons/                  # Icônes custom
├── services/                   # Couche métier (Business Logic)
├── repositories/               # Couche d'accès aux données (Pattern Repository)
├── models/                     # Modèles de domaine (DTOs)
├── src/
│   ├── contexts/               # React Contexts (Auth, Club, Theme)
│   ├── theme/                  # Système de design (colors, spacing, typography)
│   ├── utils/                  # Helpers généraux
│   ├── hooks/                  # Custom React hooks
│   └── services/               # Services additionnels
├── constants/                  # Constantes centralisées
├── utils/                      # Helpers métier (match, conversion)
├── hooks/                      # Hooks liés au métier
└── types/                      # Types TypeScript globaux
```

## 🏗️ Architecture

### Principes
- **SOLID** : Respect des principes SOLID (voir [ARCHITECTURE.md](../ARCHITECTURE.md))
- **Design Patterns** : Repository, Service Layer, Factory, Singleton, DTO
- **Séparation des responsabilités** :
  - `screens/` : UI + navigation
  - `components/` : Composants réutilisables
  - `services/` : Logique métier
  - `repositories/` : Accès données
  - `models/` : Types de domaine

### Flow de données
```
UI (screens + components)
    ↓
ServiceFactory.getXxxService()
    ↓
XxxService (business logic + validation)
    ↓
SupabaseXxxRepository (implements IXxxRepository)
    ↓
Supabase + SQLite
```

## 🎨 Système de design

Centralisé dans `src/theme/` :
- **colors.ts** : Palettes (BRAND, SLATE, STATUS, UI)
- **spacing.ts** : Espacements standardisés
- **typography.ts** : Tailles et styles de texte
- **commonStyles.ts** : Styles réutilisables

### ⛔ Règles couleurs — OBLIGATOIRES, SANS EXCEPTION

```tsx
// ❌ JAMAIS — isDark pour calculer des couleurs
const { isDark } = useTheme();
const bg = isDark ? "#1a1a1a" : "#ffffff"; // INTERDIT

// ❌ JAMAIS — couleurs hardcodées
<View style={{ backgroundColor: "#FF5733" }} />

// ✅ TOUJOURS — colors depuis useTheme()
const { colors } = useTheme();
<View style={{ backgroundColor: colors.surface }}>
  <Text style={{ color: colors.text.primary }}>OK</Text>
</View>

// ✅ TOUJOURS — STATUS_COLORS pour les états
import { STATUS_COLORS, COMMON_COLORS, OPACITY } from "../src/theme";
<View style={{ backgroundColor: STATUS_COLORS.error + "20" }} />
```

Palette : `colors.background`, `colors.surface`, `colors.surfaceVariant`, `colors.primary`, `colors.border`, `colors.text.primary/secondary/tertiary/disabled`

### ⛔ Règles taille fichiers — OBLIGATOIRES

- **Maximum ~150 lignes de JSX** par composant. Au-delà, extraire.
- Sections distinctes (header, liste, carte, footer) → fichiers séparés dans `components/<Feature>/`
- Un render helper `renderXxx` de +20 lignes → composant fichier séparé

## 🔑 Features principales

1. **Gestion d'équipes et clubs**
   - Créer/rejoindre un club
   - Gérer plusieurs équipes
   - Roster de joueurs
   - Couleurs personnalisées

2. **Création de match**
   - Configuration (adversaire, format, lieu)
   - Sélection de l'effectif
   - 5 de départ

3. **Match en direct**
   - Tracking temps réel des actions
   - Terrain interactif SVG
   - Substitutions
   - Score live

4. **Statistiques**
   - Détails par joueur
   - Graphiques d'évolution
   - Visualisation terrain
   - Export PDF

5. **Synchronisation**
   - Sauvegarde locale SQLite
   - Sync cloud Supabase
   - Mode offline

## 📝 Conventions de code

### Nommage
- **Composants** : PascalCase (`MatchHeader.tsx`)
- **Services** : PascalCase + "Service" (`TeamService.ts`)
- **Repositories** : "Supabase" + nom + "Repository" (`SupabaseTeamRepository.ts`)
- **Interfaces** : "I" + nom (`ITeamRepository.ts`)
- **Constants** : UPPER_SNAKE_CASE
- **Hooks** : "use" + nom (`useMatchSync.ts`)

### Organisation des fichiers
- Un composant = un fichier
- Index exports (`index.ts`) pour les dossiers de composants
- Constants regroupées par domaine dans `constants/`
- README.md pour les dossiers complexes

### TypeScript
- Typage strict activé
- Interfaces pour les props
- DTOs pour les transferts de données
- Pas de `any` (utiliser `unknown` si nécessaire)

## 🗄️ Base de données

### SQLite (local)
- Stockage offline
- Schema dans `SQLITE_DATABASE_STRUCTURE.md`

### Supabase (cloud)
- Auth (Google, Email)
- Tables : clubs, teams, club_members, players
- RLS (Row Level Security) activée
- Migrations dans `supabase/migrations/`

### Sync
- Hook `useMatchSync` (doc: `MATCH_SYNC_USAGE.md`)
- Stratégie : Local first, sync en background

## 🧩 Contextes React

Fichiers dans `src/contexts/` :
- **AuthContext** : Authentification utilisateur (Supabase)
- **ClubContext** : Club/équipe sélectionnés
- **ThemeContext** : Mode sombre/clair (future feature)

## 📚 Documentation existante

1. **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Architecture Club Management (SOLID + Patterns)
2. **[components/NewMatch/README.md](../components/NewMatch/README.md)** - Flow création de match
3. **[SQLITE_DATABASE_STRUCTURE.md](../SQLITE_DATABASE_STRUCTURE.md)** - Schéma SQLite
4. **[MATCH_SYNC_USAGE.md](../MATCH_SYNC_USAGE.md)** - Hook de synchronisation

## 🎯 Où trouver quoi ?

| Je cherche... | Où regarder |
|--------------|-------------|
| Un écran | `screens/` |
| Un composant réutilisable | `components/` |
| La logique métier | `services/` |
| L'accès aux données | `repositories/` |
| Un type/modèle | `models/` ou `types/` |
| Une constante | `constants/` |
| Une couleur | `src/theme/colors.ts` |
| Un helper | `utils/` ou `src/utils/` |
| Un hook custom | `hooks/` ou `src/hooks/` |
| La config Supabase | `src/config/supabase.ts` |
| Un contexte React | `src/contexts/` |

## 🚀 Scripts npm

```bash
npm start          # Démarrer Expo
npm run android    # Build Android
npm run ios        # Build iOS
npm run typecheck  # Vérifier TypeScript
```

## 💡 Pour Claude Code

### Quand créer un nouveau fichier
- **Service** : Si nouvelle logique métier (ex: StatisticsService)
- **Repository** : Si nouveau modèle de données (ex: IMatchRepository)
- **Component** : Si élément UI réutilisable
- **Screen** : Si nouvel écran de navigation
- **Constants** : Si nouvelles constantes métier

### Patterns à respecter
1. Toujours utiliser les interfaces pour les repositories
2. Passer par ServiceFactory pour instancier les services
3. Centraliser les constantes (pas de magic numbers/strings)
4. Utiliser le theme pour les couleurs
5. Préférer Edit à Write pour les fichiers existants
6. Créer un README.md si le dossier contient 5+ fichiers complexes

### Tests
- Actuellement : Pas de tests automatisés
- À venir : Jest + React Native Testing Library
