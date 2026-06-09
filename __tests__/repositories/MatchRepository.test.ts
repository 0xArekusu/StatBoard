import { MatchRepository } from "../../src/services/database/MatchRepository";
import { MatchStatus } from "../../src/models/types";

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

jest.mock("../../src/utils/uuid", () => ({
  generateUUID: jest.fn().mockReturnValue("match-uuid"),
}));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** SQLite row (integers for booleans) */
const makeDbRow = (overrides: any = {}) => ({
  id: "match-1",
  my_team_name: "Lions",
  opponent_name: "Tigers",
  is_home: 1,
  total_periods: 4,
  period_duration: 600,
  overtime_duration: 300,
  overtime_periods: 0,
  my_team_score: 0,
  opponent_score: 0,
  status: "in_progress",
  club_id: null,
  team_id: null,
  synced_to_server: 0,
  score_manually_adjusted: 0,
  track_opponent_stats: 0,
  created_at: "2024-01-01T10:00:00Z",
  started_at: null,
  ended_at: null,
  ...overrides,
});

const makeCreateData = (overrides: any = {}) => ({
  my_team_name: "Lions",
  opponent_name: "Tigers",
  is_home: true,
  total_periods: 4,
  period_duration: 600,
  overtime_duration: 300,
  club_id: null,
  team_id: null,
  club_logo_url: null,
  court_background_color: null,
  court_line_color: null,
  track_opponent_stats: false,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MatchRepository", () => {
  let repo: MatchRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new MatchRepository();
  });

  // ─── normalizeMatch ──────────────────────────────────────────────────────

  describe("normalizeMatch (via findById)", () => {
    it("convertit les entiers SQLite en booléens", async () => {
      mockQuery.mockResolvedValue([
        makeDbRow({ is_home: 1, synced_to_server: 0, score_manually_adjusted: 1, track_opponent_stats: 0 }),
      ]);

      const match = await repo.findById("match-1");

      expect(match!.is_home).toBe(true);
      expect(match!.synced_to_server).toBe(false);
      expect(match!.score_manually_adjusted).toBe(true);
      expect(match!.track_opponent_stats).toBe(false);
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe("create", () => {
    it("insère le match et retourne la ligne normalisée", async () => {
      const dbRow = makeDbRow();
      mockExecute.mockResolvedValue(undefined);
      mockQuery.mockResolvedValue([dbRow]);

      const result = await repo.create(makeCreateData());

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = ?"),
        ["match-uuid"]
      );
      expect(result.id).toBe("match-1");
      expect(result.is_home).toBe(true);
    });

    it("lance une erreur si la ligne n'est pas retrouvée après insertion", async () => {
      mockExecute.mockResolvedValue(undefined);
      mockQuery.mockResolvedValue([]);

      await expect(repo.create(makeCreateData())).rejects.toThrow("Failed to create match");
    });

    it("propage l'erreur si execute échoue", async () => {
      mockExecute.mockRejectedValue(new Error("SQLite error"));

      await expect(repo.create(makeCreateData())).rejects.toThrow("SQLite error");
    });

    it("initialise les handicaps à 0 si non fournis", async () => {
      mockExecute.mockResolvedValue(undefined);
      mockQuery.mockResolvedValue([makeDbRow()]);

      await repo.create(makeCreateData());

      const params = mockExecute.mock.calls[0][1];
      // my_team_handicap et opponent_handicap sont les 2 avant-derniers params (avant created_at)
      const handicapIndex = params.indexOf(0, 3); // skip id, name, opponent
      expect(params).toContain(0); // handicaps défaut à 0
    });

    it("utilise les handicaps fournis dans les params", async () => {
      mockExecute.mockResolvedValue(undefined);
      mockQuery.mockResolvedValue([makeDbRow()]);

      await repo.create(makeCreateData({ my_team_handicap: 5, opponent_handicap: -3 }));

      const params = mockExecute.mock.calls[0][1];
      expect(params).toContain(5);
      expect(params).toContain(-3);
    });

    it("utilise created_at si fourni", async () => {
      mockExecute.mockResolvedValue(undefined);
      mockQuery.mockResolvedValue([makeDbRow()]);

      const createdAt = "2024-06-15T10:00:00Z";
      await repo.create(makeCreateData({ created_at: createdAt }));

      const params = mockExecute.mock.calls[0][1];
      expect(params[params.length - 1]).toBe(createdAt);
    });

    it("génère un created_at automatique si non fourni", async () => {
      mockExecute.mockResolvedValue(undefined);
      mockQuery.mockResolvedValue([makeDbRow()]);

      await repo.create(makeCreateData());

      const params = mockExecute.mock.calls[0][1];
      const createdAt = params[params.length - 1];
      expect(typeof createdAt).toBe("string");
      expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // format ISO
    });
  });

  // ─── findById ────────────────────────────────────────────────────────────

  describe("findById", () => {
    it("retourne le match si trouvé", async () => {
      mockQuery.mockResolvedValue([makeDbRow()]);

      const match = await repo.findById("match-1");

      expect(match).not.toBeNull();
      expect(match!.id).toBe("match-1");
    });

    it("retourne null si non trouvé", async () => {
      mockQuery.mockResolvedValue([]);

      const match = await repo.findById("unknown");

      expect(match).toBeNull();
    });

    it("propage l'erreur DB", async () => {
      mockQuery.mockRejectedValue(new Error("DB error"));

      await expect(repo.findById("match-1")).rejects.toThrow("DB error");
    });
  });

  // ─── findActiveMatch ─────────────────────────────────────────────────────

  describe("findActiveMatch", () => {
    it("retourne le match actif si trouvé", async () => {
      mockQuery.mockResolvedValue([makeDbRow({ status: "in_progress" })]);

      const match = await repo.findActiveMatch();

      expect(match).not.toBeNull();
      expect(match!.status).toBe("in_progress");
    });

    it("retourne null si aucun match actif", async () => {
      mockQuery.mockResolvedValue([]);

      const match = await repo.findActiveMatch();

      expect(match).toBeNull();
    });

    it("sans paramètres, passe undefined à la requête", async () => {
      mockQuery.mockResolvedValue([]);

      await repo.findActiveMatch();

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), undefined);
    });

    it("filtre par clubId si fourni", async () => {
      mockQuery.mockResolvedValue([makeDbRow({ club_id: "club-1" })]);

      await repo.findActiveMatch("club-1");

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("club_id = ?");
      expect(params).toContain("club-1");
    });

    it("filtre par teamId si fourni", async () => {
      mockQuery.mockResolvedValue([makeDbRow({ team_id: "team-1" })]);

      await repo.findActiveMatch(undefined, "team-1");

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("team_id = ?");
      expect(params).toContain("team-1");
    });

    it("filtre par clubId et teamId si les deux sont fournis", async () => {
      mockQuery.mockResolvedValue([makeDbRow({ club_id: "club-1", team_id: "team-1" })]);

      await repo.findActiveMatch("club-1", "team-1");

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("club_id = ?");
      expect(sql).toContain("team_id = ?");
      expect(params).toEqual(["club-1", "team-1"]);
    });

    it("fonctionne avec GUEST_IDS.CLUB comme clubId", async () => {
      mockQuery.mockResolvedValue([makeDbRow({ club_id: "guest-club" })]);

      await repo.findActiveMatch("guest-club");

      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("club_id = ?");
      expect(params).toContain("guest-club");
    });
  });

  // ─── getAllMatches ────────────────────────────────────────────────────────

  describe("getAllMatches", () => {
    it("retourne tous les matchs normalisés", async () => {
      mockQuery.mockResolvedValue([makeDbRow(), makeDbRow({ id: "match-2" })]);

      const matches = await repo.getAllMatches();

      expect(matches).toHaveLength(2);
      expect(matches[0].is_home).toBe(true);
    });

    it("retourne un tableau vide si aucun match", async () => {
      mockQuery.mockResolvedValue([]);

      const matches = await repo.getAllMatches();

      expect(matches).toEqual([]);
    });
  });

  // ─── getMatchesByTeamId ───────────────────────────────────────────────────

  describe("getMatchesByTeamId", () => {
    it("passe le teamId comme paramètre", async () => {
      mockQuery.mockResolvedValue([makeDbRow({ team_id: "team-1" })]);

      await repo.getMatchesByTeamId("team-1");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE team_id = ?"),
        ["team-1"]
      );
    });
  });

  // ─── updateStatus ────────────────────────────────────────────────────────

  describe("updateStatus", () => {
    it("met à jour le statut sans ended_at si non completed", async () => {
      mockExecute.mockResolvedValue(undefined);

      await repo.updateStatus("match-1", MatchStatus.IN_PROGRESS);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE matches SET status = ?"),
        expect.arrayContaining([MatchStatus.IN_PROGRESS, "match-1"])
      );
    });

    it("ajoute ended_at si statut = completed", async () => {
      mockExecute.mockResolvedValue(undefined);
      const endedAt = new Date("2024-01-01T12:00:00Z");

      await repo.updateStatus("match-1", MatchStatus.COMPLETED, endedAt);

      const params = mockExecute.mock.calls[0][1];
      expect(params).toContain(endedAt.toISOString());
    });
  });

  // ─── updateFinalScores ────────────────────────────────────────────────────

  describe("updateFinalScores", () => {
    it("met à jour les scores finaux", async () => {
      mockExecute.mockResolvedValue(undefined);

      await repo.updateFinalScores("match-1", 80, 75, false);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("my_team_score"),
        expect.arrayContaining([80, 75, "match-1"])
      );
    });
  });

  // ─── updateOvertimePeriods ────────────────────────────────────────────────

  describe("updateOvertimePeriods", () => {
    it("met à jour le nombre de prolongations", async () => {
      mockExecute.mockResolvedValue(undefined);

      await repo.updateOvertimePeriods("match-1", 2);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("overtime_periods"),
        expect.arrayContaining([2, "match-1"])
      );
    });
  });

  // ─── updateSyncStatus ────────────────────────────────────────────────────

  describe("updateSyncStatus", () => {
    it("marque le match comme synchronisé (1)", async () => {
      mockExecute.mockResolvedValue(undefined);

      await repo.updateSyncStatus("match-1", true);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("synced_to_server"),
        expect.arrayContaining([1, "match-1"])
      );
    });

    it("marque le match comme non synchronisé (0)", async () => {
      mockExecute.mockResolvedValue(undefined);

      await repo.updateSyncStatus("match-1", false);

      const params = mockExecute.mock.calls[0][1];
      expect(params).toContain(0);
    });
  });

  // ─── findUnsyncedCompletedMatches ─────────────────────────────────────────

  describe("findUnsyncedCompletedMatches", () => {
    it("retourne uniquement les matchs terminés non synchronisés", async () => {
      mockQuery.mockResolvedValue([makeDbRow({ status: "completed", synced_to_server: 0 })]);

      const matches = await repo.findUnsyncedCompletedMatches();

      expect(matches).toHaveLength(1);
      expect(matches[0].synced_to_server).toBe(false);
    });
  });

  // ─── delete ──────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("exécute DELETE avec l'id du match", async () => {
      mockExecute.mockResolvedValue(undefined);

      await repo.delete("match-1");

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM matches WHERE id = ?"),
        ["match-1"]
      );
    });
  });
});
