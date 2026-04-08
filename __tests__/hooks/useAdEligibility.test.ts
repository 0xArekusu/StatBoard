import { renderHook } from "@testing-library/react-native";
import { useAdEligibility } from "../../hooks/useAdEligibility";
import { SUBSCRIPTION_TIER } from "../../models/Subscription";

// ─── Mock useClub ─────────────────────────────────────────────────────────────

const mockUseClub = jest.fn();

jest.mock("../../src/contexts/ClubContext", () => ({
  useClub: () => mockUseClub(),
}));

// ─── Fixture ──────────────────────────────────────────────────────────────────

const makeClub = (tier: string) => ({
  id: "club-1",
  name: "Mon Club",
  subscriptionTier: tier,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useAdEligibility", () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne false pendant le chargement (évite le flash)", () => {
    mockUseClub.mockReturnValue({ currentClub: null, loading: true });

    const { result } = renderHook(() => useAdEligibility());

    expect(result.current).toBe(false);
  });

  it("retourne true si l'utilisateur n'a pas de club (guest / sans club)", () => {
    mockUseClub.mockReturnValue({ currentClub: null, loading: false });

    const { result } = renderHook(() => useAdEligibility());

    expect(result.current).toBe(true);
  });

  it("retourne true si le club est sur le tier free", () => {
    mockUseClub.mockReturnValue({
      currentClub: makeClub(SUBSCRIPTION_TIER.FREE),
      loading: false,
    });

    const { result } = renderHook(() => useAdEligibility());

    expect(result.current).toBe(true);
  });

  it("retourne false si le club est sur le tier basic (payant)", () => {
    mockUseClub.mockReturnValue({
      currentClub: makeClub(SUBSCRIPTION_TIER.BASIC),
      loading: false,
    });

    const { result } = renderHook(() => useAdEligibility());

    expect(result.current).toBe(false);
  });

  it("retourne false si le club est sur le tier premium", () => {
    mockUseClub.mockReturnValue({
      currentClub: makeClub(SUBSCRIPTION_TIER.PREMIUM),
      loading: false,
    });

    const { result } = renderHook(() => useAdEligibility());

    expect(result.current).toBe(false);
  });

  it("retourne false si le club est sur le tier ultimate", () => {
    mockUseClub.mockReturnValue({
      currentClub: makeClub(SUBSCRIPTION_TIER.ULTIMATE),
      loading: false,
    });

    const { result } = renderHook(() => useAdEligibility());

    expect(result.current).toBe(false);
  });
});
