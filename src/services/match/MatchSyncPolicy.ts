import { SubscriptionTier, SUBSCRIPTION_LIMITS, NOT_CONNECTED_LIMITS, SubscriptionLimits } from "../../../models/Subscription";
import { Match } from "../../models/types";

/**
 * Service pour gérer les règles de synchronisation des matchs
 * selon le tier d'abonnement de l'utilisateur
 */
export class MatchSyncPolicy {
  /**
   * Obtenir les limites selon le statut de connexion et le tier
   * @param isConnected Si l'utilisateur est connecté
   * @param tier Tier d'abonnement (si connecté)
   */
  getLimits(isConnected: boolean, tier?: SubscriptionTier): SubscriptionLimits {
    if (!isConnected) {
      return NOT_CONNECTED_LIMITS;
    }
    return SUBSCRIPTION_LIMITS[tier || 'free'];
  }

  /**
   * Vérifier si l'utilisateur peut créer un nouveau match
   * @param currentMatchCount Nombre de matchs actuels en local
   * @param isConnected Si l'utilisateur est connecté
   * @param tier Tier d'abonnement
   */
  canCreateMatch(
    currentMatchCount: number,
    isConnected: boolean,
    tier?: SubscriptionTier
  ): { allowed: boolean; reason?: string; maxMatches: number } {
    const limits = this.getLimits(isConnected, tier);
    const allowed = currentMatchCount < limits.maxLocalMatches;

    return {
      allowed,
      maxMatches: limits.maxLocalMatches,
      reason: allowed
        ? undefined
        : `Limite de ${limits.maxLocalMatches} matchs atteinte. ${
            !isConnected
              ? "Connectez-vous pour en stocker plus."
              : tier === "free"
              ? "Passez à un abonnement premium pour un stockage illimité."
              : ""
          }`,
    };
  }

  /**
   * Vérifier si un match peut être synchronisé vers le serveur
   * @param match Match à vérifier
   * @param isConnected Si l'utilisateur est connecté
   * @param tier Tier d'abonnement actuel
   */
  canSyncMatch(
    match: Match,
    isConnected: boolean,
    tier?: SubscriptionTier
  ): { allowed: boolean; reason?: string } {
    if (!isConnected) {
      return {
        allowed: false,
        reason: "Vous devez être connecté pour synchroniser vos matchs.",
      };
    }

    const limits = this.getLimits(isConnected, tier);

    // Vérifier si le tier actuel permet la synchronisation
    if (!limits.canSyncToServer) {
      return {
        allowed: false,
        reason: "Un abonnement premium est requis pour synchroniser vos matchs sur le cloud.",
      };
    }

    // Vérifier si le match a déjà été synchronisé
    if (match.synced_to_server) {
      return {
        allowed: false,
        reason: "Ce match a déjà été synchronisé.",
      };
    }

    // Pas de limite de temps : tous les matchs freemium peuvent être synchronisés
    // (limite de 3 matchs empêche l'abus naturellement)
    return { allowed: true };
  }

  /**
   * Obtenir les informations sur la capacité de stockage
   */
  getStorageInfo(
    currentMatchCount: number,
    isConnected: boolean,
    tier?: SubscriptionTier
  ): {
    current: number;
    max: number;
    percentage: number;
    isFull: boolean;
    canSync: boolean;
  } {
    const limits = this.getLimits(isConnected, tier);
    const max = limits.maxLocalMatches;
    const percentage = max === Infinity ? 0 : (currentMatchCount / max) * 100;

    return {
      current: currentMatchCount,
      max,
      percentage,
      isFull: currentMatchCount >= max,
      canSync: limits.canSyncToServer,
    };
  }
}
