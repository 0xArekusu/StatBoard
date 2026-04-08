import { MatchManager } from "../../src/services/match/MatchManager";
import { Match, MatchStatus } from "../../src/models/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockMatchRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findActiveMatch: jest.fn(),
  updateStatus: jest.fn(),
  startMatch: jest.fn(),
  abandonMatch: jest.fn(),
  completeMatch: jest.fn(),
  updateMatchState: jest.fn(),
};

const mockActionRepo = {
  compactMatchActions: jest.fn(),
};

jest.mock("../../src/services/database/MatchRepository", () => ({
  MatchRepository: jest.fn().mockImplementation(() => mockMatchRepo),
}));

jest.mock("../../src/services/database/ActionRepository", () => ({
  ActionRepository: jest.fn().mockImplementation(() => mockActionRepo),
}));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeMatch = (overrides: Partial<Match> = {}): Match => ({
  id: "match-1",
  opponent_name: "Adversaire",
  is_home: true,
  my_team_name: "Mon Équipe",
  status: MatchStatus.IN_PROGRESS,
  total_periods: 4,
  period_duration: 600,
  overtime_duration: 300,
  overtime_periods: 0,
  my_team_score: 0,
  opponent_score: 0,
  created_at: "2024-01-01T10:00:00.000Z",
  started_at: null,
  ended_at: null,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MatchManager", () => {
  let manager: MatchManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new MatchManager();
  });

  // ─── createMatch ────────────────────────────────────────────────────────────

  describe("createMatch", () => {
    const createData = {
      opponent_name: "Lyon Basket",
      is_home: true,
      total_periods: 4,
      period_duration: 600,
    };

    it("retourne le match créé par le repository", async () => {
      const match = makeMatch({ opponent_name: "Lyon Basket" });
      mockMatchRepo.create.mockResolvedValue(match);

      const result = await manager.createMatch(createData);

      expect(result).toBe(match);
      expect(mockMatchRepo.create).toHaveBeenCalledWith(createData);
    });

    it("propage l'erreur si le repository échoue", async () => {
      mockMatchRepo.create.mockRejectedValue(new Error("DB error"));

      await expect(manager.createMatch(createData)).rejects.toThrow("DB error");
    });
  });

  // ─── startMatch ─────────────────────────────────────────────────────────────

  describe("startMatch", () => {
    it("appelle matchRepository.startMatch avec le bon id", async () => {
      mockMatchRepo.startMatch.mockResolvedValue(undefined);

      await manager.startMatch("match-1");

      expect(mockMatchRepo.startMatch).toHaveBeenCalledWith("match-1");
    });

    it("propage l'erreur si le repository échoue", async () => {
      mockMatchRepo.startMatch.mockRejectedValue(new Error("Not found"));

      await expect(manager.startMatch("match-1")).rejects.toThrow("Not found");
    });
  });

  // ─── resumeMatch ─────────────────────────────────────────────────────────────

  describe("resumeMatch", () => {
    it("retourne le match si trouvé et en cours", async () => {
      const match = makeMatch({ status: MatchStatus.IN_PROGRESS });
      mockMatchRepo.findById.mockResolvedValue(match);

      const result = await manager.resumeMatch("match-1");

      expect(result).toBe(match);
    });

    it("lève une erreur si le match n'existe pas", async () => {
      mockMatchRepo.findById.mockResolvedValue(null);

      await expect(manager.resumeMatch("match-404")).rejects.toThrow(
        "Match with id match-404 not found"
      );
    });

    it("lève une erreur si le match est terminé (completed)", async () => {
      const match = makeMatch({ status: MatchStatus.COMPLETED });
      mockMatchRepo.findById.mockResolvedValue(match);

      await expect(manager.resumeMatch("match-1")).rejects.toThrow(
        "Cannot resume match with status: completed"
      );
    });

    it("lève une erreur si le match est abandonné", async () => {
      const match = makeMatch({ status: "abandoned" as MatchStatus });
      mockMatchRepo.findById.mockResolvedValue(match);

      await expect(manager.resumeMatch("match-1")).rejects.toThrow(
        "Cannot resume match with status: abandoned"
      );
    });

    it("propage l'erreur repository", async () => {
      mockMatchRepo.findById.mockRejectedValue(new Error("DB error"));

      await expect(manager.resumeMatch("match-1")).rejects.toThrow("DB error");
    });
  });

  // ─── endMatch ───────────────────────────────────────────────────────────────

  describe("endMatch", () => {
    it("appelle completeMatch puis compactMatchActions dans l'ordre", async () => {
      const callOrder: string[] = [];
      mockMatchRepo.completeMatch.mockImplementation(async () => {
        callOrder.push("completeMatch");
      });
      mockActionRepo.compactMatchActions.mockImplementation(async () => {
        callOrder.push("compactMatchActions");
      });

      await manager.endMatch("match-1");

      expect(callOrder).toEqual(["completeMatch", "compactMatchActions"]);
    });

    it("appelle les deux méthodes avec le bon matchId", async () => {
      mockMatchRepo.completeMatch.mockResolvedValue(undefined);
      mockActionRepo.compactMatchActions.mockResolvedValue(undefined);

      await manager.endMatch("match-42");

      expect(mockMatchRepo.completeMatch).toHaveBeenCalledWith("match-42");
      expect(mockActionRepo.compactMatchActions).toHaveBeenCalledWith("match-42");
    });

    it("propage l'erreur si completeMatch échoue", async () => {
      mockMatchRepo.completeMatch.mockRejectedValue(new Error("DB error"));

      await expect(manager.endMatch("match-1")).rejects.toThrow("DB error");
      expect(mockActionRepo.compactMatchActions).not.toHaveBeenCalled();
    });

    it("propage l'erreur si compactMatchActions échoue", async () => {
      mockMatchRepo.completeMatch.mockResolvedValue(undefined);
      mockActionRepo.compactMatchActions.mockRejectedValue(new Error("Compact error"));

      await expect(manager.endMatch("match-1")).rejects.toThrow("Compact error");
    });
  });

  // ─── getActiveMatch ──────────────────────────────────────────────────────────

  describe("getActiveMatch", () => {
    it("retourne le match actif si présent", async () => {
      const match = makeMatch();
      mockMatchRepo.findActiveMatch.mockResolvedValue(match);

      const result = await manager.getActiveMatch();

      expect(result).toBe(match);
    });

    it("retourne null si aucun match actif", async () => {
      mockMatchRepo.findActiveMatch.mockResolvedValue(null);

      const result = await manager.getActiveMatch();

      expect(result).toBeNull();
    });

    it("propage l'erreur repository", async () => {
      mockMatchRepo.findActiveMatch.mockRejectedValue(new Error("DB error"));

      await expect(manager.getActiveMatch()).rejects.toThrow("DB error");
    });
  });

  // ─── pauseMatch ──────────────────────────────────────────────────────────────

  describe("pauseMatch", () => {
    it("appelle updateStatus avec 'paused'", async () => {
      mockMatchRepo.updateStatus.mockResolvedValue(undefined);

      await manager.pauseMatch("match-1");

      expect(mockMatchRepo.updateStatus).toHaveBeenCalledWith("match-1", "paused");
    });

    it("propage l'erreur repository", async () => {
      mockMatchRepo.updateStatus.mockRejectedValue(new Error("DB error"));

      await expect(manager.pauseMatch("match-1")).rejects.toThrow("DB error");
    });
  });

  // ─── abandonMatch ────────────────────────────────────────────────────────────

  describe("abandonMatch", () => {
    it("appelle matchRepository.abandonMatch avec le bon id", async () => {
      mockMatchRepo.abandonMatch.mockResolvedValue(undefined);

      await manager.abandonMatch("match-1");

      expect(mockMatchRepo.abandonMatch).toHaveBeenCalledWith("match-1");
    });

    it("propage l'erreur repository", async () => {
      mockMatchRepo.abandonMatch.mockRejectedValue(new Error("DB error"));

      await expect(manager.abandonMatch("match-1")).rejects.toThrow("DB error");
    });
  });

  // ─── completeMatch ───────────────────────────────────────────────────────────

  describe("completeMatch", () => {
    it("appelle matchRepository.completeMatch avec le bon id", async () => {
      mockMatchRepo.completeMatch.mockResolvedValue(undefined);

      await manager.completeMatch("match-1");

      expect(mockMatchRepo.completeMatch).toHaveBeenCalledWith("match-1");
    });

    it("propage l'erreur repository", async () => {
      mockMatchRepo.completeMatch.mockRejectedValue(new Error("DB error"));

      await expect(manager.completeMatch("match-1")).rejects.toThrow("DB error");
    });
  });

  // ─── updateMatchState ────────────────────────────────────────────────────────

  describe("updateMatchState", () => {
    it("délègue au repository avec les bons paramètres", async () => {
      mockMatchRepo.updateMatchState.mockResolvedValue(undefined);

      await manager.updateMatchState("match-1", 2, 450);

      expect(mockMatchRepo.updateMatchState).toHaveBeenCalledWith("match-1", 2, 450);
    });

    it("propage l'erreur repository", async () => {
      mockMatchRepo.updateMatchState.mockRejectedValue(new Error("DB error"));

      await expect(manager.updateMatchState("match-1", 2, 450)).rejects.toThrow("DB error");
    });
  });
});
