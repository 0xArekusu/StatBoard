import { TeamService } from "../../services/TeamService";
import i18n from "../../src/i18n";

// These tests assert French copy directly, so pin the language regardless of
// the device locale the test environment resolves (jest-expo mocks it to "en").
beforeAll(async () => {
  await i18n.changeLanguage("fr");
});

// ─── Mock repositories ────────────────────────────────────────────────────────

const mockTeamRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByClubId: jest.fn(),
  findByClubIdAndStatus: jest.fn(),
  findByOwnerId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  countByOwnerAndClub: jest.fn(),
};

const mockMemberRepo = {
  findByClubAndUser: jest.fn(),
};

const mockSubscriptionService = {
  canCreateTeam: jest.fn(),
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeTeam = (overrides: any = {}) => ({
  id: "team-1",
  name: "Les Lions",
  clubId: "club-1",
  ownerId: "user-1",
  status: "approved",
  isActive: true,
  isDeleted: false,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date(),
  ...overrides,
});

const validData = { name: "Les Lions", clubId: "club-1", gender: "male" } as any;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("TeamService", () => {
  let service: TeamService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TeamService(
      mockTeamRepo as any,
      mockMemberRepo as any,
      mockSubscriptionService as any
    );
  });

  // ─── createTeam ─────────────────────────────────────────────────────────────

  describe("createTeam", () => {
    it("échoue si le nom est vide", async () => {
      const result = await service.createTeam({ ...validData, name: "" }, "user-1");
      expect(result).toEqual({ success: false, error: "Le nom de l'équipe est requis" });
    });

    it("échoue si l'utilisateur n'est pas membre du club", async () => {
      mockMemberRepo.findByClubAndUser.mockResolvedValue(null);
      const result = await service.createTeam(validData, "user-1");
      expect(result).toEqual({
        success: false,
        error: "Vous devez être membre du club pour créer une équipe",
      });
    });

    it("échoue si la limite d'abonnement est atteinte", async () => {
      mockMemberRepo.findByClubAndUser.mockResolvedValue({});
      mockSubscriptionService.canCreateTeam.mockResolvedValue({
        allowed: false,
        error: "Limite atteinte",
      });
      const result = await service.createTeam(validData, "user-1");
      expect(result).toEqual({ success: false, error: "Limite atteinte" });
    });

    it("échoue si l'utilisateur a atteint 10 équipes dans le club", async () => {
      mockMemberRepo.findByClubAndUser.mockResolvedValue({});
      mockSubscriptionService.canCreateTeam.mockResolvedValue({ allowed: true });
      mockTeamRepo.countByOwnerAndClub.mockResolvedValue(10);

      const result = await service.createTeam(validData, "user-1");

      expect(result).toEqual({
        success: false,
        error: "Vous ne pouvez pas créer plus de 10 équipes dans ce club",
      });
    });

    it("échoue si le repo retourne null", async () => {
      mockMemberRepo.findByClubAndUser.mockResolvedValue({});
      mockSubscriptionService.canCreateTeam.mockResolvedValue({ allowed: true });
      mockTeamRepo.countByOwnerAndClub.mockResolvedValue(0);
      mockTeamRepo.create.mockResolvedValue(null);

      const result = await service.createTeam(validData, "user-1");

      expect(result).toEqual({
        success: false,
        error: "Erreur lors de la création de l'équipe",
      });
    });

    it("crée l'équipe avec succès", async () => {
      const team = makeTeam();
      mockMemberRepo.findByClubAndUser.mockResolvedValue({});
      mockSubscriptionService.canCreateTeam.mockResolvedValue({ allowed: true });
      mockTeamRepo.countByOwnerAndClub.mockResolvedValue(3);
      mockTeamRepo.create.mockResolvedValue(team);

      const result = await service.createTeam(validData, "user-1");

      expect(result).toEqual({ success: true, team });
    });

    it("fonctionne sans subscriptionService (optionnel)", async () => {
      service = new TeamService(mockTeamRepo as any, mockMemberRepo as any);
      mockMemberRepo.findByClubAndUser.mockResolvedValue({});
      mockTeamRepo.countByOwnerAndClub.mockResolvedValue(0);
      mockTeamRepo.create.mockResolvedValue(makeTeam());

      const result = await service.createTeam(validData, "user-1");

      expect(result.success).toBe(true);
    });
  });

  // ─── updateTeam ─────────────────────────────────────────────────────────────

  describe("updateTeam", () => {
    it("échoue si l'équipe est introuvable", async () => {
      mockTeamRepo.findById.mockResolvedValue(null);
      const result = await service.updateTeam("team-1", { name: "New" }, "user-1");
      expect(result).toEqual({ success: false, error: "Équipe introuvable" });
    });

    it("échoue si le repo update retourne null", async () => {
      mockTeamRepo.findById.mockResolvedValue(makeTeam());
      mockTeamRepo.update.mockResolvedValue(null);
      const result = await service.updateTeam("team-1", { name: "New" }, "user-1");
      expect(result).toEqual({
        success: false,
        error: "Erreur lors de la modification de l'équipe",
      });
    });

    it("retourne l'équipe mise à jour", async () => {
      const updated = makeTeam({ name: "New" });
      mockTeamRepo.findById.mockResolvedValue(makeTeam());
      mockTeamRepo.update.mockResolvedValue(updated);
      const result = await service.updateTeam("team-1", { name: "New" }, "user-1");
      expect(result).toEqual({ success: true, team: updated });
    });
  });

  // ─── updateTeamStatus ────────────────────────────────────────────────────────

  describe("updateTeamStatus", () => {
    it("échoue si l'équipe est introuvable", async () => {
      mockTeamRepo.findById.mockResolvedValue(null);
      const result = await service.updateTeamStatus("team-1", "approved", "owner-1");
      expect(result).toEqual({ success: false, error: "Équipe introuvable" });
    });

    it("approuve l'équipe", async () => {
      const approved = makeTeam({ status: "approved" });
      mockTeamRepo.findById.mockResolvedValue(makeTeam({ status: "pending" }));
      mockTeamRepo.update.mockResolvedValue(approved);
      const result = await service.updateTeamStatus("team-1", "approved", "owner-1");
      expect(result).toEqual({ success: true, team: approved });
      expect(mockTeamRepo.update).toHaveBeenCalledWith("team-1", { status: "approved" });
    });
  });

  // ─── toggleTeamActive ────────────────────────────────────────────────────────

  describe("toggleTeamActive", () => {
    it("échoue si l'équipe est introuvable", async () => {
      mockTeamRepo.findById.mockResolvedValue(null);
      const result = await service.toggleTeamActive("team-1", "owner-1");
      expect(result).toEqual({ success: false, error: "Équipe introuvable" });
    });

    it("passe de active=true à active=false", async () => {
      mockTeamRepo.findById.mockResolvedValue(makeTeam({ isActive: true }));
      mockTeamRepo.update.mockResolvedValue(makeTeam({ isActive: false }));

      await service.toggleTeamActive("team-1", "owner-1");

      expect(mockTeamRepo.update).toHaveBeenCalledWith("team-1", { isActive: false });
    });

    it("passe de active=false à active=true", async () => {
      mockTeamRepo.findById.mockResolvedValue(makeTeam({ isActive: false }));
      mockTeamRepo.update.mockResolvedValue(makeTeam({ isActive: true }));

      await service.toggleTeamActive("team-1", "owner-1");

      expect(mockTeamRepo.update).toHaveBeenCalledWith("team-1", { isActive: true });
    });
  });

  // ─── deleteTeam ──────────────────────────────────────────────────────────────

  describe("deleteTeam", () => {
    it("échoue si l'équipe est introuvable", async () => {
      mockTeamRepo.findById.mockResolvedValue(null);
      const result = await service.deleteTeam("team-1", "user-1");
      expect(result).toEqual({ success: false, error: "Équipe introuvable" });
    });

    it("échoue si l'utilisateur n'est pas le propriétaire", async () => {
      mockTeamRepo.findById.mockResolvedValue(makeTeam({ ownerId: "other-user" }));
      const result = await service.deleteTeam("team-1", "user-1");
      expect(result).toEqual({
        success: false,
        error: "Vous n'avez pas la permission de supprimer cette équipe",
      });
    });

    it("échoue si delete retourne false", async () => {
      mockTeamRepo.findById.mockResolvedValue(makeTeam({ ownerId: "user-1" }));
      mockTeamRepo.delete.mockResolvedValue(false);
      const result = await service.deleteTeam("team-1", "user-1");
      expect(result).toEqual({
        success: false,
        error: "Erreur lors de la suppression de l'équipe",
      });
    });

    it("supprime l'équipe avec succès", async () => {
      mockTeamRepo.findById.mockResolvedValue(makeTeam({ ownerId: "user-1" }));
      mockTeamRepo.delete.mockResolvedValue(true);
      const result = await service.deleteTeam("team-1", "user-1");
      expect(result).toEqual({ success: true });
    });
  });

  // ─── lectures ────────────────────────────────────────────────────────────────

  describe("lectures — délégations au repo", () => {
    it("getTeamById", async () => {
      mockTeamRepo.findById.mockResolvedValue(makeTeam());
      expect(await service.getTeamById("team-1")).toMatchObject({ id: "team-1" });
    });

    it("getClubTeams", async () => {
      mockTeamRepo.findByClubId.mockResolvedValue([makeTeam()]);
      expect(await service.getClubTeams("club-1")).toHaveLength(1);
    });

    it("getClubTeamsByStatus", async () => {
      mockTeamRepo.findByClubIdAndStatus.mockResolvedValue([makeTeam()]);
      expect(await service.getClubTeamsByStatus("club-1", "approved")).toHaveLength(1);
    });

    it("getUserTeams", async () => {
      mockTeamRepo.findByOwnerId.mockResolvedValue([makeTeam()]);
      expect(await service.getUserTeams("user-1")).toHaveLength(1);
    });
  });

  // ─── enforceTeamLimits ───────────────────────────────────────────────────────

  describe("enforceTeamLimits", () => {
    it("retourne activeCount sans modification si déjà dans les limites", async () => {
      mockTeamRepo.findByClubIdAndStatus.mockResolvedValue([
        makeTeam({ isActive: true }),
        makeTeam({ id: "team-2", isActive: true }),
      ]);

      const result = await service.enforceTeamLimits("club-1", 5);

      expect(result).toEqual({
        success: true,
        activeCount: 2,
        suspendedCount: 0,
        reactivatedCount: 0,
      });
      expect(mockTeamRepo.update).not.toHaveBeenCalled();
    });

    it("DOWNGRADE — suspend les équipes en excès", async () => {
      const teams = [
        makeTeam({ id: "t1", isActive: true, createdAt: new Date("2024-03-01") }),
        makeTeam({ id: "t2", isActive: true, createdAt: new Date("2024-02-01") }),
        makeTeam({ id: "t3", isActive: true, createdAt: new Date("2024-01-01") }),
      ];
      mockTeamRepo.findByClubIdAndStatus.mockResolvedValue(teams);
      mockTeamRepo.update.mockResolvedValue(makeTeam({ isActive: false }));

      const result = await service.enforceTeamLimits("club-1", 1);

      // Les 2 moins récentes sont suspendues
      expect(mockTeamRepo.update).toHaveBeenCalledTimes(2);
      expect(result.suspendedCount).toBe(2);
      expect(result.activeCount).toBe(1);
    });

    it("DOWNGRADE avec selectedTeamIds — garde les équipes choisies", async () => {
      const teams = [
        makeTeam({ id: "t1", isActive: true }),
        makeTeam({ id: "t2", isActive: true }),
      ];
      mockTeamRepo.findByClubIdAndStatus.mockResolvedValue(teams);
      mockTeamRepo.update.mockResolvedValue(makeTeam({ isActive: false }));

      const result = await service.enforceTeamLimits("club-1", 1, ["t1"]);

      expect(mockTeamRepo.update).toHaveBeenCalledWith("t2", { isActive: false });
      expect(result.suspendedCount).toBe(1);
    });

    it("UPGRADE — réactive les équipes suspendues", async () => {
      const teams = [
        makeTeam({ id: "t1", isActive: true }),
        makeTeam({ id: "t2", isActive: false }),
        makeTeam({ id: "t3", isActive: false }),
      ];
      mockTeamRepo.findByClubIdAndStatus.mockResolvedValue(teams);
      mockTeamRepo.update.mockResolvedValue(makeTeam({ isActive: true }));

      const result = await service.enforceTeamLimits("club-1", 3);

      expect(mockTeamRepo.update).toHaveBeenCalledWith(expect.any(String), { isActive: true });
      expect(result.reactivatedCount).toBeGreaterThan(0);
    });

    it("retourne success:false en cas d'exception", async () => {
      mockTeamRepo.findByClubIdAndStatus.mockRejectedValue(new Error("DB error"));

      const result = await service.enforceTeamLimits("club-1", 2);

      expect(result.success).toBe(false);
    });
  });

  // ─── getActiveTeamsCount ─────────────────────────────────────────────────────

  describe("getActiveTeamsCount", () => {
    it("compte uniquement les équipes actives non supprimées", async () => {
      mockTeamRepo.findByClubIdAndStatus.mockResolvedValue([
        makeTeam({ isActive: true, isDeleted: false }),
        makeTeam({ id: "t2", isActive: false, isDeleted: false }),
        makeTeam({ id: "t3", isActive: true, isDeleted: true }),
      ]);

      const count = await service.getActiveTeamsCount("club-1");

      expect(count).toBe(1);
    });
  });
});
