# Guidelines de Développement Coach Assistant

## Gestion du Thème et des Couleurs

### ❌ À NE PAS FAIRE

```tsx
// Ne pas utiliser isDark séparément
const { isDark } = useTheme();
const backgroundColor = isDark ? "#1a1a1a" : "#ffffff";

// Ne pas utiliser de magic strings pour les couleurs
<View style={{ backgroundColor: "#FF5733" }}>

// Ne pas dupliquer la logique du thème
const textColor = isDark ? "#fff" : "#000";
```

### ✅ À FAIRE

```tsx
// Utiliser directement colors depuis useTheme
const { colors } = useTheme();

// Les couleurs sont déjà adaptées au thème (dark/light)
<View style={{ backgroundColor: colors.surface }}>
  <Text style={{ color: colors.text.primary }}>Titre</Text>
  <Text style={{ color: colors.text.secondary }}>Sous-titre</Text>
</View>

// Pour les couleurs de status, utiliser les constantes
import { STATUS_COLORS, COMMON_COLORS } from "../src/theme";

<View style={{ backgroundColor: STATUS_COLORS.error + "20" }}>
  <Text style={{ color: STATUS_COLORS.error }}>Erreur</Text>
</View>
```

### Palette de Couleurs Disponibles

#### Couleurs du Thème (`colors` depuis `useTheme()`)
- `colors.background` - Fond principal
- `colors.surface` - Fond des cartes/modals
- `colors.surfaceVariant` - Fond alternatif
- `colors.primary` - Couleur primaire du club
- `colors.border` - Bordures
- `colors.text.primary` - Texte principal
- `colors.text.secondary` - Texte secondaire
- `colors.text.tertiary` - Texte tertiaire
- `colors.text.disabled` - Texte désactivé

#### Couleurs de Status (`STATUS_COLORS`)
- `STATUS_COLORS.success` - Vert pour les succès
- `STATUS_COLORS.error` - Rouge pour les erreurs
- `STATUS_COLORS.warning` - Orange pour les avertissements
- `STATUS_COLORS.info` - Bleu pour les informations

#### Couleurs Communes (`COMMON_COLORS`)
- `COMMON_COLORS.white` - Blanc pur
- `COMMON_COLORS.black` - Noir pur

### Opacité

Utiliser les constantes d'opacité plutôt que des valeurs en dur :

```tsx
import { OPACITY } from "../src/theme";

// Au lieu de
backgroundColor: "rgba(0,0,0,0.5)"

// Utiliser
backgroundColor: colors.background + OPACITY.medium
```

## Gestion des Constantes

### ❌ À NE PAS FAIRE

```tsx
// Magic numbers et strings
if (status === "completed") { }
if (playerCount > 5) { }
```

### ✅ À FAIRE

```tsx
// Utiliser des enums et constantes
import { MatchStatus } from "../models/types";
import { ROSTER_LIMITS } from "../constants/roster";

if (status === MatchStatus.COMPLETED) { }
if (playerCount > ROSTER_LIMITS.MIN_PLAYERS) { }
```

## Structure des Composants

### Ordre des Imports

1. React et React Native
2. Bibliothèques tierces
3. Contexts (Theme, Auth, Club)
4. Services
5. Models et Types
6. Components
7. Utils et Helpers
8. Constants
9. Styles (si fichier séparé)

### Ordre dans le Composant

1. Props interface
2. Component declaration
3. Hooks (useTheme, useAuth, etc.)
4. State
5. Effects
6. Callbacks et handlers
7. Render helpers
8. Return (JSX)
9. Styles (StyleSheet.create)

## Modals et UI

### Cohérence Visuelle

Tous les modals doivent suivre le même pattern :

```tsx
import { useTheme } from "../src/contexts/ThemeContext";
import { STATUS_COLORS, COMMON_COLORS } from "../src/theme";

export default function MyModal({ visible, onClose }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, {
        backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.6)"
      }]}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          {/* Icon container avec couleur de status */}
          <View style={[styles.iconContainer, {
            backgroundColor: STATUS_COLORS.info + "20"
          }]}>
            <Ionicons name="information-circle" size={70} color={STATUS_COLORS.info} />
          </View>

          {/* Titre */}
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Titre
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.text.secondary }]}>
            Message
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, {
                backgroundColor: STATUS_COLORS.info
              }]}
              onPress={onAction}
            >
              <Text style={[styles.primaryButtonText, {
                color: COMMON_COLORS.white
              }]}>
                Action
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton, {
                backgroundColor: colors.surfaceVariant
              }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, {
                color: colors.text.secondary
              }]}>
                Fermer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

## Logging

Utiliser les fonctions de logging standardisées :

```tsx
import { logInfo, logError, logWarn } from "../utils/logger";

// Info
logInfo("ComponentName", "📝 Message", { data });

// Warning
logWarn("ComponentName", "⚠️ Warning message", { context });

// Error
logError("ComponentName", "❌ Error message", { error });
```

## TypeScript

### Types vs Interfaces

- **Interface** : Pour les props de composants et objets publics
- **Type** : Pour les unions, intersections, et types utilitaires

```tsx
// Props de composant
interface MyComponentProps {
  title: string;
  onPress: () => void;
}

// Union types
type Status = "pending" | "success" | "error";

// Résultat de fonction
type SyncResult = {
  success: boolean;
  error?: string;
};
```

## Exemples de Référence

Consultez ces composants pour des exemples de bonnes pratiques :

- **Modals** : `SyncErrorModal.tsx`, `MatchLimitModal.tsx`
- **Screens** : `DashboardScreen.tsx`, `HistoryScreen.tsx`
- **Services** : `MatchSyncService.ts`
- **Contexts** : `ThemeContext.tsx`

## Checklist Avant Commit

- [ ] Pas de magic strings pour les couleurs (utiliser `colors` et `STATUS_COLORS`)
- [ ] Pas de magic numbers (utiliser des constantes)
- [ ] Imports organisés selon l'ordre défini
- [ ] Types TypeScript correctement définis
- [ ] Logging approprié pour le debug
- [ ] Cohérence visuelle avec les autres composants
- [ ] Support du mode dark/light via `useTheme`
