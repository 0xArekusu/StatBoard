/**
 * Tests pour teamNameResolver
 *
 * Note : teamNameCache est un Map module-level qui persiste entre les tests.
 * On utilise des UUIDs uniques par test pour éviter les collisions de cache.
 */

const VALID_UUID_1 = "11111111-1111-1111-1111-111111111111";
const VALID_UUID_2 = "22222222-2222-2222-2222-222222222222";
const VALID_UUID_3 = "33333333-3333-3333-3333-333333333333";
const VALID_UUID_ERROR = "44444444-4444-4444-4444-444444444444";
const VALID_UUID_NULL = "55555555-5555-5555-5555-555555555555";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

const mockSupabase: any = {
  from: mockFrom,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("isUUID", () => {
  let isUUID: (value: string) => boolean;

  beforeAll(() => {
    ({ isUUID } = require("../../src/utils/teamNameResolver"));
  });

  it("reconnaît un UUID valide (lowercase)", () => {
    expect(isUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("reconnaît un UUID valide (uppercase)", () => {
    expect(isUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("retourne false pour un nom d'équipe ordinaire", () => {
    expect(isUUID("Lions de Paris")).toBe(false);
  });

  it("retourne false pour une chaîne vide", () => {
    expect(isUUID("")).toBe(false);
  });

  it("retourne false si le format UUID est presque correct mais invalide", () => {
    expect(isUUID("550e8400-e29b-41d4-a716-44665544000")).toBe(false); // trop court
  });
});

describe("resolveTeamName", () => {
  let resolveTeamName: (id: string, supabase: any) => Promise<string>;

  beforeAll(() => {
    ({ resolveTeamName } = require("../../src/utils/teamNameResolver"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it("retourne le nom tel quel si ce n'est pas un UUID", async () => {
    const result = await resolveTeamName("Lions de Paris", mockSupabase);

    expect(result).toBe("Lions de Paris");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("résout un UUID en nom depuis Supabase", async () => {
    mockSingle.mockResolvedValue({ data: { name: "Phoenix Suns" }, error: null });

    const result = await resolveTeamName(VALID_UUID_1, mockSupabase);

    expect(result).toBe("Phoenix Suns");
    expect(mockFrom).toHaveBeenCalledWith("teams");
  });

  it("utilise le cache pour les requêtes répétées (même UUID)", async () => {
    // VALID_UUID_1 est déjà en cache depuis le test précédent
    mockSingle.mockResolvedValue({ data: { name: "Should not be called" }, error: null });

    const result = await resolveTeamName(VALID_UUID_1, mockSupabase);

    expect(result).toBe("Phoenix Suns"); // valeur du cache
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it("retourne l'UUID en fallback si Supabase retourne une erreur", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const result = await resolveTeamName(VALID_UUID_ERROR, mockSupabase);

    expect(result).toBe(VALID_UUID_ERROR);
  });

  it("retourne l'UUID en fallback si data est null", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const result = await resolveTeamName(VALID_UUID_NULL, mockSupabase);

    expect(result).toBe(VALID_UUID_NULL);
  });

  it("retourne l'UUID en fallback si une exception est levée", async () => {
    mockSingle.mockRejectedValue(new Error("Network error"));

    const result = await resolveTeamName(VALID_UUID_2, mockSupabase);

    expect(result).toBe(VALID_UUID_2);
  });

  it("résout correctement un second UUID différent", async () => {
    mockSingle.mockResolvedValue({ data: { name: "Chicago Bulls" }, error: null });

    const result = await resolveTeamName(VALID_UUID_3, mockSupabase);

    expect(result).toBe("Chicago Bulls");
    expect(mockSingle).toHaveBeenCalledTimes(1);
  });
});
