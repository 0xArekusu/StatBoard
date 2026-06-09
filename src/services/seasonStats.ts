import { SupabaseClient } from '@supabase/supabase-js';
import { Match, MatchStatus, Team } from '../models/types';
import { ActionType, ShotSpecification, ReboundSpecification } from '../models/ActionTypes';
import { MatchDataService, PlayerData, ActionData } from '../../services/MatchDataService';
import { ActionRepository } from './database/ActionRepository';
import { MatchPlayerRepository } from './database/MatchPlayerRepository';
import { calculateEfficiency } from '../utils/statsCalculator';
import { StatPeriod, STAT_PERIOD } from '../../constants/statsConstants';

export interface PlayerSeasonData {
  playerId: string | null;
  playerNumber: number;
  playerName: string;
  photoUrl?: string;
  matchesPlayed: number;
  // Totals
  pts: number;
  reb: number;
  reb_off: number;
  reb_def: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  fd: number;
  ftm: number;
  fta: number;
  fg2m: number;
  fg2a: number;
  fg3m: number;
  fg3a: number;
  fgm: number;
  fga: number;
  eff: number;
  totalPlayingTimeSeconds: number;
  // Averages per match played
  avgPts: number;
  avgReb: number;
  avgAst: number;
  avgDef: number;
  avgEff: number;
}

export interface MatchHistoryEntry {
  match: Match;
  played: boolean;
  pts: number;
  reb: number;
  ast: number;
  eff: number;
}

export interface MatchWithDetails {
  match: Match;
  actions: ActionData[];
  players: PlayerData[];
}

function createMatchDataService(supabase: SupabaseClient): MatchDataService {
  return new MatchDataService(
    supabase,
    new ActionRepository(),
    new MatchPlayerRepository()
  );
}

// Normalise player names used as fallback keys when player_id is absent.
// "A.Blondel" → "a. blondel", "G.Tassart" → "g. tassart"
function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\.([^\s])/g, '. $1')
    .replace(/\s+/g, ' ');
}

function playerKey(player: PlayerData): string {
  return player.player_id ?? `name-${normalizeName(player.name)}`;
}

function computeStatsForPlayer(
  actions: ActionData[],
  playerNum: number
): Omit<PlayerSeasonData, 'playerId' | 'playerNumber' | 'playerName' | 'photoUrl' | 'matchesPlayed' | 'totalPlayingTimeSeconds' | 'avgPts' | 'avgReb' | 'avgAst' | 'avgDef' | 'avgEff'> {
  const s = {
    pts: 0, reb: 0, reb_off: 0, reb_def: 0,
    ast: 0, stl: 0, blk: 0, to: 0, pf: 0, fd: 0,
    ftm: 0, fta: 0, fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0,
    fgm: 0, fga: 0, eff: 0,
  };

  const playerActions = actions.filter(
    (a) => a.team === Team.MY_TEAM && a.player === playerNum
  );

  for (const action of playerActions) {
    const actionType = (action.type || '').toUpperCase();
    const specification = (action.specification || '').toLowerCase();

    if (actionType === ActionType.SHOT.toUpperCase()) {
      if (specification === ShotSpecification.MADE) {
        s.pts += action.points || 0;
        s.fgm += 1;
        if (action.points === 1) s.ftm += 1;
        else if (action.points === 2) s.fg2m += 1;
        else if (action.points === 3) s.fg3m += 1;
      }
      s.fga += 1;
      if (action.points === 1) s.fta += 1;
      else if (action.points === 2) s.fg2a += 1;
      else if (action.points === 3) s.fg3a += 1;
    }
    if (actionType === ActionType.REBOUND.toUpperCase()) {
      s.reb += 1;
      if (specification === ReboundSpecification.OFFENSIVE) s.reb_off += 1;
      else if (specification === ReboundSpecification.DEFENSIVE) s.reb_def += 1;
    }
    if (actionType === ActionType.ASSIST.toUpperCase()) s.ast += 1;
    if (actionType === ActionType.STEAL.toUpperCase()) s.stl += 1;
    if (actionType === ActionType.BLOCK.toUpperCase()) s.blk += 1;
    if (actionType === ActionType.TURNOVER.toUpperCase()) s.to += 1;
    if (actionType === ActionType.FOUL.toUpperCase()) s.pf += 1;
    if (actionType === ActionType.FOUL_DRAWN.toUpperCase()) s.fd += 1;
  }

  s.eff = calculateEfficiency(s);
  return s;
}

export async function loadAllMatchDetails(
  matches: Match[],
  supabase: SupabaseClient
): Promise<MatchWithDetails[]> {
  const service = createMatchDataService(supabase);
  const results = await Promise.all(
    matches.map(async (match) => {
      try {
        const details = await service.loadMatchDetails(match);
        return { match, actions: details.actions, players: details.players };
      } catch {
        return { match, actions: [], players: [] };
      }
    })
  );
  return results;
}

function getCurrentSeasonBounds(): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  // Season runs Sep 1 → Jun 30. If we're in Jul/Aug, the season hasn't started yet
  // so we fall back to the previous one.
  const seasonStartYear = now.getMonth() >= 8 ? year : year - 1;
  return {
    start: new Date(seasonStartYear, 8, 1),      // Sep 1
    end: new Date(seasonStartYear + 1, 5, 30, 23, 59, 59), // Jun 30
  };
}

export function filterMatchesByPeriod(matches: Match[], period: StatPeriod): Match[] {
  const completed = matches.filter((m) => m.status === MatchStatus.COMPLETED);

  if (period === STAT_PERIOD.LAST_5) {
    return [...completed]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }

  if (period === STAT_PERIOD.THREE_MONTHS) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    return completed.filter((m) => new Date(m.created_at) >= cutoff);
  }

  // SEASON: Sep 1 → Jun 30 of the current sports season
  const { start, end } = getCurrentSeasonBounds();
  return completed.filter((m) => {
    const d = new Date(m.created_at);
    return d >= start && d <= end;
  });
}

export function computeSeasonStats(
  allDetails: MatchWithDetails[],
  period: StatPeriod
): PlayerSeasonData[] {
  const filteredMatches = filterMatchesByPeriod(
    allDetails.map((d) => d.match),
    period
  );
  const filteredIds = new Set(filteredMatches.map((m) => m.id));
  const details = allDetails.filter((d) => filteredIds.has(d.match.id));

  const playerMap = new Map<string, PlayerSeasonData>();
  // Tracks jersey number frequency per player key to pick the canonical number
  const numberCounts = new Map<string, Map<number, number>>();

  for (const { actions, players } of details) {
    const myTeam = players.filter((p) => p.team === Team.MY_TEAM && p.num !== 9999);

    for (const player of myTeam) {
      const key = playerKey(player);

      // Track number frequency for canonical number selection
      if (!numberCounts.has(key)) numberCounts.set(key, new Map());
      const counts = numberCounts.get(key)!;
      counts.set(player.num, (counts.get(player.num) ?? 0) + 1);

      if (!playerMap.has(key)) {
        playerMap.set(key, {
          playerId: player.player_id ?? null,
          playerNumber: player.num,
          playerName: player.name,
          photoUrl: player.photoUrl,
          matchesPlayed: 0,
          pts: 0, reb: 0, reb_off: 0, reb_def: 0,
          ast: 0, stl: 0, blk: 0, to: 0, pf: 0, fd: 0,
          ftm: 0, fta: 0, fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0,
          fgm: 0, fga: 0, eff: 0, totalPlayingTimeSeconds: 0,
          avgPts: 0, avgReb: 0, avgAst: 0, avgDef: 0, avgEff: 0,
        });
      }

      const data = playerMap.get(key)!;
      const hasActions = actions.some(
        (a) => a.team === Team.MY_TEAM && a.player === player.num
      );
      const played = (player.playingTimeSeconds ?? 0) > 0 || hasActions;

      if (!played) continue;

      data.matchesPlayed += 1;
      data.totalPlayingTimeSeconds += player.playingTimeSeconds ?? 0;

      const matchStats = computeStatsForPlayer(actions, player.num);
      data.pts += matchStats.pts;
      data.reb += matchStats.reb;
      data.reb_off += matchStats.reb_off;
      data.reb_def += matchStats.reb_def;
      data.ast += matchStats.ast;
      data.stl += matchStats.stl;
      data.blk += matchStats.blk;
      data.to += matchStats.to;
      data.pf += matchStats.pf;
      data.fd += matchStats.fd;
      data.ftm += matchStats.ftm;
      data.fta += matchStats.fta;
      data.fg2m += matchStats.fg2m;
      data.fg2a += matchStats.fg2a;
      data.fg3m += matchStats.fg3m;
      data.fg3a += matchStats.fg3a;
      data.fgm += matchStats.fgm;
      data.fga += matchStats.fga;
    }
  }

  // Set canonical jersey number (most frequent across all matches)
  for (const [key, data] of playerMap.entries()) {
    const counts = numberCounts.get(key);
    if (counts && counts.size > 1) {
      let maxCount = 0;
      for (const [num, count] of counts.entries()) {
        if (count > maxCount) { maxCount = count; data.playerNumber = num; }
      }
    }
  }

  for (const data of playerMap.values()) {
    if (data.matchesPlayed === 0) continue;
    const n = data.matchesPlayed;
    data.avgPts = Math.round((data.pts / n) * 10) / 10;
    data.avgReb = Math.round((data.reb / n) * 10) / 10;
    data.avgAst = Math.round((data.ast / n) * 10) / 10;
    data.avgDef = Math.round(((data.stl + data.blk) / n) * 10) / 10;
    data.eff = calculateEfficiency({
      pts: data.pts, reb: data.reb, ast: data.ast, stl: data.stl, blk: data.blk,
      fg2a: data.fg2a, fg2m: data.fg2m, fg3a: data.fg3a, fg3m: data.fg3m,
      fta: data.fta, ftm: data.ftm, to: data.to, fd: data.fd,
    });
    data.avgEff = Math.round((data.eff / n) * 10) / 10;
  }

  return Array.from(playerMap.values()).filter((p) => p.matchesPlayed > 0);
}

export function computePlayerMatchHistory(
  allDetails: MatchWithDetails[],
  playerNumber: number
): MatchHistoryEntry[] {
  return [...allDetails]
    .sort((a, b) => new Date(b.match.created_at).getTime() - new Date(a.match.created_at).getTime())
    .map(({ match, actions, players }) => {
      const player = players.find(
        (p) => p.team === Team.MY_TEAM && p.num === playerNumber
      );
      if (!player) {
        return { match, played: false, pts: 0, reb: 0, ast: 0, eff: 0 };
      }
      const hasActions = actions.some(
        (a) => a.team === Team.MY_TEAM && a.player === playerNumber
      );
      const played = (player.playingTimeSeconds ?? 0) > 0 || hasActions;
      if (!played) {
        return { match, played: false, pts: 0, reb: 0, ast: 0, eff: 0 };
      }
      const s = computeStatsForPlayer(actions, playerNumber);
      return { match, played: true, pts: s.pts, reb: s.reb, ast: s.ast, eff: s.eff };
    });
}
