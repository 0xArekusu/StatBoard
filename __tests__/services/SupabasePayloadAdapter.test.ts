import { SupabasePayloadAdapter } from "../../src/services/api/adapters/SupabasePayloadAdapter";
import { ActionType, ShotSpecification } from "../../src/models/ActionTypes";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeMatchMeta = (overrides: any = {}) => ({
  team_a_name: "Lions",
  team_b_name: "Tigers",
  team_mode: "1v1" as any,
  match_format: "4_quarters" as const,
  period_duration: 600,
  started_at: "2024-01-01T10:00:00Z",
  ended_at: "2024-01-01T12:00:00Z",
  status: "completed",
  ...overrides,
});

const makeAction = (overrides: any = {}) => ({
  team: "A" as const,
  player_number: 10,
  action_type: ActionType.SHOT,
  specification: ShotSpecification.MADE,
  points: 2,
  semantic_x: 0.5,
  semantic_y: 0.3,
  period_number: 1,
  time_in_period: 120,
  timestamp: "2024-01-01T10:02:00Z",
  action_order: 1,
  ...overrides,
});

const makeMatchData = (actions: any[] = [], players: any[] = []) => ({
  match: makeMatchMeta(),
  actions,
  players,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SupabasePayloadAdapter", () => {
  let adapter: SupabasePayloadAdapter;

  beforeEach(() => {
    adapter = new SupabasePayloadAdapter();
  });

  // ─── adapt — structure générale ─────────────────────────────────────────────

  describe("adapt — champs du match", () => {
    it("mappe correctement les champs du match", () => {
      const result = adapter.adapt(makeMatchData());

      expect(result.match).toMatchObject({
        team_a_name: "Lions",
        team_b_name: "Tigers",
        match_format: "4_quarters",
        period_duration: 600,
        started_at: "2024-01-01T10:00:00Z",
        ended_at: "2024-01-01T12:00:00Z",
        status: "completed",
      });
    });

    it("started_at et ended_at sont null si absents", () => {
      const data = makeMatchData();
      data.match.started_at = undefined as any;
      data.match.ended_at = undefined as any;

      const result = adapter.adapt(data);

      expect(result.match.started_at).toBeNull();
      expect(result.match.ended_at).toBeNull();
    });

    it("transmet le tableau players tel quel", () => {
      const players = [{ num: 10, name: "John", team: "A" as const }];
      const result = adapter.adapt(makeMatchData([], players));

      expect(result.players).toEqual(players);
    });
  });

  // ─── adapt — mapping des actions ────────────────────────────────────────────

  describe("adapt — mapping des actions", () => {
    it("mappe chaque action avec tous ses champs", () => {
      const action = makeAction();
      const result = adapter.adapt(makeMatchData([action]));

      expect(result.actions[0]).toMatchObject({
        team: "A",
        player_number: 10,
        action_type: ActionType.SHOT,
        specification: ShotSpecification.MADE,
        points: 2,
        semantic_x: 0.5,
        semantic_y: 0.3,
        period_number: 1,
        time_in_period: 120,
        timestamp: "2024-01-01T10:02:00Z",
        action_order: 1,
      });
    });

    it("points devient null si falsy (0, null, undefined)", () => {
      const result = adapter.adapt(
        makeMatchData([makeAction({ points: 0 }), makeAction({ points: null })])
      );

      expect(result.actions[0].points).toBeNull();
      expect(result.actions[1].points).toBeNull();
    });

    it("retourne un tableau vide si aucune action", () => {
      const result = adapter.adapt(makeMatchData([]));
      expect(result.actions).toEqual([]);
    });
  });

  // ─── calculateScore — équipe A ──────────────────────────────────────────────

  describe("calculateScore — calcul des scores", () => {
    it("score = 0 quand aucune action", () => {
      const result = adapter.adapt(makeMatchData([]));
      expect(result.match.final_score_a).toBe(0);
      expect(result.match.final_score_b).toBe(0);
    });

    it("additionne les points des tirs réussis de l'équipe A", () => {
      const actions = [
        makeAction({ team: "A", points: 2, specification: ShotSpecification.MADE }),
        makeAction({ team: "A", points: 3, specification: ShotSpecification.MADE }),
      ];
      const result = adapter.adapt(makeMatchData(actions));
      expect(result.match.final_score_a).toBe(5);
    });

    it("additionne les points des tirs réussis de l'équipe B", () => {
      const actions = [
        makeAction({ team: "B", points: 2, specification: ShotSpecification.MADE }),
        makeAction({ team: "B", points: 2, specification: ShotSpecification.MADE }),
      ];
      const result = adapter.adapt(makeMatchData(actions));
      expect(result.match.final_score_b).toBe(4);
    });

    it("ignore les tirs ratés (MISSED)", () => {
      const actions = [
        makeAction({ team: "A", points: 3, specification: ShotSpecification.MISSED }),
        makeAction({ team: "A", points: 2, specification: ShotSpecification.MADE }),
      ];
      const result = adapter.adapt(makeMatchData(actions));
      expect(result.match.final_score_a).toBe(2);
    });

    it("ignore les actions qui ne sont pas des tirs", () => {
      const actions = [
        makeAction({ team: "A", action_type: ActionType.REBOUND, specification: ShotSpecification.MADE, points: 0 }),
        makeAction({ team: "A", action_type: ActionType.FOUL, specification: ShotSpecification.MADE, points: 0 }),
        makeAction({ team: "A", points: 2, specification: ShotSpecification.MADE }), // seul tir réel
      ];
      const result = adapter.adapt(makeMatchData(actions));
      expect(result.match.final_score_a).toBe(2);
    });

    it("calcule scores A et B indépendamment dans le même match", () => {
      const actions = [
        makeAction({ team: "A", points: 3 }),
        makeAction({ team: "B", points: 2 }),
        makeAction({ team: "A", points: 2 }),
        makeAction({ team: "B", points: 3 }),
      ];
      const result = adapter.adapt(makeMatchData(actions));
      expect(result.match.final_score_a).toBe(5);
      expect(result.match.final_score_b).toBe(5);
    });

    it("traite points=null comme 0 dans la somme", () => {
      const actions = [
        makeAction({ team: "A", points: null }),
        makeAction({ team: "A", points: 2 }),
      ];
      const result = adapter.adapt(makeMatchData(actions));
      expect(result.match.final_score_a).toBe(2);
    });
  });
});
