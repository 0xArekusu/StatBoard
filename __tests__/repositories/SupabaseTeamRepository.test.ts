import { SupabaseTeamRepository } from "../../repositories/SupabaseTeamRepository";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeRow = (overrides: any = {}) => ({
  id: "team-1",
  name: "Les Lions",
  club_id: "club-1",
  owner_id: "user-1",
  owner_email: "owner@example.com",
  club_members: null,
  category: "U18",
  gender: "male",
  coach_name: "Coach Martin",
  coach_photo_url: null,
  status: "approved",
  is_active: true,
  is_deleted: false,
  deleted_at: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
  ...overrides,
});

// ─── Mock ─────────────────────────────────────────────────────────────────────

const mockSingle = jest.fn();
const mockGetUser = jest.fn();

const queryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: mockSingle,
};

const mockSupabase: any = {
  from: jest.fn().mockReturnValue(queryBuilder),
  auth: { getUser: mockGetUser },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SupabaseTeamRepository", () => {
  let repo: SupabaseTeamRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.from.mockReturnValue(queryBuilder);
    queryBuilder.select.mockReturnThis();
    queryBuilder.insert.mockReturnThis();
    queryBuilder.update.mockReturnThis();
    queryBuilder.delete.mockReturnThis();
    queryBuilder.eq.mockReturnThis();
    queryBuilder.in.mockReturnThis();
    queryBuilder.order.mockReturnThis();
    repo = new SupabaseTeamRepository(mockSupabase);
  });

  // ─── mapToTeam ──────────────────────────────────────────────────────────────

  describe("mapToTeam (via findById)", () => {
    it("mappe correctement les champs snake_case → camelCase", async () => {
      mockSingle.mockResolvedValue({ data: makeRow(), error: null });

      const result = await repo.findById("team-1");

      expect(result).toMatchObject({
        id: "team-1",
        name: "Les Lions",
        clubId: "club-1",
        ownerId: "user-1",
        ownerEmail: "owner@example.com",
        category: "U18",
        gender: "male",
        coachName: "Coach Martin",
        status: "approved",
        isActive: true,
        isDeleted: false,
      });
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
      expect(result?.deletedAt).toBeUndefined();
    });

    it("utilise club_members.email en priorité sur owner_email", async () => {
      mockSingle.mockResolvedValue({
        data: makeRow({
          club_members: { email: "member@example.com" },
          owner_email: "owner@example.com",
        }),
        error: null,
      });

      const result = await repo.findById("team-1");

      expect(result?.ownerEmail).toBe("member@example.com");
    });

    it("convertit deleted_at en Date si présent", async () => {
      mockSingle.mockResolvedValue({
        data: makeRow({ is_deleted: true, deleted_at: "2024-06-01T00:00:00Z" }),
        error: null,
      });

      const result = await repo.findById("team-1");

      expect(result?.isDeleted).toBe(true);
      expect(result?.deletedAt).toBeInstanceOf(Date);
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("crée une équipe avec le statut pending", async () => {
      mockSingle.mockResolvedValue({ data: makeRow({ status: "pending" }), error: null });

      const result = await repo.create(
        { name: "Les Lions", clubId: "club-1", gender: "male", category: "U18" },
        "user-1"
      );

      expect(result?.status).toBe("pending");
      expect(queryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Les Lions",
          club_id: "club-1",
          owner_id: "user-1",
          status: "pending",
          gender: "male",
        })
      );
    });

    it("utilise 'Coach' par défaut si coachName absent", async () => {
      mockSingle.mockResolvedValue({ data: makeRow(), error: null });

      await repo.create({ name: "Les Lions", clubId: "club-1", gender: "male" }, "user-1");

      expect(queryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ coach_name: "Coach" })
      );
    });

    it("retourne null en cas d'erreur", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await repo.create(
        { name: "Les Lions", clubId: "club-1", gender: "male" },
        "user-1"
      );

      expect(result).toBeNull();
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe("findById", () => {
    it("retourne l'équipe si trouvée", async () => {
      mockSingle.mockResolvedValue({ data: makeRow(), error: null });

      const result = await repo.findById("team-1");

      expect(result?.id).toBe("team-1");
      expect(queryBuilder.eq).toHaveBeenCalledWith("id", "team-1");
    });

    it("retourne null si non trouvée", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const result = await repo.findById("unknown");

      expect(result).toBeNull();
    });
  });

  // ─── findByClubId ───────────────────────────────────────────────────────────

  describe("findByClubId", () => {
    it("retourne les équipes avec player count", async () => {
      const rows = [
        makeRow({ id: "t1", players: [{ count: 12 }] }),
        makeRow({ id: "t2", players: [{ count: 5 }] }),
      ];
      queryBuilder.order.mockResolvedValue({ data: rows, error: null });

      const result = await repo.findByClubId("club-1");

      expect(result).toHaveLength(2);
      expect((result[0] as any).playerCount).toBe(12);
      expect((result[1] as any).playerCount).toBe(5);
      expect(queryBuilder.eq).toHaveBeenCalledWith("club_id", "club-1");
      expect(queryBuilder.eq).toHaveBeenCalledWith("is_deleted", false);
    });

    it("playerCount vaut 0 si players est absent", async () => {
      queryBuilder.order.mockResolvedValue({
        data: [makeRow({ players: null })],
        error: null,
      });

      const result = await repo.findByClubId("club-1");

      expect((result[0] as any).playerCount).toBe(0);
    });

    it("retourne [] en cas d'erreur", async () => {
      queryBuilder.order.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await repo.findByClubId("club-1");

      expect(result).toEqual([]);
    });
  });

  // ─── findByClubIdAndStatus ──────────────────────────────────────────────────

  describe("findByClubIdAndStatus", () => {
    const teamsQueryBuilder: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn(),
    };
    const membersQueryBuilder: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn(),
    };

    beforeEach(() => {
      teamsQueryBuilder.select.mockReturnThis();
      teamsQueryBuilder.eq.mockReturnThis();
      membersQueryBuilder.select.mockReturnThis();
      membersQueryBuilder.eq.mockReturnThis();

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "club_members") return membersQueryBuilder;
        return teamsQueryBuilder;
      });
    });

    it("retourne [] si aucune équipe ne correspond au statut", async () => {
      teamsQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const result = await repo.findByClubIdAndStatus("club-1", "pending");

      expect(result).toEqual([]);
    });

    it("fusionne les emails des propriétaires depuis club_members", async () => {
      const teams = [makeRow({ id: "t1", owner_id: "user-1", owner_email: undefined })];
      teamsQueryBuilder.order.mockResolvedValue({ data: teams, error: null });
      membersQueryBuilder.in.mockResolvedValue({
        data: [{ user_id: "user-1", email: "owner@example.com" }],
        error: null,
      });

      const result = await repo.findByClubIdAndStatus("club-1", "pending");

      expect(result[0].ownerEmail).toBe("owner@example.com");
    });

    it("retourne les équipes sans email si club_members échoue", async () => {
      const teams = [makeRow({ id: "t1" })];
      teamsQueryBuilder.order.mockResolvedValue({ data: teams, error: null });
      membersQueryBuilder.in.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      });

      const result = await repo.findByClubIdAndStatus("club-1", "pending");

      expect(result).toHaveLength(1);
    });

    it("retourne [] en cas d'erreur sur la requête teams", async () => {
      teamsQueryBuilder.order.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await repo.findByClubIdAndStatus("club-1", "pending");

      expect(result).toEqual([]);
    });
  });

  // ─── findByOwnerId ──────────────────────────────────────────────────────────

  describe("findByOwnerId", () => {
    it("retourne les équipes de l'utilisateur (hors supprimées)", async () => {
      queryBuilder.order.mockResolvedValue({
        data: [makeRow({ id: "t1" }), makeRow({ id: "t2" })],
        error: null,
      });

      const result = await repo.findByOwnerId("user-1");

      expect(result).toHaveLength(2);
      expect(queryBuilder.eq).toHaveBeenCalledWith("owner_id", "user-1");
      expect(queryBuilder.eq).toHaveBeenCalledWith("is_deleted", false);
    });

    it("retourne [] en cas d'erreur", async () => {
      queryBuilder.order.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await repo.findByOwnerId("user-1");

      expect(result).toEqual([]);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe("update", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    });

    it("retourne l'équipe mise à jour", async () => {
      const currentTeam = makeRow();
      const updatedTeam = makeRow({ name: "Les Tigres" });
      // 1. findById (currentTeam) 2. update single
      mockSingle
        .mockResolvedValueOnce({ data: currentTeam, error: null })
        .mockResolvedValueOnce({ data: updatedTeam, error: null });

      const result = await repo.update("team-1", { name: "Les Tigres" });

      expect(result?.name).toBe("Les Tigres");
      expect(queryBuilder.update).toHaveBeenCalledWith({ name: "Les Tigres" });
      expect(queryBuilder.eq).toHaveBeenCalledWith("id", "team-1");
    });

    it("n'inclut que les champs fournis dans updateData", async () => {
      mockSingle
        .mockResolvedValueOnce({ data: makeRow(), error: null })
        .mockResolvedValueOnce({ data: makeRow({ is_active: false }), error: null });

      await repo.update("team-1", { isActive: false });

      expect(queryBuilder.update).toHaveBeenCalledWith({ is_active: false });
    });

    it("retourne null en cas d'erreur Supabase", async () => {
      // 1. findById (currentTeam) 2. update fails 3. findById (verify)
      mockSingle
        .mockResolvedValueOnce({ data: makeRow(), error: null })
        .mockResolvedValueOnce({ data: null, error: { message: "DB error" } })
        .mockResolvedValueOnce({ data: makeRow(), error: null });

      const result = await repo.update("team-1", { name: "Les Tigres" });

      expect(result).toBeNull();
    });

    it("appelle auth.getUser pour le log de diagnostic", async () => {
      mockSingle
        .mockResolvedValueOnce({ data: makeRow(), error: null })
        .mockResolvedValueOnce({ data: makeRow(), error: null });

      await repo.update("team-1", { name: "Test" });

      expect(mockGetUser).toHaveBeenCalled();
    });
  });

  // ─── delete (soft) ──────────────────────────────────────────────────────────

  describe("delete (soft delete)", () => {
    it("retourne true si au moins une ligne est affectée", async () => {
      queryBuilder.select.mockResolvedValueOnce({
        data: [makeRow({ is_deleted: true })],
        error: null,
      });

      const result = await repo.delete("team-1");

      expect(result).toBe(true);
      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_deleted: true })
      );
      expect(queryBuilder.eq).toHaveBeenCalledWith("id", "team-1");
    });

    it("retourne false si data est vide (aucune ligne affectée)", async () => {
      queryBuilder.select.mockResolvedValueOnce({ data: [], error: null });

      const result = await repo.delete("team-1");

      expect(result).toBe(false);
    });

    it("retourne false en cas d'erreur Supabase", async () => {
      queryBuilder.select.mockResolvedValueOnce({ data: null, error: { message: "DB error" } });

      const result = await repo.delete("team-1");

      expect(result).toBe(false);
    });
  });

  // ─── countByOwnerAndClub ────────────────────────────────────────────────────

  describe("countByOwnerAndClub", () => {
    // The chain is: .select().eq(ownerId).eq(clubId).eq(isDeleted)
    // First two eq calls must return `this` for chaining; third resolves.
    const setupCountMock = (resolved: { count: number | null; error: any }) => {
      queryBuilder.eq
        .mockReturnValueOnce(queryBuilder)
        .mockReturnValueOnce(queryBuilder)
        .mockResolvedValueOnce(resolved);
    };

    it("retourne le nombre d'équipes", async () => {
      setupCountMock({ count: 3, error: null });

      const result = await repo.countByOwnerAndClub("user-1", "club-1");

      expect(result).toBe(3);
      expect(queryBuilder.select).toHaveBeenCalledWith("*", { count: "exact", head: true });
      expect(queryBuilder.eq).toHaveBeenCalledWith("owner_id", "user-1");
      expect(queryBuilder.eq).toHaveBeenCalledWith("club_id", "club-1");
      expect(queryBuilder.eq).toHaveBeenCalledWith("is_deleted", false);
    });

    it("retourne 0 si count est null", async () => {
      setupCountMock({ count: null, error: null });

      const result = await repo.countByOwnerAndClub("user-1", "club-1");

      expect(result).toBe(0);
    });

    it("retourne 0 en cas d'erreur", async () => {
      setupCountMock({ count: null, error: { message: "DB error" } });

      const result = await repo.countByOwnerAndClub("user-1", "club-1");

      expect(result).toBe(0);
    });
  });
});
