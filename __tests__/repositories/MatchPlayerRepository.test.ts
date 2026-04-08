import { MatchPlayerRepository } from "../../src/services/database/MatchPlayerRepository";

// ─── DatabaseService mock ─────────────────────────────────────────────────────

const mockQuery = jest.fn();
const mockExecute = jest.fn();

jest.mock("../../src/services/database/DatabaseService", () => ({
  DatabaseService: {
    getInstance: jest.fn(() => ({
      query: (...args: any[]) => mockQuery(...args),
      execute: (...args: any[]) => mockExecute(...args),
    })),
  },
}));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makePlayerData = (overrides: any = {}) => ({
  match_id: "match-1",
  player_id: "player-1",
  player_number: 10,
  player_name: "John",
  team: "MyTeam" as const,
  is_starter: true,
  photo_url: null,
  ...overrides,
});

const makeStoredPlayer = (overrides: any = {}) => ({
  player_id: "player-1",
  player_number: 10,
  player_name: "John",
  team: "MyTeam",
  is_starter: true,
  photo_url: null,
  on_court: 0,
  playing_time_seconds: 0,
  ...overrides,
});

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Mock getPlayersJson to return a given players array */
function mockPlayersJson(players: any[]) {
  mockQuery.mockResolvedValueOnce([
    { players: JSON.stringify(players) },
  ]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MatchPlayerRepository", () => {
  let repo: MatchPlayerRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MatchPlayerRepository();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe("create", () => {
    it("ajoute le joueur au tableau JSON existant et retourne un MatchPlayer", async () => {
      mockPlayersJson([]); // existing players = []
      mockExecute.mockResolvedValue(undefined); // savePlayersJson

      const result = await repo.create(makePlayerData());

      expect(result.player_number).toBe(10);
      expect(result.player_name).toBe("John");
      expect(result.team).toBe("MyTeam");
      expect(result.is_starter).toBe(true);

      // Should have saved updated JSON
      const savedJson = JSON.parse(mockExecute.mock.calls[0][1][0]);
      expect(savedJson).toHaveLength(1);
      expect(savedJson[0].player_number).toBe(10);
    });

    it("ajoute au tableau si des joueurs existent déjà", async () => {
      mockPlayersJson([makeStoredPlayer({ player_number: 5 })]);
      mockExecute.mockResolvedValue(undefined);

      await repo.create(makePlayerData({ player_number: 10 }));

      const savedJson = JSON.parse(mockExecute.mock.calls[0][1][0]);
      expect(savedJson).toHaveLength(2);
    });

    it("propage l'erreur si la DB échoue", async () => {
      mockQuery.mockRejectedValue(new Error("DB error"));

      await expect(repo.create(makePlayerData())).rejects.toThrow("DB error");
    });
  });

  // ─── createBatch ──────────────────────────────────────────────────────────

  describe("createBatch", () => {
    it("retourne un tableau vide si aucun joueur", async () => {
      const result = await repo.createBatch([]);
      expect(result).toEqual([]);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it("sauvegarde tous les joueurs en une seule opération et les retourne", async () => {
      mockExecute.mockResolvedValue(undefined);

      const players = [
        makePlayerData({ player_number: 7, player_name: "Alice" }),
        makePlayerData({ player_number: 10, player_name: "Bob" }),
      ];
      const result = await repo.createBatch(players);

      expect(result).toHaveLength(2);
      expect(result[0].player_name).toBe("Alice");
      expect(result[1].player_name).toBe("Bob");

      const savedJson = JSON.parse(mockExecute.mock.calls[0][1][0]);
      expect(savedJson).toHaveLength(2);
    });
  });

  // ─── getPlayersForMatch ───────────────────────────────────────────────────

  describe("getPlayersForMatch", () => {
    it("retourne un tableau vide si aucun joueur en base", async () => {
      mockQuery.mockResolvedValue([]); // no match row

      const result = await repo.getPlayersForMatch("match-1");

      expect(result).toEqual([]);
    });

    it("retourne les joueurs triés : équipe, titulaire DESC, numéro ASC", async () => {
      const players = [
        makeStoredPlayer({ player_number: 10, team: "MyTeam", is_starter: false }),
        makeStoredPlayer({ player_number: 5, team: "MyTeam", is_starter: true }),
        makeStoredPlayer({ player_number: 7, team: "Opponent", is_starter: true }),
      ];
      mockPlayersJson(players);

      const result = await repo.getPlayersForMatch("match-1");

      // MyTeam first (M < O), then Opponent
      // Within MyTeam: starter (5) before non-starter (10)
      expect(result[0].player_number).toBe(5);
      expect(result[0].is_starter).toBe(true);
      expect(result[1].player_number).toBe(10);
      expect(result[2].team).toBe("Opponent");
    });

    it("retourne un tableau vide si players est '[]'", async () => {
      mockQuery.mockResolvedValue([{ players: "[]" }]);

      const result = await repo.getPlayersForMatch("match-1");

      expect(result).toEqual([]);
    });
  });

  // ─── deletePlayersForMatch ────────────────────────────────────────────────

  describe("deletePlayersForMatch", () => {
    it("sauvegarde un tableau vide dans matches.players", async () => {
      mockExecute.mockResolvedValue(undefined);

      await repo.deletePlayersForMatch("match-1");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE matches SET players = ?"),
        ["[]", "match-1"]
      );
    });

    it("propage l'erreur si la DB échoue", async () => {
      mockExecute.mockRejectedValue(new Error("DB error"));

      await expect(repo.deletePlayersForMatch("match-1")).rejects.toThrow("DB error");
    });
  });
});
