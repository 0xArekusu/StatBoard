import { formatTime, getActionDescription, getPeriodLabel } from "../../utils/liveMatchHelpers";
import { ActionType, ShotSpecification, ReboundSpecification } from "../../src/models/ActionTypes";
import { Team } from "../../src/models/types";

// ─── formatTime ───────────────────────────────────────────────────────────────

describe("formatTime", () => {
  it("formate 0 seconde en 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formate les secondes inférieures à 60", () => {
    expect(formatTime(5)).toBe("00:05");
    expect(formatTime(59)).toBe("00:59");
  });

  it("formate exactement 1 minute", () => {
    expect(formatTime(60)).toBe("01:00");
  });

  it("formate les minutes et secondes", () => {
    expect(formatTime(90)).toBe("01:30");
    expect(formatTime(625)).toBe("10:25");
  });

  it("ajoute un zéro devant les minutes inférieures à 10", () => {
    expect(formatTime(125)).toBe("02:05");
  });
});

// ─── getPeriodLabel ────────────────────────────────────────────────────────────

describe("getPeriodLabel", () => {
  describe("format 4 quart-temps (par défaut)", () => {
    it("retourne Q1 à Q4 pour les périodes réglementaires", () => {
      expect(getPeriodLabel(1, 4)).toBe("Q1");
      expect(getPeriodLabel(2, 4)).toBe("Q2");
      expect(getPeriodLabel(3, 4)).toBe("Q3");
      expect(getPeriodLabel(4, 4)).toBe("Q4");
    });

    it("retourne OT1, OT2... pour les prolongations", () => {
      expect(getPeriodLabel(5, 4)).toBe("OT1");
      expect(getPeriodLabel(6, 4)).toBe("OT2");
    });

    it("utilise 4 périodes par défaut si maxPeriods n'est pas fourni", () => {
      expect(getPeriodLabel(1)).toBe("Q1");
      expect(getPeriodLabel(5)).toBe("OT1");
    });
  });

  describe("format 2 mi-temps", () => {
    it("retourne MT1 et MT2 pour les périodes réglementaires", () => {
      expect(getPeriodLabel(1, 2)).toBe("MT1");
      expect(getPeriodLabel(2, 2)).toBe("MT2");
    });

    it("retourne OT1... pour les prolongations", () => {
      expect(getPeriodLabel(3, 2)).toBe("OT1");
      expect(getPeriodLabel(4, 2)).toBe("OT2");
    });
  });
});

// ─── getActionDescription ─────────────────────────────────────────────────────

describe("getActionDescription", () => {
  const makeAction = (overrides: object) => ({
    player_number: 10,
    team: Team.MY_TEAM,
    action_type: ActionType.SHOT,
    specification: ShotSpecification.MADE,
    points: 2,
    ...overrides,
  });

  describe("tirs réussis", () => {
    it("retourne Tir (+3) pour un tir à 3 points réussi", () => {
      const action = makeAction({ points: 3, specification: ShotSpecification.MADE });
      expect(getActionDescription(action, "Dupont")).toBe("#10 Dupont — Tir (+3)");
    });

    it("retourne Tir (+2) pour un tir à 2 points réussi", () => {
      const action = makeAction({ points: 2, specification: ShotSpecification.MADE });
      expect(getActionDescription(action, "Dupont")).toBe("#10 Dupont — Tir (+2)");
    });

    it("retourne LF (+1) pour un lancer franc réussi", () => {
      const action = makeAction({ points: 1, specification: ShotSpecification.MADE });
      expect(getActionDescription(action, "Dupont")).toBe("#10 Dupont — LF (+1)");
    });
  });

  describe("tirs ratés", () => {
    it("retourne Tir raté (3pts) pour un 3 points raté", () => {
      const action = makeAction({ points: 3, specification: ShotSpecification.MISSED });
      expect(getActionDescription(action, "Dupont")).toBe("#10 Dupont — Tir raté (3pts)");
    });

    it("retourne Tir raté (2pts) pour un 2 points raté", () => {
      const action = makeAction({ points: 2, specification: ShotSpecification.MISSED });
      expect(getActionDescription(action, "Dupont")).toBe("#10 Dupont — Tir raté (2pts)");
    });

    it("retourne LF raté pour un lancer franc raté", () => {
      const action = makeAction({ points: 1, specification: ShotSpecification.MISSED });
      expect(getActionDescription(action, "Dupont")).toBe("#10 Dupont — LF raté");
    });
  });

  describe("adversaire générique (numéro 9999)", () => {
    it("utilise le nom sans numéro pour l'adversaire générique (tir +3)", () => {
      const action = makeAction({
        player_number: 9999,
        team: Team.OPPONENT,
        points: 3,
        specification: ShotSpecification.MADE,
      });
      expect(getActionDescription(action, "Adversaire")).toBe("Adversaire — Tir (+3)");
    });

    it("utilise le nom sans numéro pour l'adversaire générique (tir +2)", () => {
      const action = makeAction({
        player_number: 9999,
        team: Team.OPPONENT,
        points: 2,
        specification: ShotSpecification.MADE,
      });
      expect(getActionDescription(action, "Adversaire")).toBe("Adversaire — Tir (+2)");
    });
  });

  describe("rebonds", () => {
    it("retourne Rebond défensif pour un rebond défensif", () => {
      const action = makeAction({
        action_type: ActionType.REBOUND,
        specification: ReboundSpecification.DEFENSIVE,
      });
      expect(getActionDescription(action, "Martin")).toBe("#10 Martin — Rebond défensif");
    });

    it("retourne Rebond offensif pour un rebond offensif", () => {
      const action = makeAction({
        action_type: ActionType.REBOUND,
        specification: ReboundSpecification.OFFENSIVE,
      });
      expect(getActionDescription(action, "Martin")).toBe("#10 Martin — Rebond offensif");
    });
  });

  describe("autres actions", () => {
    it("retourne Faute avec le bon format", () => {
      const action = makeAction({ action_type: ActionType.FOUL });
      expect(getActionDescription(action, "Dupont")).toBe("#10 Dupont — Faute");
    });

    it("retourne Passe décisive", () => {
      const action = makeAction({ action_type: ActionType.ASSIST });
      expect(getActionDescription(action, "Dupont")).toBe("#10 Dupont — Passe décisive");
    });

    it("retourne Interception", () => {
      const action = makeAction({ action_type: ActionType.STEAL });
      expect(getActionDescription(action, "Dupont")).toBe("#10 Dupont — Interception");
    });

    it("retourne Contre", () => {
      const action = makeAction({ action_type: ActionType.BLOCK });
      expect(getActionDescription(action, "Dupont")).toBe("#10 Dupont — Contre");
    });

    it("retourne Perte de balle", () => {
      const action = makeAction({ action_type: ActionType.TURNOVER });
      expect(getActionDescription(action, "Dupont")).toBe("#10 Dupont — Perte de balle");
    });
  });

  describe("préfixe numéro", () => {
    it("n'affiche pas de numéro si player_number est undefined", () => {
      const action = makeAction({ player_number: undefined, action_type: ActionType.ASSIST });
      expect(getActionDescription(action, "Dupont")).toBe("Dupont — Passe décisive");
    });

    it("n'affiche pas de numéro si player_number est null", () => {
      const action = makeAction({ player_number: null, action_type: ActionType.ASSIST });
      expect(getActionDescription(action, "Dupont")).toBe("Dupont — Passe décisive");
    });
  });
});
