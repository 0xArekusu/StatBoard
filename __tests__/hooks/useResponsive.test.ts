import { renderHook } from "@testing-library/react-native";
import { Dimensions } from "react-native";
import { useResponsive } from "../../src/hooks/useResponsive";

// ─── Mock Dimensions.get ──────────────────────────────────────────────────────
// useWindowDimensions appelle Dimensions.get('window') → on mock à ce niveau

const dim = (width: number, height: number) => {
  jest.spyOn(Dimensions, "get").mockReturnValue({ width, height, scale: 1, fontScale: 1 });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useResponsive", () => {
  beforeEach(() => dim(390, 844)); // portrait mobile par défaut

  // ─── isPortrait ───────────────────────────────────────────────────────────────

  describe("isPortrait", () => {
    it("true quand height > width (portrait)", () => {
      dim(390, 844);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.isPortrait).toBe(true);
    });

    it("false quand width > height (landscape)", () => {
      dim(844, 390);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.isPortrait).toBe(false);
    });
  });

  // ─── isCompact ────────────────────────────────────────────────────────────────

  describe("isCompact", () => {
    it("false sur un grand écran portrait (tablet)", () => {
      dim(768, 1024); // width > 600, height > 700
      const { result } = renderHook(() => useResponsive());
      expect(result.current.isCompact).toBe(false);
      expect(result.current.scale).toBe("normal");
    });

    it("true en landscape (mobile)", () => {
      dim(844, 390);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.isCompact).toBe(true);
      expect(result.current.scale).toBe("compact");
    });

    it("true sur un petit écran portrait (height < 700)", () => {
      dim(390, 680);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.isCompact).toBe(true);
    });

    it("true sur un téléphone normal (width < 600)", () => {
      dim(390, 844);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.isCompact).toBe(true);
    });
  });

  // ─── scale ───────────────────────────────────────────────────────────────────

  describe("scale", () => {
    it("'compact' sur mobile portrait", () => {
      dim(390, 844);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.scale).toBe("compact");
    });

    it("'normal' sur grand écran portrait", () => {
      dim(768, 1024);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.scale).toBe("normal");
    });
  });

  // ─── sp (spacing) ────────────────────────────────────────────────────────────

  describe("sp — spacing", () => {
    it("la hiérarchie xs ≤ sm ≤ md ≤ lg est respectée (compact)", () => {
      dim(390, 844);
      const { result } = renderHook(() => useResponsive());
      const { sp } = result.current;
      expect(sp.xs).toBeLessThanOrEqual(sp.sm);
      expect(sp.sm).toBeLessThanOrEqual(sp.md);
      expect(sp.md).toBeLessThanOrEqual(sp.lg);
    });

    it("la hiérarchie xs ≤ sm ≤ md ≤ lg est respectée (normal)", () => {
      dim(768, 1024);
      const { result } = renderHook(() => useResponsive());
      const { sp } = result.current;
      expect(sp.xs).toBeLessThanOrEqual(sp.sm);
      expect(sp.sm).toBeLessThanOrEqual(sp.md);
      expect(sp.md).toBeLessThanOrEqual(sp.lg);
    });

    it("les valeurs compact sont ≤ aux valeurs normales", () => {
      dim(390, 844);
      const compactSp = renderHook(() => useResponsive()).result.current.sp;

      dim(768, 1024);
      const normalSp = renderHook(() => useResponsive()).result.current.sp;

      expect(compactSp.md).toBeLessThanOrEqual(normalSp.md);
      expect(compactSp.lg).toBeLessThanOrEqual(normalSp.lg);
    });
  });

  // ─── font ────────────────────────────────────────────────────────────────────

  describe("font — tailles", () => {
    it("les tailles compact sont ≤ aux tailles normales", () => {
      dim(390, 844);
      const compactFont = renderHook(() => useResponsive()).result.current.font;

      dim(768, 1024);
      const normalFont = renderHook(() => useResponsive()).result.current.font;

      expect(compactFont.md).toBeLessThanOrEqual(normalFont.md);
      expect(compactFont.lg).toBeLessThanOrEqual(normalFont.lg);
      expect(compactFont.xl).toBeLessThanOrEqual(normalFont.xl);
    });

    it("la hiérarchie xxs ≤ xs ≤ sm ≤ md ≤ lg ≤ xl ≤ xxl ≤ xxxl est respectée", () => {
      dim(768, 1024);
      const { font } = renderHook(() => useResponsive()).result.current;
      expect(font.xxs).toBeLessThanOrEqual(font.xs);
      expect(font.xs).toBeLessThanOrEqual(font.sm);
      expect(font.sm).toBeLessThanOrEqual(font.md);
      expect(font.md).toBeLessThanOrEqual(font.lg);
      expect(font.lg).toBeLessThanOrEqual(font.xl);
      expect(font.xl).toBeLessThanOrEqual(font.xxl);
      expect(font.xxl).toBeLessThanOrEqual(font.xxxl);
    });
  });

  // ─── sizes ───────────────────────────────────────────────────────────────────

  describe("sizes — tailles UI", () => {
    it("les tailles compact sont ≤ aux tailles normales", () => {
      dim(390, 844);
      const compactSizes = renderHook(() => useResponsive()).result.current.sizes;

      dim(768, 1024);
      const normalSizes = renderHook(() => useResponsive()).result.current.sizes;

      expect(compactSizes.avatarMd).toBeLessThanOrEqual(normalSizes.avatarMd);
      expect(compactSizes.iconMd).toBeLessThanOrEqual(normalSizes.iconMd);
    });

    it("la hiérarchie avatarXs < avatarSm < avatarMd < avatarLg est respectée", () => {
      dim(768, 1024);
      const { sizes } = renderHook(() => useResponsive()).result.current;
      expect(sizes.avatarXs).toBeLessThan(sizes.avatarSm);
      expect(sizes.avatarSm).toBeLessThan(sizes.avatarMd);
      expect(sizes.avatarMd).toBeLessThan(sizes.avatarLg);
    });
  });

  // ─── width / height ──────────────────────────────────────────────────────────

  describe("width / height", () => {
    it("expose les dimensions brutes de la fenêtre", () => {
      dim(414, 896);
      const { result } = renderHook(() => useResponsive());
      expect(result.current.width).toBe(414);
      expect(result.current.height).toBe(896);
    });
  });
});
