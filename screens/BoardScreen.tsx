/**
 * BoardScreen (Basketball Court)
 *
 * Main screen for managing live basketball matches.
 * Features:
 * - Interactive basketball court with SVG visualization
 * - Real-time action tracking (shots, rebounds, fouls)
 * - Player management (starters, substitutes, coaches)
 * - Timer and period management
 * - Score tracking
 * - SQLite persistence with action queue
 * - Support for single team mode (A or B) or both teams mode
 * - Pre-game setup flow (team selection, initialization, configuration)
 * - Resume incomplete matches from database
 * - Action filtering and history
 *
 * Architecture:
 * - Uses MatchManager for match state persistence
 * - ActionQueue for batched action saves to SQLite
 * - Semantic coordinate system for court actions (rotation-aware)
 * - Modal-based UI for actions, player editing, and configuration
 */

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Modal,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import {
  MATCH_FORMATS,
  MATCH_FORMAT_LABELS,
} from "../constants/matchConstants";
import TeamSelectionModal from "./TeamSelectionModal";
import InitTeamModal from "./InitTeamModal";
import MatchConfigModal from "./MatchConfigModal";
import PlayerEditModal from "./PlayerEditModal";
import ActionSystemModal, {
  ActionData,
  getActionIcon,
} from "../components/ActionSystemModal";
import FilterBottomSheet from "../components/FilterBottomSheet";
import HistoryBottomSheet from "../components/HistoryBottomSheet";
import { ROUTES } from "../constants/routes";
import BasketballCourtSVG from "../components/BasketballCourtSVG";
import SubstitutesManager from "../components/SubstitutesManager";
import CoachEditModal from "../components/CoachEditModal";
import ResumeMatchModal from "../components/ResumeMatchModal";
import JerseyIcon from "../components/JerseyIcon";
import MatchStatusBar from "../components/MatchStatusBar";
import MatchConfirmationModal from "../components/MatchConfirmationModal";
import { MatchManager } from "../src/services/match/MatchManager";
import { ActionQueue, ActionObserver } from "../src/services/match/ActionQueue";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { MatchPlayerRepository } from "../src/services/database/MatchPlayerRepository";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { Match } from "../src/models/types";
import type { Player } from "../models/Player";
import type { Club } from "../models/Club";
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import { useAuth } from "../src/contexts/AuthContext";
import { logInfo, logError, logWarn } from "../utils/logger";
import { generateMockActions, getMockActionsSummary } from "../utils/mockActions";
import { DEBUG } from "../src/config/debug";
import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
  isShotMade,
  ACTION_TYPE_FR,
  SHOT_SPECIFICATION_FR,
  REBOUND_SPECIFICATION_FR,
  FOUL_SPECIFICATION_FR,
} from "../src/models/ActionTypes";
import { getActionColor } from "../src/config/actionConfig";

// Modal layout constants (for the new ActionModal)
const MODAL_WIDTH = 240;
const MODAL_HEIGHT = 180; // ⬇️ Reduced from 220 to 180 (less tall)
const MODAL_PADDING = 20;
const POINTER_SIZE = 12;
const MODAL_OFFSET_TOP = 10;
const MODAL_OFFSET_BOTTOM = 50;
const MODAL_CONTENT_PADDING = 20;

type RootStackParamList = {
  MainMenu: undefined;
  Board: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Board">;

// Interface for board players with optional club player properties
interface BoardPlayer {
  id: number;
  num: number;
  name: string;
  isSubstitute: boolean;
  isFromClub: boolean;
  playerId?: string; // Club player UUID
  photoUrl?: string; // Player photo URL
  isAddedInPreGame?: boolean; // True if player was added during pre-game (not pre-configured)
}

/**
 * Convert club players (from database) to BoardScreen format
 * Maps players by position (1-5 for starters) rather than jersey number
 */
const convertClubPlayersToBoard = (
  clubPlayers: Player[],
  teamLetter: "A" | "B" = "A"
) => {
  // Separate starters and substitutes
  const clubStarters = clubPlayers.filter((p) => p.isStarter);
  const clubSubstitutes = clubPlayers.filter((p) => !p.isStarter);

  // Calculate base ID offset (Team A: 1-5, Team B: 6-10)
  const baseId = teamLetter === "B" ? 5 : 0;

  // Map starters by position (1-5)
  // Position 1 = Point Guard, 2 = Shooting Guard, 3 = Small Forward, 4 = Power Forward, 5 = Center
  const starters = Array.from({ length: 5 }, (_, index) => {
    const position = (index + 1) as 1 | 2 | 3 | 4 | 5;
    const playerAtPosition = clubStarters.find((p) => p.position === position);

    if (playerAtPosition) {
      return {
        id: baseId + index + 1,
        playerId: playerAtPosition.id, // Keep the original club player ID
        num: playerAtPosition.jerseyNumber,
        name: playerAtPosition.name,
        photoUrl: playerAtPosition.photoUrl,
        isSubstitute: false,
        isFromClub: true,
      };
    }

    // If no player at this position, create a default placeholder
    return {
      id: baseId + index + 1,
      num: index + 1,
      name: `Joueur ${teamLetter}${index + 1}`,
      isSubstitute: false,
      isFromClub: false,
    };
  });

  // Map substitutes (keep their order, assign sequential IDs)
  const baseSubId = teamLetter === "B" ? 20 : 10;
  const substitutes = clubSubstitutes.map((p, index) => ({
    id: baseSubId + index + 1,
    playerId: p.id, // Keep the original club player ID
    num: p.jerseyNumber,
    name: p.name,
    photoUrl: p.photoUrl,
    isSubstitute: true,
    isFromClub: true,
  }));

  return { starters, substitutes };
};

/**
 * Get marker color based on action type and specification
 * @deprecated Now using centralized getActionColor from actionConfig
 */
const getMarkerColor = (actionType: string, specification?: string, points?: number): string => {
  return getActionColor(actionType, specification, points);
};

/**
 * Semantic coordinate system for basketball court
 * Understands that the court has paint areas that change orientation
 */

interface SemanticPosition {
  // Normalized position in logical court (always same orientation)
  // 0,0 = top left corner of logical court
  // 1,1 = bottom right corner of logical court
  xNormalized: number; // 0.0 to 1.0
  yNormalized: number; // 0.0 to 1.0
  // Added: orientation in which the position was captured
  capturedInPortrait: boolean;
}

/**
 * Convert a click position to normalized semantic position
 * Simplified approach: we save the relative coordinates as-is
 * with the capture orientation information
 */
const convertClickToSemantic = (
  clickPosition: { x: number; y: number },
  isPortrait: boolean,
  courtDimensions: { width: number; height: number }
): SemanticPosition => {
  // Always save relative coordinates directly
  // without rotation transformation
  return {
    xNormalized: clickPosition.x / courtDimensions.width,
    yNormalized: clickPosition.y / courtDimensions.height,
    capturedInPortrait: isPortrait,
  };
};

/**
 * Convert a semantic position to display position
 * Handles conversion between orientations symmetrically
 */
const convertSemanticToDisplay = (
  semanticPosition: SemanticPosition,
  isPortrait: boolean,
  courtDimensions: { width: number; height: number }
) => {
  // If current orientation matches capture orientation, direct conversion
  if (semanticPosition.capturedInPortrait === isPortrait) {
    return {
      x: semanticPosition.xNormalized * courtDimensions.width,
      y: semanticPosition.yNormalized * courtDimensions.height,
    };
  }

  // Otherwise, transform coordinates for the other orientation
  if (isPortrait) {
    // Display in portrait a marker captured in landscape
    // Test version - restore the one that worked before
    return {
      x: semanticPosition.yNormalized * courtDimensions.width,
      y: (1 - semanticPosition.xNormalized) * courtDimensions.height,
    };
  } else {
    // Display in landscape a marker captured in portrait
    // Icon is slightly too high, adjust Y
    return {
      x: semanticPosition.yNormalized * courtDimensions.width,
      y: (1 - semanticPosition.xNormalized + 0.045) * courtDimensions.height,
    };
  }
};

export default function BasketballCourt() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const clubId = (route.params as any)?.clubId || null;
  const { user } = useAuth();
  const insets = useSafeAreaInsets(); // Provides status bar and notch margins
  const window = useWindowDimensions(); // Automatically reacts to rotation
  const [showSheet, setShowSheet] = useState(true);
  const [club, setClub] = useState<Club | null>(null);

  // Constants for dimensions and offsets
  const BOTTOM_NAV_HEIGHT = 50; // Height of bottom navigation bar in portrait
  const BOTTOM_NAV_WIDTH = 70; // Width of bottom navigation bar in landscape

  // 🎯 CENTERING CONSTANTS - Easy to adjust!
  const ICON_OFFSET_X = -14; // Horizontal offset of icon
  const ICON_OFFSET_Y = 0; // Vertical offset of icon
  const DEBUG_DOT_OFFSET_X = 17; // Horizontal offset of debug red dot
  const DEBUG_DOT_OFFSET_Y = 17; // Vertical offset of debug red dot

  // 🎯 MODAL CENTERING CONSTANTS - Pointer position correction
  // Modal ABOVE click (click at bottom of screen → pointer at bottom of modal)
  const MODAL_POINTER_OFFSET_X_TOP = 20; // Horizontal offset when modal above
  const MODAL_POINTER_OFFSET_Y_TOP = 75; // Vertical offset when modal above

  // Modal BELOW click (click at top of screen → pointer at top of modal)
  const MODAL_POINTER_OFFSET_X_BOTTOM = 18; // Horizontal offset when modal below
  const MODAL_POINTER_OFFSET_Y_BOTTOM = 45; // Vertical offset when modal below (smaller!)

  const [orientation, setOrientation] =
    useState<ScreenOrientation.Orientation | null>(null); // Used to delay rendering until orientation is locked
  const [isReady, setIsReady] = useState(false);

  // Markers state: stores events with detailed information
  const [markers, setMarkers] = useState<
    {
      x: number;
      y: number;
      type: string;
      specification?: string;
      player?: number;
      id: string; // Add unique ID for each marker
      opacity: Animated.Value; // Add animated opacity
      // Semantic position for repositioning during rotations
      semanticPosition: {
        xNormalized: number; // Normalized position in logical court
        yNormalized: number; // Normalized position in logical court
        capturedInPortrait: boolean; // Capture orientation
      };
    }[]
  >([]);

  // Simple click markers for testing (will merge with markers later)
  const [clickMarkers, setClickMarkers] = useState<
    { id: string; svgX: number; svgY: number; color?: string }[]
  >([]);

  // Actual container layout (measured after SafeAreaView padding)
  const [containerLayout, setContainerLayout] = useState({
    width: 0,
    height: 0,
  });

  // Temporary storage for SVG coordinates during action modal flow
  const [tempSvgCoords, setTempSvgCoords] = useState<{
    svgX: number;
    svgY: number;
  } | null>(null);

  // New state for completed actions with detailed data
  const [completedActions, setCompletedActions] = useState<ActionData[]>([]);

  // State for showing all actions
  const [showAllActions, setShowAllActions] = useState(false);

  // State for undo confirmation popup
  const [showUndoConfirmation, setShowUndoConfirmation] = useState(false);

  // State for filter bottom sheet
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // State for history bottom sheet
  const [showHistorySheet, setShowHistorySheet] = useState(false);

  // State for applied filters
  const [appliedFilters, setAppliedFilters] = useState<{
    teams: ("A" | "B")[];
    players: number[];
    actionTypes: string[];
  }>({
    teams: ["A", "B"],
    players: [],
    actionTypes: [],
  });

  // Ref to store marker animations
  const markerAnimations = useRef<{ [key: string]: Animated.Value }>({});

  /**
   * Toggle showing all action markers on court
   * Handler for Actions button in bottom toolbar
   */
  const toggleShowAllActions = () => {
    const newState = !showAllActions;
    logInfo(
      "BoardScreen",
      newState
        ? "👁️ User enabled action markers display"
        : "🚫 User disabled action markers display",
      {
        previousState: showAllActions,
        newState,
        totalActions: completedActions.length,
      }
    );
    setShowAllActions(newState);
  };

  /**
   * Handle undo last action button click
   * Shows confirmation modal before undoing
   */
  const handleUndoLastAction = () => {
    if (completedActions.length > 0) {
      const lastAction = completedActions[completedActions.length - 1];
      logInfo("BoardScreen", "⏪ User clicked undo button", {
        totalActions: completedActions.length,
        lastActionType: lastAction.type,
        lastActionSpec: lastAction.specification,
        lastActionPlayer: lastAction.player,
        lastActionTeam: lastAction.team,
      });
      setShowUndoConfirmation(true);
    } else {
      logWarn("BoardScreen", "⚠️ Undo button clicked but no actions to undo");
    }
  };

  /**
   * Confirm undo action - removes last action from state
   * Called when user confirms in undo modal
   */
  const confirmUndoAction = () => {
    if (completedActions.length > 0) {
      const lastAction = completedActions[completedActions.length - 1];

      logInfo("BoardScreen", "✅ User confirmed undo action", {
        actionType: lastAction.type,
        actionSpec: lastAction.specification,
        player: lastAction.player,
        team: lastAction.team,
        remainingActions: completedActions.length - 1,
      });

      // Remove the last action from completedActions
      setCompletedActions((prev) => prev.slice(0, -1));

      // Remove the corresponding marker if it exists (temporary markers)
      // Use semantic coordinates for comparison
      setMarkers((prev) =>
        prev.filter(
          (marker) =>
            !(
              Math.abs(
                marker.semanticPosition.xNormalized -
                  lastAction.semanticPosition.xNormalized
              ) < 0.001 &&
              Math.abs(
                marker.semanticPosition.yNormalized -
                  lastAction.semanticPosition.yNormalized
              ) < 0.001 &&
              marker.type === lastAction.type &&
              marker.specification === lastAction.specification &&
              marker.player === lastAction.player
            )
        )
      );
    }
    setShowUndoConfirmation(false);
  };

  /**
   * Cancel undo action - user clicked cancel in confirmation modal
   */
  const cancelUndoAction = () => {
    logInfo("BoardScreen", "❌ User cancelled undo action");
    setShowUndoConfirmation(false);
  };

  // Function to remove a marker after delay with fade-out animation
  const removeMarkerAfterDelay = (markerId: string, delay: number = 3000) => {
    setTimeout(() => {
      // Start fade-out animation
      const opacityValue = markerAnimations.current[markerId];
      if (opacityValue) {
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 500, // 500ms fade-out
          useNativeDriver: true,
        }).start(() => {
          // Remove marker after animation completes
          setMarkers((prev) => prev.filter((m) => m.id !== markerId));
          // Clean up the animation reference
          delete markerAnimations.current[markerId];
        });
      }
    }, delay);
  };

  /**
   * Handle filter application from FilterBottomSheet
   * Updates applied filters state to filter displayed actions
   */
  const handleApplyFilters = (filters: {
    teams: ("A" | "B")[];
    players: number[];
    actionTypes: string[];
  }) => {
    logInfo("BoardScreen", "🔍 User applied action filters", {
      teams: filters.teams,
      teamCount: filters.teams.length,
      players: filters.players,
      playerCount: filters.players.length,
      actionTypes: filters.actionTypes,
      actionTypeCount: filters.actionTypes.length,
      totalActions: completedActions.length,
    });
    setAppliedFilters(filters);
  };

  /**
   * Reset filters to default (show all actions)
   * Handler for Reset button in bottom toolbar
   */
  const handleResetFilters = () => {
    logInfo("BoardScreen", "🔄 User reset action filters to default", {
      previousFilters: appliedFilters,
      totalActions: completedActions.length,
    });
    setAppliedFilters({
      teams: ["A", "B"],
      players: [],
      actionTypes: [],
    });
  };

  /**
   * Delete a specific action from history
   * Called from HistoryBottomSheet when user deletes an action
   */
  const handleDeleteAction = (actionIndex: number) => {
    const deletedAction = completedActions[actionIndex];
    logInfo("BoardScreen", "🗑️ User deleted action from history", {
      actionIndex,
      actionType: deletedAction?.type,
      actionSpec: deletedAction?.specification,
      player: deletedAction?.player,
      team: deletedAction?.team,
      remainingActions: completedActions.length - 1,
    });

    setCompletedActions((prev) => {
      const newActions = [...prev];
      newActions.splice(actionIndex, 1);
      return newActions;
    });
  };

  // Function to get team color
  const getTeamColor = (team: "A" | "B") => {
    return team === "A" ? "#4CAF50" : "#2196F3"; // Green for team A, Blue for team B
  };

  // Function to get team name
  const getTeamName = (team: "A" | "B") => {
    return team === "A" ? teamA : teamB;
  };

  // Function to filter completed actions based on applied filters
  const getFilteredActions = () => {
    if (!showAllActions) return [];

    return completedActions.filter((action) => {
      // Filter by teams (if any teams selected)
      if (appliedFilters.teams.length > 0) {
        if (!appliedFilters.teams.includes(action.team)) {
          return false;
        }
      }

      // Filter by players (if any players selected)
      if (appliedFilters.players.length > 0) {
        if (!action.player || !appliedFilters.players.includes(action.player)) {
          return false;
        }
      }

      // Filter by action types (if any action types selected)
      if (appliedFilters.actionTypes.length > 0) {
        if (!appliedFilters.actionTypes.includes(action.type)) {
          return false;
        }
      }

      return true;
    });
  };

  // Added state for initialization popups
  const [teamSelectionModalVisible, setTeamSelectionModalVisible] =
    useState(false); // Start as false, will be set to true after checking for active match
  const [hasShownTeamSelection, setHasShownTeamSelection] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [selectedTeamPlayers, setSelectedTeamPlayers] = useState<any[]>([]);
  const [initModalVisible, setInitModalVisible] = useState(false);
  const [matchConfigModalVisible, setMatchConfigModalVisible] = useState(false);
  const [teamA, setTeamA] = useState("Team A");
  const [teamB, setTeamB] = useState("Team B");
  const [teamAId, setTeamAId] = useState<string | null>(null); // UUID if club team
  const [teamBId, setTeamBId] = useState<string | null>(null); // UUID if club team
  const [teamMode, setTeamMode] = useState<"A" | "B" | "BOTH">("A");
  const [currentTeam, setCurrentTeam] = useState<"A" | "B">("A");

  // PreGame mode: disables court interactions
  const [preGameMode, setPreGameMode] = useState(true);

  // State for current match
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [matchManager] = useState(() => new MatchManager());

  // State for resume match modal
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [foundMatch, setFoundMatch] = useState<Match | null>(null);

  // State for action queue
  const [actionQueue] = useState(() => new ActionQueue());
  const [actionRepository] = useState(() => new ActionRepository());
  const [matchPlayerRepository] = useState(() => new MatchPlayerRepository());
  const [matchRepository] = useState(() => new MatchRepository());
  const [actionCounter, setActionCounter] = useState(0); // To generate action_order

  // State for player editing
  const [playerEditModalVisible, setPlayerEditModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [editingTeam, setEditingTeam] = useState<"A" | "B">("A"); // 🏀 Team being edited

  // State for players with their positions
  const [players, setPlayers] = useState<BoardPlayer[]>([
    {
      id: 1,
      num: 1,
      name: "Joueur A1",
      isSubstitute: false,
      isFromClub: false,
    },
    {
      id: 2,
      num: 2,
      name: "Joueur A2",
      isSubstitute: false,
      isFromClub: false,
    },
    {
      id: 3,
      num: 3,
      name: "Joueur A3",
      isSubstitute: false,
      isFromClub: false,
    },
    {
      id: 4,
      num: 4,
      name: "Joueur A4",
      isSubstitute: false,
      isFromClub: false,
    },
    {
      id: 5,
      num: 5,
      name: "Joueur A5",
      isSubstitute: false,
      isFromClub: false,
    },
  ]);

  // 🏀 State for team B players ("both" mode)
  const [playersTeamB, setPlayersTeamB] = useState<BoardPlayer[]>([
    {
      id: 6,
      num: 1,
      name: "Joueur B1",
      isSubstitute: false,
      isFromClub: false,
    },
    {
      id: 7,
      num: 2,
      name: "Joueur B2",
      isSubstitute: false,
      isFromClub: false,
    },
    {
      id: 8,
      num: 3,
      name: "Joueur B3",
      isSubstitute: false,
      isFromClub: false,
    },
    {
      id: 9,
      num: 4,
      name: "Joueur B4",
      isSubstitute: false,
      isFromClub: false,
    },
    {
      id: 10,
      num: 5,
      name: "Joueur B5",
      isSubstitute: false,
      isFromClub: false,
    },
  ]);

  // States for substitutes
  const [substitutesTeamA, setSubstitutesTeamA] = useState<BoardPlayer[]>([
    {
      id: 11,
      num: 6,
      name: "Remplaçant A1",
      isSubstitute: true,
      isFromClub: false,
    },
    {
      id: 12,
      num: 7,
      name: "Remplaçant A2",
      isSubstitute: true,
      isFromClub: false,
    },
    {
      id: 13,
      num: 8,
      name: "Remplaçant A3",
      isSubstitute: true,
      isFromClub: false,
    },
    {
      id: 14,
      num: 9,
      name: "Remplaçant A4",
      isSubstitute: true,
      isFromClub: false,
    },
    {
      id: 15,
      num: 10,
      name: "Remplaçant A5",
      isSubstitute: true,
      isFromClub: false,
    },
  ]);

  const [substitutesTeamB, setSubstitutesTeamB] = useState<BoardPlayer[]>([
    {
      id: 16,
      num: 6,
      name: "Remplaçant B1",
      isSubstitute: true,
      isFromClub: false,
    },
    {
      id: 17,
      num: 7,
      name: "Remplaçant B2",
      isSubstitute: true,
      isFromClub: false,
    },
    {
      id: 18,
      num: 8,
      name: "Remplaçant B3",
      isSubstitute: true,
      isFromClub: false,
    },
    {
      id: 19,
      num: 9,
      name: "Remplaçant B4",
      isSubstitute: true,
      isFromClub: false,
    },
    {
      id: 20,
      num: 10,
      name: "Remplaçant B5",
      isSubstitute: true,
      isFromClub: false,
    },
  ]);

  // States for coaches
  const [coachTeamA, setCoachTeamA] = useState({
    id: 21,
    name: "Coach Équipe A",
    photoUrl: undefined as string | undefined,
    isCoach: true,
  });

  const [coachTeamB, setCoachTeamB] = useState({
    id: 22,
    name: "Coach Équipe B",
    photoUrl: undefined as string | undefined,
    isCoach: true,
  });

  // Safety: disable button if a field is empty
  const isConfirmDisabled = teamA.trim() === "" || teamB.trim() === "";

  // Function to format date in French
  function getFormattedDate() {
    const now = new Date();
    return (
      now.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }) +
      " à " +
      now
        .toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(":", "h")
    );
  }

  // Fonction pour obtenir les couleurs du jersey selon l'équipe
  const getJerseyColors = (team: "A" | "B") => {
    // Si une équipe du club est présente
    if (teamAId || teamBId) {
      // Si cette équipe est celle du club, utiliser les couleurs du club
      if ((team === "A" && teamAId) || (team === "B" && teamBId)) {
        return {
          primary: club?.secondaryColor || "#000000",
          secondary: club?.primaryColor || "#FF0000",
        };
      }
      // Sinon, utiliser la couleur par défaut pour l'équipe adverse
      return {
        primary: "#FFFFFF",
        secondary: "#931116",
      };
    }

    // Aucune équipe du club : couleurs par défaut
    return team === "A"
      ? { primary: "#FFFFFF", secondary: "#002157" }
      : { primary: "#FFFFFF", secondary: "#931116" };
  };

  useEffect(() => {
    setShowSheet(true);
  }, []);

  /**
   * Load club data if clubId is provided
   * Fetches club details from Supabase to display club context
   */
  useEffect(() => {
    const loadClub = async () => {
      if (!clubId) return;

      logInfo("BoardScreen", "📡 Loading club data from Supabase", { clubId });

      try {
        const clubService = ServiceFactory.getClubService(supabase);
        const clubData = await clubService.getClubById(clubId);
        if (clubData) {
          setClub(clubData);
          logInfo("BoardScreen", "✅ Club data loaded successfully", {
            clubId,
            clubName: clubData.name,
            clubCode: clubData.code,
          });
        }
      } catch (error) {
        logError("BoardScreen", "❌ Error loading club data", {
          clubId,
          error: error instanceof Error ? error.message : error,
        });
      }
    };

    loadClub();
  }, [clubId]);

  /**
   * Check if there is an active match at startup
   * If found, prompt user to resume; otherwise show team selection
   */
  useEffect(() => {
    const checkActiveMatch = async () => {
      logInfo("BoardScreen", "🔍 Checking for active match in SQLite", {
        userId: user?.id,
        clubId,
      });

      try {
        const activeMatch = await matchManager.getActiveMatch();
        if (activeMatch) {
          logInfo("BoardScreen", "🔄 Active match found, prompting to resume", {
            matchId: activeMatch.id,
            teamA: activeMatch.team_a_name,
            teamB: activeMatch.team_b_name,
            finalScoreA: activeMatch.final_score_a,
            finalScoreB: activeMatch.final_score_b,
            status: activeMatch.status,
          });
          setFoundMatch(activeMatch);
          setResumeModalVisible(true);
          setInitModalVisible(false);
          setTeamSelectionModalVisible(false); // Ensure team selection is hidden
        } else {
          // No active match, show team selection modal
          logInfo(
            "BoardScreen",
            "✅ No active match found, showing team selection modal"
          );
          setTeamSelectionModalVisible(true);
        }
      } catch (error) {
        logError("BoardScreen", "❌ Error checking active match", {
          error: error instanceof Error ? error.message : error,
          userId: user?.id,
        });
        // On error, still show team selection
        setTeamSelectionModalVisible(true);
      }
    };

    checkActiveMatch();
  }, [matchManager]);

  /**
   * Configure action queue observer
   * Monitors when actions are batch-saved to SQLite database
   */
  useEffect(() => {
    const observer: ActionObserver = {
      onActionsSaved: (savedCount: number) => {
        logInfo("BoardScreen", "💾 Actions batch saved to SQLite", {
          savedCount,
          matchId: currentMatch?.id,
        });
      },
      onError: (error: Error) => {
        logError("BoardScreen", "❌ Action queue error during batch save", {
          error: error.message,
          matchId: currentMatch?.id,
        });
        // TODO: Display an error toast to the user
      },
    };

    actionQueue.subscribe(observer);

    // Cleanup
    return () => {
      actionQueue.unsubscribe(observer);
      actionQueue.destroy(); // Clean up timers
    };
  }, [actionQueue]);

  useEffect(() => {
    const prepareOrientation = async () => {
      // Lock screen in landscape mode before calculating layout
      // await ScreenOrientation.lockAsync(
      //   ScreenOrientation.OrientationLock.LANDSCAPE
      // );
      const current = await ScreenOrientation.getOrientationAsync();
      setOrientation(current);
      setIsReady(true); // Now safe to render
    };

    prepareOrientation();

    const subscription = ScreenOrientation.addOrientationChangeListener(
      ({ orientationInfo }) => {
        setOrientation(orientationInfo.orientation);
      }
    );

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
      ScreenOrientation.unlockAsync();
    };
  }, []);

  const isPortrait =
    orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
    orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN;

  const { courtWidth, courtHeight, styles } = useMemo(() => {
    // Width without phone state bar and navigation bar, with bottom nav space
    const availableWidth = isPortrait
      ? window.width - insets.left - insets.right
      : window.width - insets.left - insets.right - BOTTOM_NAV_WIDTH; // Space for vertical bottom nav in landscape

    // Height without phone state bar and navigation bar, with bottom nav space
    const availableHeight = isPortrait
      ? window.height - insets.top - insets.bottom - BOTTOM_NAV_HEIGHT
      : window.height - insets.top - insets.bottom;

    const courtWidth = availableWidth;
    const courtHeight = availableHeight;

    // Generate styles based on layout
    const styles = getStyles({
      courtWidth,
      courtHeight,
      BOTTOM_NAV_HEIGHT,
      BOTTOM_NAV_WIDTH,
      isPortrait,
    });

    return {
      courtWidth,
      courtHeight,
      styles,
    };
  }, [orientation, window, insets]);

  // Modal and marker logic
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({
    x: 0,
    y: 0,
    pointerX: 0,
    showPointerOnTop: true,
    clickX: 0,
    clickY: 0,
  });

  // State pour stocker le temps au moment du clic sur le terrain
  const [clickTime, setClickTime] = useState({
    period: 1,
    timeInPeriod: 0,
  });

  // Calculate modal coordinates based on click
  const calculateModalPosition = (x: number, y: number) => {
    // Determine if modal will be above or below the click
    const showPointerOnTop = y < window.height / 2;

    // Center modal horizontally on click point
    let modalX = x - MODAL_WIDTH / 2;

    // Position modal vertically relative to click point:
    // The pointer extends POINTER_SIZE pixels outside the modal (top: -POINTER_SIZE or bottom: -POINTER_SIZE)
    // So we don't need to add/subtract POINTER_SIZE here - the pointer naturally reaches the click point
    let modalY = showPointerOnTop
      ? y + POINTER_SIZE + 10 // Pointer at top extends up to click point
      : y - MODAL_HEIGHT + 10; // Pointer at bottom extends down to click point

    // Keep modal within screen bounds
    modalX = Math.max(
      MODAL_PADDING,
      Math.min(modalX, window.width - MODAL_WIDTH - MODAL_PADDING)
    );
    modalY = Math.max(
      MODAL_PADDING,
      Math.min(modalY, window.height - MODAL_HEIGHT - MODAL_PADDING)
    );

    // Calculate pointer X position relative to modal (where the click happened)
    const pointerX = x - modalX;

    return {
      x: modalX,
      y: modalY,
      pointerX,
      showPointerOnTop,
      clickX: x,
      clickY: y,
    };
  };

  // Convert completed actions to SVG markers
  const getAllActionMarkers = useCallback(() => {
    return getFilteredActions().map((action, index) => ({
      id: `action-${action.timestamp.getTime()}-${index}`,
      svgX: action.semanticPosition.xNormalized * 615.75,
      svgY: action.semanticPosition.yNormalized * 1146.749971,
      color: getMarkerColor(action.type, action.specification),
    }));
  }, [completedActions, appliedFilters, showAllActions]);

  // Determine which markers to display
  const displayMarkers = showAllActions ? getAllActionMarkers() : clickMarkers;

  /**
   * Handle court press in pre-game mode
   * Used for debugging player positioning - logs coordinates
   */
  const handlePreGameCourtPress = (
    svgX: number,
    svgY: number,
    screenX: number,
    screenY: number
  ) => {
    // No action needed in pre-game mode
    // Coordinates logged for debugging player positioning during development
  };

  /**
   * Handle court press during active match
   * Opens action modal at the pressed location
   */
  const handleZonePress = (
    svgX: number,
    svgY: number,
    screenX: number,
    screenY: number
  ) => {
    logInfo("BoardScreen", "🏀 User pressed court to record action", {
      svgX: Math.round(svgX),
      svgY: Math.round(svgY),
      screenX: Math.round(screenX),
      screenY: Math.round(screenY),
      currentPeriod,
      timeElapsed,
    });

    // Store SVG coordinates for later use in handleActionComplete
    setTempSvgCoords({ svgX, svgY });

    // Capture exact time at moment of press
    setClickTime({
      period: currentPeriod,
      timeInPeriod: timeElapsed,
    });

    // Adjust screen coordinates to account for court container offset
    // courtContainer starts at top: 80
    const absoluteScreenX = screenX;
    const absoluteScreenY = screenY + 80 + MODAL_PADDING; // Add top offset of courtContainer

    const pos = calculateModalPosition(absoluteScreenX, absoluteScreenY);
    setModalPosition(pos);
    setActionModalVisible(true);
  };

  /**
   * Handle action completion from action modal
   * Saves action to SQLite queue and updates UI with marker
   */
  const handleActionComplete = (actionData: ActionData) => {
    if (!currentMatch) {
      logWarn("BoardScreen", "⚠️ No current match - action not saved");
      return;
    }

    if (!tempSvgCoords) {
      logWarn("BoardScreen", "⚠️ No SVG coordinates stored");
      return;
    }

    // Create unique ID for this marker
    const markerId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get marker color based on action type
    const markerColor = getMarkerColor(
      actionData.type,
      actionData.specification
    );

    // Save SVG coordinates before clearing
    const svgX = tempSvgCoords.svgX;
    const svgY = tempSvgCoords.svgY;

    // Add marker to clickMarkers with SVG coordinates and color
    setClickMarkers((prev) => [
      ...prev,
      {
        id: markerId,
        svgX,
        svgY,
        color: markerColor,
      },
    ]);

    // Remove temporary marker after 1 second
    setTimeout(() => {
      setClickMarkers((prev) => prev.filter((m) => m.id !== markerId));
    }, 1000);

    // Clear temporary coordinates
    setTempSvgCoords(null);

    // Use SVG coordinates directly (no need to convert from old system)
    const semanticPosition: SemanticPosition = {
      xNormalized: svgX / 615.75, // Normalize to 0-1 range
      yNormalized: svgY / 1146.749971, // Normalize to 0-1 range
      capturedInPortrait: isPortrait,
    };

    // Créer l'action avec les coordonnées sémantiques calculées
    const actionWithSemanticPosition: ActionData = {
      ...actionData,
      semanticPosition,
    };

    // 📊 NOUVELLE LOGIQUE - Ajout à la queue d'actions pour BDD
    const nextActionOrder = actionCounter + 1;
    setActionCounter(nextActionOrder);

    const actionForDB = {
      match_id: currentMatch.id,
      team: actionData.team,
      player_number: actionData.player || 0,
      action_type: actionData.type,
      specification: actionData.specification || "",
      points: actionData.points, // Include points for shots (1, 2, or 3)
      semantic_x: semanticPosition.xNormalized,
      semantic_y: semanticPosition.yNormalized,
      action_order: nextActionOrder,
      period_number: clickTime.period, // période au moment du clic
      time_in_period: clickTime.timeInPeriod, // temps au moment du clic sur le terrain
    };

    // Ajouter à la queue (traitement asynchrone)
    actionQueue.enqueue(actionForDB);

    // Save detailed action data for immediate UI updates
    setCompletedActions((prev) => [...prev, actionWithSemanticPosition]);

    logInfo("BoardScreen", "✅ Action completed and queued for SQLite save", {
      actionType: actionData.type,
      specification: actionData.specification,
      player: actionData.player,
      team: actionData.team,
      points: actionData.points,
      matchId: currentMatch.id,
      period: clickTime.period,
      timeInPeriod: clickTime.timeInPeriod,
      actionOrder: nextActionOrder,
      svgX: Math.round(svgX),
      svgY: Math.round(svgY),
    });

    setActionModalVisible(false);
  };

  /**
   * Handle action modal close/cancel
   * User closed the action modal without completing an action
   */
  const handleActionModalClose = () => {
    logInfo(
      "BoardScreen",
      "❌ User closed action modal without completing action",
      {
        currentPeriod,
        timeElapsed,
        hadCoordinates: !!tempSvgCoords,
      }
    );

    // Clear temporary coordinates
    setTempSvgCoords(null);
    setActionModalVisible(false);
  };

  const [matchFormat, setMatchFormat] = useState<"2_halves" | "4_quarters">(
    MATCH_FORMATS.FOUR_QUARTERS
  );
  const [periodDuration, setPeriodDuration] = useState<number>(600);

  // States for status bar display and timer management
  const [currentPeriod, setCurrentPeriod] = useState<number>(1);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [isMatchStarted, setIsMatchStarted] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // States for confirmation modals
  const [showNextPeriodModal, setShowNextPeriodModal] =
    useState<boolean>(false);
  const [showEndMatchModal, setShowEndMatchModal] = useState<boolean>(false);

  // States for scores
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);

  // Utility functions for period management
  const getTotalPeriods = () => {
    return matchFormat === MATCH_FORMATS.TWO_HALVES ? 2 : 4;
  };

  const isLastPeriod = () => {
    return currentPeriod >= getTotalPeriods();
  };

  const getTimeRemaining = () => {
    return Math.max(0, periodDuration - timeElapsed);
  };

  // Function to calculate scores from actions
  const calculateScores = useCallback(() => {
    let newScoreA = 0;
    let newScoreB = 0;

    completedActions.forEach((action) => {
      // A successful shot scores points
      if (action.type === ActionType.SHOT && action.specification === ShotSpecification.MADE) {
        // Use the points field from the action (1, 2, or 3 points)
        const points = action.points || 0;

        if (action.team === "A") {
          newScoreA += points;
        } else if (action.team === "B") {
          newScoreB += points;
        }
      }
    });

    setScoreA(newScoreA);
    setScoreB(newScoreB);
  }, [completedActions]);

  // Recalculate scores on each action change
  useEffect(() => {
    calculateScores();
  }, [calculateScores]);

  // Function to save current match state
  const saveMatchState = useCallback(async () => {
    if (currentMatch) {
      try {
        await matchManager.updateMatchState(
          currentMatch.id,
          currentPeriod,
          timeElapsed
        );
      } catch (error) {
        console.error("❌ Error saving match state:", error);
      }
    }
  }, [currentMatch, currentPeriod, timeElapsed, matchManager]);

  // Automatically save match state
  useEffect(() => {
    if (currentMatch && !preGameMode) {
      const timeoutId = setTimeout(() => {
        saveMatchState();
      }, 1000); // 1 second debounce

      return () => clearTimeout(timeoutId);
    }
  }, [currentPeriod, timeElapsed, saveMatchState, currentMatch, preGameMode]);

  const handleTeamModeConfirm = (selectedTeamMode: "A" | "B" | "BOTH") => {
    setTeamMode(selectedTeamMode);
    setCurrentTeam(selectedTeamMode === "B" ? "B" : "A");

    // ✨ If user chose Team B and we have club players, move them to Team B
    if (selectedTeamMode === "B" && selectedTeamPlayers.length > 0) {
      const { starters, substitutes } = convertClubPlayersToBoard(
        selectedTeamPlayers,
        "B"
      );

      // Move club players to Team B
      setPlayersTeamB(starters);
      setSubstitutesTeamB(substitutes);

      // Move coach to Team B
      if (selectedTeam) {
        setCoachTeamB({
          id: 22,
          name: selectedTeam.coachName || "Coach Équipe B",
          photoUrl: selectedTeam.coachPhotoUrl,
          isCoach: true,
        });
      }

      // Reset Team A to default values
      setPlayers([
        {
          id: 1,
          num: 1,
          name: "Joueur A1",
          isSubstitute: false,
          isFromClub: false,
        },
        {
          id: 2,
          num: 2,
          name: "Joueur A2",
          isSubstitute: false,
          isFromClub: false,
        },
        {
          id: 3,
          num: 3,
          name: "Joueur A3",
          isSubstitute: false,
          isFromClub: false,
        },
        {
          id: 4,
          num: 4,
          name: "Joueur A4",
          isSubstitute: false,
          isFromClub: false,
        },
        {
          id: 5,
          num: 5,
          name: "Joueur A5",
          isSubstitute: false,
          isFromClub: false,
        },
      ]);
      setSubstitutesTeamA([
        {
          id: 11,
          num: 6,
          name: "Remplaçant A1",
          isSubstitute: true,
          isFromClub: false,
        },
        {
          id: 12,
          num: 7,
          name: "Remplaçant A2",
          isSubstitute: true,
          isFromClub: false,
        },
        {
          id: 13,
          num: 8,
          name: "Remplaçant A3",
          isSubstitute: true,
          isFromClub: false,
        },
        {
          id: 14,
          num: 9,
          name: "Remplaçant A4",
          isSubstitute: true,
          isFromClub: false,
        },
        {
          id: 15,
          num: 10,
          name: "Remplaçant A5",
          isSubstitute: true,
          isFromClub: false,
        },
      ]);
      setCoachTeamA({
        id: 21,
        name: "Coach Équipe A",
        photoUrl: undefined,
        isCoach: true,
      });
    }

    setInitModalVisible(false);
    setMatchConfigModalVisible(true);
  };

  const handleMatchConfigConfirm = (
    format: "2_halves" | "4_quarters",
    duration: number
  ) => {
    setMatchFormat(format);
    setPeriodDuration(duration);
    setMatchConfigModalVisible(false);
  };

  const handleMatchConfigBack = () => {
    setMatchConfigModalVisible(false);
    setInitModalVisible(true);
  };

  /**
   * Handle match start
   * Creates match in SQLite database and saves all players
   */
  const handleStartMatch = async () => {
    try {
      logInfo("BoardScreen", "🏀 Starting new match", {
        teamA,
        teamB,
        teamMode,
        matchFormat,
        periodDuration,
        clubId,
        teamAId,
        teamBId,
      });

      // Protection contre les valeurs null
      if (!teamA || !teamB || !teamMode || !matchFormat || !periodDuration) {
        logWarn("BoardScreen", "⚠️ Missing required match data, cannot start", {
          hasTeamA: !!teamA,
          hasTeamB: !!teamB,
          hasTeamMode: !!teamMode,
          hasMatchFormat: !!matchFormat,
          hasPeriodDuration: !!periodDuration,
        });
        return;
      }

      const matchData = {
        team_a_name: teamAId || teamA, // Use UUID if club team, otherwise name
        team_b_name: teamBId || teamB, // Use UUID if club team, otherwise name
        team_mode: teamMode,
        match_format: matchFormat as "2_halves" | "4_quarters",
        period_duration: periodDuration,
        club_id: clubId,
        team_id: teamAId || teamBId || selectedTeam?.id || null, // Store the club team UUID
      };

      logInfo("BoardScreen", "💾 Creating match in SQLite database", matchData);
      const match = await matchManager.startMatch(matchData);
      setCurrentMatch(match);
      logInfo("BoardScreen", "✅ Match created successfully in SQLite", {
        matchId: match.id,
        status: match.status,
      });

      // Sauvegarder les joueurs dans la base de données
      const matchPlayerRepository = new MatchPlayerRepository();
      const allPlayers = getAllPlayers();

      const playersToSave = allPlayers.map((player) => ({
        match_id: match.id,
        player_id: player.playerId || null, // Include club player ID if available
        player_number: player.num,
        player_name: player.name,
        team: player.team,
        is_starter: !player.isSubstitute,
        photo_url: player.photoUrl || null, // Include photo URL
      }));

      if (playersToSave.length > 0) {
        logInfo("BoardScreen", "💾 Saving players to SQLite for match", {
          matchId: match.id,
          playersCount: playersToSave.length,
        });
        await matchPlayerRepository.createBatch(playersToSave);
        logInfo("BoardScreen", "✅ Players saved to SQLite successfully", {
          matchId: match.id,
          savedPlayersCount: playersToSave.length,
        });
      }

      setPreGameMode(false);

      // Réinitialiser les scores au début d'un nouveau match
      setScoreA(0);
      setScoreB(0);

      logInfo("BoardScreen", "✅ Match started successfully, game ready", {
        matchId: match.id,
        preGameMode: false,
        initialScoreA: 0,
        initialScoreB: 0,
      });
    } catch (error) {
      logError("BoardScreen", "❌ Error starting match", {
        error: error instanceof Error ? error.message : error,
        teamA,
        teamB,
      });
      // En cas d'erreur, on peut continuer sans la base de données
      setPreGameMode(false);
    }
  };

  /**
   * 🧪 DEV ONLY: Load 100 mock actions for load testing
   * Call this function manually from React DevTools or add a debug button
   *
   * Usage: After starting a match, call loadMockActions() to insert 100 test actions
   */
  const loadMockActions = async () => {
    if (!currentMatch) {
      logWarn("BoardScreen", "⚠️ Cannot load mock actions: No active match");
      return;
    }

    try {
      logInfo("BoardScreen", "🧪 Generating 100 mock actions for load testing", {
        matchId: currentMatch.id,
        currentPeriod,
        periodDuration
      });

      // Get team A players (your club team)
      const teamAPlayers = [...players, ...substitutesTeamA].map(p => ({
        jersey_number: p.num,
        name: p.name
      }));

      if (teamAPlayers.length === 0) {
        logWarn("BoardScreen", "⚠️ No Team A players found, cannot generate actions");
        return;
      }

      // Generate 100 mock actions
      const mockActions = generateMockActions(
        currentMatch.id,
        teamAPlayers,
        currentPeriod,
        periodDuration
      );

      // Get summary for logging
      const summary = getMockActionsSummary(mockActions);
      logInfo("BoardScreen", "📊 Mock actions generated", summary);

      // Insert all actions via ActionQueue in batches
      const actionRepository = new ActionRepository();
      const batchSize = 10;
      let insertedCount = 0;

      for (let i = 0; i < mockActions.length; i += batchSize) {
        const batch = mockActions.slice(i, i + batchSize);
        await actionRepository.createBatch(batch);
        insertedCount += batch.length;

        logInfo("BoardScreen", `💾 Inserted batch ${Math.floor(i / batchSize) + 1}`, {
          batchSize: batch.length,
          totalInserted: insertedCount,
          remaining: mockActions.length - insertedCount
        });
      }

      // Reload actions from database to display on court
      await loadExistingActions(currentMatch.id);

      logInfo("BoardScreen", "✅ All 100 mock actions loaded successfully", {
        matchId: currentMatch.id,
        totalActions: mockActions.length,
        totalPoints: summary.totalPoints,
        shotPercentage: `${Math.round((summary.shotsMade / summary.shots) * 100)}%`
      });

      alert(`✅ 100 actions mockées chargées!\n\nRésumé:\n- Tirs: ${summary.shots} (${summary.shotsMade} réussis)\n- Rebonds: ${summary.rebounds}\n- Fautes: ${summary.fouls}\n- Points totaux: ${summary.totalPoints}`);

    } catch (error) {
      logError("BoardScreen", "❌ Error loading mock actions", {
        error: error instanceof Error ? error.message : error
      });
      alert("❌ Erreur lors du chargement des actions mockées");
    }
  };

  // 🧪 Expose loadMockActions globally for debugging (DEV ONLY)
  // @ts-ignore
  global.loadMockActions = loadMockActions;

  // Fonction pour démarrer/arrêter le chrono
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 1;
        // Vérifier si la période est terminée
        if (newTime >= periodDuration) {
          // Arrêter le timer à la fin de la période
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setIsPaused(true);
          return periodDuration;
        }
        return newTime;
      });
    }, 1000);

    setIsPaused(false);
    setIsMatchStarted(true);
  }, [periodDuration]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPaused(true);
  }, []);

  // Nettoyer le timer à la destruction du composant
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Fonctions pour la barre de statut
  const handlePauseMatch = () => {
    stopTimer();
  };

  const handleResumeTimer = () => {
    // Si le match n'a pas encore commencé ou si on est en pause, démarrer le chrono
    if (!isMatchStarted || isPaused) {
      startTimer();
    }
  };

  /**
   * Handle next period request
   * Shows confirmation modal if time remaining, otherwise advances directly
   */
  const handleNextPeriodRequest = () => {
    const timeRemaining = getTimeRemaining();

    if (timeRemaining > 0) {
      // Time remaining, ask for confirmation
      logInfo("BoardScreen", "⏭️ Opening next period confirmation modal", {
        currentPeriod,
        nextPeriod: currentPeriod + 1,
        timeRemaining,
        matchFormat,
      });
      setShowNextPeriodModal(true);
    } else {
      // No time remaining, advance directly
      logInfo(
        "BoardScreen",
        "⏭️ Advancing to next period directly (no time remaining)",
        {
          currentPeriod,
          nextPeriod: currentPeriod + 1,
          matchFormat,
        }
      );
      goToNextPeriod();
    }
  };

  /**
   * Advance to next period
   * Stops timer, resets elapsed time, and saves new period state to SQLite
   */
  const goToNextPeriod = () => {
    const nextPeriod = currentPeriod + 1;
    const maxPeriods = getTotalPeriods();

    if (nextPeriod <= maxPeriods) {
      logInfo("BoardScreen", "🏀 Advancing to next period", {
        currentPeriod,
        nextPeriod,
        maxPeriods,
        matchFormat,
      });

      // Stop current timer
      stopTimer();

      // Advance to next period and reset timer
      setCurrentPeriod(nextPeriod);
      setTimeElapsed(0);
      setIsPaused(true);

      // Note: Scores are preserved between periods

      // Save new period state to SQLite immediately
      if (currentMatch) {
        setTimeout(() => {
          matchManager.updateMatchState(currentMatch.id, nextPeriod, 0);
        }, 100);
      }

      logInfo("BoardScreen", "✅ Period advanced successfully", {
        newPeriod: nextPeriod,
        timeElapsed: 0,
        isPaused: true,
        matchId: currentMatch?.id,
      });
    }
  };

  /**
   * Handle end match request
   * Shows confirmation modal if time remaining, otherwise ends directly
   */
  const handleEndMatchRequest = () => {
    const timeRemaining = getTimeRemaining();

    if (timeRemaining > 0) {
      // Time remaining, ask for confirmation
      logInfo("BoardScreen", "🏁 Opening end match confirmation modal", {
        currentPeriod,
        timeRemaining,
        matchFormat,
        totalActions: completedActions.length,
      });
      setShowEndMatchModal(true);
    } else {
      // No time remaining, end directly
      logInfo("BoardScreen", "🏁 Ending match directly (no time remaining)", {
        currentPeriod,
        matchFormat,
        totalActions: completedActions.length,
      });
      endMatch();
    }
  };

  /**
   * End the match
   * Stops timer, uploads coach photos, marks match as completed in SQLite,
   * and navigates to summary screen
   */
  const endMatch = async () => {
    try {
      logInfo("BoardScreen", "🏁 Ending match", {
        matchId: currentMatch?.id,
        finalScoreA: scoreA,
        finalScoreB: scoreB,
        currentPeriod,
        timeElapsed,
        actionsCount: completedActions.length,
      });

      // Arrêter le chrono
      stopTimer();

      // Upload coach photos if they are local URIs
      const { PhotoUploadService } = await import(
        "../services/PhotoUploadService"
      );
      const photoService = new PhotoUploadService(supabase);

      if (
        coachTeamA.photoUrl &&
        (coachTeamA.photoUrl.startsWith("file://") ||
          coachTeamA.photoUrl.startsWith("content://"))
      ) {
        const { url, error } = await photoService.uploadPlayerPhoto(
          coachTeamA.photoUrl,
          "coach-a"
        );
        if (!error && url) {
          setCoachTeamA((prev) => ({ ...prev, photoUrl: url }));
        }
      }

      if (
        coachTeamB.photoUrl &&
        (coachTeamB.photoUrl.startsWith("file://") ||
          coachTeamB.photoUrl.startsWith("content://"))
      ) {
        const { url, error } = await photoService.uploadPlayerPhoto(
          coachTeamB.photoUrl,
          "coach-b"
        );
        if (!error && url) {
          setCoachTeamB((prev) => ({ ...prev, photoUrl: url }));
        }
      }

      // Marquer le match comme terminé dans la base de données
      if (currentMatch) {
        logInfo("BoardScreen", "💾 Marking match as completed in SQLite", {
          matchId: currentMatch.id,
          scoreA,
          scoreB,
        });
        await matchManager.endMatch(currentMatch.id);
        logInfo("BoardScreen", "✅ Match marked as completed in SQLite", {
          matchId: currentMatch.id,
        });
      }

      // Navigate to MatchSummaryScreen
      setShowEndMatchModal(false);

      // Prepare all players with their team info
      const teamAPlayers =
        teamMode === "A" || teamMode === "BOTH"
          ? [
              ...players.map((p) => ({ ...p, team: "A" as const })),
              ...substitutesTeamA.map((s) => ({ ...s, team: "A" as const })),
            ]
          : [];

      const teamBPlayersEnd =
        teamMode === "B" || teamMode === "BOTH"
          ? [
              ...playersTeamB.map((p) => ({ ...p, team: "B" as const })),
              ...substitutesTeamB.map((s) => ({ ...s, team: "B" as const })),
            ]
          : [];

      const allPlayers = [...teamAPlayers, ...teamBPlayersEnd];

      // Ajout de la logique de détection de l'équipe du club
      let clubTeamOverride: "A" | "B" | null = null;
      if (teamMode === "A" || teamMode === "B") {
        clubTeamOverride = teamMode;
      } else if (teamMode === "BOTH" && selectedTeam) {
        if (teamB === selectedTeam.name) {
          clubTeamOverride = "B";
        } else if (teamA === selectedTeam.name) {
          clubTeamOverride = "A";
        } else {
          // Fallback si les noms ont été modifiés
          if (teamAId) clubTeamOverride = "A";
          else if (teamBId) clubTeamOverride = "B";
        }
      }
      logInfo("BoardScreen", "🧭 Navigating to Match Summary screen", {
        matchId: currentMatch?.id,
        teamA,
        teamB,
        scoreA,
        scoreB,
        actionsCount: completedActions.length,
        playersCount: allPlayers.length,
        clubTeamOverride,
      });

      navigation.navigate(ROUTES.MATCH_SUMMARY as any, {
        matchId: currentMatch?.id,
        teamA,
        teamB,
        scoreA,
        scoreB,
        actions: completedActions,
        matchFormat,
        periodDuration,
        teamMode,
        players: allPlayers,
        clubTeamOverride,
      });
    } catch (error) {
      logError("BoardScreen", "❌ Error ending match", {
        error: error instanceof Error ? error.message : error,
        matchId: currentMatch?.id,
      });
      // Même en cas d'erreur, arrêter le chrono
    }
  };

  /**
   * Confirm next period - user validated in confirmation modal
   * Advances to next period and updates timer
   */
  const confirmNextPeriod = () => {
    logInfo("BoardScreen", "✅ User confirmed next period transition", {
      currentPeriod,
      nextPeriod: currentPeriod + 1,
      matchFormat,
      timeRemaining: getTimeRemaining(),
    });
    setShowNextPeriodModal(false);
    goToNextPeriod();
  };

  /**
   * Cancel next period - user cancelled in confirmation modal
   */
  const cancelNextPeriod = () => {
    logInfo("BoardScreen", "❌ User cancelled next period transition", {
      currentPeriod,
      matchFormat,
    });
    setShowNextPeriodModal(false);
  };

  /**
   * Confirm end match - user validated in confirmation modal
   * Ends match and navigates to summary
   */
  const confirmEndMatch = () => {
    logInfo("BoardScreen", "✅ User confirmed match end", {
      currentPeriod,
      matchFormat,
      timeRemaining: getTimeRemaining(),
      totalActions: completedActions.length,
    });
    setShowEndMatchModal(false);
    endMatch();
  };

  /**
   * Cancel end match - user cancelled in confirmation modal
   */
  const cancelEndMatch = () => {
    logInfo("BoardScreen", "❌ User cancelled match end", {
      currentPeriod,
      matchFormat,
    });
    setShowEndMatchModal(false);
  };

  /**
   * Resume an existing match
   * Restores match state from SQLite and loads all actions
   */
  const handleResumeMatch = async () => {
    if (!foundMatch) return;

    logInfo("BoardScreen", "🔄 Resuming existing match from SQLite", {
      matchId: foundMatch.id,
      teamA: foundMatch.team_a_name,
      teamB: foundMatch.team_b_name,
      teamId: foundMatch.team_id,
      currentPeriod: foundMatch.current_period,
      timeElapsed: foundMatch.time_elapsed,
      finalScoreA: foundMatch.final_score_a,
      finalScoreB: foundMatch.final_score_b,
    });

    setCurrentMatch(foundMatch);

    // Load team names from Supabase if team_a_name/team_b_name look like UUIDs
    let teamADisplayName = foundMatch.team_a_name;
    let teamBDisplayName = foundMatch.team_b_name;

    // Check if team_a_name or team_b_name is a UUID (contains dashes in UUID format)
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    if (foundMatch.team_id && user) {
      try {
        const teamService = ServiceFactory.getTeamService(supabase);

        // Load team A if it's a UUID
        if (isUUID(foundMatch.team_a_name)) {
          logInfo("BoardScreen", "📡 Loading Team A name from Supabase (UUID detected)", {
            teamId: foundMatch.team_a_name
          });
          const teamA = await teamService.getTeamById(foundMatch.team_a_name);
          if (teamA) {
            teamADisplayName = teamA.name;
            logInfo("BoardScreen", "✅ Team A name loaded", { name: teamA.name });
          }
        }

        // Load team B if it's a UUID
        if (isUUID(foundMatch.team_b_name)) {
          logInfo("BoardScreen", "📡 Loading Team B name from Supabase (UUID detected)", {
            teamId: foundMatch.team_b_name
          });
          const teamB = await teamService.getTeamById(foundMatch.team_b_name);
          if (teamB) {
            teamBDisplayName = teamB.name;
            logInfo("BoardScreen", "✅ Team B name loaded", { name: teamB.name });
          }
        }
      } catch (error) {
        logError("BoardScreen", "❌ Error loading team names from Supabase", {
          error: error instanceof Error ? error.message : error
        });
        // Continue with UUID as fallback
      }
    }

    setTeamA(teamADisplayName);
    setTeamB(teamBDisplayName);
    setTeamMode(foundMatch.team_mode);
    setCurrentTeam(foundMatch.team_mode === "B" ? "B" : "A");

    // Restaurer l'état du chrono depuis la base de données
    setCurrentPeriod(foundMatch.current_period);
    setTimeElapsed(foundMatch.time_elapsed);
    setIsPaused(true); // Toujours en pause lors de la reprise pour que l'utilisateur décide
    setIsMatchStarted(foundMatch.time_elapsed > 0); // Si du temps a été écoulé, le match a été démarré

    // Restaurer les paramètres du match
    setMatchFormat(foundMatch.match_format);
    setPeriodDuration(foundMatch.period_duration);

    setPreGameMode(false);
    setResumeModalVisible(false);

    // Charger les actions existantes du match
    await loadExistingActions(foundMatch.id);

    logInfo("BoardScreen", "✅ Match state restored successfully", {
      matchId: foundMatch.id,
      period: foundMatch.current_period,
      timeElapsed: foundMatch.time_elapsed,
      format: foundMatch.match_format,
      duration: foundMatch.period_duration,
    });
  };

  /**
   * Load existing actions from SQLite for a resumed match
   * Converts database format to UI ActionData format
   */
  const loadExistingActions = async (matchId: number) => {
    try {
      logInfo("BoardScreen", "📊 Loading existing actions from SQLite", {
        matchId,
      });
      const actions = await actionRepository.getActionsForMatch(matchId);

      if (actions.length > 0) {
        // Convertir les actions BDD en format ActionData pour l'UI
        const actionDataList = actions.map((action) => ({
          type: action.action_type,
          specification: action.specification,
          player: action.player_number,
          team: action.team,
          points: action.points, // ⚠️ Important: include points for score calculation
          timestamp: new Date(action.timestamp),
          period_number: action.period_number,
          time_in_period: action.time_in_period,
          position: { x: 0, y: 0 }, // Position recalculée plus bas
          semanticPosition: {
            xNormalized: action.semantic_x,
            yNormalized: action.semantic_y,
            capturedInPortrait: true, // Par défaut, considérer comme capturé en portrait pour les anciennes données
          },
        }));

        setCompletedActions(actionDataList);

        // Mettre à jour le compteur d'actions
        const maxOrder = Math.max(...actions.map((a) => a.action_order), 0);
        setActionCounter(maxOrder);

        logInfo("BoardScreen", "✅ Existing actions loaded from SQLite", {
          matchId,
          actionsCount: actions.length,
          maxActionOrder: maxOrder,
        });
      } else {
        logInfo("BoardScreen", "ℹ️ No existing actions found for match", {
          matchId,
        });
      }
    } catch (error) {
      logError("BoardScreen", "❌ Error loading existing actions from SQLite", {
        matchId,
        error: error instanceof Error ? error.message : error,
      });
    }
  };

  /**
   * Discard an existing match
   * Deletes match and all associated data (actions, players) from SQLite
   */
  const handleDiscardMatch = async () => {
    if (!foundMatch) return;

    try {
      logInfo(
        "BoardScreen",
        "🗑️ Deleting match and all associated data from SQLite",
        {
          matchId: foundMatch.id,
          teamA: foundMatch.team_a_name,
          teamB: foundMatch.team_b_name,
        }
      );

      // Delete all actions for this match
      await actionRepository.deleteActionsForMatch(foundMatch.id);

      // Delete all players for this match
      await matchPlayerRepository.deletePlayersForMatch(foundMatch.id);

      // Delete the match itself
      await matchRepository.delete(foundMatch.id);

      logInfo(
        "BoardScreen",
        "✅ Match and all associated data deleted from SQLite",
        {
          matchId: foundMatch.id,
        }
      );

      setFoundMatch(null);
      setResumeModalVisible(false);

      // Reset team selection state and show team selection modal
      // This allows user to choose a team again
      setHasShownTeamSelection(false);
      setTeamSelectionModalVisible(true);
    } catch (error) {
      logError("BoardScreen", "❌ Error deleting match from SQLite", {
        matchId: foundMatch.id,
        error: error instanceof Error ? error.message : error,
      });
      // En cas d'erreur, on ferme quand même le modal et on montre la sélection d'équipe
      setFoundMatch(null);
      setResumeModalVisible(false);
      setHasShownTeamSelection(false);
      setTeamSelectionModalVisible(true);
    }
  };

  const handleGoBackToMenu = () => {
    setResumeModalVisible(false);
    setFoundMatch(null);
    navigation.goBack(); // Retour au MainMenuScreen
  };

  /**
   * Handle player edit button click
   * Opens the player edit modal for the specified player
   */
  const handlePlayerEdit = (playerId: number, team: "A" | "B" = "A") => {
    // Find player details for logging
    const teamPlayers = team === "A" ? players : playersTeamB;
    const teamSubstitutes = team === "A" ? substitutesTeamA : substitutesTeamB;
    const player = [...teamPlayers, ...teamSubstitutes].find(
      (p) => p.id === playerId
    );

    logInfo("BoardScreen", "✏️ User clicked edit player button", {
      playerId,
      playerName: player?.name,
      playerNumber: player?.num,
      team,
      preGameMode,
    });
    setEditingPlayer(playerId);
    setEditingTeam(team); // Remember the team being edited
    setPlayerEditModalVisible(true);
  };

  /**
   * Handle player swap (exchange positions)
   * Swaps data between two players
   */
  const handlePlayerSwap = (targetPlayerId: number) => {
    if (editingPlayer === null) return;

    const teamPlayers = editingTeam === "A" ? players : playersTeamB;
    const teamSubstitutes =
      editingTeam === "A" ? substitutesTeamA : substitutesTeamB;

    // Find the current player being edited
    const currentPlayer = [...teamPlayers, ...teamSubstitutes].find(
      (p) => p.id === editingPlayer
    );
    // Find the target player to swap with
    const targetPlayer = [...teamPlayers, ...teamSubstitutes].find(
      (p) => p.id === targetPlayerId
    );

    if (!currentPlayer || !targetPlayer) return;

    // Swap positions by swapping their data
    if (editingTeam === "A") {
      // Update starters
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id === currentPlayer.id)
            return {
              ...p,
              num: targetPlayer.num,
              name: targetPlayer.name,
              photoUrl: targetPlayer.photoUrl,
              isFromClub: targetPlayer.isFromClub,
            };
          if (p.id === targetPlayer.id)
            return {
              ...p,
              num: currentPlayer.num,
              name: currentPlayer.name,
              photoUrl: currentPlayer.photoUrl,
              isFromClub: currentPlayer.isFromClub,
            };
          return p;
        })
      );
      // Update substitutes
      setSubstitutesTeamA((prev) =>
        prev.map((p) => {
          if (p.id === currentPlayer.id)
            return {
              ...p,
              num: targetPlayer.num,
              name: targetPlayer.name,
              photoUrl: targetPlayer.photoUrl,
              isFromClub: targetPlayer.isFromClub,
            };
          if (p.id === targetPlayer.id)
            return {
              ...p,
              num: currentPlayer.num,
              name: currentPlayer.name,
              photoUrl: currentPlayer.photoUrl,
              isFromClub: currentPlayer.isFromClub,
            };
          return p;
        })
      );
    } else {
      // Update Team B starters
      setPlayersTeamB((prev) =>
        prev.map((p) => {
          if (p.id === currentPlayer.id)
            return {
              ...p,
              num: targetPlayer.num,
              name: targetPlayer.name,
              photoUrl: targetPlayer.photoUrl,
              isFromClub: targetPlayer.isFromClub,
            };
          if (p.id === targetPlayer.id)
            return {
              ...p,
              num: currentPlayer.num,
              name: currentPlayer.name,
              photoUrl: currentPlayer.photoUrl,
              isFromClub: currentPlayer.isFromClub,
            };
          return p;
        })
      );
      // Update Team B substitutes
      setSubstitutesTeamB((prev) =>
        prev.map((p) => {
          if (p.id === currentPlayer.id)
            return {
              ...p,
              num: targetPlayer.num,
              name: targetPlayer.name,
              photoUrl: targetPlayer.photoUrl,
              isFromClub: targetPlayer.isFromClub,
            };
          if (p.id === targetPlayer.id)
            return {
              ...p,
              num: currentPlayer.num,
              name: currentPlayer.name,
              photoUrl: currentPlayer.photoUrl,
              isFromClub: currentPlayer.isFromClub,
            };
          return p;
        })
      );
    }

    // Close the modal
    setPlayerEditModalVisible(false);
    setEditingPlayer(null);
  };

  /**
   * Handle player edit confirmation
   * Updates player number, name, and photo in the correct team and roster (starters/substitutes)
   */
  const handlePlayerEditConfirm = (
    newNumber: number,
    newName: string,
    photoUrl?: string
  ) => {
    if (editingPlayer !== null) {
      // Check number uniqueness
      if (!isNumberUnique(newNumber, editingPlayer, editingTeam)) {
        logWarn("BoardScreen", "⚠️ Player number already in use", {
          newNumber,
          editingPlayer,
          editingTeam,
        });
        alert(
          `Le numéro ${newNumber} est déjà utilisé par un autre joueur de l'équipe ${editingTeam}.`
        );
        return;
      }

      logInfo("BoardScreen", "✅ User confirmed player edit", {
        playerId: editingPlayer,
        team: editingTeam,
        newNumber,
        newName,
        hasPhoto: !!photoUrl,
      });

      // Update the correct team based on editingTeam
      if (editingTeam === "A") {
        // Check if starter or substitute
        const isPlayerInStarters = players.some((p) => p.id === editingPlayer);

        if (isPlayerInStarters) {
          setPlayers((prevPlayers) =>
            prevPlayers.map((player) =>
              player.id === editingPlayer
                ? { ...player, num: newNumber, name: newName, photoUrl }
                : player
            )
          );
        } else {
          setSubstitutesTeamA((prevSubstitutes) =>
            prevSubstitutes.map((substitute) =>
              substitute.id === editingPlayer
                ? { ...substitute, num: newNumber, name: newName, photoUrl }
                : substitute
            )
          );
        }
      } else {
        // Check if starter or substitute
        const isPlayerInStarters = playersTeamB.some(
          (p) => p.id === editingPlayer
        );

        if (isPlayerInStarters) {
          setPlayersTeamB((prevPlayers) =>
            prevPlayers.map((player) =>
              player.id === editingPlayer
                ? { ...player, num: newNumber, name: newName, photoUrl }
                : player
            )
          );
        } else {
          setSubstitutesTeamB((prevSubstitutes) =>
            prevSubstitutes.map((substitute) =>
              substitute.id === editingPlayer
                ? { ...substitute, num: newNumber, name: newName, photoUrl }
                : substitute
            )
          );
        }
      }
    }
    setPlayerEditModalVisible(false);
    setEditingPlayer(null);
    setEditingTeam("A"); // Reset to team A
  };

  /**
   * Handle player edit cancellation
   * Closes modal without saving changes
   */
  const handlePlayerEditCancel = () => {
    logInfo("BoardScreen", "❌ User cancelled player edit", {
      playerId: editingPlayer,
      team: editingTeam,
    });
    setPlayerEditModalVisible(false);
    setEditingPlayer(null);
    setEditingTeam("A"); // Reset to team A
  };

  // Fonction utilitaire pour vérifier l'unicité des numéros
  const isNumberUnique = (
    number: number,
    playerId: number,
    team: "A" | "B"
  ) => {
    const teamPlayers = team === "A" ? players : playersTeamB;
    const teamSubstitutes = team === "A" ? substitutesTeamA : substitutesTeamB;

    // Vérifier dans les titulaires (exclure le joueur en cours d'édition)
    const numberExistsInPlayers = teamPlayers.some(
      (player) => player.num === number && player.id !== playerId
    );

    // Vérifier dans les remplaçants (exclure le joueur en cours d'édition)
    const numberExistsInSubstitutes = teamSubstitutes.some(
      (substitute) => substitute.num === number && substitute.id !== playerId
    );

    return !numberExistsInPlayers && !numberExistsInSubstitutes;
  };

  // Fonction pour obtenir le prochain numéro disponible
  const getNextAvailableNumber = (team: "A" | "B") => {
    const teamPlayers = team === "A" ? players : playersTeamB;
    const teamSubstitutes = team === "A" ? substitutesTeamA : substitutesTeamB;

    const usedNumbers = [
      ...teamPlayers.map((p) => p.num),
      ...teamSubstitutes.map((s) => s.num),
    ];

    for (let i = 1; i <= 99; i++) {
      if (!usedNumbers.includes(i)) {
        return i;
      }
    }
    return 99; // Fallback
  };

  /**
   * Handle add substitute button click
   * Creates a new substitute player with auto-generated number and default name
   */
  const handleAddSubstitute = (team: "A" | "B") => {
    const substitutes = team === "A" ? substitutesTeamA : substitutesTeamB;
    const setSubstitutes =
      team === "A" ? setSubstitutesTeamA : setSubstitutesTeamB;

    if (substitutes.length >= 10) {
      logWarn("BoardScreen", "⚠️ Maximum substitutes reached", {
        team,
        currentCount: substitutes.length,
        maxAllowed: 10,
      });
      return; // Maximum 10 substitutes
    }

    const nextId =
      Math.max(
        ...players.map((p) => p.id),
        ...playersTeamB.map((p) => p.id),
        ...substitutesTeamA.map((s) => s.id),
        ...substitutesTeamB.map((s) => s.id)
      ) + 1;

    const nextNumber = getNextAvailableNumber(team);
    const teamLetter = team;

    // Detect if this team is a club team
    const isClubTeam =
      (team === "A" && !!teamAId) || (team === "B" && !!teamBId);

    const newSubstitute = {
      id: nextId,
      num: nextNumber,
      name: `Remplaçant ${teamLetter}${substitutes.length + 1}`,
      photoUrl: undefined,
      isSubstitute: true,
      isFromClub: isClubTeam,
      isAddedInPreGame: true, // Mark as added in pre-game
    };

    logInfo("BoardScreen", "➕ User added substitute player", {
      team,
      substituteId: nextId,
      substituteNumber: nextNumber,
      currentSubstitutesCount: substitutes.length,
      newSubstitutesCount: substitutes.length + 1,
      isClubTeam,
    });

    setSubstitutes([...substitutes, newSubstitute]);
  };

  /**
   * Handle remove substitute button click
   * Removes the last substitute from the team
   */
  const handleRemoveSubstitute = (team: "A" | "B") => {
    const substitutes = team === "A" ? substitutesTeamA : substitutesTeamB;
    const setSubstitutes =
      team === "A" ? setSubstitutesTeamA : setSubstitutesTeamB;

    if (substitutes.length === 0) return;

    logInfo("BoardScreen", "➖ User removed substitute player", {
      team,
      currentSubstitutesCount: substitutes.length,
      newSubstitutesCount: substitutes.length - 1,
      removedSubstitute: substitutes[substitutes.length - 1],
    });

    // Remove the last substitute
    setSubstitutes(substitutes.slice(0, -1));
  };

  /**
   * Handle substitute edit button click
   * Opens the player edit modal for a substitute
   */
  const handleSubstituteEdit = (substituteId: number, team: "A" | "B") => {
    // Find substitute details for logging
    const teamSubstitutes = team === "A" ? substitutesTeamA : substitutesTeamB;
    const substitute = teamSubstitutes.find((s) => s.id === substituteId);

    logInfo("BoardScreen", "✏️ User clicked edit substitute button", {
      substituteId,
      substituteName: substitute?.name,
      substituteNumber: substitute?.num,
      team,
      preGameMode,
    });
    setEditingPlayer(substituteId);
    setEditingTeam(team);
    setPlayerEditModalVisible(true);
  };

  // Coach editing state
  const [coachEditModalVisible, setCoachEditModalVisible] = useState(false);
  const [editingCoach, setEditingCoach] = useState<"A" | "B" | null>(null);

  /**
   * Handle coach edit button click
   * Opens the coach edit modal
   */
  const handleCoachEdit = (coachId: number, team: "A" | "B") => {
    logInfo("BoardScreen", "✏️ User clicked edit coach button", {
      coachId,
      team,
      preGameMode,
    });
    setEditingCoach(team);
    setCoachEditModalVisible(true);
  };

  /**
   * Handle coach edit confirmation
   * Updates coach name and photo
   */
  const handleCoachEditConfirm = (newName: string, photoUrl?: string) => {
    logInfo("BoardScreen", "✅ User confirmed coach edit", {
      team: editingCoach,
      newName,
      hasPhoto: !!photoUrl,
    });

    if (editingCoach === "A") {
      setCoachTeamA((prev) => ({ ...prev, name: newName, photoUrl }));
    } else if (editingCoach === "B") {
      setCoachTeamB((prev) => ({ ...prev, name: newName, photoUrl }));
    }
    setCoachEditModalVisible(false);
    setEditingCoach(null);
  };

  /**
   * Handle coach edit cancellation
   * Closes modal without saving changes
   */
  const handleCoachEditCancel = () => {
    logInfo("BoardScreen", "❌ User cancelled coach edit", {
      team: editingCoach,
    });
    setCoachEditModalVisible(false);
    setEditingCoach(null);
  };

  /**
   * Handle team swap button click
   * Swaps the visual sides of teams on the court (changes currentTeam)
   */
  const handleSwapTeams = () => {
    const newCurrentTeam = currentTeam === "A" ? "B" : "A";
    logInfo("BoardScreen", "🔄 User swapped team sides on court", {
      previousCurrentTeam: currentTeam,
      newCurrentTeam,
    });
    // Simply change the currentTeam to reverse the display
    setCurrentTeam(newCurrentTeam);
  };

  // Fonction pour obtenir tous les joueurs d'une équipe (titulaires + remplaçants)
  const getAllPlayersForTeam = (team: "A" | "B") => {
    const teamPlayers = team === "A" ? players : playersTeamB;
    const teamSubstitutes = team === "A" ? substitutesTeamA : substitutesTeamB;

    return [...teamPlayers, ...teamSubstitutes].sort((a, b) => {
      // Trier par type (titulaires d'abord) puis par numéro
      if (a.isSubstitute === b.isSubstitute) {
        return a.num - b.num;
      }
      return a.isSubstitute ? 1 : -1;
    });
  };

  // Fonction pour obtenir tous les joueurs de toutes les équipes avec leur équipe
  const getAllPlayers = () => {
    const teamAPlayers =
      teamMode === "A" || teamMode === "BOTH"
        ? [
            ...players.map((p) => ({ ...p, team: "A" as const })),
            ...substitutesTeamA.map((p) => ({ ...p, team: "A" as const })),
          ]
        : [];

    const teamBPlayers =
      teamMode === "B" || teamMode === "BOTH"
        ? [
            ...playersTeamB.map((p) => ({ ...p, team: "B" as const })),
            ...substitutesTeamB.map((p) => ({ ...p, team: "B" as const })),
          ]
        : [];

    return [...teamAPlayers, ...teamBPlayers].sort((a, b) => {
      // Trier par équipe puis par type (titulaires d'abord) puis par numéro
      if (a.team !== b.team) {
        return a.team === "A" ? -1 : 1; // Team A en premier
      }

      if (a.isSubstitute === b.isSubstitute) {
        return a.num - b.num;
      }
      return a.isSubstitute ? 1 : -1;
    });
  };

  // 🏀 Fonction pour calculer les positions des joueurs (compatible équipe A et B)
  const getPlayerPosition = (playerId: number, team: "A" | "B" = "A") => {
    // 🔄 Détermine si cette équipe doit être du côté "proche" selon currentTeam
    const isTeamOnNearSide = currentTeam === team;

    const keyHeight = 150;
    const keyWidth = 200;
    const positions = [
      // Meneur (ID 1)
      {
        left: 350,
        top: isTeamOnNearSide
          ? isPortrait
            ? 393
            : courtHeight / 2 - keyHeight / 2 - 50
          : isPortrait
          ? 700
          : courtHeight / 2 + keyHeight / 2 + 10,
      },
      // Ailier gauche (ID 2)
      {
        left: isPortrait ? 160 : courtWidth / 2 - keyWidth / 2 - 40,
        top: isTeamOnNearSide
          ? isPortrait
            ? 289
            : courtHeight / 2 - keyHeight / 2
          : isPortrait
          ? 785
          : courtHeight / 2 + keyHeight / 2,
      },
      // Ailier droit (ID 3)
      {
        left: isPortrait ? 552 : courtWidth / 2 + keyWidth / 2,
        top: isTeamOnNearSide
          ? isPortrait
            ? 283
            : courtHeight / 2 - keyHeight / 2
          : isPortrait
          ? 785
          : courtHeight / 2 + keyHeight / 2,
      },
      // Intérieur gauche (ID 4)
      {
        left: isPortrait ? 239 : courtWidth / 2 - keyWidth / 4 - 30,
        top: isTeamOnNearSide
          ? isPortrait
            ? 147
            : courtHeight / 2 - keyHeight / 4
          : isPortrait
          ? 952
          : courtHeight / 2 + keyHeight / 4,
      },
      // Intérieur droit (ID 5)
      {
        left: isPortrait ? 473 : courtWidth / 2 + keyWidth / 4 + 10,
        top: isTeamOnNearSide
          ? isPortrait
            ? 147
            : courtHeight / 2 - keyHeight / 4
          : isPortrait
          ? 952
          : courtHeight / 2 + keyHeight / 4,
      },
    ];

    return positions[playerId - 1] || positions[0];
  };

  // Fonction pour recalculer les positions des markers lors des changements d'orientation
  const recalculateMarkerPositions = useCallback(() => {
    const courtDimensions = { width: courtWidth, height: courtHeight };

    setMarkers((prevMarkers) =>
      prevMarkers.map((marker) => {
        const absolutePosition = convertSemanticToDisplay(
          marker.semanticPosition,
          isPortrait,
          courtDimensions
        );
        return {
          ...marker,
          x: absolutePosition.x + ICON_OFFSET_X, // Utilise la constante ICON_OFFSET_X
          y: absolutePosition.y + ICON_OFFSET_Y, // Utilise la constante ICON_OFFSET_Y
        };
      })
    );
  }, [courtWidth, courtHeight, isPortrait]);

  // Recalculer les positions des markers lors des changements de dimensions
  useEffect(() => {
    if (isReady && markers.length > 0) {
      console.log(
        "🔄 Recalculating marker positions due to dimension change:",
        JSON.stringify(
          {
            courtWidth,
            courtHeight,
            isPortrait,
            markersCount: markers.length,
            markersSemanticPositions: markers.map((m) => ({
              id: m.id.slice(-4),
              semantic: {
                xNormalized: parseFloat(
                  m.semanticPosition.xNormalized.toFixed(4)
                ),
                yNormalized: parseFloat(
                  m.semanticPosition.yNormalized.toFixed(4)
                ),
              },
              currentDisplay: {
                x: parseFloat((m.x - ICON_OFFSET_X).toFixed(1)),
                y: parseFloat((m.y - ICON_OFFSET_Y).toFixed(1)),
              }, // Offsets définis par les constantes
            })),
          },
          null,
          2
        )
      );
      recalculateMarkerPositions();
    }
  }, [
    courtWidth,
    courtHeight,
    isReady,
    recalculateMarkerPositions,
    markers.length,
  ]);

  // Handle back button press during match
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // If match is started and no modal is visible, prevent going back
        if (!preGameMode && !initModalVisible && !matchConfigModalVisible) {
          return true; // Prevent default behavior (going back)
        }
        return false; // Allow default behavior
      }
    );

    return () => backHandler.remove();
  }, [preGameMode, initModalVisible, matchConfigModalVisible]);

  return (
    <View
      style={[
        { flex: 1, backgroundColor: club?.courtBackgroundColor || "#1a472a" },
      ]}
    >
      {/* Match Status Bar: Timer, score, period controls - shown during active match */}
      {!initModalVisible && !matchConfigModalVisible && !preGameMode && (
        <MatchStatusBar
          teamA={teamA}
          teamB={teamB}
          currentPeriod={currentPeriod}
          timeElapsed={timeElapsed}
          matchFormat={matchFormat as "2_halves" | "4_quarters"}
          periodDuration={periodDuration}
          isPaused={isPaused}
          isPortrait={isPortrait}
          onPause={handlePauseMatch}
          onResume={handleResumeTimer}
          onNextPeriod={handleNextPeriodRequest}
          onEndMatch={handleEndMatchRequest}
          scoreA={scoreA}
          scoreB={scoreB}
          teamMode={teamMode}
        />
      )}

      {/* 🧪 DEV ONLY: Debug button to load 100 mock actions */}
      {DEBUG && !preGameMode && currentMatch && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 80,
            right: 10,
            backgroundColor: '#FF9800',
            padding: 10,
            borderRadius: 8,
            zIndex: 1000,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
          }}
          onPress={loadMockActions}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>🧪</Text>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
            Load 100 Actions
          </Text>
        </TouchableOpacity>
      )}

      {/* Pre-game Modal: Team Selection - allows user to select a club team or skip */}
      <TeamSelectionModal
        visible={teamSelectionModalVisible}
        clubId={clubId}
        onTeamSelected={(team, players, wasAutoSelected) => {
          setSelectedTeam(team);
          setSelectedTeamPlayers(players || []);
          // Only mark as shown if user manually selected (not auto-selected)
          if (!wasAutoSelected) {
            setHasShownTeamSelection(true);
          }

          // ✨ Pre-fill players from club team
          if (players && players.length > 0) {
            const { starters, substitutes } =
              convertClubPlayersToBoard(players);

            // Set Team A players (default team for club)
            setPlayers(starters);
            setSubstitutesTeamA(substitutes);
          }

          setTeamSelectionModalVisible(false);
          setInitModalVisible(true);
          if (team) {
            // Pre-fill team name and coach
            setTeamA(team.name);
            setTeamAId(team.id); // Store UUID
            setCoachTeamA({
              id: 21,
              name: team.coachName || "Coach Équipe A",
              photoUrl: team.coachPhotoUrl,
              isCoach: true,
            });
          }
        }}
        onSkip={() => {
          setHasShownTeamSelection(true);
          setTeamSelectionModalVisible(false);
          setInitModalVisible(true);
        }}
        onBack={() => {
          setTeamSelectionModalVisible(false);
          navigation.goBack();
        }}
      />

      {/* Pre-game Modal: Team Initialization - configure team names and select team mode (A/B/BOTH) */}
      <InitTeamModal
        visible={initModalVisible}
        teamA={teamA}
        setTeamA={setTeamA}
        teamB={teamB}
        setTeamB={setTeamB}
        teamAId={teamAId}
        setTeamAId={setTeamAId}
        teamBId={teamBId}
        setTeamBId={setTeamBId}
        onConfirm={handleTeamModeConfirm}
        isConfirmDisabled={isConfirmDisabled}
        getFormattedDate={getFormattedDate}
        onRequestClose={() => navigation.goBack()}
        canGoBack={hasShownTeamSelection}
        hasClubTeam={selectedTeam !== null}
        onBack={() => {
          logInfo('BoardScreen', '🔙 User going back from InitTeamModal to TeamSelectionModal');

          // Reset all team-related state to allow fresh selection
          setSelectedTeam(null);
          setSelectedTeamPlayers([]);
          setTeamA("Team A");
          setTeamB("Team B");
          setTeamAId(null);
          setTeamBId(null);

          // Reset players to empty
          setPlayers([]);
          setSubstitutesTeamA([]);
          setPlayersTeamB([]);
          setSubstitutesTeamB([]);

          // Reset coach
          setCoachTeamA({ id: 21, name: "Coach Équipe A", photoUrl: undefined, isCoach: true });
          setCoachTeamB({ id: 22, name: "Coach Équipe B", photoUrl: undefined, isCoach: true });

          setInitModalVisible(false);
          if (hasShownTeamSelection) {
            setTeamSelectionModalVisible(true);
          } else {
            navigation.goBack();
          }
        }}
        onGoToMenu={() => navigation.goBack()}
      />

      {/* Pre-game Modal: Match Configuration - set match format (halves/quarters) and period duration */}
      <MatchConfigModal
        visible={matchConfigModalVisible}
        onConfirm={handleMatchConfigConfirm}
        onRequestClose={handleMatchConfigBack}
      />

      {/* Player Edit Modal: Edit player name and number during match */}
      <PlayerEditModal
        visible={playerEditModalVisible}
        playerNumber={
          editingPlayer
            ? (() => {
                // Search in starters
                const teamPlayers =
                  editingTeam === "A" ? players : playersTeamB;
                const playerInStarters = teamPlayers.find(
                  (p) => p.id === editingPlayer
                );
                if (playerInStarters) return playerInStarters.num;

                // Search in substitutes
                const teamSubstitutes =
                  editingTeam === "A" ? substitutesTeamA : substitutesTeamB;
                const playerInSubstitutes = teamSubstitutes.find(
                  (p) => p.id === editingPlayer
                );
                return playerInSubstitutes?.num || 1;
              })()
            : 1
        }
        playerName={
          editingPlayer
            ? (() => {
                // Search in starters
                const teamPlayers =
                  editingTeam === "A" ? players : playersTeamB;
                const playerInStarters = teamPlayers.find(
                  (p) => p.id === editingPlayer
                );
                if (playerInStarters) return playerInStarters.name;

                // Search in substitutes
                const teamSubstitutes =
                  editingTeam === "A" ? substitutesTeamA : substitutesTeamB;
                const playerInSubstitutes = teamSubstitutes.find(
                  (p) => p.id === editingPlayer
                );
                return playerInSubstitutes?.name || "";
              })()
            : ""
        }
        isFromClub={
          editingPlayer
            ? (() => {
                const teamPlayers =
                  editingTeam === "A" ? players : playersTeamB;
                const teamSubstitutes =
                  editingTeam === "A" ? substitutesTeamA : substitutesTeamB;
                const player = [...teamPlayers, ...teamSubstitutes].find(
                  (p) => p.id === editingPlayer
                );
                // Autoriser la photo uniquement pour les joueurs du club ajoutés en pre-game
                return (
                  (player?.isFromClub && player?.isAddedInPreGame) || false
                );
              })()
            : false
        }
        playerPhotoUrl={
          editingPlayer
            ? (() => {
                const teamPlayers =
                  editingTeam === "A" ? players : playersTeamB;
                const teamSubstitutes =
                  editingTeam === "A" ? substitutesTeamA : substitutesTeamB;
                const player = [...teamPlayers, ...teamSubstitutes].find(
                  (p) => p.id === editingPlayer
                );
                return player?.photoUrl;
              })()
            : undefined
        }
        availablePlayers={(() => {
          const teamPlayers = editingTeam === "A" ? players : playersTeamB;
          const teamSubstitutes =
            editingTeam === "A" ? substitutesTeamA : substitutesTeamB;
          // Exclude the currently edited player from the list
          return [...teamPlayers, ...teamSubstitutes].filter(
            (p) => p.id !== editingPlayer
          );
        })()}
        onSwap={handlePlayerSwap}
        onConfirm={handlePlayerEditConfirm}
        onCancel={handlePlayerEditCancel}
      />

      {/* Modal d'édition du coach */}
      <CoachEditModal
        visible={coachEditModalVisible}
        coachName={
          editingCoach === "A"
            ? coachTeamA.name
            : editingCoach === "B"
            ? coachTeamB.name
            : ""
        }
        coachPhotoUrl={
          editingCoach === "A"
            ? coachTeamA.photoUrl
            : editingCoach === "B"
            ? coachTeamB.photoUrl
            : undefined
        }
        onConfirm={handleCoachEditConfirm}
        onCancel={handleCoachEditCancel}
      />

      {/* Modal de reprise de match */}
      <ResumeMatchModal
        visible={resumeModalVisible}
        match={foundMatch}
        onResumeMatch={handleResumeMatch}
        onDiscardMatch={handleDiscardMatch}
        onGoBack={handleGoBackToMenu}
      />

      {/* Modal de confirmation pour passer à la période suivante */}
      <MatchConfirmationModal
        visible={showNextPeriodModal}
        title="Passer à la période suivante"
        message={`Voulez-vous vraiment passer à la ${
          MATCH_FORMAT_LABELS[matchFormat].singular
        } suivant${matchFormat === MATCH_FORMATS.TWO_HALVES ? "e" : ""} ?`}
        timeRemaining={getTimeRemaining()}
        onConfirm={confirmNextPeriod}
        onCancel={cancelNextPeriod}
        confirmButtonText="Passer"
        cancelButtonText="Annuler"
      />

      {/* Modal de confirmation pour terminer le match */}
      <MatchConfirmationModal
        visible={showEndMatchModal}
        title="Terminer le match"
        message="Voulez-vous vraiment terminer le match ?"
        timeRemaining={getTimeRemaining()}
        onConfirm={confirmEndMatch}
        onCancel={cancelEndMatch}
        confirmButtonText="Terminer"
        cancelButtonText="Annuler"
      />

      {/* 🏀 Bouton double flèche au centre du terrain pour changer de côté */}
      {!initModalVisible && !matchConfigModalVisible && preGameMode && (
        <TouchableOpacity
          style={{
            position: "absolute",
            top: isPortrait ? courtHeight / 2 : 15,
            left: isPortrait ? 30 : courtWidth / 2 - 25,
            backgroundColor: "rgba(255,255,255,0.9)",
            borderRadius: 25,
            width: 50,
            height: 50,
            borderWidth: 2,
            borderColor: "#ddd",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 300,
          }}
          onPress={handleSwapTeams}
        >
          <Text
            style={{
              fontSize: 24,
              color: "#666",
              fontWeight: "bold",
            }}
          >
            <MaterialCommunityIcons
              name={isPortrait ? "swap-vertical" : "swap-horizontal"}
              size={28}
              color="#666"
            />
          </Text>
        </TouchableOpacity>
      )}

      {/* Bottom Navigation Bar: Action management toolbar
          - Actions: Toggle visibility of action markers on court
          - Filtres: Open filter sheet to filter actions by team/player/type
          - Reset: Reset all filters to default
          - Histoire: View action history list
          - Annuler: Undo last action
          Position: Bottom (portrait) or Right (landscape) */}
      {!initModalVisible && !preGameMode && (
        <View style={styles.bottomNavBar}>
          {/* Actions Button: Toggle showing action markers on court */}
          <TouchableOpacity
            style={styles.navButton}
            onPress={toggleShowAllActions}
          >
            <View style={styles.navButtonContent}>
              <Text style={styles.navButtonIcon}>
                {showAllActions ? "👁️" : "🚫"}
              </Text>
              {showAllActions && (
                <View style={styles.navBadge}>
                  <View style={styles.navBadgeDot} />
                </View>
              )}
              <Text style={styles.navButtonLabel}>Actions</Text>
            </View>
          </TouchableOpacity>

          {/* Filter button: Opens filter sheet to filter visible actions */}
          <TouchableOpacity
            style={[
              styles.navButton,
              !showAllActions && styles.navButtonDisabled,
            ]}
            onPress={() => {
              logInfo("BoardScreen", "🔍 User clicked filters button", {
                showAllActions,
                currentFilters: appliedFilters,
                totalActions: completedActions.length,
              });
              setShowFilterSheet(true);
            }}
            disabled={!showAllActions}
          >
            <View style={styles.navButtonContent}>
              <Text style={styles.navButtonIcon}>🔍</Text>
              {(appliedFilters.teams.length < 2 ||
                appliedFilters.players.length > 0 ||
                appliedFilters.actionTypes.length > 0) && (
                <View style={styles.navBadge}>
                  <View style={styles.navBadgeDot} />
                </View>
              )}
              <Text style={styles.navButtonLabel}>Filtres</Text>
            </View>
          </TouchableOpacity>

          {/* Reset filters button */}
          <TouchableOpacity
            style={[
              styles.navButton,
              !showAllActions && styles.navButtonDisabled,
            ]}
            onPress={handleResetFilters}
            disabled={!showAllActions}
          >
            <View style={styles.navButtonContent}>
              <Text style={styles.navButtonIcon}>🔄</Text>
              <Text style={styles.navButtonLabel}>Reset</Text>
            </View>
          </TouchableOpacity>

          {/* History button: Opens action history sheet with list of all actions */}
          <TouchableOpacity
            style={[
              styles.navButton,
              completedActions.length === 0 && styles.navButtonDisabled,
            ]}
            onPress={() => {
              logInfo("BoardScreen", "📋 User clicked history button", {
                totalActions: completedActions.length,
                hasActions: completedActions.length > 0,
              });
              setShowHistorySheet(true);
            }}
            disabled={completedActions.length === 0}
          >
            <View style={styles.navButtonContent}>
              <Text style={styles.navButtonIcon}>📋</Text>
              {completedActions.length > 0 && (
                <View style={styles.navBadgeCounter}>
                  <Text style={styles.navBadgeCounterText}>
                    {completedActions.length > 99
                      ? "99+"
                      : completedActions.length}
                  </Text>
                </View>
              )}
              <Text style={styles.navButtonLabel}>Histoire</Text>
            </View>
          </TouchableOpacity>

          {/* Undo button: Undo last action with confirmation modal */}
          <TouchableOpacity
            style={[
              styles.navButton,
              completedActions.length === 0 && styles.navButtonDisabled,
            ]}
            onPress={handleUndoLastAction}
            disabled={completedActions.length === 0}
          >
            <View style={styles.navButtonContent}>
              <Text style={styles.navButtonIcon}>⏪</Text>
              <Text style={styles.navButtonLabel}>Annuler</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Undo Confirmation Modal */}
      <Modal
        transparent
        visible={showUndoConfirmation}
        animationType="fade"
        onRequestClose={cancelUndoAction}
      >
        <View style={styles.undoModalOverlay}>
          <View style={styles.undoModalContainer}>
            <Text style={styles.undoModalTitle}>Confirmer l'annulation</Text>
            <Text style={styles.undoModalMessage}>
              Êtes-vous sûr de vouloir annuler la dernière action ?
            </Text>

            {completedActions.length > 0 && (
              <View style={styles.undoActionDetails}>
                <Text style={styles.undoActionTitle}>Action à annuler :</Text>
                <View
                  style={[
                    styles.undoActionInfo,
                    {
                      borderLeftColor: getTeamColor(
                        completedActions[completedActions.length - 1].team
                      ),
                      borderLeftWidth: 6,
                      paddingLeft: 16,
                      backgroundColor: "rgba(255,255,255,0.9)",
                      borderTopRightRadius: 8,
                      borderBottomRightRadius: 8,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.undoActionIconContainer,
                      {
                        backgroundColor: `${getTeamColor(
                          completedActions[completedActions.length - 1].team
                        )}20`,
                      },
                    ]}
                  >
                    <Text style={styles.undoActionIcon}>
                      {getActionIcon(
                        completedActions[completedActions.length - 1].type,
                        completedActions[completedActions.length - 1]
                          .specification
                      )}
                    </Text>
                  </View>
                  <View style={styles.undoActionText}>
                    <Text style={styles.undoActionType}>
                      {getTeamName(
                        completedActions[completedActions.length - 1].team
                      )}{" "}
                      -{" "}
                      {completedActions[completedActions.length - 1].type
                        .charAt(0)
                        .toUpperCase() +
                        completedActions[
                          completedActions.length - 1
                        ].type.slice(1)}{" "}
                      -{" "}
                      {
                        completedActions[completedActions.length - 1]
                          .specification
                      }
                    </Text>
                    <Text style={styles.undoActionPlayer}>
                      Joueur #
                      {completedActions[completedActions.length - 1].player}
                    </Text>
                    <Text style={styles.undoActionTime}>
                      {new Date(
                        completedActions[completedActions.length - 1].timestamp
                      ).toLocaleTimeString("fr-FR")}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.undoModalButtons}>
              <TouchableOpacity
                style={[styles.undoModalButton, styles.undoModalButtonCancel]}
                onPress={cancelUndoAction}
              >
                <Text style={styles.undoModalButtonTextCancel}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.undoModalButton, styles.undoModalButtonConfirm]}
                onPress={confirmUndoAction}
              >
                <Text style={styles.undoModalButtonTextConfirm}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        players={getAllPlayers()}
        teamA={teamA}
        teamB={teamB}
        completedActions={completedActions}
        onApplyFilters={handleApplyFilters}
        appliedFilters={appliedFilters}
        isPortrait={isPortrait}
      />

      {/* History Bottom Sheet */}
      <HistoryBottomSheet
        visible={showHistorySheet}
        onClose={() => setShowHistorySheet(false)}
        players={getAllPlayers()}
        completedActions={completedActions}
        onDeleteAction={handleDeleteAction}
        teamA={teamA}
        teamB={teamB}
        isPortrait={isPortrait}
      />

      {/* Basketball Court SVG */}
      <View
        style={[
          styles.courtContainer,
          { backgroundColor: club?.courtBackgroundColor || "#1a472a" },
        ]}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setContainerLayout({ width, height });
        }}
      >
        <BasketballCourtSVG
          width={containerLayout.width || courtWidth}
          height={containerLayout.height || courtHeight}
          onCourtPress={preGameMode ? handlePreGameCourtPress : handleZonePress}
          backgroundColor={club?.courtBackgroundColor || "#1a472a"}
          lineColor={club?.courtLineColor || "#FFFFFF"}
          logoUri={user && club?.logoUrl ? club.logoUrl : null}
          markers={displayMarkers}
        />
      </View>

      {/* Pre-game: Start Match Button - saves match and players to SQLite and begins the game */}
      {!teamSelectionModalVisible &&
        !initModalVisible &&
        !matchConfigModalVisible &&
        preGameMode && (
          <TouchableOpacity
            style={{
              position: "absolute",
              bottom: isPortrait ? 15 : 40, // Leave space for toolbar in portrait
              right: "47%", // Adjust for toolbar in landscape
              transform: [{ translateX: 75 }],
              backgroundColor: "#FF5722",
              borderRadius: 25,
              paddingHorizontal: 20,
              paddingVertical: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
              zIndex: 300,
            }}
            onPress={handleStartMatch}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              🏀 Démarrer le match
            </Text>
          </TouchableOpacity>
        )}

      {/* Action Modal: Record basketball actions (shots, fouls, etc.) with player selection */}
      <ActionSystemModal
        visible={actionModalVisible}
        onClose={handleActionModalClose}
        onActionComplete={handleActionComplete}
        position={{
          x: modalPosition.x,
          y: modalPosition.y,
          pointerX: modalPosition.pointerX,
          showPointerOnTop: modalPosition.showPointerOnTop,
        }}
        clickPosition={{
          x: modalPosition.clickX,
          y: modalPosition.clickY,
        }}
        players={getAllPlayers()}
        teamMode={teamMode}
        teamA={teamA}
        teamB={teamB}
        currentTeam={currentTeam}
        currentPeriod={currentPeriod}
        timeElapsed={timeElapsed}
      />

      {/* Pre-game: Player jerseys for Team A - clickable to edit player details */}
      {!teamSelectionModalVisible &&
        !initModalVisible &&
        !matchConfigModalVisible &&
        preGameMode &&
        (teamMode === "A" || teamMode === "BOTH") &&
        players.map((player) => (
          <View key={player.id}>
            <TouchableOpacity
              onPress={() => handlePlayerEdit(player.id, "A")}
              style={{
                position: "absolute",
                left: getPlayerPosition(player.id, "A").left,
                top: getPlayerPosition(player.id, "A").top,
                width: 50,
                height: 50,
                justifyContent: "center",
                alignItems: "center",
                zIndex: 200,
              }}
            >
              <JerseyIcon
                width={50}
                primaryColor={getJerseyColors("A").primary}
                secondaryColor={getJerseyColors("A").secondary}
                number={player.num}
              />
            </TouchableOpacity>
            <Text
              style={{
                position: "absolute",
                left: getPlayerPosition(player.id, "A").left - 10,
                top: getPlayerPosition(player.id, "A").top + 45,
                color: "#fff",
                fontSize: 12,
                fontWeight: "bold",
                textAlign: "center",
                width: 60,
                textShadowColor: "rgba(0,0,0,0.8)",
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
                zIndex: 200,
              }}
            >
              {player.name}
            </Text>
          </View>
        ))}

      {/* Pre-game: Player jerseys for Team B - clickable to edit player details */}
      {!teamSelectionModalVisible &&
        !initModalVisible &&
        !matchConfigModalVisible &&
        preGameMode &&
        (teamMode === "B" || teamMode === "BOTH") &&
        playersTeamB.map((player) => (
          <View key={player.id}>
            <TouchableOpacity
              onPress={() => handlePlayerEdit(player.id, "B")}
              style={{
                position: "absolute",
                left: getPlayerPosition(player.id - 5, "B").left, // 🏀 IDs 6-10 → positions 1-5
                top: getPlayerPosition(player.id - 5, "B").top,
                width: 50,
                height: 50,
                justifyContent: "center",
                alignItems: "center",
                zIndex: 200,
              }}
            >
              <JerseyIcon
                width={50}
                primaryColor={getJerseyColors("B").primary}
                secondaryColor={getJerseyColors("B").secondary}
                number={player.num}
              />
            </TouchableOpacity>
            <Text
              style={{
                position: "absolute",
                left: getPlayerPosition(player.id - 5, "B").left - 10, // 🏀 IDs 6-10 → positions 1-5
                top: getPlayerPosition(player.id - 5, "B").top + 45,
                color: "#fff",
                fontSize: 12,
                fontWeight: "bold",
                textAlign: "center",
                width: 60,
                textShadowColor: "rgba(0,0,0,0.8)",
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
                zIndex: 200,
              }}
            >
              {player.name}
            </Text>
          </View>
        ))}

      {/* Pre-game: Substitutes Manager for Team A - manage substitutes and coach */}
      {!teamSelectionModalVisible &&
        !initModalVisible &&
        !matchConfigModalVisible &&
        preGameMode &&
        (teamMode === "A" || teamMode === "BOTH") && (
          <SubstitutesManager
            substitutes={substitutesTeamA}
            coach={coachTeamA}
            onSubstituteEdit={(id) => handleSubstituteEdit(id, "A")}
            onCoachEdit={(id) => handleCoachEdit(id, "A")}
            onAddSubstitute={() => handleAddSubstitute("A")}
            onRemoveSubstitute={() => handleRemoveSubstitute("A")}
            currentTeam={currentTeam}
            teamLetter="A"
            maxSubstitutes={10}
            isPortrait={isPortrait}
            jerseyPrimaryColor={getJerseyColors("A").primary}
            jerseySecondaryColor={getJerseyColors("A").secondary}
          />
        )}

      {/* Pre-game: Substitutes Manager for Team B - manage substitutes and coach */}
      {!teamSelectionModalVisible &&
        !initModalVisible &&
        !matchConfigModalVisible &&
        preGameMode &&
        (teamMode === "B" || teamMode === "BOTH") && (
          <SubstitutesManager
            substitutes={substitutesTeamB}
            coach={coachTeamB}
            onSubstituteEdit={(id) => handleSubstituteEdit(id, "B")}
            onCoachEdit={(id) => handleCoachEdit(id, "B")}
            onAddSubstitute={() => handleAddSubstitute("B")}
            onRemoveSubstitute={() => handleRemoveSubstitute("B")}
            currentTeam={currentTeam}
            teamLetter="B"
            maxSubstitutes={10}
            isPortrait={isPortrait}
            jerseyPrimaryColor={getJerseyColors("B").primary}
            jerseySecondaryColor={getJerseyColors("B").secondary}
          />
        )}
    </View>
  );
}

// Generates all styles dynamically based on the current layout
const getStyles = ({
  courtWidth,
  courtHeight,
  BOTTOM_NAV_HEIGHT,
  BOTTOM_NAV_WIDTH,
  isPortrait,
}: {
  courtWidth: number;
  courtHeight: number;
  BOTTOM_NAV_HEIGHT: number;
  BOTTOM_NAV_WIDTH: number;
  isPortrait: boolean;
}) =>
  StyleSheet.create({
    markerContainer: {
      position: "absolute",
      zIndex: 100,
    },
    markerIcon: {
      fontSize: 24,
    },
    markerPlayer: {
      position: "absolute",
      bottom: -15,
      left: "50%",
      transform: [{ translateX: -5 }],
      fontSize: 12,
      color: "#fff",
      fontWeight: "bold",
      textShadowColor: "rgba(0,0,0,0.8)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    bottomNavBar: {
      position: "absolute",
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      ...(isPortrait
        ? {
            // Portrait: bottom full width - utilise BOTTOM_NAV_HEIGHT
            bottom: 0,
            left: 0,
            right: 0,
            height: BOTTOM_NAV_HEIGHT,
            flexDirection: "row",
          }
        : {
            // Landscape: right side - utilise BOTTOM_NAV_WIDTH
            right: 0,
            top: 0,
            bottom: 0,
            width: BOTTOM_NAV_WIDTH,
            flexDirection: "column",
            justifyContent: "center",
          }),
      zIndex: 300,
    },
    navButton: {
      flex: isPortrait ? 1 : 0,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: isPortrait ? 6 : 8,
      paddingHorizontal: isPortrait ? 4 : 2,
      borderRadius: 12,
      ...(isPortrait
        ? { marginHorizontal: 2 }
        : { marginVertical: 6, minWidth: 50 }),
    },
    navButtonContent: {
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    navButtonIcon: {
      fontSize: isPortrait ? 18 : 16,
      marginBottom: isPortrait ? 3 : 2,
    },
    navButtonLabel: {
      fontSize: isPortrait ? 9 : 8,
      color: "#fff",
      fontWeight: "600",
      textAlign: "center",
      opacity: 0.9,
    },
    navButtonDisabled: {
      opacity: 0.4,
    },
    navBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#FF5722",
      zIndex: 1,
    },
    navBadgeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#FF5722",
    },
    navBadgeCounter: {
      position: "absolute",
      top: -6,
      right: -6,
      backgroundColor: "#FF5722",
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      zIndex: 1,
    },
    navBadgeCounterText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "bold",
      textAlign: "center",
    },
    undoModalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    undoModalContainer: {
      backgroundColor: "#fff",
      borderRadius: 10,
      padding: 20,
      width: "80%",
      alignItems: "center",
    },
    undoModalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 10,
    },
    undoModalMessage: {
      fontSize: 16,
      color: "#333",
      marginBottom: 20,
      textAlign: "center",
    },
    undoActionDetails: {
      marginBottom: 20,
      alignItems: "center",
    },
    undoActionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 5,
    },
    undoActionInfo: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 5,
    },
    undoActionIcon: {
      fontSize: 24,
      marginRight: 10,
    },
    undoActionIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
    },
    undoActionText: {
      flex: 1,
    },
    undoActionType: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#555",
    },
    undoActionPlayer: {
      fontSize: 14,
      color: "#007bff",
    },
    undoActionTime: {
      fontSize: 12,
      color: "#888",
      marginTop: 2,
    },
    undoModalButtons: {
      flexDirection: "row",
      justifyContent: "space-around",
      width: "100%",
    },
    undoModalButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      minWidth: 100,
    },
    undoModalButtonCancel: {
      backgroundColor: "#dc3545",
      borderColor: "#dc3545",
    },
    undoModalButtonConfirm: {
      backgroundColor: "#28a745",
      borderColor: "#28a745",
    },
    undoModalButtonTextCancel: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
    },
    undoModalButtonTextConfirm: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
    },
    courtContainer: {
      position: "absolute",
      top: 80, // Space for MatchStatusBar
      left: 0,
      right: isPortrait ? 0 : BOTTOM_NAV_WIDTH, // Space for vertical bottom nav in landscape
      bottom: isPortrait ? BOTTOM_NAV_HEIGHT + 20 : 20, // Space for bottom nav + margin
    },
  });
