import {
  getAuthErrorMessage,
  isCancelledAuthError,
  isEmailNotConfirmedError,
  isNetworkLoginError,
  isSocialProviderError,
} from "../../src/utils/authErrors";

// `t` factice : on vérifie la clé choisie, pas la traduction elle-même.
const t = (key: string) => key;

/**
 * En novembre 2026, 81 personnes sur 204 identifiées ont déclenché un
 * `login_failed`, et les échecs Apple / Google s'affichaient avec le message
 * natif anglais dans une app francophone. Ces tests verrouillent deux choses :
 * la bonne classification, et le fait qu'aucun message brut ne fuite.
 */
describe("classification des erreurs d'authentification", () => {
  it("reconnaît un email non confirmé par le code ou par le message", () => {
    expect(isEmailNotConfirmedError({ code: "email_not_confirmed" })).toBe(true);
    expect(isEmailNotConfirmedError({ message: "Email not confirmed" })).toBe(true);
    expect(isEmailNotConfirmedError({ message: "Invalid login credentials" })).toBe(false);
    expect(isEmailNotConfirmedError(null)).toBe(false);
  });

  it("reconnaît une erreur réseau", () => {
    expect(isNetworkLoginError({ message: "Network request failed" })).toBe(true);
    expect(isNetworkLoginError({ message: "NETWORK_ERROR" })).toBe(true);
    expect(isNetworkLoginError({ message: "Invalid login credentials" })).toBe(false);
  });

  it("reconnaît une annulation, y compris côté Google", () => {
    expect(isCancelledAuthError({ code: "ERR_REQUEST_CANCELED" })).toBe(true);
    expect(isCancelledAuthError({ code: "12501" })).toBe(true);
    expect(isCancelledAuthError({ message: "SIGN_IN_CANCELLED" })).toBe(true);
    expect(isCancelledAuthError({ message: "Invalid login credentials" })).toBe(false);
  });

  it("reconnaît un échec du fournisseur externe", () => {
    expect(
      isSocialProviderError({
        message: "The authorization attempt failed for an unknown reason",
      }),
    ).toBe(true);
    expect(
      isSocialProviderError({ message: "RNGoogleSignIn: Unknown error in google sign in., Error" }),
    ).toBe(true);
    expect(isSocialProviderError({ code: "10" })).toBe(true);
    expect(isSocialProviderError({ message: "Email not confirmed" })).toBe(false);
  });
});

describe("getAuthErrorMessage", () => {
  it("ne renvoie jamais le message natif anglais", () => {
    const cases = [
      "Invalid login credentials",
      "Email not confirmed",
      "The authorization attempt failed for an unknown reason",
      "RNGoogleSignIn: Unknown error in google sign in., Error",
      "No ID token present!",
      "Network request failed",
      "Something utterly unexpected from a future SDK",
    ];

    for (const message of cases) {
      const result = getAuthErrorMessage({ message }, t, "google");
      expect(result.startsWith("authErrors.")).toBe(true);
      expect(result).not.toContain(message);
      expect(result).not.toContain("error");
    }
  });

  it("mappe les cas fréquents vers la bonne clé", () => {
    expect(getAuthErrorMessage({ message: "Invalid login credentials" }, t)).toBe(
      "authErrors.invalidCredentials",
    );
    expect(getAuthErrorMessage({ message: "Email not confirmed" }, t)).toBe(
      "authErrors.emailNotConfirmed",
    );
    expect(getAuthErrorMessage({ message: "Network request failed" }, t)).toBe(
      "authErrors.network",
    );
    expect(getAuthErrorMessage({ code: "12501" }, t)).toBe("authErrors.cancelled");
  });

  it("distingue Google et Apple pour les échecs du fournisseur", () => {
    const appleError = {
      message: "The authorization attempt failed for an unknown reason",
    };
    const googleError = { message: "RNGoogleSignIn: Unknown error in google sign in." };
    expect(getAuthErrorMessage(appleError, t, "apple")).toBe("authErrors.appleUnavailable");
    expect(getAuthErrorMessage(googleError, t, "google")).toBe("authErrors.googleUnavailable");
  });

  it("retombe sur un message générique si l'erreur est absente", () => {
    expect(getAuthErrorMessage(null, t)).toBe("authErrors.generic");
    expect(getAuthErrorMessage(undefined, t)).toBe("authErrors.generic");
    expect(getAuthErrorMessage({}, t)).toBe("authErrors.generic");
  });
});
