import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { usePostHog } from "posthog-react-native";
import { supabase } from "../src/config/supabase";
import { logError, logWarn } from "../utils/logger";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents";
import {
  REVIEW_PROMPT_SAFE_SCREENS,
  REVIEW_PROMPT_SCORE_THRESHOLD_DEFAULT,
  REVIEW_PROMPT_SUPPORT_EMAIL,
  REVIEW_PROMPT_THRESHOLD_CONFIG_KEY,
} from "../constants/reviewPrompt";

const SCORE_KEY = "@review_prompt_score";
const ANSWERED_KEY = "@review_prompt_answered";

/**
 * À appeler depuis n'importe quel écran après un moment de succès
 * (fin de match, export PDF...). N'affiche jamais rien elle-même :
 * incrémente juste un compteur silencieux, lu ensuite par useReviewPrompt.
 */
export async function recordReviewPromptSignal() {
  try {
    const alreadyAnswered = await AsyncStorage.getItem(ANSWERED_KEY);
    if (alreadyAnswered === "true") return;

    const raw = await AsyncStorage.getItem(SCORE_KEY);
    const score = (raw ? parseInt(raw, 10) : 0) + 1;
    await AsyncStorage.setItem(SCORE_KEY, String(score));
  } catch (err) {
    logError("ReviewPrompt", "Error recording signal", { err });
  }
}

/**
 * Décide quand afficher le popup de demande d'avis.
 * Le check ne se déclenche que sur changement d'écran, et seulement si
 * l'écran courant fait partie de REVIEW_PROMPT_SAFE_SCREENS — donc jamais
 * pendant un match en cours, une configuration d'équipe, etc.
 */
export function useReviewPrompt(currentRouteName: string | undefined) {
  const posthog = usePostHog();
  const [visible, setVisible] = useState(false);
  const [threshold, setThreshold] = useState(REVIEW_PROMPT_SCORE_THRESHOLD_DEFAULT);
  const checkInFlight = useRef(false);

  // Seuil pilotable à distance (app_config), ajustable sans redéploiement.
  // Un seul fetch par session app ; en cas d'échec on garde la valeur de repli.
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("app_config")
          .select("value")
          .eq("key", REVIEW_PROMPT_THRESHOLD_CONFIG_KEY)
          .maybeSingle();

        if (error || !data?.value) {
          logWarn("ReviewPrompt", "Could not fetch threshold config, using default", {
            error: error?.message,
          });
          return;
        }

        const parsed = parseInt(data.value, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          setThreshold(parsed);
        }
      } catch (err) {
        logError("ReviewPrompt", "Error fetching threshold config", { err });
      }
    })();
  }, []);

  useEffect(() => {
    if (!currentRouteName || !REVIEW_PROMPT_SAFE_SCREENS.includes(currentRouteName)) return;
    if (checkInFlight.current) return;
    checkInFlight.current = true;

    (async () => {
      try {
        const alreadyAnswered = await AsyncStorage.getItem(ANSWERED_KEY);
        if (alreadyAnswered === "true") return;

        const raw = await AsyncStorage.getItem(SCORE_KEY);
        const score = raw ? parseInt(raw, 10) : 0;
        if (score >= threshold) {
          setVisible(true);
          posthog?.capture(ANALYTICS_EVENTS.REVIEW_PROMPT_SHOWN, { score, threshold, screen: currentRouteName });
        }
      } catch (err) {
        logError("ReviewPrompt", "Error checking score", { err });
      } finally {
        checkInFlight.current = false;
      }
    })();
  }, [currentRouteName, threshold, posthog]);

  const markAnswered = async () => {
    try {
      await AsyncStorage.setItem(ANSWERED_KEY, "true");
    } catch (err) {
      logError("ReviewPrompt", "Error marking answered", { err });
    }
  };

  const onLike = async () => {
    setVisible(false);
    posthog?.capture(ANALYTICS_EVENTS.REVIEW_PROMPT_LIKED);
    await markAnswered();
    try {
      if (await StoreReview.isAvailableAsync()) {
        posthog?.capture(ANALYTICS_EVENTS.REVIEW_PROMPT_NATIVE_REQUESTED);
        await StoreReview.requestReview();
      }
    } catch (err) {
      logError("ReviewPrompt", "Error requesting native review", { err });
    }
  };

  const onDislike = async () => {
    setVisible(false);
    posthog?.capture(ANALYTICS_EVENTS.REVIEW_PROMPT_DISLIKED);
    await markAnswered();
    const mailUrl = `mailto:${REVIEW_PROMPT_SUPPORT_EMAIL}?subject=${encodeURIComponent("Retour sur Coach Assistant")}`;
    Linking.openURL(mailUrl).catch((err) =>
      logError("ReviewPrompt", "Error opening feedback email", { err })
    );
  };

  return { visible, onLike, onDislike };
}
