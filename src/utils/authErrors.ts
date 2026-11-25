/**
 * Classification des erreurs d'authentification Supabase.
 *
 * `login_failed` est l'événement le plus fréquent de l'app côté connexion :
 * sur 204 personnes identifiées, 81 en ont déclenché un. Les causes mesurées en
 * novembre 2026 étaient, par nombre de personnes :
 *
 *   39  « Invalid login credentials »  (mot de passe erroné, comportement normal)
 *   30  « Email not confirmed »        (compte valide mais email jamais confirmé)
 *   14  Apple  « authorization attempt failed for an unknown reason »
 *   12  Google « Unknown error in google sign in »
 *    7  réseau
 *
 * Le cas « Email not confirmed » était le plus coûteux : le coach avait un compte
 * valide, voyait un simple message d'erreur, et n'avait aucun moyen de renvoyer
 * l'email de confirmation depuis l'écran de connexion. D'où ce prédicat, partagé
 * entre l'affichage et les tests.
 */

export type AuthLikeError = {
  message?: string | null;
  code?: string | null;
  status?: number | null;
} | null | undefined;

/**
 * Vrai si Supabase refuse la connexion parce que l'adresse email n'a jamais été
 * confirmée. On s'appuie d'abord sur `code`, stable, et seulement en repli sur le
 * message historique (« Email not confirmed »), qui peut varier.
 */
export function isEmailNotConfirmedError(error: AuthLikeError): boolean {
  if (!error) return false;
  if (error.code === "email_not_confirmed") return true;
  const message = error.message ?? "";
  return message.toLowerCase().includes("email not confirmed");
}

/** Vrai si l'échec vient du réseau plutôt que d'identifiants invalides. */
export function isNetworkLoginError(error: AuthLikeError): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("network request failed") ||
    message.includes("network_error") ||
    message.includes("network error") ||
    message.includes("timeout")
  );
}
