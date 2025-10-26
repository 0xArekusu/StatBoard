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
import MatchStatusBar from "../components/MatchStatusBar";
import MatchConfirmationModal from "../components/MatchConfirmationModal";
import { MatchManager } from "../src/services/match/MatchManager";
import { ActionQueue, ActionObserver } from "../src/services/match/ActionQueue";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { MatchPlayerRepository } from "../src/services/database/MatchPlayerRepository";
import { Match } from "../src/models/types";
import type { Player } from "../models/Player";

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

/**
 * Convert club players (from database) to BoardScreen format
 * Maps players by position (1-5 for starters) rather than jersey number
 */
const convertClubPlayersToBoard = (clubPlayers: Player[]) => {
  // Separate starters and substitutes
  const clubStarters = clubPlayers.filter(p => p.isStarter);
  const clubSubstitutes = clubPlayers.filter(p => !p.isStarter);

  // Map starters by position (1-5)
  // Position 1 = Point Guard, 2 = Shooting Guard, 3 = Small Forward, 4 = Power Forward, 5 = Center
  const starters = Array.from({ length: 5 }, (_, index) => {
    const position = (index + 1) as 1 | 2 | 3 | 4 | 5;
    const playerAtPosition = clubStarters.find(p => p.position === position);

    if (playerAtPosition) {
      return {
        id: index + 1,
        num: playerAtPosition.jerseyNumber,
        name: playerAtPosition.name,
        isSubstitute: false,
        isFromClub: true
      };
    }

    // If no player at this position, create a default placeholder
    return {
      id: index + 1,
      num: index + 1,
      name: `Joueur A${index + 1}`,
      isSubstitute: false,
      isFromClub: false
    };
  });

  // Map substitutes (keep their order, assign sequential IDs)
  const substitutes = clubSubstitutes.map((p, index) => ({
    id: starters.length + index + 1,
    num: p.jerseyNumber,
    name: p.name,
    isSubstitute: true,
    isFromClub: true
  }));

  return { starters, substitutes };
};

/**
 * Get marker color based on action type and specification
 */
const getMarkerColor = (actionType: string, specification?: string): string => {
  // Shot
  if (actionType === "tir") {
    return specification === "reussi" ? "#4CAF50" : "#F44336"; // green if successful, red if missed
  }
  // Rebound
  if (actionType === "rebond") {
    return specification === "offensif" ? "#FF9800" : "#2196F3"; // orange if offensive, blue if defensive
  }
  // Foul
  if (actionType === "faute") {
    return specification === "technique" ? "#9C27B0" : "#E74C3C"; // purple if technical, red if personal
  }
  // Default color
  return "#757575";
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
  const insets = useSafeAreaInsets(); // Provides status bar and notch margins
  const window = useWindowDimensions(); // Automatically reacts to rotation
  const [showSheet, setShowSheet] = useState(true);

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

  // Function to toggle showing all actions
  const toggleShowAllActions = () => {
    setShowAllActions(!showAllActions);
  };

  // Function to handle undo last action
  const handleUndoLastAction = () => {
    if (completedActions.length > 0) {
      setShowUndoConfirmation(true);
    }
  };

  // Function to confirm undo action
  const confirmUndoAction = () => {
    if (completedActions.length > 0) {
      const lastAction = completedActions[completedActions.length - 1];

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

  // Function to cancel undo action
  const cancelUndoAction = () => {
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

  // Function to handle filter application
  const handleApplyFilters = (filters: {
    teams: ("A" | "B")[];
    players: number[];
    actionTypes: string[];
  }) => {
    setAppliedFilters(filters);
  };

  // Function to reset filters
  const handleResetFilters = () => {
    setAppliedFilters({
      teams: ["A", "B"],
      players: [],
      actionTypes: [],
    });
  };

  // Function to delete a specific action
  const handleDeleteAction = (actionIndex: number) => {
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
    useState(true);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [selectedTeamPlayers, setSelectedTeamPlayers] = useState<any[]>([]);
  const [initModalVisible, setInitModalVisible] = useState(false);
  const [matchConfigModalVisible, setMatchConfigModalVisible] = useState(false);
  const [teamA, setTeamA] = useState("Team A");
  const [teamB, setTeamB] = useState("Team B");
  const [teamMode, setTeamMode] = useState<"A" | "B" | "both">("A");
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
  const [actionCounter, setActionCounter] = useState(0); // To generate action_order

  // State for player editing
  const [playerEditModalVisible, setPlayerEditModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);
  const [editingTeam, setEditingTeam] = useState<"A" | "B">("A"); // 🏀 Team being edited

  // State for players with their positions
  const [players, setPlayers] = useState([
    { id: 1, num: 1, name: "Joueur A1", isSubstitute: false, isFromClub: false },
    { id: 2, num: 2, name: "Joueur A2", isSubstitute: false, isFromClub: false },
    { id: 3, num: 3, name: "Joueur A3", isSubstitute: false, isFromClub: false },
    { id: 4, num: 4, name: "Joueur A4", isSubstitute: false, isFromClub: false },
    { id: 5, num: 5, name: "Joueur A5", isSubstitute: false, isFromClub: false },
  ]);

  // 🏀 State for team B players ("both" mode)
  const [playersTeamB, setPlayersTeamB] = useState([
    { id: 6, num: 1, name: "Joueur B1", isSubstitute: false, isFromClub: false },
    { id: 7, num: 2, name: "Joueur B2", isSubstitute: false, isFromClub: false },
    { id: 8, num: 3, name: "Joueur B3", isSubstitute: false, isFromClub: false },
    { id: 9, num: 4, name: "Joueur B4", isSubstitute: false, isFromClub: false },
    { id: 10, num: 5, name: "Joueur B5", isSubstitute: false, isFromClub: false },
  ]);

  // States for substitutes
  const [substitutesTeamA, setSubstitutesTeamA] = useState([
    { id: 11, num: 6, name: "Remplaçant A1", isSubstitute: true, isFromClub: false },
    { id: 12, num: 7, name: "Remplaçant A2", isSubstitute: true, isFromClub: false },
    { id: 13, num: 8, name: "Remplaçant A3", isSubstitute: true, isFromClub: false },
    { id: 14, num: 9, name: "Remplaçant A4", isSubstitute: true, isFromClub: false },
    { id: 15, num: 10, name: "Remplaçant A5", isSubstitute: true, isFromClub: false },
  ]);

  const [substitutesTeamB, setSubstitutesTeamB] = useState([
    { id: 16, num: 6, name: "Remplaçant B1", isSubstitute: true, isFromClub: false },
    { id: 17, num: 7, name: "Remplaçant B2", isSubstitute: true, isFromClub: false },
    { id: 18, num: 8, name: "Remplaçant B3", isSubstitute: true, isFromClub: false },
    { id: 19, num: 9, name: "Remplaçant B4", isSubstitute: true, isFromClub: false },
    { id: 20, num: 10, name: "Remplaçant B5", isSubstitute: true, isFromClub: false },
  ]);

  // States for coaches
  const [coachTeamA, setCoachTeamA] = useState({
    id: 21,
    name: "Coach Équipe A",
    isCoach: true,
  });

  const [coachTeamB, setCoachTeamB] = useState({
    id: 22,
    name: "Coach Équipe B",
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

  useEffect(() => {
    setShowSheet(true);
  }, []);

  // Check if there is an active match at startup
  useEffect(() => {
    const checkActiveMatch = async () => {
      try {
        const activeMatch = await matchManager.getActiveMatch();
        if (activeMatch) {
          console.log("🔄 Active match found:", activeMatch);
          setFoundMatch(activeMatch);
          setResumeModalVisible(true);
          setInitModalVisible(false);
        }
      } catch (error) {
        console.error("❌ Error checking active match:", error);
      }
    };

    checkActiveMatch();
  }, [matchManager]);

  // Configure action queue observer
  useEffect(() => {
    const observer: ActionObserver = {
      onActionsSaved: (savedCount: number) => {
        console.log(`✅ ${savedCount} actions saved to database`);
      },
      onError: (error: Error) => {
        console.error("❌ Action queue error:", error);
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

  const {
    courtWidth,
    courtHeight,
    circleDiameter,
    keyWidth,
    keyHeight,
    threePointArcWidth,
    threePointArcHeight,
    styles,
  } = useMemo(() => {
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

    const circleDiameter = isPortrait ? courtWidth * 0.2 : courtHeight * 0.2;
    const keyWidth = isPortrait ? courtWidth * 0.3 : courtWidth * 0.24;
    const keyHeight = isPortrait ? courtHeight * 0.24 : courtHeight * 0.3;
    const threePointArcWidth = isPortrait
      ? courtWidth * 0.88
      : courtHeight * 0.88;
    const threePointArcHeight = isPortrait
      ? courtHeight * 0.68
      : courtWidth * 0.38;

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
      circleDiameter,
      keyWidth,
      keyHeight,
      threePointArcWidth,
      threePointArcHeight,
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
    return getFilteredActions().map((action) => ({
      id: `action-${action.timestamp.getTime()}`,
      svgX: action.semanticPosition.xNormalized * 615.75,
      svgY: action.semanticPosition.yNormalized * 1146.749971,
      color: getMarkerColor(action.type, action.specification),
    }));
  }, [completedActions, appliedFilters, showAllActions]);

  // Determine which markers to display
  const displayMarkers = showAllActions ? getAllActionMarkers() : clickMarkers;

  const handleZonePress = (
    svgX: number,
    svgY: number,
    screenX: number,
    screenY: number
  ) => {
    // Store SVG coordinates for later use in handleActionComplete
    setTempSvgCoords({ svgX, svgY });

    // Capturer le temps exact au moment du clic
    setClickTime({
      period: currentPeriod,
      timeInPeriod: timeElapsed,
    });

    // Adjust screen coordinates to account for court container offset
    // courtContainer starts at top: 80
    const absoluteScreenX = screenX;
    const absoluteScreenY = screenY + 80; // Add top offset of courtContainer

    const pos = calculateModalPosition(absoluteScreenX, absoluteScreenY);
    setModalPosition(pos);
    setActionModalVisible(true);
  };

  const handleActionComplete = (actionData: ActionData) => {
    if (!currentMatch) {
      console.warn("⚠️ No current match - action not saved");
      return;
    }

    if (!tempSvgCoords) {
      console.warn("⚠️ No SVG coordinates stored");
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

    setActionModalVisible(false);

    // Log the action for debugging
    const courtDimensions = { width: courtWidth, height: courtHeight };
    console.log("🏀 Action completed:", {
      type: actionData.type,
      specification: actionData.specification,
      player: actionData.player,
      team: actionData.team, // 🔍 DEBUG: Log team
      timestamp: actionData.timestamp,
      svgCoordinates: { svgX, svgY },
      isPortrait,
      semanticPosition,
      calculatedAbsolute: convertSemanticToDisplay(
        semanticPosition,
        isPortrait,
        courtDimensions
      ),
      debug: {
        semanticPercentages: {
          x: (semanticPosition.xNormalized * 100).toFixed(1) + "%",
          y: (semanticPosition.yNormalized * 100).toFixed(1) + "%",
        },
      },
    });
  };

  const [matchFormat, setMatchFormat] = useState<"2_halves" | "4_quarters">(
    "4_quarters"
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
    return matchFormat === "2_halves" ? 2 : 4;
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
      if (action.type === "tir" && action.specification === "reussi") {
        // Use the points field from the action (1, 2, or 3 points)
        const points = action.points || 2; // Default to 2 if not specified

        console.log("🔍 Scoring action:", {
          team: action.team,
          points,
          player: action.player,
        }); // 🔍 DEBUG

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

  const handleTeamModeConfirm = (selectedTeamMode: "A" | "B" | "both") => {
    setTeamMode(selectedTeamMode);
    setCurrentTeam(selectedTeamMode === "B" ? "B" : "A");

    // ✨ If user chose Team B and we have club players, move them to Team B
    if (selectedTeamMode === "B" && selectedTeamPlayers.length > 0) {
      const { starters, substitutes } = convertClubPlayersToBoard(selectedTeamPlayers);

      // Move club players to Team B
      setPlayersTeamB(starters);
      setSubstitutesTeamB(substitutes);

      // Reset Team A to default values
      setPlayers([
        { id: 1, num: 1, name: "Joueur A1", isSubstitute: false, isFromClub: false },
        { id: 2, num: 2, name: "Joueur A2", isSubstitute: false, isFromClub: false },
        { id: 3, num: 3, name: "Joueur A3", isSubstitute: false, isFromClub: false },
        { id: 4, num: 4, name: "Joueur A4", isSubstitute: false, isFromClub: false },
        { id: 5, num: 5, name: "Joueur A5", isSubstitute: false, isFromClub: false },
      ]);
      setSubstitutesTeamA([
        { id: 11, num: 6, name: "Remplaçant A1", isSubstitute: true, isFromClub: false },
        { id: 12, num: 7, name: "Remplaçant A2", isSubstitute: true, isFromClub: false },
        { id: 13, num: 8, name: "Remplaçant A3", isSubstitute: true, isFromClub: false },
        { id: 14, num: 9, name: "Remplaçant A4", isSubstitute: true, isFromClub: false },
        { id: 15, num: 10, name: "Remplaçant A5", isSubstitute: true, isFromClub: false },
      ]);
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

  const handleStartMatch = async () => {
    try {
      console.log("🏀 Starting match...");

      // Protection contre les valeurs null
      if (!teamA || !teamB || !teamMode || !matchFormat || !periodDuration) {
        console.warn("⚠️ Missing required match data");
        return;
      }

      const matchData = {
        team_a_name: teamA,
        team_b_name: teamB,
        team_mode: teamMode,
        match_format: matchFormat as "2_halves" | "4_quarters",
        period_duration: periodDuration,
      };

      const match = await matchManager.startMatch(matchData);
      setCurrentMatch(match);

      // Sauvegarder les joueurs dans la base de données
      const matchPlayerRepository = new MatchPlayerRepository();
      const allPlayers = getAllPlayers();

      const playersToSave = allPlayers.map((player) => ({
        match_id: match.id,
        player_number: player.num,
        player_name: player.name,
        team: player.team,
        is_starter: !player.isSubstitute,
      }));

      if (playersToSave.length > 0) {
        await matchPlayerRepository.createBatch(playersToSave);
        console.log(
          `✅ Saved ${playersToSave.length} players for match ${match.id}`
        );
      }

      setPreGameMode(false);

      // Réinitialiser les scores au début d'un nouveau match
      setScoreA(0);
      setScoreB(0);

      console.log("✅ Match started successfully:", match.id);
    } catch (error) {
      console.error("❌ Error starting match:", error);
      // En cas d'erreur, on peut continuer sans la base de données
      setPreGameMode(false);
    }
  };

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
    console.log("Pause clicked");
    stopTimer();
  };

  const handleResumeTimer = () => {
    console.log("Resume clicked");
    // Si le match n'a pas encore commencé ou si on est en pause, démarrer le chrono
    if (!isMatchStarted || isPaused) {
      startTimer();
    }
  };

  // Fonctions pour la gestion des périodes
  const handleNextPeriodRequest = () => {
    const timeRemaining = getTimeRemaining();

    if (timeRemaining > 0) {
      // Il reste du temps, demander confirmation
      setShowNextPeriodModal(true);
    } else {
      // Pas de temps restant, passer directement
      goToNextPeriod();
    }
  };

  const goToNextPeriod = () => {
    const nextPeriod = currentPeriod + 1;
    const maxPeriods = getTotalPeriods();

    if (nextPeriod <= maxPeriods) {
      console.log(`🏀 Passage à la période ${nextPeriod}`);

      // Arrêter le chrono actuel
      stopTimer();

      // Passer à la période suivante et reset le chrono
      setCurrentPeriod(nextPeriod);
      setTimeElapsed(0);
      setIsPaused(true);

      // Note: Les scores sont conservés entre les périodes

      // Sauvegarder immédiatement l'état de la nouvelle période
      if (currentMatch) {
        setTimeout(() => {
          matchManager.updateMatchState(currentMatch.id, nextPeriod, 0);
        }, 100);
      }

      console.log(`✅ Période ${nextPeriod} commencée`);
    }
  };

  const handleEndMatchRequest = () => {
    const timeRemaining = getTimeRemaining();

    if (timeRemaining > 0) {
      // Il reste du temps, demander confirmation
      setShowEndMatchModal(true);
    } else {
      // Pas de temps restant, terminer directement
      endMatch();
    }
  };

  const endMatch = async () => {
    try {
      console.log("🏁 Fin de match");

      // Arrêter le chrono
      stopTimer();

      // Marquer le match comme terminé dans la base de données
      if (currentMatch) {
        await matchManager.endMatch(currentMatch.id);
        console.log("✅ Match terminé et sauvegardé");
      }

      // Navigate to MatchSummaryScreen
      setShowEndMatchModal(false);

      // Prepare all players with their team info
      const teamAPlayers =
        teamMode === "A" || teamMode === "both"
          ? [
              ...players.map((p) => ({ ...p, team: "A" as const })),
              ...substitutesTeamA.map((s) => ({ ...s, team: "A" as const })),
            ]
          : [];

      const teamBPlayersEnd =
        teamMode === "B" || teamMode === "both"
          ? [
              ...playersTeamB.map((p) => ({ ...p, team: "B" as const })),
              ...substitutesTeamB.map((s) => ({ ...s, team: "B" as const })),
            ]
          : [];

      const allPlayers = [...teamAPlayers, ...teamBPlayersEnd];

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
      });
    } catch (error) {
      console.error("❌ Error ending match:", error);
      // Même en cas d'erreur, arrêter le chrono
    }
  };

  // Fonctions pour les modals de confirmation
  const confirmNextPeriod = () => {
    setShowNextPeriodModal(false);
    goToNextPeriod();
  };

  const cancelNextPeriod = () => {
    setShowNextPeriodModal(false);
  };

  const confirmEndMatch = () => {
    setShowEndMatchModal(false);
    endMatch();
  };

  const cancelEndMatch = () => {
    setShowEndMatchModal(false);
  };

  const handleResumeMatch = async () => {
    if (!foundMatch) return;

    console.log("🔄 Resuming match:", foundMatch.id);
    setCurrentMatch(foundMatch);
    setTeamA(foundMatch.team_a_name);
    setTeamB(foundMatch.team_b_name);
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

    console.log(`✅ Match state restored:`, {
      period: foundMatch.current_period,
      timeElapsed: foundMatch.time_elapsed,
      format: foundMatch.match_format,
      duration: foundMatch.period_duration,
    });
  };

  const loadExistingActions = async (matchId: number) => {
    try {
      console.log("📊 Loading existing actions for match:", matchId);
      const actions = await actionRepository.getActionsForMatch(matchId);

      if (actions.length > 0) {
        // Convertir les actions BDD en format ActionData pour l'UI
        const actionDataList = actions.map((action) => ({
          type: action.action_type,
          specification: action.specification,
          player: action.player_number,
          team: action.team,
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

        console.log(`✅ Loaded ${actions.length} existing actions`);
      }
    } catch (error) {
      console.error("❌ Error loading existing actions:", error);
    }
  };

  const handleDiscardMatch = async () => {
    if (!foundMatch) return;

    try {
      console.log("🗑️ Abandoning match:", foundMatch.id);
      await matchManager.abandonMatch(foundMatch.id);
      setFoundMatch(null);
      setResumeModalVisible(false);
      setInitModalVisible(true); // Retour au modal d'initialisation
    } catch (error) {
      console.error("❌ Error abandoning match:", error);
      // En cas d'erreur, on ferme quand même le modal
      setFoundMatch(null);
      setResumeModalVisible(false);
      setInitModalVisible(true);
    }
  };

  const handleGoBackToMenu = () => {
    console.log("🏠 Going back to main menu");
    setResumeModalVisible(false);
    setFoundMatch(null);
    navigation.goBack(); // Retour au MainMenuScreen
  };

  const handlePlayerEdit = (playerId: number, team: "A" | "B" = "A") => {
    setEditingPlayer(playerId);
    setEditingTeam(team); // 🏀 Mémoriser l'équipe en cours d'édition
    setPlayerEditModalVisible(true);
  };

  // 🔄 Fonction pour interchanger deux joueurs (swap positions)
  const handlePlayerSwap = (targetPlayerId: number) => {
    if (editingPlayer === null) return;

    const teamPlayers = editingTeam === "A" ? players : playersTeamB;
    const teamSubstitutes = editingTeam === "A" ? substitutesTeamA : substitutesTeamB;

    // Find the current player being edited
    const currentPlayer = [...teamPlayers, ...teamSubstitutes].find(p => p.id === editingPlayer);
    // Find the target player to swap with
    const targetPlayer = [...teamPlayers, ...teamSubstitutes].find(p => p.id === targetPlayerId);

    if (!currentPlayer || !targetPlayer) return;

    // Swap positions by swapping their data
    if (editingTeam === "A") {
      // Update starters
      setPlayers(prev => prev.map(p => {
        if (p.id === currentPlayer.id) return { ...p, num: targetPlayer.num, name: targetPlayer.name, isFromClub: targetPlayer.isFromClub };
        if (p.id === targetPlayer.id) return { ...p, num: currentPlayer.num, name: currentPlayer.name, isFromClub: currentPlayer.isFromClub };
        return p;
      }));
      // Update substitutes
      setSubstitutesTeamA(prev => prev.map(p => {
        if (p.id === currentPlayer.id) return { ...p, num: targetPlayer.num, name: targetPlayer.name, isFromClub: targetPlayer.isFromClub };
        if (p.id === targetPlayer.id) return { ...p, num: currentPlayer.num, name: currentPlayer.name, isFromClub: currentPlayer.isFromClub };
        return p;
      }));
    } else {
      // Update Team B starters
      setPlayersTeamB(prev => prev.map(p => {
        if (p.id === currentPlayer.id) return { ...p, num: targetPlayer.num, name: targetPlayer.name, isFromClub: targetPlayer.isFromClub };
        if (p.id === targetPlayer.id) return { ...p, num: currentPlayer.num, name: currentPlayer.name, isFromClub: currentPlayer.isFromClub };
        return p;
      }));
      // Update Team B substitutes
      setSubstitutesTeamB(prev => prev.map(p => {
        if (p.id === currentPlayer.id) return { ...p, num: targetPlayer.num, name: targetPlayer.name, isFromClub: targetPlayer.isFromClub };
        if (p.id === targetPlayer.id) return { ...p, num: currentPlayer.num, name: currentPlayer.name, isFromClub: currentPlayer.isFromClub };
        return p;
      }));
    }

    // Close the modal
    setPlayerEditModalVisible(false);
    setEditingPlayer(null);
  };

  const handlePlayerEditConfirm = (newNumber: number, newName: string) => {
    if (editingPlayer !== null) {
      // Vérifier l'unicité du numéro
      if (!isNumberUnique(newNumber, editingPlayer, editingTeam)) {
        alert(
          `Le numéro ${newNumber} est déjà utilisé par un autre joueur de l'équipe ${editingTeam}.`
        );
        return;
      }

      // 🏀 Mettre à jour la bonne équipe selon editingTeam
      if (editingTeam === "A") {
        // Vérifier si c'est un titulaire ou un remplaçant
        const isPlayerInStarters = players.some((p) => p.id === editingPlayer);

        if (isPlayerInStarters) {
          setPlayers((prevPlayers) =>
            prevPlayers.map((player) =>
              player.id === editingPlayer
                ? { ...player, num: newNumber, name: newName }
                : player
            )
          );
        } else {
          setSubstitutesTeamA((prevSubstitutes) =>
            prevSubstitutes.map((substitute) =>
              substitute.id === editingPlayer
                ? { ...substitute, num: newNumber, name: newName }
                : substitute
            )
          );
        }
      } else {
        // Vérifier si c'est un titulaire ou un remplaçant
        const isPlayerInStarters = playersTeamB.some(
          (p) => p.id === editingPlayer
        );

        if (isPlayerInStarters) {
          setPlayersTeamB((prevPlayers) =>
            prevPlayers.map((player) =>
              player.id === editingPlayer
                ? { ...player, num: newNumber, name: newName }
                : player
            )
          );
        } else {
          setSubstitutesTeamB((prevSubstitutes) =>
            prevSubstitutes.map((substitute) =>
              substitute.id === editingPlayer
                ? { ...substitute, num: newNumber, name: newName }
                : substitute
            )
          );
        }
      }
    }
    setPlayerEditModalVisible(false);
    setEditingPlayer(null);
    setEditingTeam("A"); // 🏀 Reset à l'équipe A
  };

  const handlePlayerEditCancel = () => {
    setPlayerEditModalVisible(false);
    setEditingPlayer(null);
    setEditingTeam("A"); // 🏀 Reset à l'équipe A
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

  // Gestion des remplaçants - Ajout
  const handleAddSubstitute = (team: "A" | "B") => {
    const substitutes = team === "A" ? substitutesTeamA : substitutesTeamB;
    const setSubstitutes =
      team === "A" ? setSubstitutesTeamA : setSubstitutesTeamB;

    if (substitutes.length >= 8) return; // Maximum 8 remplaçants

    const nextId =
      Math.max(
        ...players.map((p) => p.id),
        ...playersTeamB.map((p) => p.id),
        ...substitutesTeamA.map((s) => s.id),
        ...substitutesTeamB.map((s) => s.id)
      ) + 1;

    const nextNumber = getNextAvailableNumber(team);
    const teamLetter = team;

    const newSubstitute = {
      id: nextId,
      num: nextNumber,
      name: `Remplaçant ${teamLetter} #${substitutes.length + 1}`,
      isSubstitute: true,
    };

    setSubstitutes([...substitutes, newSubstitute]);
  };

  // Gestion des remplaçants - Suppression
  const handleRemoveSubstitute = (team: "A" | "B") => {
    const substitutes = team === "A" ? substitutesTeamA : substitutesTeamB;
    const setSubstitutes =
      team === "A" ? setSubstitutesTeamA : setSubstitutesTeamB;

    if (substitutes.length === 0) return;

    // Supprimer le dernier remplaçant
    setSubstitutes(substitutes.slice(0, -1));
  };

  // Gestion de l'édition des remplaçants
  const handleSubstituteEdit = (substituteId: number, team: "A" | "B") => {
    setEditingPlayer(substituteId);
    setEditingTeam(team);
    setPlayerEditModalVisible(true);
  };

  // État pour l'édition du coach
  const [coachEditModalVisible, setCoachEditModalVisible] = useState(false);
  const [editingCoach, setEditingCoach] = useState<"A" | "B" | null>(null);

  // Gestion de l'édition du coach
  const handleCoachEdit = (coachId: number, team: "A" | "B") => {
    setEditingCoach(team);
    setCoachEditModalVisible(true);
  };

  const handleCoachEditConfirm = (newName: string) => {
    if (editingCoach === "A") {
      setCoachTeamA((prev) => ({ ...prev, name: newName }));
    } else if (editingCoach === "B") {
      setCoachTeamB((prev) => ({ ...prev, name: newName }));
    }
    setCoachEditModalVisible(false);
    setEditingCoach(null);
  };

  const handleCoachEditCancel = () => {
    setCoachEditModalVisible(false);
    setEditingCoach(null);
  };

  // Fonction pour swapper les côtés des équipes (juste changer currentTeam)
  const handleSwapTeams = () => {
    // Simplement changer le currentTeam pour inverser l'affichage
    setCurrentTeam(currentTeam === "A" ? "B" : "A");
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
      teamMode === "A" || teamMode === "both"
        ? [
            ...players.map((p) => ({ ...p, team: "A" as const })),
            ...substitutesTeamA.map((p) => ({ ...p, team: "A" as const })),
          ]
        : [];

    const teamBPlayers =
      teamMode === "B" || teamMode === "both"
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

    const positions = [
      // Meneur (ID 1)
      {
        left: courtWidth / 2 - 20,
        top: isTeamOnNearSide
          ? isPortrait
            ? keyHeight - 50
            : courtHeight / 2 - keyHeight / 2 - 50
          : isPortrait
          ? courtHeight - keyHeight - 50
          : courtHeight / 2 + keyHeight / 2 + 10,
      },
      // Ailier gauche (ID 2)
      {
        left: isTeamOnNearSide
          ? isPortrait
            ? courtWidth / 2 - keyWidth / 2 - 40
            : courtWidth / 2 - keyWidth / 2 - 40
          : isPortrait
          ? courtWidth / 2 - keyWidth / 2 - 40
          : courtWidth / 2 + keyWidth / 2 + 40,
        top: isTeamOnNearSide
          ? isPortrait
            ? keyHeight
            : courtHeight / 2 - keyHeight / 2
          : isPortrait
          ? courtHeight - keyHeight
          : courtHeight / 2 + keyHeight / 2,
      },
      // Ailier droit (ID 3)
      {
        left: isTeamOnNearSide
          ? isPortrait
            ? courtWidth / 2 + keyWidth / 2
            : courtWidth / 2 + keyWidth / 2
          : isPortrait
          ? courtWidth / 2 + keyWidth / 2
          : courtWidth / 2 - keyWidth / 2,
        top: isTeamOnNearSide
          ? isPortrait
            ? keyHeight
            : courtHeight / 2 - keyHeight / 2
          : isPortrait
          ? courtHeight - keyHeight
          : courtHeight / 2 + keyHeight / 2,
      },
      // Intérieur gauche (ID 4)
      {
        left: isTeamOnNearSide
          ? isPortrait
            ? courtWidth / 2 - keyWidth / 4 - 30
            : courtWidth / 2 - keyWidth / 4 - 30
          : isPortrait
          ? courtWidth / 2 - keyWidth / 4 - 30
          : courtWidth / 2 + keyWidth / 4 + 30,
        top: isTeamOnNearSide
          ? isPortrait
            ? keyHeight + keyHeight / 2
            : courtHeight / 2 - keyHeight / 4
          : isPortrait
          ? courtHeight - keyHeight - keyHeight / 2
          : courtHeight / 2 + keyHeight / 4,
      },
      // Intérieur droit (ID 5)
      {
        left: isTeamOnNearSide
          ? isPortrait
            ? courtWidth / 2 + keyWidth / 4 + 10
            : courtWidth / 2 + keyWidth / 4 + 10
          : isPortrait
          ? courtWidth / 2 + keyWidth / 4 + 10
          : courtWidth / 2 - keyWidth / 4 - 10,
        top: isTeamOnNearSide
          ? isPortrait
            ? keyHeight + keyHeight / 2
            : courtHeight / 2 - keyHeight / 4
          : isPortrait
          ? courtHeight - keyHeight - keyHeight / 2
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
    // <View style={[styles.container, { flex: 1 }]}>
    <View style={[{ flex: 1 }]}>
      {/* 📊 Barre de statut du match en haut */}
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

      <TeamSelectionModal
        visible={teamSelectionModalVisible}
        onTeamSelected={(team, players) => {
          setSelectedTeam(team);
          setSelectedTeamPlayers(players || []);

          // ✨ Pre-fill players from club team
          if (players && players.length > 0) {
            const { starters, substitutes } = convertClubPlayersToBoard(players);

            // Set Team A players (default team for club)
            setPlayers(starters);
            setSubstitutesTeamA(substitutes);
          }

          setTeamSelectionModalVisible(false);
          setInitModalVisible(true);
          if (team) {
            // Pre-fill team name
            setTeamA(team.name);
          }
        }}
        onSkip={() => {
          setTeamSelectionModalVisible(false);
          setInitModalVisible(true);
        }}
      />

      <InitTeamModal
        visible={initModalVisible}
        teamA={teamA}
        setTeamA={setTeamA}
        teamB={teamB}
        setTeamB={setTeamB}
        onConfirm={handleTeamModeConfirm}
        isConfirmDisabled={isConfirmDisabled}
        getFormattedDate={getFormattedDate}
        onRequestClose={() => navigation.goBack()}
        canGoBack={selectedTeam !== null}
        onBack={() => {
          setInitModalVisible(false);
          setTeamSelectionModalVisible(true);
        }}
      />

      <MatchConfigModal
        visible={matchConfigModalVisible}
        onConfirm={handleMatchConfigConfirm}
        onRequestClose={handleMatchConfigBack}
      />

      <PlayerEditModal
        visible={playerEditModalVisible}
        playerNumber={
          editingPlayer
            ? (() => {
                // Chercher dans les titulaires
                const teamPlayers =
                  editingTeam === "A" ? players : playersTeamB;
                const playerInStarters = teamPlayers.find(
                  (p) => p.id === editingPlayer
                );
                if (playerInStarters) return playerInStarters.num;

                // Chercher dans les remplaçants
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
                // Chercher dans les titulaires
                const teamPlayers =
                  editingTeam === "A" ? players : playersTeamB;
                const playerInStarters = teamPlayers.find(
                  (p) => p.id === editingPlayer
                );
                if (playerInStarters) return playerInStarters.name;

                // Chercher dans les remplaçants
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
                return player?.isFromClub || false;
              })()
            : false
        }
        availablePlayers={(() => {
          const teamPlayers = editingTeam === "A" ? players : playersTeamB;
          const teamSubstitutes = editingTeam === "A" ? substitutesTeamA : substitutesTeamB;
          // Exclude the currently edited player from the list
          return [...teamPlayers, ...teamSubstitutes].filter(p => p.id !== editingPlayer);
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
          matchFormat === "2_halves" ? "mi-temps" : "quart-temps"
        } suivant${matchFormat === "2_halves" ? "e" : ""} ?`}
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
            top: isPortrait ? courtHeight / 2 - 25 : courtHeight / 2 - 25,
            left: isPortrait ? courtWidth / 2 - 25 : courtWidth / 2 - 25,
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
            {isPortrait ? "⇅" : "⇄"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Bottom Navigation Bar - positioned at bottom (portrait) or right (landscape) */}
      {!initModalVisible && !preGameMode && (
        <View style={styles.bottomNavBar}>
          {/* Actions Button */}
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

          {/* Filter button */}
          <TouchableOpacity
            style={[
              styles.navButton,
              !showAllActions && styles.navButtonDisabled,
            ]}
            onPress={() => setShowFilterSheet(true)}
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

          {/* History button */}
          <TouchableOpacity
            style={[
              styles.navButton,
              completedActions.length === 0 && styles.navButtonDisabled,
            ]}
            onPress={() => setShowHistorySheet(true)}
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

          {/* Undo button */}
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
        style={styles.courtContainer}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setContainerLayout({ width, height });
        }}
      >
        <BasketballCourtSVG
          width={containerLayout.width || courtWidth}
          height={containerLayout.height || courtHeight}
          onCourtPress={!preGameMode ? handleZonePress : undefined}
          backgroundColor="green"
          markers={displayMarkers}
        />
      </View>

      {/* Bouton pour démarrer le match */}
      {!initModalVisible && !matchConfigModalVisible && preGameMode && (
        <TouchableOpacity
          style={{
            position: "absolute",
            bottom: isPortrait ? 100 : 40, // Leave space for toolbar in portrait
            right: "50%", // Adjust for toolbar in landscape
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

      {/* Action Modal */}
      <ActionSystemModal
        visible={actionModalVisible}
        onClose={() => setActionModalVisible(false)}
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

      {/* 🏀 Pastilles des joueurs - Équipe A */}
      {!teamSelectionModalVisible &&
        !initModalVisible &&
        !matchConfigModalVisible &&
        preGameMode &&
        (teamMode === "A" || teamMode === "both") &&
        players.map((player) => (
          <View key={player.id}>
            <TouchableOpacity
              onPress={() => handlePlayerEdit(player.id, "A")}
              style={{
                position: "absolute",
                left: getPlayerPosition(player.id, "A").left,
                top: getPlayerPosition(player.id, "A").top,
                width: 40,
                height: 40,
                backgroundColor: "#1976d2",
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: "#fff",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
                zIndex: 200,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "bold",
                  textShadowColor: "rgba(0,0,0,0.5)",
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {player.num}
              </Text>
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

      {/* 🏀 Pastilles des joueurs - Équipe B */}
      {!teamSelectionModalVisible &&
        !initModalVisible &&
        !matchConfigModalVisible &&
        preGameMode &&
        (teamMode === "B" || teamMode === "both") &&
        playersTeamB.map((player) => (
          <View key={player.id}>
            <TouchableOpacity
              onPress={() => handlePlayerEdit(player.id, "B")}
              style={{
                position: "absolute",
                left: getPlayerPosition(player.id - 5, "B").left, // 🏀 IDs 6-10 → positions 1-5
                top: getPlayerPosition(player.id - 5, "B").top,
                width: 40,
                height: 40,
                backgroundColor: "#2196F3", // 🏀 Couleur différente pour l'équipe B
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: "#fff",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
                zIndex: 200,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "bold",
                  textShadowColor: "rgba(0,0,0,0.5)",
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {player.num}
              </Text>
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

      {/* 🔄 Gestionnaire des remplaçants - Équipe A */}
      {!teamSelectionModalVisible &&
        !initModalVisible &&
        !matchConfigModalVisible &&
        preGameMode &&
        (teamMode === "A" || teamMode === "both") && (
          <SubstitutesManager
            substitutes={substitutesTeamA}
            coach={coachTeamA}
            onSubstituteEdit={(id) => handleSubstituteEdit(id, "A")}
            onCoachEdit={(id) => handleCoachEdit(id, "A")}
            onAddSubstitute={() => handleAddSubstitute("A")}
            onRemoveSubstitute={() => handleRemoveSubstitute("A")}
            currentTeam={currentTeam}
            teamLetter="A"
            maxSubstitutes={8}
            isPortrait={isPortrait}
          />
        )}

      {/* 🔄 Gestionnaire des remplaçants - Équipe B */}
      {!teamSelectionModalVisible &&
        !initModalVisible &&
        !matchConfigModalVisible &&
        preGameMode &&
        (teamMode === "B" || teamMode === "both") && (
          <SubstitutesManager
            substitutes={substitutesTeamB}
            coach={coachTeamB}
            onSubstituteEdit={(id) => handleSubstituteEdit(id, "B")}
            onCoachEdit={(id) => handleCoachEdit(id, "B")}
            onAddSubstitute={() => handleAddSubstitute("B")}
            onRemoveSubstitute={() => handleRemoveSubstitute("B")}
            currentTeam={currentTeam}
            teamLetter="B"
            maxSubstitutes={8}
            isPortrait={isPortrait}
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
      backgroundColor: "green",
      position: "absolute",
      top: 80, // Space for MatchStatusBar
      left: 0,
      right: isPortrait ? 0 : BOTTOM_NAV_WIDTH, // Space for vertical bottom nav in landscape
      bottom: isPortrait ? BOTTOM_NAV_HEIGHT + 20 : 20, // Space for bottom nav + margin
    },
  });
