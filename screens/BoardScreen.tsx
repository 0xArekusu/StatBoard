import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import InitTeamModal from "./InitTeamModal";
import PlayerEditModal from "./PlayerEditModal";
import ActionSystemModal, {
  ActionData,
  getActionIcon,
} from "../components/ActionSystemModal";
import FilterBottomSheet from "../components/FilterBottomSheet";
import HistoryBottomSheet from "../components/HistoryBottomSheet";
import BasketballCourtSVG from "../components/BasketballCourtSVG";

// Modal layout constants (pour le nouveau ActionModal)
const MODAL_WIDTH = 240;
const MODAL_HEIGHT = 220;
const MODAL_PADDING = 20;
const POINTER_SIZE = 12;
const MODAL_OFFSET_TOP = 10;
const MODAL_OFFSET_BOTTOM = 50;
const MODAL_CONTENT_PADDING = 20;

export default function BasketballCourt() {
  const insets = useSafeAreaInsets(); // Provides status bar and notch margins
  const window = useWindowDimensions(); // Automatically reacts to rotation
  const [showSheet, setShowSheet] = useState(true);

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
    }[]
  >([]);

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
      // Remove the last action from completedActions
      setCompletedActions((prev) => prev.slice(0, -1));

      // Remove the corresponding marker if it exists (temporary markers)
      const lastAction = completedActions[completedActions.length - 1];
      setMarkers((prev) =>
        prev.filter(
          (marker) =>
            !(
              marker.x === lastAction.position.x - 12 &&
              marker.y === lastAction.position.y - 50 &&
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

  // Ajout du state pour le popup d'initialisation
  const [initModalVisible, setInitModalVisible] = useState(true);
  const [teamA, setTeamA] = useState("Team A");
  const [teamB, setTeamB] = useState("Team B");
  const [teamMode, setTeamMode] = useState<"A" | "B" | "both">("A");
  const [currentTeam, setCurrentTeam] = useState<"A" | "B">("A");

  // Mode PreGame : désactive les interactions avec le terrain
  const [preGameMode, setPreGameMode] = useState(true);

  // État pour l'édition des joueurs
  const [playerEditModalVisible, setPlayerEditModalVisible] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<number | null>(null);

  // État pour les joueurs avec leurs positions
  const [players, setPlayers] = useState([
    { id: 1, num: 1, name: "Joueur #1" },
    { id: 2, num: 2, name: "Joueur #2" },
    { id: 3, num: 3, name: "Joueur #3" },
    { id: 4, num: 4, name: "Joueur #4" },
    { id: 5, num: 5, name: "Joueur #5" },
  ]);

  // Sécurité : désactiver le bouton si un champ est vide
  const isConfirmDisabled = teamA.trim() === "" || teamB.trim() === "";

  // Fonction pour formater la date en français
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
    const CONTAINER_PADDING = 20;
    const TOOLBAR_SPACE = 50; // Space reserved for toolbar

    // Width without phone state bar and navigation bar, with toolbar space
    const availableWidth = isPortrait
      ? window.width - insets.left - insets.right - 2 * CONTAINER_PADDING
      : window.width -
        insets.left -
        insets.right -
        2 * CONTAINER_PADDING -
        TOOLBAR_SPACE;

    // Height without phone state bar and navigation bar, with toolbar space
    const availableHeight = isPortrait
      ? window.height -
        insets.top -
        insets.bottom -
        2 * CONTAINER_PADDING -
        TOOLBAR_SPACE
      : window.height - insets.top - insets.bottom - 2 * CONTAINER_PADDING;

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
      circleDiameter,
      keyWidth,
      keyHeight,
      threePointArcWidth,
      threePointArcHeight,
      CONTAINER_PADDING,
      TOOLBAR_SPACE,
      isPortrait,
      window,
      insets,
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

  // Calculate modal coordinates based on click
  const calculateModalPosition = (x: number, y: number) => {
    const showPointerOnTop = y < window.height / 2;

    let modalX = x - MODAL_WIDTH / 2;
    let modalY = showPointerOnTop
      ? y - MODAL_OFFSET_TOP
      : y - MODAL_HEIGHT - MODAL_OFFSET_BOTTOM;

    modalX = Math.max(
      MODAL_PADDING,
      Math.min(window.width - MODAL_WIDTH - MODAL_PADDING, modalX)
    );
    modalY = Math.max(
      MODAL_PADDING,
      Math.min(window.height - MODAL_HEIGHT - MODAL_PADDING, modalY)
    );

    const clickXRelative = x - modalX;
    const pointerX = Math.min(
      Math.max(MODAL_CONTENT_PADDING, clickXRelative),
      MODAL_WIDTH - MODAL_CONTENT_PADDING
    );

    return {
      x: modalX,
      y: modalY,
      pointerX,
      showPointerOnTop,
      clickX: x,
      clickY: y,
    };
  };

  const handleZonePress = (x: number, y: number) => {
    const pos = calculateModalPosition(x, y);
    setModalPosition(pos);
    setActionModalVisible(true);
  };

  const handleActionComplete = (actionData: ActionData) => {
    // Create unique ID for this marker
    const markerId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create animated value for this marker
    const opacityValue = new Animated.Value(1);
    markerAnimations.current[markerId] = opacityValue;

    // Add marker at click position
    setMarkers((prev) => [
      ...prev,
      {
        x: actionData.position.x - 12,
        y: actionData.position.y - 50,
        type: actionData.type,
        specification: actionData.specification,
        player: actionData.player,
        id: markerId,
        opacity: opacityValue,
      },
    ]);

    // Remove marker after 1 seconds
    removeMarkerAfterDelay(markerId, 1000);

    // Save detailed action data for future database storage
    setCompletedActions((prev) => [...prev, actionData]);

    setActionModalVisible(false);

    // Log the action for debugging
    console.log("Action completed:", {
      type: actionData.type,
      specification: actionData.specification,
      player: actionData.player,
      timestamp: actionData.timestamp,
      position: actionData.position,
    });
  };

  const handleTeamModeConfirm = (selectedTeamMode: "A" | "B" | "both") => {
    setTeamMode(selectedTeamMode);
    setCurrentTeam(selectedTeamMode === "B" ? "B" : "A");
    setInitModalVisible(false);
  };

  const handlePlayerEdit = (playerId: number) => {
    setEditingPlayer(playerId);
    setPlayerEditModalVisible(true);
  };

  const handlePlayerEditConfirm = (newNumber: number, newName: string) => {
    if (editingPlayer !== null) {
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) =>
          player.id === editingPlayer
            ? { ...player, num: newNumber, name: newName }
            : player
        )
      );
    }
    setPlayerEditModalVisible(false);
    setEditingPlayer(null);
  };

  const handlePlayerEditCancel = () => {
    setPlayerEditModalVisible(false);
    setEditingPlayer(null);
  };

  // Fonction pour calculer les positions des joueurs
  const getPlayerPosition = (playerId: number) => {
    const positions = [
      // Meneur (ID 1)
      {
        left: courtWidth / 2 - 20,
        top:
          currentTeam === "A"
            ? isPortrait
              ? keyHeight - 50
              : courtHeight / 2 - keyHeight / 2 - 50
            : isPortrait
            ? courtHeight - keyHeight - 50
            : courtHeight / 2 + keyHeight / 2 + 10,
      },
      // Ailier gauche (ID 2)
      {
        left:
          currentTeam === "A"
            ? isPortrait
              ? courtWidth / 2 - keyWidth / 2 - 40
              : courtWidth / 2 - keyWidth / 2 - 40
            : isPortrait
            ? courtWidth / 2 - keyWidth / 2 - 40
            : courtWidth / 2 + keyWidth / 2 + 40,
        top:
          currentTeam === "A"
            ? isPortrait
              ? keyHeight
              : courtHeight / 2 - keyHeight / 2
            : isPortrait
            ? courtHeight - keyHeight
            : courtHeight / 2 + keyHeight / 2,
      },
      // Ailier droit (ID 3)
      {
        left:
          currentTeam === "A"
            ? isPortrait
              ? courtWidth / 2 + keyWidth / 2
              : courtWidth / 2 + keyWidth / 2
            : isPortrait
            ? courtWidth / 2 + keyWidth / 2
            : courtWidth / 2 - keyWidth / 2,
        top:
          currentTeam === "A"
            ? isPortrait
              ? keyHeight
              : courtHeight / 2 - keyHeight / 2
            : isPortrait
            ? courtHeight - keyHeight
            : courtHeight / 2 + keyHeight / 2,
      },
      // Intérieur gauche (ID 4)
      {
        left:
          currentTeam === "A"
            ? isPortrait
              ? courtWidth / 2 - keyWidth / 4 - 30
              : courtWidth / 2 - keyWidth / 4 - 30
            : isPortrait
            ? courtWidth / 2 - keyWidth / 4 - 30
            : courtWidth / 2 + keyWidth / 4 + 30,
        top:
          currentTeam === "A"
            ? isPortrait
              ? keyHeight + keyHeight / 2
              : courtHeight / 2 - keyHeight / 4
            : isPortrait
            ? courtHeight - keyHeight - keyHeight / 2
            : courtHeight / 2 + keyHeight / 4,
      },
      // Intérieur droit (ID 5)
      {
        left:
          currentTeam === "A"
            ? isPortrait
              ? courtWidth / 2 + keyWidth / 4 + 10
              : courtWidth / 2 + keyWidth / 4 + 10
            : isPortrait
            ? courtWidth / 2 + keyWidth / 4 + 10
            : courtWidth / 2 - keyWidth / 4 - 10,
        top:
          currentTeam === "A"
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

  return (
    // <View style={[styles.container, { flex: 1 }]}>
    <View style={[{ flex: 1 }]}>
      <InitTeamModal
        visible={initModalVisible}
        teamA={teamA}
        setTeamA={setTeamA}
        teamB={teamB}
        setTeamB={setTeamB}
        onConfirm={handleTeamModeConfirm}
        isConfirmDisabled={isConfirmDisabled}
        getFormattedDate={getFormattedDate}
      />

      <PlayerEditModal
        visible={playerEditModalVisible}
        playerNumber={
          editingPlayer
            ? players.find((p) => p.id === editingPlayer)?.num || 1
            : 1
        }
        playerName={
          editingPlayer
            ? players.find((p) => p.id === editingPlayer)?.name || ""
            : ""
        }
        onConfirm={handlePlayerEditConfirm}
        onCancel={handlePlayerEditCancel}
      />

      {/* Flèches pour switcher de côté */}
      {!initModalVisible && preGameMode && (
        <View
          style={{
            position: "absolute",
            top: isPortrait ? "50%" : "20%",
            left: isPortrait ? "10%" : courtWidth / 2 - 55,
            transform: [
              { translateX: isPortrait ? -24 : 0 },
              { translateY: isPortrait ? -64 : 0 },
            ],
            zIndex: 300,
            flexDirection: isPortrait ? "column" : "row",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor:
                currentTeam === "A" ? "#4CAF50" : "rgba(255,255,255,0.2)",
              borderRadius: 20,
              padding: 12,
              marginBottom: isPortrait ? 6 : 0,
              marginRight: isPortrait ? 0 : 6,
              borderWidth: 2,
              borderColor:
                currentTeam === "A" ? "#388E3C" : "rgba(255,255,255,0.5)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
              minWidth: 44,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => setCurrentTeam("A")}
          >
            <Text
              style={{
                fontSize: 24,
                color: currentTeam === "A" ? "#fff" : "rgba(255,255,255,0.8)",
                fontWeight: "bold",
                textShadowColor: "rgba(0,0,0,0.5)",
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {isPortrait ? "▲" : "◀"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor:
                currentTeam === "B" ? "#4CAF50" : "rgba(255,255,255,0.2)",
              borderRadius: 20,
              padding: 12,
              borderWidth: 2,
              borderColor:
                currentTeam === "B" ? "#388E3C" : "rgba(255,255,255,0.5)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 5,
              minWidth: 44,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => setCurrentTeam("B")}
          >
            <Text
              style={{
                fontSize: 24,
                color: currentTeam === "B" ? "#fff" : "rgba(255,255,255,0.8)",
                fontWeight: "bold",
                textShadowColor: "rgba(0,0,0,0.5)",
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {isPortrait ? "▼" : "▶"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Render markers */}
      {markers.map((m, i) => {
        const icon = getActionIcon(m.type, m.specification);
        // Find the action to get team information
        const matchingAction = completedActions.find(
          (action) =>
            action.position.x - 12 === m.x &&
            action.position.y - 50 === m.y &&
            action.type === m.type &&
            action.specification === m.specification &&
            action.player === m.player
        );
        const teamColor = matchingAction
          ? getTeamColor(matchingAction.team)
          : "#fff";

        return (
          <Animated.View
            key={m.id} // Use marker ID as key
            style={[
              styles.markerContainer,
              { left: m.x, top: m.y, opacity: m.opacity },
            ]}
          >
            <Text style={styles.markerIcon}>{icon}</Text>
            {m.player && (
              <Text style={[styles.markerPlayer, { color: teamColor }]}>
                {m.player}
              </Text>
            )}
          </Animated.View>
        );
      })}

      {/* Render all completed actions when showAllActions is true */}
      {showAllActions &&
        getFilteredActions().map((action, i) => {
          const icon = getActionIcon(action.type, action.specification);
          const teamColor = getTeamColor(action.team);

          return (
            <View
              key={`permanent-${i}`}
              style={[
                styles.markerContainer,
                {
                  left: action.position.x - 12,
                  top: action.position.y - 50,
                },
              ]}
            >
              <Text style={styles.markerIcon}>{icon}</Text>
              {action.player && (
                <Text style={[styles.markerPlayer, { color: teamColor }]}>
                  {action.player}
                </Text>
              )}
            </View>
          );
        })}

      {/* Toolbar - positioned at bottom (portrait) or right (landscape) */}
      {!initModalVisible && !preGameMode && (
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={[
              styles.toolbarButton,
              showAllActions && styles.toolbarButtonActive,
            ]}
            onPress={toggleShowAllActions}
          >
            <Text style={styles.toolbarButtonIcon}>
              {showAllActions ? "👁️" : "🚫"}
            </Text>
          </TouchableOpacity>

          {/* Filter button - only visible when showAllActions is true */}
          {showAllActions && (
            <TouchableOpacity
              style={[styles.toolbarButton, styles.toolbarButtonSpacing]}
              onPress={() => setShowFilterSheet(true)}
            >
              <Text style={styles.toolbarButtonIcon}>🔍</Text>
            </TouchableOpacity>
          )}

          {/* Reset filters button - only visible when showAllActions is true */}
          {showAllActions && (
            <TouchableOpacity
              style={[styles.toolbarButton, styles.toolbarButtonSpacing]}
              onPress={handleResetFilters}
            >
              <Text style={styles.toolbarButtonIcon}>🔄</Text>
            </TouchableOpacity>
          )}

          {/* History button */}
          <TouchableOpacity
            style={[
              styles.toolbarButton,
              styles.toolbarButtonSpacing,
              completedActions.length === 0 && styles.toolbarButtonDisabled,
            ]}
            onPress={() => setShowHistorySheet(true)}
            disabled={completedActions.length === 0}
          >
            <Text style={styles.toolbarButtonIcon}>📋</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toolbarButton,
              styles.toolbarButtonSpacing,
              completedActions.length === 0 && styles.toolbarButtonDisabled,
            ]}
            onPress={handleUndoLastAction}
            disabled={completedActions.length === 0}
          >
            <Text style={styles.toolbarButtonIcon}>↶</Text>
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
        players={players}
        teamA={teamA}
        teamB={teamB}
        completedActions={completedActions}
        onApplyFilters={handleApplyFilters}
        appliedFilters={appliedFilters}
      />

      {/* History Bottom Sheet */}
      <HistoryBottomSheet
        visible={showHistorySheet}
        onClose={() => setShowHistorySheet(false)}
        players={players}
        completedActions={completedActions}
        onDeleteAction={handleDeleteAction}
        teamA={teamA}
        teamB={teamB}
      />

      {/* Basketball Court SVG */}
      <Pressable
        onPress={
          !preGameMode
            ? (e) => {
                // Get the location from the event
                const locationX = e.nativeEvent.pageX;
                const locationY = e.nativeEvent.pageY;
                handleZonePress(locationX, locationY);
              }
            : undefined
        }
        style={styles.courtContainer}
      >
        <BasketballCourtSVG width={courtWidth} height={courtHeight} />
      </Pressable>

      {/* Bouton pour démarrer le match */}
      {!initModalVisible && preGameMode && (
        <TouchableOpacity
          style={{
            position: "absolute",
            bottom: isPortrait ? 100 : 30, // Leave space for toolbar in portrait
            right: isPortrait ? "50%" : 100, // Adjust for toolbar in landscape
            transform: isPortrait ? [{ translateX: 75 }] : undefined,
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
          onPress={() => setPreGameMode(false)}
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
        players={players}
        teamMode={teamMode}
        teamA={teamA}
        teamB={teamB}
        currentTeam={currentTeam}
      />

      {/* Pastilles des joueurs */}
      {!initModalVisible &&
        preGameMode &&
        players.map((player) => (
          <View key={player.id}>
            <TouchableOpacity
              onPress={() => handlePlayerEdit(player.id)}
              style={{
                position: "absolute",
                left: getPlayerPosition(player.id).left,
                top: getPlayerPosition(player.id).top,
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
                left: getPlayerPosition(player.id).left - 10,
                top: getPlayerPosition(player.id).top + 45,
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
    </View>
  );
}

// Generates all styles dynamically based on the current layout
const getStyles = ({
  courtWidth,
  courtHeight,
  circleDiameter,
  keyWidth,
  keyHeight,
  threePointArcWidth,
  threePointArcHeight,
  CONTAINER_PADDING,
  TOOLBAR_SPACE,
  isPortrait,
  window,
  insets,
}: {
  courtWidth: number;
  courtHeight: number;
  circleDiameter: number;
  keyWidth: number;
  keyHeight: number;
  threePointArcWidth: number;
  threePointArcHeight: number;
  CONTAINER_PADDING: number;
  TOOLBAR_SPACE: number;
  isPortrait: boolean;
  window: { width: number; height: number };
  insets: { top: number; left: number; right: number; bottom: number };
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "red",
      width: courtWidth,
      height: courtHeight,
      padding: CONTAINER_PADDING,
      position: "absolute",
    },
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
    toolbar: {
      position: "absolute",
      ...(isPortrait
        ? {
            // Portrait: bottom center
            bottom: CONTAINER_PADDING,
            left: CONTAINER_PADDING,
            right: CONTAINER_PADDING,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }
        : {
            // Landscape: right center
            right: CONTAINER_PADDING,
            top: "50%",
            transform: [{ translateY: -40 }],
            flexDirection: "column",
            alignItems: "center",
          }),
      zIndex: 300,
    },
    toolbarButton: {
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 20,
      padding: 10,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.5)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    toolbarButtonActive: {
      backgroundColor: "rgba(255,255,255,0.5)",
      borderColor: "rgba(255,255,255,1)",
    },
    toolbarButtonSpacing: {
      ...(isPortrait
        ? { marginLeft: 10 } // Portrait: space between buttons horizontally
        : { marginTop: 10 }), // Landscape: space between buttons vertically
    },
    toolbarButtonDisabled: {
      opacity: 0.5, // Make disabled button look faded
    },
    toolbarButtonIcon: {
      fontSize: 24,
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
      top: CONTAINER_PADDING,
      left: CONTAINER_PADDING,
      right: isPortrait ? CONTAINER_PADDING : CONTAINER_PADDING + TOOLBAR_SPACE,
      bottom: isPortrait
        ? CONTAINER_PADDING + TOOLBAR_SPACE
        : CONTAINER_PADDING,
    },
  });
