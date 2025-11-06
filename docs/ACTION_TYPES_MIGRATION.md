# Migration des Magic Strings vers les Enums d'Actions

## Objectif

Remplacer les chaînes magiques ("tir", "rebond", "faute", etc.) par des énumérations typées pour améliorer la maintenabilité et éviter les erreurs.

## Fichier de référence

**Fichier:** `src/models/ActionTypes.ts`

Ce fichier contient:
- **Enums en anglais** pour le code interne
- **Traductions françaises** pour l'affichage à l'utilisateur
- **Maps de compatibilité legacy** pour les données existantes

## Fichiers déjà migrés

✅ **src/services/api/MatchSyncService.ts** - Calcul des statistiques
✅ **utils/mockActions.ts** - Génération d'actions de test

## Fichiers à migrer

Les fichiers suivants contiennent encore des magic strings:

### Priorité haute (logique métier)
- [ ] `screens/BoardScreen.tsx` - Logique principale du match
- [ ] `components/ActionSystem.tsx` - Système d'enregistrement des actions
- [ ] `src/services/export/PDFExportService.ts` - Export PDF

### Priorité moyenne (affichage)
- [ ] `components/HistoryBottomSheet.tsx` - Historique des actions
- [ ] `components/FilterBottomSheet.tsx` - Filtres d'actions
- [ ] `screens/MatchSummaryScreen.tsx` - Résumé de match
- [ ] `screens/MatchDetailsScreen.tsx` - Détails de match
- [ ] `components/MatchSummaryModal.tsx` - Modal de résumé

### Priorité basse (historique)
- [ ] `screens/MatchHistoryScreen.tsx` - Liste des matchs passés
- [ ] `src/services/api/adapters/SupabasePayloadAdapter.ts` - Adaptateur Supabase

## Guide de migration

### 1. Importer les enums et helpers

```typescript
import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
  parseLegacyActionType,
  specificationContains,
  ACTION_TYPE_FR,
  SHOT_SPECIFICATION_FR,
} from "../src/models/ActionTypes";
```

### 2. Remplacer les comparaisons magic strings

**Avant:**
```typescript
if (action.action_type === "tir") {
  // logique tir
}
```

**Après (avec compatibilité legacy):**
```typescript
const actionType = parseLegacyActionType(action.action_type);
if (actionType === ActionType.SHOT) {
  // logique tir
}
```

### 3. Utiliser les helpers pour les specifications

**Avant:**
```typescript
if (action.specification.startsWith("reussi")) {
  // tir réussi
}
```

**Après:**
```typescript
if (specificationContains(action.specification, "reussi")) {
  // tir réussi
}
```

### 4. Affichage en français

**Avant:**
```typescript
<Text>{action.action_type}</Text> // Affiche "tir"
```

**Après:**
```typescript
const actionType = parseLegacyActionType(action.action_type);
<Text>{actionType ? ACTION_TYPE_FR[actionType] : action.action_type}</Text> // Affiche "Tir"
```

### 5. Création de nouvelles actions

**Important:** Pour la compatibilité avec les données existantes, continuez d'utiliser les strings legacy lors de la création d'actions:

```typescript
// Utiliser les constantes depuis ActionTypes.ts
const LEGACY_SHOT = "tir";
const LEGACY_MADE = "reussi";

const newAction = {
  action_type: LEGACY_SHOT,
  specification: LEGACY_MADE,
  // ...
};
```

**Note:** À terme, quand toutes les données seront migrées, on pourra passer aux enums anglais.

## Stratégie de migration progressive

### Phase 1: Compatibilité (ACTUELLE)
- Créer les enums et helpers
- Migrer le code de calcul (statistiques, exports)
- Garder les strings legacy pour les nouvelles actions
- ✅ Aucune migration de données nécessaire

### Phase 2: Migration UI (PROCHAINE)
- Migrer les composants d'affichage
- Utiliser les traductions françaises
- Toujours compatible avec données legacy

### Phase 3: Migration données (FUTURE)
- Script de migration SQLite: strings legacy → enums anglais
- Migration Supabase si nécessaire
- Commencer à créer les actions avec enums anglais

## Avantages

✅ **Type safety:** TypeScript détecte les erreurs de frappe
✅ **Autocomplete:** L'IDE suggère les valeurs valides
✅ **Maintenabilité:** Un seul endroit pour modifier les types d'actions
✅ **Internationalization:** Facile d'ajouter d'autres langues
✅ **Refactoring:** Renommer un enum met à jour tout le code
✅ **Documentation:** Les enums sont auto-documentés

## Questions fréquentes

**Q: Pourquoi les enums sont en anglais si l'app est en français?**
R: C'est une bonne pratique de séparer le code interne (anglais) de l'affichage (français). Ça facilite l'internationalisation future et suit les conventions du développement logiciel.

**Q: Que faire avec les données existantes en français?**
R: Les helpers `parseLegacyActionType()` et `specificationContains()` assurent la compatibilité. Aucune migration de données nécessaire pour l'instant.

**Q: Puis-je créer de nouvelles actions avec les enums anglais?**
R: Pas encore, pour garder la cohérence avec les données existantes. Gardez les strings legacy pour l'instant.

**Q: Comment afficher les actions en français à l'utilisateur?**
R: Utilisez les objets de traduction: `ACTION_TYPE_FR[actionType]`, `SHOT_SPECIFICATION_FR[spec]`, etc.

## Contact

Pour toute question sur cette migration, référez-vous au code dans:
- `src/models/ActionTypes.ts` - Définitions des enums
- `src/services/api/MatchSyncService.ts` - Exemple d'utilisation (calcul stats)
- `utils/mockActions.ts` - Exemple d'utilisation (génération)
