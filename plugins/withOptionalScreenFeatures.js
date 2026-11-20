const { withAndroidManifest } = require('@expo/config-plugins');

// Une activité déclarée en portrait (ex. dans une dépendance) fait déduire au
// Play Store une exigence implicite android.hardware.screen.portrait, ce qui
// exclut tablettes, Chromebooks et Android XR. On la déclare facultative.
const FEATURES = [
  'android.hardware.screen.portrait',
  'android.hardware.screen.landscape',
];

module.exports = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest['uses-feature'] = manifest['uses-feature'] || [];

    for (const name of FEATURES) {
      const existing = manifest['uses-feature'].find(
        (f) => f.$ && f.$['android:name'] === name
      );
      if (existing) {
        existing.$['android:required'] = 'false';
      } else {
        manifest['uses-feature'].push({
          $: { 'android:name': name, 'android:required': 'false' },
        });
      }
    }
    return config;
  });
};
