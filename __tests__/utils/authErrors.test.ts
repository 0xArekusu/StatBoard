import {
  isEmailNotConfirmedError,
  isNetworkLoginError,
} from "../../src/utils/authErrors";

/**
 * En novembre 2026, 30 personnes sur 204 (15 %) avaient un compte valide mais
 * bloqué faute d'avoir confirmé leur email, et l'écran de connexion ne proposait
 * aucun moyen de renvoyer le lien. Ces tests verrouillent la détection.
 */
describe("isEmailNotConfirmedError", () => {
  it("reconnaît le code Supabase stable", () => {
    expect(
      isEmailNotConfirmedError({ code: "email_not_confirmed", message: "whatever" }),
    ).toBe(true);
  });

  it("reconnaît le message historique, quelle que soit la casse", () => {
    expect(isEmailNotConfirmedError({ message: "Email not confirmed" })).toBe(true);
    expect(isEmailNotConfirmedError({ message: "error: EMAIL NOT CONFIRMED" })).toBe(true);
  });

  it("ne confond pas avec un mot de passe erroné", () => {
    expect(
      isEmailNotConfirmedError({ message: "Invalid login credentials" }),
    ).toBe(false);
  });

  it("ignore les erreurs absentes ou vides", () => {
    expect(isEmailNotConfirmedError(null)).toBe(false);
    expect(isEmailNotConfirmedError(undefined)).toBe(false);
    expect(isEmailNotConfirmedError({})).toBe(false);
    expect(isEmailNotConfirmedError({ message: "" })).toBe(false);
  });

  it("reconnaît les erreurs réseau", () => {
    expect(isNetworkLoginError({ message: "Network request failed" })).toBe(true);
    expect(isNetworkLoginError({ message: "NETWORK_ERROR" })).toBe(true);
    expect(isNetworkLoginError({ message: "Invalid login credentials" })).toBe(false);
    expect(isNetworkLoginError(null)).toBe(false);
  });
});
