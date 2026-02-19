# Configuration Sentry

## Informations du projet

- **Organisation** : `asc-solutions`
- **Projet** : `coach-assistant`
- **URL du projet** : Disponible dans Sentry > Settings > Projects

## Configuration locale

### 1. Fichiers de configuration

Deux fichiers `sentry.properties` sont nécessaires (ignorés par git car dans `android/` et `ios/`) :

**android/sentry.properties**
```properties
defaults.project=coach-assistant
defaults.org=asc-solutions
auth.token=${SENTRY_AUTH_TOKEN}
cli.executable=node_modules/@sentry/cli/bin/sentry-cli
```

**ios/sentry.properties**
```properties
defaults.project=coach-assistant
defaults.org=asc-solutions
auth.token=${SENTRY_AUTH_TOKEN}
cli.executable=../node_modules/@sentry/cli/bin/sentry-cli
```

### 2. Configuration app.json

Le plugin Sentry est configuré dans `app.json` :

```json
{
  "plugins": [
    [
      "@sentry/react-native/expo",
      {
        "organization": "asc-solutions",
        "project": "coach-assistant"
      }
    ]
  ]
}
```

### 3. Variables d'environnement

#### Fichiers .env

Ajouter dans `.env.Development` et `.env.Production` :

```bash
# Sentry
EXPO_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
SENTRY_AUTH_TOKEN=<your-auth-token>
```

> **Note** : `EXPO_PUBLIC_SENTRY_DSN` est accessible côté client, `SENTRY_AUTH_TOKEN` est utilisé uniquement pendant le build.

#### Configuration EAS (eas.json)

Ajouter dans chaque profil de build :

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_SENTRY_DSN": "$SENTRY_DSN",
        "SENTRY_AUTH_TOKEN": "$SENTRY_AUTH_TOKEN"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_SENTRY_DSN": "$SENTRY_DSN",
        "SENTRY_AUTH_TOKEN": "$SENTRY_AUTH_TOKEN"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_SENTRY_DSN": "$SENTRY_DSN",
        "SENTRY_AUTH_TOKEN": "$SENTRY_AUTH_TOKEN"
      }
    }
  }
}
```

### 4. Créer l'auth token Sentry

1. Aller sur https://sentry.io/settings/account/api/auth-tokens/
2. Cliquer sur "Create New Token"
3. Nom : `StatBoard Build`
4. Scopes requis :
   - `project:releases`
   - `project:write`
   - `org:read`
5. Copier le token généré

### 5. Créer les secrets EAS

Créer le secret pour que EAS puisse uploader les source maps :

```bash
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <your-token>
```

Créer également le secret pour le DSN :

```bash
eas secret:create --scope project --name SENTRY_DSN --value <your-dsn>
```

## Vérification

Pour vérifier que Sentry est bien configuré :

1. Faire un build EAS : `eas build --platform android --profile preview`
2. Vérifier dans les logs que les source maps sont uploadées
3. Sur Sentry, aller dans Settings → Projects → coach-assistant → Source Maps pour voir les uploads

## Troubleshooting

### Erreur "Auth token is required"
- Vérifier que le secret `SENTRY_AUTH_TOKEN` existe : `eas secret:list`
- Vérifier que le token a les bonnes permissions sur Sentry

### Erreur "Project not found"
- Vérifier que l'organisation et le projet sont corrects dans `sentry.properties`
- Vérifier l'URL du projet sur Sentry pour confirmer les slugs

### Source maps non uploadées
- Vérifier les logs de build EAS
- S'assurer que `SENTRY_AUTH_TOKEN` est bien défini dans `eas.json`
