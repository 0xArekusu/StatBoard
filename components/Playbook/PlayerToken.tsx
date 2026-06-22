import React from "react";
import { Animated, View, Text, StyleSheet } from "react-native";

const POSITION_NAMES: Record<string, string> = {
  A1: "Meneur", A2: "Arrière", A3: "Ailier", A4: "Ailier F.", A5: "Pivot",
};

interface Props {
  tokenKey: string;
  animX: Animated.Value;
  animY: Animated.Value;
  visible?: boolean;
}

export default function PlayerToken({ tokenKey, animX, animY, visible = true }: Props) {
  if (!visible) return null;

  const isBall = tokenKey === "BALL";
  const isDef  = tokenKey.startsWith("D");
  const num    = tokenKey.replace("A", "").replace("D", "");

  if (isBall) {
    return <Animated.View style={[styles.ball, { left: animX, top: animY }]} />;
  }

  return (
    <Animated.View style={[styles.wrapper, { left: animX, top: animY }]}>
      <View style={[styles.circle, isDef ? styles.circleD : styles.circleA]}>
        <Text style={styles.num}>{isDef ? `D${num}` : num}</Text>
      </View>
      {!isDef && POSITION_NAMES[tokenKey] ? (
        <View style={styles.labelBg}>
          <Text style={styles.labelText} numberOfLines={1}>
            {POSITION_NAMES[tokenKey]}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    alignItems: "center",
    gap: 2,
  },
  circle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  circleA: { backgroundColor: "#4f46e5", borderWidth: 2, borderColor: "#818cf8" },
  circleD: { backgroundColor: "#dc2626", borderWidth: 2, borderColor: "#f87171" },
  num: { color: "#FFF", fontSize: 9, fontWeight: "900" },
  labelBg: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4,
  },
  labelText: { color: "#FFF", fontSize: 7, fontWeight: "700" },
  ball: {
    position: "absolute",
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#f97316", borderWidth: 1.5, borderColor: "#c2410c",
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
});
