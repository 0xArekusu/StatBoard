const { withPodfile } = require('@expo/config-plugins');

// Xcode 27 rejette les pods dont IPHONEOS_DEPLOYMENT_TARGET < 15.0 :
// on remonte chaque target des Pods au minimum de l'app.
const MIN_TARGET = '15.1';
const MARKER = '# withPodsDeploymentTarget';

module.exports = (config) => {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes(MARKER)) return config;

    const snippet = [
      `    ${MARKER}`,
      '    installer.pods_project.targets.each do |t|',
      '      t.build_configurations.each do |c|',
      `        if c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${MIN_TARGET}`,
      `          c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_TARGET}'`,
      '        end',
      '      end',
      '    end',
    ].join('\n');

    contents = contents.replace(
      /(post_install do \|installer\|\n\s*react_native_post_install\([\s\S]*?\n\s*\)\n)/,
      `$1${snippet}\n`,
    );
    config.modResults.contents = contents;
    return config;
  });
};
