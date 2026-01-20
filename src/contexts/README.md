# Contexts - React Context API

Ce dossier contient les **React Contexts** de l'application, utilisés pour partager l'état global entre les composants.

## 🎯 Vue d'ensemble

Les Contexts permettent de **partager des données** sans avoir à passer des props à travers chaque niveau de l'arborescence des composants.

## 📁 Fichiers

```
src/contexts/
├── AuthContext.tsx      # Authentification utilisateur
├── ClubContext.tsx      # Club et équipe actifs
└── ThemeContext.tsx     # Thème clair/sombre
```

---

## 🔐 AuthContext

Gère l'authentification et la session utilisateur via Supabase.

### **État fourni**

```typescript
interface AuthContextType {
  session: Session | null;     // Session Supabase
  user: User | null;           // Utilisateur connecté
  loading: boolean;            // Loading initial
  signUp: (email, password, fullName?) => Promise<{ error }>;
  signIn: (email, password) => Promise<{ error }>;
  signInWithGoogle: () => Promise<{ error }>;
  signOut: () => Promise<void>;
}
```

### **Fonctionnalités**

1. **Session management** :
   - Récupère la session au démarrage
   - Écoute les changements de session (login, logout, refresh)
   - Persiste la session via Supabase

2. **Méthodes d'authentification** :
   - **Email/Password** : `signUp()`, `signIn()`
   - **Google OAuth** : `signInWithGoogle()` (via `@react-native-google-signin/google-signin`)
   - **Déconnexion** : `signOut()`

3. **Logging** :
   - Tous les événements auth sont loggés (via `logger.ts`)
   - Utile pour debugging

### **Usage**

```typescript
import { useAuth } from '../src/contexts/AuthContext';

function MyComponent() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return <LoginButton onPress={() => signIn(email, password)} />;
  }

  return (
    <View>
      <Text>Bienvenue {user.email}</Text>
      <Button onPress={signOut}>Déconnexion</Button>
    </View>
  );
}
```

### **Provider**

Le `AuthProvider` doit envelopper toute l'app :

```typescript
// App.tsx
import { AuthProvider } from './src/contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
```

### **Google Sign-In**

Configuration requise dans `.env` :

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
```

**Flow** :
```
User tap "Sign in with Google"
    ↓
GoogleSignin.signIn() → Récupère idToken
    ↓
supabase.auth.signInWithIdToken({ token: idToken })
    ↓
Session créée
    ↓
onAuthStateChange() trigger
    ↓
user et session mis à jour dans le context
```

---

## 🏀 ClubContext

Gère le club et l'équipe actuellement sélectionnés.

### **État fourni**

```typescript
interface ClubContextType {
  currentClub: Club | null;         // Club actif
  allClubs: Club[];                 // Tous les clubs de l'user
  loading: boolean;                 // Loading initial
  setCurrentClub: (club) => Promise<void>;
  refreshClubs: () => Promise<void>;
}
```

### **Fonctionnalités**

1. **Gestion du club actif** :
   - Charge tous les clubs de l'utilisateur au démarrage
   - Restaure le dernier club sélectionné (via AsyncStorage)
   - Permet de changer de club actif

2. **Persistence** :
   - Le club sélectionné est sauvegardé dans AsyncStorage
   - Clé : `@current_club_id`
   - Restauré au redémarrage de l'app

3. **Refresh** :
   - `refreshClubs()` : Recharge la liste depuis Supabase
   - Appelé après création/modification de club

### **Usage**

```typescript
import { useClub } from '../src/contexts/ClubContext';

function TeamScreen() {
  const { currentClub, allClubs, setCurrentClub } = useClub();

  if (!currentClub) {
    return <Text>Aucun club sélectionné</Text>;
  }

  return (
    <View>
      <Text>Club actif: {currentClub.name}</Text>

      {/* Dropdown pour changer de club */}
      <Picker
        selectedValue={currentClub.id}
        onValueChange={(clubId) => {
          const club = allClubs.find(c => c.id === clubId);
          if (club) setCurrentClub(club);
        }}
      >
        {allClubs.map(club => (
          <Picker.Item key={club.id} label={club.name} value={club.id} />
        ))}
      </Picker>
    </View>
  );
}
```

### **Provider**

Le `ClubProvider` doit être à l'intérieur du `AuthProvider` :

```typescript
// App.tsx
import { AuthProvider } from './src/contexts/AuthContext';
import { ClubProvider } from './src/contexts/ClubContext';

function App() {
  return (
    <AuthProvider>
      <ClubProvider>
        <Navigation />
      </ClubProvider>
    </AuthProvider>
  );
}
```

### **Flow de chargement**

```
App démarre
    ↓
AuthProvider charge user
    ↓
ClubProvider détecte user
    ↓
ClubService.getUserMemberClubs(userId)
    ↓
allClubs = [...clubs]
    ↓
AsyncStorage.getItem('@current_club_id')
    ↓
Si savedClubId existe dans allClubs:
  → currentClub = savedClub
Sinon:
  → currentClub = allClubs[0]
```

### **Custom hook**

```typescript
export function useClub(): ClubContextType {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub must be used within ClubProvider');
  }
  return context;
}
```

---

## 🎨 ThemeContext

Gère le thème clair/sombre de l'application.

### **État fourni**

```typescript
interface ThemeContextType {
  colorScheme: 'light' | 'dark';           // Schéma actif
  colors: ThemeColors;                     // Couleurs du thème
  themeMode: 'light' | 'dark' | 'system';  // Mode sélectionné
  setThemeMode: (mode) => Promise<void>;
  isDark: boolean;                         // Helper
}
```

### **Modes disponibles**

| Mode | Description |
|------|-------------|
| `light` | Thème clair forcé |
| `dark` | Thème sombre forcé |
| `system` | Suit le thème du système (auto) |

### **Fonctionnalités**

1. **Détection système** :
   - Utilise `useColorScheme()` de React Native
   - Met à jour automatiquement si mode = `system`

2. **Persistence** :
   - Le mode est sauvegardé dans AsyncStorage
   - Clé : `@statboard_theme_preference`
   - Restauré au redémarrage

3. **Couleurs** :
   - Définies dans `src/theme/colors.ts`
   - Objet `Colors.light` et `Colors.dark`
   - Voir [src/theme/](../theme/)

### **Usage**

```typescript
import { useTheme } from '../src/contexts/ThemeContext';

function MyComponent() {
  const { colors, isDark, setThemeMode } = useTheme();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text.primary }}>
        Mode: {isDark ? 'Sombre' : 'Clair'}
      </Text>

      {/* Toggle theme */}
      <Switch
        value={isDark}
        onValueChange={(value) => setThemeMode(value ? 'dark' : 'light')}
      />
    </View>
  );
}
```

### **ThemeColors**

Structure des couleurs disponibles :

```typescript
interface ThemeColors {
  // Base colors
  primary: string;
  onPrimary: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  border: string;
  error: string;

  // Text colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };

  // Component colors
  button: {
    brandAlpha: string;
    brandAlphaBorder: string;
    playPaused: string;
    quickScoreBackground: string;
  };

  // ... (voir src/theme/colors.ts pour la liste complète)
}
```

### **Provider**

```typescript
// App.tsx
import { ThemeProvider } from './src/contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ClubProvider>
          <Navigation />
        </ClubProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

### **Lancement en dark par défaut**

Actuellement, l'app démarre en mode `dark` par défaut :

```typescript
const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
```

Pour changer :
```typescript
const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
```

---

## 🔗 Hiérarchie des Providers

```typescript
// App.tsx
function App() {
  return (
    <ThemeProvider>          {/* 1. Theme (indépendant) */}
      <AuthProvider>         {/* 2. Auth (utilise Theme) */}
        <ClubProvider>       {/* 3. Club (utilise Auth + Theme) */}
          <Navigation />     {/* 4. App */}
        </ClubProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

**Ordre important** :
- `ThemeProvider` en premier (pas de dépendances)
- `AuthProvider` ensuite (dépend du theme)
- `ClubProvider` à la fin (dépend de auth)

---

## 💡 Bonnes pratiques

### Quand créer un Context ?

Créer un Context quand :
- ✅ L'état est partagé par de **nombreux** composants
- ✅ L'état est **global** à l'app (user, theme, club actif)
- ✅ Passer des props serait trop profond (prop drilling)

Ne PAS créer de Context pour :
- ❌ État local à un composant ou écran
- ❌ Données qui changent très fréquemment (performance)
- ❌ État qui peut être géré par un hook custom

### Performance

Éviter les re-renders inutiles :

```typescript
// ✅ BON - Valeur mémorisée
const value = useMemo(() => ({
  user,
  signIn,
  signOut
}), [user]);

return <AuthContext.Provider value={value}>...</AuthContext.Provider>;

// ❌ MAUVAIS - Nouvel objet à chaque render
return (
  <AuthContext.Provider value={{ user, signIn, signOut }}>
    ...
  </AuthContext.Provider>
);
```

### Custom hooks

Toujours fournir un **hook custom** pour accéder au context :

```typescript
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**Avantages** :
- Meilleur typage
- Erreur claire si utilisé hors Provider
- Nom court : `useAuth()` vs `useContext(AuthContext)`

---

## 🚀 Ajouter un nouveau Context

### 1. Créer le fichier

**Fichier** : `src/contexts/XxxContext.tsx`

```typescript
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface XxxContextType {
  value: string;
  setValue: (value: string) => void;
}

const XxxContext = createContext<XxxContextType | undefined>(undefined);

export function XxxProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState('');

  return (
    <XxxContext.Provider value={{ value, setValue }}>
      {children}
    </XxxContext.Provider>
  );
}

export function useXxx(): XxxContextType {
  const context = useContext(XxxContext);
  if (!context) {
    throw new Error('useXxx must be used within XxxProvider');
  }
  return context;
}
```

### 2. Ajouter au Provider tree

```typescript
// App.tsx
import { XxxProvider } from './src/contexts/XxxContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ClubProvider>
          <XxxProvider>  {/* Nouveau provider */}
            <Navigation />
          </XxxProvider>
        </ClubProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

### 3. Utiliser dans les composants

```typescript
import { useXxx } from '../src/contexts/XxxContext';

function MyComponent() {
  const { value, setValue } = useXxx();
  // ...
}
```

---

## 📚 Voir aussi

- [src/theme/](../theme/) - Système de design (couleurs, spacing, typography)
- [services/](../../services/) - Services utilisés par les contexts
- [.env.example](../../.env.example) - Variables d'environnement requises
