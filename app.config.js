/**
 * Dynamic Expo config, layered on top of app.json.
 *
 * The landing page demo (EXPO_PUBLIC_APP_ENTRY=demo) is served by the website
 * under /demo, so its web export must reference its bundles and assets from
 * that base URL. Every other build keeps app.json unchanged.
 */

const DEMO_APP_ENTRY = "demo";
const DEMO_BASE_URL = "/demo";

module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_APP_ENTRY !== DEMO_APP_ENTRY) {
    return config;
  }

  return {
    ...config,
    experiments: {
      ...config.experiments,
      baseUrl: DEMO_BASE_URL,
    },
  };
};
