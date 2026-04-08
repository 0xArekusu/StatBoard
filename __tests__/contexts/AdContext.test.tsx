import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { AdProvider, useAds } from "../../src/contexts/AdContext";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockInitialize = jest.fn();
const mockRequestInfoUpdate = jest.fn();
const mockShowForm = jest.fn();

jest.mock("react-native-google-mobile-ads", () => ({
  __esModule: true,
  default: jest.fn(() => ({ initialize: (...args: any[]) => mockInitialize(...args) })),
  AdsConsent: {
    requestInfoUpdate: (...args: any[]) => mockRequestInfoUpdate(...args),
    showForm: (...args: any[]) => mockShowForm(...args),
  },
  AdsConsentStatus: { REQUIRED: "REQUIRED" },
}));

// ─── Wrapper ──────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AdProvider>{children}</AdProvider>
);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AdContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestInfoUpdate.mockResolvedValue({ isConsentFormAvailable: false, status: "OBTAINED" });
    mockInitialize.mockResolvedValue(undefined);
  });

  it("adsReady démarre à false", () => {
    const { result } = renderHook(() => useAds(), { wrapper });
    expect(result.current.adsReady).toBe(false);
  });

  it("adsReady passe à true après l'initialisation", async () => {
    const { result } = renderHook(() => useAds(), { wrapper });

    await waitFor(() => {
      expect(result.current.adsReady).toBe(true);
    });
    expect(mockInitialize).toHaveBeenCalled();
  });

  it("affiche le formulaire de consentement quand requis", async () => {
    mockRequestInfoUpdate.mockResolvedValue({
      isConsentFormAvailable: true,
      status: "REQUIRED",
    });
    mockShowForm.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAds(), { wrapper });

    await waitFor(() => expect(result.current.adsReady).toBe(true));
    expect(mockShowForm).toHaveBeenCalled();
  });

  it("n'affiche pas le formulaire si le statut n'est pas REQUIRED", async () => {
    mockRequestInfoUpdate.mockResolvedValue({
      isConsentFormAvailable: true,
      status: "OBTAINED",
    });

    const { result } = renderHook(() => useAds(), { wrapper });

    await waitFor(() => expect(result.current.adsReady).toBe(true));
    expect(mockShowForm).not.toHaveBeenCalled();
  });

  it("une erreur de consentement ne bloque pas l'initialisation des pubs", async () => {
    mockRequestInfoUpdate.mockRejectedValue(new Error("consent error"));

    const { result } = renderHook(() => useAds(), { wrapper });

    await waitFor(() => expect(result.current.adsReady).toBe(true));
    expect(mockInitialize).toHaveBeenCalled();
  });

  it("une erreur d'initialisation ne plante pas (adsReady reste false)", async () => {
    mockInitialize.mockRejectedValue(new Error("init error"));

    const { result } = renderHook(() => useAds(), { wrapper });

    // Attend que l'effet se termine (sans throw)
    await waitFor(() => expect(mockInitialize).toHaveBeenCalled());
    expect(result.current.adsReady).toBe(false);
  });
});
