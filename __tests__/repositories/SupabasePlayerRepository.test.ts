import { SupabasePlayerRepository } from "../../repositories/SupabasePlayerRepository";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeRow = (overrides: any = {}) => ({
  id: "player-1",
  team_id: "team-1",
  name: "John Doe",
  jersey_number: 10,
  photo_url: "https://example.com/photo.jpg",
  license_number: "LIC-001",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
  ...overrides,
});

// ─── Mock ─────────────────────────────────────────────────────────────────────

const mockSingle = jest.fn();

const queryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: mockSingle,
};

const mockSupabase: any = {
  from: jest.fn().mockReturnValue(queryBuilder),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SupabasePlayerRepository", () => {
  let repo: SupabasePlayerRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.from.mockReturnValue(queryBuilder);
    repo = new SupabasePlayerRepository(mockSupabase);
  });

  // ─── mapToPlayer ────────────────────────────────────────────────────────────

  describe("mapToPlayer (via create)", () => {
    it("mappe correctement les champs snake_case → camelCase", async () => {
      mockSingle.mockResolvedValue({ data: makeRow(), error: null });

      const result = await repo.create({
        teamId: "team-1",
        name: "John Doe",
        jerseyNumber: 10,
        photoUrl: "https://example.com/photo.jpg",
      });

      expect(result).toMatchObject({
        id: "player-1",
        teamId: "team-1",
        name: "John Doe",
        jerseyNumber: 10,
        photoUrl: "https://example.com/photo.jpg",
        licenseNumber: "LIC-001",
      });
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it("licenseNumber est undefined si null dans la DB", async () => {
      mockSingle.mockResolvedValue({
        data: makeRow({ license_number: null }),
        error: null,
      });

      const result = await repo.create({
        teamId: "team-1",
        name: "John Doe",
        jerseyNumber: 10,
      });

      expect(result?.licenseNumber).toBeUndefined();
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("retourne le joueur créé", async () => {
      mockSingle.mockResolvedValue({ data: makeRow(), error: null });

      const result = await repo.create({
        teamId: "team-1",
        name: "John Doe",
        jerseyNumber: 10,
        photoUrl: "https://example.com/photo.jpg",
        licenseNumber: "LIC-001",
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe("player-1");
      expect(mockSupabase.from).toHaveBeenCalledWith("players");
      expect(queryBuilder.insert).toHaveBeenCalledWith({
        team_id: "team-1",
        name: "John Doe",
        jersey_number: 10,
        photo_url: "https://example.com/photo.jpg",
        license_number: "LIC-001",
      });
    });

    it("retourne null si Supabase retourne une erreur", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await repo.create({
        teamId: "team-1",
        name: "John Doe",
        jerseyNumber: 10,
      });

      expect(result).toBeNull();
    });

    it("passe license_number=null quand licenseNumber est absent", async () => {
      mockSingle.mockResolvedValue({ data: makeRow({ license_number: null }), error: null });

      await repo.create({ teamId: "team-1", name: "John Doe", jerseyNumber: 10 });

      expect(queryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ license_number: null })
      );
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("retourne le joueur mis à jour", async () => {
      const updated = makeRow({ name: "Jane Doe" });
      mockSingle.mockResolvedValue({ data: updated, error: null });

      const result = await repo.update("player-1", { name: "Jane Doe" });

      expect(result?.name).toBe("Jane Doe");
      expect(queryBuilder.update).toHaveBeenCalledWith({ name: "Jane Doe" });
      expect(queryBuilder.eq).toHaveBeenCalledWith("id", "player-1");
    });

    it("n'inclut que les champs fournis dans updateData", async () => {
      mockSingle.mockResolvedValue({ data: makeRow(), error: null });

      await repo.update("player-1", { jerseyNumber: 7 });

      expect(queryBuilder.update).toHaveBeenCalledWith({ jersey_number: 7 });
    });

    it("met license_number à null quand licenseNumber est une chaîne vide", async () => {
      mockSingle.mockResolvedValue({ data: makeRow({ license_number: null }), error: null });

      await repo.update("player-1", { licenseNumber: "" });

      expect(queryBuilder.update).toHaveBeenCalledWith({ license_number: null });
    });

    it("retourne null en cas d'erreur", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await repo.update("player-1", { name: "Jane" });

      expect(result).toBeNull();
    });
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe("findById", () => {
    it("retourne le joueur si trouvé", async () => {
      mockSingle.mockResolvedValue({ data: makeRow(), error: null });

      const result = await repo.findById("player-1");

      expect(result?.id).toBe("player-1");
      expect(queryBuilder.eq).toHaveBeenCalledWith("id", "player-1");
    });

    it("retourne null si non trouvé", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const result = await repo.findById("unknown");

      expect(result).toBeNull();
    });
  });

  // ─── findByTeamId ───────────────────────────────────────────────────────────

  describe("findByTeamId", () => {
    it("retourne la liste de joueurs de l'équipe", async () => {
      const rows = [makeRow({ id: "p1" }), makeRow({ id: "p2" })];
      queryBuilder.order.mockResolvedValue({ data: rows, error: null });

      const result = await repo.findByTeamId("team-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("p1");
      expect(queryBuilder.eq).toHaveBeenCalledWith("team_id", "team-1");
      expect(queryBuilder.order).toHaveBeenCalledWith("created_at", { ascending: true });
    });

    it("retourne [] en cas d'erreur", async () => {
      queryBuilder.order.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await repo.findByTeamId("team-1");

      expect(result).toEqual([]);
    });
  });

  // ─── delete ─────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("retourne true en cas de succès", async () => {
      queryBuilder.eq.mockResolvedValue({ error: null });

      const result = await repo.delete("player-1");

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("players");
      expect(queryBuilder.delete).toHaveBeenCalled();
    });

    it("retourne false en cas d'erreur", async () => {
      queryBuilder.eq.mockResolvedValue({ error: { message: "DB error" } });

      const result = await repo.delete("player-1");

      expect(result).toBe(false);
    });
  });

  // ─── countByTeamId ──────────────────────────────────────────────────────────

  describe("countByTeamId", () => {
    it("retourne le nombre de joueurs", async () => {
      queryBuilder.eq.mockResolvedValue({ count: 12, error: null });

      const result = await repo.countByTeamId("team-1");

      expect(result).toBe(12);
      expect(queryBuilder.select).toHaveBeenCalledWith("*", { count: "exact", head: true });
    });

    it("retourne 0 si count est null", async () => {
      queryBuilder.eq.mockResolvedValue({ count: null, error: null });

      const result = await repo.countByTeamId("team-1");

      expect(result).toBe(0);
    });

    it("retourne 0 en cas d'erreur", async () => {
      queryBuilder.eq.mockResolvedValue({ count: null, error: { message: "DB error" } });

      const result = await repo.countByTeamId("team-1");

      expect(result).toBe(0);
    });
  });
});
