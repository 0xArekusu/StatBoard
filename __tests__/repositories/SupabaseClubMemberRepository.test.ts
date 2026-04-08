import { SupabaseClubMemberRepository } from "../../repositories/SupabaseClubMemberRepository";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeRow = (overrides: any = {}) => ({
  id: "member-1",
  club_id: "club-1",
  user_id: "user-1",
  email: "user@example.com",
  display_name: "John Doe",
  joined_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

// ─── Mock ─────────────────────────────────────────────────────────────────────

const mockSingle = jest.fn();

const queryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: mockSingle,
};

const mockSupabase: any = {
  from: jest.fn().mockReturnValue(queryBuilder),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SupabaseClubMemberRepository", () => {
  let repo: SupabaseClubMemberRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.from.mockReturnValue(queryBuilder);
    repo = new SupabaseClubMemberRepository(mockSupabase);
  });

  // ─── mapToClubMember ────────────────────────────────────────────────────────

  describe("mapToClubMember (via create)", () => {
    it("mappe correctement les champs snake_case → camelCase", async () => {
      mockSingle.mockResolvedValue({ data: makeRow(), error: null });

      const result = await repo.create({
        clubId: "club-1",
        userId: "user-1",
        email: "user@example.com",
        displayName: "John Doe",
      });

      expect(result).toMatchObject({
        id: "member-1",
        clubId: "club-1",
        userId: "user-1",
        email: "user@example.com",
        displayName: "John Doe",
      });
      expect(result?.joinedAt).toBeInstanceOf(Date);
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("retourne le membre créé", async () => {
      mockSingle.mockResolvedValue({ data: makeRow(), error: null });

      const result = await repo.create({
        clubId: "club-1",
        userId: "user-1",
        email: "user@example.com",
        displayName: "John Doe",
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe("member-1");
      expect(mockSupabase.from).toHaveBeenCalledWith("club_members");
      expect(queryBuilder.insert).toHaveBeenCalledWith({
        club_id: "club-1",
        user_id: "user-1",
        email: "user@example.com",
        display_name: "John Doe",
      });
    });

    it("retourne null en cas d'erreur Supabase", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await repo.create({
        clubId: "club-1",
        userId: "user-1",
        email: "user@example.com",
      });

      expect(result).toBeNull();
    });
  });

  // ─── findByClubId ───────────────────────────────────────────────────────────

  describe("findByClubId", () => {
    it("retourne tous les membres du club", async () => {
      const rows = [makeRow({ id: "m1" }), makeRow({ id: "m2" })];
      queryBuilder.order.mockResolvedValue({ data: rows, error: null });

      const result = await repo.findByClubId("club-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("m1");
      expect(queryBuilder.eq).toHaveBeenCalledWith("club_id", "club-1");
      expect(queryBuilder.order).toHaveBeenCalledWith("joined_at", { ascending: false });
    });

    it("retourne [] en cas d'erreur", async () => {
      queryBuilder.order.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await repo.findByClubId("club-1");

      expect(result).toEqual([]);
    });
  });

  // ─── findByUserId ───────────────────────────────────────────────────────────

  describe("findByUserId", () => {
    it("retourne tous les clubs d'un utilisateur", async () => {
      const rows = [
        makeRow({ id: "m1", club_id: "club-1" }),
        makeRow({ id: "m2", club_id: "club-2" }),
      ];
      queryBuilder.order.mockResolvedValue({ data: rows, error: null });

      const result = await repo.findByUserId("user-1");

      expect(result).toHaveLength(2);
      expect(result[1].clubId).toBe("club-2");
      expect(queryBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(queryBuilder.order).toHaveBeenCalledWith("joined_at", { ascending: false });
    });

    it("retourne [] en cas d'erreur", async () => {
      queryBuilder.order.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await repo.findByUserId("user-1");

      expect(result).toEqual([]);
    });
  });

  // ─── findByClubAndUser ──────────────────────────────────────────────────────

  describe("findByClubAndUser", () => {
    it("retourne le membre si la combinaison club+user existe", async () => {
      mockSingle.mockResolvedValue({ data: makeRow(), error: null });

      const result = await repo.findByClubAndUser("club-1", "user-1");

      expect(result?.clubId).toBe("club-1");
      expect(result?.userId).toBe("user-1");
      expect(queryBuilder.eq).toHaveBeenCalledWith("club_id", "club-1");
      expect(queryBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
    });

    it("retourne null si non trouvé", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const result = await repo.findByClubAndUser("club-1", "unknown-user");

      expect(result).toBeNull();
    });

    it("retourne null si data est null sans erreur", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      const result = await repo.findByClubAndUser("club-1", "user-1");

      expect(result).toBeNull();
    });
  });

  // ─── delete ─────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("retourne true en cas de succès", async () => {
      queryBuilder.eq.mockResolvedValue({ error: null });

      const result = await repo.delete("member-1");

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("club_members");
      expect(queryBuilder.delete).toHaveBeenCalled();
      expect(queryBuilder.eq).toHaveBeenCalledWith("id", "member-1");
    });

    it("retourne false en cas d'erreur", async () => {
      queryBuilder.eq.mockResolvedValue({ error: { message: "DB error" } });

      const result = await repo.delete("member-1");

      expect(result).toBe(false);
    });
  });
});
