/**
 * Classification et traduction des erreurs d'authentification.
 *
 * Contexte mesuré (PostHog, projet 225835, novembre 2026) : `login_failed` est
 * l'événement le plus fréquent de l'app côté connexion, 81 personnes sur 204
 * identifiées. Les causes, par nombre de personnes :
 *
 *   39  « Invalid login credentials »  (mot de passe erroné, comportement normal)
 *   30  « Email not confirmed »        (compte valide, email jamais confirmé)
 *   14  Apple  « authorization attempt failed for an unknown reason »
 *   12  Google « Unknown error in google sign in »
 *    7  réseau
 *
 * Deux défauts en découlaient :
 *
 * 1. les échecs Apple et Google étaient affichés avec le message natif brut, en
 *    anglais, dans une app entièrement francophone ;
 * 2. le cas « email non confirmé » n'offrait aucun moyen de renvoyer le lien.
 *
 * Ce module centralise la traduction pour que les écrans n'aient plus jamais à
 * afficher `error.message` tel quel.
 */

export type AuthLikeError = {
  message?: string | null;
  code?: string | null;
  status?: number | null;
} | null | undefined;

export type AuthErrorProvider = "google" | "apple";

type Translate = (key: string) => string;

const message = (error: AuthLikeError): string =>
  (error?.message ?? "").toLowerCase();

/** Vrai si Supabase refuse la connexion parce que l'email n'a jamais été confirmé. */
export function isEmailNotConfirmedError(error: AuthLikeError): boolean {
  if (!error) return false;
  if (error.code === "email_not_confirmed") return true;
  return message(error).includes("email not confirmed");
}

/** Vrai si l'échec vient du réseau plutôt que d'identifiants invalides. */
export function isNetworkLoginError(error: AuthLikeError): boolean {
  const msg = message(error);
  return (
    msg.includes("network request failed") ||
    msg.includes("network_error") ||
    msg.includes("network error") ||
    msg.includes("timeout") ||
    msg.includes("unable to resolve host")
  );
}

/**
 * Vrai si l'utilisateur a simplement fermé la fenêtre du fournisseur.
 * Apple renvoie déjà `{ error: null }` sur `ERR_REQUEST_CANCELED`, mais Google
 * remonte `12501` / `SIGN_IN_CANCELLED` jusqu'à l'écran.
 */
export function isCancelledAuthError(error: AuthLikeError): boolean {
  const msg = message(error);
  const code = (error?.code ?? "").toLowerCase();
  return (
    code === "err_request_canceled" ||
    code === "12501" ||
    msg.includes("err_request_canceled") ||
    msg.includes("sign_in_cancelled") ||
    msg.includes("canceled") ||
    msg.includes("cancelled") ||
    msg.includes("user_cancelled")
  );
}

/** Vrai si l'échec vient du fournisseur externe (Apple / Google) et non du compte. */
export function isSocialProviderError(error: AuthLikeError): boolean {
  const msg = message(error);
  const code = (error?.code ?? "").toLowerCase();
  return (
    msg.includes("unknown error in google sign in") ||
    msg.includes("authorization attempt failed") ||
    msg.includes("no id token present") ||
    msg.includes("developer_error") ||
    msg.includes("play services not available") ||
    msg.includes("google_signin") ||
    code.startsWith("err_request_") ||
    code === "8" ||
    code === "10" ||
    code === "12500"
  );
}

/**
 * Traduit une erreur d'authentification en message affichable.
 *
 * Le message natif n'est jamais retourné tel quel : au pire on affiche un
 * message générique traduit, jamais une phrase en anglais venue du SDK.
 */
export function getAuthErrorMessage(
  error: AuthLikeError,
  t: Translate,
  provider?: AuthErrorProvider,
): string {
  if (!error) return t("authErrors.generic");

  if (isCancelledAuthError(error)) return t("authErrors.cancelled");
  if (isEmailNotConfirmedError(error)) return t("authErrors.emailNotConfirmed");
  if (isNetworkLoginError(error)) return t("authErrors.network");

  const msg = message(error);

  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return t("authErrors.invalidCredentials");
  }
  if (msg.includes("user not found")) return t("authErrors.userNotFound");
  if (msg.includes("already registered") || msg.includes("user already exists")) {
    return t("authErrors.userExists");
  }
  if (
    msg.includes("password should be") ||
    msg.includes("weak password") ||
    msg.includes("password is too")
  ) {
    return t("authErrors.weakPassword");
  }
  if (msg.includes("security purposes") || msg.includes("rate limit")) {
    return t("authErrors.tooManyAttempts");
  }
  if (msg.includes("invalid email")) return t("authErrors.invalidEmail");
  if (msg.includes("no id token present")) {
    return provider === "google"
      ? t("authErrors.googleUnavailable")
      : t("authErrors.appleUnavailable");
  }
  if (isSocialProviderError(error)) {
    return provider === "google"
      ? t("authErrors.googleUnavailable")
      : t("authErrors.appleUnavailable");
  }

  return t("authErrors.generic");
}
