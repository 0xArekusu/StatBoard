/**
 * LiveMatchScreen
 *
 * Main screen for live match tracking and statistics recording.
 * Handles real-time action recording, score tracking, player substitutions,
 * and court position visualization.
 *
 * Features:
 * - Real-time action recording (shots, fouls, rebounds, etc.)
 * - Live score tracking for both teams
 * - Period/quarter management with timer
 * - Player substitutions
 * - Court position visualization
 * - Match history and action filtering
 * - Auto-save to SQLite database
 * - Sync to Supabase after match completion
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useTheme } from "../src/contexts/ThemeContext";
import { SLATE_COLORS } from "../src/theme/colors";
import { RootStackParamList, RootNavigationProp } from "../types/navigation";
import {
  MatchStatus,
  CreateMatchData,
  CreateActionData,
  Team,
} from "../src/models/types";
import { ActionType, ShotSpecification, ReboundSpecification, SubstitutionSpecification } from "../src/models/ActionTypes";
import { Player } from "../models/Player";
import { useAuth } from "../src/contexts/AuthContext";
import { MatchManager } from "../src/services/match/MatchManager";
import { ActionQueue } from "../src/services/match/ActionQueue";
import { AdminService } from "../services/AdminService";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { MatchPlayerRepository } from "../src/services/database/MatchPlayerRepository";
import { logInfo, logError } from "../utils/logger";
import {
  generateMockActions,
  MOCK_ROSTER,
  MOCK_OPPONENT_ROSTER,
} from "../utils/mockActions";
import { formatTime, getActionDescription } from "../utils/liveMatchHelpers";
import {
  convertActionsToMatchEvents,
  calculateScoresFromActions,
} from "../utils/matchDataConverters";
import {
  WorkflowStep,
  MatchEvent,
  TeamId,
  ViewMode,
  FilterMode,
  TeamFilterMode,
  ChainContext,
  ChainSuggestion,
  FoulChainContext,
  ShotChainContext,
} from "../constants/liveMatchConstants";
import { getChainContext } from "../utils/actionChainRules";
import {
  COURT_SVG_WIDTH_PORTRAIT,
  COURT_SVG_HEIGHT_PORTRAIT,
} from "../constants";
import { DEFAULT_COURT_COLORS } from "../src/theme/colors";
import { supabase } from "../src/config/supabase";
import { MatchActionGrid, ActionData } from "../components/MatchActionGrid";
import { CourtView, MatchHeader, MatchToolbar, ActionChainModal, FoulChainModal, FoulChainResult, ShotChainModal, ShotChainResult } from "../components/LiveMatch";
import { useMatchSync } from "../hooks/useMatchSync";
import { useResponsive } from "../src/hooks/useResponsive";
import { BREAKPOINTS } from "../constants/breakpoints";
import {
  HistoryModal,
  FilterModal,
  PlayerSelectionModal,
  CourtActionModal,
  SubstitutionModal,
  EndMatchModal,
  OvertimeModal,
  PeriodConfirmModal,
  DeleteActionModal,
  SyncModal,
} from "../components/LiveMatchModals";

type LiveMatchRouteProp = RouteProp<RootStackParamList, "LiveMatch">;

export default function LiveMatchScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<LiveMatchRouteProp>();
  const { colors, isDark } = useTheme();
  const { isCompact, isPortrait, sp, font, width } = useResponsive();
  const isMobileLandscape = !isPortrait && width < BREAKPOINTS.mobileLandscapeMaxWidth;
  const { user } = useAuth();
  const matchData = route.params?.matchData;
  const resumeMatchId = route.params?.matchId;

  // ========================================
  // DATABASE SERVICES
  // ========================================
  const [matchManager] = useState(() => new MatchManager());
  const [matchRepository] = useState(() => new MatchRepository());
  const [actionQueue] = useState(() => new ActionQueue());
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [actionCounter, setActionCounter] = useState(0);
  const [isLoadingMatch, setIsLoadingMatch] = useState(!!resumeMatchId);

  // ========================================
  // MATCH STATE
  // ========================================
  // Initialize match with data from NewMatchScreen or use mock data
  const [match, setMatch] = useState<any>(() => {
    if (matchData) {
      return {
        id: matchData.id,
        clubId: matchData.clubId,
        teamId: matchData.teamId,
        myTeamName: matchData.teamName || "Mon Équipe",
        opponent: matchData.opponent || "Adversaire",
        location: matchData.isHome ? TeamId.HOME : TeamId.AWAY,
        scoreHome: matchData.isHome
          ? (matchData.myTeamHandicap || 0)
          : (matchData.opponentHandicap || 0),
        scoreAway: matchData.isHome
          ? (matchData.opponentHandicap || 0)
          : (matchData.myTeamHandicap || 0),
        myTeamHandicap: matchData.myTeamHandicap || 0,
        opponentHandicap: matchData.opponentHandicap || 0,
        status: "in_progress" as MatchStatus,
        trackOpponentStats: matchData.trackOpponentStats || false,
        roster: matchData.myTeamPlayers || [],
        opponentRoster: matchData.opponentPlayers || [],
        starters: matchData.starters || [],
        periodCount: matchData.periodCount || 4,
        periodDuration: matchData.periodDuration || 10,
        events: [] as MatchEvent[],
        clubLogoUrl: matchData.clubLogoUrl || null,
        courtBackgroundColor:
          matchData.courtBackgroundColor || DEFAULT_COURT_COLORS.background,
        courtLineColor: matchData.courtLineColor || DEFAULT_COURT_COLORS.line,
      };
    }
    // Fallback to mock data
    return {
      id: Date.now().toString(),
      myTeamName: "Mon Équipe",
      opponent: "Adversaire",
      location: TeamId.HOME,
      scoreHome: 0,
      scoreAway: 0,
      status: "in_progress" as MatchStatus,
      trackOpponentStats: false,
      roster: MOCK_ROSTER,
      opponentRoster: MOCK_OPPONENT_ROSTER,
      starters: ["p1", "p2", "p3", "p4", "p5"],
      periodCount: 4,
      periodDuration: 10,
      events: [] as MatchEvent[],
      clubLogoUrl: null,
      courtBackgroundColor: DEFAULT_COURT_COLORS.background,
      courtLineColor: DEFAULT_COURT_COLORS.line,
    };
  });

  // ========================================
  // MATCH CONFIGURATION
  // ========================================
  // Team rosters
  const homeRoster =
    match?.roster && match.roster.length > 0 ? match.roster : [];
  const opponentRoster =
    match?.opponentRoster && match.opponentRoster.length > 0
      ? match.opponentRoster
      : [];

  // Period/quarter settings
  const periodDurationMin = match?.periodDuration || 10;
  const maxPeriods = match?.periodCount || 4;

  // ========================================
  // GAME CLOCK & TIMER
  // ========================================
  // Game Clock - Initialize with match data if resuming, otherwise use defaults
  const [timer, setTimer] = useState(() => {
    if (resumeMatchId) return 0; // Will be set when match loads
    return periodDurationMin * 60;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [quarter, setQuarter] = useState(() => {
    if (resumeMatchId) return 1; // Will be set when match loads
    return 1;
  });

  // Refs to always have access to current values in intervals/callbacks
  const timerRef = useRef(timer);
  const quarterRef = useRef(quarter);
  const currentMatchIdRef = useRef<string | null>(currentMatchId);

  // Keep refs in sync with state
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    quarterRef.current = quarter;
  }, [quarter]);

  useEffect(() => {
    currentMatchIdRef.current = currentMatchId;
  }, [currentMatchId]);

  // ========================================
  // PLAYER STATE (Court & Bench)
  // ========================================
  const [activePlayers, setActivePlayers] = useState<string[]>(() => {
    // Use starters if available
    if (matchData?.starters && matchData.starters.length > 0) {
      return matchData.starters;
    }
    // Otherwise use first 5 players from myTeamPlayers roster
    if (matchData?.myTeamPlayers && matchData.myTeamPlayers.length > 0) {
      return matchData.myTeamPlayers.slice(0, 5).map((p) => p.id);
    }
    // Fallback to mock players
    return ["p1", "p2", "p3", "p4", "p5"];
  });

  const [activeOpponentPlayers, setActiveOpponentPlayers] = useState<string[]>(
    () => {
      // Use opponentStarters if provided, otherwise use first 5 players
      if (
        matchData?.opponentStarters &&
        matchData.opponentStarters.length > 0
      ) {
        return matchData.opponentStarters;
      }
      if (matchData?.opponentPlayers && matchData.opponentPlayers.length > 0) {
        return matchData.opponentPlayers.slice(0, 5).map((p) => p.id);
      }
      // Fallback to mock opponent players
      return ["adv1", "adv2", "adv3", "adv4", "adv5"];
    },
  );

  // Substitution state
  const [subSelection, setSubSelection] = useState<{
    out: string[];
    in: string[];
  }>({ out: [], in: [] });
  const [subTeamTab, setSubTeamTab] = useState<TeamId>(TeamId.HOME);

  // ========================================
  // UI STATE
  // ========================================
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.COURT);
  const [playerSelectionTab, setPlayerSelectionTab] = useState<TeamId>(
    TeamId.HOME,
  );

  // ========================================
  // MODAL STATE
  // ========================================
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [showPeriodConfirm, setShowPeriodConfirm] = useState(false);
  const [overtimeDuration, setOvertimeDuration] = useState(5);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<MatchEvent | null>(null);

  // ========================================
  // ACTION WORKFLOW STATE
  // ========================================
  // Toolbar filters and view settings
  const [showMarkers, setShowMarkers] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>(FilterMode.ALL);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<number[]>([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<TeamFilterMode>(TeamFilterMode.ALL);
  const [isGeneratingMockData, setIsGeneratingMockData] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Multi-step action recording workflow
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>(
    WorkflowStep.IDLE,
  );
  const [pendingEvent, setPendingEvent] = useState<{
    action_type?: string;
    specification?: string;
    points?: number;
    coords?: { x: number; y: number };
    playerId?: string;
  }>({});
  const [chainContext, setChainContext] = useState<ChainContext | null>(null);
  const [foulChainContext, setFoulChainContext] = useState<FoulChainContext | null>(null);
  const [shotChainContext, setShotChainContext] = useState<ShotChainContext | null>(null);

  // ========================================
  // ADMIN STATUS CHECK
  // ========================================
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminService = AdminService.getInstance();
        const admin = await adminService.isAdmin();
        setIsAdmin(admin);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user]);

  // ========================================
  // MATCH INITIALIZATION & RESUME
  // ========================================
  // Initialize match in database on mount or resume existing match
  useEffect(() => {
    const initializeMatch = async () => {
      try {
        // Check if we're resuming an existing match
        if (resumeMatchId) {
          logInfo("LiveMatchScreen", "🔄 Resuming match from database", {
            matchId: resumeMatchId,
          });

          // Load match data from database
          const existingMatch = await matchRepository.findById(resumeMatchId);
          if (!existingMatch) {
            logError("LiveMatchScreen", "❌ Match not found", {
              matchId: resumeMatchId,
            });
            navigation.goBack();
            return;
          }

          // Load actions
          const actionRepo = new ActionRepository();
          const actions = await actionRepo.getActionsForMatch(resumeMatchId);

          // Load players
          const playerRepo = new MatchPlayerRepository();
          const players = await playerRepo.getPlayersForMatch(resumeMatchId);

          logInfo("LiveMatchScreen", "📊 Players loaded from DB", {
            totalPlayers: players.length,
            playersByTeam: players.reduce((acc, p) => {
              acc[p.team] = (acc[p.team] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            trackOpponentStats: existingMatch.track_opponent_stats,
          });

          // Calculate scores from actions (using the new action type system)
          const isHome = existingMatch.is_home;
          const { scoreHome: actionsScoreHome, scoreAway: actionsScoreAway } = calculateScoresFromActions(
            actions,
            isHome,
          );
          const myTeamHandicap = existingMatch.my_team_handicap || 0;
          const opponentHandicap = existingMatch.opponent_handicap || 0;
          const scoreHome = actionsScoreHome + (isHome ? myTeamHandicap : opponentHandicap);
          const scoreAway = actionsScoreAway + (isHome ? opponentHandicap : myTeamHandicap);

          // Separate players by team
          const myTeamPlayersFromDB = players.filter(
            (p) => p.team === "MyTeam",
          );
          const opponentPlayersFromDB = players.filter(
            (p) => p.team === "Opponent",
          );

          // Convert to Player format
          const myTeamRosterLoaded = myTeamPlayersFromDB.map((p) => ({
            id: p.player_id || `temp-${String(p.id)}`,
            name: p.player_name,
            jerseyNumber: p.player_number,
            teamId: existingMatch.team_id || "",
            photoUrl: p.photo_url || null,
            isStarter: p.is_starter,
            createdAt: new Date(p.created_at),
            updatedAt: new Date(p.created_at),
          }));

          const opponentRosterLoaded = opponentPlayersFromDB.map((p) => ({
            id: p.player_id || `temp-${String(p.id)}`,
            name: p.player_name,
            jerseyNumber: p.player_number,
            teamId: "",
            photoUrl: p.photo_url || null,
            isStarter: p.is_starter,
            createdAt: new Date(p.created_at),
            updatedAt: new Date(p.created_at),
          }));

          // Get active players on court (use on_court status, fallback to starters if not set)
          const myTeamOnCourt = myTeamPlayersFromDB
            .filter(
              (p) =>
                p.on_court === 1 || (p.on_court === undefined && p.is_starter),
            )
            .map((p) => p.player_id || `temp-${String(p.id)}`);
          const opponentOnCourt = opponentPlayersFromDB
            .filter(
              (p) =>
                p.on_court === 1 || (p.on_court === undefined && p.is_starter),
            )
            .map((p) => p.player_id || `temp-${String(p.id)}`);

          // Convert actions to MatchEvents for display on court
          const matchEvents = convertActionsToMatchEvents(
            actions,
            players,
            existingMatch.opponent_name || "Adversaire",
            isHome,
          );

          // Update match state with loaded data
          setMatch({
            ...match,
            myTeamName: existingMatch.my_team_name || "Mon Équipe",
            opponent: existingMatch.opponent_name || "Adversaire",
            location: existingMatch.is_home ? TeamId.HOME : TeamId.AWAY,
            trackOpponentStats: existingMatch.track_opponent_stats,
            myTeamHandicap: existingMatch.my_team_handicap || 0,
            opponentHandicap: existingMatch.opponent_handicap || 0,
            scoreHome,
            scoreAway,
            roster: myTeamRosterLoaded,
            opponentRoster: opponentRosterLoaded,
            starters: myTeamOnCourt,
            periodCount: existingMatch.total_periods,
            periodDuration: existingMatch.period_duration / 60, // Convert seconds to minutes
            events: matchEvents,
            clubLogoUrl: existingMatch.club_logo_url || null,
            courtBackgroundColor:
              existingMatch.court_background_color ||
              DEFAULT_COURT_COLORS.background,
            courtLineColor:
              existingMatch.court_line_color || DEFAULT_COURT_COLORS.line,
          });

          // Restore active players on court
          if (myTeamOnCourt.length > 0) {
            setActivePlayers(myTeamOnCourt);
          }
          if (opponentOnCourt.length > 0) {
            setActiveOpponentPlayers(opponentOnCourt);
          }

          // Restore timer and period state
          setQuarter(existingMatch.current_period || 1);
          // Timer represents time REMAINING in period, not elapsed
          const periodDurationSeconds = existingMatch.period_duration || 600;
          const timeElapsed = existingMatch.time_elapsed || 0;
          const timeRemaining = Math.max(
            0,
            periodDurationSeconds - timeElapsed,
          );
          setTimer(timeRemaining);

          // Restore action counter to continue from last action
          const maxActionOrder =
            actions.length > 0
              ? Math.max(...actions.map((a) => a.action_order), 0)
              : 0;
          setActionCounter(maxActionOrder + 1);

          setCurrentMatchId(resumeMatchId);
          setIsLoadingMatch(false);

          logInfo("LiveMatchScreen", "✅ Match resumed successfully", {
            matchId: resumeMatchId,
            scoreHome,
            scoreAway,
            actionsLoaded: actions.length,
            playersLoaded: players.length,
            myTeamRoster: myTeamRosterLoaded.length,
            opponentRoster: opponentRosterLoaded.length,
            myTeamOnCourt: myTeamOnCourt.length,
            opponentOnCourt: opponentOnCourt.length,
            activePlayers: myTeamOnCourt,
            activeOpponentPlayers: opponentOnCourt,
            opponentRosterDetails: opponentRosterLoaded.map((p) => ({
              id: p.id,
              name: p.name,
              isStarter: p.isStarter,
            })),
            timeRemaining,
            currentPeriod: existingMatch.current_period,
          });
        } else {
          // Create new match
          logInfo("LiveMatchScreen", "📋 Match data received from navigation", {
            clubId: match.clubId,
            teamId: match.teamId,
            opponent: match.opponent,
            location: match.location,
          });

          const matchCreateData: CreateMatchData & { created_at: string } = {
            my_team_name: match.myTeamName || null,
            opponent_name: match.opponent || "Adversaire",
            is_home: match.location === TeamId.HOME,
            track_opponent_stats: match.trackOpponentStats || false,
            total_periods: match.periodCount || 4,
            period_duration: (match.periodDuration || 10) * 60, // Convert minutes to seconds
            overtime_duration: overtimeDuration * 60, // Convert minutes to seconds
            club_id: match.clubId || null,
            team_id: match.teamId || null,
            club_logo_url: match.clubLogoUrl || null,
            court_background_color: match.courtBackgroundColor || null,
            court_line_color: match.courtLineColor || null,
            my_team_handicap: match.myTeamHandicap || 0,
            opponent_handicap: match.opponentHandicap || 0,
            created_at: match.createdAt || new Date().toISOString(), // Use timestamp from NewMatchScreen
          };

          logInfo(
            "LiveMatchScreen",
            "💾 Creating match in SQLite database",
            matchCreateData,
          );
          const createdMatch = await matchManager.createMatch(matchCreateData);
          setCurrentMatchId(createdMatch.id);
          logInfo(
            "LiveMatchScreen",
            "✅ Match created successfully in SQLite",
            {
              matchId: createdMatch.id,
              opponent: createdMatch.opponent_name,
              isHome: createdMatch.is_home,
            },
          );

          // Save players to database
          const matchPlayerRepo = new MatchPlayerRepository();

          // Prepare my team players
          const myTeamPlayersToSave = homeRoster.map((player: Player) => ({
            match_id: createdMatch.id,
            player_id: player.id,
            player_number: player.jerseyNumber,
            player_name: player.name,
            team: "MyTeam" as const,
            is_starter: match.starters?.includes(player.id) || false,
            photo_url: player.photoUrl || null,
          }));

          // Prepare opponent players (if tracking opponent stats)
          const opponentPlayersToSave = match.trackOpponentStats
            ? opponentRoster.map((player: Player) => ({
                match_id: createdMatch.id,
                player_id: player.id,
                player_number: player.jerseyNumber,
                player_name: player.name,
                team: "Opponent" as const,
                is_starter:
                  matchData?.opponentStarters?.includes(player.id) || false,
                photo_url: player.photoUrl || null,
              }))
            : [
                // If not tracking opponent stats, create a generic opponent player (9999)
                // This is needed for compaction to work with +1/+2/+3 quick score actions
                {
                  match_id: createdMatch.id,
                  player_id: null,
                  player_number: 9999,
                  player_name: match.opponent || "Adversaire",
                  team: "Opponent" as const,
                  photo_url: null,
                },
              ];

          const allPlayersToSave = [
            ...myTeamPlayersToSave,
            ...opponentPlayersToSave,
          ];

          if (allPlayersToSave.length > 0) {
            logInfo("LiveMatchScreen", "💾 Saving players to SQLite", {
              matchId: createdMatch.id,
              myTeamPlayersCount: myTeamPlayersToSave.length,
              opponentPlayersCount: opponentPlayersToSave.length,
              totalPlayers: allPlayersToSave.length,
            });
            await matchPlayerRepo.createBatch(allPlayersToSave);

            // Initialize on_court status for starters
            await matchPlayerRepo.initializeOnCourtForStarters(createdMatch.id);

            logInfo(
              "LiveMatchScreen",
              "✅ Players saved to SQLite successfully",
              {
                matchId: createdMatch.id,
                savedPlayersCount: allPlayersToSave.length,
              },
            );
          }
        }
      } catch (error) {
        logError("LiveMatchScreen", "❌ Failed to initialize match", error);
      }
    };

    initializeMatch();
  }, [resumeMatchId]);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timer]);

  // ========================================
  // MATCH STATE PERSISTENCE
  // ========================================
  /**
   * Saves current match state (period, timer) to database
   * Called periodically (every 5s) and before critical operations
   */
  const saveMatchState = async () => {
    if (!currentMatchIdRef.current) return;

    try {
      const periodDurationSeconds = (match.periodDuration || 10) * 60;
      const timeElapsed = periodDurationSeconds - timerRef.current;

      await matchManager.updateMatchState(
        currentMatchIdRef.current,
        quarterRef.current,
        timeElapsed,
      );

      logInfo("LiveMatchScreen", "💾 Match state saved", {
        matchId: currentMatchIdRef.current,
        quarter: quarterRef.current,
        timeElapsed,
        timeRemaining: timerRef.current,
      });
    } catch (error) {
      logError("LiveMatchScreen", "❌ Failed to save match state", error);
    }
  };

  // ========================================
  // MATCH SYNC HOOK
  // ========================================
  /**
   * Hook for handling match completion and synchronization
   * - Ends match in database
   * - Syncs to Supabase if user is authenticated and has subscription
   * - Navigates to match details or dashboard
   */
  const { isSyncing, endMatchAndSync } = useMatchSync({
    currentMatchId,
    match,
    quarter,
    maxPeriods,
    saveMatchState,
    matchManager,
    matchRepository,
    supabase,
    user,
  });

  // Save match state and playing time periodically (every 5 seconds when running)
  useEffect(() => {
    if (!currentMatchId || !isRunning) return;

    const saveInterval = setInterval(async () => {
      // Save match state (timer, period)
      await saveMatchState();

      // Add 5 seconds to playing time for all players on court
      const playerRepo = new MatchPlayerRepository();
      await playerRepo.addPlayingTime(currentMatchId, 5);
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [currentMatchId, isRunning]); // Only depend on matchId and isRunning

  // Save match state when component unmounts (app closes or navigates away)
  useEffect(() => {
    return () => {
      // Save on unmount
      if (currentMatchIdRef.current) {
        const periodDurationSeconds = (match.periodDuration || 10) * 60;
        const timeElapsed = periodDurationSeconds - timerRef.current;

        matchManager
          .updateMatchState(
            currentMatchIdRef.current,
            quarterRef.current,
            timeElapsed,
          )
          .then(() => {
            logInfo("LiveMatchScreen", "💾 Match state saved on unmount");
          })
          .catch((error) => {
            logError("LiveMatchScreen", "❌ Failed to save on unmount", error);
          });
      }
    };
  }, []); // Empty deps - only run on unmount

  // Block back button during live match
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Block back button - user must finish all periods to end match
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);

  // Toggle timer play/pause with automatic save on pause
  const toggleTimer = async () => {
    if (isRunning) {
      // Pausing - save state immediately
      saveMatchState();
    } else {
      // Starting timer - set started_at if not already set
      if (currentMatchId) {
        try {
          const matchRepo = new MatchRepository();
          const currentMatch = await matchRepo.findById(currentMatchId);
          if (currentMatch && !currentMatch.started_at) {
            const matchManager = new MatchManager();
            await matchManager.startMatch(currentMatchId);
            logInfo("LiveMatchScreen", "✅ Match started_at set on timer start", {
              matchId: currentMatchId,
            });
          }
        } catch (error) {
          logError("LiveMatchScreen", "❌ Error setting started_at on timer start", { error });
        }
      }
    }
    setIsRunning(!isRunning);
  };

  const handleNextQuarter = () => {
    setIsRunning(false);

    // Save current state before changing period
    saveMatchState();

    // Si c'est le dernier quart-temps, afficher directement le modal de fin/overtime
    if (quarter >= maxPeriods) {
      setShowOvertimeModal(true);
      return;
    }

    // Si le timer n'est pas à 0, demander confirmation avant de passer à la période suivante
    if (timer > 0) {
      setShowPeriodConfirm(true);
      return;
    }

    // Sinon, passer directement à la période suivante
    proceedToNextPeriod();
  };

  const proceedToNextPeriod = () => {
    setShowPeriodConfirm(false);

    setQuarter((prev) => prev + 1);
    setTimer(periodDurationMin * 60);

    // Save state after period change
    // Use setTimeout to ensure state is updated
    setTimeout(() => saveMatchState(), 100);
  };

  const startOvertime = () => {
    setQuarter((prev) => prev + 1);
    setTimer(overtimeDuration * 60);
    setShowOvertimeModal(false);

    // Save state after starting overtime
    setTimeout(() => saveMatchState(), 100);
  };

  // --- TOOLBAR ACTIONS ---

  const undoLastAction = () => {
    if (!match.events || match.events.length === 0) return;

    const lastEvent = match.events[0];
    setEventToDelete(lastEvent);
    setShowDeleteConfirm(true);
  };

  // ========================================
  // MOCK DATA GENERATION (For Testing)
  // ========================================
  /**
   * Generates realistic mock match actions for testing
   * Creates ~50 actions per period with realistic shot percentages
   * Results in ~80-90 points per team over 4 periods
   */
  const handleGenerateMockActions = async () => {
    if (!currentMatchId || isGeneratingMockData) return;

    setIsGeneratingMockData(true);

    try {
      // Créer des joueurs fictifs basés sur le roster
      const playersMyTeam =
        homeRoster.length > 0
          ? homeRoster.map((p: Player) => ({
              jersey_number: p.jerseyNumber,
              name: p.name,
            }))
          : Array.from({ length: 5 }, (_, i) => ({
              jersey_number: i + 1,
              name: `Joueur ${i + 1}`,
            }));

      // Only create opponent players if we're tracking opponent stats
      const playersOpponent = match.trackOpponentStats
        ? opponentRoster.length > 0
          ? opponentRoster.map((p: Player) => ({
              jersey_number: p.jerseyNumber,
              name: p.name,
            }))
          : Array.from({ length: 5 }, (_, i) => ({
              jersey_number: i + 10,
              name: `Adversaire ${i + 1}`,
            }))
        : undefined;

      // Générer actions fictives (25 par période)
      // Générer ~50 actions par période pour atteindre 80-90 points par équipe
      // Avec 45% de tirs et ~45% de réussite, cela donne environ 20-22 paniers réussis par période
      // Soit ~80-88 points sur 4 périodes
      const mockActions = generateMockActions(
        currentMatchId,
        playersMyTeam,
        playersOpponent,
        maxPeriods === 2 ? "2_halves" : "4_quarters",
        periodDurationMin * 60,
        50, // Augmenté de 25 à 50 actions par période
      );

      // Log mock actions breakdown
      const myTeamActions = mockActions.filter(
        (a) => a.team === Team.MY_TEAM,
      ).length;
      const opponentActions = mockActions.filter(
        (a) => a.team === Team.OPPONENT,
      ).length;
      logInfo("LiveMatchScreen", "🎲 Mock actions generated", {
        total: mockActions.length,
        myTeam: myTeamActions,
        opponent: opponentActions,
        trackOpponentStats: match.trackOpponentStats,
      });

      // Convertir et enregistrer les actions
      const actionRepo = new ActionRepository();
      for (const mockAction of mockActions) {
        await actionRepo.create({
          match_id: currentMatchId,
          team: mockAction.team, // Already using Team.MY_TEAM or Team.OPPONENT
          player_number: mockAction.player_number,
          action_type: mockAction.action_type,
          specification: mockAction.specification,
          points: mockAction.points,
          semantic_x: mockAction.semantic_x,
          semantic_y: mockAction.semantic_y,
          action_order: mockAction.action_order,
          period_number: mockAction.period_number,
          time_in_period: mockAction.time_in_period,
        });
      }

      // Recharger les actions pour mettre à jour l'affichage
      const loadedActions = await actionRepo.getActionsForMatch(currentMatchId);

      // Préparer les joueurs pour la conversion
      const allPlayers = [
        ...homeRoster.map((p: Player) => ({
          player_id: p.id,
          player_number: p.jerseyNumber,
          player_name: p.name,
          team: "MyTeam" as const,
        })),
        ...opponentRoster.map((p: Player) => ({
          player_id: p.id,
          player_number: p.jerseyNumber,
          player_name: p.name,
          team: "Opponent" as const,
        })),
      ];

      // Convertir les actions en événements en utilisant la fonction existante
      const isHome = match.location === TeamId.HOME;
      const convertedEvents = convertActionsToMatchEvents(
        loadedActions,
        allPlayers,
        match.opponent || "Adversaire",
        isHome,
      );

      // DEBUG: Log summary
      const eventTypes = convertedEvents.reduce((acc, e) => {
        acc[e.action_type] = (acc[e.action_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      logInfo("LiveMatchScreen", "📊 Mock events summary", eventTypes);

      // Calculer le nouveau score en utilisant la fonction existante
      const isHomeMock = match.location === TeamId.HOME;
      const { scoreHome: newScoreHome, scoreAway: newScoreAway } =
        calculateScoresFromActions(loadedActions, isHomeMock);

      // Mettre à jour le match
      setMatch({
        ...match,
        events: convertedEvents,
        scoreHome: newScoreHome,
        scoreAway: newScoreAway,
      });

      setActionCounter(actionCounter + mockActions.length);

      logInfo("LiveMatchScreen", "✅ Mock actions generated successfully", {
        count: mockActions.length,
        scoreHome: newScoreHome,
        scoreAway: newScoreAway,
      });
    } catch (error) {
      logError("LiveMatchScreen", "❌ Error generating mock actions", {
        error,
      });
    } finally {
      setIsGeneratingMockData(false);
    }
  };

  // ========================================
  // ACTION DELETION
  // ========================================
  /**
   * Shows confirmation dialog before deleting an action
   */
  const deleteEvent = (eventId: string) => {
    if (!match.events) return;
    const event = match.events.find((e: MatchEvent) => e.id === eventId);
    if (!event) return;

    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  /**
   * Directly deletes an action (used by HistoryModal which handles its own confirmation)
   * Reverts score and removes from database
   */
  const deleteEventDirectly = async (eventId: string) => {
    if (!match.events) return;
    const event = match.events.find((e: MatchEvent) => e.id === eventId);
    if (!event) return;

    const updatedEvents = match.events.filter(
      (e: MatchEvent) => e.id !== eventId,
    );
    const updatedMatch = { ...match, events: updatedEvents };

    // Revert Score - only for made shots
    if (
      event.action_type === ActionType.SHOT &&
      event.specification === ShotSpecification.MADE &&
      event.points
    ) {
      // Check if this is my team's action or opponent's action
      // event.teamId represents the team that scored (HOME or AWAY)
      // We need to determine if that's my team or opponent based on match.location
      const isMyTeamAction = event.teamId === match.location;

      if (isMyTeamAction) {
        // My team scored - decrement the correct score based on location
        if (match.location === TeamId.HOME) {
          updatedMatch.scoreHome = Math.max(0, updatedMatch.scoreHome - event.points);
        } else {
          updatedMatch.scoreAway = Math.max(0, updatedMatch.scoreAway - event.points);
        }
      } else {
        // Opponent scored - decrement the correct score based on location
        if (match.location === TeamId.HOME) {
          updatedMatch.scoreAway = Math.max(0, updatedMatch.scoreAway - event.points);
        } else {
          updatedMatch.scoreHome = Math.max(0, updatedMatch.scoreHome - event.points);
        }
      }
    }

    setMatch(updatedMatch);

    // Delete from database
    if (currentMatchId && event.id) {
      try {
        const actionRepo = new ActionRepository();
        await actionRepo.deleteAction(event.id);

        logInfo("LiveMatchScreen", "✅ Action deleted from database", {
          eventId: event.id,
          description: event.description,
        });
      } catch (error) {
        logError(
          "LiveMatchScreen",
          "❌ Failed to delete action from database",
          error,
        );
      }
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete || !match.events) return;

    const updatedEvents = match.events.filter(
      (e: MatchEvent) => e.id !== eventToDelete.id,
    );
    const updatedMatch = { ...match, events: updatedEvents };

    // Revert Score - only for made shots
    if (
      eventToDelete.action_type === ActionType.SHOT &&
      eventToDelete.specification === ShotSpecification.MADE &&
      eventToDelete.points
    ) {
      // Check if this is my team's action or opponent's action
      // eventToDelete.teamId represents the team that scored (HOME or AWAY)
      // We need to determine if that's my team or opponent based on match.location
      const isMyTeamAction = eventToDelete.teamId === match.location;

      if (isMyTeamAction) {
        // My team scored - decrement the correct score based on location
        if (match.location === TeamId.HOME) {
          updatedMatch.scoreHome = Math.max(0, updatedMatch.scoreHome - eventToDelete.points);
        } else {
          updatedMatch.scoreAway = Math.max(0, updatedMatch.scoreAway - eventToDelete.points);
        }
      } else {
        // Opponent scored - decrement the correct score based on location
        if (match.location === TeamId.HOME) {
          updatedMatch.scoreAway = Math.max(0, updatedMatch.scoreAway - eventToDelete.points);
        } else {
          updatedMatch.scoreHome = Math.max(0, updatedMatch.scoreHome - eventToDelete.points);
        }
      }
    }

    setMatch(updatedMatch);

    // Delete from database
    if (currentMatchId && eventToDelete.id) {
      try {
        const actionRepo = new ActionRepository();
        await actionRepo.deleteAction(eventToDelete.id);

        logInfo("LiveMatchScreen", "✅ Action deleted from database", {
          eventId: eventToDelete.id,
          description: eventToDelete.description,
        });
      } catch (error) {
        logError(
          "LiveMatchScreen",
          "❌ Failed to delete action from database",
          error,
        );
      }
    }

    setShowDeleteConfirm(false);
    setEventToDelete(null);
  };

  // --- WORKFLOW ACTIONS ---

  const handleActionClick = (actionData: ActionData) => {
    setPendingEvent(actionData);
    setPlayerSelectionTab(TeamId.HOME);
    setWorkflowStep(WorkflowStep.SELECT_PLAYER);
  };

  const handleCourtClick = (svgX: number, svgY: number) => {
    // Store coordinates and show action selection modal
    setPendingEvent({ coords: { x: svgX, y: svgY } });
    setWorkflowStep(WorkflowStep.SELECT_ACTION_FROM_COURT);
  };

  const handleCourtActionSelect = (actionData: ActionData) => {
    setPendingEvent((prev) => ({ ...prev, ...actionData }));
    setWorkflowStep(WorkflowStep.SELECT_PLAYER);
  };

  const handlePlayerSelect = (playerId: string) => {
    if (pendingEvent.action_type) {
      finalizeEvent(
        pendingEvent.action_type,
        pendingEvent.specification,
        pendingEvent.points || 0,
        playerId,
        pendingEvent.coords,
      );
    }
  };

  // --- SUBSTITUTION ---

  const openSubstitution = () => {
    setSubSelection({ out: [], in: [] });
    setSubTeamTab(TeamId.HOME);
    setWorkflowStep(WorkflowStep.SUBSTITUTION);
  };

  const toggleSubOut = (playerId: string) => {
    setSubSelection((prev) => {
      const isSelected = prev.out.includes(playerId);
      return {
        ...prev,
        out: isSelected
          ? prev.out.filter((id) => id !== playerId)
          : [...prev.out, playerId],
      };
    });
  };

  const toggleSubIn = (playerId: string) => {
    setSubSelection((prev) => {
      const isSelected = prev.in.includes(playerId);
      return {
        ...prev,
        in: isSelected
          ? prev.in.filter((id) => id !== playerId)
          : [...prev.in, playerId],
      };
    });
  };

  const commitSubstitution = async () => {
    const isHome = subTeamTab === TeamId.HOME;
    const currentActive = isHome ? activePlayers : activeOpponentPlayers;

    const remainingPlayers = currentActive.filter(
      (id) => !subSelection.out.includes(id),
    );
    const newActivePlayers = [...remainingPlayers, ...subSelection.in];

    const amIHome = match.location === TeamId.HOME;
    const isOurTeam = isHome === amIHome;
    const subTeamName = isOurTeam ? (match.myTeamName || "Mon équipe") : (match.opponent || "Adversaire");
    const subDescription = `Changements (${subTeamName}): ${subSelection.in.length} joueur(s)`;

    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}`,
      action_type: "substitution",
      timestamp: Date.now(),
      description: subDescription,
      teamId: isHome ? TeamId.HOME : TeamId.AWAY,
      period_number: quarter,
      time_in_period: periodDurationMin * 60 - timer,
      subPlayersOut: subSelection.out,
      subPlayersIn: subSelection.in,
    };

    const updatedMatch = { ...match };
    if (!updatedMatch.events) updatedMatch.events = [];
    updatedMatch.events = [newEvent, ...updatedMatch.events];
    setMatch(updatedMatch);

    if (isHome) {
      setActivePlayers(newActivePlayers);
    } else {
      setActiveOpponentPlayers(newActivePlayers);
    }

    // Update on_court status in database
    if (currentMatchId) {
      const playerRepo = new MatchPlayerRepository();

      // Set players OUT to on_court = 0
      if (subSelection.out.length > 0) {
        await playerRepo.updateOnCourtStatus(
          currentMatchId,
          subSelection.out,
          false,
        );
      }

      // Set players IN to on_court = 1
      if (subSelection.in.length > 0) {
        await playerRepo.updateOnCourtStatus(
          currentMatchId,
          subSelection.in,
          true,
        );
      }

      // Record substitution events for +/- calculation
      const actionRepo = new ActionRepository();
      const subTeam = isOurTeam ? "MyTeam" : ("Opponent" as "MyTeam" | "Opponent");
      const subRoster = isOurTeam ? homeRoster : opponentRoster;
      const timeInPeriod = periodDurationMin * 60 - timer;
      let orderOffset = 0;

      for (const playerId of subSelection.out) {
        const player = subRoster.find((p) => p.id === playerId);
        if (!player) continue;
        await actionRepo.create({
          match_id: currentMatchId,
          team: subTeam,
          player_number: player.jerseyNumber,
          action_type: ActionType.SUBSTITUTION,
          specification: SubstitutionSpecification.OUT,
          semantic_x: 50,
          semantic_y: 50,
          action_order: actionCounter + orderOffset,
          period_number: quarter,
          time_in_period: timeInPeriod,
        });
        orderOffset++;
      }

      for (const playerId of subSelection.in) {
        const player = subRoster.find((p) => p.id === playerId);
        if (!player) continue;
        await actionRepo.create({
          match_id: currentMatchId,
          team: subTeam,
          player_number: player.jerseyNumber,
          action_type: ActionType.SUBSTITUTION,
          specification: SubstitutionSpecification.IN,
          semantic_x: 50,
          semantic_y: 50,
          action_order: actionCounter + orderOffset,
          period_number: quarter,
          time_in_period: timeInPeriod,
        });
        orderOffset++;
      }

      if (orderOffset > 0) {
        setActionCounter((prev) => prev + orderOffset);
      }
    }

    setWorkflowStep(WorkflowStep.IDLE);
  };

  // --- FINALIZATION ---

  const finalizeEvent = async (
    action_type: string,
    specification: string | undefined,
    points: number,
    playerId: string,
    coords?: { x: number; y: number },
    fromChainActionType?: string,
  ) => {
    // Set started_at on first action if not already set
    if (currentMatchId) {
      try {
        const matchRepo = new MatchRepository();
        const currentMatch = await matchRepo.findById(currentMatchId);
        if (currentMatch && !currentMatch.started_at) {
          const matchManager = new MatchManager();
          await matchManager.startMatch(currentMatchId);
          logInfo("LiveMatchScreen", "✅ Match started_at set on first action", {
            matchId: currentMatchId,
          });
        }
      } catch (error) {
        logError("LiveMatchScreen", "❌ Error setting started_at", { error });
      }
    }

    const isMyTeamPlayer = homeRoster.some((p: Player) => p.id === playerId);
    const player = isMyTeamPlayer
      ? homeRoster.find((p: Player) => p.id === playerId)
      : opponentRoster.find((p: Player) => p.id === playerId);

    // Determine teamId based on whether it's my team and match location
    // If my team player: use match.location (HOME if home, AWAY if away)
    // If opponent player: use opposite of match.location
    const teamId = isMyTeamPlayer
      ? match.location
      : match.location === TeamId.HOME
      ? TeamId.AWAY
      : TeamId.HOME;

    const pName = player?.name || "Joueur";

    // Create temporary action object for description
    // When we are home (match.location === TeamId.HOME):
    //   - If teamId is HOME -> Team.MY_TEAM
    //   - If teamId is AWAY -> Team.OPPONENT
    // When we are away (match.location === TeamId.AWAY):
    //   - If teamId is AWAY -> Team.MY_TEAM
    //   - If teamId is HOME -> Team.OPPONENT
    const tempAction = {
      action_type,
      specification,
      points,
      player_number: player?.jerseyNumber || 0,
      team: teamId === match.location ? Team.MY_TEAM : Team.OPPONENT,
    };
    const desc = getActionDescription(tempAction, pName);

    // Normalize SVG coordinates (0-COURT_SVG_WIDTH_PORTRAIT x 0-COURT_SVG_HEIGHT_PORTRAIT) to 0-1 for storage in state
    const normalizedCoords = coords
      ? {
          x: coords.x / COURT_SVG_WIDTH_PORTRAIT,
          y: coords.y / COURT_SVG_HEIGHT_PORTRAIT,
        }
      : undefined;

    // Save to database first to get UUID
    const team = teamId === match.location ? Team.MY_TEAM : Team.OPPONENT;
    const actionId = await saveActionToDatabase(
      action_type,
      specification,
      points,
      player?.jerseyNumber || 0,
      team,
      coords,
    );

    // Create event with real UUID from database
    const newEvent: MatchEvent = {
      id: actionId || `temp-${Date.now()}`, // Fallback to temp ID if save failed
      action_type,
      specification,
      points,
      playerId,
      playerNumber: player?.jerseyNumber,
      teamId,
      timestamp: Date.now(),
      description: desc,
      coordinates: normalizedCoords,
      period_number: quarter,
      time_in_period: periodDurationMin * 60 - timer,
    };

    const updatedMatch = { ...match };
    if (!updatedMatch.events) updatedMatch.events = [];
    updatedMatch.events = [newEvent, ...updatedMatch.events];

    // Update Score - only for made shots
    if (
      action_type === ActionType.SHOT &&
      specification === ShotSpecification.MADE &&
      points > 0
    ) {
      if (teamId === TeamId.HOME) {
        updatedMatch.scoreHome += points;
      } else {
        updatedMatch.scoreAway += points;
      }
    }

    setMatch(updatedMatch);

    // FOUL_DRAWN triggers its own dedicated chain modal
    if (action_type === ActionType.FOUL_DRAWN && !fromChainActionType) {
      setFoulChainContext({
        foulDrawnPlayerId: playerId,
        foulDrawnPlayerNumber: player?.jerseyNumber || 0,
        foulDrawnPlayerName: player?.name || "",
        foulDrawnTeamId: teamId,
        coords,
      });
      setWorkflowStep(WorkflowStep.FOUL_CHAIN);
      setPendingEvent({});
      return;
    }

    // FOUL triggers foul chain modal — ask who drew the foul (either team)
    if (action_type === ActionType.FOUL && match.trackOpponentStats) {
      setFoulChainContext({
        foulDrawnPlayerId: playerId,
        foulDrawnPlayerNumber: player?.jerseyNumber || 0,
        foulDrawnPlayerName: player?.name || "",
        foulDrawnTeamId: teamId,
        coords,
        mode: "foul_committed",
      });
      setWorkflowStep(WorkflowStep.FOUL_CHAIN);
      setPendingEvent({});
      return;
    }

    // SHOT.MISSED triggers ShotChainModal (block + rebound)
    if (action_type === ActionType.SHOT && specification === ShotSpecification.MISSED) {
      setShotChainContext({
        shotPlayerId: playerId,
        shotPlayerNumber: player?.jerseyNumber || 0,
        shotTeamId: teamId,
        coords,
      });
      setWorkflowStep(WorkflowStep.SHOT_CHAIN);
      setPendingEvent({});
      return;
    }

    // Standard action chain check
    const chain = getChainContext(
      newEvent,
      match.trackOpponentStats,
      match.location,
      match.myTeamName,
      match.opponent,
      fromChainActionType,
    );
    if (chain) {
      setChainContext(chain);
      setWorkflowStep(WorkflowStep.SUGGEST_CHAIN);
      setPendingEvent({});
    } else {
      closeWorkflow();
    }
  };

  const handleChainPlayerSelect = async (suggestion: ChainSuggestion, player: Player | null, teamId?: TeamId) => {
    const coords = chainContext?.inheritCoords
      ? {
          x: chainContext.inheritCoords.x * COURT_SVG_WIDTH_PORTRAIT,
          y: chainContext.inheritCoords.y * COURT_SVG_HEIGHT_PORTRAIT,
        }
      : undefined;

    if (suggestion.teamOnly && teamId !== undefined) {
      const reboundTeam = teamId === match.location ? Team.MY_TEAM : Team.OPPONENT;
      const normalizedCoords = chainContext?.inheritCoords;
      const reboundId = await saveActionToDatabase(
        suggestion.action_type, suggestion.specification, 0,
        -1, reboundTeam, coords,
      );
      const updatedMatch = { ...match, events: [...(match.events || [])] };
      updatedMatch.events = [{
        id: reboundId || `temp-${Date.now()}`,
        action_type: suggestion.action_type,
        specification: suggestion.specification,
        points: 0,
        playerId: undefined,
        playerNumber: -1,
        teamId,
        timestamp: Date.now(),
        description: "Équipe — Rebond",
        coordinates: normalizedCoords,
        period_number: quarter,
        time_in_period: periodDurationMin * 60 - timer,
      }, ...updatedMatch.events];
      setMatch(updatedMatch);
      setChainContext(null);
      closeWorkflow();
      return;
    }

    if (!player) return;
    finalizeEvent(
      suggestion.action_type,
      suggestion.specification,
      0,
      player.id,
      coords,
      chainContext?.triggerActionType,
    );
  };

  const handleChainIgnore = () => {
    setChainContext(null);
    closeWorkflow();
  };

  const handleFoulChainIgnore = () => {
    setFoulChainContext(null);
    closeWorkflow();
  };

  const handleShotChainIgnore = () => {
    setShotChainContext(null);
    closeWorkflow();
  };

  const handleShotChainComplete = async (result: ShotChainResult) => {
    if (!shotChainContext) return;

    const { shotPlayerId, shotPlayerNumber, shotTeamId, coords } = shotChainContext;
    const isMyTeamShot = shotTeamId === match.location;
    const shotTeam = isMyTeamShot ? Team.MY_TEAM : Team.OPPONENT;
    const opponentTeamId = shotTeamId === TeamId.HOME ? TeamId.AWAY : TeamId.HOME;
    const normalizedCoords = coords
      ? { x: coords.x / COURT_SVG_WIDTH_PORTRAIT, y: coords.y / COURT_SVG_HEIGHT_PORTRAIT }
      : undefined;

    const updatedMatch = { ...match, events: [...(match.events || [])] };

    // 1. Save BLOCK if blocked
    if (result.blockerPlayer) {
      const blockerTeam = isMyTeamShot ? Team.OPPONENT : Team.MY_TEAM;
      const blockerTeamId = opponentTeamId;
      const blockId = await saveActionToDatabase(
        ActionType.BLOCK, undefined, 0,
        result.blockerPlayer.jerseyNumber, blockerTeam, coords,
      );
      updatedMatch.events = [{
        id: blockId || `temp-${Date.now()}`,
        action_type: ActionType.BLOCK,
        specification: undefined,
        points: 0,
        playerId: result.blockerPlayer.id,
        playerNumber: result.blockerPlayer.jerseyNumber,
        teamId: blockerTeamId,
        timestamp: Date.now(),
        description: `#${result.blockerPlayer.jerseyNumber} ${result.blockerPlayer.name} — Contre`,
        coordinates: normalizedCoords,
        period_number: quarter,
        time_in_period: periodDurationMin * 60 - timer,
      }, ...updatedMatch.events];
    }

    // 2. Save REBOUND if selected
    if (result.reboundSpec === ReboundSpecification.TEAM && result.reboundTeamId) {
      const reboundTeam = result.reboundTeamId === match.location ? Team.MY_TEAM : Team.OPPONENT;
      const reboundId = await saveActionToDatabase(
        ActionType.REBOUND, result.reboundSpec, 0,
        -1, reboundTeam, coords,
      );
      updatedMatch.events = [{
        id: reboundId || `temp-${Date.now()}`,
        action_type: ActionType.REBOUND,
        specification: result.reboundSpec,
        points: 0,
        playerId: undefined,
        playerNumber: -1,
        teamId: result.reboundTeamId,
        timestamp: Date.now(),
        description: "Équipe — Rebond",
        coordinates: normalizedCoords,
        period_number: quarter,
        time_in_period: periodDurationMin * 60 - timer,
      }, ...updatedMatch.events];
    } else if (result.reboundSpec && result.reboundPlayer) {
      const isDefensive = result.reboundSpec === "defensive";
      // Defensive rebound: opponents of shooting team. Offensive: shooting team.
      const reboundTeam = isDefensive
        ? (isMyTeamShot ? Team.OPPONENT : Team.MY_TEAM)
        : shotTeam;
      const reboundTeamId = isDefensive ? opponentTeamId : shotTeamId;
      const reboundId = await saveActionToDatabase(
        ActionType.REBOUND, result.reboundSpec, 0,
        result.reboundPlayer.jerseyNumber, reboundTeam, coords,
      );
      updatedMatch.events = [{
        id: reboundId || `temp-${Date.now()}`,
        action_type: ActionType.REBOUND,
        specification: result.reboundSpec,
        points: 0,
        playerId: result.reboundPlayer.id,
        playerNumber: result.reboundPlayer.jerseyNumber,
        teamId: reboundTeamId,
        timestamp: Date.now(),
        description: `#${result.reboundPlayer.jerseyNumber} ${result.reboundPlayer.name} — Rebond ${isDefensive ? "défensif" : "offensif"}`,
        coordinates: normalizedCoords,
        period_number: quarter,
        time_in_period: periodDurationMin * 60 - timer,
      }, ...updatedMatch.events];
    }

    setMatch(updatedMatch);
    setShotChainContext(null);

    // 3. If offensive rebound → suggest a new shot chain via ActionChainModal
    if (result.reboundSpec === "offensive" && result.reboundPlayer) {
      const syntheticEvent: MatchEvent = {
        id: "reb-chain",
        action_type: ActionType.REBOUND,
        specification: "offensive",
        points: 0,
        playerId: result.reboundPlayer.id,
        playerNumber: result.reboundPlayer.jerseyNumber,
        teamId: isMyTeamShot ? shotTeamId : opponentTeamId,
        timestamp: Date.now(),
        description: "",
        coordinates: normalizedCoords,
        period_number: quarter,
        time_in_period: periodDurationMin * 60 - timer,
      };
      const chain = getChainContext(
        syntheticEvent, match.trackOpponentStats, match.location,
        match.myTeamName, match.opponent, undefined,
      );
      if (chain) {
        setChainContext(chain);
        setWorkflowStep(WorkflowStep.SUGGEST_CHAIN);
        return;
      }
    }

    closeWorkflow();
  };

  const handleFoulChainComplete = async (result: FoulChainResult) => {
    if (!foulChainContext) return;

    const { foulDrawnPlayerId, foulDrawnPlayerNumber, foulDrawnPlayerName, foulDrawnTeamId, coords } = foulChainContext;
    const isMyTeamPlayer = homeRoster.some((p: Player) => p.id === foulDrawnPlayerId);
    const foulDrawnTeam = isMyTeamPlayer ? Team.MY_TEAM : Team.OPPONENT;
    const opponentTeamId = foulDrawnTeamId === TeamId.HOME ? TeamId.AWAY : TeamId.HOME;

    // Build everything in one pass — avoids stale closure overwrite from finalizeEvent
    const updatedMatch = { ...match, events: [...(match.events || [])] };
    const normalizedCoords = coords
      ? { x: coords.x / COURT_SVG_WIDTH_PORTRAIT, y: coords.y / COURT_SVG_HEIGHT_PORTRAIT }
      : undefined;

    // ── foul_committed mode: result.foulPlayer drew the foul, pts/LF go to them ─────
    if (foulChainContext.mode === "foul_committed" && result.foulPlayer) {
      const drawnPlayer = result.foulPlayer;
      const drawnTeam = isMyTeamPlayer ? Team.OPPONENT : Team.MY_TEAM;
      const drawnTeamId = opponentTeamId;

      // 1. Save FOUL_DRAWN for the player who drew the foul
      const foulDrawnId = await saveActionToDatabase(
        ActionType.FOUL_DRAWN, undefined, 0,
        drawnPlayer.jerseyNumber, drawnTeam, coords,
      );
      updatedMatch.events = [{
        id: foulDrawnId || `temp-${Date.now()}`,
        action_type: ActionType.FOUL_DRAWN,
        specification: undefined,
        points: 0,
        playerId: drawnPlayer.id,
        playerNumber: drawnPlayer.jerseyNumber,
        teamId: drawnTeamId,
        timestamp: Date.now(),
        description: `#${drawnPlayer.jerseyNumber} ${drawnPlayer.name} — Faute provoquée`,
        coordinates: normalizedCoords,
        period_number: quarter,
        time_in_period: periodDurationMin * 60 - timer,
      }, ...updatedMatch.events];

      // 2. Save basket if and-one (attributed to drawn player)
      if (result.basketPoints) {
        const shotId = await saveActionToDatabase(
          ActionType.SHOT, ShotSpecification.MADE, result.basketPoints,
          drawnPlayer.jerseyNumber, drawnTeam, coords,
        );
        updatedMatch.events = [{
          id: shotId || `temp-${Date.now()}`,
          action_type: ActionType.SHOT,
          specification: ShotSpecification.MADE,
          points: result.basketPoints,
          playerId: drawnPlayer.id,
          playerNumber: drawnPlayer.jerseyNumber,
          teamId: drawnTeamId,
          timestamp: Date.now(),
          description: `#${drawnPlayer.jerseyNumber} ${drawnPlayer.name} — Tir (+${result.basketPoints})`,
          coordinates: normalizedCoords,
          period_number: quarter,
          time_in_period: periodDurationMin * 60 - timer,
        }, ...updatedMatch.events];
        if (drawnTeamId === TeamId.HOME) updatedMatch.scoreHome += result.basketPoints;
        else updatedMatch.scoreAway += result.basketPoints;
      }

      // 3. Save all free throws (attributed to drawn player)
      const ftsCommitted = result.freethrows;
      let lastLFSpecCommitted: ShotSpecification | null = null;
      for (let i = 0; i < ftsCommitted.length; i++) {
        const spec = ftsCommitted[i] === "made" ? ShotSpecification.MADE : ShotSpecification.MISSED;
        if (i === ftsCommitted.length - 1) lastLFSpecCommitted = spec;
        const lfId = await saveActionToDatabase(
          ActionType.SHOT, spec, 1, drawnPlayer.jerseyNumber, drawnTeam, undefined,
        );
        updatedMatch.events = [{
          id: lfId || `temp-${Date.now()}`,
          action_type: ActionType.SHOT,
          specification: spec,
          points: 1,
          playerId: drawnPlayer.id,
          playerNumber: drawnPlayer.jerseyNumber,
          teamId: drawnTeamId,
          timestamp: Date.now(),
          description: spec === ShotSpecification.MADE
            ? `#${drawnPlayer.jerseyNumber} ${drawnPlayer.name} — LF (+1)`
            : `#${drawnPlayer.jerseyNumber} ${drawnPlayer.name} — LF raté`,
          period_number: quarter,
          time_in_period: periodDurationMin * 60 - timer,
        }, ...updatedMatch.events];
        if (spec === ShotSpecification.MADE) {
          if (drawnTeamId === TeamId.HOME) updatedMatch.scoreHome += 1;
          else updatedMatch.scoreAway += 1;
        }
      }

      setMatch(updatedMatch);
      setFoulChainContext(null);

      // 4. Rebound chain if last LF was missed
      if (lastLFSpecCommitted === ShotSpecification.MISSED) {
        const syntheticEvent: MatchEvent = {
          id: "lf-chain",
          action_type: ActionType.SHOT,
          specification: ShotSpecification.MISSED,
          points: 1,
          playerId: drawnPlayer.id,
          playerNumber: drawnPlayer.jerseyNumber,
          teamId: drawnTeamId,
          timestamp: Date.now(),
          description: "",
          coordinates: normalizedCoords,
          period_number: quarter,
          time_in_period: periodDurationMin * 60 - timer,
        };
        const chain = getChainContext(
          syntheticEvent, match.trackOpponentStats, match.location,
          match.myTeamName, match.opponent, ActionType.FOUL_DRAWN,
        );
        if (chain) {
          setChainContext(chain);
          setWorkflowStep(WorkflowStep.SUGGEST_CHAIN);
        } else {
          closeWorkflow();
        }
      } else {
        closeWorkflow();
      }
      return;
    }

    // ── foul_drawn mode (original): result.foulPlayer committed the foul ────────
    // 1. Save Foul for the opponent player who committed it
    if (result.foulPlayer) {
      const opponentTeam = isMyTeamPlayer ? Team.OPPONENT : Team.MY_TEAM;
      const actionId = await saveActionToDatabase(
        ActionType.FOUL, undefined, 0,
        result.foulPlayer.jerseyNumber, opponentTeam, coords,
      );
      updatedMatch.events = [{
        id: actionId || `temp-${Date.now()}`,
        action_type: ActionType.FOUL,
        specification: undefined,
        points: 0,
        playerId: result.foulPlayer.id,
        playerNumber: result.foulPlayer.jerseyNumber,
        teamId: opponentTeamId,
        timestamp: Date.now(),
        description: `#${result.foulPlayer.jerseyNumber} ${result.foulPlayer.name} — Faute`,
        coordinates: normalizedCoords,
        period_number: quarter,
        time_in_period: periodDurationMin * 60 - timer,
      }, ...updatedMatch.events];
    }

    // 2. Save basket if panier marqué (And One)
    if (result.basketPoints) {
      const actionId = await saveActionToDatabase(
        ActionType.SHOT, ShotSpecification.MADE, result.basketPoints,
        foulDrawnPlayerNumber, foulDrawnTeam, coords,
      );
      updatedMatch.events = [{
        id: actionId || `temp-${Date.now()}`,
        action_type: ActionType.SHOT,
        specification: ShotSpecification.MADE,
        points: result.basketPoints,
        playerId: foulDrawnPlayerId,
        playerNumber: foulDrawnPlayerNumber,
        teamId: foulDrawnTeamId,
        timestamp: Date.now(),
        description: `#${foulDrawnPlayerNumber} ${foulDrawnPlayerName} — Tir (+${result.basketPoints})`,
        coordinates: normalizedCoords,
        period_number: quarter,
        time_in_period: periodDurationMin * 60 - timer,
      }, ...updatedMatch.events];
      if (foulDrawnTeamId === TeamId.HOME) updatedMatch.scoreHome += result.basketPoints;
      else updatedMatch.scoreAway += result.basketPoints;
    }

    // 3. Save all free throws
    const fts = result.freethrows;
    let lastLFSpec: ShotSpecification | null = null;

    for (let i = 0; i < fts.length; i++) {
      const spec = fts[i] === "made" ? ShotSpecification.MADE : ShotSpecification.MISSED;
      if (i === fts.length - 1) lastLFSpec = spec;
      const actionId = await saveActionToDatabase(
        ActionType.SHOT, spec, 1, foulDrawnPlayerNumber, foulDrawnTeam, undefined,
      );
      updatedMatch.events = [{
        id: actionId || `temp-${Date.now()}`,
        action_type: ActionType.SHOT,
        specification: spec,
        points: 1,
        playerId: foulDrawnPlayerId,
        playerNumber: foulDrawnPlayerNumber,
        teamId: foulDrawnTeamId,
        timestamp: Date.now(),
        description: spec === ShotSpecification.MADE
          ? `#${foulDrawnPlayerNumber} ${foulDrawnPlayerName} — LF (+1)`
          : `#${foulDrawnPlayerNumber} ${foulDrawnPlayerName} — LF raté`,
        period_number: quarter,
        time_in_period: periodDurationMin * 60 - timer,
      }, ...updatedMatch.events];
      if (spec === ShotSpecification.MADE) {
        if (foulDrawnTeamId === TeamId.HOME) updatedMatch.scoreHome += 1;
        else updatedMatch.scoreAway += 1;
      }
    }

    setMatch(updatedMatch);
    setFoulChainContext(null);

    // 4. Trigger rebound chain if last LF was missed
    if (lastLFSpec === ShotSpecification.MISSED) {
      const syntheticEvent: MatchEvent = {
        id: "lf-chain",
        action_type: ActionType.SHOT,
        specification: ShotSpecification.MISSED,
        points: 1,
        playerId: foulDrawnPlayerId,
        playerNumber: foulDrawnPlayerNumber,
        teamId: foulDrawnTeamId,
        timestamp: Date.now(),
        description: "",
        coordinates: normalizedCoords,
        period_number: quarter,
        time_in_period: periodDurationMin * 60 - timer,
      };
      const chain = getChainContext(
        syntheticEvent,
        match.trackOpponentStats,
        match.location,
        match.myTeamName,
        match.opponent,
        ActionType.FOUL_DRAWN,
      );
      if (chain) {
        setChainContext(chain);
        setWorkflowStep(WorkflowStep.SUGGEST_CHAIN);
      } else {
        closeWorkflow();
      }
    } else {
      closeWorkflow();
    }
  };

  // Helper function to save action to database
  const saveActionToDatabase = async (
    actionType: string,
    specification: string | undefined,
    points: number,
    playerNumber: number,
    team: Team.MY_TEAM | Team.OPPONENT,
    coords?: { x: number; y: number },
  ): Promise<string | null> => {
    if (!currentMatchId) return null;

    // Convert SVG portrait coordinates (0-COURT_SVG_WIDTH_PORTRAIT x 0-COURT_SVG_HEIGHT_PORTRAIT) to normalized (0-1)
    const normalizedX = coords ? coords.x / COURT_SVG_WIDTH_PORTRAIT : -999;
    const normalizedY = coords ? coords.y / COURT_SVG_HEIGHT_PORTRAIT : -999;

    const actionForDB: CreateActionData = {
      match_id: currentMatchId,
      team,
      player_number: playerNumber,
      action_type: actionType,
      specification: specification || "",
      points,
      semantic_x: normalizedX,
      semantic_y: normalizedY,
      action_order: actionCounter,
      period_number: quarter,
      time_in_period: periodDurationMin * 60 - timer,
    };

    // Save immediately to database to get UUID
    try {
      const actionRepo = new ActionRepository();
      const createdAction = await actionRepo.create(actionForDB);
      setActionCounter((prev) => prev + 1);

      // Save match state immediately after action to persist timer/period
      const periodDurationSeconds = (periodDurationMin || 10) * 60;
      const timeElapsed = periodDurationSeconds - timer;
      await matchManager.updateMatchState(currentMatchId, quarter, timeElapsed);

      logInfo("LiveMatchScreen", "✅ Action saved to database", {
        actionId: createdAction.id,
        actionType,
        specification,
        playerNumber,
        team,
        points,
      });

      return createdAction.id;
    } catch (err) {
      logError(
        "LiveMatchScreen",
        "Failed to save action to database",
        err,
      );
      return null;
    }
  };

  const closeWorkflow = () => {
    setWorkflowStep(WorkflowStep.IDLE);
    setPendingEvent({});
  };

  const handleOpponentScoreSimple = async (value: number) => {
    const updatedMatch = { ...match };
    // Increment the correct score based on match location
    // If we're home, opponent is away (increment scoreAway)
    // If we're away, opponent is home (increment scoreHome)
    if (match.location === TeamId.HOME) {
      updatedMatch.scoreAway += value;
    } else {
      updatedMatch.scoreHome += value;
    }

    // Save to database first - use a generic opponent player number (9999)
    const actionId = await saveActionToDatabase(
      ActionType.SHOT,
      ShotSpecification.MADE,
      value,
      9999, // Generic opponent number
      Team.OPPONENT,
      undefined, // No court position for quick score
    );

    const newEvent: MatchEvent = {
      id: actionId || `temp-${Date.now()}`, // Fallback to temp ID if save failed
      action_type: ActionType.SHOT,
      specification: ShotSpecification.MADE,
      teamId: match.location === TeamId.HOME ? TeamId.AWAY : TeamId.HOME,
      timestamp: Date.now(),
      description: `${match.opponent || "Adversaire"} +${value}`,
      period_number: quarter,
      time_in_period: periodDurationMin * 60 - timer,
      points: value,
    };
    if (!updatedMatch.events) updatedMatch.events = [];
    updatedMatch.events = [newEvent, ...updatedMatch.events];

    setMatch(updatedMatch);
  };

  const confirmEndMatch = async () => {
    setShowEndConfirm(false);
    await endMatchAndSync(() => {
      setMatch({ ...match, status: MatchStatus.COMPLETED });
    });
  };

  // Helpers
  const getSubModalPlayers = () => {
    if (subTeamTab === TeamId.HOME) {
      return {
        onCourt: homeRoster.filter((p: Player) => activePlayers.includes(p.id)),
        onBench: homeRoster.filter(
          (p: Player) => !activePlayers.includes(p.id),
        ),
      };
    } else {
      return {
        onCourt: opponentRoster.filter((p: Player) =>
          activeOpponentPlayers.includes(p.id),
        ),
        onBench: opponentRoster.filter(
          (p: Player) => !activeOpponentPlayers.includes(p.id),
        ),
      };
    }
  };

  const playersOnCourt = homeRoster.filter((p: Player) =>
    activePlayers.includes(p.id),
  );
  const opponentPlayersOnCourt = opponentRoster.filter((p: Player) =>
    activeOpponentPlayers.includes(p.id),
  );

  const bgColor = colors.background;
  const surfaceColor = colors.surface;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const borderColor = colors.border;

  // Show loading indicator when resuming match
  if (isLoadingMatch) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <MaterialCommunityIcons
          name="basketball"
          size={64}
          color={colors.primary}
        />
        <Text
          style={[styles.loadingText, { color: textPrimary, marginTop: 16 }]}
        >
          Chargement du match...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <MatchHeader
        match={match}
        timer={timer}
        quarter={quarter}
        maxPeriods={maxPeriods}
        isRunning={isRunning}
        events={match.events || []}
        myTeamRoster={homeRoster}
        opponentRoster={opponentRoster}
        onToggleTimer={toggleTimer}
        onNextQuarter={handleNextQuarter}
        onOpenSubstitution={openSubstitution}
        onOpponentScoreSimple={handleOpponentScoreSimple}
      />

      {/* View Mode Toggle */}
      <View
        style={[
          styles.viewModeToggle,
          {
            backgroundColor: surfaceColor,
            borderBottomColor: borderColor,
            paddingVertical: isCompact ? sp.xs : sp.sm,
            paddingHorizontal: sp.sm,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setViewMode(ViewMode.COURT)}
          style={[
            styles.viewModeButton,
            {
              backgroundColor:
                viewMode === ViewMode.COURT
                  ? colors.primary
                  : colors.surfaceVariant,
              paddingVertical: isCompact ? sp.xs : sp.sm,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="map-outline"
            size={isCompact ? 14 : 16}
            color={
              viewMode === ViewMode.COURT ? colors.onPrimary : textSecondary
            }
          />
          <Text
            style={[
              styles.viewModeButtonText,
              {
                color:
                  viewMode === ViewMode.COURT
                    ? colors.onPrimary
                    : textSecondary,
                fontSize: font.sm,
              },
            ]}
          >
            TERRAIN
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setViewMode(ViewMode.GRID)}
          style={[
            styles.viewModeButton,
            {
              backgroundColor:
                viewMode === ViewMode.GRID
                  ? colors.primary
                  : colors.surfaceVariant,
              paddingVertical: isCompact ? sp.xs : sp.sm,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="view-grid-outline"
            size={isCompact ? 14 : 16}
            color={
              viewMode === ViewMode.GRID ? colors.onPrimary : textSecondary
            }
          />
          <Text
            style={[
              styles.viewModeButtonText,
              {
                color:
                  viewMode === ViewMode.GRID ? colors.onPrimary : textSecondary,
                fontSize: font.sm,
              },
            ]}
          >
            ACTIONS
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={[styles.mainContent, { paddingBottom: isMobileLandscape ? 44 : 64 }]}>
        {viewMode === ViewMode.GRID && (
          <ScrollView
            style={styles.gridScroll}
            contentContainerStyle={styles.gridContent}
          >
            <MatchActionGrid
              onAction={handleActionClick}
              filterMode={filterMode}
            />
          </ScrollView>
        )}

        {viewMode === ViewMode.COURT && (
          <CourtView
            onCourtClick={handleCourtClick}
            events={match.events}
            showMarkers={showMarkers}
            filterMode={filterMode}
            selectedPlayerIds={selectedPlayerIds}
            selectedPeriodIds={selectedPeriodIds}
            selectedTeamFilter={selectedTeamFilter}
            isHome={match.location === TeamId.HOME}
            trackOpponentStats={match.trackOpponentStats}
            clubLogoUrl={match.clubLogoUrl}
            courtBackgroundColor={match.courtBackgroundColor}
            courtLineColor={match.courtLineColor}
          />
        )}
      </View>

      {/* Toolbar */}
      <MatchToolbar
        filterMode={filterMode}
        showMarkers={showMarkers}
        isGeneratingMockData={isGeneratingMockData}
        isAdmin={isAdmin}
        hasActiveFilters={
          filterMode !== FilterMode.ALL ||
          selectedPlayerIds.length > 0 ||
          selectedPeriodIds.length > 0 ||
          selectedTeamFilter !== TeamFilterMode.ALL
        }
        onUndo={undoLastAction}
        onOpenFilter={() => setShowFilterModal(true)}
        onToggleMarkers={() => setShowMarkers(!showMarkers)}
        onGenerateMock={handleGenerateMockActions}
        onOpenHistory={() => setShowHistoryModal(true)}
      />

      {/* Modals */}
      <OvertimeModal
        visible={showOvertimeModal}
        onClose={() => setShowOvertimeModal(false)}
        onStartOvertime={startOvertime}
        onEndMatch={() => {
          setShowOvertimeModal(false);
          setShowEndConfirm(true);
        }}
        match={match}
        quarter={quarter}
        maxPeriods={maxPeriods}
        overtimeDuration={overtimeDuration}
        setOvertimeDuration={setOvertimeDuration}
      />

      <HistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        events={match.events}
        onDeleteEvent={deleteEventDirectly}
        match={match}
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        homeRoster={homeRoster}
        opponentRoster={opponentRoster}
        trackOpponentStats={match.trackOpponentStats}
        selectedPlayers={selectedPlayerIds}
        onPlayerSelectionChange={setSelectedPlayerIds}
        matchFormat={match.periodCount === 2 ? "2_halves" : "4_quarters"}
        actions={match.events}
        selectedPeriods={selectedPeriodIds}
        onPeriodSelectionChange={setSelectedPeriodIds}
        isHome={match.location === TeamId.HOME}
        starters={match.starters}
        activePlayers={activePlayers}
        myTeamName={match.myTeamName}
        opponentName={match.opponent}
        myTeamHandicap={match.myTeamHandicap || 0}
        opponentHandicap={match.opponentHandicap || 0}
        selectedTeamFilter={selectedTeamFilter}
        onTeamFilterChange={setSelectedTeamFilter}
      />

      {/* Sync Modal */}
      <SyncModal visible={isSyncing} />

      <PlayerSelectionModal
        visible={workflowStep === WorkflowStep.SELECT_PLAYER}
        onClose={closeWorkflow}
        onPlayerSelect={handlePlayerSelect}
        pendingEvent={pendingEvent}
        match={match}
        playersOnCourt={playersOnCourt}
        opponentPlayersOnCourt={opponentPlayersOnCourt}
        playerSelectionTab={playerSelectionTab}
        setPlayerSelectionTab={setPlayerSelectionTab}
      />

      <ActionChainModal
        visible={workflowStep === WorkflowStep.SUGGEST_CHAIN}
        chainContext={chainContext}
        playersOnCourt={playersOnCourt}
        opponentPlayersOnCourt={opponentPlayersOnCourt}
        myTeamId={match.location}
        myTeamName={match.myTeamName}
        opponentName={match.opponent}
        onPlayerSelect={handleChainPlayerSelect}
        onIgnore={handleChainIgnore}
      />

      <ShotChainModal
        visible={workflowStep === WorkflowStep.SHOT_CHAIN}
        context={shotChainContext}
        playersOnCourt={playersOnCourt}
        opponentPlayersOnCourt={opponentPlayersOnCourt}
        myTeamId={match.location}
        myTeamName={match.myTeamName}
        opponentName={match.opponent}
        trackOpponentStats={match.trackOpponentStats}
        onComplete={handleShotChainComplete}
        onIgnore={handleShotChainIgnore}
      />

      <FoulChainModal
        visible={workflowStep === WorkflowStep.FOUL_CHAIN}
        context={foulChainContext}
        playersOnCourt={playersOnCourt}
        opponentPlayersOnCourt={opponentPlayersOnCourt}
        myTeamId={match.location}
        trackOpponentStats={match.trackOpponentStats}
        onComplete={handleFoulChainComplete}
        onIgnore={handleFoulChainIgnore}
      />

      <CourtActionModal
        visible={workflowStep === WorkflowStep.SELECT_ACTION_FROM_COURT}
        onClose={closeWorkflow}
        onActionSelect={handleCourtActionSelect}
      />

      <SubstitutionModal
        visible={workflowStep === WorkflowStep.SUBSTITUTION}
        onClose={closeWorkflow}
        onCommit={commitSubstitution}
        subSelection={subSelection}
        toggleSubOut={toggleSubOut}
        toggleSubIn={toggleSubIn}
        getSubModalPlayers={getSubModalPlayers}
        match={match}
        subTeamTab={subTeamTab}
        setSubTeamTab={setSubTeamTab}
      />

      <EndMatchModal
        visible={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={confirmEndMatch}
      />

      <PeriodConfirmModal
        visible={showPeriodConfirm}
        onClose={() => setShowPeriodConfirm(false)}
        onConfirm={proceedToNextPeriod}
        timer={timer}
        formatTime={formatTime}
      />

      <DeleteActionModal
        visible={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setEventToDelete(null);
        }}
        onConfirm={confirmDeleteEvent}
        eventDescription={eventToDelete?.description || ""}
      />
    </View>
  );
}

// ==================== COMPONENTS ====================

// Court View Component
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
  },
  viewModeToggle: {
    flexDirection: "row",
    gap: 8,
    borderBottomWidth: 1,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
  },
  viewModeButtonText: {
    fontWeight: "bold",
  },
  mainContent: {
    flex: 1,
  },
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    padding: 12,
  },
  actionGrid: {
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    height: 96,
  },
  miniColumn: {
    flex: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
  },
  actionButtonLabel: {
    fontWeight: "900",
  },
  actionButtonSub: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 2,
    opacity: 0.9,
  },
  courtContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  courtTouchable: {
    width: "100%",
    maxWidth: 400,
    aspectRatio: 0.6,
  },
  court: {
    width: "100%",
    height: "100%",
    backgroundColor: DEFAULT_COURT_COLORS.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: SLATE_COLORS[300],
    overflow: "hidden",
  },
  courtSvg: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  eventMarker: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    marginTop: -5,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.4)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 999,
    backgroundColor: SLATE_COLORS[100],
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f9731620",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f9731630",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  modalScore: {
    fontSize: 32,
    fontWeight: "900",
    fontFamily: "monospace",
    textAlign: "center",
    marginVertical: 12,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  overtimeDurationBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  overtimeDurationLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  overtimeDurationInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  overtimeDurationTextInput: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: "center",
    fontWeight: "bold",
  },
  overtimeDurationUnit: {
    fontSize: 14,
    fontWeight: "bold",
  },
  modalActions: {
    gap: 12,
  },
  modalPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  modalSecondaryButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
