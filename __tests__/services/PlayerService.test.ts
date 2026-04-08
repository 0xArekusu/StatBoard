import { PlayerService } from "../../services/PlayerService";

// ─── Mock repository ──────────────────────────────────────────────────────────

const mockRepo = {
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  findByTeamId: jest.fn(),
  countByTeamId: jest.fn(),
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makePlayer = (overrides: any = {}) => ({
  id: "player-1",
  teamId: "team-1",
  name: "John Doe",
  jerseyNumber: 10,
  photoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PlayerService", () => {
  let service: PlayerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlayerService(mockRepo as any);
  });

  // ─── createPlayer ───────────────────────────────────────────────────────────

  describe("createPlayer", () => {
    it("échoue si le nom est vide", async () => {
      const result = await service.createPlayer({
        teamId: "team-1",
        name: "",
        jerseyNumber: 10,
      });
      expect(result).toEqual({ success: false, error: "Le nom du joueur est requis" });
    });

    it("échoue si le nom est une chaîne d'espaces", async () => {
      const result = await service.createPlayer({
        teamId: "team-1",
        name: "   ",
        jerseyNumber: 10,
      });
      expect(result.success).toBe(false);
    });

    it("échoue si jerseyNumber < 0", async () => {
      mockRepo.countByTeamId.mockResolvedValue(0);
      const result = await service.createPlayer({
        teamId: "team-1",
        name: "John",
        jerseyNumber: -1,
      });
      expect(result).toEqual({ success: false, error: "Le numéro doit être entre 0 et 99" });
    });

    it("échoue si jerseyNumber > 99", async () => {
      mockRepo.countByTeamId.mockResolvedValue(0);
      const result = await service.createPlayer({
        teamId: "team-1",
        name: "John",
        jerseyNumber: 100,
      });
      expect(result.success).toBe(false);
    });

    it("accepte jerseyNumber = 0 et 99 (limites incluses)", async () => {
      mockRepo.countByTeamId.mockResolvedValue(0);
      mockRepo.create.mockResolvedValue(makePlayer({ jerseyNumber: 0 }));
      const r1 = await service.createPlayer({ teamId: "t", name: "A", jerseyNumber: 0 });
      expect(r1.success).toBe(true);

      mockRepo.countByTeamId.mockResolvedValue(0);
      mockRepo.create.mockResolvedValue(makePlayer({ jerseyNumber: 99 }));
      const r2 = await service.createPlayer({ teamId: "t", name: "B", jerseyNumber: 99 });
      expect(r2.success).toBe(true);
    });

    it("échoue si l'équipe a déjà 13 joueurs", async () => {
      mockRepo.countByTeamId.mockResolvedValue(13);
      const result = await service.createPlayer({
        teamId: "team-1",
        name: "John",
        jerseyNumber: 10,
      });
      expect(result).toEqual({
        success: false,
        error: "Une équipe ne peut pas avoir plus de 13 joueurs",
      });
    });

    it("échoue si le repo retourne null", async () => {
      mockRepo.countByTeamId.mockResolvedValue(5);
      mockRepo.create.mockResolvedValue(null);
      const result = await service.createPlayer({
        teamId: "team-1",
        name: "John",
        jerseyNumber: 10,
      });
      expect(result).toEqual({ success: false, error: "Erreur lors de la création du joueur" });
    });

    it("retourne le joueur créé en cas de succès", async () => {
      const player = makePlayer();
      mockRepo.countByTeamId.mockResolvedValue(5);
      mockRepo.create.mockResolvedValue(player);
      const result = await service.createPlayer({
        teamId: "team-1",
        name: "John",
        jerseyNumber: 10,
      });
      expect(result).toEqual({ success: true, player });
    });
  });

  // ─── updatePlayer ───────────────────────────────────────────────────────────

  describe("updatePlayer", () => {
    it("échoue si jerseyNumber invalide", async () => {
      const result = await service.updatePlayer("player-1", { jerseyNumber: 150 });
      expect(result).toEqual({ success: false, error: "Le numéro doit être entre 0 et 99" });
    });

    it("ne valide pas jerseyNumber si absent", async () => {
      mockRepo.update.mockResolvedValue(makePlayer({ name: "Jane" }));
      const result = await service.updatePlayer("player-1", { name: "Jane" });
      expect(result.success).toBe(true);
    });

    it("échoue si le repo retourne null", async () => {
      mockRepo.update.mockResolvedValue(null);
      const result = await service.updatePlayer("player-1", { name: "Jane" });
      expect(result).toEqual({
        success: false,
        error: "Erreur lors de la modification du joueur",
      });
    });

    it("retourne le joueur mis à jour", async () => {
      const updated = makePlayer({ name: "Jane" });
      mockRepo.update.mockResolvedValue(updated);
      const result = await service.updatePlayer("player-1", { name: "Jane" });
      expect(result).toEqual({ success: true, player: updated });
    });
  });

  // ─── deletePlayer ───────────────────────────────────────────────────────────

  describe("deletePlayer", () => {
    it("échoue si le repo retourne false", async () => {
      mockRepo.delete.mockResolvedValue(false);
      const result = await service.deletePlayer("player-1", "team-1");
      expect(result).toEqual({
        success: false,
        error: "Erreur lors de la suppression du joueur",
      });
    });

    it("retourne success: true", async () => {
      mockRepo.delete.mockResolvedValue(true);
      const result = await service.deletePlayer("player-1", "team-1");
      expect(result).toEqual({ success: true });
    });
  });

  // ─── getTeamPlayers / getPlayerById ─────────────────────────────────────────

  describe("getTeamPlayers", () => {
    it("délègue au repository", async () => {
      const players = [makePlayer()];
      mockRepo.findByTeamId.mockResolvedValue(players);
      const result = await service.getTeamPlayers("team-1");
      expect(result).toBe(players);
      expect(mockRepo.findByTeamId).toHaveBeenCalledWith("team-1");
    });
  });

  describe("getPlayerById", () => {
    it("délègue au repository", async () => {
      const player = makePlayer();
      mockRepo.findById.mockResolvedValue(player);
      const result = await service.getPlayerById("player-1");
      expect(result).toBe(player);
    });
  });
});
