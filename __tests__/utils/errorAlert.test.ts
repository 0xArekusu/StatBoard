import { Alert } from "react-native";
import {
  showErrorAlert,
  showNetworkErrorAlert,
  showPermissionErrorAlert,
} from "../../utils/errorAlert";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
}));

jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));

jest.mock("../../utils/logger", () => ({
  logError: jest.fn(),
}));

import * as Sentry from "@sentry/react-native";
import { logError } from "../../utils/logger";

const mockAlert = Alert.alert as jest.Mock;
const mockSentry = Sentry.captureException as jest.Mock;
const mockLogError = logError as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── showErrorAlert ───────────────────────────────────────────────────────────

describe("showErrorAlert", () => {
  it("appelle Alert.alert avec le titre 'Erreur'", () => {
    showErrorAlert({ action: "charger les matchs", error: new Error("fail"), context: "Test" });
    expect(mockAlert).toHaveBeenCalledWith("Erreur", expect.any(String), expect.any(Array));
  });

  it("inclut l'action dans le message", () => {
    showErrorAlert({ action: "synchroniser", error: new Error("fail"), context: "Test" });
    const message = mockAlert.mock.calls[0][1] as string;
    expect(message).toContain("synchroniser");
  });

  it("inclut le message d'erreur si c'est une instance de Error", () => {
    showErrorAlert({ action: "charger", error: new Error("réseau indisponible"), context: "Test" });
    const message = mockAlert.mock.calls[0][1] as string;
    expect(message).toContain("réseau indisponible");
  });

  it("affiche 'Erreur inconnue' si l'erreur n'est pas un Error", () => {
    showErrorAlert({ action: "charger", error: "string error", context: "Test" });
    const message = mockAlert.mock.calls[0][1] as string;
    expect(message).toContain("Erreur inconnue");
  });

  it("appelle logError avec le bon contexte", () => {
    showErrorAlert({ action: "charger", error: new Error("fail"), context: "HistoryScreen" });
    expect(mockLogError).toHaveBeenCalledWith("HistoryScreen", expect.any(String), expect.any(Object));
  });

  it("envoie l'exception à Sentry", () => {
    const error = new Error("crash");
    showErrorAlert({ action: "charger", error, context: "Test" });
    expect(mockSentry).toHaveBeenCalledWith(error, expect.objectContaining({ tags: expect.any(Object) }));
  });

  it("wrappe les erreurs non-Error dans un new Error pour Sentry", () => {
    showErrorAlert({ action: "charger", error: "raw string", context: "Test" });
    const sentryArg = mockSentry.mock.calls[0][0];
    expect(sentryArg).toBeInstanceOf(Error);
    expect(sentryArg.message).toBe("raw string");
  });

  describe("boutons", () => {
    it("affiche seulement 'OK' par défaut (showRetry = false)", () => {
      showErrorAlert({ action: "charger", error: new Error("fail"), context: "Test" });
      const buttons = mockAlert.mock.calls[0][2];
      expect(buttons).toHaveLength(1);
      expect(buttons[0].text).toBe("OK");
    });

    it("affiche 'Réessayer' et 'Annuler' si showRetry = true avec onRetry", () => {
      const onRetry = jest.fn();
      showErrorAlert({ action: "charger", error: new Error("fail"), context: "Test", showRetry: true, onRetry });
      const buttons = mockAlert.mock.calls[0][2];
      expect(buttons).toHaveLength(2);
      expect(buttons[0].text).toBe("Réessayer");
      expect(buttons[1].text).toBe("Annuler");
    });

    it("le bouton 'Réessayer' appelle onRetry", () => {
      const onRetry = jest.fn();
      showErrorAlert({ action: "charger", error: new Error("fail"), context: "Test", showRetry: true, onRetry });
      const buttons = mockAlert.mock.calls[0][2];
      buttons[0].onPress();
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("le bouton 'Annuler' appelle onCancel si fourni", () => {
      const onCancel = jest.fn();
      showErrorAlert({ action: "charger", error: new Error("fail"), context: "Test", showRetry: true, onRetry: jest.fn(), onCancel });
      const buttons = mockAlert.mock.calls[0][2];
      buttons[1].onPress();
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── showNetworkErrorAlert ────────────────────────────────────────────────────

describe("showNetworkErrorAlert", () => {
  it("appelle Alert.alert avec 'Erreur'", () => {
    showNetworkErrorAlert("TestScreen");
    expect(mockAlert).toHaveBeenCalledWith("Erreur", expect.any(String), expect.any(Array));
  });

  it("mentionne 'connexion réseau' dans le message", () => {
    showNetworkErrorAlert("TestScreen");
    const message = mockAlert.mock.calls[0][1] as string;
    expect(message).toContain("connexion");
  });

  it("affiche 'Réessayer' si onRetry est fourni", () => {
    showNetworkErrorAlert("TestScreen", jest.fn());
    const buttons = mockAlert.mock.calls[0][2];
    const retryBtn = buttons.find((b: any) => b.text === "Réessayer");
    expect(retryBtn).toBeDefined();
  });

  it("n'affiche pas 'Réessayer' si onRetry n'est pas fourni", () => {
    showNetworkErrorAlert("TestScreen");
    const buttons = mockAlert.mock.calls[0][2];
    const retryBtn = buttons.find((b: any) => b.text === "Réessayer");
    expect(retryBtn).toBeUndefined();
  });
});

// ─── showPermissionErrorAlert ─────────────────────────────────────────────────

describe("showPermissionErrorAlert", () => {
  it("appelle Alert.alert avec 'Erreur'", () => {
    showPermissionErrorAlert("TestScreen");
    expect(mockAlert).toHaveBeenCalledWith("Erreur", expect.any(String), expect.any(Array));
  });

  it("mentionne les permissions dans le message", () => {
    showPermissionErrorAlert("TestScreen");
    const message = mockAlert.mock.calls[0][1] as string;
    expect(message).toContain("permissions");
  });
});
