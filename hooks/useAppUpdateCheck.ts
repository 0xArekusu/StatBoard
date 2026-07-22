import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePostHog } from "posthog-react-native";
import { supabase } from "../src/config/supabase";
import { logInfo, logWarn, logError } from "../utils/logger";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents";

// TODO: remplacer [APP_STORE_ID] par l'identifiant numérique Apple après publication
const STORE_URLS = {
  ios: "itms-apps://itunes.apple.com/app/id6760178414",
  android: "https://play.google.com/store/apps/details?id=com.coachassistant.basketball",
};

const CHANGELOG_SEEN_KEY = "@changelog_last_seen_version";

export interface ChangelogItem {
  emoji?: string;
  title: string;
  text?: string;
}

export interface Changelog {
  version: string;
  title: string | null;
  items: ChangelogItem[];
}

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
  const [changelog, setChangelog] = useState<Changelog | null>(null);
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
          return; // force update prioritaire : pas de changelog tant que l'app n'est pas à jour
        }

        await checkChangelog(currentVersion);
      } catch (err) {
        logError("UpdateCheck", "Error checking minimum version", { err });
      }
    })();

    // Changelog : basé sur la version INSTALLÉE (jamais minimum_version), affiché une seule fois.
    async function checkChangelog(installedVersion: string) {
      try {
        const lastSeen = await AsyncStorage.getItem(CHANGELOG_SEEN_KEY);
        if (lastSeen === installedVersion) return; // déjà vu pour cette version

        const { data, error } = await supabase
          .from("app_changelogs")
          .select("version, title, items")
          .eq("version", installedVersion)
          .eq("published", true)
          .maybeSingle();

        if (error) {
          logWarn("UpdateCheck", "Could not fetch changelog", { error: error.message });
          return;
        }

        const items: ChangelogItem[] =
          Array.isArray(data?.items) ? data!.items.filter((it: ChangelogItem) => it?.title) : [];
        if (!data || items.length === 0) {
          // Aucun changelog publié pour cette version → on marque vu pour éviter un refetch à chaque lancement.
          await AsyncStorage.setItem(CHANGELOG_SEEN_KEY, installedVersion);
          return;
        }

        logInfo("UpdateCheck", "Changelog available", { version: installedVersion });
        setChangelog({ version: data.version, title: data.title ?? null, items });
        posthog?.capture(ANALYTICS_EVENTS.CHANGELOG_SHOWN, { version: installedVersion });
        // On marque vu seulement à la fermeture (dismissChangelog) pour garantir que l'utilisateur le voit.
      } catch (err) {
        logError("UpdateCheck", "Error checking changelog", { err });
      }
    }
  }, []);

  const dismissChangelog = () => {
    const version = changelog?.version;
    setChangelog(null);
    if (!version) return;
    posthog?.capture(ANALYTICS_EVENTS.CHANGELOG_DISMISSED, { version });
    AsyncStorage.setItem(CHANGELOG_SEEN_KEY, version).catch((err) =>
      logError("UpdateCheck", "Error saving changelog seen version", { err })
    );
  };

  return { isForceUpdateRequired, storeUrl, changelog, dismissChangelog };
}
