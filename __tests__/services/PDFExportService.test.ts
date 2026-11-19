import { PDFExportService } from "../../src/services/export/PDFExportService";

jest.mock("expo-print", () => ({ printToFileAsync: jest.fn() }));
jest.mock("expo-sharing", () => ({ shareAsync: jest.fn() }));
jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "/tmp/",
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  downloadAsync: jest.fn(),
}));

/**
 * Les deux équipes peuvent aligner un joueur portant le même numéro (un #6 de
 * chaque côté). Le PDF filtrait les actions sur le numéro seul, donc il créditait
 * chaque joueur avec la production de son homologue adverse : un #6 affichait
 * 35 points au lieu de 30, et le total de l'équipe additionnait les points des
 * deux équipes. Cas réel : match « U18 26/27 vs Joigny 2 » (133-27), où 8 numéros
 * sont communs aux deux effectifs.
 */
describe("PDFExportService.calculatePlayerStats", () => {
  const actions = [
    // #6 côté MyTeam : un 2 pts et un 3 pts réussis, un 3 pts manqué
    { action_type: "shot", specification: "made", points: 2, player_number: 6, team: "MyTeam" },
    { action_type: "shot", specification: "made", points: 3, player_number: 6, team: "MyTeam" },
    { action_type: "shot", specification: "missed", points: 3, player_number: 6, team: "MyTeam" },
    // #6 côté Opponent : un 2 pts réussi
    { action_type: "shot", specification: "made", points: 2, player_number: 6, team: "Opponent" },
  ];

  const stats = (num: number, team?: string) =>
    (PDFExportService as any).calculatePlayerStats(num, actions, team);

  it("ne mélange pas les joueurs de même numéro entre les deux équipes", () => {
    expect(stats(6, "MyTeam").points).toBe(5);
    expect(stats(6, "Opponent").points).toBe(2);
  });

  it("compte les tirs de champ par équipe", () => {
    const mine = stats(6, "MyTeam");
    expect(mine.fgm).toBe(2);
    expect(mine.fga).toBe(3);
    const theirs = stats(6, "Opponent");
    expect(theirs.fgm).toBe(1);
    expect(theirs.fga).toBe(1);
  });

  it("ignore les actions d'un autre numéro", () => {
    expect(stats(7, "MyTeam").points).toBe(0);
  });

  it("sans équipe fournie, conserve le comportement d'origine (rétrocompatibilité)", () => {
    expect(stats(6).points).toBe(7);
  });

  it("isActionOfPlayer distingue bien les deux équipes", () => {
    const iso = (PDFExportService as any).isActionOfPlayer;
    expect(iso({ player: 6, team: "MyTeam" }, 6, "MyTeam")).toBe(true);
    expect(iso({ player: 6, team: "Opponent" }, 6, "MyTeam")).toBe(false);
    expect(iso({ player_number: 6, team: "Opponent" }, 6, "Opponent")).toBe(true);
    // Une action sans équipe (ancien format) reste acceptée : mieux vaut compter
    // que perdre la stat.
    expect(iso({ player_number: 6 }, 6, "MyTeam")).toBe(true);
    // Un autre numéro ne passe jamais.
    expect(iso({ player_number: 7, team: "MyTeam" }, 6, "MyTeam")).toBe(false);
  });
});
