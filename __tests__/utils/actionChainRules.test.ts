import { getChainContext } from "../../utils/actionChainRules";
import { ActionType, ShotSpecification, ReboundSpecification } from "../../src/models/ActionTypes";
import { TeamId, MatchEvent } from "../../constants/liveMatchConstants";
import i18n from "../../src/i18n";

// These tests assert French copy directly, so pin the language regardless of
// the device locale the test environment resolves (jest-expo mocks it to "en").
beforeAll(async () => {
  await i18n.changeLanguage("fr");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MY_TEAM = TeamId.HOME;
const OPP_TEAM = TeamId.AWAY;
const MY_NAME = "Lions";
const OPP_NAME = "Tigers";

const makeEvent = (overrides: Partial<MatchEvent>): MatchEvent => ({
  id: "evt-1",
  action_type: ActionType.SHOT,
  teamId: MY_TEAM,
  timestamp: 0,
  description: "",
  ...overrides,
});

// ─── Tir raté → Rebond ────────────────────────────────────────────────────────

describe("getChainContext — Tir raté → Rebond", () => {
  const missedByMe = makeEvent({
    action_type: ActionType.SHOT,
    specification: ShotSpecification.MISSED,
    teamId: MY_TEAM,
    playerNumber: 23,
    playerId: "p-23",
  });

  const missedByOpp = makeEvent({
    action_type: ActionType.SHOT,
    specification: ShotSpecification.MISSED,
    teamId: OPP_TEAM,
    playerNumber: 5,
  });

  describe("mon équipe rate + stats adverses activées", () => {
    it("retourne 3 suggestions : Reb. Défensif (adv), Reb. Offensif (moi), Reb. Équipe", () => {
      const ctx = getChainContext(missedByMe, true, MY_TEAM, MY_NAME, OPP_NAME);

      expect(ctx).not.toBeNull();
      expect(ctx!.suggestions).toHaveLength(3);
      expect(ctx!.suggestions[0].label).toBe("Reb. Défensif");
      expect(ctx!.suggestions[0].teamTab).toBe(OPP_TEAM);
      expect(ctx!.suggestions[1].label).toBe("Reb. Offensif");
      expect(ctx!.suggestions[1].teamTab).toBe(MY_TEAM);
      expect(ctx!.suggestions[2].label).toBe("Reb. Équipe");
    });

    it("le Reb. Défensif porte le label de l'adversaire", () => {
      const ctx = getChainContext(missedByMe, true, MY_TEAM, MY_NAME, OPP_NAME);
      expect(ctx!.suggestions[0].teamLabel).toBe(OPP_NAME);
    });

    it("le Reb. Offensif porte le label de mon équipe", () => {
      const ctx = getChainContext(missedByMe, true, MY_TEAM, MY_NAME, OPP_NAME);
      expect(ctx!.suggestions[1].teamLabel).toBe(MY_NAME);
    });
  });

  describe("mon équipe rate + stats adverses désactivées", () => {
    it("retourne 2 suggestions : Reb. Offensif (moi) + Reb. Équipe (pas de Reb. Défensif adverse)", () => {
      const ctx = getChainContext(missedByMe, false, MY_TEAM, MY_NAME, OPP_NAME);

      expect(ctx).not.toBeNull();
      expect(ctx!.suggestions).toHaveLength(2);
      expect(ctx!.suggestions[0].label).toBe("Reb. Offensif");
      expect(ctx!.suggestions[1].label).toBe("Reb. Équipe");
    });

    it("autoTeamId du Reb. Équipe vaut myTeamId si stats désactivées", () => {
      const ctx = getChainContext(missedByMe, false, MY_TEAM, MY_NAME, OPP_NAME);
      const teamReb = ctx!.suggestions.find((s) => s.label === "Reb. Équipe")!;
      expect(teamReb.autoTeamId).toBe(MY_TEAM);
    });

    it("autoTeamId du Reb. Équipe est undefined si stats activées", () => {
      const ctx = getChainContext(missedByMe, true, MY_TEAM, MY_NAME, OPP_NAME);
      const teamReb = ctx!.suggestions.find((s) => s.label === "Reb. Équipe")!;
      expect(teamReb.autoTeamId).toBeUndefined();
    });
  });

  describe("adversaire rate + stats adverses activées", () => {
    it("retourne 3 suggestions : Reb. Défensif (moi), Reb. Offensif (adv), Reb. Équipe", () => {
      const ctx = getChainContext(missedByOpp, true, MY_TEAM, MY_NAME, OPP_NAME);

      expect(ctx).not.toBeNull();
      expect(ctx!.suggestions).toHaveLength(3);
      expect(ctx!.suggestions[0].label).toBe("Reb. Défensif");
      expect(ctx!.suggestions[0].teamTab).toBe(MY_TEAM);
      expect(ctx!.suggestions[1].label).toBe("Reb. Offensif");
      expect(ctx!.suggestions[1].teamTab).toBe(OPP_TEAM);
    });
  });

  describe("adversaire rate + stats adverses désactivées", () => {
    it("retourne 2 suggestions : Reb. Défensif (moi) + Reb. Équipe", () => {
      const ctx = getChainContext(missedByOpp, false, MY_TEAM, MY_NAME, OPP_NAME);

      expect(ctx).not.toBeNull();
      expect(ctx!.suggestions).toHaveLength(2);
      expect(ctx!.suggestions[0].label).toBe("Reb. Défensif");
      expect(ctx!.suggestions[0].teamTab).toBe(MY_TEAM);
    });
  });

  describe("triggerDescription", () => {
    it("inclut le numéro de maillot si disponible", () => {
      const ctx = getChainContext(missedByMe, true, MY_TEAM, MY_NAME, OPP_NAME);
      expect(ctx!.triggerDescription).toBe("Tir raté — #23");
    });

    it("utilise 'Joueur' si playerNumber absent", () => {
      const event = makeEvent({ action_type: ActionType.SHOT, specification: ShotSpecification.MISSED, teamId: MY_TEAM });
      const ctx = getChainContext(event, true, MY_TEAM, MY_NAME, OPP_NAME);
      expect(ctx!.triggerDescription).toBe("Tir raté — Joueur");
    });
  });

  describe("héritage des coordonnées", () => {
    it("inheritCoords reprend les coordonnées du tir", () => {
      const coords = { x: 0.4, y: 0.6 };
      const event = makeEvent({
        action_type: ActionType.SHOT,
        specification: ShotSpecification.MISSED,
        teamId: MY_TEAM,
        coordinates: coords,
      });
      const ctx = getChainContext(event, true, MY_TEAM, MY_NAME, OPP_NAME);
      expect(ctx!.inheritCoords).toEqual(coords);
    });
  });
});

// ─── Tir réussi (2/3pts) → Passe décisive ────────────────────────────────────

describe("getChainContext — Tir réussi → Passe décisive", () => {
  const madeBy23 = makeEvent({
    action_type: ActionType.SHOT,
    specification: ShotSpecification.MADE,
    teamId: MY_TEAM,
    points: 2,
    playerNumber: 23,
    playerId: "p-23",
  });

  it("suggère une passe décisive après un panier à 2pts de mon équipe", () => {
    const ctx = getChainContext(madeBy23, true, MY_TEAM, MY_NAME, OPP_NAME);

    expect(ctx).not.toBeNull();
    expect(ctx!.suggestions).toHaveLength(1);
    expect(ctx!.suggestions[0].label).toBe("Passe décisive");
    expect(ctx!.suggestions[0].action_type).toBe(ActionType.ASSIST);
    expect(ctx!.suggestions[0].teamTab).toBe(MY_TEAM);
  });

  it("suggère une passe décisive après un panier à 3pts", () => {
    const event = makeEvent({ ...madeBy23, points: 3 });
    const ctx = getChainContext(event, true, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx).not.toBeNull();
    expect(ctx!.suggestions[0].label).toBe("Passe décisive");
  });

  it("exclut le tireur de la liste de joueurs", () => {
    const ctx = getChainContext(madeBy23, true, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx!.suggestions[0].excludePlayerIds).toContain("p-23");
  });

  it("triggerDescription inclut le nombre de points", () => {
    const ctx = getChainContext(madeBy23, true, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx!.triggerDescription).toBe("Panier — #23 (2 pts)");
  });

  it("ne suggère rien pour un lancer franc réussi (1pt)", () => {
    const event = makeEvent({ ...madeBy23, points: 1 });
    const ctx = getChainContext(event, true, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx).toBeNull();
  });

  it("suggère une passe décisive pour l'adversaire si stats activées", () => {
    const oppMade = makeEvent({ ...madeBy23, teamId: OPP_TEAM });
    const ctx = getChainContext(oppMade, true, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx).not.toBeNull();
    expect(ctx!.suggestions[0].teamTab).toBe(OPP_TEAM);
    expect(ctx!.suggestions[0].teamLabel).toBe(OPP_NAME);
  });

  it("ne suggère rien si panier adverse et stats désactivées", () => {
    const oppMade = makeEvent({ ...madeBy23, teamId: OPP_TEAM });
    const ctx = getChainContext(oppMade, false, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx).toBeNull();
  });

  it("mon équipe marque et stats désactivées → suggère quand même une passe", () => {
    const ctx = getChainContext(madeBy23, false, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx).not.toBeNull();
    expect(ctx!.suggestions[0].label).toBe("Passe décisive");
  });
});

// ─── Perte de balle → Interception ───────────────────────────────────────────

describe("getChainContext — Perte de balle → Interception", () => {
  const myTurnover = makeEvent({
    action_type: ActionType.TURNOVER,
    teamId: MY_TEAM,
    playerNumber: 10,
  });

  const oppTurnover = makeEvent({
    action_type: ActionType.TURNOVER,
    teamId: OPP_TEAM,
    playerNumber: 7,
  });

  it("mon équipe perd la balle + stats activées → suggère Interception adverse", () => {
    const ctx = getChainContext(myTurnover, true, MY_TEAM, MY_NAME, OPP_NAME);

    expect(ctx).not.toBeNull();
    expect(ctx!.suggestions[0].label).toBe("Interception");
    expect(ctx!.suggestions[0].teamTab).toBe(OPP_TEAM);
    expect(ctx!.suggestions[0].teamLabel).toBe(OPP_NAME);
  });

  it("mon équipe perd la balle + stats désactivées → null", () => {
    const ctx = getChainContext(myTurnover, false, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx).toBeNull();
  });

  it("adversaire perd la balle → suggère Interception de mon équipe", () => {
    const ctx = getChainContext(oppTurnover, false, MY_TEAM, MY_NAME, OPP_NAME);

    expect(ctx).not.toBeNull();
    expect(ctx!.suggestions[0].teamTab).toBe(MY_TEAM);
    expect(ctx!.suggestions[0].teamLabel).toBe(MY_NAME);
  });

  it("triggerDescription inclut le numéro du joueur", () => {
    const ctx = getChainContext(oppTurnover, false, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx!.triggerDescription).toBe("Balle perdue — #7");
  });

  it("brise le cycle : pas de suggestion si déjà chainé depuis une Interception", () => {
    const ctx = getChainContext(myTurnover, true, MY_TEAM, MY_NAME, OPP_NAME, ActionType.STEAL);
    expect(ctx).toBeNull();
  });

  it("triggerActionType vaut TURNOVER", () => {
    const ctx = getChainContext(oppTurnover, false, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx!.triggerActionType).toBe(ActionType.TURNOVER);
  });
});

// ─── Interception → Perte de balle ───────────────────────────────────────────

describe("getChainContext — Interception → Perte de balle", () => {
  const mySteal = makeEvent({
    action_type: ActionType.STEAL,
    teamId: MY_TEAM,
    playerNumber: 11,
  });

  const oppSteal = makeEvent({
    action_type: ActionType.STEAL,
    teamId: OPP_TEAM,
    playerNumber: 4,
  });

  it("stats désactivées → null (la perte de balle serait toujours pour l'adversaire)", () => {
    const ctx = getChainContext(mySteal, false, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx).toBeNull();
  });

  it("mon équipe intercepte + stats activées → suggère Perte de balle adverse", () => {
    const ctx = getChainContext(mySteal, true, MY_TEAM, MY_NAME, OPP_NAME);

    expect(ctx).not.toBeNull();
    expect(ctx!.suggestions[0].label).toBe("Balle perdue");
    expect(ctx!.suggestions[0].teamTab).toBe(OPP_TEAM);
    expect(ctx!.suggestions[0].teamLabel).toBe(OPP_NAME);
  });

  it("adversaire intercepte + stats activées → suggère Perte de balle de mon équipe", () => {
    const ctx = getChainContext(oppSteal, true, MY_TEAM, MY_NAME, OPP_NAME);

    expect(ctx).not.toBeNull();
    expect(ctx!.suggestions[0].teamTab).toBe(MY_TEAM);
    expect(ctx!.suggestions[0].teamLabel).toBe(MY_NAME);
  });

  it("triggerDescription inclut le numéro du joueur", () => {
    const ctx = getChainContext(mySteal, true, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx!.triggerDescription).toBe("Interception — #11");
  });

  it("brise le cycle : pas de suggestion si déjà chainé depuis une Perte de balle", () => {
    const ctx = getChainContext(mySteal, true, MY_TEAM, MY_NAME, OPP_NAME, ActionType.TURNOVER);
    expect(ctx).toBeNull();
  });

  it("triggerActionType vaut STEAL", () => {
    const ctx = getChainContext(mySteal, true, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx!.triggerActionType).toBe(ActionType.STEAL);
  });
});

// ─── Contre → Rebond ─────────────────────────────────────────────────────────

describe("getChainContext — Contre → Rebond", () => {
  const myBlock = makeEvent({
    action_type: ActionType.BLOCK,
    teamId: MY_TEAM,
    playerNumber: 14,
  });

  const oppBlock = makeEvent({
    action_type: ActionType.BLOCK,
    teamId: OPP_TEAM,
    playerNumber: 9,
  });

  describe("mon équipe contre + stats activées", () => {
    it("retourne 3 suggestions : Reb. Défensif (moi), Reb. Offensif (adv), Reb. Équipe", () => {
      const ctx = getChainContext(myBlock, true, MY_TEAM, MY_NAME, OPP_NAME);

      expect(ctx).not.toBeNull();
      expect(ctx!.suggestions).toHaveLength(3);
      expect(ctx!.suggestions[0].label).toBe("Reb. Défensif");
      expect(ctx!.suggestions[0].teamTab).toBe(MY_TEAM);
      expect(ctx!.suggestions[1].label).toBe("Reb. Offensif");
      expect(ctx!.suggestions[1].teamTab).toBe(OPP_TEAM);
    });
  });

  describe("mon équipe contre + stats désactivées", () => {
    it("retourne 2 suggestions : Reb. Défensif (moi) + Reb. Équipe", () => {
      const ctx = getChainContext(myBlock, false, MY_TEAM, MY_NAME, OPP_NAME);

      expect(ctx).not.toBeNull();
      expect(ctx!.suggestions).toHaveLength(2);
      expect(ctx!.suggestions[0].label).toBe("Reb. Défensif");
      expect(ctx!.suggestions[0].teamTab).toBe(MY_TEAM);
    });
  });

  describe("adversaire contre + stats activées", () => {
    it("retourne 3 suggestions : Reb. Défensif (adv), Reb. Offensif (moi), Reb. Équipe", () => {
      const ctx = getChainContext(oppBlock, true, MY_TEAM, MY_NAME, OPP_NAME);

      expect(ctx).not.toBeNull();
      expect(ctx!.suggestions).toHaveLength(3);
      expect(ctx!.suggestions[0].label).toBe("Reb. Défensif");
      expect(ctx!.suggestions[0].teamTab).toBe(OPP_TEAM);
      expect(ctx!.suggestions[1].label).toBe("Reb. Offensif");
      expect(ctx!.suggestions[1].teamTab).toBe(MY_TEAM);
    });
  });

  describe("adversaire contre + stats désactivées", () => {
    it("retourne 2 suggestions : Reb. Offensif (moi) + Reb. Équipe", () => {
      const ctx = getChainContext(oppBlock, false, MY_TEAM, MY_NAME, OPP_NAME);

      expect(ctx).not.toBeNull();
      expect(ctx!.suggestions).toHaveLength(2);
      expect(ctx!.suggestions[0].label).toBe("Reb. Offensif");
      expect(ctx!.suggestions[0].teamTab).toBe(MY_TEAM);
    });
  });

  it("triggerDescription inclut le numéro du bloqueur", () => {
    const ctx = getChainContext(myBlock, true, MY_TEAM, MY_NAME, OPP_NAME);
    expect(ctx!.triggerDescription).toBe("Contre — #14");
  });
});

// ─── Actions sans chaîne ──────────────────────────────────────────────────────

describe("getChainContext — pas de chaîne", () => {
  it("retourne null pour une faute", () => {
    const event = makeEvent({ action_type: ActionType.FOUL, teamId: MY_TEAM });
    expect(getChainContext(event, true, MY_TEAM, MY_NAME, OPP_NAME)).toBeNull();
  });

  it("retourne null pour une faute provoquée (géré séparément)", () => {
    const event = makeEvent({ action_type: ActionType.FOUL_DRAWN, teamId: MY_TEAM });
    expect(getChainContext(event, true, MY_TEAM, MY_NAME, OPP_NAME)).toBeNull();
  });

  it("retourne null pour une passe décisive", () => {
    const event = makeEvent({ action_type: ActionType.ASSIST, teamId: MY_TEAM });
    expect(getChainContext(event, true, MY_TEAM, MY_NAME, OPP_NAME)).toBeNull();
  });

  it("retourne null pour un rebond (pas de double-chaîne)", () => {
    const event = makeEvent({
      action_type: ActionType.REBOUND,
      specification: ReboundSpecification.DEFENSIVE,
      teamId: MY_TEAM,
    });
    expect(getChainContext(event, true, MY_TEAM, MY_NAME, OPP_NAME)).toBeNull();
  });

  it("retourne null pour un tir réussi à 1pt (LF)", () => {
    const event = makeEvent({
      action_type: ActionType.SHOT,
      specification: ShotSpecification.MADE,
      points: 1,
      teamId: MY_TEAM,
    });
    expect(getChainContext(event, true, MY_TEAM, MY_NAME, OPP_NAME)).toBeNull();
  });
});

// ─── Équipe adverse (AWAY) comme myTeamId ────────────────────────────────────

describe("getChainContext — myTeamId = AWAY", () => {
  it("inverse correctement les équipes si myTeamId est AWAY", () => {
    const event = makeEvent({
      action_type: ActionType.SHOT,
      specification: ShotSpecification.MISSED,
      teamId: TeamId.AWAY,
    });
    const ctx = getChainContext(event, true, TeamId.AWAY, MY_NAME, OPP_NAME);

    // Mon équipe (AWAY) a raté → Reb. Défensif doit aller à HOME (opponent)
    expect(ctx!.suggestions[0].label).toBe("Reb. Défensif");
    expect(ctx!.suggestions[0].teamTab).toBe(TeamId.HOME);
  });
});
