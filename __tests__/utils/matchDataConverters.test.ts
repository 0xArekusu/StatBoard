import {
  calculateScoresFromActions,
  convertActionToMatchEvent,
  convertActionsToMatchEvents,
} from "../../utils/matchDataConverters";
import { ActionType, ShotSpecification } from "../../src/models/ActionTypes";
import { Team } from "../../src/models/types";
import { TeamId } from "../../constants/liveMatchConstants";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeShotAction = (overrides: object) => ({
  id: "action-1",
  player_number: 10,
  team: Team.MY_TEAM,
  action_type: ActionType.SHOT,
  specification: ShotSpecification.MADE,
  points: 2,
  semantic_x: 0.5,
  semantic_y: 0.5,
  timestamp: "2024-01-01T10:00:00.000Z",
  period_number: 1,
  time_in_period: 120,
  ...overrides,
});

const players = [
  { player_id: "p1", player_number: 10, player_name: "Dupont", team: "MyTeam" as const },
  { player_id: "p2", player_number: 7, player_name: "Martin", team: "MyTeam" as const },
  { player_id: "p3", player_number: 5, player_name: "Bernard", team: "Opponent" as const },
];

// ─── calculateScoresFromActions ───────────────────────────────────────────────

describe("calculateScoresFromActions", () => {
  it("retourne 0-0 pour un tableau vide", () => {
    expect(calculateScoresFromActions([])).toEqual({ scoreHome: 0, scoreAway: 0 });
  });

  it("ne compte pas les tirs ratés", () => {
    const actions = [makeShotAction({ specification: ShotSpecification.MISSED, points: 2 })];
    expect(calculateScoresFromActions(actions)).toEqual({ scoreHome: 0, scoreAway: 0 });
  });

  it("ne compte pas les actions sans points", () => {
    const actions = [makeShotAction({ points: 0, specification: ShotSpecification.MADE })];
    expect(calculateScoresFromActions(actions)).toEqual({ scoreHome: 0, scoreAway: 0 });
  });

  describe("à domicile (isHome = true, par défaut)", () => {
    it("additionne les points de MyTeam dans scoreHome", () => {
      const actions = [
        makeShotAction({ points: 3, team: Team.MY_TEAM }),
        makeShotAction({ id: "a2", points: 2, team: Team.MY_TEAM }),
      ];
      expect(calculateScoresFromActions(actions, true)).toEqual({ scoreHome: 5, scoreAway: 0 });
    });

    it("additionne les points de l'adversaire dans scoreAway", () => {
      const actions = [makeShotAction({ team: Team.OPPONENT, points: 2 })];
      expect(calculateScoresFromActions(actions, true)).toEqual({ scoreHome: 0, scoreAway: 2 });
    });

    it("calcule un score combiné correctement", () => {
      const actions = [
        makeShotAction({ id: "a1", points: 3, team: Team.MY_TEAM }),
        makeShotAction({ id: "a2", points: 2, team: Team.OPPONENT }),
        makeShotAction({ id: "a3", points: 1, team: Team.MY_TEAM }),
      ];
      expect(calculateScoresFromActions(actions, true)).toEqual({ scoreHome: 4, scoreAway: 2 });
    });
  });

  describe("à l'extérieur (isHome = false)", () => {
    it("additionne les points de MyTeam dans scoreAway", () => {
      const actions = [makeShotAction({ points: 3, team: Team.MY_TEAM })];
      expect(calculateScoresFromActions(actions, false)).toEqual({ scoreHome: 0, scoreAway: 3 });
    });

    it("additionne les points de l'adversaire dans scoreHome", () => {
      const actions = [makeShotAction({ team: Team.OPPONENT, points: 2 })];
      expect(calculateScoresFromActions(actions, false)).toEqual({ scoreHome: 2, scoreAway: 0 });
    });
  });

  it("utilise isHome = true par défaut", () => {
    const actions = [makeShotAction({ points: 2, team: Team.MY_TEAM })];
    expect(calculateScoresFromActions(actions)).toEqual({ scoreHome: 2, scoreAway: 0 });
  });
});

// ─── convertActionToMatchEvent ────────────────────────────────────────────────

describe("convertActionToMatchEvent", () => {
  it("trouve le nom du joueur via player_number + team", () => {
    const action = makeShotAction({ player_number: 10, team: Team.MY_TEAM });
    const event = convertActionToMatchEvent(action, players);
    expect(event.description).toContain("Dupont");
  });

  it("utilise un fallback '#numéro' si le joueur n'est pas trouvé", () => {
    const action = makeShotAction({ player_number: 99, team: Team.MY_TEAM });
    const event = convertActionToMatchEvent(action, players);
    expect(event.description).toContain("#99");
  });

  it("utilise opponentName pour le joueur générique 9999", () => {
    const action = makeShotAction({ player_number: 9999, team: Team.OPPONENT });
    const event = convertActionToMatchEvent(action, players, "Lyon Basket");
    expect(event.description).toContain("Lyon Basket");
  });

  it("mappe MyTeam → HOME quand isHome = true", () => {
    const action = makeShotAction({ team: Team.MY_TEAM });
    const event = convertActionToMatchEvent(action, players, "Adversaire", true);
    expect(event.teamId).toBe(TeamId.HOME);
  });

  it("mappe MyTeam → AWAY quand isHome = false", () => {
    const action = makeShotAction({ team: Team.MY_TEAM });
    const event = convertActionToMatchEvent(action, players, "Adversaire", false);
    expect(event.teamId).toBe(TeamId.AWAY);
  });

  it("mappe Opponent → AWAY quand isHome = true", () => {
    const action = makeShotAction({ team: Team.OPPONENT });
    const event = convertActionToMatchEvent(action, players, "Adversaire", true);
    expect(event.teamId).toBe(TeamId.AWAY);
  });

  it("inclut les coordonnées si semantic_x et semantic_y sont valides", () => {
    const action = makeShotAction({ semantic_x: 0.3, semantic_y: 0.7 });
    const event = convertActionToMatchEvent(action, players);
    expect(event.coordinates).toEqual({ x: 0.3, y: 0.7 });
  });

  it("exclut les coordonnées si semantic_x est null", () => {
    const action = makeShotAction({ semantic_x: null, semantic_y: 0.5 });
    const event = convertActionToMatchEvent(action, players);
    expect(event.coordinates).toBeUndefined();
  });

  it("exclut les coordonnées si semantic_x est négatif", () => {
    const action = makeShotAction({ semantic_x: -1, semantic_y: 0.5 });
    const event = convertActionToMatchEvent(action, players);
    expect(event.coordinates).toBeUndefined();
  });

  it("parse le timestamp ISO correctement", () => {
    const action = makeShotAction({ timestamp: "2024-06-15T12:00:00.000Z" });
    const event = convertActionToMatchEvent(action, players);
    expect(event.timestamp).toBe(new Date("2024-06-15T12:00:00.000Z").getTime());
  });

  it("utilise Date.now() si le timestamp est invalide", () => {
    const before = Date.now();
    const action = makeShotAction({ timestamp: "invalid-date" });
    const event = convertActionToMatchEvent(action, players);
    const after = Date.now();
    expect(event.timestamp).toBeGreaterThanOrEqual(before);
    expect(event.timestamp).toBeLessThanOrEqual(after);
  });

  it("n'inclut pas playerNumber pour le joueur générique 9999", () => {
    const action = makeShotAction({ player_number: 9999, team: Team.OPPONENT });
    const event = convertActionToMatchEvent(action, players);
    expect(event.playerNumber).toBeUndefined();
  });

  it("inclut playerNumber pour un joueur normal", () => {
    const action = makeShotAction({ player_number: 10 });
    const event = convertActionToMatchEvent(action, players);
    expect(event.playerNumber).toBe(10);
  });
});

// ─── convertActionsToMatchEvents ─────────────────────────────────────────────

describe("convertActionsToMatchEvents", () => {
  it("retourne un tableau vide pour une entrée vide", () => {
    expect(convertActionsToMatchEvents([], players)).toEqual([]);
  });

  it("convertit chaque action en MatchEvent", () => {
    const actions = [
      makeShotAction({ id: "a1", player_number: 10 }),
      makeShotAction({ id: "a2", player_number: 7 }),
    ];
    const events = convertActionsToMatchEvents(actions, players);
    expect(events).toHaveLength(2);
    expect(events[0].id).toBe("a1");
    expect(events[1].id).toBe("a2");
  });
});
