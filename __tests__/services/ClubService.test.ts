import { ClubService } from "../../services/ClubService";
import { AdminService } from "../../services/AdminService";

// ─── Mock AdminService ────────────────────────────────────────────────────────
// jest.mock is hoisted before variable declarations, so mockIsAdmin must be
// defined inside the factory and accessed via the imported module.

jest.mock("../../services/AdminService", () => ({
  AdminService: {
    getInstance: jest.fn().mockReturnValue({
      isAdmin: jest.fn(),
    }),
  },
}));

const mockIsAdmin = AdminService.getInstance().isAdmin as jest.Mock;

// ─── Mock repository ──────────────────────────────────────────────────────────

const mockRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByCode: jest.fn(),
  findByOwnerId: jest.fn(),
  findByMemberId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateSubscriptionTier: jest.fn(),
};

// ─── Fixture ─────────────────────────────────────────────────────────────────

const makeClub = (overrides: any = {}) => ({
  id: "club-1",
  name: "Mon Club",
  acronym: "MC",
  ownerId: "user-1",
  joinCode: "ABC12",
  subscriptionTier: "free",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const validCreateData = { name: "Mon Club", acronym: "MC" } as any;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ClubService", () => {
  let service: ClubService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClubService(mockRepo as any);
    mockIsAdmin.mockResolvedValue(false); // non-admin by default
  });

  // ─── createClub — validation ────────────────────────────────────────────────

  describe("createClub — validation", () => {
    it("échoue si le nom est vide", async () => {
      const result = await service.createClub({ name: "", acronym: "MC" } as any, "u");
      expect(result).toEqual({ success: false, error: "Club name is required" });
    });

    it("échoue si le nom dépasse 30 caractères", async () => {
      const result = await service.createClub(
        { name: "A".repeat(31), acronym: "MC" } as any,
        "u"
      );
      expect(result).toEqual({
        success: false,
        error: "Club name must be 30 characters or less",
      });
    });

    it("échoue si l'acronyme est vide", async () => {
      const result = await service.createClub({ name: "Mon Club", acronym: "" } as any, "u");
      expect(result).toEqual({ success: false, error: "Club acronym is required" });
    });

    it("échoue si l'acronyme dépasse 5 caractères", async () => {
      const result = await service.createClub(
        { name: "Mon Club", acronym: "TOOLONG" } as any,
        "u"
      );
      expect(result).toEqual({
        success: false,
        error: "Club acronym must be 5 characters or less",
      });
    });
  });

  // ─── createClub — logique métier ────────────────────────────────────────────

  describe("createClub — logique métier", () => {
    it("échoue si un non-admin a déjà un club", async () => {
      mockIsAdmin.mockResolvedValue(false);
      mockRepo.findByOwnerId.mockResolvedValue([makeClub()]);

      const result = await service.createClub(validCreateData, "user-1");

      expect(result).toEqual({ success: false, error: "Vous avez déjà créé un club" });
    });

    it("un admin peut créer plusieurs clubs", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockRepo.create.mockResolvedValue(makeClub());

      const result = await service.createClub(validCreateData, "user-1");

      expect(result.success).toBe(true);
      expect(mockRepo.findByOwnerId).not.toHaveBeenCalled();
    });

    it("échoue si le repo retourne null", async () => {
      mockRepo.findByOwnerId.mockResolvedValue([]);
      mockRepo.create.mockResolvedValue(null);

      const result = await service.createClub(validCreateData, "user-1");

      expect(result).toEqual({
        success: false,
        error: "Impossible de créer le club. Veuillez réessayer.",
      });
    });

    it("retourne le club créé en cas de succès", async () => {
      const club = makeClub();
      mockRepo.findByOwnerId.mockResolvedValue([]);
      mockRepo.create.mockResolvedValue(club);

      const result = await service.createClub(validCreateData, "user-1");

      expect(result).toEqual({ success: true, club });
    });
  });

  // ─── updateClub ─────────────────────────────────────────────────────────────

  describe("updateClub — validation", () => {
    it("échoue si le nom fourni est vide", async () => {
      const result = await service.updateClub("club-1", { name: "" });
      expect(result).toEqual({ success: false, error: "Club name cannot be empty" });
    });

    it("échoue si le nom dépasse 30 caractères", async () => {
      const result = await service.updateClub("club-1", { name: "A".repeat(31) });
      expect(result.success).toBe(false);
    });

    it("échoue si l'acronyme fourni est vide", async () => {
      const result = await service.updateClub("club-1", { acronym: "" });
      expect(result).toEqual({ success: false, error: "Club acronym cannot be empty" });
    });

    it("échoue si l'acronyme dépasse 5 caractères", async () => {
      const result = await service.updateClub("club-1", { acronym: "TOOLONG" });
      expect(result.success).toBe(false);
    });

    it("échoue si le repo retourne null", async () => {
      mockRepo.update.mockResolvedValue(null);
      const result = await service.updateClub("club-1", { name: "Nouveau Nom" });
      expect(result).toEqual({ success: false, error: "Failed to update club" });
    });

    it("retourne le club mis à jour", async () => {
      const club = makeClub({ name: "Nouveau Nom" });
      mockRepo.update.mockResolvedValue(club);
      const result = await service.updateClub("club-1", { name: "Nouveau Nom" });
      expect(result).toEqual({ success: true, club });
    });

    it("ne valide pas name/acronym s'ils ne sont pas fournis", async () => {
      const club = makeClub();
      mockRepo.update.mockResolvedValue(club);
      const result = await service.updateClub("club-1", {});
      expect(result.success).toBe(true);
    });
  });

  // ─── deleteClub ─────────────────────────────────────────────────────────────

  describe("deleteClub", () => {
    it("délègue au repository", async () => {
      mockRepo.delete.mockResolvedValue(true);
      expect(await service.deleteClub("club-1")).toBe(true);
      expect(mockRepo.delete).toHaveBeenCalledWith("club-1");
    });
  });

  // ─── lectures ────────────────────────────────────────────────────────────────

  describe("getClubById / getClubByCode / getUserClubs / getUserMemberClubs", () => {
    it("getClubById délègue au repo", async () => {
      mockRepo.findById.mockResolvedValue(makeClub());
      expect(await service.getClubById("club-1")).toMatchObject({ id: "club-1" });
    });

    it("getClubByCode délègue au repo", async () => {
      mockRepo.findByCode.mockResolvedValue(makeClub());
      expect(await service.getClubByCode("ABC12")).toMatchObject({ id: "club-1" });
    });

    it("getUserClubs délègue au repo", async () => {
      mockRepo.findByOwnerId.mockResolvedValue([makeClub()]);
      expect(await service.getUserClubs("user-1")).toHaveLength(1);
    });

    it("getUserMemberClubs délègue au repo", async () => {
      mockRepo.findByMemberId.mockResolvedValue([makeClub()]);
      expect(await service.getUserMemberClubs("user-1")).toHaveLength(1);
    });
  });

  // ─── updateSubscriptionTier ──────────────────────────────────────────────────

  describe("updateSubscriptionTier", () => {
    it("échoue si le repo retourne null", async () => {
      mockRepo.updateSubscriptionTier.mockResolvedValue(null);
      const result = await service.updateSubscriptionTier("club-1", "basic");
      expect(result).toEqual({
        success: false,
        error: "Échec de la mise à jour de l'abonnement",
      });
    });

    it("retourne le club mis à jour", async () => {
      const club = makeClub({ subscriptionTier: "basic" });
      mockRepo.updateSubscriptionTier.mockResolvedValue(club);
      const result = await service.updateSubscriptionTier("club-1", "basic");
      expect(result).toEqual({ success: true, club });
    });
  });
});
