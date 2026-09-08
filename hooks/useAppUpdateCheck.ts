import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePostHog } from "posthog-react-native";
import { supabase } from "../src/config/supabase";
import { logInfo, logWarn, logError } from "../utils/logger";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents";
import i18n, { DEFAULT_LANGUAGE } from "../src/i18n";

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

// L'éditeur Supabase peut stocker un jsonb en string JSON (double-encodage) : on tolère les deux.
function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

// title/items : soit une valeur simple (ancien format), soit un objet localisé { fr, en, de, es }.
// Repli : langue active → fr → en → première clé disponible.
function pickLocalized<T>(value: unknown, accept: (v: unknown) => v is T): T | null {
  if (accept(value)) return value;
  if (value && typeof value === "object") {
    const dict = value as Record<string, unknown>;
    const active = (i18n.language || DEFAULT_LANGUAGE).split("-")[0];
    for (const key of [active, DEFAULT_LANGUAGE, "en", ...Object.keys(dict)]) {
      const candidate = dict[key];
      if (accept(candidate)) return candidate;
    }
  }
  return null;
}

const isChangelogItemArray = (v: unknown): v is ChangelogItem[] => Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";

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
  const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
  // Distingue "parti au store après clic" (normal) de "quitté sans mettre à jour" (abandon).
  const didClickUpdateRef = useRef(false);

  useEffect(() => {
    // production = utilisateurs finaux, preview = builds de test (QA).
    const isEnabled = !__DEV__ && ["production", "preview"].includes(Updates.channel ?? "");
    if (!isEnabled) {
      logInfo("UpdateCheck", "Force update check skipped", { channel: Updates.channel, isDev: __DEV__ });
      return;
    }

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

        // title/items peuvent être localisés ({ fr, en, de, es }) ou dans l'ancien format simple.
        const rawItems = pickLocalized(parseMaybeJson(data?.items), isChangelogItemArray);
        const items: ChangelogItem[] = (rawItems ?? []).filter((it: ChangelogItem) => it?.title);
        if (!data || items.length === 0) {
          // Aucun changelog publié pour cette version → on marque vu pour éviter un refetch à chaque lancement.
          await AsyncStorage.setItem(CHANGELOG_SEEN_KEY, installedVersion);
          return;
        }

        const title = pickLocalized(parseMaybeJson(data.title), isString);

        logInfo("UpdateCheck", "Changelog available", { version: installedVersion });
        setChangelog({ version: data.version, title, items });
        posthog?.capture(ANALYTICS_EVENTS.CHANGELOG_SHOWN, { version: installedVersion });
        // On marque vu seulement à la fermeture (dismissChangelog) pour garantir que l'utilisateur le voit.
      } catch (err) {
        logError("UpdateCheck", "Error checking changelog", { err });
      }
    }
  }, []);

  // Clic sur "Mettre à jour" : on trace, on mémorise le clic (pour ne pas compter
  // l'ouverture du store comme un abandon), puis on ouvre la fiche store.
  const onUpdatePress = () => {
    didClickUpdateRef.current = true;
    posthog?.capture(ANALYTICS_EVENTS.FORCE_UPDATE_CLICKED, { current_version: currentVersion });
    Linking.openURL(storeUrl).catch((err) =>
      logError("UpdateCheck", "Error opening store URL", { err })
    );
  };

  // Tant que la mise à jour est requise, un passage en arrière-plan SANS avoir cliqué
  // "Mettre à jour" = l'utilisateur a quitté l'app plutôt que de la mettre à jour.
  useEffect(() => {
    if (!isForceUpdateRequired) return;
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background") {
        if (didClickUpdateRef.current) return; // parti au store après clic : normal
        posthog?.capture(ANALYTICS_EVENTS.FORCE_UPDATE_ABANDONED, { current_version: currentVersion });
      } else if (nextAppState === "active") {
        didClickUpdateRef.current = false; // de retour sans avoir mis à jour : réarme la détection
      }
    });
    return () => subscription.remove();
  }, [isForceUpdateRequired, currentVersion, posthog]);

  const dismissChangelog = () => {
    const version = changelog?.version;
    setChangelog(null);
    if (!version) return;
    posthog?.capture(ANALYTICS_EVENTS.CHANGELOG_DISMISSED, { version });
    AsyncStorage.setItem(CHANGELOG_SEEN_KEY, version).catch((err) =>
      logError("UpdateCheck", "Error saving changelog seen version", { err })
    );
  };

  return { isForceUpdateRequired, storeUrl, onUpdatePress, changelog, dismissChangelog };
}
