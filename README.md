# StatBoard

## Responsive Layout & Sizing

### `useResponsive` hook

Le hook `useResponsive` ([src/hooks/useResponsive.ts](src/hooks/useResponsive.ts)) centralise toute la logique de tailles adaptatives. Il se base sur `useWindowDimensions` de React Native pour réagir automatiquement aux changements d'orientation ou de taille de fenêtre.

```ts
const { isCompact, isPortrait, sp, font, sizes, width, height } = useResponsive();
```

---

### `isCompact`

`isCompact` est un booléen qui passe à `true` dès qu'un des critères suivants est rempli :

| Condition | Seuil |
|---|---|
| Appareil mobile (côté court) | `shortSide < 600 dp` (`BREAKPOINTS.phoneMaxWidth`) |
| Orientation paysage (landscape) | `width > height` |
| Petit écran portrait | `height < 700 dp` (`BREAKPOINTS.smallPortraitMaxHeight`) |

En pratique :
- **Portrait standard** (ex. iPhone 14) → `isCompact = false` → mode `"normal"`
- **Landscape sur téléphone** → `isCompact = true` → mode `"compact"`
- **Tablette en portrait** (shortSide ≥ 600 dp, hauteur ≥ 700 dp) → `isCompact = false`

---

### Espacement (`sp`)

| Token | Compact | Normal |
|---|---|---|
| `sp.xs` | 2 | 4 |
| `sp.sm` | 4 | 8 |
| `sp.md` | 8 | 16 |
| `sp.lg` | 12 | 24 |
| `sp.xl` | 16 | 32 |
| `sp.xxl` | 24 | 40 |

---

### Tailles de police (`font`)

| Token | Compact | Normal |
|---|---|---|
| `font.xs` | 9 | 10 |
| `font.sm` | 10 | 12 |
| `font.md` | 11 | 14 |
| `font.lg` | 13 | 16 |
| `font.xl` | 15 | 18 |
| `font.xxl` | 18 | 24 |
| `font.xxxl` | 24 | 36 |

---

### Tailles d'éléments UI (`sizes`)

| Token | Compact | Normal |
|---|---|---|
| `sizes.avatarSm` | 24 | 40 |
| `sizes.avatarMd` | 40 | 72 |
| `sizes.avatarLg` | 56 | 96 |
| `sizes.logoSm` | 48 | 90 |
| `sizes.logoMd` | 72 | 150 |
| `sizes.iconSm` | 14 | 20 |
| `sizes.iconMd` | 18 | 24 |

---

### Règle : ne pas hardcoder les tailles

**Ne jamais écrire des valeurs de taille en dur dans les composants.** Toutes les tailles (espacements, polices, éléments UI) doivent être centralisées dans leurs fichiers de référence et consommées via `useResponsive`.

| Type | Fichier source | Consommation |
|---|---|---|
| Espacements | [src/theme.ts](src/theme.ts) → `Spacing` | `sp.md`, `sp.lg`… via `useResponsive` |
| Polices | [src/theme.ts](src/theme.ts) → `Typography.fontSize` | `font.sm`, `font.xl`… via `useResponsive` |
| Éléments UI | [src/hooks/useResponsive.ts](src/hooks/useResponsive.ts) → `sizes` | `sizes.avatarMd`… via `useResponsive` |
| Breakpoints | [constants/breakpoints.ts](constants/breakpoints.ts) → `BREAKPOINTS` | Importé directement si besoin |

**Mauvais :**
```tsx
// ❌ valeur hardcodée — ne s'adapte pas à l'écran
<View style={{ padding: 16, marginBottom: 8 }}>
  <Text style={{ fontSize: 14 }}>...</Text>
</View>
```

**Bon :**
```tsx
// ✅ valeurs centralisées — s'adaptent automatiquement
const { sp, font } = useResponsive();

<View style={{ padding: sp.md, marginBottom: sp.sm }}>
  <Text style={{ fontSize: font.md }}>...</Text>
</View>
```

Si une taille n'existe pas encore dans les tokens, **l'ajouter dans le fichier source** ([src/theme.ts](src/theme.ts) ou [src/hooks/useResponsive.ts](src/hooks/useResponsive.ts)) plutôt que de la mettre en dur dans le composant.

---

### Utilisation dans un composant

```tsx
import { useResponsive } from "../../src/hooks/useResponsive";

const MyComponent = () => {
  const { isCompact, sp, font, sizes } = useResponsive();

  return (
    <View style={{ padding: sp.md }}>
      <Text style={{ fontSize: font.lg }}>Titre</Text>
      {isCompact && <CompactVariant />}
    </View>
  );
};
```

Pour les styles conditionnels avec `StyleSheet` :

```tsx
<View style={[styles.container, isCompact && styles.containerCompact]}>
```

---

### Breakpoints de référence ([constants/breakpoints.ts](constants/breakpoints.ts))

| Constante | Valeur | Usage |
|---|---|---|
| `phoneMaxWidth` | 600 dp | Distinguish téléphone / tablette (côté court) |
| `smallPortraitMaxHeight` | 700 dp | Petit écran en portrait (ex. iPhone SE) |
| `mobileLandscapeMaxWidth` | 900 dp | Landscape mobile vs tablette |
| `narrowPortraitMaxWidth` | 390 dp | Portrait très étroit (ex. iPhone SE) |
