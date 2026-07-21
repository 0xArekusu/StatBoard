import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { usePostHog } from "posthog-react-native";
import { supabase } from "../src/config/supabase";
import { logInfo, logWarn, logError } from "../utils/logger";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents";

// TODO: remplacer [APP_STORE_ID] par l'identifiant numérique Apple après publication
const STORE_URLS = {
  ios: "itms-apps://itunes.apple.com/app/id6760178414",
  android: "https://play.google.com/store/apps/details?id=com.coachassistant.basketball",
};

function isVersionLessThan(current: string, minimum: string): boolean {
  const parse = (v: string) => v.split(".").map(Number);
  const curr = parse(current);
  const min = parse(minimum);
  for (let i = 0; i < Math.max(curr.length, min.length); i++) {
    const c = curr[i] ?? 0;
    const m = min[i] ?? 0;
    if (c < m) return true;
    if (c > m) return false;
  }
  return false;
}

export function useAppUpdateCheck() {
  const posthog = usePostHog();
  const [isForceUpdateRequired, setIsForceUpdateRequired] = useState(false);
  const storeUrl = Platform.OS === "ios" ? STORE_URLS.ios : STORE_URLS.android;

  useEffect(() => {
    const isProduction = !__DEV__ && Updates.channel === "production";
    if (!isProduction) {
      logInfo("UpdateCheck", "Force update check skipped", { channel: Updates.channel, isDev: __DEV__ });
      return;
    }

    const currentVersion = Constants.expoConfig?.version ?? "0.0.0";

    (async () => {
      try {
        const { data, error } = await supabase
          .from("app_config")
          .select("value")
          .eq("key", "minimum_version")
          .single();

        if (error || !data) {
          logWarn("UpdateCheck", "Could not fetch minimum version", { error: error?.message });
          return;
        }

        logInfo("UpdateCheck", "Version check", { currentVersion, minimumVersion: data.value });

        if (isVersionLessThan(currentVersion, data.value)) {
          logWarn("UpdateCheck", "⚠️ Force update required", {
            currentVersion,
            minimumVersion: data.value,
          });
          posthog?.capture(ANALYTICS_EVENTS.FORCE_UPDATE_SHOWN, {
            current_version: currentVersion,
            minimum_version: data.value,
          });
          setIsForceUpdateRequired(true);
        }
      } catch (err) {
        logError("UpdateCheck", "Error checking minimum version", { err });
      }
    })();
  }, []);

  return { isForceUpdateRequired, storeUrl };
}
