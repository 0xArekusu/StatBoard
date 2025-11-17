import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ActionData } from "../../../components/ActionSystem";
import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
} from "../../models/ActionTypes";
import type { CourtMarker } from "../../../components/BasketballCourtSVG";
import { getActionColor } from "../../config/actionConfig";

interface Player {
  id: number;
  num: number;
  name: string;
  team: "A" | "B";
  photoUrl?: string;
}

interface PDFExportOptions {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  actions: ActionData[];
  matchFormat: "2_halves" | "4_quarters";
  periodDuration: number;
  teamMode: "A" | "B" | "BOTH";
  players: Player[];
  matchDate?: Date;
  watermark?: boolean;
  scoreManuallyAdjusted?: boolean;
  clubLogoUrl?: string;
  courtBackgroundColor?: string;
  courtLineColor?: string;
}

export class PDFExportService {
  /**
   * Generate StatBoard logo SVG
   */
  private static generateStatBoardLogoSVG(): string {
    const svgString = ``;
    return `data:image/svg+xml;base64,${btoa(svgString)}`;
  }

  /**
   * Convert an image URL to a base64 data URI
   */
  private static async imageUrlToBase64(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch image: ${url}`);
        return null;
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn(`Error converting image to base64: ${url}`, error);
      return null;
    }
  }

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
      watermark = false,
      scoreManuallyAdjusted = false,
      clubLogoUrl,
      courtBackgroundColor = "#1a472a",
      courtLineColor = "#FFFFFF",
    } = options;

    // Convert player photos to base64 for PDF embedding
    const playersWithBase64Photos = await Promise.all(
      players.map(async (player) => {
        if (player.photoUrl && player.photoUrl.startsWith('http')) {
          const base64Photo = await this.imageUrlToBase64(player.photoUrl);
          return {
            ...player,
            photoUrl: base64Photo || player.photoUrl,
          };
        }
        return player;
      })
    );

    const totalPeriods = matchFormat === "2_halves" ? 2 : 4;
    const periodLabel = matchFormat === "2_halves" ? "MT" : "Q";

    // Calculate period scores
    const { periodScoresA, periodScoresB } = this.calculatePeriodScores(
      actions,
      totalPeriods
    );

    // Calculate cumulative scores for chart
    const cumulativeScoresA: number[] = [];
    const cumulativeScoresB: number[] = [];
    let sumA = 0;
    let sumB = 0;

    for (let i = 0; i < totalPeriods; i++) {
      sumA += periodScoresA[i];
      sumB += periodScoresB[i];
      cumulativeScoresA.push(sumA);
      cumulativeScoresB.push(sumB);
    }

    // Calculate player stats - filter by teamMode
    const playersTeamA = (teamMode === "A" || teamMode === "BOTH")
      ? playersWithBase64Photos.filter((p) => p.team === "A")
      : [];
    const playersTeamB = (teamMode === "B" || teamMode === "BOTH")
      ? playersWithBase64Photos.filter((p) => p.team === "B")
      : [];

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
      cumulativeScoresA,
      cumulativeScoresB,
      statsTeamA,
      statsTeamB,
      teamMode,
      watermark,
      scoreManuallyAdjusted,
      clubLogoUrl,
      courtBackgroundColor,
      courtLineColor,
      actions,
      players,
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

      if (action.type === ActionType.SHOT && action.specification === ShotSpecification.MADE) {
        const points = action.points || 0;
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
    const shots = playerActions.filter((a) => a.type === ActionType.SHOT);
    const madeShots = shots.filter((a) => a.specification === ShotSpecification.MADE);

    const onePtMade = madeShots.filter((a) => a.points === 1).length;
    const twoPtMade = madeShots.filter((a) => a.points === 2).length;
    const threePtMade = madeShots.filter((a) => a.points === 3).length;

    const onePtAttempts = shots.filter((a) => a.points === 1).length;
    const twoPtAttempts = shots.filter((a) => a.points === 2).length;
    const threePtAttempts = shots.filter((a) => a.points === 3).length;

    const totalPoints = onePtMade * 1 + twoPtMade * 2 + threePtMade * 3;

    // Rebounds
    const rebounds = playerActions.filter((a) => a.type === ActionType.REBOUND);
    const offRebounds = rebounds.filter((a) => a.specification === ReboundSpecification.OFFENSIVE).length;
    const defRebounds = rebounds.filter((a) => a.specification === ReboundSpecification.DEFENSIVE).length;

    // Fouls
    const fouls = playerActions.filter((a) => a.type === ActionType.FOUL);
    const personalFouls = fouls.filter((a) => a.specification === FoulSpecification.PERSONAL).length;
    const technicalFouls = fouls.filter((a) => a.specification === FoulSpecification.TECHNICAL).length;
    const penalityFouls = fouls.filter((a) => a.specification === FoulSpecification.PENALITY).length;
    const disqualificationFouls = fouls.filter((a) => a.specification === FoulSpecification.DISQUALIFICATION).length;

    // New stats
    const assists = playerActions.filter((a) => a.type === ActionType.ASSIST).length;
    const steals = playerActions.filter((a) => a.type === ActionType.STEAL).length;
    const blocks = playerActions.filter((a) => a.type === ActionType.BLOCK).length;
    const turnovers = playerActions.filter((a) => a.type === ActionType.TURNOVER).length;

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
      tf: technicalFouls,
      uf: penalityFouls, // unsportsmanlike fouls (antisportive)
      df: disqualificationFouls, // disqualifying fouls
      ast: assists,
      stl: steals,
      blk: blocks,
      tov: turnovers,
    };
  }

  /**
   * Generate score evolution SVG chart
   */
  private static generateScoreChart(
    cumulativeScoresA: number[],
    cumulativeScoresB: number[],
    periodLabel: string,
    totalPeriods: number,
    teamMode: "A" | "B" | "both",
    teamA: string,
    teamB: string
  ): string {
    const width = 500;
    const height = 200;
    const padding = { top: 30, right: 30, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxScore = Math.max(
      ...(teamMode === "A" || teamMode === "BOTH" ? cumulativeScoresA : [0]),
      ...(teamMode === "B" || teamMode === "BOTH" ? cumulativeScoresB : [0])
    );
    const yScale = chartHeight / (maxScore || 1);

    // Include 0 at start
    const allScoresA = [0, ...cumulativeScoresA];
    const allScoresB = [0, ...cumulativeScoresB];

    // Generate path for team A
    let pathA = `M ${padding.left} ${padding.top + chartHeight}`;
    allScoresA.forEach((score, i) => {
      const x = padding.left + (i * chartWidth) / totalPeriods;
      const y = padding.top + chartHeight - score * yScale;
      pathA += ` L ${x} ${y}`;
    });

    // Generate path for team B
    let pathB = `M ${padding.left} ${padding.top + chartHeight}`;
    if (teamMode === "B" || teamMode === "BOTH") {
      allScoresB.forEach((score, i) => {
        const x = padding.left + (i * chartWidth) / totalPeriods;
        const y = padding.top + chartHeight - score * yScale;
        pathB += ` L ${x} ${y}`;
      });
    }

    // Generate X-axis labels with "FIN" above period labels
    const xLabelsHTML = Array.from({ length: totalPeriods + 1 }, (_, i) => {
      const x = padding.left + (i * chartWidth) / totalPeriods;
      if (i === 0) {
        return `<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="10">Début</text>`;
      }
      return `
        <text x="${x}" y="${height - 18}" text-anchor="middle" font-size="9">FIN</text>
        <text x="${x}" y="${height - 8}" text-anchor="middle" font-size="10" font-weight="bold">${periodLabel}${i}</text>
      `;
    }).join("");

    // Generate Y-axis labels
    const ySteps = 5;
    const yLabelsHTML = Array.from({ length: ySteps + 1 }, (_, i) => {
      const value = Math.round((maxScore / ySteps) * i);
      const y = padding.top + chartHeight - (value * yScale);
      return `<text x="${padding.left - 5}" y="${y + 3}" text-anchor="end" font-size="9">${value}</text>`;
    }).join("");

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            text { font-family: Arial, sans-serif; fill: #333; }
          </style>
        </defs>

        <!-- Grid lines -->
        ${Array.from({ length: ySteps + 1 }, (_, i) => {
          const y = padding.top + chartHeight - (chartHeight / ySteps) * i;
          return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`;
        }).join("")}

        <!-- Axes -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#333" stroke-width="2"/>
        <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="#333" stroke-width="2"/>

        ${(teamMode === "A" || teamMode === "BOTH") ? `
        <!-- Team A line -->
        <path d="${pathA}" fill="none" stroke="#FF6B35" stroke-width="3"/>
        ${allScoresA.map((score, i) => {
          const x = padding.left + (i * chartWidth) / totalPeriods;
          const y = padding.top + chartHeight - score * yScale;
          return `<circle cx="${x}" cy="${y}" r="4" fill="#FF6B35"/>`;
        }).join("")}
        ` : ""}

        ${(teamMode === "B" || teamMode === "BOTH") ? `
        <!-- Team B line -->
        <path d="${pathB}" fill="none" stroke="#004E89" stroke-width="3"/>
        ${allScoresB.map((score, i) => {
          const x = padding.left + (i * chartWidth) / totalPeriods;
          const y = padding.top + chartHeight - score * yScale;
          return `<circle cx="${x}" cy="${y}" r="4" fill="#004E89"/>`;
        }).join("")}
        ` : ""}

        <!-- Labels -->
        ${xLabelsHTML}
        ${yLabelsHTML}

        <!-- Legend -->
        ${(teamMode === "A" || teamMode === "BOTH") ? `
        <circle cx="50" cy="15" r="4" fill="#FF6B35"/>
        <text x="58" y="18" font-size="10">${teamA}</text>
        ` : ""}
        ${(teamMode === "B" || teamMode === "BOTH") ? `
        <circle cx="${teamMode === "BOTH" ? "150" : "50"}" cy="15" r="4" fill="#004E89"/>
        <text x="${teamMode === "BOTH" ? "158" : "58"}" y="18" font-size="10">${teamB}</text>
        ` : ""}
      </svg>
    `;
  }

  /**
   * Generate full basketball court SVG (same as BasketballCourtSVG component)
   * This reuses the exact same SVG paths as the component for consistency
   */
  private static generateBasketballCourtSVG(
    width: number,
    height: number,
    backgroundColor: string = "#1a472a",
    lineColor: string = "#FFFFFF",
    markers: CourtMarker[] = [],
    logoUrl?: string | null
  ): string {
    const SVG_WIDTH = 615.75;
    const SVG_HEIGHT = 1146.749971;

    // Markers are already in viewBox coordinates (0-615.75 x 0-1146.75)
    // The viewBox attribute handles scaling automatically to the specified width/height
    const renderMarkers = markers.map((marker) => {
      return `<circle cx="${marker.svgX}" cy="${marker.svgY}" r="8" fill="${marker.color || "#FF0000"}" stroke="#FFFFFF" stroke-width="2"/>`;
    }).join("");

    // Center logo if provided (center at 307, 573 in portrait viewBox space)
    const renderCenterLogo = logoUrl ? `
      <defs>
        <clipPath id="logoClipPortrait">
          <circle cx="307" cy="573" r="76" />
        </clipPath>
      </defs>
      <image
        href="${logoUrl}"
        x="231"
        y="497"
        width="152"
        height="152"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#logoClipPortrait)"
      />
    ` : "";

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <!-- Court background -->
        <path fill="${backgroundColor}" d="M0 0h615.75v1146.749971H0z" />

        <defs>
          <clipPath id="a"><path d="M.164.11h614.75v1145.406H.164zm0 0" /></clipPath>
          <clipPath id="b"><path d="M37.32.11h540.27V341H37.32zm0 0" /></clipPath>
          <clipPath id="c"><path d="M217.508 325.324c27.695 9.422 59.187 15.602 90.094 15.602 30.906 0 60.644-5.297 88.05-14.719.586-.293 1.168-.293 1.75-.586C500.324 287.941 576.132 188.45 577.59 79.38V.109H37.32V79.32c1.457 109.72 76.098 209.211 180.188 246.004zm0 0" /></clipPath>
          <clipPath id="d"><path d="M207.52.11h199.875v240.644H207.52zm0 0" /></clipPath>
          <clipPath id="e"><path d="M232.645.11h149.937v240.648H232.645zm0 0" /></clipPath>
          <clipPath id="f"><path d="M231.934 497.29h151.043v151.042H231.934zm0 0" /></clipPath>
          <clipPath id="g"><path d="M382.977 572.813c0-41.711-33.813-75.524-75.524-75.524-41.707 0-75.52 33.813-75.52 75.524 0 41.707 33.813 75.519 75.52 75.519 41.711 0 75.524-33.812 75.524-75.52zm0 0" /></clipPath>
          <clipPath id="h"><path d="M0 0H152V152H0z" /></clipPath>
          <clipPath id="i"><path d="M.934.29h151.043v151.042H.934zm0 0" /></clipPath>
          <clipPath id="j"><path d="M151.977 75.813c0-41.711-33.813-75.524-75.524-75.524C34.746.29.933 34.102.933 75.812c0 41.708 33.813 75.52 75.52 75.52 41.711 0 75.524-33.812 75.524-75.52zm0 0" /></clipPath>
          <clipPath id="k"><path d="M232.29 497.29h150.687v150.69H232.289zm0 0" /></clipPath>
          <clipPath id="l"><path d="M382.977 572.813c0-41.711-33.813-75.524-75.52-75.524-41.71 0-75.52 33.813-75.52 75.524 0 41.707 33.81 75.519 75.52 75.519 41.707 0 75.52-33.812 75.52-75.52zm0 0" /></clipPath>
          <clipPath id="m"><path d="M380 570h235.5v6H380zm0 0" /></clipPath>
          <clipPath id="n"><path d="M255.77 48.574h103.457v68.969H255.77zm0 0" /></clipPath>
          <clipPath id="o"><path d="M324.691 114.55c-5.293 1.805-11.343 2.993-17.265 2.993a51.97 51.97 0 01-16.88-2.82c-.112-.059-.222-.059-.335-.114-19.727-7.222-34.254-26.293-34.535-47.273V48.809h103.55v18.515c-.277 21.106-14.585 40.176-34.535 47.227zm0 0" /></clipPath>
          <clipPath id="p"><path d="M260.371 40.34h94.172v21.37h-94.172zm0 0" /></clipPath>
          <clipPath id="q"><path d="M0 0H95V22H0z" /></clipPath>
          <clipPath id="r"><path d="M.371.34h94.172v21.37H.371zm0 0" /></clipPath>
          <clipPath id="s"><path d="M298.188 56.473h18.742v18.742h-18.743zm0 0" /></clipPath>
          <clipPath id="t"><path d="M316.93 65.95c0-5.235-4.246-9.477-9.477-9.477a9.476 9.476 0 00-9.476 9.476 9.476 9.476 0 009.476 9.477c5.23 0 9.477-4.242 9.477-9.477zm0 0" /></clipPath>
          <clipPath id="u"><path d="M232.645 236.316h149.937v74.97H232.645zm0 0" /></clipPath>
          <clipPath id="v"><path d="M332.469 306.95c-7.676 2.616-16.461 4.335-25.055 4.335a75.335 75.335 0 01-24.488-4.094c-.16-.078-.324-.078-.485-.16-28.625-10.48-49.707-38.148-50.113-68.047v-2.902h150.254v2.898c-.406 30.067-21.164 57.735-50.113 67.97zm0 0" /></clipPath>
          <clipPath id="w"><path d="M232.645 161.281h149.94v149.934h-149.94zm0 0" /></clipPath>
          <clipPath id="x"><path d="M382.586 236.281c0-41.422-33.637-75-75.129-75-41.492 0-75.129 33.578-75.129 75s33.637 75.004 75.129 75.004c41.492 0 75.129-33.582 75.129-75.004zm0 0" /></clipPath>
          <clipPath id="y"><path d="M37.32 805h540.274v340.836H37.32zm0 0" /></clipPath>
          <clipPath id="z"><path d="M397.406 820.617c-27.699-9.418-59.187-15.597-90.094-15.597a270.976 270.976 0 00-88.054 14.718c-.582.293-1.164.293-1.746.586-102.926 37.68-178.73 137.172-180.192 246.242v79.27h540.274v-79.211c-1.457-109.719-76.098-209.21-180.188-246.008zm0 0" /></clipPath>
          <clipPath id="A"><path d="M207.52 905.188h199.878v240.648H207.52zm0 0" /></clipPath>
          <clipPath id="B"><path d="M232.332 905.188H382.27v240.648H232.332zm0 0" /></clipPath>
          <clipPath id="C"><path d="M255.68 1028.402h103.46v68.97H255.68zm0 0" /></clipPath>
          <clipPath id="D"><path d="M290.219 1031.39c5.289-1.804 11.344-2.988 17.265-2.988a51.97 51.97 0 0116.88 2.82c.109.055.222.055.331.114 19.727 7.219 34.258 26.289 34.54 47.27v18.527H255.68v-18.512c.28-21.11 14.586-40.176 34.539-47.23zm0 0" /></clipPath>
          <clipPath id="E"><path d="M260.367 1084.234h94.172v21.371h-94.172zm0 0" /></clipPath>
          <clipPath id="F"><path d="M0 0H95V22H0z" /></clipPath>
          <clipPath id="G"><path d="M.367.234H94.54v21.371H.367zm0 0" /></clipPath>
          <clipPath id="H"><path d="M297.984 1070.723h18.743v18.742h-18.743zm0 0" /></clipPath>
          <clipPath id="I"><path d="M297.984 1079.988a9.476 9.476 0 009.477 9.477 9.476 9.476 0 009.476-9.477 9.476 9.476 0 00-9.476-9.476 9.476 9.476 0 00-9.477 9.476zm0 0" /></clipPath>
          <clipPath id="J"><path d="M232.332 834.66H382.27v74.969H232.332zm0 0" /></clipPath>
          <clipPath id="K"><path d="M282.441 838.996c7.68-2.617 16.461-4.336 25.055-4.336a75.318 75.318 0 0124.488 4.094c.164.082.329.082.489.164 28.625 10.477 49.707 38.144 50.113 68.043v2.902H232.332v-2.898c.402-30.063 21.16-57.735 50.11-67.969zm0 0" /></clipPath>
          <clipPath id="L"><path d="M232.332 834.73H382.27v149.938H232.332zm0 0" /></clipPath>
          <clipPath id="M"><path d="M232.332 909.664c0 41.422 33.633 75.004 75.125 75.004s75.129-33.582 75.129-75.004c0-41.422-33.637-75-75.129-75-41.492 0-75.125 33.578-75.125 75zm0 0" /></clipPath>
        </defs>

        <g clip-path="url(#a)">
          <path fill="none" d="M614.914.11v1145.406H0V.11zm0 0" stroke="${lineColor}" stroke-width="14.994"/>
        </g>
        <g clip-path="url(#b)">
          <g clip-path="url(#c)">
            <path fill="none" d="M217.508 325.324c27.695 9.422 59.187 15.602 90.094 15.602 30.906 0 60.644-5.297 88.05-14.719.586-.293 1.169-.293 1.75-.586C500.325 287.941 576.134 188.45 577.59 79.38V.109H37.32V79.32c1.457 109.72 76.098 209.211 180.188 246.004zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <g clip-path="url(#d)">
          <path fill="none" d="M407.395.11v240.644H207.519V.11zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
        </g>
        <g clip-path="url(#e)">
          <path fill="none" d="M382.582.11v240.648H232.328V.109zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
        </g>
        <g clip-path="url(#f)">
          <g clip-path="url(#g)">
            <g clip-path="url(#h)" transform="translate(231 497)">
              <g clip-path="url(#i)">
                <g clip-path="url(#j)">
                  <path fill="${backgroundColor}" d="M151.977.29v151.042H.934V.289zm0 0"/>
                </g>
              </g>
            </g>
          </g>
        </g>
        <g clip-path="url(#k)">
          <g clip-path="url(#l)">
            <path fill="none" d="M382.977 572.813c0-41.711-33.813-75.524-75.52-75.524-41.711 0-75.52 33.813-75.52 75.524 0 41.707 33.809 75.52 75.52 75.52 41.707 0 75.52-33.813 75.52-75.52zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <path fill="none" d="M231.926 572.812H-.012" stroke="${lineColor}" stroke-width="4.498"/>
        <g clip-path="url(#m)">
          <path fill="none" d="M614.902 572.812H382.97" stroke="${lineColor}" stroke-width="4.498"/>
        </g>
        <g clip-path="url(#n)">
          <g clip-path="url(#o)">
            <path fill="none" d="M324.691 114.55c-5.293 1.805-11.343 2.993-17.265 2.993a51.97 51.97 0 01-16.88-2.82c-.112-.059-.222-.059-.335-.114-19.727-7.222-34.254-26.293-34.535-47.273V48.809h103.55v18.515c-.277 21.106-14.585 40.176-34.535 47.227zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <g clip-path="url(#p)">
          <g clip-path="url(#q)" transform="translate(260 40)">
            <g clip-path="url(#r)">
              <path fill="${backgroundColor}" d="M94.543.34v21.37H.367V.34zm0 0"/>
            </g>
          </g>
        </g>
        <g clip-path="url(#s)">
          <g clip-path="url(#t)">
            <path fill="none" d="M316.93 65.95c0-5.235-4.246-9.477-9.477-9.477a9.476 9.476 0 00-9.476 9.476 9.476 9.476 0 009.476 9.477c5.23 0 9.477-4.242 9.477-9.477zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <path fill="none" d="M307.453 56.469V45.44" stroke="${lineColor}" stroke-width="4.498"/>
        <path fill="none" d="M343.637 48.809h-72.383" stroke="${lineColor}" stroke-width="6.747"/>
        <g clip-path="url(#u)">
          <g clip-path="url(#v)">
            <path fill="none" d="M332.469 306.95c-7.676 2.616-16.461 4.335-25.055 4.335a75.335 75.335 0 01-24.488-4.094c-.16-.078-.324-.078-.485-.16-28.625-10.48-49.707-38.148-50.113-68.047v-2.902h150.254v2.898c-.406 30.067-21.164 57.735-50.113 67.97zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <g clip-path="url(#w)">
          <g clip-path="url(#x)">
            <path fill="${lineColor}" d="M376.078 219.508a69.77 69.77 0 00-4.11-11.973l8.212-3.68a78.798 78.798 0 014.636 13.52zm-5.953-15.778a70.185 70.185 0 00-6.86-10.664l7.102-5.527a79.246 79.246 0 017.73 12.027zm-9.559-13.93a70.965 70.965 0 00-9.191-8.738l5.594-7.046a79.632 79.632 0 0110.355 9.847zm-12.59-11.273a70.182 70.182 0 00-10.988-6.308l3.762-8.176a79.437 79.437 0 0112.39 7.117zm-14.878-7.96a69.65 69.65 0 00-12.176-3.508l1.703-8.836c4.7.906 9.277 2.226 13.734 3.96zm-16.344-4.184a71.551 71.551 0 00-12.707-.524l-.426-8.988a80.63 80.63 0 0114.305.59zm-16.91-.2a70.17 70.17 0 00-12.43 2.473l-2.547-8.629a79.05 79.05 0 0114.02-2.789zm-16.453 3.794a69.96 69.96 0 00-11.473 5.363l-4.527-7.774a79.1 79.1 0 0112.941-6.05zm-15.063 7.597a71.155 71.155 0 00-9.894 7.953l-6.239-6.484a80.267 80.267 0 0111.149-8.957zm-12.851 10.977a70.6 70.6 0 00-7.735 10.058l-7.594-4.82a79.47 79.47 0 018.715-11.336zm-9.891 13.699a69.693 69.693 0 00-5.106 11.586l-8.527-2.863a78.61 78.61 0 015.762-13.078zm-6.328 15.629a69.739 69.739 0 00-2.184 12.48l-8.965-.746a78.908 78.908 0 012.461-14.078zm-2.41 16.703a70.946 70.946 0 00.832 12.68l-8.89 1.394a80.252 80.252 0 01-.935-14.289zm1.609 16.828a69.778 69.778 0 003.816 12.07l-8.296 3.48a78.874 78.874 0 01-4.309-13.624zm5.57 15.926a70.337 70.337 0 006.602 10.82l-7.23 5.356a79.398 79.398 0 01-7.442-12.203zm9.223 14.148a71.227 71.227 0 008.98 8.954l-5.757 6.91a79.608 79.608 0 01-10.118-10.086zm12.313 11.567a70.669 70.669 0 0010.84 6.574l-3.954 8.082a79.543 79.543 0 01-12.222-7.414zm14.699 8.32a69.837 69.837 0 0012.082 3.797l-1.914 8.793a79.327 79.327 0 01-13.633-4.285zm16.23 4.57a71.263 71.263 0 0012.684.825l.215 8.992a80.343 80.343 0 01-14.281-.926zm16.91.598a70.47 70.47 0 0012.485-2.176l2.336 8.688a79.626 79.626 0 01-14.075 2.457zm16.528-3.394a70.065 70.065 0 0011.597-5.09l4.344 7.882a79.378 79.378 0 01-13.086 5.739zm15.242-7.243a70.394 70.394 0 0010.078-7.71l6.086 6.628a79.489 79.489 0 01-11.36 8.688zm13.11-10.664a70.612 70.612 0 007.972-9.875l7.476 5a79.523 79.523 0 01-8.98 11.13zm10.214-13.457a70.146 70.146 0 005.383-11.465l8.453 3.075a78.794 78.794 0 01-6.07 12.933zm6.703-15.48a69.872 69.872 0 002.485-12.426l8.945.957a79.117 79.117 0 01-2.8 14.023zm2.809-16.63c.05-1.128.078-2.257.078-3.39 0-4.265-.375-8.476-1.129-12.636l8.852-1.606a79.93 79.93 0 011.273 14.242c0 1.278-.027 2.547-.09 3.817zm0 0"/>
          </g>
        </g>
        <g clip-path="url(#y)">
          <g clip-path="url(#z)">
            <path fill="none" d="M397.406 820.617c-27.7-9.418-59.187-15.598-90.094-15.598a270.976 270.976 0 00-88.054 14.72c-.582.292-1.164.292-1.746.585C114.586 858.004 38.78 957.496 37.32 1066.566v79.27h540.274v-79.211c-1.457-109.719-76.098-209.211-180.188-246.008zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <g clip-path="url(#A)">
          <path fill="none" d="M207.52 1145.836V905.187h199.879v240.649zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
        </g>
        <g clip-path="url(#B)">
          <path fill="none" d="M232.332 1145.836V905.187h150.254v240.649zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
        </g>
        <g clip-path="url(#C)">
          <g clip-path="url(#D)">
            <path fill="none" d="M290.219 1031.39c5.289-1.804 11.344-2.988 17.265-2.988a51.97 51.97 0 0116.88 2.82c.109.055.222.055.331.114 19.727 7.219 34.258 26.289 34.54 47.27v18.527H255.68v-18.512c.28-21.11 14.586-40.176 34.539-47.23zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <g clip-path="url(#E)">
          <g clip-path="url(#F)" transform="translate(260 1084)">
            <g clip-path="url(#G)">
              <path fill="${backgroundColor}" d="M.367 21.605V.235h94.176v21.37zm0 0"/>
            </g>
          </g>
        </g>
        <g clip-path="url(#H)">
          <g clip-path="url(#I)">
            <path fill="none" d="M297.984 1079.988a9.476 9.476 0 009.477 9.477 9.476 9.476 0 009.477-9.477 9.476 9.476 0 00-9.477-9.476 9.476 9.476 0 00-9.477 9.476zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <path fill="none" d="M307.457 1089.477v11.027" stroke="${lineColor}" stroke-width="4.498"/>
        <path fill="none" d="M271.27 1097.137h72.382" stroke="${lineColor}" stroke-width="6.747"/>
        <g clip-path="url(#J)">
          <g clip-path="url(#K)">
            <path fill="none" d="M282.441 838.996c7.68-2.617 16.461-4.336 25.055-4.336a75.318 75.318 0 0124.488 4.094c.164.082.329.082.489.164 28.625 10.477 49.707 38.145 50.113 68.043v2.902H232.332v-2.898c.402-30.063 21.16-57.735 50.11-67.969zm0 0" stroke="${lineColor}" stroke-width="8.996"/>
          </g>
        </g>
        <g clip-path="url(#L)">
          <g clip-path="url(#M)">
            <path fill="${lineColor}" d="M238.84 926.438a69.912 69.912 0 004.105 11.976l-8.21 3.676a79.094 79.094 0 01-4.637-13.516zm5.95 15.777a70.718 70.718 0 006.858 10.668l-7.097 5.523a79.126 79.126 0 01-7.735-12.023zm9.558 13.93a70.952 70.952 0 009.191 8.738l-5.594 7.047a79.833 79.833 0 01-10.351-9.844zm12.59 11.273a70.204 70.204 0 0010.988 6.312l-3.762 8.172a79.377 79.377 0 01-12.387-7.113zm14.878 7.96a70.199 70.199 0 0012.176 3.513l-1.699 8.832a78.69 78.69 0 01-13.738-3.957zm16.344 4.184c3.074.407 6.176.606 9.297.606 1.14 0 2.277-.027 3.41-.078l.426 8.984c-1.273.063-2.555.09-3.836.09-3.516 0-7.004-.226-10.465-.68zm16.914.204a70.317 70.317 0 0012.43-2.477l2.543 8.629a79.34 79.34 0 01-14.02 2.793zm16.45-3.793a69.998 69.998 0 0011.472-5.368l4.531 7.778a79.578 79.578 0 01-12.941 6.05zm15.062-7.602c3.535-2.351 6.832-5 9.894-7.95l6.239 6.481a79.754 79.754 0 01-11.149 8.957zm12.855-10.973a70.896 70.896 0 007.73-10.062l7.599 4.82a79.79 79.79 0 01-8.715 11.34zm9.891-13.699a70.183 70.183 0 005.102-11.59l8.527 2.868a78.877 78.877 0 01-5.758 13.078zm6.328-15.633a70.398 70.398 0 002.184-12.476l8.965.746a78.976 78.976 0 01-2.465 14.078zm2.406-16.703a70.981 70.981 0 00-.828-12.68l8.887-1.39a79.684 79.684 0 01.938 14.285zm-1.605-16.824a69.602 69.602 0 00-3.82-12.074l8.296-3.48a78.685 78.685 0 014.31 13.628zm-5.574-15.926a70.434 70.434 0 00-6.598-10.82l7.227-5.356a79.026 79.026 0 017.441 12.204zm-9.223-14.148a70.71 70.71 0 00-8.976-8.957l5.757-6.91a80.154 80.154 0 0110.118 10.09zm-12.312-11.57a70.669 70.669 0 00-10.84-6.575l3.957-8.078a79.671 79.671 0 0112.219 7.41zm-14.696-8.317a70.063 70.063 0 00-12.082-3.8l1.91-8.79a78.88 78.88 0 0113.633 4.285zm-16.23-4.574a71.314 71.314 0 00-12.688-.824l-.215-8.992a79.947 79.947 0 0114.285.93zm-16.91-.598a70.513 70.513 0 00-12.489 2.176l-2.336-8.687a79.663 79.663 0 0114.079-2.454zm-16.532 3.399a70.047 70.047 0 00-11.597 5.086l-4.34-7.88a79.01 79.01 0 0113.082-5.738zm-15.242 7.238a70.832 70.832 0 00-10.078 7.71l-6.082-6.628a79.741 79.741 0 0111.356-8.688zm-13.11 10.664a70.867 70.867 0 00-7.968 9.875l-7.48-5a80.006 80.006 0 018.984-11.129zm-10.21 13.461a69.785 69.785 0 00-5.383 11.46l-8.457-3.07a78.983 78.983 0 016.074-12.933zm-6.707 15.48a69.795 69.795 0 00-2.48 12.426l-8.946-.96a79.074 79.074 0 012.8-14.02zm-2.805 16.625a70.682 70.682 0 001.05 16.027l-8.855 1.606a79.93 79.93 0 01-1.273-14.242c0-1.273.031-2.547.09-3.816zm0 0"/>
          </g>
        </g>

        <!-- Render markers on top of court -->
        ${renderMarkers}

        <!-- Render center court logo if provided -->
        ${renderCenterLogo}
      </svg>
    `;
  }

  /**
   * Generate SVG court for player shots using the full court component
   */
  private static generatePlayerShotCourt(
    actions: ActionData[],
    playerId: number,
    backgroundColor: string = "#1a472a",
    lineColor: string = "#FFFFFF",
    logoUrl?: string | null
  ): string {
    const width = 250;
    const height = 465;
    const shotActions = actions.filter(a => a.type === ActionType.SHOT && a.player === playerId);

    if (shotActions.length === 0) {
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="125" y="232" text-anchor="middle" font-size="14" fill="#999">Aucun tir</text></svg>`;
    }

    const markers: CourtMarker[] = shotActions.map((action, index) => {
      return {
        id: `shot-${index}`,
        svgX: action.semanticPosition.xNormalized * 615.75,
        svgY: action.semanticPosition.yNormalized * 1146.749971,
        color: getActionColor(action.type, action.specification, action.points),
      };
    });

    return this.generateBasketballCourtSVG(width, height, backgroundColor, lineColor, markers, logoUrl);
  }

  /**
   * Generate SVG court for player actions (non-shots) using the full court component
   */
  private static generatePlayerActionCourt(
    actions: ActionData[],
    playerId: number,
    backgroundColor: string = "#1a472a",
    lineColor: string = "#FFFFFF",
    logoUrl?: string | null
  ): string {
    const width = 250;
    const height = 465;
    const nonShotActions = actions.filter(a => a.player === playerId && a.type !== ActionType.SHOT);

    if (nonShotActions.length === 0) {
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="125" y="232" text-anchor="middle" font-size="14" fill="#999">Aucune action</text></svg>`;
    }

    const markers: CourtMarker[] = nonShotActions.map((action, index) => {
      return {
        id: `action-${index}`,
        svgX: (action.semanticPosition?.xNormalized || 0.5) * 615.75,
        svgY: (action.semanticPosition?.yNormalized || 0.5) * 1146.749971,
        color: getActionColor(action.type, action.specification, action.points),
      };
    });

    return this.generateBasketballCourtSVG(width, height, backgroundColor, lineColor, markers, logoUrl);
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
    cumulativeScoresA: number[];
    cumulativeScoresB: number[];
    statsTeamA: any[];
    statsTeamB: any[];
    teamMode: "A" | "B" | "BOTH";
    watermark?: boolean;
    scoreManuallyAdjusted?: boolean;
    clubLogoUrl?: string;
    courtBackgroundColor?: string;
    courtLineColor?: string;
    actions: ActionData[];
    players: Player[];
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
      cumulativeScoresA,
      cumulativeScoresB,
      statsTeamA,
      statsTeamB,
      teamMode,
      watermark = false,
      scoreManuallyAdjusted = false,
      clubLogoUrl,
      courtBackgroundColor = "#1a472a",
      courtLineColor = "#FFFFFF",
      actions,
      players,
    } = data;

    // Generate the score chart SVG
    const chartSVG = this.generateScoreChart(
      cumulativeScoresA,
      cumulativeScoresB,
      periodLabel,
      totalPeriods,
      teamMode,
      teamA,
      teamB
    );

    const dateStr = matchDate.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // StatBoard logo
    const statBoardLogoSVG = this.generateStatBoardLogoSVG();

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
      position: relative;
    }
    ${watermark ? `
    body::before {
      content: 'PREVIEW';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120px;
      font-weight: bold;
      color: rgba(255, 107, 53, 0.15);
      z-index: 9999;
      pointer-events: none;
      white-space: nowrap;
    }
    ` : ''}
    .header {
      position: relative;
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    .header-logo-left {
      position: absolute;
      left: 0;
      top: 0;
      height: 50px;
      width: auto;
    }
    .header-logo-right {
      position: absolute;
      right: 0;
      top: 0;
      height: 50px;
      width: auto;
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
      color: #000;
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
    .warning-banner {
      background-color: #FFF3E0;
      border: 2px solid #FF9800;
      border-radius: 8px;
      padding: 10px;
      margin-top: 15px;
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      color: #E65100;
    }
    .individual-stats-section {
      margin-top: 40px;
      page-break-before: always;
      position: relative;
    }
    .player-card-page {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
      padding-top: 60px;
      position: relative;
    }
    .player-card-header {
      text-align: center;
      margin-bottom: 15px;
      width: 100%;
      max-width: 800px;
      padding-bottom: 10px;
      border-bottom: 1px solid #000;
    }
    .player-card-match-info {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-bottom: 6px;
    }
    .player-card-date {
      font-size: 12px;
      color: #666;
    }
    .player-card-logo {
      position: absolute;
      right: 20px;
      top: 20px;
      height: 80px;
      width: auto;
    }
    .player-card {
      border: 1px solid #ddd;
      padding: 20px;
      border-radius: 8px;
      max-width: 800px;
      width: 100%;
      page-break-inside: avoid;
    }
    .player-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
    }
    .player-photo {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 15px;
      border: 2px solid #333;
    }
    .player-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      font-size: 30px;
    }
    .player-info {
      flex: 1;
    }
    .player-name {
      font-size: 16px;
      font-weight: bold;
    }
    .player-number {
      font-size: 14px;
      color: #666;
    }
    .courts-container {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
    }
    .court-wrapper {
      flex: 1;
      text-align: center;
    }
    .court-title {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .player-stats {
      margin-top: 15px;
      display: flex;
      gap: 20px;
    }
    .stats-column {
      flex: 1;
      padding: 10px;
    }
    .stats-column:first-child {
      border-right: 1px solid #333;
      padding-right: 20px;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      font-size: 10px;
    }
    .stat-label {
      color: #666;
      font-weight: 500;
    }
    .stat-value {
      color: #333;
      font-weight: 600;
    }
    .player-points-badge {
      display: inline-block;
      background-color: #333;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: bold;
      margin-left: 10px;
    }
    .no-stats {
      text-align: center;
      color: #999;
      font-style: italic;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    ${clubLogoUrl ? `<img src="${clubLogoUrl}" alt="Club Logo" class="header-logo-left" />` : ''}
    <img src="${statBoardLogoSVG}" alt="StatBoard" class="header-logo-right" />
    <h1>FEUILLE DE MATCH - BASKETBALL</h1>
    <div class="match-info">${teamA} vs ${teamB}</div>
    <div class="date">Date: ${dateStr}</div>
  </div>

  <div class="score-summary">
    <div>SCORE FINAL</div>
    <div class="final-score">${scoreA} - ${scoreB}</div>
    ${scoreManuallyAdjusted ? `
    <div class="warning-banner">
      ⚠️ Score ajusté manuellement - Les statistiques peuvent ne pas correspondre au score affiché
    </div>
    ` : ''}
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
      ${(teamMode === "A" || teamMode === "BOTH") ? `
      <tr>
        <td class="team-name">${teamA}</td>
        ${periodScoresA.map((score) => `<td>${score}</td>`).join("")}
        <td><strong>${scoreA}</strong></td>
      </tr>
      ` : ""}
      ${(teamMode === "B" || teamMode === "BOTH") ? `
      <tr>
        <td class="team-name">${teamB}</td>
        ${periodScoresB.map((score) => `<td>${score}</td>`).join("")}
        <td><strong>${scoreB}</strong></td>
      </tr>
      ` : ""}
    </tbody>
  </table>

  <!-- Score Evolution Chart -->
  <div style="text-align: center; margin: 30px 0;">
    <h2 style="font-size: 14px; margin-bottom: 15px;">Évolution du score</h2>
    ${chartSVG}
  </div>

  ${statsTeamA.length > 0 ? `
  <!-- Team A Stats -->
  <div class="stats-section">
    <h2>${teamA} - Statistiques individuelles</h2>
    <table class="stats-table">
      <thead>
        <tr>
          <th class="player-number">#</th>
          <th class="player-name">Joueur</th>
          <th>PTS</th>
          <th>2PM</th>
          <th>3PM</th>
          <th>LFM</th>
          <th>RO</th>
          <th>RD</th>
          <th>RT</th>
          <th>PD</th>
          <th>INT</th>
          <th>CT</th>
          <th>BP</th>
          <th>F</th>
        </tr>
      </thead>
      <tbody>
        ${statsTeamA
          .map(
            (player) => {
              const totalFouls = player.stats.pf + player.stats.tf + player.stats.uf + player.stats.df;
              return `
        <tr>
          <td class="player-number">${player.num}</td>
          <td class="player-name">${player.name}</td>
          <td>${player.stats.points}</td>
          <td>${player.stats.twopm}/${player.stats.twopa}</td>
          <td>${player.stats.threepm}/${player.stats.threepa}</td>
          <td>${player.stats.ftm}/${player.stats.fta}</td>
          <td>${player.stats.orb}</td>
          <td>${player.stats.drb}</td>
          <td>${player.stats.trb}</td>
          <td>${player.stats.ast}</td>
          <td>${player.stats.stl}</td>
          <td>${player.stats.blk}</td>
          <td>${player.stats.tov}</td>
          <td>${totalFouls}</td>
        </tr>
        `;
            }
          )
          .join("")}
        <tr class="totals-row">
          <td colspan="2">TOTAL</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.points, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.twopm, 0)}/${statsTeamA.reduce((sum, p) => sum + p.stats.twopa, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.threepm, 0)}/${statsTeamA.reduce((sum, p) => sum + p.stats.threepa, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.ftm, 0)}/${statsTeamA.reduce((sum, p) => sum + p.stats.fta, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.orb, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.drb, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.trb, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.ast, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.stl, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.blk, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.tov, 0)}</td>
          <td>${statsTeamA.reduce((sum, p) => sum + p.stats.pf + p.stats.tf + p.stats.uf + p.stats.df, 0)}</td>
        </tr>
      </tbody>
    </table>
    <div class="legend">
      PTS: Points | 2PM: 2 points (marqués/tentés) | 3PM: 3 points | LFM: Lancers francs<br>
      RO: Rebonds offensifs | RD: Rebonds défensifs | RT: Rebonds totaux<br>
      PD: Passes décisives | INT: Interceptions | CT: Contres | BP: Balles perdues | F: Fautes totales
    </div>
  </div>
  ` : ""}

  ${statsTeamB.length > 0 ? `
  <!-- Team B Stats -->
  <div class="stats-section">
    <h2>${teamB} - Statistiques individuelles</h2>
    <table class="stats-table">
      <thead>
        <tr>
          <th class="player-number">#</th>
          <th class="player-name">Joueur</th>
          <th>PTS</th>
          <th>2PM</th>
          <th>3PM</th>
          <th>LFM</th>
          <th>RO</th>
          <th>RD</th>
          <th>RT</th>
          <th>PD</th>
          <th>INT</th>
          <th>CT</th>
          <th>BP</th>
          <th>F</th>
        </tr>
      </thead>
      <tbody>
        ${statsTeamB
          .map(
            (player) => {
              const totalFouls = player.stats.pf + player.stats.tf + player.stats.uf + player.stats.df;
              return `
        <tr>
          <td class="player-number">${player.num}</td>
          <td class="player-name">${player.name}</td>
          <td>${player.stats.points}</td>
          <td>${player.stats.twopm}/${player.stats.twopa}</td>
          <td>${player.stats.threepm}/${player.stats.threepa}</td>
          <td>${player.stats.ftm}/${player.stats.fta}</td>
          <td>${player.stats.orb}</td>
          <td>${player.stats.drb}</td>
          <td>${player.stats.trb}</td>
          <td>${player.stats.ast}</td>
          <td>${player.stats.stl}</td>
          <td>${player.stats.blk}</td>
          <td>${player.stats.tov}</td>
          <td>${totalFouls}</td>
        </tr>
        `;
            }
          )
          .join("")}
        <tr class="totals-row">
          <td colspan="2">TOTAL</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.points, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.twopm, 0)}/${statsTeamB.reduce((sum, p) => sum + p.stats.twopa, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.threepm, 0)}/${statsTeamB.reduce((sum, p) => sum + p.stats.threepa, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.ftm, 0)}/${statsTeamB.reduce((sum, p) => sum + p.stats.fta, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.orb, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.drb, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.trb, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.ast, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.stl, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.blk, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.tov, 0)}</td>
          <td>${statsTeamB.reduce((sum, p) => sum + p.stats.pf + p.stats.tf + p.stats.uf + p.stats.df, 0)}</td>
        </tr>
      </tbody>
    </table>
    <div class="legend">
      PTS: Points | 2PM: 2 points (marqués/tentés) | 3PM: 3 points | LFM: Lancers francs<br>
      RO: Rebonds offensifs | RD: Rebonds défensifs | RT: Rebonds totaux<br>
      PD: Passes décisives | INT: Interceptions | CT: Contres | BP: Balles perdues | F: Fautes totales
    </div>
  </div>
  ` : ""}

  <!-- Individual Player Stats Section -->
  <div class="individual-stats-section">
    ${players
      .filter(p => (teamMode === "BOTH") || (teamMode === "A" && p.team === "A") || (teamMode === "B" && p.team === "B"))
      .sort((a, b) => {
        if (a.team === b.team) return a.num - b.num;
        return a.team === "A" ? -1 : 1;
      })
      .map(player => {
        const playerStats = this.calculatePlayerStats(player.id, actions);
        const shotCourtSVG = this.generatePlayerShotCourt(actions, player.id, courtBackgroundColor, courtLineColor, clubLogoUrl);
        const actionCourtSVG = this.generatePlayerActionCourt(actions, player.id, courtBackgroundColor, courtLineColor, clubLogoUrl);

        // Calculate shooting percentages
        const twoPtPct = playerStats.twopa > 0 ? Math.round((playerStats.twopm / playerStats.twopa) * 100) : 0;
        const threePtPct = playerStats.threepa > 0 ? Math.round((playerStats.threepm / playerStats.threepa) * 100) : 0;
        const ftPct = playerStats.fta > 0 ? Math.round((playerStats.ftm / playerStats.fta) * 100) : 0;

        // Default person icon SVG
        const personIconSVG = `data:image/svg+xml;base64,${btoa(`
          <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
            <circle cx="30" cy="30" r="30" fill="#e0e0e0"/>
            <circle cx="30" cy="22" r="10" fill="#999"/>
            <path d="M 10 50 Q 10 35, 30 35 T 50 50" fill="#999"/>
          </svg>
        `)}`;

        const hasStats = actions.filter(a => a.player === player.id).length > 0;
        const teamName = player.team === "A" ? teamA : teamB;
        const totalFouls = playerStats.pf + playerStats.tf + playerStats.uf + playerStats.df;

        return `
    <div class="player-card-page">
      <img src="${statBoardLogoSVG}" alt="StatBoard" class="player-card-logo" />
      <div class="player-card-header">
        <div class="player-card-match-info">${teamA} ${scoreA} - ${scoreB} ${teamB}</div>
        <div class="player-card-date">${dateStr}</div>
      </div>
      <div class="player-card">
        <div class="player-header">
          ${player.photoUrl
            ? `<img src="${player.photoUrl}" alt="${player.name}" class="player-photo" />`
            : `<div class="player-icon">👤</div>`
          }
          <div class="player-info">
            <div class="player-name">
              #${player.num} - ${player.name}
              <span class="player-points-badge">${playerStats.points} pts</span>
            </div>
            <div class="player-number">${teamName}</div>
          </div>
        </div>

      ${hasStats ? `
      <div class="courts-container">
        <div class="court-wrapper">
          <div class="court-title">TIRS</div>
          ${shotCourtSVG}
        </div>
        <div class="court-wrapper">
          <div class="court-title">AUTRES ACTIONS</div>
          ${actionCourtSVG}
        </div>
      </div>

      <div class="player-stats">
        <div class="stats-column">
          <div class="stat-row">
            <span class="stat-label">Total</span>
            <span class="stat-value">${playerStats.twopm + playerStats.threepm}/${playerStats.twopa + playerStats.threepa} (${playerStats.twopa + playerStats.threepa > 0 ? Math.round(((playerStats.twopm + playerStats.threepm) / (playerStats.twopa + playerStats.threepa)) * 100) : 0}%)</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Lancers francs</span>
            <span class="stat-value">${playerStats.ftm}/${playerStats.fta}${playerStats.fta > 0 ? ` (${ftPct}%)` : ''}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">2 points</span>
            <span class="stat-value">${playerStats.twopm}/${playerStats.twopa}${playerStats.twopa > 0 ? ` (${twoPtPct}%)` : ''}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">3 points</span>
            <span class="stat-value">${playerStats.threepm}/${playerStats.threepa}${playerStats.threepa > 0 ? ` (${threePtPct}%)` : ''}</span>
          </div>
        </div>

        <div class="stats-column">
          <div class="stat-row">
            <span class="stat-label">Rebonds</span>
            <span class="stat-value">${playerStats.orb + playerStats.drb} (Off: ${playerStats.orb} / Def: ${playerStats.drb})</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Passes décisives</span>
            <span class="stat-value">${playerStats.ast}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Interceptions</span>
            <span class="stat-value">${playerStats.stl}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Contres</span>
            <span class="stat-value">${playerStats.blk}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Balles perdues</span>
            <span class="stat-value">${playerStats.tov}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Fautes</span>
            <span class="stat-value">${totalFouls} (Pers: ${playerStats.pf} / Tech: ${playerStats.tf})</span>
          </div>
        </div>
      </div>
      ` : `
      <div class="no-stats">Aucune statistique enregistrée pour ce joueur</div>
      `}
      </div>
    </div>
        `;
      })
      .join('')}
  </div>

  <div class="footer">
    Généré par StatBoard - ${new Date().toLocaleString("fr-FR")}
  </div>
</body>
</html>
    `;
  }
}
