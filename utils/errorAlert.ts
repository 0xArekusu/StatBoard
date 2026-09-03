/**
 * Error Alert Helper
 *
 * Standardized error alerts for user-facing errors across the app.
 * Each call site provides a `messageKey` pointing to a complete, specific
 * i18n message (not a fragment composed into a template), so every situation
 * gets its own clear, localized sentence instead of a generic "Impossible de X.".
 */

import { Alert } from "react-native";
import * as Sentry from "@sentry/react-native";
import { logError } from "./logger";
import i18n from "../src/i18n";

export interface ErrorAlertOptions {
  /** i18n key for the complete, specific message shown to the user (e.g. "historyScreen.errors.deleteFailed") */
  messageKey: string;
  /** Optional interpolation params for messageKey */
  messageParams?: Record<string, unknown>;
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
 *     messageKey: "historyScreen.errors.loadFailed",
 *     error,
 *     context: "HistoryScreen",
 *     showRetry: true,
 *     onRetry: () => fetchMatches(),
 *   });
 * }
 * ```
 */
export function showErrorAlert({
  messageKey,
  messageParams,
  error,
  context,
  onRetry,
  onCancel,
  showRetry = false,
}: ErrorAlertOptions): void {
  // Log the error
  logError(context, `Failed: ${messageKey}`, {
    error: error instanceof Error ? error.message : error,
  });

  // Capture in Sentry
  Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
    tags: { context, messageKey },
  });

  // Extract error message
  const errorMessage = error instanceof Error ? error.message : i18n.t("errorAlert.unknownError");

  // Build alert message: a complete, specific sentence + the raw technical detail
  const message = `${i18n.t(messageKey, messageParams)}\n\n${errorMessage}`;

  // Build buttons
  const buttons: Array<{
    text: string;
    onPress?: () => void;
    style?: "default" | "cancel" | "destructive";
  }> = [];

  if (showRetry && onRetry) {
    buttons.push({
      text: i18n.t("errorAlert.retryButton"),
      onPress: onRetry,
    });
  }

  buttons.push({
    text: showRetry ? i18n.t("common.cancel") : i18n.t("common.ok"),
    style: "cancel",
    onPress: onCancel,
  });

  // Show alert
  Alert.alert(i18n.t("common.error"), message, buttons);
}

/**
 * Show a network error alert (specific case for network issues)
 */
export function showNetworkErrorAlert(context: string, onRetry?: () => void): void {
  showErrorAlert({
    messageKey: "errorAlert.networkError",
    error: new Error("Network connection unavailable"),
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
    messageKey: "errorAlert.permissionError",
    error: new Error("Missing required permissions"),
    context,
  });
}
