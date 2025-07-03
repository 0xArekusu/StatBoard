import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ScreenOrientation from "expo-screen-orientation";
import InitTeamModal from "./InitTeamModal";

// Modal layout constants
const MODAL_WIDTH = 200;
const MODAL_HEIGHT = 180;
const MODAL_PADDING = 20;
const POINTER_SIZE = 8;
const MODAL_OFFSET_TOP = 10;
const MODAL_OFFSET_BOTTOM = 50;
const MODAL_CONTENT_PADDING = 16;

export default function BasketballCourt() {
  const insets = useSafeAreaInsets(); // Provides status bar and notch margins
  const window = useWindowDimensions(); // Automatically reacts to rotation
  const [showSheet, setShowSheet] = useState(true);

  const [orientation, setOrientation] =
    useState<ScreenOrientation.Orientation | null>(null); // Used to delay rendering until orientation is locked
  const [isReady, setIsReady] = useState(false);

  // Markers state: stores events (tir, rebond, faute)
  const [markers, setMarkers] = useState<
    {
      x: number;
      y: number;
      type: string;
    }[]
  >([]);

  // Ajout du state pour le popup d'initialisation
  const [initModalVisible, setInitModalVisible] = useState(true);
  const [teamA, setTeamA] = useState("Team A");
  const [teamB, setTeamB] = useState("Team B");

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
  const [selectedZone, setSelectedZone] = useState("");

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

  const handleZonePress = (zone: string, x: number, y: number) => {
    setSelectedZone(zone);
    const pos = calculateModalPosition(x, y);
    setModalPosition(pos);
    setActionModalVisible(true);
  };

  const handleActionSelect = (action: string) => {
    // Add marker at click position
    setMarkers((prev) => [
      ...prev,
      {
        x: modalPosition.clickX - 12,
        y: modalPosition.clickY - 50,
        type: action,
      },
    ]);
    setActionModalVisible(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <InitTeamModal
        visible={initModalVisible}
        teamA={teamA}
        setTeamA={setTeamA}
        teamB={teamB}
        setTeamB={setTeamB}
        onConfirm={() => setInitModalVisible(false)}
        isConfirmDisabled={isConfirmDisabled}
        getFormattedDate={getFormattedDate}
      />
      {/* Render markers */}
      {markers.map((m, i) => {
        let icon = "";
        if (m.type === "tir") icon = "◯";
        else if (m.type === "rebond") icon = "❌";
        else if (m.type === "faute") icon = "⚠️";
        return (
          <Text key={i} style={[styles.marker, { left: m.x, top: m.y }]}>
            {icon}
          </Text>
        );
      })}

      {/* 3pts area */}
      <Pressable
        onPress={(e) =>
          handleZonePress("3 pts", e.nativeEvent.pageX, e.nativeEvent.pageY)
        }
        style={[styles.court, styles.touchableArea3pts]}
      />
      {/* 3pts area (all court except other zone) */}
      <Pressable
        onPress={(e) =>
          handleZonePress("3 pts", e.nativeEvent.pageX, e.nativeEvent.pageY)
        }
        style={[styles.court, styles.touchableArea3pts]}
      />
      {/* Paint top or left */}
      <Pressable
        onPress={(e) =>
          handleZonePress("Raquette", e.nativeEvent.pageX, e.nativeEvent.pageY)
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
        onPress={(e) =>
          handleZonePress("2 pts", e.nativeEvent.pageX, e.nativeEvent.pageY)
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
        onPress={(e) =>
          handleZonePress("2 pts", e.nativeEvent.pageX, e.nativeEvent.pageY)
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
        onPress={(e) =>
          handleZonePress("Raquette", e.nativeEvent.pageX, e.nativeEvent.pageY)
        }
        style={[
          styles.paintLine,
          styles.paint,
          styles.paintBottomOrRight,
          styles.touchableAreaPaint,
        ]}
      />

      {/* Action Modal */}
      <Modal
        transparent
        visible={actionModalVisible}
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActionModalVisible(false)}
        >
          <View
            style={[
              styles.actionModal,
              { left: modalPosition.x, top: modalPosition.y },
            ]}
          >
            <View
              style={[
                styles.pointer,
                modalPosition.showPointerOnTop
                  ? styles.pointerTop
                  : styles.pointerBottom,
                { left: modalPosition.pointerX - POINTER_SIZE },
              ]}
            />
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionSelect("tir")}
            >
              <Text style={styles.actionButtonText}>🏀 Tir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionSelect("rebond")}
            >
              <Text style={styles.actionButtonText}>📥 Rebond</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionSelect("faute")}
            >
              <Text style={styles.actionButtonText}>⚠️ Faute</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Pastilles des joueurs */}
      {[
        // Meneur (tête de raquette)
        {
          num: 4,
          left: courtWidth / 2 - 20,
          top: keyHeight - 50,
        },
        // Ailier gauche
        {
          num: 5,
          left: courtWidth / 2 - keyWidth / 2 - 40,
          top: keyHeight,
        },
        // Ailier droit
        {
          num: 6,
          left: courtWidth / 2 + keyWidth / 2,
          top: keyHeight,
        },
        // Intérieur gauche
        {
          num: 7,
          left: courtWidth / 2 - keyWidth / 4 - 30,
          top: keyHeight + keyHeight / 2,
        },
        // Intérieur droit
        {
          num: 8,
          left: courtWidth / 2 + keyWidth / 4 + 10,
          top: keyHeight + keyHeight / 2,
        },
      ].map((player) => (
        <View
          key={player.num}
          style={{
            position: "absolute",
            left: player.left,
            top: player.top,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#1976d2",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "#fff",
            zIndex: 200,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
            {player.num}
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
      backgroundColor: "#2e7d32",
      width: courtWidth,
      height: courtHeight,
      padding: CONTAINER_PADDING,
      position: "relative",
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
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    actionModal: {
      position: "absolute",
      backgroundColor: "white",
      borderRadius: 12,
      padding: MODAL_CONTENT_PADDING,
      width: MODAL_WIDTH,
      minHeight: MODAL_HEIGHT,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    actionButton: {
      backgroundColor: "#f0f0f0",
      padding: 12,
      borderRadius: 8,
      marginVertical: 4,
      alignItems: "center",
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: "600",
    },
    pointer: {
      position: "absolute",
      width: 0,
      height: 0,
      borderLeftWidth: POINTER_SIZE,
      borderRightWidth: POINTER_SIZE,
      borderTopWidth: POINTER_SIZE,
      borderStyle: "solid",
      backgroundColor: "transparent",
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: "white",
      zIndex: 1,
    },
    pointerTop: {
      top: -POINTER_SIZE,
      transform: [{ rotate: "180deg" }],
    },
    pointerBottom: {
      bottom: -POINTER_SIZE,
    },

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

    marker: {
      position: "absolute",
      fontSize: 24,
      zIndex: 100,
    },
  });
