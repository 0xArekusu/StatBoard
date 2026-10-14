import { registerRootComponent } from 'expo';

// Polyfill `Alert` pour le web : react-native-web n'implémente pas Alert,
// les erreurs seraient donc invisibles (voir utils/webAlert.ts).
// À importer AVANT tout composant utilisant Alert.
import './utils/webAlert';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
