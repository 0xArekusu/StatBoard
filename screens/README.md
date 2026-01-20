# Screens - Application Screens

Ce dossier contient tous les **écrans** de l'application React Native.

## 🏀 Vue d'ensemble

Coach Assistant est organisée en **navigation par onglets** (bottom tabs) avec des **stacks** pour chaque section.

## 📁 Structure

```
screens/
├── authentication/
│   ├── AuthScreen.tsx            # Écran d'accueil (choix Login/Register)
│   ├── LoginScreen.tsx           # Connexion
│   └── RegisterScreen.tsx        # Inscription
├── club/
│   ├── ClubScreen.tsx            # Gestion club (création, info, abonnement)
│   ├── TeamInfoScreen.tsx        # Infos équipe (nom, catégorie, couleurs)
│   ├── TeamRosterScreen.tsx      # Roster joueurs (liste, CRUD)
│   └── TeamStartersScreen.tsx    # Sélection du 5 de départ
├── DashboardScreen.tsx           # Écran d'accueil (stats récentes, reprendre match)
├── NewMatchScreen.tsx            # Création nouveau match (2 steps)
├── LiveMatchScreen.tsx           # Match en direct (terrain, actions, timer)
├── MatchDetailsScreen.tsx        # Détails post-match (4 onglets)
├── HistoryScreen.tsx             # Historique matchs (liste, filtres)
└── SplashScreen.tsx              # Écran de chargement initial
```

---

## 📱 Navigation

### **Structure générale**

```
App
├── SplashScreen (au démarrage)
└── Navigation
    ├── Si non connecté → AuthStack
    └── Si connecté → MainTabNavigator
        ├── Dashboard (Home)
        ├── Matches (Historique)
        ├── NewMatch
        ├── Club
        └── Profil (à venir)
```

### **AuthStack**

Flow d'authentification :

```
AuthScreen → LoginScreen ou RegisterScreen
```

**Écrans** :
1. **AuthScreen** : Choix "Se connecter" ou "S'inscrire"
2. **LoginScreen** : Email + Password ou Google
3. **RegisterScreen** : Email + Password + Nom complet

**Navigation après login** :
```
Login réussi
    ↓
AuthContext.session mis à jour
    ↓
Navigation bascule vers MainTabNavigator
```

---

### **MainTabNavigator**

Bottom tabs de l'app principale :

| Onglet | Screen | Icon | Description |
|--------|--------|------|-------------|
| Accueil | DashboardScreen | `view-dashboard` | Stats, matchs récents |
| Matchs | HistoryScreen | `history` | Historique matchs |
| Nouveau | NewMatchScreen | `plus-circle` | Créer un match |
| Club | ClubScreen | `shield-account` | Gestion club/équipes |

---

## 📄 Écrans principaux

### **DashboardScreen**

Écran d'accueil de l'app.

**Fonctionnalités** :
- **Stats cards** : Matchs joués, Victoires/Défaites, Points moyens
- **Matchs récents** : Liste des 5 derniers matchs
- **Reprendre match** : Modal pour continuer un match en cours
- **Actions rapides** : Boutons "Nouveau match", "Voir l'historique"

**Composants** :
- `DashboardStatsCards` : Cards de statistiques
- `DashboardRecentMatches` : Liste des matchs récents
- `DashboardResumeMatchModal` : Modal pour reprendre un match

**Services** :
- `MatchListService.getRecentMatches()`
- `MatchDataService.getMatchById()`

**Navigation** :
```
Dashboard → NewMatch (tap "Nouveau match")
Dashboard → MatchDetails (tap sur un match récent)
Dashboard → LiveMatch (tap "Reprendre" dans modal)
```

---

### **NewMatchScreen**

Écran de création d'un nouveau match (2 étapes).

**Étapes** :
1. **Configuration** :
   - Sélection équipe
   - Nom adversaire
   - Format (4 QT / 2 MT)
   - Lieu (Domicile / Extérieur)
   - Option stats adversaire

2. **Feuille de match** :
   - Sélection joueurs présents
   - Désignation 5 de départ
   - Ajout renforts temporaires
   - Roster adversaire (si option activée)

**Composants** :
- Voir [components/NewMatch/README.md](../components/NewMatch/README.md)

**Navigation** :
```
NewMatchScreen (Step 1) → NewMatchScreen (Step 2) → LiveMatchScreen
```

**Services** :
- `TeamService.getTeamById()`
- `PlayerService.getPlayersByTeam()`

---

### **LiveMatchScreen**

Écran de match en direct (feature principale).

**Fonctionnalités** :
- **Terrain interactif** : Tap pour enregistrer action avec position
- **Timer** : Chronomètre décroissant avec play/pause
- **Score** : Mise à jour en temps réel
- **Actions** : Grille de sélection (tir, rebond, faute...)
- **Substitutions** : Gestion des remplacements
- **Historique** : Liste des actions enregistrées
- **Filtres** : Par type d'action, par joueur
- **Sauvegarde auto** : SQLite local

**Composants** :
- Voir [components/LiveMatch/README.md](../components/LiveMatch/README.md)
- Voir [components/LiveMatchModals.tsx](../components/LiveMatchModals.tsx)

**Services** :
- `MatchDataService.createMatch()`
- `MatchDataService.addAction()`
- `MatchSyncService.syncMatch()` (fin de match)

**Navigation** :
```
LiveMatchScreen → MatchDetailsScreen (fin de match)
```

---

### **MatchDetailsScreen**

Écran de détails d'un match terminé (4 onglets).

**Onglets** :
1. **Stats** : Tableau de statistiques par joueur
2. **Cards** : Vue carte des joueurs
3. **Court** : Visualisation des actions sur le terrain
4. **Evolution** : Graphique d'évolution du score

**Composants** :
- Voir [components/MatchDetails/README.md](../components/MatchDetails/README.md)

**Services** :
- `MatchDataService.getMatchById()`
- `MatchDataService.getActionsByMatch()`

**Features** :
- **Export PDF** : Générer un rapport de match
- **Partage** : Partager les stats
- **Filtre joueur** : Focus sur un joueur
- **Modal détails** : Stats complètes d'un joueur

---

### **HistoryScreen**

Historique de tous les matchs.

**Fonctionnalités** :
- **Liste paginée** : Tous les matchs de l'équipe
- **Filtres** :
  - Par date (période)
  - Par adversaire
  - Par résultat (Victoire / Défaite / Égalité)
  - Par lieu (Domicile / Extérieur)
- **Tri** : Date, Score, Adversaire
- **Recherche** : Par nom adversaire
- **Card match** : Score, date, lieu, résultat

**Composants** :
- `MatchFilters` : Filtres de recherche
- `FilterBottomSheet` : Bottom sheet pour filtres avancés
- `HistoryBottomSheet` : Bottom sheet historique d'actions

**Services** :
- `MatchListService.getMatchesByTeam()`
- `MatchListService.filterMatches()`

**Navigation** :
```
HistoryScreen → MatchDetailsScreen (tap sur un match)
```

---

## 🏀 Écrans Club

### **ClubScreen**

Écran de gestion du club et des équipes.

**Sections** :
1. **Sélection club** : Dropdown pour changer de club actif
2. **Informations club** : Nom, logo, couleurs, code
3. **Abonnement** : Plan actuel, limites, upgrade
4. **Équipes** : Liste des équipes du club (cards)
5. **Actions** : Créer équipe, Modifier club, Rejoindre club

**Composants** :
- Voir [components/Club/README.md](../components/Club/README.md)

**Services** :
- `ClubService.getClubById()`
- `TeamService.getTeamsByClub()`
- `SubscriptionService.getSubscription()`

**Navigation** :
```
ClubScreen → TeamInfoScreen → TeamRosterScreen → TeamStartersScreen
```

---

### **TeamInfoScreen**

Informations et paramètres d'une équipe.

**Fonctionnalités** :
- **Nom et catégorie** : Édition
- **Couleurs personnalisées** : Override des couleurs du club
- **Statistiques** : Nombre de matchs, victoires, défaites
- **Actions** : Modifier, Archiver, Supprimer

**Services** :
- `TeamService.updateTeam()`
- `TeamService.deleteTeam()`

**Navigation** :
```
TeamInfoScreen → TeamRosterScreen (tap "Gérer le roster")
```

---

### **TeamRosterScreen**

Gestion du roster (liste des joueurs).

**Fonctionnalités** :
- **Liste joueurs** : Tous les joueurs de l'équipe
- **Ajouter joueur** : Formulaire (prénom, nom, numéro, photo)
- **Modifier joueur** : Éditer les infos
- **Supprimer joueur** : Confirmation requise
- **Tri** : Par numéro, par nom
- **Recherche** : Par nom

**Composants** :
- `PlayerCard` : Card joueur avec photo, numéro, nom
- `AddPlayerForm` : Formulaire d'ajout/édition (modal)

**Services** :
- `PlayerService.getPlayersByTeam()`
- `PlayerService.createPlayer()`
- `PlayerService.updatePlayer()`
- `PlayerService.deletePlayer()`
- `PhotoUploadService.uploadPhoto()` (pour la photo)

**Navigation** :
```
TeamRosterScreen → TeamStartersScreen (tap "Définir le 5 de départ")
```

---

### **TeamStartersScreen**

Sélection du 5 de départ par défaut de l'équipe.

**Fonctionnalités** :
- **Sélection** : Tap sur joueur pour toggle titulaire/remplaçant
- **Limite 5** : Maximum 5 titulaires
- **Sauvegarde** : Enregistré dans l'équipe
- **Prévisualisation** : Liste des 5 joueurs sélectionnés

**Usage** :
- Le 5 de départ est pré-sélectionné dans NewMatchScreen (Step 2)
- Gain de temps pour créer un match

**Services** :
- `TeamService.updateStarters()`

---

## 🔐 Écrans d'authentification

### **AuthScreen**

Écran d'accueil pour utilisateurs non connectés.

**Fonctionnalités** :
- Bouton "Se connecter"
- Bouton "S'inscrire"
- Logo et branding

**Navigation** :
```
AuthScreen → LoginScreen ou RegisterScreen
```

---

### **LoginScreen**

Connexion utilisateur.

**Fonctionnalités** :
- **Email + Password** : Formulaire classique
- **Google Sign-In** : OAuth avec Google
- **Validation** : Email et password requis
- **Erreurs** : Affichage messages d'erreur

**Services** :
- `AuthContext.signIn(email, password)`
- `AuthContext.signInWithGoogle()`

**Navigation** :
```
LoginScreen → MainTabNavigator (après login réussi)
```

---

### **RegisterScreen**

Inscription nouvel utilisateur.

**Fonctionnalités** :
- **Formulaire** : Email, Password, Nom complet
- **Validation** :
  - Email valide
  - Password min 6 caractères
  - Nom requis
- **Création compte** : Supabase Auth
- **Auto-login** : Connexion automatique après inscription

**Services** :
- `AuthContext.signUp(email, password, fullName)`

**Navigation** :
```
RegisterScreen → MainTabNavigator (après inscription réussie)
```

---

## 🎬 SplashScreen

Écran de chargement initial de l'app.

**Fonctionnalités** :
- Affichage du logo
- Loading indicator
- Vérification session auth
- Chargement des données initiales (clubs, équipes)

**Durée** : Quelques secondes max

**Navigation** :
```
SplashScreen → AuthStack (si non connecté)
SplashScreen → MainTabNavigator (si connecté)
```

---

## 🔄 Flows de navigation complets

### **Flow création de match**

```
Dashboard
    ↓ (tap "Nouveau match")
NewMatchScreen (Step 1: Config)
    ↓ (tap "Suivant")
NewMatchScreen (Step 2: Roster)
    ↓ (tap "Coup d'envoi")
LiveMatchScreen
    ↓ (tap "Terminer le match")
MatchDetailsScreen
```

### **Flow gestion équipe**

```
ClubScreen
    ↓ (tap sur une équipe)
TeamInfoScreen
    ↓ (tap "Gérer le roster")
TeamRosterScreen
    ↓ (tap "Définir le 5 de départ")
TeamStartersScreen
```

### **Flow création club**

```
ClubScreen (aucun club)
    ↓ (tap "Créer un club")
CreateClubForm (modal)
    ↓ (tap "Créer")
ClubScreen (club créé affiché)
    ↓ (tap "Créer une équipe")
TeamInfoScreen (mode création)
    ↓ (tap "Sauvegarder")
TeamRosterScreen
```

---

## 📊 Types de navigation

### **Stack Navigation**

Utilisé pour les flows linéaires (ex: Auth, Club → Team → Roster).

```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

<Stack.Navigator>
  <Stack.Screen name="TeamInfo" component={TeamInfoScreen} />
  <Stack.Screen name="TeamRoster" component={TeamRosterScreen} />
  <Stack.Screen name="TeamStarters" component={TeamStartersScreen} />
</Stack.Navigator>
```

### **Bottom Tab Navigation**

Utilisé pour la navigation principale de l'app.

```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

<Tab.Navigator>
  <Tab.Screen name="Dashboard" component={DashboardScreen} />
  <Tab.Screen name="History" component={HistoryScreen} />
  <Tab.Screen name="NewMatch" component={NewMatchScreen} />
  <Tab.Screen name="Club" component={ClubScreen} />
</Tab.Navigator>
```

---

## 📚 Voir aussi

- [navigation/MainTabNavigator.tsx](../navigation/MainTabNavigator.tsx) - Configuration navigation
- [types/navigation.ts](../types/navigation.ts) - Types TypeScript pour navigation
- [components/](../components/) - Composants utilisés dans les screens
- [services/](../services/) - Services appelés par les screens
