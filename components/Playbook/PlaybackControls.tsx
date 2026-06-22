import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BRAND_COLORS, SLATE_COLORS } from "../../src/theme";

export const SPEED_OPTIONS = [
  { label: "LENT",   ms: 2000 },
  { label: "NORM",   ms: 1500 },
  { label: "RAPIDE", ms: 1000 },
] as const;

interface Props {
  isPlaying: boolean;
  speed: number;
  showDefenders: boolean;
  sceneIndex: number;
  totalScenes: number;
  onTogglePlay: () => void;
  onSpeedChange: (ms: number) => void;
  onToggleDefenders: () => void;
  isDark: boolean;
  surface: string;
  border: string;
  textSecondary: string;
}

export default function PlaybackControls({
  isPlaying, speed, showDefenders,
  sceneIndex, totalScenes,
  onTogglePlay, onSpeedChange, onToggleDefenders,
  isDark, surface, border, textSecondary,
}: Props) {
  return (
    <View style={[styles.container, { backgroundColor: surface, borderBottomColor: border }]}>
      <View style={styles.row}>
        {/* Play / Pause */}
        <TouchableOpacity
          onPress={onTogglePlay}
          disabled={totalScenes <= 1}
          style={[
            styles.playBtn,
            {
              backgroundColor: isPlaying ? "#f59e0b" : BRAND_COLORS[500],
              opacity: totalScenes <= 1 ? 0.4 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={isPlaying ? "pause" : "play"}
            size={20}
            color="#FFF"
          />
        </TouchableOpacity>

        {/* Speed selector */}
        <View style={[styles.speedGroup, { backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100] }]}>
          {SPEED_OPTIONS.map(({ label, ms }) => (
            <TouchableOpacity
              key={ms}
              onPress={() => onSpeedChange(ms)}
              style={[
                styles.speedBtn,
                speed === ms && { backgroundColor: isDark ? SLATE_COLORS[700] : "#FFFFFF" },
              ]}
            >
              <Text style={[styles.speedLabel, { color: speed === ms ? BRAND_COLORS[500] : textSecondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scene counter */}
        <View style={styles.counterRow}>
          <MaterialCommunityIcons
            name={isPlaying ? "play-circle" : "play-circle-outline"}
            size={13}
            color={isPlaying ? BRAND_COLORS[500] : textSecondary}
          />
          <Text style={[styles.counter, { color: textSecondary }]}>
            {sceneIndex + 1}
            <Text style={{ color: isDark ? SLATE_COLORS[600] : SLATE_COLORS[400] }}>
              {" / "}{totalScenes}
            </Text>
          </Text>
        </View>

        {/* Defenders toggle */}
        <TouchableOpacity
          onPress={onToggleDefenders}
          style={[
            styles.defBtn,
            {
              backgroundColor: showDefenders ? "#ef444415" : (isDark ? SLATE_COLORS[800] : SLATE_COLORS[100]),
              borderColor: showDefenders ? "#ef4444" : border,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={showDefenders ? "eye-outline" : "eye-off-outline"}
            size={13}
            color={showDefenders ? "#ef4444" : textSecondary}
          />
          <Text style={[styles.defLabel, { color: showDefenders ? "#ef4444" : textSecondary }]}>
            DEF
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },

  playBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },

  speedGroup: { flexDirection: "row", borderRadius: 10, padding: 3, gap: 2 },
  speedBtn: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7 },
  speedLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },

  counterRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  counter: { fontSize: 13, fontWeight: "900" },

  defBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
  },
  defLabel: { fontSize: 9, fontWeight: "900" },
});
