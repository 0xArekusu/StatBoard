import {
  calculateEfficiency,
  calculateEfficiencyFromDB,
  calculatePlusMinus,
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

// ─── calculatePlusMinus ───────────────────────────────────────────────────────

type ActionInput = Parameters<typeof calculatePlusMinus>[0][number];
type PlayerInput = Parameters<typeof calculatePlusMinus>[1][number];

const shot = (
  team: "MyTeam" | "Opponent",
  playerNumber: number,
  points: number,
  period: number,
  time: number,
  order: number,
  made = true
): ActionInput => ({
  action_type: "shot",
  specification: made ? "made" : "missed",
  points: made ? points : undefined,
  team,
  player_number: playerNumber,
  period_number: period,
  time_in_period: time,
  action_order: order,
});

const sub = (
  team: "MyTeam" | "Opponent",
  playerNumber: number,
  spec: "in" | "out",
  period: number,
  time: number,
  order: number
): ActionInput => ({
  action_type: "substitution",
  specification: spec,
  team,
  player_number: playerNumber,
  period_number: period,
  time_in_period: time,
  action_order: order,
});

const starter = (team: "MyTeam" | "Opponent", num: number): PlayerInput => ({
  player_number: num,
  team,
  is_starter: true,
});

const bench = (team: "MyTeam" | "Opponent", num: number): PlayerInput => ({
  player_number: num,
  team,
  is_starter: false,
});

const pm = (map: Map<string, number>, team: "MyTeam" | "Opponent", num: number) =>
  map.get(`${team}-${num}`) ?? 0;

describe("calculatePlusMinus", () => {
  it("retourne 0 pour tous les joueurs si aucune action de tir réussi", () => {
    const players = [starter("MyTeam", 1), starter("MyTeam", 2), starter("Opponent", 10)];
    const result = calculatePlusMinus([], players);
    expect(pm(result, "MyTeam", 1)).toBe(0);
    expect(pm(result, "MyTeam", 2)).toBe(0);
    expect(pm(result, "Opponent", 10)).toBe(0);
  });

  it("un tir réussi à 2pts : titulaires de l'équipe +2, adversaires -2", () => {
    const players = [
      starter("MyTeam", 1), starter("MyTeam", 2),
      starter("Opponent", 10), starter("Opponent", 11),
    ];
    const actions = [shot("MyTeam", 1, 2, 1, 100, 1)];
    const result = calculatePlusMinus(actions, players);

    expect(pm(result, "MyTeam", 1)).toBe(2);
    expect(pm(result, "MyTeam", 2)).toBe(2);
    expect(pm(result, "Opponent", 10)).toBe(-2);
    expect(pm(result, "Opponent", 11)).toBe(-2);
  });

  it("un tir réussi à 3pts : diff correcte", () => {
    const players = [starter("MyTeam", 5), starter("Opponent", 10)];
    const actions = [shot("MyTeam", 5, 3, 1, 50, 1)];
    const result = calculatePlusMinus(actions, players);

    expect(pm(result, "MyTeam", 5)).toBe(3);
    expect(pm(result, "Opponent", 10)).toBe(-3);
  });

  it("un tir manqué n'affecte pas le +/-", () => {
    const players = [starter("MyTeam", 1), starter("Opponent", 10)];
    const actions = [shot("MyTeam", 1, 2, 1, 100, 1, false)];
    const result = calculatePlusMinus(actions, players);

    expect(pm(result, "MyTeam", 1)).toBe(0);
    expect(pm(result, "Opponent", 10)).toBe(0);
  });

  it("un joueur au banc avant la substitution n'est pas affecté", () => {
    const players = [
      starter("MyTeam", 1),
      bench("MyTeam", 99),
      starter("Opponent", 10),
    ];
    // #99 est au banc, le tir est marqué avant son entrée
    const actions = [shot("MyTeam", 1, 2, 1, 100, 1)];
    const result = calculatePlusMinus(actions, players);

    expect(pm(result, "MyTeam", 99)).toBe(0);
  });

  it("une substitution change le lineup : l'entrant est affecté, le sortant ne l'est plus", () => {
    const players = [
      starter("MyTeam", 1),
      bench("MyTeam", 99),
      starter("Opponent", 10),
    ];
    const actions = [
      // #1 sort, #99 entre à t=100
      sub("MyTeam", 1, "out", 1, 100, 1),
      sub("MyTeam", 99, "in", 1, 100, 2),
      // Tir réussi à t=200 (après la sub)
      shot("MyTeam", 99, 2, 1, 200, 3),
    ];
    const result = calculatePlusMinus(actions, players);

    expect(pm(result, "MyTeam", 99)).toBe(2);   // entrant, présent
    expect(pm(result, "MyTeam", 1)).toBe(0);    // sorti avant le tir
    expect(pm(result, "Opponent", 10)).toBe(-2);
  });

  it("accumule correctement plusieurs tirs sur plusieurs périodes", () => {
    const players = [
      starter("MyTeam", 1),
      starter("Opponent", 10),
    ];
    const actions = [
      shot("MyTeam", 1, 2, 1, 100, 1),    // +2 pour #1 / -2 pour #10
      shot("Opponent", 10, 3, 2, 50, 2),  // -3 pour #1 / +3 pour #10
      shot("MyTeam", 1, 1, 2, 200, 3),    // +1 pour #1 / -1 pour #10
    ];
    const result = calculatePlusMinus(actions, players);

    // MyTeam #1 : +2 - 3 + 1 = 0
    expect(pm(result, "MyTeam", 1)).toBe(0);
    // Opponent #10 : -2 + 3 - 1 = 0
    expect(pm(result, "Opponent", 10)).toBe(0);
  });

  it("respecte l'ordre chronologique (period > time > action_order)", () => {
    const players = [
      starter("MyTeam", 1),
      bench("MyTeam", 99),
      starter("Opponent", 10),
    ];
    // La sub arrive en période 1 t=100, le tir en période 1 t=50 (avant)
    const actions = [
      shot("MyTeam", 1, 2, 1, 50, 1),           // avant la sub
      sub("MyTeam", 1, "out", 1, 100, 2),
      sub("MyTeam", 99, "in", 1, 100, 3),
      shot("Opponent", 10, 2, 1, 150, 4),       // après la sub : #1 sorti, #99 présent
    ];
    const result = calculatePlusMinus(actions, players);

    // Tir MyTeam à t=50 : #1 présent (+2), #99 absent
    // Tir Opponent à t=150 : #99 présent (-2), #1 absent
    expect(pm(result, "MyTeam", 1)).toBe(2);   // +2 puis plus affecté
    expect(pm(result, "MyTeam", 99)).toBe(-2); // entré avant le tir adverse
    expect(pm(result, "Opponent", 10)).toBe(-2 + 2); // -2 puis +2 = 0
  });

  it("les actions de substitution elles-mêmes ne modifient pas le score", () => {
    const players = [starter("MyTeam", 1), bench("MyTeam", 99)];
    const actions = [
      sub("MyTeam", 1, "out", 1, 100, 1),
      sub("MyTeam", 99, "in", 1, 100, 2),
    ];
    const result = calculatePlusMinus(actions, players);

    expect(pm(result, "MyTeam", 1)).toBe(0);
    expect(pm(result, "MyTeam", 99)).toBe(0);
  });

  it("ne plante pas si action_type ou specification est undefined", () => {
    const players = [starter("MyTeam", 1)];
    const badActions = [
      { action_type: undefined as any, specification: undefined as any, team: "MyTeam", player_number: 1, period_number: 1, time_in_period: 50, action_order: 1 },
      { action_type: "shot", specification: undefined as any, points: 2, team: "MyTeam", player_number: 1, period_number: 1, time_in_period: 100, action_order: 2 },
    ];
    expect(() => calculatePlusMinus(badActions, players)).not.toThrow();
  });

  it("initialise les joueurs absents des actions avec pm=0", () => {
    const players = [
      starter("MyTeam", 1),
      starter("MyTeam", 2),
    ];
    // Aucune action → les deux existent dans le Map à 0
    const result = calculatePlusMinus([], players);
    expect(result.has("MyTeam-1")).toBe(true);
    expect(result.has("MyTeam-2")).toBe(true);
    expect(pm(result, "MyTeam", 1)).toBe(0);
  });
});
