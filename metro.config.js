const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prevent Metro from trying to parse .env files as JavaScript
config.resolver.blockList = [
  /\.env(\.\w+)?$/,
];

module.exports = config;
