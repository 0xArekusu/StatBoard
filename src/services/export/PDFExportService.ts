import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ActionData } from "../../../components/ActionSystem";

interface Player {
  id: number;
  num: number;
  name: string;
  team: "A" | "B";
}

interface PDFExportOptions {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  actions: ActionData[];
  matchFormat: "2_halves" | "4_quarters";
  periodDuration: number;
  teamMode: "A" | "B" | "both";
  players: Player[];
  matchDate?: Date;
}

export class PDFExportService {
  /**
   * Generate a basketball match statistics PDF
   */
  static async generateMatchPDF(options: PDFExportOptions): Promise<string> {
    const {
      teamA,
      teamB,
      scoreA,
      scoreB,
      actions,
      matchFormat,
      teamMode,
      players,
      matchDate = new Date(),
    } = options;

    const totalPeriods = matchFormat === "2_halves" ? 2 : 4;
    const periodLabel = matchFormat === "2_halves" ? "MT" : "Q";

    // Calculate period scores
    const { periodScoresA, periodScoresB } = this.calculatePeriodScores(
      actions,
      totalPeriods
    );

    // Calculate player stats
    const playersTeamA = players.filter((p) => p.team === "A");
    const playersTeamB = players.filter((p) => p.team === "B");

    const statsTeamA = playersTeamA.map((player) => ({
      ...player,
      stats: this.calculatePlayerStats(player.id, actions),
    }));

    const statsTeamB = playersTeamB.map((player) => ({
      ...player,
      stats: this.calculatePlayerStats(player.id, actions),
    }));

    // Generate HTML
    const html = this.generateHTML({
      teamA,
      teamB,
      scoreA,
      scoreB,
      matchDate,
      periodLabel,
      totalPeriods,
      periodScoresA,
      periodScoresB,
      statsTeamA,
      statsTeamB,
      teamMode,
    });

    // Generate PDF using expo-print
    const { uri } = await Print.printToFileAsync({ html });

    // Share the PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }

    return uri;
  }

  /**
   * Calculate scores by period
   */
  private static calculatePeriodScores(
    actions: ActionData[],
    totalPeriods: number
  ) {
    const periodScoresA: number[] = Array(totalPeriods).fill(0);
    const periodScoresB: number[] = Array(totalPeriods).fill(0);

    const sortedActions = [...actions].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const actionsPerPeriod = Math.ceil(sortedActions.length / totalPeriods);

    sortedActions.forEach((action, index) => {
      const periodIndex = Math.min(
        Math.floor(index / actionsPerPeriod),
        totalPeriods - 1
      );

      if (action.type === "tir" && action.specification === "reussi") {
        const points = action.points || 2;
        if (action.team === "A") {
          periodScoresA[periodIndex] += points;
        } else if (action.team === "B") {
          periodScoresB[periodIndex] += points;
        }
      }
    });

    return { periodScoresA, periodScoresB };
  }

  /**
   * Calculate individual player stats
   */
  private static calculatePlayerStats(playerId: number, actions: ActionData[]) {
    const playerActions = actions.filter((a) => a.player === playerId);

    // Shots
    const shots = playerActions.filter((a) => a.type === "tir");
    const madeShots = shots.filter((a) => a.specification === "reussi");

    const onePtMade = madeShots.filter((a) => a.points === 1).length;
    const twoPtMade = madeShots.filter((a) => a.points === 2).length;
    const threePtMade = madeShots.filter((a) => a.points === 3).length;

    const onePtAttempts = shots.filter((a) => a.points === 1).length;
    const twoPtAttempts = shots.filter((a) => a.points === 2).length;
    const threePtAttempts = shots.filter((a) => a.points === 3).length;

    const totalPoints = onePtMade * 1 + twoPtMade * 2 + threePtMade * 3;

    // Rebounds
    const rebounds = playerActions.filter((a) => a.type === "rebond");
    const offRebounds = rebounds.filter((a) => a.specification === "offensif").length;
    const defRebounds = rebounds.filter((a) => a.specification === "defensif").length;

    // Fouls
    const fouls = playerActions.filter((a) => a.type === "faute");
    const personalFouls = fouls.filter((a) => a.specification === "personnelle").length;

    return {
      points: totalPoints,
      fgm: twoPtMade + threePtMade,
      fga: twoPtAttempts + threePtAttempts,
      twopm: twoPtMade,
      twopa: twoPtAttempts,
      threepm: threePtMade,
      threepa: threePtAttempts,
      ftm: onePtMade,
      fta: onePtAttempts,
      orb: offRebounds,
      drb: defRebounds,
      trb: offRebounds + defRebounds,
      pf: personalFouls,
    };
  }

  /**
   * Generate HTML template for PDF
   */
  private static generateHTML(data: {
    teamA: string;
    teamB: string;
    scoreA: number;
    scoreB: number;
    matchDate: Date;
    periodLabel: string;
    totalPeriods: number;
    periodScoresA: number[];
    periodScoresB: number[];
    statsTeamA: any[];
    statsTeamB: any[];
    teamMode: "A" | "B" | "both";
  }): string {
    const {
      teamA,
      teamB,
      scoreA,
      scoreB,
      matchDate,
      periodLabel,
      totalPeriods,
      periodScoresA,
      periodScoresB,
      statsTeamA,
      statsTeamB,
      teamMode,
    } = data;

    const dateStr = matchDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      font-size: 10px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    .header h1 {
      font-size: 18px;
      margin-bottom: 5px;
    }
    .header .match-info {
      font-size: 14px;
      font-weight: bold;
      margin: 10px 0;
    }
    .header .date {
      font-size: 11px;
      color: #666;
    }
    .score-summary {
      text-align: center;
      margin: 20px 0;
      font-size: 16px;
      font-weight: bold;
    }
    .score-summary .final-score {
      font-size: 24px;
      color: #4CAF50;
    }
    .period-scores {
      margin: 20px 0;
      width: 100%;
      border-collapse: collapse;
    }
    .period-scores th,
    .period-scores td {
      border: 1px solid #333;
      padding: 8px;
      text-align: center;
    }
    .period-scores th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .period-scores .team-name {
      text-align: left;
      font-weight: bold;
    }
    .stats-section {
      margin-top: 30px;
    }
    .stats-section h2 {
      font-size: 14px;
      margin-bottom: 10px;
      padding: 5px;
      background-color: #4CAF50;
      color: white;
    }
    .stats-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .stats-table th,
    .stats-table td {
      border: 1px solid #333;
      padding: 6px 4px;
      text-align: center;
      font-size: 9px;
    }
    .stats-table th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .stats-table .player-number {
      font-weight: bold;
      width: 30px;
    }
    .stats-table .player-name {
      text-align: left;
      min-width: 100px;
    }
    .totals-row {
      font-weight: bold;
      background-color: #f9f9f9;
    }
    .legend {
      margin-top: 10px;
      font-size: 8px;
      color: #666;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 9px;
      color: #999;
      border-top: 1px solid #ddd;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>FEUILLE DE MATCH - BASKETBALL</h1>
    <div class="match-info">${teamA} vs ${teamB}</div>
    <div class="date">Date: ${dateStr}</div>
  </div>

  <div class="score-summary">
    <div>SCORE FINAL</div>
    <div class="final-score">${scoreA} - ${scoreB}</div>
  </div>

  <!-- Period Scores -->
  <table class="period-scores">
    <thead>
      <tr>
        <th>Équipe</th>
        ${Array.from({ length: totalPeriods })
          .map((_, i) => `<th>${periodLabel}${i + 1}</th>`)
          .join("")}
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="team-name">${teamA}</td>
        ${periodScoresA.map((score) => `<td>${score}</td>`).join("")}
        <td><strong>${scoreA}</strong></td>
      </tr>
      ${teamMode === "both" ? `
      <tr>
        <td class="team-name">${teamB}</td>
        ${periodScoresB.map((score) => `<td>${score}</td>`).join("")}
        <td><strong>${scoreB}</strong></td>
      </tr>
      ` : ""}
    </tbody>
  </table>

  <!-- Team A Stats -->
  <div class="stats-section">
    <h2>${teamA} - Statistiques individuelles</h2>
    <table class="stats-table">
      <thead>
        <tr>
          <th class="player-number">#</th>
          <th class="player-name">Joueur</th>
          <th>PTS</th>
          <th>2PM-A</th>
          <th>3PM-A</th>
          <th>LFM-A</th>
          <th>RO</th>
          <th>RD</th>
          <th>RT</th>
          <th>FP</th>
        </tr>
      </thead>
      <tbody>
        ${statsTeamA
          .map(
            (player) => `
        <tr>
          <td class="player-number">${player.num}</td>
          <td class="player-name">${player.name}</td>
          <td>${player.stats.points}</td>
          <td>${player.stats.twopm}-${player.stats.twopa}</td>
          <td>${player.stats.threepm}-${player.stats.threepa}</td>
          <td>${player.stats.ftm}-${player.stats.fta}</td>
          <td>${player.stats.orb}</td>
          <td>${player.stats.drb}</td>
          <td>${player.stats.trb}</td>
          <td>${player.stats.pf}</td>
        </tr>
        `
          )
          .join("")}
        <tr class="totals-row">
          <td colspan="2">TOTAL</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.points, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.twopm, 0)}-${statsTeamA.reduce((sum, p) => sum + p.stats.twopa, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.threepm, 0)}-${statsTeamA.reduce((sum, p) => sum + p.stats.threepa, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.ftm, 0)}-${statsTeamA.reduce((sum, p) => sum + p.stats.fta, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.orb, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.drb, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.trb, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.pf, 0)}</td>
        </tr>
      </tbody>
    </table>
    <div class="legend">
      PTS: Points | 2PM-A: 2 points marqués-tentés | 3PM-A: 3 points marqués-tentés | LFM-A: Lancers francs marqués-tentés<br>
      RO: Rebonds offensifs | RD: Rebonds défensifs | RT: Rebonds totaux | FP: Fautes personnelles
    </div>
  </div>

  ${teamMode === "both" ? `
  <!-- Team B Stats -->
  <div class="stats-section">
    <h2>${teamB} - Statistiques individuelles</h2>
    <table class="stats-table">
      <thead>
        <tr>
          <th class="player-number">#</th>
          <th class="player-name">Joueur</th>
          <th>PTS</th>
          <th>2PM-A</th>
          <th>3PM-A</th>
          <th>LFM-A</th>
          <th>RO</th>
          <th>RD</th>
          <th>RT</th>
          <th>FP</th>
        </tr>
      </thead>
      <tbody>
        ${statsTeamB
          .map(
            (player) => `
        <tr>
          <td class="player-number">${player.num}</td>
          <td class="player-name">${player.name}</td>
          <td>${player.stats.points}</td>
          <td>${player.stats.twopm}-${player.stats.twopa}</td>
          <td>${player.stats.threepm}-${player.stats.threepa}</td>
          <td>${player.stats.ftm}-${player.stats.fta}</td>
          <td>${player.stats.orb}</td>
          <td>${player.stats.drb}</td>
          <td>${player.stats.trb}</td>
          <td>${player.stats.pf}</td>
        </tr>
        `
          )
          .join("")}
        <tr class="totals-row">
          <td colspan="2">TOTAL</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.points, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.twopm, 0)}-${statsTeamB.reduce((sum, p) => sum + p.stats.twopa, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.threepm, 0)}-${statsTeamB.reduce((sum, p) => sum + p.stats.threepa, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.ftm, 0)}-${statsTeamB.reduce((sum, p) => sum + p.stats.fta, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.orb, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.drb, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.trb, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.pf, 0)}</td>
        </tr>
      </tbody>
    </table>
    <div class="legend">
      PTS: Points | 2PM-A: 2 points marqués-tentés | 3PM-A: 3 points marqués-tentés | LFM-A: Lancers francs marqués-tentés<br>
      RO: Rebonds offensifs | RD: Rebonds défensifs | RT: Rebonds totaux | FP: Fautes personnelles
    </div>
  </div>
  ` : ""}

  <div class="footer">
    Généré par StatBoard - ${new Date().toLocaleString("fr-FR")}
  </div>
</body>
</html>
    `;
  }
}
