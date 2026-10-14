const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Prevent Metro from trying to parse .env files as JavaScript
config.resolver.blockList = [
  /\.env(\.\w+)?$/,
];

// ─────────────────────────────────────────────────────────────────────────────
// BRANCHE web-demo : stubs des modules natifs non supportés par React Native Web
// ─────────────────────────────────────────────────────────────────────────────
// react-native-google-mobile-ads (AdMob) importe des internals React Native qui
// n'existent pas en web → le bundle échoue. On l'alias vers un stub vide :
// aucune pub n'est rendue, ce qui est le comportement voulu pour des captures.
const ADS_STUB = path.resolve(__dirname, 'web-stubs/google-mobile-ads.js');

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-google-mobile-ads') {
    return {
      filePath: ADS_STUB,
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Metro ne connaît pas l'extension .wasm par défaut → expo-sqlite web échoue
// ("import ./wa-sqlite/wa-sqlite.wasm"). On l'ajoute comme asset.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// NOTE : plus besoin d'en-têtes COOP/COEP. Ils étaient nécessaires pour que
// expo-sqlite (web) utilise SharedArrayBuffer lors de ses appels SYNCHRONES.
// Depuis le passage de SQLiteAdapter en asynchrone, les échanges avec le
// worker passent par postMessage : plus de SharedArrayBuffer, donc plus besoin
// de contexte « cross-origin isolated ».

module.exports = config;
