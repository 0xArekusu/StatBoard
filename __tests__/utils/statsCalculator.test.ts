import {
  calculateEfficiency,
  calculateEfficiencyFromDB,
  calculatePlusMinus,
  calculatePlayingTime,
  accumulateShot,
  ShotStats,
  hasSubstitutionTracking,
} from "../../src/utils/statsCalculator";

// ─── hasSubstitutionTracking ──────────────────────────────────────────────────

describe("hasSubstitutionTracking", () => {
  it("false quand aucune action n'est une substitution", () => {
    expect(
      hasSubstitutionTracking([
        { action_type: "shot" },
        { action_type: "rebound" },
        { action_type: "foul" },
      ])
    ).toBe(false);
  });

  it("false sur une liste vide", () => {
    expect(hasSubstitutionTracking([])).toBe(false);
  });

  it("true dès qu'une substitution est présente", () => {
    expect(
      hasSubstitutionTracking([{ action_type: "shot" }, { action_type: "substitution" }])
    ).toBe(true);
  });

  it("accepte le champ 'type' du format app et la casse DB", () => {
    expect(hasSubstitutionTracking([{ type: "SUBSTITUTION" }])).toBe(true);
  });

  it("ne plante pas si le type est absent", () => {
    expect(() => hasSubstitutionTracking([{}, { action_type: undefined }])).not.toThrow();
  });
});

// ─── accumulateShot ───────────────────────────────────────────────────────────

describe("accumulateShot", () => {
  const emptyShotStats = (): ShotStats => ({
    pts: 0,
    ftm: 0,
    fta: 0,
    fg2m: 0,
    fg2a: 0,
    fg3m: 0,
    fg3a: 0,
    fgm: 0,
    fga: 0,
  });

  it("n'compte pas un lancer franc réussi dans les tirs", () => {
    const s = emptyShotStats();
    accumulateShot(s, 1, true);
    expect(s).toMatchObject({ ftm: 1, fta: 1, fgm: 0, fga: 0, pts: 1 });
  });

  it("n'compte pas un lancer franc raté dans les tirs", () => {
    const s = emptyShotStats();
    accumulateShot(s, 1, false);
    expect(s).toMatchObject({ ftm: 0, fta: 1, fgm: 0, fga: 0, pts: 0 });
  });

  it("compte un 2 points réussi dans fgm et fg2m", () => {
    const s = emptyShotStats();
    accumulateShot(s, 2, true);
    expect(s).toMatchObject({ fgm: 1, fga: 1, fg2m: 1, fg2a: 1, pts: 2 });
  });

  it("compte un 3 points raté dans fga et fg3a seulement", () => {
    const s = emptyShotStats();
    accumulateShot(s, 3, false);
    expect(s).toMatchObject({ fgm: 0, fga: 1, fg3m: 0, fg3a: 1, pts: 0 });
  });

  it("garantit fgm = fg2m + fg3m et fga = fg2a + fg3a (invariant FIBA)", () => {
    // Ligne de Kays HAGGUI : 9/12 à 2pts, 3/10 à 3pts, 6/8 aux LF
    const s = emptyShotStats();
    for (let i = 0; i < 9; i++) accumulateShot(s, 2, true);
    for (let i = 0; i < 3; i++) accumulateShot(s, 2, false);
    for (let i = 0; i < 3; i++) accumulateShot(s, 3, true);
    for (let i = 0; i < 7; i++) accumulateShot(s, 3, false);
    for (let i = 0; i < 6; i++) accumulateShot(s, 1, true);
    for (let i = 0; i < 2; i++) accumulateShot(s, 1, false);

    expect(s.fgm).toBe(s.fg2m + s.fg3m);
    expect(s.fga).toBe(s.fg2a + s.fg3a);
    expect(s).toMatchObject({ fgm: 12, fga: 22, ftm: 6, fta: 8 });
    expect(s.pts).toBe(9 * 2 + 3 * 3 + 6);
  });
});

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

// ─── calculatePlayingTime ────────────────────────────────────────────────────

describe("calculatePlayingTime", () => {
  const pt = (map: Map<string, number>, team: "MyTeam" | "Opponent", num: number) =>
    map.get(`${team}-${num}`) ?? 0;

  it("un titulaire jamais remplacé cumule la durée complète (4x10 = 40:00)", () => {
    const players = [starter("MyTeam", 7)];
    const actions = [1, 2, 3, 4].map((p) => shot("MyTeam", 7, 2, p, 30, p));
    const result = calculatePlayingTime(actions, players, 600);
    expect(pt(result, "MyTeam", 7)).toBe(2400);
  });

  it("atteint la fin de période même si la dernière action est notée avant", () => {
    // Régression : l'ancien cumul par ticks s'arrêtait à la dernière action
    // (P1 = 598s, P3 = 587s → 39:45 au lieu de 40:00)
    const players = [starter("MyTeam", 1)];
    const actions = [
      shot("MyTeam", 1, 2, 1, 598, 1),
      shot("MyTeam", 1, 2, 2, 600, 2),
      shot("MyTeam", 1, 2, 3, 587, 3),
      shot("MyTeam", 1, 2, 4, 600, 4),
    ];
    const result = calculatePlayingTime(actions, players, 600);
    expect(pt(result, "MyTeam", 1)).toBe(2400);
  });

  it("le cas Nanterre : 5 adversaires jamais remplacés finissent à 40:00", () => {
    // Régression du bug remonté par un coach : les 5 joueurs adverses
    // affichaient 45:40 parce que le compteur tournait pendant les pauses
    const players = [
      starter("MyTeam", 1), starter("MyTeam", 2), starter("MyTeam", 3),
      starter("MyTeam", 4), starter("MyTeam", 5),
      starter("Opponent", 1), starter("Opponent", 2), starter("Opponent", 3),
      starter("Opponent", 4), starter("Opponent", 5),
    ];
    const actions = [1, 2, 3, 4].map((p) => shot("MyTeam", 1, 2, p, 60, p));
    const result = calculatePlayingTime(actions, players, 600);
    for (let n = 1; n <= 5; n++) {
      expect(pt(result, "Opponent", n)).toBe(2400);
    }
    expect(pt(result, "MyTeam", 1)).toBe(2400);
  });

  it("crédite exactement le temps passé sur le terrain", () => {
    const players = [starter("MyTeam", 1), bench("MyTeam", 9)];
    const actions = [
      sub("MyTeam", 9, "in", 1, 300, 1),
      sub("MyTeam", 1, "out", 1, 300, 2),
      shot("MyTeam", 9, 2, 2, 10, 3),
    ];
    const result = calculatePlayingTime(actions, players, 600);
    expect(pt(result, "MyTeam", 1)).toBe(300);        // sorti à 5:00 en P1
    expect(pt(result, "MyTeam", 9)).toBe(300 + 600);  // entré en P1, présent en P2
  });

  it("cumule plusieurs passages sur le terrain", () => {
    const players = [starter("MyTeam", 1), bench("MyTeam", 9)];
    const actions = [
      sub("MyTeam", 9, "in", 1, 120, 1),
      sub("MyTeam", 1, "out", 1, 120, 2),
      sub("MyTeam", 1, "in", 1, 300, 3),
      sub("MyTeam", 9, "out", 1, 300, 4),
      shot("MyTeam", 1, 2, 2, 10, 5),
    ];
    const result = calculatePlayingTime(actions, players, 600);
    expect(pt(result, "MyTeam", 1)).toBe(120 + 300 + 600); // P1: 0→2:00 puis 5:00→10:00
    expect(pt(result, "MyTeam", 9)).toBe(180);             // P1: 2:00→5:00
  });

  it("un remplaçant qui n'entre jamais reste à 0", () => {
    const players = [starter("MyTeam", 1), bench("MyTeam", 12)];
    const actions = [1, 2, 3, 4].map((p) => shot("MyTeam", 1, 2, p, 10, p));
    const result = calculatePlayingTime(actions, players, 600);
    expect(pt(result, "MyTeam", 1)).toBe(2400);
    expect(pt(result, "MyTeam", 12)).toBe(0);
  });

  it("le temps court pour les deux équipes en parallèle", () => {
    const players = [starter("MyTeam", 1), starter("Opponent", 1)];
    const actions = [shot("MyTeam", 1, 2, 1, 10, 1)];
    const result = calculatePlayingTime(actions, players, 600);
    expect(pt(result, "MyTeam", 1)).toBe(600);
    expect(pt(result, "Opponent", 1)).toBe(600);
  });

  it("respecte la durée de période passée (4x8 = 32:00)", () => {
    const players = [starter("MyTeam", 1)];
    const actions = [1, 2, 3, 4].map((p) => shot("MyTeam", 1, 2, p, 10, p));
    const result = calculatePlayingTime(actions, players, 480);
    expect(pt(result, "MyTeam", 1)).toBe(1920);
  });

  it("crédite une prolongation de sa durée réelle (5:00), pas 10:00", () => {
    const players = [starter("MyTeam", 1)];
    const actions = [1, 2, 3, 4, 5].map((p) => shot("MyTeam", 1, 2, p, 30, p));
    const result = calculatePlayingTime(actions, players, {
      periodDurationSeconds: 600,
      regulationPeriods: 4,
      overtimeDurationSeconds: 300,
    });
    expect(pt(result, "MyTeam", 1)).toBe(4 * 600 + 300); // 40:00 + 5:00 = 45:00
  });

  it("sans config de prolongation, les périodes au-delà sont comptées en durée réglementaire", () => {
    // Documente le piège : c'est pourquoi les appelants doivent passer
    // regulationPeriods + overtimeDurationSeconds quand le match peut aller en
    // prolongation.
    const players = [starter("MyTeam", 1)];
    const actions = [1, 2, 3, 4, 5].map((p) => shot("MyTeam", 1, 2, p, 30, p));
    const result = calculatePlayingTime(actions, players, 600);
    expect(pt(result, "MyTeam", 1)).toBe(5 * 600);
  });

  it("honore un changement en cours de prolongation", () => {
    // Régression : `time_in_period` était calculé avec la durée réglementaire
    // même en prolongation, donc les changements d'une OT arrivaient estampillés
    // dans [300, 600] et `Math.min(at, length)` les clampait tous à 300, soit la
    // fin de la période. Le remplaçant restait à 0:00 et le titulaire encaissait
    // toute la prolongation. Ici les timestamps sont relatifs à la prolongation.
    const players = [starter("MyTeam", 1), bench("MyTeam", 9)];
    const config = {
      periodDurationSeconds: 600,
      regulationPeriods: 4,
      overtimeDurationSeconds: 300,
    };
    const actions = [
      ...[1, 2, 3, 4].map((p) => shot("MyTeam", 1, 2, p, 30, p)),
      sub("MyTeam", 1, "out", 5, 120, 5),
      sub("MyTeam", 9, "in", 5, 120, 6),
      shot("MyTeam", 9, 2, 5, 200, 7),
    ];
    const result = calculatePlayingTime(actions, players, config);
    expect(pt(result, "MyTeam", 1)).toBe(4 * 600 + 120); // 40:00 + 2:00 d'OT
    expect(pt(result, "MyTeam", 9)).toBe(180); // les 3:00 restantes de l'OT
  });

  it("retourne une map vide quand il n'y a aucune action à rejouer", () => {
    const result = calculatePlayingTime([], [starter("MyTeam", 1)], 600);
    expect(result.size).toBe(0);
  });

  it("ne plante pas sur des actions incomplètes", () => {
    const players = [starter("MyTeam", 1)];
    const badActions = [
      { action_type: undefined as any, specification: "in" as any, team: "MyTeam", period_number: 1, time_in_period: 10, action_order: 1 },
      { action_type: "substitution", specification: undefined as any, team: "MyTeam", player_number: 1, period_number: 1, time_in_period: 20, action_order: 2 },
    ];
    expect(() => calculatePlayingTime(badActions as any, players, 600)).not.toThrow();
  });
});
