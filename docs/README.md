# Documentation du projet Coach Assistant

## Vue d'ensemble

Coach Assistant est une application React Native construite avec Expo pour la gestion d'équipes de basketball.

## Guides de configuration

- [Configuration Sentry](./SENTRY_SETUP.md) - Monitoring et tracking des erreurs
- [Configuration Supabase](./SUPABASE_SETUP.md) - Backend et authentification
- [Secrets EAS](./EAS_SECRETS_SETUP.md) - Gestion des variables d'environnement

## Diagrammes

- [Architecture globale](./diagrams/architecture.puml) - Vue d'ensemble de l'architecture
- [Flux d'authentification](./diagrams/authentication-flow.puml) - Processus d'authentification
- [Processus de build](./diagrams/build-process.puml) - Build EAS étape par étape

## Technologies utilisées

- **React Native** avec Expo SDK
- **Supabase** pour le backend (base de données, authentification)
- **Sentry** pour le monitoring et tracking des erreurs
- **Google Sign-In** pour l'authentification OAuth
- **EAS Build** pour les builds natifs

## Structure du projet

```
coach-assistant/
├── app/                    # Code de l'application (navigation, screens)
├── components/             # Composants réutilisables
├── constants/              # Constantes et configuration
├── hooks/                  # Custom React hooks
├── lib/                    # Utilitaires et services (Supabase, etc.)
├── docs/                   # Documentation
│   ├── diagrams/           # Diagrammes PlantUML
│   ├── README.md           # Index de la documentation
│   ├── SENTRY_SETUP.md     # Configuration Sentry
│   ├── SUPABASE_SETUP.md   # Configuration Supabase
│   └── EAS_SECRETS_SETUP.md # Gestion des secrets EAS
├── android/                # Code natif Android (ignoré par git)
├── ios/                    # Code natif iOS (ignoré par git)
├── .env.Development        # Variables d'environnement dev (ignoré par git)
├── .env.Production         # Variables d'environnement prod (ignoré par git)
├── app.json                # Configuration Expo
├── eas.json                # Configuration EAS Build
└── package.json            # Dépendances npm
```

## Commandes principales

### Développement local

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npx expo start

# Démarrer avec le client de développement
npx expo start --dev-client
```

### Builds EAS

```bash
# Build Android preview
eas build --platform android --profile preview

# Build iOS preview
eas build --platform ios --profile preview

# Build production
eas build --platform all --profile production
```

### Gestion des secrets

```bash
# Lister les secrets
eas secret:list

# Créer un secret
eas secret:create --scope project --name SECRET_NAME --value "value"

# Supprimer un secret
eas secret:delete --name SECRET_NAME
```

## Configuration initiale d'un nouvel environnement

1. **Cloner le projet**
   ```bash
   git clone <repo-url>
   cd coach-assistant
   npm install
   ```

2. **Configurer les variables d'environnement locales**
   - Créer `.env.Development` (voir [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
   - Créer `.env.Production` (voir [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))

3. **Configurer les secrets EAS** (pour les builds)
   - Voir [EAS_SECRETS_SETUP.md](./EAS_SECRETS_SETUP.md) pour la liste complète
   - Créer tous les secrets nécessaires avec `eas secret:create`

4. **Configurer Sentry**
   - Voir [SENTRY_SETUP.md](./SENTRY_SETUP.md)
   - Créer un auth token Sentry
   - Ajouter le secret `SENTRY_AUTH_TOKEN` dans EAS

5. **Prebuild des dossiers natifs** (si nécessaire)
   ```bash
   npx expo prebuild
   ```

## Environnements

Le projet utilise deux environnements :

- **Development** : Pour le développement et les tests
  - Supabase Dev
  - Builds avec profil `development` ou `preview`

- **Production** : Pour la production
  - Supabase Prod
  - Builds avec profil `production`

## Authentification

L'application supporte deux méthodes d'authentification :
- Email/Password (Supabase Auth)
- Google Sign-In (OAuth)

Configuration détaillée dans [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

## Monitoring

Sentry est configuré pour :
- Tracking des erreurs en production
- Upload automatique des source maps pendant les builds
- Alertes sur les crashes

Configuration détaillée dans [SENTRY_SETUP.md](./SENTRY_SETUP.md)

## Troubleshooting

### Build EAS échoue
1. Vérifier que tous les secrets sont créés : `eas secret:list`
2. Vérifier les logs de build sur https://expo.dev
3. Consulter les guides de setup dans `/docs`

### Variables d'environnement non disponibles
1. En local : vérifier les fichiers `.env.Development` et `.env.Production`
2. En build EAS : vérifier que les secrets existent et sont bien mappés dans `eas.json`

### Erreurs Sentry
1. Vérifier que l'organisation et le projet sont corrects dans `app.json`
2. Vérifier que le token Sentry a les bonnes permissions
3. Voir [SENTRY_SETUP.md](./SENTRY_SETUP.md) pour plus de détails

## Support

Pour toute question ou problème, consulter d'abord la documentation dans `/docs`.
