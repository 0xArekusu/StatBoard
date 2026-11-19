import { computeLiveMatchScore } from "../../src/utils/liveMatchScore";

/**
 * Bandeau de score du modal de filtres du match live.
 *
 * Bug d'origine : la somme portait sur `action.points` sans regarder
 * `specification`, or un tir manqué est enregistré avec `points: 2` (ou 1 / 3).
 * Le score affiché additionnait donc les points de tous les tirs tentés.
 */
describe("computeLiveMatchScore", () => {
  const shot = (
    teamId: "HOME" | "AWAY",
    points: number,
    specification: "made" | "missed",
    period = 1,
  ) => ({
    action_type: "shot",
    specification,
    points,
    teamId,
    period_number: period,
  });

  it("ne compte que les tirs réussis", () => {
    const actions = [
      shot("HOME", 2, "made"),
      shot("HOME", 2, "missed"),
      shot("HOME", 3, "missed"),
      shot("AWAY", 3, "made"),
      shot("AWAY", 1, "missed"),
    ];
    expect(computeLiveMatchScore(actions, [], true)).toEqual({
      myScore: 2,
      theirScore: 3,
    });
  });

  it("attribue HOME à mon équipe quand elle joue à domicile", () => {
    const actions = [shot("HOME", 2, "made"), shot("AWAY", 3, "made")];
    expect(computeLiveMatchScore(actions, [], true)).toEqual({
      myScore: 2,
      theirScore: 3,
    });
    expect(computeLiveMatchScore(actions, [], false)).toEqual({
      myScore: 3,
      theirScore: 2,
    });
  });

  it("filtre sur les périodes sélectionnées", () => {
    const actions = [
      shot("HOME", 2, "made", 1),
      shot("HOME", 3, "made", 2),
      shot("AWAY", 2, "made", 3),
    ];
    expect(computeLiveMatchScore(actions, [1], true)).toEqual({
      myScore: 2,
      theirScore: 0,
    });
    expect(computeLiveMatchScore(actions, [2, 3], true)).toEqual({
      myScore: 3,
      theirScore: 2,
    });
    // Aucune période sélectionnée = tout le match
    expect(computeLiveMatchScore(actions, [], true)).toEqual({
      myScore: 5,
      theirScore: 2,
    });
  });

  it("gère les actions relues depuis la base (champ team)", () => {
    const actions = [
      { action_type: "shot", specification: "made", points: 2, team: "MyTeam", period_number: 1 },
      { action_type: "shot", specification: "missed", points: 3, team: "MyTeam", period_number: 1 },
      { action_type: "shot", specification: "made", points: 3, team: "Opponent", period_number: 1 },
    ];
    expect(computeLiveMatchScore(actions, [], true)).toEqual({
      myScore: 2,
      theirScore: 3,
    });
  });

  it("ignore les actions non-tir et les entrées vides", () => {
    const actions = [
      { action_type: "rebound", specification: "offensive", points: 0, teamId: "HOME", period_number: 1 },
      { action_type: "foul", specification: "personal", teamId: "AWAY", period_number: 1 },
    ] as any;
    expect(computeLiveMatchScore(actions, [], true)).toEqual({
      myScore: 0,
      theirScore: 0,
    });
    expect(computeLiveMatchScore(null, [], true)).toEqual({
      myScore: 0,
      theirScore: 0,
    });
  });
});
