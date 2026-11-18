/**
 * Demo reset request
 *
 * The landing page restarts the demo by reloading it with `?reset`.
 * The parameter is consumed once, so a later reload resumes the new match.
 */

import { Platform } from "react-native";
import { DEMO_RESET_QUERY_PARAM } from "../constants/demoConstants";

export function consumeDemoResetRequest(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return false;
  }

  const url = new URL(window.location.href);
  if (!url.searchParams.has(DEMO_RESET_QUERY_PARAM)) {
    return false;
  }

  url.searchParams.delete(DEMO_RESET_QUERY_PARAM);
  window.history.replaceState(window.history.state, "", url.toString());
  return true;
}
