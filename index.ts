import { registerRootComponent } from 'expo';

// Polyfill `Alert` pour le web : react-native-web n'implémente pas Alert,
// les erreurs seraient donc invisibles (voir utils/webAlert.ts).
// À importer AVANT tout composant utilisant Alert.
import './utils/webAlert';

import type { ComponentType } from 'react';
import { DEMO_APP_ENTRY } from './demo/constants/demoConstants';

// EXPO_PUBLIC_APP_ENTRY=demo mounts the landing page demo instead of the app.
// Roots are required lazily so only the selected one runs its module side
// effects (the app root initializes Sentry, update checks, etc.).
const Root: ComponentType =
  process.env.EXPO_PUBLIC_APP_ENTRY === DEMO_APP_ENTRY
    ? require('./demo/DemoApp').default
    : require('./App').default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
