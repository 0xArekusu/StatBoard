import {
  calculateEfficiency,
  calculateEfficiencyFromDB,
} from "../../src/utils/statsCalculator";

// ─── calculateEfficiency ──────────────────────────────────────────────────────

describe("calculateEfficiency", () => {
  const baseStats = {
    pts: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    fg2a: 0,
    fg2m: 0,
    fg3a: 0,
    fg3m: 0,
    fta: 0,
    ftm: 0,
    to: 0,
  };

  it("retourne 0 si toutes les stats sont à 0", () => {
    expect(calculateEfficiency(baseStats)).toBe(0);
  });

  it("additionne correctement les contributions positives", () => {
    const stats = { ...baseStats, pts: 20, reb: 5, ast: 4, stl: 2, blk: 1 };
    // 20 + 5 + 4 + 2 + 1 = 32 (pas de manqués, pas de TO)
    expect(calculateEfficiency(stats)).toBe(32);
  });

  it("soustrait les tirs à 2pts manqués", () => {
    const stats = { ...baseStats, fg2a: 10, fg2m: 4 };
    // fieldGoalsMissed = (10-4) = 6 → EVAL = -6
    expect(calculateEfficiency(stats)).toBe(-6);
  });

  it("soustrait les tirs à 3pts manqués", () => {
    const stats = { ...baseStats, fg3a: 5, fg3m: 2 };
    // fieldGoalsMissed = (5-2) = 3 → EVAL = -3
    expect(calculateEfficiency(stats)).toBe(-3);
  });

  it("soustrait les LF manquées", () => {
    const stats = { ...baseStats, fta: 6, ftm: 4 };
    // freeThrowsMissed = 2 → EVAL = -2
    expect(calculateEfficiency(stats)).toBe(-2);
  });

  it("soustrait les pertes de balle", () => {
    const stats = { ...baseStats, to: 3 };
    expect(calculateEfficiency(stats)).toBe(-3);
  });

  it("ajoute les fautes provoquées (fd) si présentes", () => {
    const stats = { ...baseStats, fd: 4 };
    expect(calculateEfficiency(stats)).toBe(4);
  });

  it("traite fd comme 0 si absent", () => {
    const stats = { ...baseStats };
    expect(calculateEfficiency(stats)).toBe(0);
  });

  it("calcul complet avec toutes les stats", () => {
    const stats = {
      pts: 25,
      reb: 8,
      ast: 6,
      stl: 2,
      blk: 1,
      fg2a: 10,
      fg2m: 7,  // 3 manqués
      fg3a: 6,
      fg3m: 4,  // 2 manqués
      fta: 5,
      ftm: 4,   // 1 manqué
      to: 2,
      fd: 3,
    };
    // positif : 25 + 8 + 6 + 2 + 1 + 3 = 45
    // négatif : (3+2) + 1 + 2 = 8
    // EVAL = 45 - 8 = 37
    expect(calculateEfficiency(stats)).toBe(37);
  });

  it("peut retourner une valeur négative", () => {
    const stats = { ...baseStats, fg2a: 20, fg2m: 0, to: 10 };
    // -20 - 10 = -30
    expect(calculateEfficiency(stats)).toBe(-30);
  });
});

// ─── calculateEfficiencyFromDB ────────────────────────────────────────────────

describe("calculateEfficiencyFromDB", () => {
  const baseDbStats = {
    points: 0,
    orb: 0,
    drb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    twopa: 0,
    twopm: 0,
    threepa: 0,
    threepm: 0,
    fta: 0,
    ftm: 0,
    tov: 0,
  };

  it("retourne 0 si toutes les stats DB sont à 0", () => {
    expect(calculateEfficiencyFromDB(baseDbStats)).toBe(0);
  });

  it("cumule les rebonds offensifs et défensifs", () => {
    const stats = { ...baseDbStats, orb: 3, drb: 5 };
    // reb = 3 + 5 = 8 → EVAL = 8
    expect(calculateEfficiencyFromDB(stats)).toBe(8);
  });

  it("mappe correctement twopa/twopm sur fg2a/fg2m", () => {
    const stats = { ...baseDbStats, twopa: 8, twopm: 5 };
    // 3 manqués → EVAL = -3
    expect(calculateEfficiencyFromDB(stats)).toBe(-3);
  });

  it("mappe correctement threepa/threepm sur fg3a/fg3m", () => {
    const stats = { ...baseDbStats, threepa: 4, threepm: 1 };
    // 3 manqués → EVAL = -3
    expect(calculateEfficiencyFromDB(stats)).toBe(-3);
  });

  it("mappe tov sur to (pertes de balle)", () => {
    const stats = { ...baseDbStats, tov: 4 };
    expect(calculateEfficiencyFromDB(stats)).toBe(-4);
  });

  it("calcul complet cohérent avec calculateEfficiency", () => {
    const dbStats = {
      points: 18,
      orb: 2,
      drb: 6,
      ast: 4,
      stl: 1,
      blk: 2,
      twopa: 8,
      twopm: 6,
      threepa: 3,
      threepm: 2,
      fta: 4,
      ftm: 3,
      tov: 2,
      fd: 1,
    };

    const expected = calculateEfficiency({
      pts: 18,
      reb: 8,
      ast: 4,
      stl: 1,
      blk: 2,
      fg2a: 8,
      fg2m: 6,
      fg3a: 3,
      fg3m: 2,
      fta: 4,
      ftm: 3,
      to: 2,
      fd: 1,
    });

    expect(calculateEfficiencyFromDB(dbStats)).toBe(expected);
  });
});
