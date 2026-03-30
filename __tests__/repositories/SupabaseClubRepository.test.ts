import { SupabaseClubRepository } from "../../repositories/SupabaseClubRepository";
import { DEFAULT_COURT_COLORS } from "../../src/theme/colors";
import { SubscriptionTier } from "../../models/Subscription";

// ─── Mock Supabase fluent API ─────────────────────────────────────────────────

// Supabase utilise un builder chaînable : .from().select().eq().single()
// On crée un seul objet qui retourne `this` sur chaque méthode de chaîne
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();

const queryBuilder: any = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
};

const mockGetUser = jest.fn();

const mockSupabase: any = {
  from: jest.fn().mockReturnValue(queryBuilder),
  auth: { getUser: mockGetUser },
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const dbRow = {
  id: "club-1",
  name: "Mon Club",
  acronym: "MC",
  code: "12345678",
  logo_url: null,
  primary_color: "#FF0000",
  secondary_color: "#0000FF",
  court_background_color: "#CCCCCC",
  court_line_color: "#333333",
  owner_id: "user-1",
  owner_email: "user@example.com",
  subscription_tier: "free",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Rétablir mockReturnThis après clearAllMocks
  queryBuilder.select.mockReturnThis();
  queryBuilder.insert.mockReturnThis();
  queryBuilder.update.mockReturnThis();
  queryBuilder.delete.mockReturnThis();
  queryBuilder.eq.mockReturnThis();
  queryBuilder.order.mockReturnThis();
  mockSupabase.from.mockReturnValue(queryBuilder);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SupabaseClubRepository", () => {
  let repo: SupabaseClubRepository;

  beforeEach(() => {
    repo = new SupabaseClubRepository(mockSupabase);
  });

  // ─── mapToClub (testé via findById) ──────────────────────────────────────────

  describe("mapToClub — mapping base → domaine", () => {
    it("convertit correctement les champs snake_case → camelCase", async () => {
      mockSingle.mockResolvedValue({ data: dbRow, error: null });

      const club = await repo.findById("club-1");

      expect(club).not.toBeNull();
      expect(club!.id).toBe("club-1");
      expect(club!.name).toBe("Mon Club");
      expect(club!.acronym).toBe("MC");
      expect(club!.ownerId).toBe("user-1");
      expect(club!.ownerEmail).toBe("user@example.com");
      expect(club!.primaryColor).toBe("#FF0000");
      expect(club!.secondaryColor).toBe("#0000FF");
      expect(club!.subscriptionTier).toBe("free");
    });

    it("utilise les couleurs de terrain du row si présentes", async () => {
      mockSingle.mockResolvedValue({ data: dbRow, error: null });

      const club = await repo.findById("club-1");

      expect(club!.courtBackgroundColor).toBe("#CCCCCC");
      expect(club!.courtLineColor).toBe("#333333");
    });

    it("utilise DEFAULT_COURT_COLORS si les couleurs sont absentes", async () => {
      const rowWithoutColors = { ...dbRow, court_background_color: null, court_line_color: null };
      mockSingle.mockResolvedValue({ data: rowWithoutColors, error: null });

      const club = await repo.findById("club-1");

      expect(club!.courtBackgroundColor).toBe(DEFAULT_COURT_COLORS.background);
      expect(club!.courtLineColor).toBe(DEFAULT_COURT_COLORS.line);
    });

    it("convertit created_at et updated_at en Date", async () => {
      mockSingle.mockResolvedValue({ data: dbRow, error: null });

      const club = await repo.findById("club-1");

      expect(club!.createdAt).toBeInstanceOf(Date);
      expect(club!.updatedAt).toBeInstanceOf(Date);
      expect(club!.createdAt.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    });
  });

  // ─── findById ────────────────────────────────────────────────────────────────

  describe("findById", () => {
    it("retourne le club mappé si trouvé", async () => {
      mockSingle.mockResolvedValue({ data: dbRow, error: null });

      const club = await repo.findById("club-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("clubs");
      expect(queryBuilder.eq).toHaveBeenCalledWith("id", "club-1");
      expect(club).not.toBeNull();
      expect(club!.id).toBe("club-1");
    });

    it("retourne null si non trouvé (erreur PGRST116)", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const club = await repo.findById("unknown");

      expect(club).toBeNull();
    });

    it("retourne null sur une autre erreur Supabase", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "500", message: "DB error" } });

      const club = await repo.findById("club-1");

      expect(club).toBeNull();
    });

    it("retourne null si une exception est levée", async () => {
      mockSingle.mockRejectedValue(new Error("Network error"));

      const club = await repo.findById("club-1");

      expect(club).toBeNull();
    });
  });

  // ─── findByCode ──────────────────────────────────────────────────────────────

  describe("findByCode", () => {
    it("retourne le club si trouvé par code", async () => {
      mockMaybeSingle.mockResolvedValue({ data: dbRow, error: null });

      const club = await repo.findByCode("12345678");

      expect(queryBuilder.eq).toHaveBeenCalledWith("code", "12345678");
      expect(club).not.toBeNull();
      expect(club!.code).toBe("12345678");
    });

    it("retourne null si aucun club avec ce code", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const club = await repo.findByCode("00000000");

      expect(club).toBeNull();
    });

    it("retourne null sur erreur", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "error" } });

      const club = await repo.findByCode("12345678");

      expect(club).toBeNull();
    });
  });

  // ─── findByOwnerId ───────────────────────────────────────────────────────────

  describe("findByOwnerId", () => {
    it("retourne un tableau de clubs pour l'owner", async () => {
      queryBuilder.order.mockResolvedValue({ data: [dbRow, { ...dbRow, id: "club-2" }], error: null });

      const clubs = await repo.findByOwnerId("user-1");

      expect(queryBuilder.eq).toHaveBeenCalledWith("owner_id", "user-1");
      expect(clubs).toHaveLength(2);
    });

    it("retourne un tableau vide si aucun club", async () => {
      queryBuilder.order.mockResolvedValue({ data: [], error: null });

      const clubs = await repo.findByOwnerId("user-1");

      expect(clubs).toEqual([]);
    });

    it("retourne un tableau vide sur erreur", async () => {
      queryBuilder.order.mockResolvedValue({ data: null, error: { message: "error" } });

      const clubs = await repo.findByOwnerId("user-1");

      expect(clubs).toEqual([]);
    });
  });

  // ─── findByMemberId ──────────────────────────────────────────────────────────

  describe("findByMemberId", () => {
    it("retourne les clubs dont l'utilisateur est membre", async () => {
      queryBuilder.order.mockResolvedValue({ data: [dbRow], error: null });

      const clubs = await repo.findByMemberId("user-1");

      expect(clubs).toHaveLength(1);
    });

    it("retourne un tableau vide sur erreur", async () => {
      queryBuilder.order.mockResolvedValue({ data: null, error: { message: "error" } });

      const clubs = await repo.findByMemberId("user-1");

      expect(clubs).toEqual([]);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("retourne le club mis à jour", async () => {
      const updatedRow = { ...dbRow, name: "Nouveau Nom" };
      mockSingle.mockResolvedValue({ data: updatedRow, error: null });

      const club = await repo.update("club-1", { name: "Nouveau Nom" });

      expect(queryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ name: "Nouveau Nom" }));
      expect(queryBuilder.eq).toHaveBeenCalledWith("id", "club-1");
      expect(club!.name).toBe("Nouveau Nom");
    });

    it("n'envoie que les champs définis (pas undefined)", async () => {
      mockSingle.mockResolvedValue({ data: dbRow, error: null });

      await repo.update("club-1", { name: "Test" });

      const updateCall = queryBuilder.update.mock.calls[0][0];
      expect(Object.keys(updateCall)).toEqual(["name"]);
    });

    it("mappe logoUrl → logo_url", async () => {
      mockSingle.mockResolvedValue({ data: dbRow, error: null });

      await repo.update("club-1", { logoUrl: "https://example.com/logo.png" });

      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ logo_url: "https://example.com/logo.png" })
      );
    });

    it("retourne null sur erreur", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "error" } });

      const result = await repo.update("club-1", { name: "Test" });

      expect(result).toBeNull();
    });
  });

  // ─── delete ──────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("retourne true si la suppression réussit", async () => {
      queryBuilder.eq.mockResolvedValueOnce({ error: null });

      const result = await repo.delete("club-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("clubs");
      expect(result).toBe(true);
    });

    it("retourne false sur erreur Supabase", async () => {
      queryBuilder.eq.mockResolvedValueOnce({ error: { message: "FK violation" } });

      const result = await repo.delete("club-1");

      expect(result).toBe(false);
    });

    it("retourne false si une exception est levée", async () => {
      queryBuilder.eq.mockRejectedValueOnce(new Error("Network error"));

      const result = await repo.delete("club-1");

      expect(result).toBe(false);
    });
  });

  // ─── updateSubscriptionTier ──────────────────────────────────────────────────

  describe("updateSubscriptionTier", () => {
    it("met à jour le subscription_tier et retourne le club", async () => {
      const updatedRow = { ...dbRow, subscription_tier: "ultimate" };
      mockSingle.mockResolvedValue({ data: updatedRow, error: null });

      const club = await repo.updateSubscriptionTier("club-1", "ultimate" as SubscriptionTier);

      expect(queryBuilder.update).toHaveBeenCalledWith({ subscription_tier: "ultimate" });
      expect(club!.subscriptionTier).toBe("ultimate");
    });

    it("retourne null sur erreur", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: "error" } });

      const result = await repo.updateSubscriptionTier("club-1", "free" as SubscriptionTier);

      expect(result).toBeNull();
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe("create", () => {
    const createData = {
      name: "Mon Club",
      acronym: "MC",
      primaryColor: "#FF0000",
      secondaryColor: "#0000FF",
      courtBackgroundColor: "#CCCCCC",
      courtLineColor: "#333333",
    };

    it("retourne null si l'utilisateur n'est pas authentifié", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await repo.create(createData);

      expect(result).toBeNull();
    });

    it("génère un code unique et insère le club", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "user@test.com" } } });
      // Pas de collision sur le code
      mockSingle
        .mockResolvedValueOnce({ data: null, error: null })   // vérification code → pas de collision
        .mockResolvedValueOnce({ data: dbRow, error: null });  // insert → succès

      const result = await repo.create(createData);

      expect(result).not.toBeNull();
      expect(result!.name).toBe("Mon Club");
    });

    it("réessaie si le code est déjà pris (collision)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "user@test.com" } } });
      mockSingle
        .mockResolvedValueOnce({ data: { code: "11111111" }, error: null }) // collision 1
        .mockResolvedValueOnce({ data: null, error: null })                  // code libre
        .mockResolvedValueOnce({ data: dbRow, error: null });                // insert

      const result = await repo.create(createData);

      expect(result).not.toBeNull();
      // 2 appels de vérification de code + 1 insert = 3 appels à single
      expect(mockSingle).toHaveBeenCalledTimes(3);
    });

    it("retourne null si l'insert Supabase échoue", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "user@test.com" } } });
      mockSingle
        .mockResolvedValueOnce({ data: null, error: null })           // code libre
        .mockResolvedValueOnce({ data: null, error: { message: "Insert error" } }); // insert fail

      const result = await repo.create(createData);

      expect(result).toBeNull();
    });
  });
});
