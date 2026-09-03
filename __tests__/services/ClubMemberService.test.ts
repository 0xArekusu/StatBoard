import { ClubMemberService } from "../../services/ClubMemberService";
import i18n from "../../src/i18n";

// These tests assert French copy directly, so pin the language regardless of
// the device locale the test environment resolves (jest-expo mocks it to "en").
beforeAll(async () => {
  await i18n.changeLanguage("fr");
});

// ─── Mock repository ──────────────────────────────────────────────────────────

const mockRepo = {
  findByClubAndUser: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  findByClubId: jest.fn(),
  findByUserId: jest.fn(),
};

// ─── Fixture ─────────────────────────────────────────────────────────────────

const makeMember = (overrides: any = {}) => ({
  id: "member-1",
  clubId: "club-1",
  userId: "user-1",
  email: "user@example.com",
  joinedAt: new Date(),
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ClubMemberService", () => {
  let service: ClubMemberService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClubMemberService(mockRepo as any);
  });

  // ─── joinClub ───────────────────────────────────────────────────────────────

  describe("joinClub", () => {
    it("échoue si l'utilisateur est déjà membre", async () => {
      mockRepo.findByClubAndUser.mockResolvedValue(makeMember());

      const result = await service.joinClub("club-1", "user-1", "user@example.com");

      expect(result).toEqual({ success: false, error: "Vous êtes déjà membre de ce club" });
    });

    it("échoue si le repo create retourne null", async () => {
      mockRepo.findByClubAndUser.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(null);

      const result = await service.joinClub("club-1", "user-1", "user@example.com");

      expect(result).toEqual({ success: false, error: "Erreur lors de l'inscription au club" });
    });

    it("crée le membre et retourne success", async () => {
      const member = makeMember();
      mockRepo.findByClubAndUser.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(member);

      const result = await service.joinClub("club-1", "user-1", "user@example.com", "John");

      expect(result).toEqual({ success: true, member });
      expect(mockRepo.create).toHaveBeenCalledWith({
        clubId: "club-1",
        userId: "user-1",
        email: "user@example.com",
        displayName: "John",
      });
    });
  });

  // ─── leaveClub ──────────────────────────────────────────────────────────────

  describe("leaveClub", () => {
    it("échoue si l'utilisateur n'est pas membre", async () => {
      mockRepo.findByClubAndUser.mockResolvedValue(null);

      const result = await service.leaveClub("club-1", "user-1");

      expect(result).toEqual({ success: false, error: "Vous n'êtes pas membre de ce club" });
    });

    it("échoue si delete retourne false", async () => {
      mockRepo.findByClubAndUser.mockResolvedValue(makeMember());
      mockRepo.delete.mockResolvedValue(false);

      const result = await service.leaveClub("club-1", "user-1");

      expect(result).toEqual({ success: false, error: "Erreur lors de la sortie du club" });
    });

    it("supprime avec l'ID du membre et retourne success", async () => {
      const member = makeMember({ id: "member-42" });
      mockRepo.findByClubAndUser.mockResolvedValue(member);
      mockRepo.delete.mockResolvedValue(true);

      const result = await service.leaveClub("club-1", "user-1");

      expect(result).toEqual({ success: true });
      expect(mockRepo.delete).toHaveBeenCalledWith("member-42");
    });
  });

  // ─── getClubMembers ─────────────────────────────────────────────────────────

  describe("getClubMembers", () => {
    it("délègue au repository", async () => {
      const members = [makeMember()];
      mockRepo.findByClubId.mockResolvedValue(members);

      const result = await service.getClubMembers("club-1");

      expect(result).toBe(members);
      expect(mockRepo.findByClubId).toHaveBeenCalledWith("club-1");
    });
  });

  // ─── getUserClubMemberships ──────────────────────────────────────────────────

  describe("getUserClubMemberships", () => {
    it("délègue au repository", async () => {
      const memberships = [makeMember()];
      mockRepo.findByUserId.mockResolvedValue(memberships);

      const result = await service.getUserClubMemberships("user-1");

      expect(result).toBe(memberships);
      expect(mockRepo.findByUserId).toHaveBeenCalledWith("user-1");
    });
  });

  // ─── isMember ───────────────────────────────────────────────────────────────

  describe("isMember", () => {
    it("retourne true si l'utilisateur est membre", async () => {
      mockRepo.findByClubAndUser.mockResolvedValue(makeMember());

      expect(await service.isMember("club-1", "user-1")).toBe(true);
    });

    it("retourne false si l'utilisateur n'est pas membre", async () => {
      mockRepo.findByClubAndUser.mockResolvedValue(null);

      expect(await service.isMember("club-1", "user-1")).toBe(false);
    });
  });
});
