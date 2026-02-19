# Configuration Supabase

## Environnements

Le projet utilise deux environnements Supabase :
- **Development** : Pour le développement et les tests
- **Production** : Pour la production

## Configuration locale

### 1. Variables d'environnement

Créer deux fichiers à la racine du projet :

**`.env.Development`**
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=<your-dev-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-dev-anon-key>

# Google authentication
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<your-android-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your-ios-client-id>

# Sentry
EXPO_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
SENTRY_AUTH_TOKEN=<your-auth-token>
```

**`.env.Production`**
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=<your-prod-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-prod-anon-key>

# Google authentication (mêmes valeurs que dev)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<your-android-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your-ios-client-id>

# Sentry
EXPO_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
SENTRY_AUTH_TOKEN=<your-auth-token>
```

> **Important** : Ces fichiers sont dans `.gitignore` et ne doivent jamais être commités.

### 2. Configuration EAS (eas.json)

Les variables sont mappées dans `eas.json` pour chaque profil de build :

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "$DEV_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "$DEV_SUPABASE_ANON_KEY",
        "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "$GOOGLE_WEB_CLIENT_ID",
        "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID": "$GOOGLE_ANDROID_CLIENT_ID",
        "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID": "$GOOGLE_IOS_CLIENT_ID",
        "EXPO_PUBLIC_SENTRY_DSN": "$SENTRY_DSN",
        "SENTRY_AUTH_TOKEN": "$SENTRY_AUTH_TOKEN"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "$PROD_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "$PROD_SUPABASE_ANON_KEY",
        // ... autres variables
      }
    }
  }
}
```

### 3. Créer les secrets EAS

Pour chaque environnement, créer les secrets correspondants :

**Development**
```bash
eas secret:create --scope project --name DEV_SUPABASE_URL --value <your-dev-url>
eas secret:create --scope project --name DEV_SUPABASE_ANON_KEY --value <your-dev-key>
```

**Production**
```bash
eas secret:create --scope project --name PROD_SUPABASE_URL --value <your-prod-url>
eas secret:create --scope project --name PROD_SUPABASE_ANON_KEY --value <your-prod-key>
```

**Google OAuth**
```bash
eas secret:create --scope project --name GOOGLE_WEB_CLIENT_ID --value <your-value>
eas secret:create --scope project --name GOOGLE_ANDROID_CLIENT_ID --value <your-value>
eas secret:create --scope project --name GOOGLE_IOS_CLIENT_ID --value <your-value>
```

**Sentry**
```bash
eas secret:create --scope project --name SENTRY_DSN --value <your-dsn>
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <your-token>
```

## Obtenir les credentials Supabase

### URL et Anon Key

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans Settings → API
4. Copier :
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Google OAuth IDs

1. Aller sur https://console.cloud.google.com
2. Sélectionner votre projet
3. APIs & Services → Credentials
4. Copier les Client IDs pour chaque plateforme

## Utilisation dans le code

Les variables préfixées par `EXPO_PUBLIC_` sont accessibles dans le code :

```typescript
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from '@env';

const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY
);
```

## Vérification

Pour vérifier que les secrets sont bien configurés :

```bash
eas secret:list
```

## Troubleshooting

### Variables undefined dans l'app
- Vérifier que les secrets EAS existent : `eas secret:list`
- Vérifier que les variables sont bien mappées dans `eas.json`
- Rebuild l'application après avoir ajouté/modifié des secrets

### Erreur de connexion Supabase
- Vérifier que l'URL et la clé sont correctes
- Vérifier l'environnement utilisé (dev vs prod)
- Vérifier les CORS dans Supabase Dashboard
