const { withPodfile } = require('@expo/config-plugins');

module.exports = (config) => {
  return withPodfile(config, (config) => {
    const lines = config.modResults.contents.split('\n');
    let lastEndIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() === 'end') {
        lastEndIdx = i;
        break;
      }
    }
    if (lastEndIdx !== -1) {
      lines.splice(lastEndIdx, 0,
        "  pod 'GoogleUtilities', :modular_headers => true",
        "  pod 'RecaptchaInterop', :modular_headers => true",
      );
    }
    config.modResults.contents = lines.join('\n');
    return config;
  });
};
