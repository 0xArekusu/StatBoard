---
name: ui-context
description: Règles obligatoires pour tout code UI React Native dans ce projet — couleurs, thème, taille des composants
user-invocable: false
---

# Règles UI — Coach Assistant

Tu travailles sur un projet React Native avec un système de thème centralisé. Ces règles sont **non négociables** et s'appliquent à chaque fichier UI que tu crées ou modifies.

## 1. Couleurs — useTheme() UNIQUEMENT

### INTERDIT

```tsx
// ❌ isDark pour calculer des couleurs
const { isDark } = useTheme();
const bg = isDark ? "#1a1a1a" : "#ffffff";

// ❌ Couleurs hardcodées
<View style={{ backgroundColor: "#FF5733" }} />
<Text style={{ color: "#333" }} />

// ❌ rgba hardcodé
backgroundColor: "rgba(0,0,0,0.5)"
```

### OBLIGATOIRE

```tsx
// ✅ Toujours colors depuis useTheme
const { colors } = useTheme();

<View style={{ backgroundColor: colors.surface }}>
  <Text style={{ color: colors.text.primary }}>Titre</Text>
  <Text style={{ color: colors.text.secondary }}>Sous-titre</Text>
</View>

// ✅ Status colors pour succès/erreur/warning/info
import { STATUS_COLORS, COMMON_COLORS, OPACITY } from "../src/theme";
<View style={{ backgroundColor: STATUS_COLORS.error + "20" }}>
  <Text style={{ color: STATUS_COLORS.error }}>Erreur</Text>
</View>

// ✅ Opacité via constante
backgroundColor: colors.background + OPACITY.medium
```

### Palette disponible

**`colors` (depuis `useTheme()`)** — s'adapte dark/light automatiquement :
- `colors.background` — fond principal
- `colors.surface` — cartes, modals
- `colors.surfaceVariant` — fond alternatif
- `colors.primary` — couleur primaire du club
- `colors.border` — bordures
- `colors.text.primary` / `.secondary` / `.tertiary` / `.disabled`

**`STATUS_COLORS`** — toujours fixes :
- `STATUS_COLORS.success` / `.error` / `.warning` / `.info`

**`COMMON_COLORS`** :
- `COMMON_COLORS.white` / `.black`

## 2. Taille des fichiers — extraire des composants

Un fichier de composant ne doit **pas dépasser ~150 lignes de JSX**. Si c'est le cas, extraire.

### Quand extraire un composant

- Bloc JSX répété 2+ fois → composant
- Section logiquement distincte (header, liste, carte, footer) → composant
- Render helper `renderXxx` de plus de 20 lignes → composant fichier

### Où les mettre

- Composant spécifique à un seul écran → `components/<Feature>/`
- Composant réutilisable ailleurs → `components/` à la racine du dossier concerné

### Exemple

```
// Avant : LiveMatchScreen.tsx 400 lignes
// Après :
screens/LiveMatchScreen.tsx           ~80 lignes (orchestration)
components/LiveMatch/ScoreBoard.tsx   ~60 lignes
components/LiveMatch/ActionButtons.tsx ~70 lignes
components/LiveMatch/PlayerGrid.tsx   ~90 lignes
```

## 3. Tailles et espacements — useResponsive() UNIQUEMENT

### INTERDIT

```tsx
// ❌ Valeurs hardcodées pour padding, margin, fontSize, tailles d'éléments
<View style={{ padding: 16, marginBottom: 8 }}>
  <Text style={{ fontSize: 14 }}>...</Text>
</View>
<Image style={{ width: 40, height: 40 }} />  // ❌ taille avatar hardcodée
```

### OBLIGATOIRE

```tsx
// ✅ Toujours via useResponsive
import { useResponsive } from "../../src/hooks/useResponsive";
const { sp, font, sizes, isCompact } = useResponsive();

<View style={{ padding: sp.md, marginBottom: sp.sm }}>
  <Text style={{ fontSize: font.md }}>...</Text>
</View>
<Image style={{ width: sizes.avatarMd, height: sizes.avatarMd }} />
```

### Tokens disponibles

**Espacement (`sp`)** — Compact / Normal :
- `sp.xs` → 2 / 4
- `sp.sm` → 4 / 8
- `sp.md` → 8 / 16
- `sp.lg` → 12 / 24
- `sp.xl` → 16 / 32
- `sp.xxl` → 24 / 40

**Police (`font`)** — Compact / Normal :
- `font.xs` → 9 / 10 | `font.sm` → 10 / 12 | `font.md` → 11 / 14
- `font.lg` → 13 / 16 | `font.xl` → 15 / 18 | `font.xxl` → 18 / 24 | `font.xxxl` → 24 / 36

**Éléments UI (`sizes`)** — Compact / Normal :
- `sizes.avatarSm` → 24 / 40 | `sizes.avatarMd` → 40 / 72 | `sizes.avatarLg` → 56 / 96
- `sizes.logoSm` → 48 / 90 | `sizes.logoMd` → 72 / 150
- `sizes.iconSm` → 14 / 20 | `sizes.iconMd` → 18 / 24

**`isCompact`** = `true` si mobile portrait étroit, landscape, ou hauteur < 700dp. Utilise-le pour des variantes de layout, pas pour des tailles (utilise les tokens pour ça).

Si un token manque → l'ajouter dans `src/theme.ts` ou `src/hooks/useResponsive.ts`, **pas hardcoder**.

## 4. Constantes — pas de magic values

```tsx
// ❌
if (status === "completed") {}
if (count > 5) {}

// ✅
import { MatchStatus } from "../models/types";
import { ROSTER_LIMITS } from "../constants/roster";
if (status === MatchStatus.COMPLETED) {}
if (count > ROSTER_LIMITS.MIN_PLAYERS) {}
```

## 5. Ordre des imports dans chaque composant

1. React + React Native
2. Bibliothèques tierces
3. Contexts (ThemeContext, AuthContext, ClubContext)
4. Services
5. Models / Types
6. Components
7. Utils / Helpers
8. Constants

## 6. Logging

```tsx
import { logInfo, logError, logWarn } from "../utils/logger";
logInfo("ComponentName", "Message", { data });
```

---

**Avant de générer du code UI, relis ces règles. En cas de doute sur une couleur, utilise `colors.*` ou `STATUS_COLORS.*`.**
