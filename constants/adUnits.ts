/**
 * AdMob ad unit IDs
 *
 * Test IDs are used during development. Replace with your real AdMob unit IDs
 * once your AdMob account is created and your app is registered.
 *
 * To get production IDs:
 *  1. Create an account at https://admob.google.com
 *  2. Add your app (iOS + Android)
 *  3. Create ad units for each format (Banner, Interstitial)
 *  4. Replace the values below with the generated unit IDs
 *  5. Update androidAppId and iosAppId in app.json with your real App IDs
 */

import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

const IS_PRODUCTION = !__DEV__;

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

const BANNER_UNIT_ID = Platform.select({
  ios: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX", // TODO: replace with real iOS banner unit ID
  android: "ca-app-pub-5211468835188047/4270082028",
});

export const BANNER_AD_UNIT_ID = IS_PRODUCTION
  ? BANNER_UNIT_ID!
  : TestIds.BANNER;

// ---------------------------------------------------------------------------
// Interstitial
// ---------------------------------------------------------------------------

const INTERSTITIAL_UNIT_ID = Platform.select({
  ios: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX", // TODO: replace with real iOS interstitial unit ID
  android: "ca-app-pub-5211468835188047/7547248955", 
});

export const INTERSTITIAL_AD_UNIT_ID = IS_PRODUCTION
  ? INTERSTITIAL_UNIT_ID!
  : TestIds.INTERSTITIAL;
