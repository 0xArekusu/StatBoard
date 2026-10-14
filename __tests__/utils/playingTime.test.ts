import {
  computePlayingTimeByPlayer,
  playingTimeConfigFromMatch,
  withComputedPlayingTime,
  DEFAULT_OVERTIME_DURATION_SECONDS,
  DEFAULT_PERIOD_DURATION_SECONDS,
  DEFAULT_REGULATION_PERIODS,
  PlayingTimeAction,
  PlayingTimePlayer,
} from "../../src/utils/playingTime";

/** Joueur tel que le voit le hook / le service (num + isSubstitute). */
interface AppPlayer {
  num: number;
  team: "MyTeam" | "Opponent";
  isSubstitute: boolean;
  playingTimeSeconds?: number;
}

const toCanonical = (player: AppPlayer): PlayingTimePlayer => ({
  player_number: player.num,
  team: player.team,
  is_starter: !player.isSubstitute,
});

const shot = (
  team: string,
  player: number,
  period: number,
  timeInPeriod = 30,
  order = period
): PlayingTimeAction => ({
  action_type: "shot",
  specification: "2pt_made",
  team,
  player,
  period_number: period,
  time_in_period: timeInPeriod,
  action_order: order,
});

describe("playingTimeConfigFromMatch", () => {
  it("lit les durées du match, y compris personnalisées", () => {
    expect(
      playingTimeConfigFromMatch({
        period_duration: 480,
        total_periods: 2,
        overtime_duration: 180,
      })
    ).toEqual({
      periodDurationSeconds: 480,
      regulationPeriods: 2,
      overtimeDurationSeconds: 180,
    });
  });

  it("retombe sur les valeurs par défaut quand la donnée manque", () => {
    expect(playingTimeConfigFromMatch({})).toEqual({
      periodDurationSeconds: DEFAULT_PERIOD_DURATION_SECONDS,
      regulationPeriods: DEFAULT_REGULATION_PERIODS,
      overtimeDurationSeconds: DEFAULT_OVERTIME_DURATION_SECONDS,
    });
  });

  it("accepte un match absent", () => {
    expect(playingTimeConfigFromMatch(null).periodDurationSeconds).toBe(
      DEFAULT_PERIOD_DURATION_SECONDS
    );
    expect(playingTimeConfigFromMatch(undefined).regulationPeriods).toBe(
      DEFAULT_REGULATION_PERIODS
    );
  });
});

describe("computePlayingTimeByPlayer", () => {
  const match = { period_duration: 600, total_periods: 4 };

  it("renvoie une map vide quand il n'y a aucune action", () => {
    const players: PlayingTimePlayer[] = [
      { player_number: 7, team: "MyTeam", is_starter: true },
    ];
    expect(computePlayingTimeByPlayer(match, players, []).size).toBe(0);
  });

  it("crédite les deux équipes sur la même timeline", () => {
    const players: PlayingTimePlayer[] = [
      { player_number: 7, team: "MyTeam", is_starter: true },
      { player_number: 9, team: "Opponent", is_starter: true },
    ];
    const actions = [1, 2, 3, 4].map((period) => shot("MyTeam", 7, period));

    const result = computePlayingTimeByPlayer(match, players, actions);

    expect(result.get("MyTeam-7")).toBe(2400);
    expect(result.get("Opponent-9")).toBe(2400);
  });
});

describe("withComputedPlayingTime", () => {
  it("remplace le temps de jeu stocké par la valeur recalculée", () => {
    // Le cas qui a motivé le correctif : un joueur jamais remplacé affichait
    // 45:40 (2740 s) à cause du compteur, il doit tomber sur 40:00.
    const match = { period_duration: 600, total_periods: 4 };
    const players: AppPlayer[] = [
      { num: 7, team: "MyTeam", isSubstitute: false, playingTimeSeconds: 2740 },
    ];
    const actions = [1, 2, 3, 4].map((period) => shot("MyTeam", 7, period));

    const result = withComputedPlayingTime(match, players, actions, toCanonical);

    expect(result[0].playingTimeSeconds).toBe(2400);
  });

  it("conserve la valeur stockée quand il n'y a rien à rejouer", () => {
    const match = { period_duration: 600, total_periods: 4 };
    const players: AppPlayer[] = [
      { num: 7, team: "MyTeam", isSubstitute: false, playingTimeSeconds: 2740 },
    ];

    const result = withComputedPlayingTime(match, players, [], toCanonical);

    expect(result[0].playingTimeSeconds).toBe(2740);
  });

  it("ne mute pas la liste reçue et préserve les autres champs", () => {
    const match = { period_duration: 600, total_periods: 4 };
    const players: AppPlayer[] = [
      { num: 7, team: "MyTeam", isSubstitute: false, playingTimeSeconds: 999 },
    ];
    const actions = [1, 2, 3, 4].map((period) => shot("MyTeam", 7, period));

    const result = withComputedPlayingTime(match, players, actions, toCanonical);

    expect(result).not.toBe(players);
    expect(players[0].playingTimeSeconds).toBe(999);
    expect(result[0].num).toBe(7);
    expect(result[0].isSubstitute).toBe(false);
  });

  it("respecte une durée de période personnalisée (2 x 8 min)", () => {
    const match = { period_duration: 480, total_periods: 2 };
    const players: AppPlayer[] = [
      { num: 7, team: "MyTeam", isSubstitute: false, playingTimeSeconds: 0 },
    ];
    const actions = [1, 2].map((period) => shot("MyTeam", 7, period));

    const result = withComputedPlayingTime(match, players, actions, toCanonical);

    expect(result[0].playingTimeSeconds).toBe(960); // 2 x 8:00 = 16:00
  });

  it("respecte une durée de prolongation personnalisée (3 min)", () => {
    const match = {
      period_duration: 600,
      total_periods: 4,
      overtime_duration: 180,
    };
    const players: AppPlayer[] = [
      { num: 7, team: "MyTeam", isSubstitute: false, playingTimeSeconds: 0 },
    ];
    const actions = [1, 2, 3, 4, 5].map((period) => shot("MyTeam", 7, period));

    const result = withComputedPlayingTime(match, players, actions, toCanonical);

    expect(result[0].playingTimeSeconds).toBe(4 * 600 + 180); // 40:00 + 3:00
  });
});
