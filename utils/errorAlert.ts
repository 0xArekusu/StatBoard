/**
 * Error Alert Helper
 *
 * Standardized error alerts for user-facing errors across the app
 */

import { Alert } from "react-native";
import * as Sentry from "@sentry/react-native";
import { logError } from "./logger";

export interface ErrorAlertOptions {
  /** The action that failed (e.g., "charger les matchs", "synchroniser") */
  action: string;
  /** The error object or message */
  error: unknown;
  /** Component/context where error occurred (for logging) */
  context: string;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Optional cancel callback */
  onCancel?: () => void;
  /** Show retry button (default: false) */
  showRetry?: boolean;
}

/**
 * Show a standardized error alert to the user
 *
 * @example
 * ```typescript
 * try {
 *   await fetchMatches();
 * } catch (error) {
 *   showErrorAlert({
 *     action: "charger les matchs",
 *     error,
 *     context: "HistoryScreen",
 *     showRetry: true,
 *     onRetry: () => fetchMatches(),
 *   });
 * }
 * ```
 */
export function showErrorAlert({
  action,
  error,
  context,
  onRetry,
  onCancel,
  showRetry = false,
}: ErrorAlertOptions): void {
  // Log the error
  logError(context, `Failed to ${action}`, {
    error: error instanceof Error ? error.message : error,
  });

  // Capture in Sentry
  Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
    tags: { context, action },
  });

  // Extract error message
  const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";

  // Build alert message
  const message = `Impossible de ${action}.\n\n${errorMessage}\n\nVérifiez votre connexion internet et réessayez.`;

  // Build buttons
  const buttons: Array<{
    text: string;
    onPress?: () => void;
    style?: "default" | "cancel" | "destructive";
  }> = [];

  if (showRetry && onRetry) {
    buttons.push({
      text: "Réessayer",
      onPress: onRetry,
    });
  }

  buttons.push({
    text: showRetry ? "Annuler" : "OK",
    style: "cancel",
    onPress: onCancel,
  });

  // Show alert
  Alert.alert("Erreur", message, buttons);
}

/**
 * Show a network error alert (specific case for network issues)
 */
export function showNetworkErrorAlert(context: string, onRetry?: () => void): void {
  showErrorAlert({
    action: "se connecter au serveur",
    error: new Error("Problème de connexion réseau"),
    context,
    showRetry: !!onRetry,
    onRetry,
  });
}

/**
 * Show an RLS/permission error alert
 */
export function showPermissionErrorAlert(context: string): void {
  showErrorAlert({
    action: "accéder à cette ressource",
    error: new Error("Vous n'avez pas les permissions nécessaires"),
    context,
  });
}
