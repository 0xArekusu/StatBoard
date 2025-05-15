import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Text,
  Modal,
} from "react-native";

const MARGIN = 20;

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
const courtWidth = windowWidth - MARGIN * 2;
const courtHeight = windowHeight - MARGIN * 2;

// Proportion pour le cercle central et les cercles de lancer franc
const circleDiameter = courtWidth * 0.2;
const keyWidth = courtWidth * 0.3;
const keyHeight = courtHeight * 0.24;
const threePointArcWidth = courtWidth * 0.88;
const threePointArcHeight = courtHeight * 0.68;
const threePointArcSideWidth = courtWidth * 0.88;
const threePointArcSideHeight = keyHeight - circleDiameter / 2.5;

export default function BasketballCourt() {
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [shootingZone, setShootingZone] = useState("");

  const showPopup = (zone: string, x: number, y: number) => {
    setShootingZone(zone);
    setPopupPosition({ x, y });
    setPopupVisible(true);
    setTimeout(() => setPopupVisible(false), 1500);
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback
        onPress={(e) =>
          showPopup("3 pts", e.nativeEvent.pageX, e.nativeEvent.pageY)
        }
      >
        <View style={[styles.court, styles.touchableArea3pts]}>
          {/* Lignes de fond */}
          <View style={[styles.line, styles.baselineTop]} />
          <View style={[styles.line, styles.baselineBottom]} />

          {/* Ligne médiane */}
          <View style={[styles.line, styles.midline]} />

          {/* Cercle central */}
          <View style={styles.centerCircle} />

          {/* Raquettes avec zones tactiles */}
          <TouchableWithoutFeedback
            onPress={(e) =>
              showPopup("Raquette", e.nativeEvent.pageX, e.nativeEvent.pageY)
            }
          >
            <View
              style={[styles.key, styles.keyTop, styles.touchableAreaPaint]}
            />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback
            onPress={(e) =>
              showPopup("Raquette", e.nativeEvent.pageX, e.nativeEvent.pageY)
            }
          >
            <View
              style={[styles.key, styles.keyBottom, styles.touchableAreaPaint]}
            />
          </TouchableWithoutFeedback>

          {/* Zone à 3 points */}
          <View style={[styles.threePointArea, styles.threePointAreaTop]} />
          <View style={[styles.threePointArea, styles.threePointAreaBottom]} />

          {/* Arcs des 3 points (visuels) */}
          <TouchableWithoutFeedback
            onPress={(e) =>
              showPopup("2 pts", e.nativeEvent.pageX, e.nativeEvent.pageY)
            }
          >
            <View
              style={[
                styles.threePointArc,
                styles.arcTop,
                styles.touchableArea2pts,
              ]}
            />
          </TouchableWithoutFeedback>

          <TouchableWithoutFeedback
            onPress={(e) =>
              showPopup("2 pts", e.nativeEvent.pageX, e.nativeEvent.pageY)
            }
          >
            <View
              style={[
                styles.threePointArc,
                styles.arcBottom,
                styles.touchableArea2pts,
              ]}
            />
          </TouchableWithoutFeedback>

          {/* Lignes de lancer franc */}
          <View style={[styles.freeThrowLine, styles.freeThrowTop]} />
          <View style={[styles.freeThrowLine, styles.freeThrowBottom]} />

          {/* Cercles de lancer franc */}
          <View style={[styles.freeThrowCircle, styles.freeThrowCircleTop]} />
          <View
            style={[styles.freeThrowCircle, styles.freeThrowCircleBottom]}
          />
        </View>
      </TouchableWithoutFeedback>

      <Modal
        transparent={true}
        visible={popupVisible}
        animationType="fade"
        onRequestClose={() => setPopupVisible(false)}
      >
        <View
          style={[
            styles.popup,
            {
              left: popupPosition.x - 75,
              top: popupPosition.y - 40,
            },
          ]}
        >
          <Text style={styles.popupText}>{shootingZone}</Text>
        </View>
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
});
