import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { STATUS_COLORS } from "../../src/theme";

export const SPEED_OPTIONS = [
  { label: "LENT",   ms: 2000 },
  { label: "NORM",   ms: 1500 },
  { label: "RAPIDE", ms: 1000 },
] as const;

interface Props {
  isPlaying: boolean;
  isStepping: boolean;
  speed: number;
  showDefenders: boolean;
  hideArrows: boolean;
  sceneIndex: number;
  totalScenes: number;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onSpeedChange: (ms: number) => void;
  onToggleDefenders: () => void;
  onToggleHideArrows: () => void;
}

export default function PlaybackControls({
  isPlaying, isStepping, speed, showDefenders, hideArrows,
  sceneIndex, totalScenes,
  onTogglePlay, onStepForward, onSpeedChange, onToggleDefenders, onToggleHideArrows,
}: Props) {
  const { colors } = useTheme();
  const isLastScene = sceneIndex >= totalScenes - 1;
  const stepDisabled = totalScenes <= 1 || isPlaying || isStepping || isLastScene;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        {/* Play / Pause */}
        <TouchableOpacity
          onPress={onTogglePlay}
          disabled={totalScenes <= 1}
          style={[
            styles.playBtn,
            {
              backgroundColor: isPlaying ? "#f59e0b" : colors.primary,
              opacity: totalScenes <= 1 ? 0.4 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={isPlaying ? "pause" : "play"}
            size={20}
            color={colors.onPrimary}
          />
        </TouchableOpacity>

        {/* Step forward — anime jusqu'à l'étape suivante puis s'arrête */}
        <TouchableOpacity
          onPress={onStepForward}
          disabled={stepDisabled}
          style={[
            styles.stepBtn,
            { backgroundColor: colors.surfaceVariant, opacity: stepDisabled ? 0.35 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="skip-next" size={18} color={colors.text.secondary} />
        </TouchableOpacity>

        {/* Speed selector */}
        <View style={[styles.speedGroup, { backgroundColor: colors.surfaceVariant }]}>
          {SPEED_OPTIONS.map(({ label, ms }) => (
            <TouchableOpacity
              key={ms}
              onPress={() => onSpeedChange(ms)}
              style={[
                styles.speedBtn,
                speed === ms && { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.speedLabel, { color: speed === ms ? colors.primary : colors.text.secondary }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hide arrows toggle — only active during playback */}
        <TouchableOpacity
          onPress={onToggleHideArrows}
          disabled={!isPlaying}
          style={[
            styles.arrowBtn,
            {
              backgroundColor: hideArrows ? `${colors.primary}20` : colors.surfaceVariant,
              borderColor: hideArrows ? colors.primary : colors.border,
              opacity: !isPlaying ? 0.35 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={hideArrows ? "eye-off-outline" : "eye-outline"}
            size={13}
            color={hideArrows ? colors.primary : colors.text.secondary}
          />
          <Text style={[styles.arrowLabel, { color: hideArrows ? colors.primary : colors.text.secondary }]}>
            TRACÉS
          </Text>
        </TouchableOpacity>

        {/* Scene counter */}
        <View style={styles.counterRow}>
          <MaterialCommunityIcons
            name={isPlaying ? "play-circle" : "play-circle-outline"}
            size={13}
            color={isPlaying ? colors.primary : colors.text.secondary}
          />
          <Text style={[styles.counter, { color: colors.text.secondary }]}>
            {sceneIndex + 1}
            <Text style={{ color: colors.text.tertiary }}>
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
              backgroundColor: showDefenders ? `${STATUS_COLORS.errorLight}15` : colors.surfaceVariant,
              borderColor: showDefenders ? STATUS_COLORS.errorLight : colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={showDefenders ? "eye-outline" : "eye-off-outline"}
            size={13}
            color={showDefenders ? STATUS_COLORS.errorLight : colors.text.secondary}
          />
          <Text style={[styles.defLabel, { color: showDefenders ? STATUS_COLORS.errorLight : colors.text.secondary }]}>
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

  stepBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
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

  arrowBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
  },
  arrowLabel: { fontSize: 9, fontWeight: "900" },
});
