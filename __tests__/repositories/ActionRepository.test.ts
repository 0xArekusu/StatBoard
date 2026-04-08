import { ActionRepository } from "../../src/services/database/ActionRepository";
import { ActionType, ShotSpecification } from "../../src/models/ActionTypes";

// ─── DatabaseService mock ─────────────────────────────────────────────────────

const mockQuery = jest.fn();
const mockExecute = jest.fn();
const mockTransaction = jest.fn();

jest.mock("../../src/services/database/DatabaseService", () => ({
  DatabaseService: {
    getInstance: jest.fn(() => ({
      query: (...args: any[]) => mockQuery(...args),
      execute: (...args: any[]) => mockExecute(...args),
      transaction: (...args: any[]) => mockTransaction(...args),
    })),
  },
}));

jest.mock("../../src/utils/uuid", () => ({
  generateUUID: jest
    .fn()
    .mockReturnValueOnce("uuid-1")
    .mockReturnValueOnce("uuid-2")
    .mockReturnValue("uuid-n"),
}));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeActionData = (overrides: any = {}) => ({
  match_id: "match-1",
  team: "A" as const,
  player_number: 10,
  action_type: ActionType.SHOT,
  specification: ShotSpecification.MADE,
  points: 2,
  semantic_x: 0.5,
  semantic_y: 0.3,
  action_order: 1,
  period_number: 1,
  time_in_period: 120,
  ...overrides,
});

const makeDbAction = (overrides: any = {}) => ({
  id: "uuid-1",
  match_id: "match-1",
  team: "A",
  player_number: 10,
  action_type: ActionType.SHOT,
  specification: ShotSpecification.MADE,
  points: 2,
  semantic_x: 0.5,
  semantic_y: 0.3,
  action_order: 1,
  period_number: 1,
  time_in_period: 120,
  timestamp: "2024-01-01T10:02:00Z",
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ActionRepository", () => {
  let repo: ActionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset UUID mock sequence
    const { generateUUID } = require("../../src/utils/uuid");
    generateUUID.mockReset();
    generateUUID
      .mockReturnValueOnce("uuid-1")
      .mockReturnValueOnce("uuid-2")
      .mockReturnValue("uuid-n");

    repo = new ActionRepository();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe("create", () => {
    it("insère l'action et retourne la ligne créée", async () => {
      const dbAction = makeDbAction();
      mockExecute.mockResolvedValue(undefined);
      mockQuery.mockResolvedValue([dbAction]);

      const result = await repo.create(makeActionData());

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = ?"),
        ["uuid-1"]
      );
      expect(result).toEqual(dbAction);
    });

    it("lance une erreur si l'action n'est pas retrouvée après insertion", async () => {
      mockExecute.mockResolvedValue(undefined);
      mockQuery.mockResolvedValue([]);

      await expect(repo.create(makeActionData())).rejects.toThrow(
        "Failed to create action"
      );
    });

    it("propage l'erreur si execute échoue", async () => {
      mockExecute.mockRejectedValue(new Error("SQLite error"));

      await expect(repo.create(makeActionData())).rejects.toThrow("SQLite error");
    });

    it("stocke null pour points si points est falsy", async () => {
      const dbAction = makeDbAction({ points: null });
      mockExecute.mockResolvedValue(undefined);
      mockQuery.mockResolvedValue([dbAction]);

      await repo.create(makeActionData({ points: 0 }));

      const executedParams = mockExecute.mock.calls[0][1];
      expect(executedParams[6]).toBeNull(); // points is 7th param (index 6)
    });
  });

  // ─── createBatch ──────────────────────────────────────────────────────────

  describe("createBatch", () => {
    it("retourne un tableau vide si aucune action", async () => {
      const result = await repo.createBatch([]);
      expect(result).toEqual([]);
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("exécute une transaction et retourne les actions créées", async () => {
      const actions = [makeActionData(), makeActionData({ action_order: 2 })];
      const dbActions = [makeDbAction(), makeDbAction({ id: "uuid-2", action_order: 2 })];

      mockTransaction.mockImplementation(async (fn: any) => {
        const fakeAdapter = { execute: jest.fn().mockResolvedValue(undefined) };
        await fn(fakeAdapter);
      });
      mockQuery.mockResolvedValue(dbActions);

      const result = await repo.createBatch(actions);

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual(dbActions);
    });

    it("propage l'erreur si la transaction échoue", async () => {
      mockTransaction.mockRejectedValue(new Error("Transaction failed"));

      await expect(repo.createBatch([makeActionData()])).rejects.toThrow(
        "Transaction failed"
      );
    });
  });

  // ─── getActionsForMatch ───────────────────────────────────────────────────

  describe("getActionsForMatch", () => {
    it("lit depuis match_actions si le match n'est pas terminé", async () => {
      const dbActions = [makeDbAction()];
      mockQuery
        .mockResolvedValueOnce([{ status: "in_progress", player_stats: null, players: null }])
        .mockResolvedValueOnce(dbActions);

      const result = await repo.getActionsForMatch("match-1");

      expect(result).toEqual(dbActions);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("lit depuis player_stats si le match est terminé et a des stats compactées", async () => {
      const playerStats = {
        "player-1": {
          actions: [
            {
              team: "A",
              action_type: ActionType.SHOT,
              specification: ShotSpecification.MADE,
              points: 2,
              semantic_x: 0.5,
              semantic_y: 0.3,
              action_order: 1,
              period_number: 1,
              time_in_period: 120,
              timestamp: "2024-01-01T10:02:00Z",
            },
          ],
        },
      };
      const players = [
        {
          player_id: "player-1",
          player_number: 10,
          team: "A",
        },
      ];

      mockQuery.mockResolvedValueOnce([
        {
          status: "completed",
          player_stats: JSON.stringify(playerStats),
          players: JSON.stringify(players),
        },
      ]);

      const result = await repo.getActionsForMatch("match-1");

      expect(result).toHaveLength(1);
      expect(result[0].player_number).toBe(10);
      expect(result[0].action_type).toBe(ActionType.SHOT);
      // Only one query (match status check), NOT a second query to match_actions
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("retombe sur match_actions si player_stats est vide '{}'", async () => {
      mockQuery
        .mockResolvedValueOnce([
          { status: "completed", player_stats: "{}", players: null },
        ])
        .mockResolvedValueOnce([]);

      const result = await repo.getActionsForMatch("match-1");

      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("propage l'erreur si la requête échoue", async () => {
      mockQuery.mockRejectedValue(new Error("DB error"));

      await expect(repo.getActionsForMatch("match-1")).rejects.toThrow("DB error");
    });
  });

  // ─── deleteAction ─────────────────────────────────────────────────────────

  describe("deleteAction", () => {
    it("supprime l'action si elle existe", async () => {
      mockQuery.mockResolvedValue([makeDbAction()]);
      mockExecute.mockResolvedValue(undefined);

      await repo.deleteAction("uuid-1");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM match_actions WHERE id = ?"),
        ["uuid-1"]
      );
    });

    it("lance une erreur si l'action n'existe pas", async () => {
      mockQuery.mockResolvedValue([]);

      await expect(repo.deleteAction("unknown-id")).rejects.toThrow(
        "Action with id unknown-id not found"
      );
    });
  });

  // ─── deleteActionsForMatch ────────────────────────────────────────────────

  describe("deleteActionsForMatch", () => {
    it("exécute DELETE pour le match donné", async () => {
      mockExecute.mockResolvedValue(undefined);

      await repo.deleteActionsForMatch("match-1");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM match_actions WHERE match_id = ?"),
        ["match-1"]
      );
    });
  });

  // ─── getActionCount ───────────────────────────────────────────────────────

  describe("getActionCount", () => {
    it("retourne le count depuis la DB", async () => {
      mockQuery.mockResolvedValue([{ count: 5 }]);

      const count = await repo.getActionCount("match-1");

      expect(count).toBe(5);
    });

    it("retourne 0 si la requête échoue", async () => {
      mockQuery.mockRejectedValue(new Error("DB error"));

      const count = await repo.getActionCount("match-1");

      expect(count).toBe(0);
    });
  });

  // ─── getLastActionOrder ───────────────────────────────────────────────────

  describe("getLastActionOrder", () => {
    it("retourne le max_order depuis la DB", async () => {
      mockQuery.mockResolvedValue([{ max_order: 12 }]);

      const order = await repo.getLastActionOrder("match-1");

      expect(order).toBe(12);
    });

    it("retourne 0 si la requête échoue", async () => {
      mockQuery.mockRejectedValue(new Error("DB error"));

      const order = await repo.getLastActionOrder("match-1");

      expect(order).toBe(0);
    });
  });

  // ─── compactMatchActions ──────────────────────────────────────────────────

  describe("compactMatchActions", () => {
    it("ne fait rien si aucune action", async () => {
      // getActionsForMatch → match status check → no actions
      mockQuery
        .mockResolvedValueOnce([{ status: "in_progress", player_stats: null, players: null }])
        .mockResolvedValueOnce([]); // match_actions empty

      await repo.compactMatchActions("match-1");

      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("écrit player_stats et supprime les actions après compaction", async () => {
      const players = [{ player_id: "p1", player_number: 7, team: "A" }];
      const actions = [makeDbAction({ player_number: 7, team: "A" })];

      // 1. getActionsForMatch: match status query
      mockQuery.mockResolvedValueOnce([
        { status: "in_progress", player_stats: null, players: null },
      ]);
      // 2. getActionsForMatch: match_actions table
      mockQuery.mockResolvedValueOnce(actions);
      // 3. players query
      mockQuery.mockResolvedValueOnce([{ players: JSON.stringify(players) }]);

      mockExecute.mockResolvedValue(undefined);

      await repo.compactMatchActions("match-1");

      // UPDATE matches SET player_stats
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE matches SET player_stats"),
        expect.arrayContaining(["match-1"])
      );
      // DELETE match_actions
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM match_actions WHERE match_id = ?"),
        ["match-1"]
      );
    });

    it("lance une erreur si le match est introuvable", async () => {
      const actions = [makeDbAction()];
      mockQuery
        .mockResolvedValueOnce([{ status: "in_progress", player_stats: null, players: null }])
        .mockResolvedValueOnce(actions)
        .mockResolvedValueOnce([]); // players query returns no match

      await expect(repo.compactMatchActions("match-1")).rejects.toThrow(
        "Match not found"
      );
    });
  });
});
