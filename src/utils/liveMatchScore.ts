/**
 * Score affiché dans le bandeau du modal de filtres du match live.
 *
 * Le filtre par période doit refléter ce qui s'est réellement passé sur les
 * périodes sélectionnées. Deux pièges, tous les deux rencontrés en production :
 *
 * 1. Un tir manqué porte lui aussi un champ `points` (1, 2 ou 3, la valeur du
 *    tir). Sommer `points` sans regarder `specification` revient à compter les
 *    échecs comme des paniers : le score affiché était gonflé de tous les tirs
 *    tentés et ratés.
 * 2. Les pans ne sont pas toujours tagués avec le même champ selon la source :
 *    `teamId` ("HOME" | "AWAY") pour les events du match en cours, `team`
 *    ("MyTeam" | "Opponent") pour les actions relues depuis la base.
 */

export type LiveMatchScoreAction = {
  action_type?: string;
  specification?: string;
  points?: number;
  teamId?: string;
  team?: string;
  period_number?: number;
};

export type LiveMatchScore = {
  myScore: number;
  theirScore: number;
};

const isMadeShot = (specification?: string): boolean =>
  (specification ?? "").toLowerCase() === "made";

/** L'action appartient-elle à mon équipe ? */
const isMyTeamAction = (
  action: LiveMatchScoreAction,
  isHome: boolean,
): boolean | null => {
  if (action.teamId) {
    // Events du match en cours : HOME / AWAY selon le lieu du match.
    return isHome ? action.teamId === "HOME" : action.teamId === "AWAY";
  }
  if (action.team) {
    // Actions relues depuis la base.
    return action.team === "MyTeam";
  }
  // Équipe inconnue : on ne compte pas plutôt que de créditer la mauvaise.
  return null;
};

/**
 * @param actions  actions du match
 * @param periods  périodes sélectionnées ; vide = toutes les périodes
 * @param isHome   mon équipe joue-t-elle à domicile ?
 */
export function computeLiveMatchScore(
  actions: LiveMatchScoreAction[] | null | undefined,
  periods: number[] | null | undefined,
  isHome: boolean,
): LiveMatchScore {
  const selected = periods && periods.length > 0 ? periods : null;
  let myScore = 0;
  let theirScore = 0;

  for (const action of actions ?? []) {
    if ((action.action_type ?? "").toLowerCase() !== "shot") continue;
    if (!isMadeShot(action.specification)) continue;

    const points = Number(action.points) || 0;
    if (points <= 0) continue;

    if (selected !== null && !selected.includes(action.period_number as number)) {
      continue;
    }

    const mine = isMyTeamAction(action, isHome);
    if (mine === true) myScore += points;
    else if (mine === false) theirScore += points;
  }

  return { myScore, theirScore };
}
