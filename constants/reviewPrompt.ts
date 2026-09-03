/**
 * Configuration du popup de demande d'avis (rating prompt)
 */
import { ROUTES } from "./routes";

/** Clé app_config (Supabase) pilotant le seuil à distance, sans redéploiement */
export const REVIEW_PROMPT_THRESHOLD_CONFIG_KEY = "review_prompt_score_threshold";

/** Nombre de signaux positifs (fin de match, export PDF...) avant d'afficher le popup — valeur de repli si app_config est injoignable */
export const REVIEW_PROMPT_SCORE_THRESHOLD_DEFAULT = 3;

export const REVIEW_PROMPT_SUPPORT_EMAIL = "contact.coachassistant@gmail.com";

/**
 * Écrans sur lesquels le popup peut s'afficher.
 * Volontairement restreint : jamais en plein match (LiveMatch), en cours de
 * configuration (NewMatch, TeamRoster...) ou sur les écrans d'auth.
 */
export const REVIEW_PROMPT_SAFE_SCREENS: string[] = [
  "Dashboard",
  "History",
  ROUTES.STATS,
  ROUTES.MATCH_DETAILS,
  ROUTES.PLAYER_PROFILE,
];
