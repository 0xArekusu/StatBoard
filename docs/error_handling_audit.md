# Audit de la gestion d'erreur - Appels serveur

## ✅ Déjà bien géré

### useMatchSync.ts
- ✅ Alerte utilisateur lors d'échec de sync
- ✅ Navigation vers MatchDetails avec données locales en cas d'erreur
- ✅ Messages d'erreur clairs

### MatchDetailsScreen.tsx
- ✅ Alert.alert lors d'erreur de suppression
- ✅ Alert.alert lors d'erreur de génération PDF

## ⚠️ À améliorer

### 1. MatchListService.ts
**Utilisé par**: HistoryScreen, DashboardScreen
**Risque**: L'utilisateur ne voit pas ses matchs sans feedback
**Actions**:
- Ajouter des logs d'erreur détaillés
- Retourner des objets d'erreur structurés
- Les screens doivent afficher Alert.alert

### 2. ClubStorageService.ts
**Utilisé par**: Plusieurs composants club
**Risque**: Échec silencieux lors d'upload/téléchargement de fichiers
**Actions**:
- Alertes pour échecs d'upload d'images
- Messages d'erreur clairs pour permissions Storage

### 3. NewMatchScreen.tsx
**Utilisé par**: Démarrage de match
**Risque**: Échec lors du chargement des teams/joueurs depuis Supabase
**Actions**:
- Alert si impossible de charger les données du club
- Option de continuer en mode hors ligne

### 4. Services Repository (SupabaseTeamRepository, SupabasePlayerRepository, etc.)
**Utilisé par**: Plusieurs écrans
**Risque**: Erreurs RLS, permissions, réseau
**Actions**:
- Les repositories loggent déjà
- Les screens doivent gérer les erreurs et afficher Alert.alert

### 5. PDFExportService.ts
**Utilisé par**: MatchDetailsScreen
**Risque**: Génération PDF échoue silencieusement
**Status**: ✅ Déjà géré dans MatchDetailsScreen

## 📋 Plan d'action

### Priorité 1 - Screens (interaction utilisateur directe)
1. **HistoryScreen** - Alert si échec chargement matchs
2. **DashboardScreen** - Alert si échec chargement matchs récents
3. **NewMatchScreen** - Alert si échec chargement teams/players

### Priorité 2 - Services utilisés fréquemment
4. **MatchListService** - Meilleurs messages d'erreur
5. **ClubStorageService** - Alerts pour upload/download

### Priorité 3 - Améliorations générales
6. Créer un helper `showErrorAlert(error, context)` pour standardiser
7. Ajouter retry logic pour erreurs réseau
8. Ajouter indicateur de statut réseau dans l'app

## Pattern recommandé

```typescript
try {
  setLoading(true);
  const result = await someSupabaseCall();
  // Success handling
} catch (error) {
  logError("ComponentName", "Operation failed", {
    error: error instanceof Error ? error.message : error,
  });

  Alert.alert(
    "Erreur",
    `Impossible de [action].\n\n${error instanceof Error ? error.message : "Erreur inconnue"}\n\nVérifiez votre connexion internet.`,
    [
      {
        text: "Réessayer",
        onPress: () => retryOperation(),
      },
      {
        text: "Annuler",
        style: "cancel",
      },
    ]
  );
} finally {
  setLoading(false);
}
```
