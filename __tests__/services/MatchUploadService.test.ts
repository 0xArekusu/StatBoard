import { MatchUploadService } from "../../src/services/upload/MatchUploadService";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

const mockMatchRepo = {
  findById: jest.fn(),
  delete: jest.fn(),
};

const mockActionRepo = {
  getActionsForMatch: jest.fn(),
  deleteActionsForMatch: jest.fn(),
};

const mockMatchPlayerRepo = {
  getPlayersForMatch: jest.fn(),
  deletePlayersForMatch: jest.fn(),
};

const mockApiService = {
  uploadMatch: jest.fn(),
};

const mockPayloadAdapter = {
  adapt: jest.fn(),
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeMatch = (overrides: any = {}) => ({
  id: 1,
  team_a_name: "Lions",
  team_b_name: "Tigers",
  status: "completed",
  ...overrides,
});

const makeMatchPlayer = (overrides: any = {}) => ({
  player_number: 10,
  player_name: "John",
  team: "MyTeam",
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MatchUploadService", () => {
  let service: MatchUploadService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MatchUploadService(
      mockMatchRepo as any,
      mockActionRepo as any,
      mockMatchPlayerRepo as any,
      mockApiService as any,
      mockPayloadAdapter as any
    );
  });

  // ─── uploadAndCleanup ──────────────────────────────────────────────────────

  describe("uploadAndCleanup", () => {
    it("charge le match, transforme, upload et nettoie en cas de succès", async () => {
      const match = makeMatch();
      const actions = [{ id: "a1", action_type: "shot" }];
      const matchPlayers = [makeMatchPlayer()];
      const payload = { match: {}, actions: [] };

      mockMatchRepo.findById.mockResolvedValue(match);
      mockActionRepo.getActionsForMatch.mockResolvedValue(actions);
      mockMatchPlayerRepo.getPlayersForMatch.mockResolvedValue(matchPlayers);
      mockPayloadAdapter.adapt.mockReturnValue(payload);
      mockApiService.uploadMatch.mockResolvedValue(undefined);
      mockActionRepo.deleteActionsForMatch.mockResolvedValue(undefined);
      mockMatchPlayerRepo.deletePlayersForMatch.mockResolvedValue(undefined);
      mockMatchRepo.delete.mockResolvedValue(undefined);

      await service.uploadAndCleanup("1");

      expect(mockMatchRepo.findById).toHaveBeenCalledWith("1");
      expect(mockActionRepo.getActionsForMatch).toHaveBeenCalledWith("1");
      expect(mockMatchPlayerRepo.getPlayersForMatch).toHaveBeenCalledWith("1");
      expect(mockPayloadAdapter.adapt).toHaveBeenCalledWith({
        match,
        actions,
        players: [{ num: 10, name: "John", team: "A" }],
      });
      expect(mockApiService.uploadMatch).toHaveBeenCalledWith(payload);
      // Cleanup
      expect(mockActionRepo.deleteActionsForMatch).toHaveBeenCalledWith("1");
      expect(mockMatchPlayerRepo.deletePlayersForMatch).toHaveBeenCalledWith("1");
      expect(mockMatchRepo.delete).toHaveBeenCalledWith("1");
    });

    it("lance une erreur si le match n'existe pas", async () => {
      mockMatchRepo.findById.mockResolvedValue(null);

      await expect(service.uploadAndCleanup("99")).rejects.toThrow("Match with ID 99 not found");
      expect(mockApiService.uploadMatch).not.toHaveBeenCalled();
    });

    it("ne nettoie pas si l'upload échoue", async () => {
      mockMatchRepo.findById.mockResolvedValue(makeMatch());
      mockActionRepo.getActionsForMatch.mockResolvedValue([]);
      mockMatchPlayerRepo.getPlayersForMatch.mockResolvedValue([]);
      mockPayloadAdapter.adapt.mockReturnValue({});
      mockApiService.uploadMatch.mockRejectedValue(new Error("Server error"));

      await expect(service.uploadAndCleanup("1")).rejects.toThrow("Server error");

      // Cleanup ne doit PAS être appelé
      expect(mockActionRepo.deleteActionsForMatch).not.toHaveBeenCalled();
      expect(mockMatchPlayerRepo.deletePlayersForMatch).not.toHaveBeenCalled();
      expect(mockMatchRepo.delete).not.toHaveBeenCalled();
    });

    it("propage l'erreur si getActionsForMatch échoue", async () => {
      mockMatchRepo.findById.mockResolvedValue(makeMatch());
      mockActionRepo.getActionsForMatch.mockRejectedValue(new Error("DB error"));

      await expect(service.uploadAndCleanup("1")).rejects.toThrow("DB error");
    });
  });

  // ─── canUpload ─────────────────────────────────────────────────────────────

  describe("canUpload", () => {
    it("retourne true si le match est terminé (completed)", async () => {
      mockMatchRepo.findById.mockResolvedValue(makeMatch({ status: "completed" }));

      const result = await service.canUpload("1");

      expect(result).toBe(true);
    });

    it("retourne false si le match est en cours (in_progress)", async () => {
      mockMatchRepo.findById.mockResolvedValue(makeMatch({ status: "in_progress" }));

      const result = await service.canUpload("1");

      expect(result).toBe(false);
    });

    it("retourne false si le match n'existe pas", async () => {
      mockMatchRepo.findById.mockResolvedValue(null);

      const result = await service.canUpload("99");

      expect(result).toBe(false);
    });

    it("retourne false si une erreur est levée", async () => {
      mockMatchRepo.findById.mockRejectedValue(new Error("DB error"));

      const result = await service.canUpload("1");

      expect(result).toBe(false);
    });
  });
});
