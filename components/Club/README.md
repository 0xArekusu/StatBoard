# Club Components

Ce dossier contient les composants liés à la gestion des **clubs** et des **abonnements**.

## 🏀 Vue d'ensemble

Le système de **Club** permet aux utilisateurs de :
1. **Créer un club** avec couleurs personnalisées et logo
2. **Rejoindre un club** via un code à 6 chiffres
3. **Gérer les informations** du club (nom, couleurs, logo)
4. **Voir l'abonnement** et les limites (équipes, joueurs)
5. **Afficher les équipes** du club

## 📁 Structure

```
Club/
├── index.ts                # Exports centralisés
├── CreateClubForm.tsx      # Formulaire création/édition club
├── JoinClubForm.tsx        # Formulaire rejoindre club
├── ClubInfoView.tsx        # Affichage infos club
├── ColorPickerModal.tsx    # Modal sélection couleur
├── CourtPreview.tsx        # Prévisualisation terrain
├── SubscriptionView.tsx    # Vue abonnement et limites
└── TeamCard.tsx            # Card équipe du club
```

## 🧩 Composants

### **CreateClubForm**

Formulaire de création ou édition d'un club.

**Responsabilités** :
- Saisie des informations club (nom, acronyme)
- Sélection du logo (via image picker)
- Choix des couleurs personnalisées :
  - Couleur primaire (maillots, UI)
  - Couleur secondaire (accents)
  - Couleur fond terrain
  - Couleur lignes terrain
- Prévisualisation en temps réel du terrain
- Validation du formulaire

**Props** :
```typescript
{
  formData: ClubFormData;
  setFormData: (data: ClubFormData) => void;
  onPickImage: () => void;
  onSubmit: () => void;
  isEditMode: boolean;
}
```

**FormData** :
```typescript
interface ClubFormData {
  name: string;                    // Nom du club (max 30 chars)
  acronym: string;                 // Sigle (max 5 chars)
  logoUri: string | null;          // URI du logo local
  primaryColor: string;            // Hex (#RRGGBB)
  secondaryColor: string;          // Hex (#RRGGBB)
  courtBackgroundColor: string;    // Hex (#RRGGBB)
  courtLineColor: string;          // Hex (#RRGGBB)
}
```

**Features** :
- **Logo** : Upload d'image, preview, icône par défaut si vide
- **Palettes de couleurs** : Couleurs pré-définies dans `clubConstants.ts`
- **Preview terrain** : Mise à jour en temps réel
- **Validation** :
  - Nom requis (3-30 caractères)
  - Acronyme requis (1-5 caractères)
  - Couleurs valides (format hex)

**Constantes** :
```typescript
// constants/clubConstants.ts
CLUB_COLOR_PALETTE = [
  { name: "Orange", value: "#F97316" },
  { name: "Bleu", value: "#3B82F6" },
  // ...
];

COURT_COLOR_PALETTE = [
  { name: "Parquet clair", value: "#D4A574" },
  { name: "Parquet foncé", value: "#8B6F47" },
  { name: "Vert", value: "#1A472A" },
  // ...
];
```

---

### **JoinClubForm**

Formulaire pour rejoindre un club existant via code.

**Responsabilités** :
- Input code à 6 chiffres
- Validation du code
- Affichage erreur si code invalide

**Props** :
```typescript
{
  code: string;
  setCode: (code: string) => void;
  onSubmit: () => void;
  error: string | null;
}
```

**Features** :
- **Input numérique** : Seulement des chiffres (0-9)
- **Max length** : 6 caractères
- **Auto-format** : Espaces tous les 3 chiffres (123 456)
- **Validation** : Code doit exister dans la BDD

**Usage** :
```typescript
<JoinClubForm
  code={clubCode}
  setCode={setClubCode}
  onSubmit={handleJoinClub}
  error={errorMessage}
/>
```

---

### **ClubInfoView**

Affichage des informations du club (vue lecture seule).

**Responsabilités** :
- Afficher logo, nom, acronyme
- Afficher couleurs (chips colorés)
- Afficher code du club (pour inviter)
- Bouton modifier (si owner)

**Props** :
```typescript
{
  club: Club;
  isOwner: boolean;
  onEdit?: () => void;
}
```

**Features** :
- **Code partageable** : Bouton copier dans presse-papier
- **Couleurs** : Aperçu visuel des couleurs personnalisées
- **Logo** : Affichage du logo ou icône par défaut
- **Bouton éditer** : Visible uniquement pour le owner

**Example** :
```
┌─────────────────────────────┐
│      [LOGO]                 │
│   Lakers Basketball         │
│   Code: 123456 [📋]         │
│                             │
│   Couleurs:                 │
│   █ #552583  █ #FDB927      │
│                             │
│   [✏️ Modifier]             │
└─────────────────────────────┘
```

---

### **ColorPickerModal**

Modal de sélection de couleur avec palette et picker custom.

**Responsabilités** :
- Afficher palette de couleurs pré-définies
- Color picker hex manuel
- Prévisualisation de la couleur
- Validation du hex

**Props** :
```typescript
{
  visible: boolean;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  currentColor: string;
  palette: Array<{ name: string; value: string }>;
  title: string;
}
```

**Features** :
- **Palette** : Grid de couleurs pré-définies (tap pour sélectionner)
- **Custom picker** : Library `reanimated-color-picker`
- **Input hex** : Saisie manuelle (#RRGGBB)
- **Preview** : Cercle de prévisualisation
- **Validation** : Vérification format hex

**Usage** :
```typescript
<ColorPickerModal
  visible={showPrimaryPicker}
  onClose={() => setShowPrimaryPicker(false)}
  onSelectColor={(color) => setFormData({ ...formData, primaryColor: color })}
  currentColor={formData.primaryColor}
  palette={CLUB_COLOR_PALETTE}
  title="Couleur primaire"
/>
```

---

### **CourtPreview**

Prévisualisation miniature du terrain avec les couleurs personnalisées.

**Responsabilités** :
- Afficher le terrain SVG en miniature
- Appliquer les couleurs du club
- Afficher le logo au centre

**Props** :
```typescript
{
  backgroundColor: string;
  lineColor: string;
  logoUri: string | null;
}
```

**Features** :
- **SVG responsive** : S'adapte à la taille du container
- **Logo** : Affiché au centre du terrain
- **Mise à jour temps réel** : Change quand les couleurs changent

**Dimensions** : Ratio court de basket (94ft x 50ft)

---

### **SubscriptionView**

Vue de l'abonnement actuel et des limites.

**Responsabilités** :
- Afficher le plan actuel (FREE, PRO, CLUB)
- Afficher les limites (équipes, joueurs)
- Afficher l'usage actuel vs limites
- Bouton upgrade/downgrade

**Props** :
```typescript
{
  subscription: Subscription;
  currentUsage: {
    teams: number;
    playersPerTeam: number;
  };
  onUpgrade?: () => void;
}
```

**Subscription** :
```typescript
interface Subscription {
  plan: "FREE" | "PRO" | "CLUB";
  maxTeams: number;
  maxPlayersPerTeam: number;
  features: string[];
}
```

**Plans disponibles** :
```typescript
FREE: {
  maxTeams: 1,
  maxPlayersPerTeam: 15,
  features: ["1 équipe", "15 joueurs max", "Stats basiques"]
}

PRO: {
  maxTeams: 5,
  maxPlayersPerTeam: 30,
  features: ["5 équipes", "30 joueurs max", "Stats avancées", "Export PDF"]
}

CLUB: {
  maxTeams: Infinity,
  maxPlayersPerTeam: 50,
  features: ["Équipes illimitées", "50 joueurs max", "Tout inclus", "Support prioritaire"]
}
```

**Affichage** :
```
┌─────────────────────────────┐
│  Plan: PRO                  │
│  ────────────────────       │
│  Équipes: 3/5 ████░         │
│  Joueurs: 18/30 ██████░░    │
│                             │
│  Features:                  │
│  ✓ 5 équipes                │
│  ✓ 30 joueurs max           │
│  ✓ Stats avancées           │
│  ✓ Export PDF               │
│                             │
│  [⬆️ Upgrade vers CLUB]     │
└─────────────────────────────┘
```

---

### **TeamCard**

Card affichant une équipe du club.

**Responsabilités** :
- Afficher nom et catégorie de l'équipe
- Nombre de joueurs
- Bouton d'accès aux détails

**Props** :
```typescript
{
  team: Team;
  onPress: () => void;
}
```

**Team** :
```typescript
interface Team {
  id: string;
  name: string;
  category: string;          // "U11", "U13", "Seniors", etc.
  playerCount: number;
  clubId: string;
}
```

**Affichage** :
```
┌─────────────────────────────┐
│  Lakers U15                 │
│  Catégorie: U15             │
│  👥 12 joueurs              │
│                             │
│  [Voir les détails →]       │
└─────────────────────────────┘
```

---

## 🔄 Flow d'utilisation

### 1. Créer un club

```
User ouvre ClubScreen
    ↓
Tap "Créer un club"
    ↓
CreateClubForm s'affiche
    ↓
User saisit nom, acronyme
    ↓
User choisit couleurs via ColorPickerModal
    ↓
User upload logo (optionnel)
    ↓
Preview mis à jour (CourtPreview)
    ↓
User tap "Créer"
    ↓
Validation formData
    ↓
ClubService.createClub()
    ↓
Club créé avec code unique généré
    ↓
Navigation vers ClubInfoView
```

### 2. Rejoindre un club

```
User ouvre ClubScreen
    ↓
Tap "Rejoindre un club"
    ↓
JoinClubForm s'affiche
    ↓
User saisit code à 6 chiffres
    ↓
User tap "Rejoindre"
    ↓
ClubService.joinClubByCode(code)
    ↓
Si code valide:
  → ClubMember créé
  → Navigation vers ClubInfoView
Si code invalide:
  → Erreur affichée dans JoinClubForm
```

### 3. Gérer un club

```
User ouvre ClubScreen
    ↓
ClubInfoView affiche le club actif
    ↓
SubscriptionView affiche limites
    ↓
Liste TeamCard pour chaque équipe
    ↓
Si owner: Bouton "Modifier"
    ↓
CreateClubForm en mode édition
    ↓
User modifie couleurs/logo
    ↓
ClubService.updateClub()
```

---

## 📊 Constantes

Toutes les constantes sont dans `constants/clubConstants.ts` :

```typescript
// Types
ClubFormData

// Palettes
CLUB_COLOR_PALETTE: Array<{ name: string; value: string }>
COURT_COLOR_PALETTE: Array<{ name: string; value: string }>

// Limites
CLUB_NAME_MAX_LENGTH = 30
CLUB_ACRONYM_MAX_LENGTH = 5
CLUB_CODE_LENGTH = 6

// Defaults
DEFAULT_CLUB_COLORS = {
  primaryColor: "#F97316",
  secondaryColor: "#FB923C",
  courtBackgroundColor: "#1A472A",
  courtLineColor: "#FFFFFF"
}
```

---

## 🔗 Architecture

### Services utilisés

- **[ClubService](../../services/ClubService.ts)** : CRUD clubs
- **[ClubMemberService](../../services/ClubMemberService.ts)** : Gestion membres
- **[TeamService](../../services/TeamService.ts)** : CRUD équipes
- **[SubscriptionService](../../services/SubscriptionService.ts)** : Limites et plans
- **[PhotoUploadService](../../services/PhotoUploadService.ts)** : Upload logo

### Repositories

- **[SupabaseClubRepository](../../repositories/SupabaseClubRepository.ts)** : Accès BDD clubs
- **[SupabaseTeamRepository](../../repositories/SupabaseTeamRepository.ts)** : Accès BDD teams

### Contexts

- **[ClubContext](../../src/contexts/ClubContext.tsx)** : Club/équipe actifs
- **[AuthContext](../../src/contexts/AuthContext.tsx)** : Utilisateur connecté

---

## 🚀 Utilisation

```typescript
import {
  CreateClubForm,
  JoinClubForm,
  ClubInfoView,
  ColorPickerModal,
  CourtPreview,
  SubscriptionView,
  TeamCard
} from "../components/Club";

// Dans ClubScreen
<CreateClubForm
  formData={formData}
  setFormData={setFormData}
  onPickImage={handlePickImage}
  onSubmit={handleCreateClub}
  isEditMode={false}
/>
```

---

## 📚 Voir aussi

- [screens/club/ClubScreen.tsx](../../screens/club/ClubScreen.tsx) - Écran principal
- [services/ClubService.ts](../../services/ClubService.ts) - Logique métier
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architecture SOLID (Club Management)
- [constants/clubConstants.ts](../../constants/clubConstants.ts) - Constantes
- [src/contexts/ClubContext.tsx](../../src/contexts/ClubContext.tsx) - Context React
