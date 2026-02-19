# Configuration des secrets EAS

## Vue d'ensemble

EAS (Expo Application Services) utilise un système de secrets pour stocker de manière sécurisée les variables d'environnement sensibles. Ces secrets sont injectés pendant le build mais ne sont jamais exposés dans le code source.

## Liste des secrets requis

### Supabase Development
- `DEV_SUPABASE_URL` : URL du projet Supabase de développement
- `DEV_SUPABASE_ANON_KEY` : Clé anonyme du projet Supabase de développement

### Supabase Production
- `PROD_SUPABASE_URL` : URL du projet Supabase de production
- `PROD_SUPABASE_ANON_KEY` : Clé anonyme du projet Supabase de production

### Google OAuth
- `GOOGLE_WEB_CLIENT_ID` : Client ID pour le web
- `GOOGLE_ANDROID_CLIENT_ID` : Client ID pour Android
- `GOOGLE_IOS_CLIENT_ID` : Client ID pour iOS

### Sentry
- `SENTRY_DSN` : Data Source Name pour Sentry
- `SENTRY_AUTH_TOKEN` : Token d'authentification pour uploader les source maps

## Commandes pour créer les secrets

### Créer un secret

```bash
eas secret:create --scope project --name SECRET_NAME --value "secret_value"
```

### Lister tous les secrets

```bash
eas secret:list
```

### Supprimer un secret

```bash
eas secret:delete --name SECRET_NAME
```

### Mettre à jour un secret

Il faut d'abord le supprimer puis le recréer :

```bash
eas secret:delete --name SECRET_NAME
eas secret:create --scope project --name SECRET_NAME --value "new_value"
```

## Configuration dans eas.json

Les secrets sont référencés dans `eas.json` avec le préfixe `$` :

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "$DEV_SUPABASE_URL",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "$DEV_SUPABASE_ANON_KEY"
      }
    }
  }
}
```

## Différence entre EXPO_PUBLIC_ et sans préfixe

### Avec EXPO_PUBLIC_
- Variable accessible **côté client** (dans votre app React Native)
- Exposée dans le bundle final
- Utiliser pour : URLs publiques, clés publiques, etc.

**Exemple** :
```json
"EXPO_PUBLIC_SUPABASE_URL": "$DEV_SUPABASE_URL"
```

### Sans EXPO_PUBLIC_
- Variable accessible **uniquement pendant le build**
- Non exposée dans le bundle final
- Utiliser pour : tokens d'authentification de build, secrets de build

**Exemple** :
```json
"SENTRY_AUTH_TOKEN": "$SENTRY_AUTH_TOKEN"
```

## Fichiers locaux vs Secrets EAS

### Développement local
Utiliser les fichiers `.env.Development` et `.env.Production` (ignorés par git)

### Build EAS
Les secrets EAS sont automatiquement injectés et remplacent les valeurs des fichiers `.env`

## Bonnes pratiques

1. **Ne jamais commiter** de secrets dans le code
2. **Documenter** tous les secrets nécessaires dans ce fichier
3. **Utiliser des scopes project** plutôt que account pour limiter l'accès
4. **Rotation régulière** des tokens et clés sensibles
5. **Environnements séparés** pour dev et prod

## Vérification de la configuration

Après avoir créé tous les secrets, vérifier :

```bash
# Lister tous les secrets
eas secret:list

# Vérifier eas.json
cat eas.json

# Tester un build
eas build --platform android --profile preview --local
```

## Troubleshooting

### Secret non trouvé pendant le build
- Vérifier que le secret existe : `eas secret:list`
- Vérifier l'orthographe dans `eas.json`
- Le préfixe `$` est-il présent dans `eas.json` ?

### Variable undefined dans l'app
- Les variables sans `EXPO_PUBLIC_` ne sont pas accessibles dans l'app
- Rebuild après modification des secrets

### Erreur "Invalid secret value"
- Les valeurs ne doivent pas contenir de guillemets supplémentaires
- Utiliser des guillemets simples si la valeur contient des caractères spéciaux
