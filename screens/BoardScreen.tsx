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

  const [orientation, setOrientation] =
    useState<ScreenOrientation.Orientation | null>(null);
  const [isReady, setIsReady] = useState(false); // Used to delay rendering until orientation is locked

  useEffect(() => {
    const prepareOrientation = async () => {
      // Lock screen in landscape mode before calculating layout
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
      const current = await ScreenOrientation.getOrientationAsync();
      setOrientation(current);
      setIsReady(true); // Now safe to render
    };

    prepareOrientation();

    // Subscribe to orientation changes (optional but helpful)
    const subscription = ScreenOrientation.addOrientationChangeListener(
      ({ orientationInfo }) => {
        setOrientation(orientationInfo.orientation);
      }
    );

    // Cleanup
    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
      ScreenOrientation.unlockAsync(); // Restore system default when leaving
    };
  }, []);

  // Determine if orientation is portrait (used for layout decisions)
  const isPortrait =
    orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
    orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN;

  // Calculate court and geometry layout based on screen size and orientation
  const {
    courtWidth,
    courtHeight,
    circleDiameter,
    keyWidth,
    keyHeight,
    threePointArcWidth,
    threePointArcHeight,
    threePointArcSideWidth,
    threePointArcSideHeight,
    styles,
  } = useMemo(() => {
    const MARGIN_GLOBAL = 0;

    const courtWidth = isPortrait
      ? window.width - insets.left - insets.right
      : window.width - MARGIN_GLOBAL * 2;

    const courtHeight = isPortrait
      ? window.height - insets.top - insets.bottom - MARGIN_GLOBAL * 2
      : window.height - insets.top - insets.bottom;

    console.log(courtHeight);
    console.log(courtWidth);
    console.log(window.height);
    console.log(window.width);

    const circleDiameter = courtWidth * 0.2;
    const keyWidth = courtWidth * 0.3;
    const keyHeight = courtHeight * 0.24;
    const threePointArcWidth = courtWidth * 0.88;
    const threePointArcHeight = courtHeight * 0.68;
    const threePointArcSideWidth = courtWidth * 0.88;
    const threePointArcSideHeight = keyHeight - circleDiameter / 2.5;

    // Generate styles based on layout
    const styles = getStyles({
      courtWidth,
      courtHeight,
      circleDiameter,
      keyWidth,
      keyHeight,
      threePointArcWidth,
      threePointArcHeight,
      threePointArcSideWidth,
      threePointArcSideHeight,
    });

    return {
      courtWidth,
      courtHeight,
      circleDiameter,
      keyWidth,
      keyHeight,
      threePointArcWidth,
      threePointArcHeight,
      threePointArcSideWidth,
      threePointArcSideHeight,
      styles,
    };
  }, [orientation, window, insets]);

  // Modal state and position
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({
    x: 0,
    y: 0,
    pointerX: 0,
    showPointerOnTop: true,
    clickX: 0,
  });
  const [selectedZone, setSelectedZone] = useState("");

  // Calculate modal coordinates based on click position
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

    const clickXRelativeToModal = x - modalX;
    const pointerX = Math.min(
      Math.max(MODAL_CONTENT_PADDING, clickXRelativeToModal),
      MODAL_WIDTH - MODAL_CONTENT_PADDING
    );

    return {
      x: modalX,
      y: modalY,
      pointerX,
      showPointerOnTop,
      clickX: x,
    };
  };

  // Handle zone press to open action modal
  const handleZonePress = (zone: string, x: number, y: number) => {
    setSelectedZone(zone);
    const position = calculateModalPosition(x, y);
    setModalPosition(position);
    setActionModalVisible(true);
  };

  const handleActionSelect = (action: string) => {
    console.log(`Action: ${action} in zone: ${selectedZone}`);
    setActionModalVisible(false);
  };

  // Delay rendering until orientation is set to LANDSCAPE
  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: "black" }} />;
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={(e) =>
          handleZonePress("3 pts", e.nativeEvent.pageX, e.nativeEvent.pageY)
        }
        style={[styles.court, styles.touchableArea3pts]}
      />

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
              {
                left: modalPosition.x,
                top: modalPosition.y,
              },
            ]}
          >
            <View
              style={[
                styles.pointer,
                modalPosition.showPointerOnTop
                  ? styles.pointerTop
                  : styles.pointerBottom,
                {
                  left: modalPosition.pointerX - POINTER_SIZE,
                  transform: modalPosition.showPointerOnTop
                    ? [{ translateX: 0 }, { rotate: "180deg" }]
                    : [{ translateX: 0 }],
                },
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
  threePointArcSideWidth,
  threePointArcSideHeight,
}: {
  courtWidth: number;
  courtHeight: number;
  circleDiameter: number;
  keyWidth: number;
  keyHeight: number;
  threePointArcWidth: number;
  threePointArcHeight: number;
  threePointArcSideWidth: number;
  threePointArcSideHeight: number;
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#2e7d32",
      width: courtWidth,
      height: courtHeight,
      padding: 20,
    },
    court: {
      width: "100%",
      height: "100%",
      backgroundColor: "orange",
      borderRadius: 20,
      borderWidth: 4,
      borderColor: "#fff",
      overflow: "hidden",
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
  });
