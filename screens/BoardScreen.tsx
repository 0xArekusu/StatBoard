import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";

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
  return (
    <View style={styles.container}>
      <View style={styles.court}>
        {/* Lignes de fond */}
        <View style={[styles.line, styles.baselineTop]} />
        <View style={[styles.line, styles.baselineBottom]} />

        {/* Ligne médiane */}
        <View style={[styles.line, styles.midline]} />

        {/* Cercle central */}
        <View style={styles.centerCircle} />

        {/* Raquettes */}
        <View style={[styles.key, styles.keyTop]} />
        <View style={[styles.key, styles.keyBottom]} />

        {/* Arcs des 3 points */}
        <View style={[styles.threePointArc, styles.arcTop]} />
        <View style={[styles.threePointArc, styles.arcBottom]} />

        {/* Lignes de lancer franc */}
        <View style={[styles.freeThrowLine, styles.freeThrowTop]} />
        <View style={[styles.freeThrowLine, styles.freeThrowBottom]} />

        {/* Cercles de lancer franc */}
        <View style={[styles.freeThrowCircle, styles.freeThrowCircleTop]} />
        <View style={[styles.freeThrowCircle, styles.freeThrowCircleBottom]} />
      </View>
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
});
