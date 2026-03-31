import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useSignedUrl } from "../../hooks/useSignedUrl";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetSignedUrl = jest.fn();

jest.mock("../../utils/storageHelper", () => ({
  getSignedUrl: (...args: any[]) => mockGetSignedUrl(...args),
}));

jest.mock("../../src/config/supabase", () => ({
  supabase: { storage: {} },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useSignedUrl", () => {
  beforeEach(() => jest.clearAllMocks());

  it("commence avec null", () => {
    mockGetSignedUrl.mockResolvedValue(null);
    const { result } = renderHook(() => useSignedUrl(null));
    expect(result.current).toBeNull();
  });

  it("retourne null si path est null", async () => {
    mockGetSignedUrl.mockResolvedValue(null);

    const { result } = renderHook(() => useSignedUrl(null));

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it("retourne l'URL signée après résolution", async () => {
    const signedUrl = "https://supabase.co/signed/logo.jpg?token=abc";
    mockGetSignedUrl.mockResolvedValue(signedUrl);

    const { result } = renderHook(() => useSignedUrl("club/logo.jpg"));

    await waitFor(() => {
      expect(result.current).toBe(signedUrl);
    });
  });

  it("passe le path à getSignedUrl", async () => {
    mockGetSignedUrl.mockResolvedValue("https://example.com/img.jpg");

    renderHook(() => useSignedUrl("club-123/logo.jpg"));

    await waitFor(() => {
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        "club-123/logo.jpg"
      );
    });
  });

  it("met à jour l'URL quand le path change", async () => {
    mockGetSignedUrl
      .mockResolvedValueOnce("https://example.com/logo1.jpg")
      .mockResolvedValueOnce("https://example.com/logo2.jpg");

    const { result, rerender } = renderHook(
      ({ path }) => useSignedUrl(path),
      { initialProps: { path: "club/logo1.jpg" } }
    );

    await waitFor(() => {
      expect(result.current).toBe("https://example.com/logo1.jpg");
    });

    rerender({ path: "club/logo2.jpg" });

    await waitFor(() => {
      expect(result.current).toBe("https://example.com/logo2.jpg");
    });
  });

  it("ne met pas à jour l'état si le composant est démonté", async () => {
    let resolveUrl!: (value: string) => void;
    const pendingPromise = new Promise<string>((res) => (resolveUrl = res));
    mockGetSignedUrl.mockReturnValue(pendingPromise);

    const { result, unmount } = renderHook(() => useSignedUrl("club/logo.jpg"));

    // Démonter avant que la promesse ne se résolve
    unmount();

    // Résoudre la promesse après démontage
    act(() => resolveUrl("https://example.com/logo.jpg"));

    // L'état ne doit pas avoir changé (toujours null)
    expect(result.current).toBeNull();
  });
});
