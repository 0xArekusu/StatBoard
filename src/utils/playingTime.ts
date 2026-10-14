/**
 * Playing time helpers shared by every place that displays or stores it.
 *
 * `calculatePlayingTime` (in ./statsCalculator) replays the substitution events
 * on the game clock. This module wraps it with the two things each call site
 * used to duplicate:
 *
 * - reading the match durations (period length, regulation period count,
 *   overtime length) with the same fallbacks everywhere
 * - re-injecting the result into the players, keeping the stored value when
 *   there is nothing to replay
 *
 * Keeping it in one place matters: the durations used to be read inline at each
 * call site, so a missing field silently fell back to 10:00 / 5:00 and the
 * callers could drift apart.
 */
import { calculatePlayingTime, PlayingTimeConfig } from "./statsCalculator";

/** Longueur par défaut d'une période, en secondes (FIBA 4x10). */
export const DEFAULT_PERIOD_DURATION_SECONDS = 600;

/** Nombre par défaut de périodes réglementaires. */
export const DEFAULT_REGULATION_PERIODS = 4;

/** Longueur par défaut d'une prolongation, en secondes (FIBA 5:00). */
export const DEFAULT_OVERTIME_DURATION_SECONDS = 300;

/** Partie d'un match dont dépend le calcul du temps de jeu. */
export interface PlayingTimeMatchLike {
  period_duration?: number | null;
  total_periods?: number | null;
  overtime_duration?: number | null;
}

/** Joueur réduit à ce dont le calcul a besoin. */
export interface PlayingTimePlayer {
  player_number: number;
  team: "MyTeam" | "Opponent";
  is_starter: boolean;
}

/** Action réduite à ce dont le calcul a besoin. */
export interface PlayingTimeAction {
  action_type?: string;
  type?: string;
  specification?: string;
  team: string;
  player?: number;
  player_number?: number;
  period_number: number;
  time_in_period: number;
  action_order?: number;
}

/**
 * Durées à utiliser pour un match, replis compris. Les valeurs par défaut
 * vivent ici et nulle part ailleurs : un seul endroit à changer.
 */
export function playingTimeConfigFromMatch(
  match: PlayingTimeMatchLike | null | undefined
): Required<PlayingTimeConfig> {
  return {
    periodDurationSeconds:
      match?.period_duration || DEFAULT_PERIOD_DURATION_SECONDS,
    regulationPeriods: match?.total_periods || DEFAULT_REGULATION_PERIODS,
    overtimeDurationSeconds:
      match?.overtime_duration || DEFAULT_OVERTIME_DURATION_SECONDS,
  };
}

/**
 * Temps de jeu par joueur, sous la forme "team-playerNumber" -> secondes.
 *
 * Renvoie une Map vide lorsqu'il n'y a rien à rejouer (aucune action), ce qui
 * permet aux appelants de conserver la valeur qu'ils détiennent déjà.
 */
export function computePlayingTimeByPlayer(
  match: PlayingTimeMatchLike | null | undefined,
  players: PlayingTimePlayer[],
  actions: PlayingTimeAction[]
): Map<string, number> {
  if (players.length === 0 || actions.length === 0) {
    return new Map();
  }

  return calculatePlayingTime(
    actions.map((action) => ({
      action_type: action.action_type,
      type: action.type,
      specification: action.specification ?? "",
      team: action.team,
      player: action.player,
      player_number: action.player_number,
      period_number: action.period_number,
      time_in_period: action.time_in_period,
      action_order: action.action_order,
    })),
    players,
    playingTimeConfigFromMatch(match)
  );
}

/**
 * Renvoie les joueurs avec leur `playingTimeSeconds` recalculé.
 *
 * La liste d'origine est renvoyée telle quelle quand le calcul n'est pas
 * possible, pour ne pas écraser une valeur stockée par zéro.
 *
 * @param toCanonical projette un joueur de l'appelant vers {@link PlayingTimePlayer}
 */
export function withComputedPlayingTime<
  TPlayer extends { playingTimeSeconds?: number }
>(
  match: PlayingTimeMatchLike | null | undefined,
  players: TPlayer[],
  actions: PlayingTimeAction[],
  toCanonical: (player: TPlayer) => PlayingTimePlayer
): TPlayer[] {
  const computed = computePlayingTimeByPlayer(
    match,
    players.map(toCanonical),
    actions
  );

  if (computed.size === 0) {
    return players;
  }

  return players.map((player) => {
    const canonical = toCanonical(player);
    return {
      ...player,
      playingTimeSeconds:
        computed.get(`${canonical.team}-${canonical.player_number}`) ??
        player.playingTimeSeconds,
    };
  });
}
