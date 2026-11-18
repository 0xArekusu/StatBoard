/**
 * Demo tutorial preference
 *
 * The landing page guides the visitor itself, so the LiveMatch tutorial
 * overlay is hidden. LiveMatchScreen shows it unless the "don't show again"
 * preference is stored: the demo stores it before opening a match.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { TUTORIAL_SKIP_KEY } from "../../components/LiveMatch";
import { logWarn } from "../../utils/logger";

const TUTORIAL_SKIPPED_VALUE = "true";

export async function disableLiveMatchTutorial(): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_SKIP_KEY, TUTORIAL_SKIPPED_VALUE);
  } catch (error) {
    // Not blocking: the visitor can still close the tutorial
    logWarn("demoTutorialPreference", "⚠️ Could not disable the match tutorial", { error });
  }
}
