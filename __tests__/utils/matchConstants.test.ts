import {
  GUEST_IDS,
  getPeriodLabel,
  MATCH_FORMATS,
  MATCH_FORMAT_PRESETS,
  DEFAULT_MATCH_PRESET,
  ROSTER_LIMITS,
  DEFAULT_OPPONENT_PLAYERS_COUNT,
  getDefaultOpponentPlayerName,
} from "../../constants/matchConstants";

// ─── GUEST_IDS ────────────────────────────────────────────────────────────────

describe("GUEST_IDS", () => {
  it("CLUB vaut 'guest-club'", () => {
    expect(GUEST_IDS.CLUB).toBe("guest-club");
  });

  it("TEAM vaut 'guest-team'", () => {
    expect(GUEST_IDS.TEAM).toBe("guest-team");
  });

  it("les valeurs sont distinctes", () => {
    expect(GUEST_IDS.CLUB).not.toBe(GUEST_IDS.TEAM);
  });
});

// ─── getPeriodLabel (matchConstants) ─────────────────────────────────────────

describe("getPeriodLabel (matchConstants)", () => {
  describe("format 2 mi-temps", () => {
    it("retourne '1ère mi-temps' pour la 1ère période", () => {
      expect(getPeriodLabel(MATCH_FORMATS.TWO_HALVES, 1)).toBe("1ère mi-temps");
    });

    it("retourne '2ère mi-temps' pour la 2e période", () => {
      expect(getPeriodLabel(MATCH_FORMATS.TWO_HALVES, 2)).toBe("2ère mi-temps");
    });
  });

  describe("format 4 quart-temps", () => {
    it("retourne '1e quart-temps' pour le 1er quart", () => {
      expect(getPeriodLabel(MATCH_FORMATS.FOUR_QUARTERS, 1)).toBe("1e quart-temps");
    });

    it("retourne '2e quart-temps' pour le 2e quart", () => {
      expect(getPeriodLabel(MATCH_FORMATS.FOUR_QUARTERS, 2)).toBe("2e quart-temps");
    });

    it("retourne '4e quart-temps' pour le 4e quart", () => {
      expect(getPeriodLabel(MATCH_FORMATS.FOUR_QUARTERS, 4)).toBe("4e quart-temps");
    });
  });
});

// ─── MATCH_FORMAT_PRESETS ─────────────────────────────────────────────────────

describe("MATCH_FORMAT_PRESETS", () => {
  it("QUARTERS a 4 périodes de 10 minutes", () => {
    expect(MATCH_FORMAT_PRESETS.QUARTERS.totalPeriods).toBe(4);
    expect(MATCH_FORMAT_PRESETS.QUARTERS.periodDuration).toBe(10);
  });

  it("HALVES a 2 périodes de 20 minutes", () => {
    expect(MATCH_FORMAT_PRESETS.HALVES.totalPeriods).toBe(2);
    expect(MATCH_FORMAT_PRESETS.HALVES.periodDuration).toBe(20);
  });

  it("le preset par défaut est QUARTERS", () => {
    expect(DEFAULT_MATCH_PRESET).toEqual(MATCH_FORMAT_PRESETS.QUARTERS);
  });
});

// ─── ROSTER_LIMITS ────────────────────────────────────────────────────────────

describe("ROSTER_LIMITS", () => {
  it("MIN_PLAYERS vaut 1", () => {
    expect(ROSTER_LIMITS.MIN_PLAYERS).toBe(1);
  });

  it("STARTERS vaut 5", () => {
    expect(ROSTER_LIMITS.STARTERS).toBe(5);
  });

  it("PERIOD.MIN et MAX définissent les bornes de périodes", () => {
    expect(ROSTER_LIMITS.PERIOD.MIN).toBe(1);
    expect(ROSTER_LIMITS.PERIOD.MAX).toBe(8);
  });

  it("DURATION.MIN et MAX définissent les bornes de durée", () => {
    expect(ROSTER_LIMITS.DURATION.MIN).toBe(1);
    expect(ROSTER_LIMITS.DURATION.MAX).toBe(60);
  });
});

// ─── getDefaultOpponentPlayerName ─────────────────────────────────────────────

describe("getDefaultOpponentPlayerName", () => {
  it("génère 'Joueur 1' pour l'index 1", () => {
    expect(getDefaultOpponentPlayerName(1)).toBe("Joueur 1");
  });

  it("génère 'Joueur 5' pour l'index 5", () => {
    expect(getDefaultOpponentPlayerName(5)).toBe("Joueur 5");
  });

  it("DEFAULT_OPPONENT_PLAYERS_COUNT vaut 5", () => {
    expect(DEFAULT_OPPONENT_PLAYERS_COUNT).toBe(5);
  });
});
