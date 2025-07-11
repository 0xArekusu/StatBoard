import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import InitTeamModal from "./InitTeamModal";
import PlayerEditModal from "./PlayerEditModal";
import ActionSystemModal, {
  ActionData,
  getActionIcon,
} from "../components/ActionSystemModal";

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
    }[]
  >([]);

  // New state for completed actions with detailed data
  const [completedActions, setCompletedActions] = useState<ActionData[]>([]);

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
    // Width without phone state bar and navigation bar
    // use this width to position absolute element (padding included)
    const courtWidth = isPortrait
      ? window.width - insets.left - insets.right
      : window.width;
    // Height without phone state bar and navigation bar
    // use this hgight to position absolute element (padding included)
    const courtHeight = isPortrait
      ? window.height - insets.top - insets.bottom
      : window.height - insets.top - insets.bottom;

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
    // Add marker at click position
    setMarkers((prev) => [
      ...prev,
      {
        x: actionData.position.x - 12,
        y: actionData.position.y - 50,
        type: actionData.type,
        specification: actionData.specification,
        player: actionData.player,
      },
    ]);

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
            top: isPortrait ? "50%" : "90%",
            left: isPortrait ? "10%" : "50%",
            transform: [
              { translateX: isPortrait ? -24 : -55 },
              { translateY: isPortrait ? -64 : -25 },
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
        return (
          <View
            key={i}
            style={[styles.markerContainer, { left: m.x, top: m.y }]}
          >
            <Text style={styles.markerIcon}>{icon}</Text>
            {m.player && <Text style={styles.markerPlayer}>{m.player}</Text>}
          </View>
        );
      })}

      {/* 3pts area */}
      <Pressable
        onPress={
          !preGameMode
            ? (e) => handleZonePress(e.nativeEvent.pageX, e.nativeEvent.pageY)
            : undefined
        }
        style={[styles.court, styles.touchableArea3pts]}
      />
      {/* 3pts area (all court except other zone) */}
      <Pressable
        onPress={
          !preGameMode
            ? (e) => handleZonePress(e.nativeEvent.pageX, e.nativeEvent.pageY)
            : undefined
        }
        style={[styles.court, styles.touchableArea3pts]}
      />
      {/* Paint top or left */}
      <Pressable
        onPress={
          !preGameMode
            ? (e) => handleZonePress(e.nativeEvent.pageX, e.nativeEvent.pageY)
            : undefined
        }
        style={[
          styles.paintLine,
          styles.paint,
          styles.paintTopOrLeft,
          styles.touchableAreaPaint,
        ]}
      />
      {/* Free throw circle top or left */}
      <View style={[styles.freeThrowCircle, styles.freeThrowCircleTopOrLeft]} />
      {/* 3pts line top or left */}
      <Pressable
        onPress={
          !preGameMode
            ? (e) => handleZonePress(e.nativeEvent.pageX, e.nativeEvent.pageY)
            : undefined
        }
        style={[
          styles.threePointLine,
          styles.threePointArc,
          styles.threePointArcTopOrLeft,
          styles.touchableArea2pts,
        ]}
      />
      {/* Middle line */}
      <View style={[styles.line, styles.midline]} />
      {/* Center circle */}
      <View style={[styles.line, styles.centerCircle]} />
      {/* 3pts line bottom or right */}
      <Pressable
        onPress={
          !preGameMode
            ? (e) => handleZonePress(e.nativeEvent.pageX, e.nativeEvent.pageY)
            : undefined
        }
        style={[
          styles.threePointLine,
          styles.threePointArc,
          styles.threePointArcBottomOrRight,
          styles.touchableArea2pts,
        ]}
      />
      {/* Free throw circle bottom or right */}
      <View
        style={[styles.freeThrowCircle, styles.freeThrowCircleBottomOrRight]}
      />
      {/* Paint bottom */}
      <Pressable
        onPress={
          !preGameMode
            ? (e) => handleZonePress(e.nativeEvent.pageX, e.nativeEvent.pageY)
            : undefined
        }
        style={[
          styles.paintLine,
          styles.paint,
          styles.paintBottomOrRight,
          styles.touchableAreaPaint,
        ]}
      />

      {/* Bouton pour démarrer le match */}
      {!initModalVisible && preGameMode && (
        <TouchableOpacity
          style={{
            position: "absolute",
            bottom: 30,
            right: 30,
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
  isPortrait,
}: {
  courtWidth: number;
  courtHeight: number;
  circleDiameter: number;
  keyWidth: number;
  keyHeight: number;
  threePointArcWidth: number;
  threePointArcHeight: number;
  CONTAINER_PADDING: number;
  isPortrait: boolean;
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
    court: {
      width: "100%",
      height: "100%",
      backgroundColor: "orange",
      borderRadius: 20,
      borderWidth: 4,
      borderColor: "#fff",
      overflow: "hidden",
      position: "relative",
    },
    touchableArea3pts: {
      position: "absolute",
      zIndex: 97,
    },
    // Les styles de l'ancien modal sont maintenant dans ActionModal.tsx

    line: {
      position: "absolute",
      backgroundColor: "#fff",
      zIndex: 99,
    },

    linetest: {
      position: "absolute",
      backgroundColor: "red",
      width: 2,
      height: 2,
      top: "50%",
      left: "50%",
      zIndex: 99,
    },
    // #region MIDLINE + CENTER CIRCLE
    midline: isPortrait
      ? {
          width: "100%",
          height: 2,
          top: "50%",
          transform: [{ translateY: -1 }],
        }
      : {
          width: 2,
          height: "100%",
          left: "50%",
          transform: [{ translateX: -1 }],
        },

    centerCircle: isPortrait
      ? {
          position: "absolute",
          borderWidth: 2,
          borderColor: "#fff",
          backgroundColor: "transparent",
          top: "50%",
          left: "50%",
          transform: [
            { translateY: -circleDiameter / 2 },
            { translateX: -circleDiameter / 2 },
          ],
          width: circleDiameter,
          height: circleDiameter,
          borderRadius: circleDiameter / 2,
        }
      : {
          position: "absolute",
          borderWidth: 2,
          borderColor: "#fff",
          backgroundColor: "transparent",
          top: "50%",
          left: "50%",
          transform: [
            { translateY: -circleDiameter / 2 },
            { translateX: -circleDiameter / 2 },
          ],
          width: circleDiameter,
          height: circleDiameter,
          borderRadius: circleDiameter / 2,
        },
    // #endregion

    // #region PAINT AREA ZONE
    touchableAreaPaint: {
      position: "absolute",
      zIndex: 99,
    },

    paintLine: {
      position: "absolute",
      borderWidth: 2,
      borderColor: "#fff",
      backgroundColor: "transparent",
    },

    paint: isPortrait
      ? {
          width: keyWidth,
          height: keyHeight,
        }
      : {
          width: keyWidth,
          height: keyHeight,
        },

    paintTopOrLeft: isPortrait
      ? {
          borderTopWidth: 0,
          left: courtWidth / 2 - keyWidth / 2,
          top: 0,
        }
      : {
          borderLeftWidth: 0,
          top: courtHeight / 2 - keyHeight / 2,
          left: 0,
        },
    paintBottomOrRight: isPortrait
      ? {
          borderBottomWidth: 0,
          left: courtWidth / 2 - keyWidth / 2,
          bottom: 0,
        }
      : {
          top: courtHeight / 2 - keyHeight / 2,
          right: 0,
        },

    // #endregion

    // #region FREE THROW AREA

    freeThrowCircle: {
      position: "absolute",
      width: circleDiameter,
      height: circleDiameter,
      borderRadius: circleDiameter / 2,
      borderWidth: 2,
      borderColor: "#fff",
      zIndex: 98,
    },

    freeThrowCircleTopOrLeft: isPortrait
      ? {
          left: courtWidth / 2 - circleDiameter / 2,
          top: keyHeight - circleDiameter / 2,
        }
      : {
          left: keyWidth - circleDiameter / 2,
          top: courtHeight / 2 - circleDiameter / 2,
        },
    freeThrowCircleBottomOrRight: isPortrait
      ? {
          left: courtWidth / 2 - circleDiameter / 2,
          bottom: keyHeight - circleDiameter / 2,
        }
      : {
          right: keyWidth - circleDiameter / 2,
          top: courtHeight / 2 - circleDiameter / 2,
        },
    // #endregion

    // #region 3 PTS AREA STYLES
    touchableArea2pts: {
      position: "absolute",
      zIndex: 98,
    },
    threePointLine: {
      borderColor: "#fff",
      borderWidth: 2,
      backgroundColor: "transparent",
    },
    threePointArc: isPortrait
      ? {
          width: "83%",
          height: "50%",
          borderTopLeftRadius: "100%",
          borderTopRightRadius: "100%",
          borderBottomWidth: 0,
        }
      : {
          width: "50%",
          height: "83%",
          borderTopRightRadius: "100%",
          borderBottomRightRadius: "100%",
          borderLeftWidth: 0,
        },
    threePointArcTopOrLeft: isPortrait
      ? {
          left: "8%",
          top: "-16%",
          transform: [{ rotate: "180deg" }],
        }
      : {
          top: "8%",
          left: "-17%",
        },
    threePointArcBottomOrRight: isPortrait
      ? {
          left: "8%",
          bottom: "-16%",
        }
      : {
          top: "8%",
          right: "-17%",
          transform: [{ rotate: "180deg" }],
        },
    // #endregion

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
  });
