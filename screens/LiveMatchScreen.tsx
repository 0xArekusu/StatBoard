import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import {
  SLATE_COLORS,
  BRAND_COLORS,
  COMMON_COLORS,
} from "../src/theme";
import {
  MatchStatus,
  CreateMatchData,
  CreateActionData,
  Team,
} from "../src/models/types";
import { Player } from "../models/Player";
import { useAuth } from "../src/contexts/AuthContext";
import { MatchManager } from "../src/services/match/MatchManager";
import { ActionQueue } from "../src/services/match/ActionQueue";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { MatchPlayerRepository } from "../src/services/database/MatchPlayerRepository";
import { logInfo, logError, logWarn } from "../utils/logger";
import { generateMockActions } from "../utils/mockActions";
import { supabase } from "../src/config/supabase";
import { ROUTES } from "../constants/routes";
import BasketballCourtSVG from "../components/BasketballCourtSVG";
import { MatchActionGrid } from "../components/MatchActionGrid";
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
} from "../components/LiveMatchModals";

interface LiveMatchScreenProps {
  navigation: any;
  route: any;
}

type EventType =
  | "POINT_1"
  | "POINT_2"
  | "POINT_3"
  | "MISS_1"
  | "MISS_2"
  | "MISS_3"
  | "FOUL"
  | "REBOUND_DEF"
  | "REBOUND_OFF"
  | "ASSIST"
  | "STEAL"
  | "BLOCK"
  | "TURNOVER"
  | "SUBSTITUTION"
  | "POINT";

interface MatchEvent {
  id: string;
  type: EventType;
  value?: number;
  playerId?: string;
  teamId: "HOME" | "AWAY";
  timestamp: number;
  description: string;
  coordinates?: { x: number; y: number };
  period_number?: number;
  time_in_period?: number;
}

type WorkflowStep =
  | "IDLE"
  | "SELECT_PLAYER"
  | "SELECT_ACTION_FROM_COURT"
  | "SUBSTITUTION";
type FilterMode = "ALL" | "SHOOTING" | "REBOUNDS" | "FOULS" | "TURNOVERS" | "BLOCKS" | "STEALS";

// Mock players for fallback
const MOCK_ROSTER: Player[] = [
  {
    id: "p1",
    name: "T. Parker",
    jerseyNumber: 9,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p2",
    name: "B. Diaw",
    jerseyNumber: 13,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p3",
    name: "N. Batum",
    jerseyNumber: 5,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p4",
    name: "R. Gobert",
    jerseyNumber: 27,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "p5",
    name: "E. Fournier",
    jerseyNumber: 10,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const MOCK_OPPONENT_ROSTER: Player[] = [
  {
    id: "adv1",
    name: "Joueur 1",
    jerseyNumber: 4,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "adv2",
    name: "Joueur 2",
    jerseyNumber: 7,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "adv3",
    name: "Joueur 3",
    jerseyNumber: 11,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "adv4",
    name: "Joueur 4",
    jerseyNumber: 15,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "adv5",
    name: "Joueur 5",
    jerseyNumber: 23,
    teamId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function LiveMatchScreen({
  navigation,
  route,
}: LiveMatchScreenProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const matchData = route.params?.matchData;
  const resumeMatchId = route.params?.matchId;

  // Database services
  const [matchManager] = useState(() => new MatchManager());
  const [matchRepository] = useState(() => new MatchRepository());
  const [actionQueue] = useState(() => new ActionQueue());
  const [currentMatchId, setCurrentMatchId] = useState<number | null>(null);
  const [actionCounter, setActionCounter] = useState(0);
  const [isLoadingMatch, setIsLoadingMatch] = useState(!!resumeMatchId);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initialize match with data from NewMatchScreen or use mock data
  const [match, setMatch] = useState<any>(() => {
    if (matchData) {
      return {
        id: matchData.id,
        clubId: matchData.clubId,
        teamId: matchData.teamId,
        myTeamName: matchData.teamName || "Mon Équipe",
        opponent: matchData.opponent || "Adversaire",
        location: matchData.location || "HOME",
        scoreHome: 0,
        scoreAway: 0,
        status: "in_progress" as MatchStatus,
        trackOpponentStats: matchData.trackOpponentStats || false,
        roster: matchData.homePlayers || [],
        opponentRoster: matchData.awayPlayers || [],
        starters: matchData.starters || [],
        periodCount: matchData.periodCount || 4,
        periodDuration: matchData.periodDuration || 10,
        events: [] as MatchEvent[],
        clubLogoUrl: matchData.clubLogoUrl || null,
        courtBackgroundColor: matchData.courtBackgroundColor || "#1a472a",
        courtLineColor: matchData.courtLineColor || "#FFFFFF",
      };
    }
    // Fallback to mock data
    return {
      id: Date.now().toString(),
      myTeamName: "Mon Équipe",
      opponent: "Adversaire",
      location: "HOME",
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
      courtBackgroundColor: "#1a472a",
      courtLineColor: "#FFFFFF",
    };
  });

  // Determine Rosters
  const homeRoster =
    match?.roster && match.roster.length > 0 ? match.roster : [];
  const opponentRoster =
    match?.opponentRoster && match.opponentRoster.length > 0
      ? match.opponentRoster
      : [];

  // Match Configuration
  const periodDurationMin = match?.periodDuration || 10;
  const maxPeriods = match?.periodCount || 4;

  const getPeriodLabel = (q: number) => {
    if (q <= maxPeriods) {
      return maxPeriods === 2 ? `MT${q}` : `Q${q}`;
    }
    return `OT${q - maxPeriods}`;
  };

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
  const currentMatchIdRef = useRef(currentMatchId);

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

  // Team State
  const [activePlayers, setActivePlayers] = useState<string[]>(() => {
    // Use starters if available
    if (matchData?.starters && matchData.starters.length > 0) {
      return matchData.starters;
    }
    // Otherwise use first 5 players from roster
    if (matchData?.homePlayers && matchData.homePlayers.length > 0) {
      return matchData.homePlayers.slice(0, 5).map((p: Player) => p.id);
    }
    // Fallback to mock players
    return ["p1", "p2", "p3", "p4", "p5"];
  });

  const [activeOpponentPlayers, setActiveOpponentPlayers] = useState<string[]>(
    () => {
      if (matchData?.awayPlayers && matchData.awayPlayers.length > 0) {
        return matchData.awayPlayers.slice(0, 5).map((p: Player) => p.id);
      }
      // Fallback to mock opponent players
      return ["adv1", "adv2", "adv3", "adv4", "adv5"];
    }
  );

  const [subSelection, setSubSelection] = useState<{
    out: string[];
    in: string[];
  }>({ out: [], in: [] });
  const [subTeamTab, setSubTeamTab] = useState<"HOME" | "AWAY">("HOME");

  // UI State
  const [viewMode, setViewMode] = useState<"GRID" | "COURT">("GRID");
  const [playerSelectionTab, setPlayerSelectionTab] = useState<"HOME" | "AWAY">(
    "HOME"
  );

  // Modals State
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [showPeriodConfirm, setShowPeriodConfirm] = useState(false);
  const [overtimeDuration, setOvertimeDuration] = useState(5);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<MatchEvent | null>(null);

  // Toolbar State
  const [showMarkers, setShowMarkers] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("ALL");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isGeneratingMockData, setIsGeneratingMockData] = useState(false);

  // Workflow State
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("IDLE");
  const [pendingEvent, setPendingEvent] = useState<{
    type?: EventType;
    value?: number;
    coords?: { x: number; y: number };
    playerId?: string;
  }>({});

  // Initialize match in database on mount
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

          // Calculate scores from actions (using the new action type system)
          let scoreHome = 0;
          let scoreAway = 0;
          actions.forEach((action) => {
            // Use the points field which is set when action is created
            if (action.points && action.points > 0) {
              if (action.team === Team.MY_TEAM) {
                scoreHome += action.points;
              } else {
                scoreAway += action.points;
              }
            }
          });

          // Separate players by team
          const homePlayersFromDB = players.filter((p) => p.team === "MyTeam");
          const awayPlayersFromDB = players.filter(
            (p) => p.team === "Opponent"
          );

          // Convert to Player format
          const homeRosterLoaded = homePlayersFromDB.map((p) => ({
            id: p.player_id || `temp-${p.id}`,
            name: p.player_name,
            jerseyNumber: p.player_number,
            teamId: existingMatch.team_id || "",
            photoUrl: p.photo_url || null,
            isStarter: p.is_starter,
            createdAt: new Date(p.created_at),
            updatedAt: new Date(p.created_at),
          }));

          const awayRosterLoaded = awayPlayersFromDB.map((p) => ({
            id: p.player_id || `temp-${p.id}`,
            name: p.player_name,
            jerseyNumber: p.player_number,
            teamId: "",
            photoUrl: p.photo_url || null,
            isStarter: p.is_starter,
            createdAt: new Date(p.created_at),
            updatedAt: new Date(p.created_at),
          }));

          // Get active players on court (use on_court status, fallback to starters if not set)
          const homeOnCourt = homePlayersFromDB
            .filter(
              (p) =>
                p.on_court === 1 || (p.on_court === undefined && p.is_starter)
            )
            .map((p) => p.player_id || `temp-${p.id}`);
          const awayOnCourt = awayPlayersFromDB
            .filter(
              (p) =>
                p.on_court === 1 || (p.on_court === undefined && p.is_starter)
            )
            .map((p) => p.player_id || `temp-${p.id}`);

          // Helper function to get human-readable action description
          const getActionDescription = (action: any, playerName: string) => {
            if (action.action_type === "SHOT") {
              const isMade =
                action.specification === "MADE" ||
                action.specification === "made";
              const points = action.points || 0;

              if (isMade) {
                if (points === 3) return `${playerName} (+3)`;
                if (points === 2) return `${playerName} (+2)`;
                if (points === 1) return `${playerName} (+1)`;
              } else {
                if (points === 3) return `${playerName} Raté (3pts)`;
                if (points === 2) return `${playerName} Raté (2pts)`;
                if (points === 1) return `${playerName} Raté (LF)`;
              }

              // Support ancien format
              if (action.specification === "THREE_POINT_MADE")
                return `${playerName} (+3)`;
              if (action.specification === "TWO_POINT_MADE")
                return `${playerName} (+2)`;
              if (action.specification === "FREE_THROW_MADE")
                return `${playerName} (+1)`;
              if (action.specification === "THREE_POINT_MISSED")
                return `${playerName} Raté (3pts)`;
              if (action.specification === "TWO_POINT_MISSED")
                return `${playerName} Raté (2pts)`;
              if (action.specification === "FREE_THROW_MISSED")
                return `${playerName} Raté (LF)`;
            } else if (action.action_type === "REBOUND") {
              if (action.specification === "DEFENSIVE")
                return `${playerName} Rebond Déf`;
              if (action.specification === "OFFENSIVE")
                return `${playerName} Rebond Off`;
            } else if (action.action_type === "FOUL") {
              return `Faute ${playerName}`;
            } else if (action.action_type === "ASSIST") {
              return `${playerName} Passe décisive`;
            } else if (action.action_type === "STEAL") {
              return `${playerName} Interception`;
            } else if (action.action_type === "BLOCK") {
              return `${playerName} Contre`;
            } else if (action.action_type === "TURNOVER") {
              return `${playerName} Perte de balle`;
            }
            return `${playerName} - ${action.action_type}`;
          };

          // Convert actions to MatchEvents for display on court
          const matchEvents: MatchEvent[] = actions.map((action) => {
            const player = players.find(
              (p) =>
                p.player_number === action.player_number &&
                p.team === action.team
            );

            // Map action type and specification to event type
            let eventType: EventType = "POINT";
            let eventValue = action.points || 0;

            // Map based on action_type and specification
            if (action.action_type === "SHOT") {
              const isMade =
                action.specification === "MADE" ||
                action.specification === "made";
              const points = action.points || 0;

              if (isMade) {
                // Tirs réussis
                if (points === 3) {
                  eventType = "POINT_3";
                  eventValue = 3;
                } else if (points === 2) {
                  eventType = "POINT_2";
                  eventValue = 2;
                } else if (points === 1) {
                  eventType = "POINT_1";
                  eventValue = 1;
                }
              } else {
                // Tirs ratés
                if (points === 3) {
                  eventType = "MISS_3";
                  eventValue = 0;
                } else if (points === 2) {
                  eventType = "MISS_2";
                  eventValue = 0;
                } else if (points === 1) {
                  eventType = "MISS_1";
                  eventValue = 0;
                }
              }

              // Support aussi l'ancien format pour compatibilité
              if (action.specification === "THREE_POINT_MADE") {
                eventType = "POINT_3";
                eventValue = 3;
              } else if (action.specification === "TWO_POINT_MADE") {
                eventType = "POINT_2";
                eventValue = 2;
              } else if (action.specification === "FREE_THROW_MADE") {
                eventType = "POINT_1";
                eventValue = 1;
              } else if (action.specification === "THREE_POINT_MISSED") {
                eventType = "MISS_3";
                eventValue = 0;
              } else if (action.specification === "TWO_POINT_MISSED") {
                eventType = "MISS_2";
                eventValue = 0;
              } else if (action.specification === "FREE_THROW_MISSED") {
                eventType = "MISS_1";
                eventValue = 0;
              }
            } else if (action.action_type === "FOUL") {
              eventType = "FOUL";
            } else if (action.action_type === "REBOUND") {
              if (action.specification === "DEFENSIVE") {
                eventType = "REBOUND_DEF";
              } else if (action.specification === "OFFENSIVE") {
                eventType = "REBOUND_OFF";
              }
            } else if (action.action_type === "ASSIST") {
              eventType = "ASSIST";
            } else if (action.action_type === "STEAL") {
              eventType = "STEAL";
            } else if (action.action_type === "BLOCK") {
              eventType = "BLOCK";
            } else if (action.action_type === "TURNOVER") {
              eventType = "TURNOVER";
            }

            const playerName =
              action.player_number === 9999
                ? ""
                : player?.player_name || `#${action.player_number}`;
            const description = getActionDescription(action, playerName);

            // Parse timestamp safely
            let timestamp = Date.now();
            if (action.timestamp) {
              const parsedDate = new Date(action.timestamp);
              if (!isNaN(parsedDate.getTime())) {
                timestamp = parsedDate.getTime();
              }
            }

            return {
              id: `evt-${action.id}`,
              type: eventType,
              value: eventValue,
              timestamp,
              playerId: player?.player_id || `temp-${action.player_number}`,
              playerName: action.player_number.toString(),
              teamId: action.team === Team.MY_TEAM ? "HOME" : "AWAY",
              coordinates:
                action.semantic_x !== null && action.semantic_y !== null
                  ? { x: action.semantic_x, y: action.semantic_y }
                  : undefined,
              description,
              period_number: action.period_number,
              time_in_period: action.time_in_period,
            };
          });

          // Update match state with loaded data
          setMatch({
            ...match,
            myTeamName: existingMatch.my_team_name || "Mon Équipe",
            opponent: existingMatch.opponent_name,
            location: existingMatch.is_home ? "HOME" : "AWAY",
            scoreHome,
            scoreAway,
            roster: homeRosterLoaded,
            opponentRoster: awayRosterLoaded,
            starters: homeOnCourt,
            periodCount: existingMatch.total_periods,
            periodDuration: existingMatch.period_duration / 60, // Convert seconds to minutes
            events: matchEvents,
          });

          // Restore active players on court
          if (homeOnCourt.length > 0) {
            setActivePlayers(homeOnCourt);
          }
          if (awayOnCourt.length > 0) {
            setActiveOpponentPlayers(awayOnCourt);
          }

          // Restore timer and period state
          setQuarter(existingMatch.current_period || 1);
          // Timer represents time REMAINING in period, not elapsed
          const periodDurationSeconds = existingMatch.period_duration || 600;
          const timeElapsed = existingMatch.time_elapsed || 0;
          const timeRemaining = Math.max(
            0,
            periodDurationSeconds - timeElapsed
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
            homeRoster: homeRosterLoaded.length,
            awayRoster: awayRosterLoaded.length,
            homeOnCourt: homeOnCourt.length,
            awayOnCourt: awayOnCourt.length,
            activePlayers: homeOnCourt,
            activeOpponentPlayers: awayOnCourt,
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

          const matchCreateData: CreateMatchData = {
            my_team_name: match.myTeamName || null,
            opponent_name: match.opponent || "Adversaire",
            is_home: match.location === "HOME",
            total_periods: match.periodCount || 4,
            period_duration: (match.periodDuration || 10) * 60, // Convert minutes to seconds
            overtime_duration: overtimeDuration * 60, // Convert minutes to seconds
            club_id: match.clubId || null,
            team_id: match.teamId || null,
            played_at: new Date().toISOString(),
          };

          logInfo(
            "LiveMatchScreen",
            "💾 Creating match in SQLite database",
            matchCreateData
          );
          const createdMatch = await matchManager.startMatch(matchCreateData);
          setCurrentMatchId(createdMatch.id);
          logInfo(
            "LiveMatchScreen",
            "✅ Match created successfully in SQLite",
            {
              matchId: createdMatch.id,
              opponent: createdMatch.opponent_name,
              isHome: createdMatch.is_home,
            }
          );

          // Save players to database
          const matchPlayerRepo = new MatchPlayerRepository();

          // Prepare home team players
          const homePlayersToSave = homeRoster.map((player: Player) => ({
            match_id: createdMatch.id,
            player_id: player.id,
            player_number: player.jerseyNumber,
            player_name: player.name,
            team: "MyTeam" as const,
            is_starter: match.starters?.includes(player.id) || false,
            photo_url: player.photoUrl || null,
          }));

          // Prepare away team players (if tracking opponent stats)
          const awayPlayersToSave = match.trackOpponentStats
            ? opponentRoster.map((player: Player) => ({
                match_id: createdMatch.id,
                player_id: player.id,
                player_number: player.jerseyNumber,
                player_name: player.name,
                team: "Opponent" as const,
                is_starter: player.isStarter || false,
                photo_url: player.photoUrl || null,
              }))
            : [];

          const allPlayersToSave = [...homePlayersToSave, ...awayPlayersToSave];

          if (allPlayersToSave.length > 0) {
            logInfo("LiveMatchScreen", "💾 Saving players to SQLite", {
              matchId: createdMatch.id,
              homePlayersCount: homePlayersToSave.length,
              awayPlayersCount: awayPlayersToSave.length,
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
              }
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

  // Reusable function to save match state
  const saveMatchState = async () => {
    if (!currentMatchIdRef.current) return;

    try {
      const periodDurationSeconds = (match.periodDuration || 10) * 60;
      const timeElapsed = periodDurationSeconds - timerRef.current;

      await matchManager.updateMatchState(
        currentMatchIdRef.current,
        quarterRef.current,
        timeElapsed
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
            timeElapsed
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Toggle timer play/pause with automatic save on pause
  const toggleTimer = () => {
    if (isRunning) {
      // Pausing - save state immediately
      saveMatchState();
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

  const handleGenerateMockActions = async () => {
    if (!currentMatchId || isGeneratingMockData) return;

    setIsGeneratingMockData(true);

    try {
      // Créer des joueurs fictifs basés sur le roster
      const playersMyTeam =
        homeRoster.length > 0
          ? homeRoster.map((p) => ({
              jersey_number: p.jerseyNumber,
              name: p.name,
            }))
          : Array.from({ length: 5 }, (_, i) => ({
              jersey_number: i + 1,
              name: `Joueur ${i + 1}`,
            }));

      const playersOpponent =
        opponentRoster.length > 0
          ? opponentRoster.map((p) => ({
              jersey_number: p.jerseyNumber,
              name: p.name,
            }))
          : Array.from({ length: 5 }, (_, i) => ({
              jersey_number: i + 10,
              name: `Adversaire ${i + 1}`,
            }));

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
        50 // Augmenté de 25 à 50 actions par période
      );

      // Convertir et enregistrer les actions
      const actionRepo = new ActionRepository();
      for (const mockAction of mockActions) {
        await actionRepo.create({
          match_id: currentMatchId,
          team: mockAction.team === "A" ? Team.MY_TEAM : Team.OPPONENT,
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

      // Convertir les actions en événements pour l'affichage
      const convertedEvents: MatchEvent[] = loadedActions.map((action) => {
        const player =
          action.team === Team.MY_TEAM
            ? homeRoster.find((p) => p.jerseyNumber === action.player_number)
            : opponentRoster.find(
                (p) => p.jerseyNumber === action.player_number
              );

        const playerName = player?.name || `Joueur ${action.player_number}`;
        const teamId = action.team === Team.MY_TEAM ? "HOME" : "AWAY";

        let type: EventType = "POINT";
        let value = 0;
        let description = "";

        // DEBUG
        if (action.action_type !== "shot") {
          logInfo("LiveMatchScreen", "🔍 Converting non-shot action", {
            actionType: action.action_type,
            specification: action.specification,
            coords: { x: action.semantic_x, y: action.semantic_y },
          });
        }

        // Mapper le type d'action vers EventType (action_type stocké en lowercase dans DB)
        if (action.action_type === "shot" && action.specification === "made") {
          value = action.points || 0;
          type = value === 1 ? "POINT_1" : value === 2 ? "POINT_2" : "POINT_3";
          description = `${playerName} - ${value}pt`;
        } else if (
          action.action_type === "shot" &&
          action.specification === "missed"
        ) {
          const missedPoints = action.points || 0;
          value = 0; // Les tirs ratés ne comptent pas dans le score
          type =
            missedPoints === 1
              ? "MISS_1"
              : missedPoints === 2
              ? "MISS_2"
              : "MISS_3";
          description = `${playerName} - Raté ${missedPoints}pt`;
        } else if (action.action_type === "rebound") {
          type =
            action.specification === "offensive"
              ? "REBOUND_OFF"
              : "REBOUND_DEF";
          description = `${playerName} - Rebond`;
        } else if (action.action_type === "assist") {
          type = "ASSIST";
          description = `${playerName} - Passe`;
        } else if (action.action_type === "steal") {
          type = "STEAL";
          description = `${playerName} - Interception`;
        } else if (action.action_type === "block") {
          type = "BLOCK";
          description = `${playerName} - Contre`;
        } else if (action.action_type === "turnover") {
          type = "TURNOVER";
          description = `${playerName} - Perte`;
        } else if (action.action_type === "foul") {
          type = "FOUL";
          description = `${playerName} - Faute`;
        }

        const event = {
          id: `evt-${action.id}`,
          type,
          value,
          playerId: player?.id,
          teamId,
          timestamp: Date.now(),
          description,
          coordinates: { x: action.semantic_x, y: action.semantic_y },
          period_number: action.period_number,
          time_in_period: action.time_in_period,
        };

        // DEBUG: Log all non-shot events
        if (action.action_type !== "shot") {
          logInfo("LiveMatchScreen", "🎯 Created non-shot event", {
            actionType: action.action_type,
            eventType: type,
            hasCoords: !!event.coordinates,
            coords: event.coordinates,
          });
        }

        return event;
      });

      // DEBUG: Log summary
      const eventTypes = convertedEvents.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      logInfo("LiveMatchScreen", "📊 Mock events summary", eventTypes);

      // Calculer le nouveau score
      let newScoreHome = 0;
      let newScoreAway = 0;

      convertedEvents.forEach((event) => {
        if (
          (event.type.includes("POINT") || event.type === "POINT") &&
          event.value
        ) {
          if (event.teamId === "HOME") {
            newScoreHome += event.value;
          } else {
            newScoreAway += event.value;
          }
        }
      });

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

  const deleteEvent = (eventId: string) => {
    if (!match.events) return;
    const event = match.events.find((e: MatchEvent) => e.id === eventId);
    if (!event) return;

    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete || !match.events) return;

    const updatedEvents = match.events.filter(
      (e: MatchEvent) => e.id !== eventToDelete.id
    );
    const updatedMatch = { ...match, events: updatedEvents };

    // Revert Score
    if (
      (eventToDelete.type.includes("POINT") ||
        eventToDelete.type === "POINT") &&
      eventToDelete.value
    ) {
      if (eventToDelete.teamId === "HOME") {
        updatedMatch.scoreHome = Math.max(
          0,
          updatedMatch.scoreHome - eventToDelete.value
        );
      } else {
        updatedMatch.scoreAway = Math.max(
          0,
          updatedMatch.scoreAway - eventToDelete.value
        );
      }
    }

    setMatch(updatedMatch);

    // Delete from database
    if (currentMatchId) {
      try {
        // Extract database ID from event ID (format: "evt-{dbId}")
        const dbId = parseInt(eventToDelete.id.replace("evt-", ""));

        if (!isNaN(dbId)) {
          const actionRepo = new ActionRepository();
          await actionRepo.deleteAction(dbId);

          logInfo("LiveMatchScreen", "✅ Action deleted from database", {
            eventId: eventToDelete.id,
            dbId,
            description: eventToDelete.description,
          });
        }
      } catch (error) {
        logError(
          "LiveMatchScreen",
          "❌ Failed to delete action from database",
          error
        );
      }
    }

    setShowDeleteConfirm(false);
    setEventToDelete(null);
  };

  // --- WORKFLOW ACTIONS ---

  const handleActionClick = (type: EventType, value: number = 0) => {
    setPendingEvent({ type, value });
    setPlayerSelectionTab("HOME");
    setWorkflowStep("SELECT_PLAYER");
  };

  const handleCourtClick = (svgX: number, svgY: number) => {
    // Store coordinates and show action selection modal
    setPendingEvent({ coords: { x: svgX, y: svgY } });
    setWorkflowStep("SELECT_ACTION_FROM_COURT");
  };

  const handleCourtActionSelect = (type: EventType, value: number = 0) => {
    setPendingEvent((prev) => ({ ...prev, type, value }));
    setWorkflowStep("SELECT_PLAYER");
  };

  const handlePlayerSelect = (playerId: string) => {
    if (pendingEvent.type) {
      finalizeEvent(
        pendingEvent.type,
        pendingEvent.value || 0,
        playerId,
        pendingEvent.coords
      );
    }
  };

  // --- SUBSTITUTION ---

  const openSubstitution = () => {
    setSubSelection({ out: [], in: [] });
    setSubTeamTab("HOME");
    setWorkflowStep("SUBSTITUTION");
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
    const isHome = subTeamTab === "HOME";
    const currentActive = isHome ? activePlayers : activeOpponentPlayers;

    const remainingPlayers = currentActive.filter(
      (id) => !subSelection.out.includes(id)
    );
    const newActivePlayers = [...remainingPlayers, ...subSelection.in];

    const subDescription = `Changements (${isHome ? "Nous" : "Eux"}): ${
      subSelection.in.length
    } joueur(s)`;

    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}`,
      type: "SUBSTITUTION",
      timestamp: Date.now(),
      description: subDescription,
      teamId: isHome ? "HOME" : "AWAY",
      period_number: quarter,
      time_in_period: periodDurationMin * 60 - timer,
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
          false
        );
      }

      // Set players IN to on_court = 1
      if (subSelection.in.length > 0) {
        await playerRepo.updateOnCourtStatus(
          currentMatchId,
          subSelection.in,
          true
        );
      }
    }

    setWorkflowStep("IDLE");
  };

  // --- FINALIZATION ---

  const finalizeEvent = (
    type: EventType,
    value: number,
    playerId: string,
    coords?: { x: number; y: number }
  ) => {
    const isHomePlayer = homeRoster.some((p: Player) => p.id === playerId);
    const player = isHomePlayer
      ? homeRoster.find((p: Player) => p.id === playerId)
      : opponentRoster.find((p: Player) => p.id === playerId);

    const teamId = isHomePlayer ? "HOME" : "AWAY";

    const pName = player?.name.split(" ").pop() || "Joueur";
    const pNumber = player?.jerseyNumber || "";
    let desc = `${pNumber} - ${pName} -`;

    switch (type) {
      case "POINT_1":
        desc += `Réussi (1 pts)`;
        break;
      case "POINT_2":
        desc += `Réussi (2 pts)`;
        break;
      case "POINT_3":
        desc += `Réussi (3 pts)`;
        break;
      case "MISS_1":
        desc += `Raté (1 pts))`;
        break;
      case "MISS_2":
        desc += `Raté (2 pts)`;
        break;
      case "MISS_3":
        desc += `Raté (3 pts)`;
        break;
      case "FOUL":
        desc += `Faute`;
        break;
      case "REBOUND_DEF":
        desc += `Rebond Défensif`;
        break;
      case "REBOUND_OFF":
        desc += `Rebond Offensif`;
        break;
      case "ASSIST":
        desc += `Passe décisive`;
        break;
      case "STEAL":
        desc += `Interception`;
        break;
      case "BLOCK":
        desc += `Contre`;
        break;
      case "TURNOVER":
        desc += `Perte de balle`;
        break;
      case "SUBSTITUTION":
        desc += `Changement`;
        break;
      default:
        desc += `${type}`;
    }

    // Normalize SVG coordinates (0-615.75 x 0-1146.75) to 0-1 for storage in state
    const normalizedCoords = coords
      ? {
          x: coords.x / 615.75,
          y: coords.y / 1146.75,
        }
      : undefined;

    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}`,
      type,
      value,
      playerId,
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

    // Update Score
    if (
      (type === "POINT_1" || type === "POINT_2" || type === "POINT_3") &&
      value > 0
    ) {
      if (teamId === "HOME") {
        updatedMatch.scoreHome += value;
      } else {
        updatedMatch.scoreAway += value;
      }
    }

    setMatch(updatedMatch);

    // Save to database
    if (currentMatchId && player) {
      saveActionToDatabase(
        type,
        value,
        player.jerseyNumber,
        teamId === "HOME" ? Team.MY_TEAM : Team.OPPONENT,
        coords
      );
    }

    closeWorkflow();
  };

  // Helper function to map EventType to database action format
  const saveActionToDatabase = (
    eventType: EventType,
    value: number,
    playerNumber: number,
    team: Team.MY_TEAM | Team.OPPONENT,
    coords?: { x: number; y: number }
  ) => {
    if (!currentMatchId) return;

    let actionType = "";
    let specification = "";
    let points: number | undefined = undefined;

    switch (eventType) {
      case "POINT_1":
        actionType = "SHOT";
        specification = "FREE_THROW_MADE";
        points = 1;
        break;
      case "POINT_2":
        actionType = "SHOT";
        specification = "TWO_POINT_MADE";
        points = 2;
        break;
      case "POINT_3":
        actionType = "SHOT";
        specification = "THREE_POINT_MADE";
        points = 3;
        break;
      case "MISS_1":
        actionType = "SHOT";
        specification = "FREE_THROW_MISSED";
        break;
      case "MISS_2":
        actionType = "SHOT";
        specification = "TWO_POINT_MISSED";
        break;
      case "MISS_3":
        actionType = "SHOT";
        specification = "THREE_POINT_MISSED";
        break;
      case "FOUL":
        actionType = "FOUL";
        specification = "PERSONAL";
        break;
      case "REBOUND_DEF":
        actionType = "REBOUND";
        specification = "DEFENSIVE";
        break;
      case "REBOUND_OFF":
        actionType = "REBOUND";
        specification = "OFFENSIVE";
        break;
      case "ASSIST":
        actionType = "ASSIST";
        specification = "STANDARD";
        break;
      case "STEAL":
        actionType = "STEAL";
        specification = "STANDARD";
        break;
      case "BLOCK":
        actionType = "BLOCK";
        specification = "STANDARD";
        break;
      case "TURNOVER":
        actionType = "TURNOVER";
        specification = "STANDARD";
        break;
      default:
        logError("LiveMatchScreen", "Unknown event type", { eventType });
        return;
    }

    // Convert SVG portrait coordinates (0-615.75 x 0-1146.75) to normalized (0-1)
    const normalizedX = coords ? coords.x / 615.75 : -999;
    const normalizedY = coords ? coords.y / 1146.75 : -999;

    const actionForDB: CreateActionData = {
      match_id: currentMatchId,
      team,
      player_number: playerNumber,
      action_type: actionType,
      specification,
      points,
      semantic_x: normalizedX,
      semantic_y: normalizedY,
      action_order: actionCounter,
      period_number: quarter,
      time_in_period: periodDurationMin * 60 - timer,
    };

    actionQueue.enqueue(actionForDB);
    setActionCounter((prev) => prev + 1);

    // Save match state immediately after action to persist timer/period
    const periodDurationSeconds = (periodDurationMin || 10) * 60;
    const timeElapsed = periodDurationSeconds - timer;
    matchManager
      .updateMatchState(currentMatchId, quarter, timeElapsed)
      .catch((err) => {
        logError(
          "LiveMatchScreen",
          "Failed to update match state after action",
          err
        );
      });

    logInfo("LiveMatchScreen", "✅ Action enqueued for database save", {
      actionType,
      specification,
      playerNumber,
      team,
      points,
    });
  };

  const closeWorkflow = () => {
    setWorkflowStep("IDLE");
    setPendingEvent({});
  };

  const handleOpponentScoreSimple = (value: number) => {
    const updatedMatch = { ...match };
    updatedMatch.scoreAway += value;

    const newEvent: MatchEvent = {
      id: `evt-${Date.now()}`,
      type: "POINT" as any,
      value,
      teamId: "AWAY",
      timestamp: Date.now(),
      description: `${match.opponent || "Adversaire"} +${value}`,
      period_number: quarter,
      time_in_period: periodDurationMin * 60 - timer,
    };
    if (!updatedMatch.events) updatedMatch.events = [];
    updatedMatch.events = [newEvent, ...updatedMatch.events];

    setMatch(updatedMatch);

    // Save to database - use a generic opponent player number (99)
    if (currentMatchId) {
      let actionType = "SHOT";
      let specification = "";
      switch (value) {
        case 1:
          specification = "FREE_THROW_MADE";
          break;
        case 2:
          specification = "TWO_POINT_MADE";
          break;
        case 3:
          specification = "THREE_POINT_MADE";
          break;
      }

      const actionForDB: CreateActionData = {
        match_id: currentMatchId,
        team: Team.OPPONENT,
        player_number: 9999, // Generic opponent number
        action_type: actionType,
        specification,
        points: value,
        semantic_x: -999, // indicates no court position (quick score button)
        semantic_y: -999, // indicates no court position (quick score button)
        action_order: actionCounter,
        period_number: quarter,
        time_in_period: periodDurationMin * 60 - timer,
      };

      actionQueue.enqueue(actionForDB);
      setActionCounter((prev) => prev + 1);

      logInfo(
        "LiveMatchScreen",
        "✅ Opponent score enqueued for database save",
        {
          points: value,
          team: Team.OPPONENT,
        }
      );
    }
  };

  const confirmEndMatch = async () => {
    try {
      if (currentMatchId) {
        // Save current match state before ending
        await saveMatchState();

        // Calculate overtime periods played
        const overtimesPlayed = Math.max(0, quarter - maxPeriods);

        logInfo("LiveMatchScreen", "🏁 Ending match", {
          matchId: currentMatchId,
          myTeamScore: match.scoreHome,
          opponentScore: match.scoreAway,
          totalPeriodsPlayed: quarter,
          overtimePeriods: overtimesPlayed,
        });

        // Wait for action queue to flush
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update final scores and overtime info
        await matchRepository.updateFinalScores(
          currentMatchId,
          match.scoreHome || 0,
          match.scoreAway || 0,
          false
        );

        // Update overtime periods count
        await matchRepository.updateOvertimePeriods(
          currentMatchId,
          overtimesPlayed
        );

        // Mark match as completed and compact actions
        await matchManager.endMatch(currentMatchId);

        logInfo("LiveMatchScreen", "✅ Match ended and compacted", {
          matchId: currentMatchId,
          finalScores: `${match.scoreHome} - ${match.scoreAway}`,
          overtimes: overtimesPlayed,
        });

        // Sync to Supabase if eligible (auth + subscription)
        try {
          // Hide end confirm modal and show sync modal
          setShowEndConfirm(false);
          setIsSyncing(true);

          const { MatchSyncService } = await import(
            "../src/services/api/MatchSyncService"
          );
          const syncService = new MatchSyncService(supabase);

          logInfo("LiveMatchScreen", "🔄 Checking sync eligibility", {
            matchId: currentMatchId,
          });

          const eligibility = await syncService.checkSyncEligibility(
            currentMatchId
          );

          if (eligibility.canSync) {
            logInfo("LiveMatchScreen", "📤 Syncing match to Supabase", {
              matchId: currentMatchId,
            });

            const syncResult = await syncService.syncMatch(currentMatchId);

            // Hide sync modal
            setIsSyncing(false);

            if (syncResult.success) {
              logInfo(
                "LiveMatchScreen",
                "✅ Match synced to Supabase successfully",
                {
                  localMatchId: currentMatchId,
                  supabaseMatchId: syncResult.matchId,
                }
              );

              // Fetch the synced match data from Supabase (same way as HistoryScreen)
              try {
                // Fetch match
                const { data: supabaseMatch, error: matchError } = await supabase
                  .from("matches")
                  .select("*")
                  .eq("id", syncResult.matchId)
                  .single();

                if (matchError) throw matchError;

                // Fetch players for this match
                const { data: matchPlayers, error: playersError } = await supabase
                  .from("match_players")
                  .select("*")
                  .eq("match_id", syncResult.matchId);

                if (playersError) throw playersError;

                // Convert match players to expected format
                const players = matchPlayers?.map((mp: any) => ({
                  id: mp.player_number,
                  num: mp.player_number,
                  name: mp.player_name,
                  team: mp.team,
                  isSubstitute: !mp.is_starter,
                  photoUrl: mp.photo_url,
                })) || [];

                // Extract actions from match_players
                const actionDataList: any[] = [];
                matchPlayers?.forEach((mp: any) => {
                  if (mp.actions && Array.isArray(mp.actions)) {
                    const playerActions = mp.actions.map((action: any) => ({
                      type: action.action_type,
                      specification: action.specification,
                      points: action.points,
                      player: mp.player_number,
                      team: mp.team,
                      timestamp: new Date(action.timestamp),
                      period_number: action.period_number,
                      time_in_period: action.time_in_period,
                      position: { x: 0, y: 0 },
                      semanticPosition: {
                        xNormalized: action.semantic_x,
                        yNormalized: action.semantic_y,
                      },
                    }));
                    actionDataList.push(...playerActions);
                  }
                });

                logInfo("LiveMatchScreen", "✅ Synced match data fetched", {
                  matchId: syncResult.matchId,
                  playersCount: players.length,
                  actionsCount: actionDataList.length,
                });

                // Navigate to match details screen with full data (same format as HistoryScreen)
                setTimeout(() => {
                  navigation.navigate(ROUTES.MATCH_DETAILS as never, {
                    match: supabaseMatch,
                    actions: actionDataList,
                    players: players,
                    fromLiveMatch: true, // Flag to hide back button
                  } as never);
                }, 300);
              } catch (fetchError) {
                logError("LiveMatchScreen", "❌ Failed to fetch synced match", {
                  matchId: syncResult.matchId,
                  error: fetchError,
                });
                // Navigate to dashboard if fetch fails
                setTimeout(() => {
                  navigation.navigate(ROUTES.MAIN_TABS as never);
                }, 100);
              }
            } else {
              logWarn("LiveMatchScreen", "⚠️ Match sync failed", {
                matchId: currentMatchId,
                error: syncResult.error,
              });

              // Navigate to dashboard even if sync failed
              setTimeout(() => {
                navigation.navigate(ROUTES.MAIN_TABS as never);
              }, 100);
            }
          } else {
            logInfo("LiveMatchScreen", "ℹ️ Match not synced", {
              matchId: currentMatchId,
              reason: eligibility.reason,
            });

            // Hide sync modal
            setIsSyncing(false);

            // Navigate to dashboard if not syncing
            setTimeout(() => {
              navigation.navigate(ROUTES.MAIN_TABS as never);
            }, 100);
          }
        } catch (syncError) {
          // Don't fail match end if sync fails - log and continue
          logError("LiveMatchScreen", "❌ Error during sync attempt", {
            matchId: currentMatchId,
            error: syncError instanceof Error ? syncError.message : syncError,
          });

          // Hide sync modal in case of error
          setIsSyncing(false);

          // Navigate to dashboard on error
          setTimeout(() => {
            navigation.navigate(ROUTES.MAIN_TABS as never);
          }, 100);
        }
      }

      setMatch({ ...match, status: MatchStatus.COMPLETED });
      // Don't navigate here - navigation is handled in sync logic above
    } catch (error) {
      logError("LiveMatchScreen", "❌ Failed to end match", error);
      // Hide sync modal in case of error
      setIsSyncing(false);
      // Navigate back if save fails
      setTimeout(() => {
        navigation.goBack();
      }, 100);
    }
  };

  // Helpers
  const getSubModalPlayers = () => {
    if (subTeamTab === "HOME") {
      return {
        onCourt: homeRoster.filter((p: Player) => activePlayers.includes(p.id)),
        onBench: homeRoster.filter(
          (p: Player) => !activePlayers.includes(p.id)
        ),
      };
    } else {
      return {
        onCourt: opponentRoster.filter((p: Player) =>
          activeOpponentPlayers.includes(p.id)
        ),
        onBench: opponentRoster.filter(
          (p: Player) => !activeOpponentPlayers.includes(p.id)
        ),
      };
    }
  };

  const playersOnCourt = homeRoster.filter((p: Player) =>
    activePlayers.includes(p.id)
  );
  const opponentPlayersOnCourt = opponentRoster.filter((p: Player) =>
    activeOpponentPlayers.includes(p.id)
  );

  const amIHome = match.location === "HOME";

  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surfaceColor = isDark ? SLATE_COLORS[900] : COMMON_COLORS.white;
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const borderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

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
          color={BRAND_COLORS[500]}
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
      <View
        style={[
          styles.header,
          { backgroundColor: surfaceColor, borderBottomColor: borderColor },
        ]}
      >
        <View style={styles.headerContent}>
          {/* LEFT SIDE */}
          {amIHome ? (
            <View style={styles.teamSection}>
              <Text style={[styles.score, { color: textPrimary }]}>
                {match.scoreHome}
              </Text>
              <Text style={[styles.teamName, { color: BRAND_COLORS[600] }]}>
                {match.myTeamName || "Nous"}
              </Text>
              <TouchableOpacity
                onPress={openSubstitution}
                style={[
                  styles.subButton,
                  {
                    backgroundColor: isDark
                      ? `${BRAND_COLORS[500]}20`
                      : `${BRAND_COLORS[500]}10`,
                    borderColor: isDark
                      ? `${BRAND_COLORS[500]}30`
                      : `${BRAND_COLORS[500]}30`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={12}
                  color={BRAND_COLORS[600]}
                />
                <Text
                  style={[styles.subButtonText, { color: BRAND_COLORS[600] }]}
                >
                  CHANGT
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.teamSection}>
              <Text style={[styles.score, { color: textSecondary }]}>
                {match.scoreAway}
              </Text>
              <Text style={[styles.teamName, { color: textSecondary }]}>
                {match.opponent}
              </Text>
              {!match.trackOpponentStats && (
                <View style={styles.quickScoreButtons}>
                  <TouchableOpacity
                    onPress={() => handleOpponentScoreSimple(1)}
                    style={[
                      styles.quickScoreButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickScoreButtonText,
                        { color: textSecondary },
                      ]}
                    >
                      +1
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpponentScoreSimple(2)}
                    style={[
                      styles.quickScoreButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickScoreButtonText,
                        { color: textSecondary },
                      ]}
                    >
                      +2
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpponentScoreSimple(3)}
                    style={[
                      styles.quickScoreButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickScoreButtonText,
                        { color: textSecondary },
                      ]}
                    >
                      +3
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* CENTER (TIMER) */}
          <View style={styles.timerSection}>
            <View style={styles.periodRow}>
              <Text style={[styles.periodText, { color: textSecondary }]}>
                {getPeriodLabel(quarter)}
              </Text>
              <TouchableOpacity
                onPress={handleNextQuarter}
                style={[
                  styles.nextPeriodButton,
                  {
                    backgroundColor: isDark
                      ? SLATE_COLORS[900]
                      : SLATE_COLORS[100],
                    borderColor,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={10}
                  color={BRAND_COLORS[600]}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.timerDisplay}>
              <Text style={styles.timerText}>{formatTime(timer)}</Text>
            </View>
            <TouchableOpacity
              onPress={toggleTimer}
              style={[
                styles.playButton,
                {
                  backgroundColor: isRunning
                    ? isDark
                      ? SLATE_COLORS[800]
                      : SLATE_COLORS[200]
                    : BRAND_COLORS[600],
                  borderColor: surfaceColor,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={isRunning ? "pause" : "play"}
                size={14}
                color={isRunning ? "#ef4444" : COMMON_COLORS.white}
              />
            </TouchableOpacity>
          </View>

          {/* RIGHT SIDE */}
          {amIHome ? (
            <View style={styles.teamSection}>
              <Text style={[styles.score, { color: textSecondary }]}>
                {match.scoreAway}
              </Text>
              <Text style={[styles.teamName, { color: textSecondary }]}>
                {match.opponent}
              </Text>
              {!match.trackOpponentStats && (
                <View style={styles.quickScoreButtons}>
                  <TouchableOpacity
                    onPress={() => handleOpponentScoreSimple(1)}
                    style={[
                      styles.quickScoreButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickScoreButtonText,
                        { color: textSecondary },
                      ]}
                    >
                      +1
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpponentScoreSimple(2)}
                    style={[
                      styles.quickScoreButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickScoreButtonText,
                        { color: textSecondary },
                      ]}
                    >
                      +2
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpponentScoreSimple(3)}
                    style={[
                      styles.quickScoreButton,
                      {
                        backgroundColor: isDark
                          ? SLATE_COLORS[800]
                          : SLATE_COLORS[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickScoreButtonText,
                        { color: textSecondary },
                      ]}
                    >
                      +3
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.teamSection}>
              <Text style={[styles.score, { color: textPrimary }]}>
                {match.scoreHome}
              </Text>
              <Text style={[styles.teamName, { color: BRAND_COLORS[600] }]}>
                {match.myTeamName || "Nous"}
              </Text>
              <TouchableOpacity
                onPress={openSubstitution}
                style={[
                  styles.subButton,
                  {
                    backgroundColor: isDark
                      ? `${BRAND_COLORS[500]}20`
                      : `${BRAND_COLORS[500]}10`,
                    borderColor: isDark
                      ? `${BRAND_COLORS[500]}30`
                      : `${BRAND_COLORS[500]}30`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="swap-horizontal"
                  size={12}
                  color={BRAND_COLORS[600]}
                />
                <Text
                  style={[styles.subButtonText, { color: BRAND_COLORS[600] }]}
                >
                  CHANGT
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* View Mode Toggle */}
      <View
        style={[
          styles.viewModeToggle,
          { backgroundColor: surfaceColor, borderBottomColor: borderColor },
        ]}
      >
        <TouchableOpacity
          onPress={() => setViewMode("GRID")}
          style={[
            styles.viewModeButton,
            {
              backgroundColor:
                viewMode === "GRID"
                  ? BRAND_COLORS[600]
                  : isDark
                  ? SLATE_COLORS[800]
                  : SLATE_COLORS[100],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="view-grid-outline"
            size={16}
            color={viewMode === "GRID" ? COMMON_COLORS.white : textSecondary}
          />
          <Text
            style={[
              styles.viewModeButtonText,
              {
                color:
                  viewMode === "GRID" ? COMMON_COLORS.white : textSecondary,
              },
            ]}
          >
            ACTIONS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode("COURT")}
          style={[
            styles.viewModeButton,
            {
              backgroundColor:
                viewMode === "COURT"
                  ? BRAND_COLORS[600]
                  : isDark
                  ? SLATE_COLORS[800]
                  : SLATE_COLORS[100],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="map-outline"
            size={16}
            color={viewMode === "COURT" ? COMMON_COLORS.white : textSecondary}
          />
          <Text
            style={[
              styles.viewModeButtonText,
              {
                color:
                  viewMode === "COURT" ? COMMON_COLORS.white : textSecondary,
              },
            ]}
          >
            TERRAIN
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {viewMode === "GRID" && (
          <ScrollView
            style={styles.gridScroll}
            contentContainerStyle={styles.gridContent}
          >
            <MatchActionGrid onAction={handleActionClick} isDark={isDark} filterMode={filterMode} />
          </ScrollView>
        )}

        {viewMode === "COURT" && (
          <CourtView
            onCourtClick={handleCourtClick}
            events={match.events}
            showMarkers={showMarkers}
            filterMode={filterMode}
            selectedPlayerIds={selectedPlayerIds}
            isDark={isDark}
            clubLogoUrl={match.clubLogoUrl}
            courtBackgroundColor={match.courtBackgroundColor}
            courtLineColor={match.courtLineColor}
          />
        )}
      </View>

      {/* Toolbar */}
      <View
        style={[
          styles.toolbar,
          { backgroundColor: surfaceColor, borderTopColor: borderColor },
        ]}
      >
        <TouchableOpacity onPress={undoLastAction} style={styles.toolbarButton}>
          <MaterialCommunityIcons name="undo" size={22} color={textSecondary} />
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
            Annuler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowFilterModal(true)}
          style={styles.toolbarButton}
        >
          <MaterialCommunityIcons
            name="filter-outline"
            size={22}
            color={filterMode !== "ALL" ? BRAND_COLORS[500] : textSecondary}
          />
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
            Filtres
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowMarkers(!showMarkers)}
          style={styles.toolbarButton}
        >
          <MaterialCommunityIcons
            name={showMarkers ? "eye" : "eye-off"}
            size={22}
            color={showMarkers ? BRAND_COLORS[500] : textSecondary}
          />
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
            Vue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleGenerateMockActions}
          disabled={isGeneratingMockData}
          style={[
            styles.toolbarButton,
            isGeneratingMockData && { opacity: 0.5 },
          ]}
        >
          <MaterialCommunityIcons
            name="flask"
            size={22}
            color={isGeneratingMockData ? BRAND_COLORS[300] : BRAND_COLORS[500]}
          />
          <Text
            style={[
              styles.toolbarButtonText,
              {
                color: isGeneratingMockData
                  ? BRAND_COLORS[300]
                  : BRAND_COLORS[500],
              },
            ]}
          >
            {isGeneratingMockData ? "..." : "Test"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowHistoryModal(true)}
          style={styles.toolbarButton}
        >
          <MaterialCommunityIcons
            name="format-list-bulleted"
            size={22}
            color={textSecondary}
          />
          <Text style={[styles.toolbarButtonText, { color: textSecondary }]}>
            Historique
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      {/* Will be implemented in next part */}
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
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <HistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        events={match.events}
        onDeleteEvent={deleteEvent}
        match={match}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        borderColor={borderColor}
        homeRoster={homeRoster}
        opponentRoster={opponentRoster}
        trackOpponentStats={match.trackOpponentStats}
        selectedPlayers={selectedPlayerIds}
        onPlayerSelectionChange={setSelectedPlayerIds}
      />

      {/* Sync Modal */}
      <Modal visible={isSyncing} transparent={true} animationType="fade">
        <View style={styles.syncModalOverlay}>
          <View
            style={[
              styles.syncModalContent,
              {
                backgroundColor: surfaceColor,
                borderColor: borderColor,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="cloud-upload"
              size={48}
              color={BRAND_COLORS[500]}
              style={{ marginBottom: 16 }}
            />
            <ActivityIndicator size="large" color={BRAND_COLORS[500]} />
            <Text style={[styles.syncModalText, { color: textPrimary }]}>
              Synchronisation avec le serveur...
            </Text>
            <Text style={[styles.syncModalSubtext, { color: textSecondary }]}>
              Veuillez patienter
            </Text>
          </View>
        </View>
      </Modal>

      <PlayerSelectionModal
        visible={workflowStep === "SELECT_PLAYER"}
        onClose={closeWorkflow}
        onPlayerSelect={handlePlayerSelect}
        pendingEvent={pendingEvent}
        match={match}
        playersOnCourt={playersOnCourt}
        opponentPlayersOnCourt={opponentPlayersOnCourt}
        playerSelectionTab={playerSelectionTab}
        setPlayerSelectionTab={setPlayerSelectionTab}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <CourtActionModal
        visible={workflowStep === "SELECT_ACTION_FROM_COURT"}
        onClose={closeWorkflow}
        onActionSelect={handleCourtActionSelect}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <SubstitutionModal
        visible={workflowStep === "SUBSTITUTION"}
        onClose={closeWorkflow}
        onCommit={commitSubstitution}
        subSelection={subSelection}
        toggleSubOut={toggleSubOut}
        toggleSubIn={toggleSubIn}
        getSubModalPlayers={getSubModalPlayers}
        match={match}
        subTeamTab={subTeamTab}
        setSubTeamTab={setSubTeamTab}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <EndMatchModal
        visible={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={confirmEndMatch}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <PeriodConfirmModal
        visible={showPeriodConfirm}
        onClose={() => setShowPeriodConfirm(false)}
        onConfirm={proceedToNextPeriod}
        timer={timer}
        formatTime={formatTime}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <DeleteActionModal
        visible={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setEventToDelete(null);
        }}
        onConfirm={confirmDeleteEvent}
        eventDescription={eventToDelete?.description || ""}
        isDark={isDark}
        surfaceColor={surfaceColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />
    </View>
  );
}

// ==================== COMPONENTS ====================

// Court View Component
interface CourtViewProps {
  onCourtClick: (x: number, y: number) => void;
  events: MatchEvent[];
  showMarkers: boolean;
  filterMode: FilterMode;
  selectedPlayerIds: string[];
  isDark: boolean;
  clubLogoUrl: string | null;
  courtBackgroundColor: string;
  courtLineColor: string;
}

const CourtView: React.FC<CourtViewProps> = ({
  onCourtClick,
  events,
  showMarkers,
  filterMode,
  selectedPlayerIds,
  isDark,
  clubLogoUrl,
  courtBackgroundColor,
  courtLineColor,
}) => {
  const [courtDimensions, setCourtDimensions] = useState({
    width: 0,
    height: 0,
  });

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setCourtDimensions({ width, height });
  };

  const filteredEvents = events?.filter((e: MatchEvent) => {
    if (!e.coordinates) return false;

    // Filter by player if selection exists
    if (selectedPlayerIds.length > 0 && e.playerId) {
      if (!selectedPlayerIds.includes(e.playerId)) return false;
    }

    // Filter by action type
    if (filterMode === "ALL") return true;
    if (filterMode === "SHOOTING")
      return e.type.includes("POINT") || e.type.includes("MISS");
    if (filterMode === "REBOUNDS")
      return ["REBOUND_OFF", "REBOUND_DEF"].includes(e.type);
    if (filterMode === "FOULS")
      return e.type === "FOUL";
    if (filterMode === "TURNOVERS")
      return e.type === "TURNOVER";
    if (filterMode === "BLOCKS")
      return e.type === "BLOCK";
    if (filterMode === "STEALS")
      return e.type === "STEAL";
    return true;
  });

  const markers = showMarkers
    ? filteredEvents?.map((evt: MatchEvent) => {
        let markerColor = SLATE_COLORS[500];

        // Tirs réussis (vert pour nous, rouge pour adversaire)
        if (evt.type.includes("POINT"))
          markerColor = evt.teamId === "AWAY" ? "#ef4444" : "#22c55e";
        // Tirs ratés (orange pour nous, rouge foncé pour adversaire)
        else if (evt.type.includes("MISS"))
          markerColor = evt.teamId === "AWAY" ? "#ea580c" : "#f97316";
        // Rebonds (bleu)
        else if (evt.type === "REBOUND_DEF" || evt.type === "REBOUND_OFF")
          markerColor = evt.teamId === "AWAY" ? "#3b82f6" : "#60a5fa";
        // Fautes (jaune/orange)
        else if (evt.type === "FOUL")
          markerColor = evt.teamId === "AWAY" ? "#f59e0b" : "#fbbf24";
        // Passes décisives (violet)
        else if (evt.type === "ASSIST")
          markerColor = evt.teamId === "AWAY" ? "#a855f7" : "#c084fc";
        // Interceptions (cyan)
        else if (evt.type === "STEAL")
          markerColor = evt.teamId === "AWAY" ? "#06b6d4" : "#22d3ee";
        // Contres (indigo)
        else if (evt.type === "BLOCK")
          markerColor = evt.teamId === "AWAY" ? "#6366f1" : "#818cf8";
        // Pertes de balle (rose)
        else if (evt.type === "TURNOVER")
          markerColor = evt.teamId === "AWAY" ? "#ec4899" : "#f472b6";

        // Convert normalized coordinates (0-1) to portrait SVG coordinates (0-615.75 x 0-1146.75)
        const svgX = evt.coordinates!.x * 615.75;
        const svgY = evt.coordinates!.y * 1146.75;

        return {
          id: evt.id,
          svgX,
          svgY,
          color: markerColor,
        };
      }) || []
    : [];

  const defaultLogoUri = require("../components/icons/coachassistant-logo-margin.png");
  const logoUri = clubLogoUrl || defaultLogoUri;

  return (
    <View style={styles.courtContainer} onLayout={handleLayout}>
      <BasketballCourtSVG
        width={courtDimensions.width || 400}
        height={courtDimensions.height || 600}
        onCourtPress={(svgX: number, svgY: number) => {
          onCourtClick(svgX, svgY);
        }}
        backgroundColor={courtBackgroundColor}
        lineColor={courtLineColor}
        logoUri={logoUri}
        markers={markers}
      />
    </View>
  );
};

// Modals are imported from LiveMatchModals.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  teamSection: {
    width: 112,
    alignItems: "center",
    paddingTop: 4,
  },
  score: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -2,
  },
  teamName: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
  },
  subButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
  },
  subButtonText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  quickScoreButtons: {
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
  },
  quickScoreButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quickScoreButtonText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  timerSection: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  periodText: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  nextPeriodButton: {
    padding: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  timerDisplay: {
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: SLATE_COLORS[800],
    width: 170,
    alignItems: "center",
  },
  timerText: {
    fontFamily: "monospace",
    fontSize: 32,
    fontWeight: "900",
    color: "#dc2626",
    letterSpacing: 4,
  },
  playButton: {
    marginTop: -12,
    padding: 6,
    borderRadius: 999,
    borderWidth: 4,
    zIndex: 10,
  },
  viewModeToggle: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewModeButtonText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  mainContent: {
    flex: 1,
    paddingBottom: 64,
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
    backgroundColor: "#1a472a",
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
  toolbar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  toolbarButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  toolbarButtonText: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 4,
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
    backgroundColor: `${BRAND_COLORS[500]}20`,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${BRAND_COLORS[500]}30`,
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
  syncModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  syncModalContent: {
    width: "80%",
    maxWidth: 320,
    padding: 32,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  syncModalText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  syncModalSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
});
