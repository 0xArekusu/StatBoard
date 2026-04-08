import { getSignedUrl, getSignedUrls } from "../../utils/storageHelper";

// ─── Mock Supabase client ─────────────────────────────────────────────────────

const mockCreateSignedUrl = jest.fn();

const mockSupabase = {
  storage: {
    from: jest.fn().mockReturnValue({
      createSignedUrl: mockCreateSignedUrl,
    }),
  },
} as any;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── getSignedUrl ─────────────────────────────────────────────────────────────

describe("getSignedUrl", () => {
  it("retourne null si path est null", async () => {
    expect(await getSignedUrl(mockSupabase, null)).toBeNull();
  });

  it("retourne null si path est undefined", async () => {
    expect(await getSignedUrl(mockSupabase, undefined)).toBeNull();
  });

  it("retourne null si path est une chaîne vide", async () => {
    expect(await getSignedUrl(mockSupabase, "")).toBeNull();
  });

  it("retourne l'URL telle quelle si elle commence par https://", async () => {
    const url = "https://example.com/image.jpg";
    expect(await getSignedUrl(mockSupabase, url)).toBe(url);
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("retourne l'URL telle quelle si elle commence par http://", async () => {
    const url = "http://localhost/image.jpg";
    expect(await getSignedUrl(mockSupabase, url)).toBe(url);
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("retourne l'URI telle quelle si elle commence par file://", async () => {
    const uri = "file:///local/image.jpg";
    expect(await getSignedUrl(mockSupabase, uri)).toBe(uri);
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it("appelle Supabase storage pour un path relatif et retourne la signedUrl", async () => {
    const signedUrl = "https://supabase.co/signed/image.jpg?token=abc";
    mockCreateSignedUrl.mockResolvedValueOnce({ data: { signedUrl }, error: null });

    const result = await getSignedUrl(mockSupabase, "club-123/logo.jpg");

    expect(mockSupabase.storage.from).toHaveBeenCalledWith("clubs");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("club-123/logo.jpg", 7200);
    expect(result).toBe(signedUrl);
  });

  it("retourne null si Supabase retourne une erreur", async () => {
    mockCreateSignedUrl.mockResolvedValueOnce({
      data: null,
      error: new Error("Storage error"),
    });

    expect(await getSignedUrl(mockSupabase, "club-123/logo.jpg")).toBeNull();
  });

  it("retourne null si createSignedUrl lève une exception", async () => {
    mockCreateSignedUrl.mockRejectedValueOnce(new Error("Network error"));

    expect(await getSignedUrl(mockSupabase, "club-123/logo.jpg")).toBeNull();
  });
});

// ─── getSignedUrls ────────────────────────────────────────────────────────────

describe("getSignedUrls", () => {
  it("retourne un tableau vide pour un tableau vide", async () => {
    expect(await getSignedUrls(mockSupabase, [])).toEqual([]);
  });

  it("retourne null pour chaque path null/undefined/vide", async () => {
    const result = await getSignedUrls(mockSupabase, [null, undefined, ""]);
    expect(result).toEqual([null, null, null]);
  });

  it("traite les paths en parallèle et retourne les URLs signées", async () => {
    const signed1 = "https://supabase.co/signed/logo1.jpg";
    const signed2 = "https://supabase.co/signed/logo2.jpg";
    mockCreateSignedUrl
      .mockResolvedValueOnce({ data: { signedUrl: signed1 }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: signed2 }, error: null });

    const result = await getSignedUrls(mockSupabase, ["club/logo1.jpg", "club/logo2.jpg"]);
    expect(result).toEqual([signed1, signed2]);
  });

  it("retourne null pour les paths qui échouent, URL pour les autres", async () => {
    mockCreateSignedUrl
      .mockResolvedValueOnce({ data: null, error: new Error("fail") })
      .mockResolvedValueOnce({ data: { signedUrl: "https://ok.jpg" }, error: null });

    const result = await getSignedUrls(mockSupabase, ["fail/path.jpg", "ok/path.jpg"]);
    expect(result).toEqual([null, "https://ok.jpg"]);
  });

  it("passe les URLs complètes sans appeler Supabase", async () => {
    const urls = ["https://cdn.example.com/img1.jpg", "https://cdn.example.com/img2.jpg"];
    const result = await getSignedUrls(mockSupabase, urls);
    expect(result).toEqual(urls);
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });
});
