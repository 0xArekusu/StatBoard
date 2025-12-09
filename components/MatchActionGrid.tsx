import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SLATE_COLORS, STATUS_COLORS } from "../src/theme/clubDefaults";

type EventType =
  | "POINT_1"
  | "POINT_2"
  | "POINT_3"
  | "MISS_1"
  | "MISS_2"
  | "MISS_3"
  | "FOUL"
  | "REBOUND_DEF"
  | "REBOUND_OFF"
  | "ASSIST"
  | "STEAL"
  | "BLOCK"
  | "TURNOVER"
  | "SUBSTITUTION"
  | "POINT";

type FilterMode = "ALL" | "SHOOTING" | "REBOUNDS" | "FOULS" | "TURNOVERS" | "BLOCKS" | "STEALS";

interface MatchActionGridProps {
  onAction: (type: EventType, value?: number) => void;
  isDark: boolean;
  filterMode?: FilterMode;
}

export const MatchActionGrid: React.FC<MatchActionGridProps> = ({ onAction, isDark, filterMode = "ALL" }) => {
  const shouldShowAction = (actionType: string): boolean => {
    if (filterMode === "ALL") return true;

    if (filterMode === "SHOOTING") {
      return ["POINT_1", "POINT_2", "POINT_3", "MISS_1", "MISS_2", "MISS_3"].includes(actionType);
    }

    if (filterMode === "REBOUNDS") {
      return ["REBOUND_DEF", "REBOUND_OFF"].includes(actionType);
    }

    if (filterMode === "FOULS") {
      return actionType === "FOUL";
    }

    if (filterMode === "TURNOVERS") {
      return actionType === "TURNOVER";
    }

    if (filterMode === "BLOCKS") {
      return actionType === "BLOCK";
    }

    if (filterMode === "STEALS") {
      return actionType === "STEAL";
    }

    return true;
  };

  return (
  <View style={styles.actionGrid}>
    {/* Row 1: Scoring Positive */}
    {(shouldShowAction("POINT_1") || shouldShowAction("POINT_2") || shouldShowAction("POINT_3")) && (
      <View style={styles.actionRow}>
        {shouldShowAction("POINT_1") && (
          <ActionButton
            onPress={() => onAction("POINT_1", 1)}
            label="+1"
            sub="Lancer"
            color={STATUS_COLORS.success}
          />
        )}
        {shouldShowAction("POINT_2") && (
          <ActionButton
            onPress={() => onAction("POINT_2", 2)}
            label="+2"
            sub="Points"
            color="#4ade80"
          />
        )}
        {shouldShowAction("POINT_3") && (
          <ActionButton
            onPress={() => onAction("POINT_3", 3)}
            label="+3"
            sub="Points"
            color="#86efac"
          />
        )}
      </View>
    )}

    {/* Row 2: Scoring Negative (Misses) */}
    {(shouldShowAction("MISS_1") || shouldShowAction("MISS_2") || shouldShowAction("MISS_3")) && (
      <View style={[styles.actionRow, { height: 64 }]}>
        {shouldShowAction("MISS_1") && (
          <ActionButton
            onPress={() => onAction("MISS_1", 0)}
            label="Raté"
            sub="Lancer"
            color={isDark ? SLATE_COLORS[800] : SLATE_COLORS[200]}
            textColor="#ef4444"
          />
        )}
        {shouldShowAction("MISS_2") && (
          <ActionButton
            onPress={() => onAction("MISS_2", 0)}
            label="Raté"
            sub="2 Pts"
            color={isDark ? SLATE_COLORS[800] : SLATE_COLORS[200]}
            textColor="#ef4444"
          />
        )}
        {shouldShowAction("MISS_3") && (
          <ActionButton
            onPress={() => onAction("MISS_3", 0)}
            label="Raté"
            sub="3 Pts"
            color={isDark ? SLATE_COLORS[800] : SLATE_COLORS[200]}
            textColor="#ef4444"
          />
        )}
      </View>
    )}

    {/* Row 3: Rebounds */}
    {(shouldShowAction("REBOUND_DEF") || shouldShowAction("REBOUND_OFF")) && (
      <View style={[styles.actionRow, { height: 80 }]}>
        {shouldShowAction("REBOUND_DEF") && (
          <ActionButton
            onPress={() => onAction("REBOUND_DEF")}
            label="REB DEF"
            sub="Défensif"
            color="#2563eb"
          />
        )}
        {shouldShowAction("REBOUND_OFF") && (
          <ActionButton
            onPress={() => onAction("REBOUND_OFF")}
            label="REB OFF"
            sub="Offensif"
            color="#06b6d4"
          />
        )}
      </View>
    )}

    {/* Row 4: Other Stats */}
    {(shouldShowAction("ASSIST") || shouldShowAction("STEAL") || shouldShowAction("BLOCK") || shouldShowAction("FOUL")) && (
      <View style={styles.actionRow}>
        {shouldShowAction("ASSIST") && (
          <ActionButton
            onPress={() => onAction("ASSIST")}
            label="PASSE D"
            sub="Assist"
            color="#6366f1"
          />
        )}
        {shouldShowAction("STEAL") && (
          <ActionButton
            onPress={() => onAction("STEAL")}
            label="INTERC"
            sub="Vol"
            color="#8b5cf6"
          />
        )}
        {(shouldShowAction("BLOCK") || shouldShowAction("FOUL")) && (
          <View style={styles.miniColumn}>
            {shouldShowAction("BLOCK") && (
              <ActionButton
                onPress={() => onAction("BLOCK")}
                label="CONTRE"
                color={SLATE_COLORS[600]}
                textSize={14}
              />
            )}
            {shouldShowAction("FOUL") && (
              <ActionButton
                onPress={() => onAction("FOUL")}
                label="FAUTE"
                color="#b91c1c"
                textSize={14}
              />
            )}
          </View>
        )}
      </View>
    )}

    {/* Row 5: Turnover */}
    {shouldShowAction("TURNOVER") && (
      <View style={[styles.actionRow, { height: 56 }]}>
        <ActionButton
          onPress={() => onAction("TURNOVER")}
          label="BALLE PERDUE"
          color="#ea580c"
        />
      </View>
    )}
  </View>
);};

interface ActionButtonProps {
  onPress: () => void;
  label: string;
  sub?: string;
  color: string;
  textColor?: string;
  textSize?: number;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onPress,
  label,
  sub,
  color,
  textColor,
  textSize = 16,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.actionButton, { backgroundColor: color }]}
  >
    <Text
      style={[
        styles.actionButtonLabel,
        { color: textColor || "#fff", fontSize: textSize },
      ]}
    >
      {label}
    </Text>
    {sub && (
      <Text style={[styles.actionButtonSub, { color: textColor || "#fff" }]}>{sub}</Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  actionGrid: {
    padding: 12,
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    height: 88,
  },
  miniColumn: {
    flex: 1,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  actionButtonSub: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.8,
  },
});
