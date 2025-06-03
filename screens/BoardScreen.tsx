import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
} from "react-native";

const MARGIN = 20;

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
const courtWidth = windowWidth - MARGIN * 2;
const courtHeight = windowHeight - MARGIN * 2;

// Proportions for the center circle and free throw circles
const circleDiameter = courtWidth * 0.2;
const keyWidth = courtWidth * 0.3;
const keyHeight = courtHeight * 0.24;
const threePointArcWidth = courtWidth * 0.88;
const threePointArcHeight = courtHeight * 0.68;
const threePointArcSideWidth = courtWidth * 0.88;
const threePointArcSideHeight = keyHeight - circleDiameter / 2.5;

const MODAL_WIDTH = 200;
const MODAL_HEIGHT = 180;
const MODAL_PADDING = 20;
const POINTER_SIZE = 8;
const MODAL_OFFSET_TOP = 10;
const MODAL_OFFSET_BOTTOM = 50;
const MODAL_CONTENT_PADDING = 16; // Padding inside the modal

export default function BasketballCourt() {
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({
    x: 0,
    y: 0,
    pointerX: 0,
    showPointerOnTop: true,
    clickX: 0,
  });
  const [selectedZone, setSelectedZone] = useState("");

  const calculateModalPosition = (x: number, y: number) => {
    // Determine if we need to show pointer on top or bottom
    const showPointerOnTop = y < windowHeight / 2;

    // Calculate initial position
    let modalX = x - MODAL_WIDTH / 2;
    let modalY;

    if (showPointerOnTop) {
      modalY = y - MODAL_OFFSET_TOP;
    } else {
      modalY = y - MODAL_HEIGHT - MODAL_OFFSET_BOTTOM;
    }

    // Ensure modal stays within screen bounds
    modalX = Math.max(
      MODAL_PADDING,
      Math.min(windowWidth - MODAL_WIDTH - MODAL_PADDING, modalX)
    );
    modalY = Math.max(
      MODAL_PADDING,
      Math.min(windowHeight - MODAL_HEIGHT - MODAL_PADDING, modalY)
    );

    // Calculate pointer position relative to modal content
    // We need to account for the modal's padding and the pointer's width
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
      clickX: x, // Store the original click X position
    };
  };

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

  return (
    <View style={styles.container}>
      <Pressable
        onPress={(e) =>
          handleZonePress("3 pts", e.nativeEvent.pageX, e.nativeEvent.pageY)
        }
        style={[styles.court, styles.touchableArea3pts]}
      >
        <View style={[styles.court, styles.touchableArea3pts]}>
          {/* Bottom line */}
          <View style={[styles.line, styles.baselineTop]} />
          {/* Top line */}
          <View style={[styles.line, styles.baselineBottom]} />

          {/* Middle line */}
          <View style={[styles.line, styles.midline]} />

          {/* Center circle */}
          <View style={styles.centerCircle} />

          {/* PAINT AREA */}

          {/* Paint top */}
          <Pressable
            onPress={(e) =>
              handleZonePress(
                "Raquette",
                e.nativeEvent.pageX,
                e.nativeEvent.pageY
              )
            }
            style={[styles.key, styles.keyTop, styles.touchableAreaPaint]}
          />

          {/* Paint bottom */}
          <Pressable
            onPress={(e) =>
              handleZonePress(
                "Raquette",
                e.nativeEvent.pageX,
                e.nativeEvent.pageY
              )
            }
            style={[styles.key, styles.keyBottom, styles.touchableAreaPaint]}
          />

          {/* 3 PTS AREA */}

          {/* 3pts top */}
          <Pressable
            onPress={(e) =>
              handleZonePress("2 pts", e.nativeEvent.pageX, e.nativeEvent.pageY)
            }
            style={[
              styles.threePointArc,
              styles.arcTop,
              styles.touchableArea2pts,
            ]}
          />

          {/* 3pts bottom */}
          <Pressable
            onPress={(e) =>
              handleZonePress("2 pts", e.nativeEvent.pageX, e.nativeEvent.pageY)
            }
            style={[
              styles.threePointArc,
              styles.arcBottom,
              styles.touchableArea2pts,
            ]}
          />

          {/* Free throw circle */}
          <View style={[styles.freeThrowCircle, styles.freeThrowCircleTop]} />
          <View
            style={[styles.freeThrowCircle, styles.freeThrowCircleBottom]}
          />
        </View>
      </Pressable>

      <Modal
        transparent={true}
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
            {modalPosition.showPointerOnTop ? (
              <View
                style={[
                  styles.pointer,
                  styles.pointerTop,
                  {
                    left: modalPosition.pointerX - POINTER_SIZE,
                    // Add a small adjustment to account for the pointer's width
                    transform: [{ translateX: 0 }, { rotate: "180deg" }],
                  },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.pointer,
                  styles.pointerBottom,
                  {
                    left: modalPosition.pointerX - POINTER_SIZE,
                    transform: [{ translateX: 0 }],
                  },
                ]}
              />
            )}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2e7d32",
  },
  court: {
    width: courtWidth,
    height: courtHeight,
    backgroundColor: "orange",
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "#fff",
    position: "relative",
    overflow: "hidden",
  },
  line: {
    position: "absolute",
    width: courtWidth,
    height: 2,
    backgroundColor: "#fff",
  },
  baselineTop: { top: 0 },
  baselineBottom: { bottom: 0 },
  midline: { top: courtHeight / 2 - 1 },

  centerCircle: {
    position: "absolute",
    top: courtHeight / 2 - circleDiameter / 2,
    left: courtWidth / 2 - circleDiameter / 2,
    width: circleDiameter,
    height: circleDiameter,
    borderRadius: circleDiameter / 2,
    borderWidth: 2,
    borderColor: "#fff",
  },
  key: {
    position: "absolute",
    width: keyWidth,
    height: keyHeight,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "transparent",
  },
  keyTop: { left: courtWidth / 2 - keyWidth / 2, top: 0 },
  keyBottom: { left: courtWidth / 2 - keyWidth / 2, bottom: 0 },

  threePointArc: {
    position: "absolute",
    width: threePointArcWidth,
    height: threePointArcHeight,
    borderWidth: 2,
    borderColor: "#fff",
    borderTopLeftRadius: threePointArcWidth / 2,
    borderTopRightRadius: threePointArcWidth / 2,
    borderBottomWidth: 0,
    backgroundColor: "transparent",
  },

  threePoint: {
    position: "absolute",
    width: threePointArcSideWidth,
    height: threePointArcSideHeight,
    left: (courtWidth - threePointArcWidth) / 2,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    borderWidth: 0,
    borderColor: "blue",
    borderBottomWidth: 2,
    backgroundColor: "transparent",
  },

  arcTop: {
    left: (courtWidth - threePointArcWidth) / 2,
    top: -threePointArcHeight / 2,
    transform: [{ rotate: "180deg" }],
  },
  arcBottom: {
    left: (courtWidth - threePointArcWidth) / 2,
    bottom: -threePointArcHeight / 2,
  },

  freeThrowLine: {
    position: "absolute",
    width: keyWidth,
    height: 2,
    backgroundColor: "#fff",
  },
  freeThrowTop: { left: courtWidth / 2 - keyWidth / 2, top: keyHeight },
  freeThrowBottom: { left: courtWidth / 2 - keyWidth / 2, bottom: keyHeight },

  freeThrowCircle: {
    position: "absolute",
    width: circleDiameter,
    height: circleDiameter,
    borderRadius: circleDiameter / 2,
    borderWidth: 2,
    borderColor: "#fff",
  },
  freeThrowCircleTop: {
    left: courtWidth / 2 - circleDiameter / 2,
    top: keyHeight - circleDiameter / 2,
  },
  freeThrowCircleBottom: {
    left: courtWidth / 2 - circleDiameter / 2,
    bottom: keyHeight - circleDiameter / 2,
  },

  popup: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 10,
    borderRadius: 8,
    width: 150,
    alignItems: "center",
  },
  popupText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  touchableAreaPaint: {
    position: "absolute",
    zIndex: 99,
  },
  touchableArea2pts: {
    position: "absolute",
    zIndex: 98,
  },
  touchableArea3pts: {
    position: "absolute",
    zIndex: 97,
  },
  threePointArea: {
    position: "absolute",
    width: threePointArcWidth,
    height: threePointArcHeight / 2,
    zIndex: 1,
  },
  threePointAreaTop: {
    left: (courtWidth - threePointArcWidth) / 2,
    top: 0,
  },
  threePointAreaBottom: {
    left: (courtWidth - threePointArcWidth) / 2,
    bottom: 0,
  },
  twoPointArea: {
    position: "absolute",
    width: courtWidth - threePointArcWidth,
    height: courtHeight / 2 - keyHeight,
    zIndex: 1,
  },
  twoPointAreaTop: {
    left: threePointArcWidth / 2,
    top: keyHeight,
  },
  twoPointAreaBottom: {
    left: threePointArcWidth / 2,
    bottom: keyHeight,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    zIndex: 1, // Ensure pointer is above the modal
  },
  pointerTop: {
    top: -POINTER_SIZE,
    transform: [{ rotate: "180deg" }],
  },
  pointerBottom: {
    bottom: -POINTER_SIZE,
  },
});
