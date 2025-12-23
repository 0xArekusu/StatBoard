import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SLATE_COLORS, STATUS_COLORS } from "../src/theme";
import { EventType, FilterMode } from "../constants/liveMatchConstants";

interface MatchActionGridProps {
  onAction: (type: EventType, value?: number) => void;
  isDark: boolean;
  filterMode?: FilterMode;
}

export const MatchActionGrid: React.FC<MatchActionGridProps> = ({ onAction, isDark, filterMode = FilterMode.ALL }) => {
  const shouldShowAction = (actionType: EventType): boolean => {
    if (filterMode === FilterMode.ALL) return true;

    if (filterMode === FilterMode.SHOOTING) {
      return [EventType.POINT_1, EventType.POINT_2, EventType.POINT_3, EventType.MISS_1, EventType.MISS_2, EventType.MISS_3].includes(actionType);
    }

    if (filterMode === FilterMode.REBOUNDS) {
      return [EventType.REBOUND_DEF, EventType.REBOUND_OFF].includes(actionType);
    }

    if (filterMode === FilterMode.FOULS) {
      return actionType === EventType.FOUL;
    }

    if (filterMode === FilterMode.TURNOVERS) {
      return actionType === EventType.TURNOVER;
    }

    if (filterMode === FilterMode.BLOCKS) {
      return actionType === EventType.BLOCK;
    }

    if (filterMode === FilterMode.STEALS) {
      return actionType === EventType.STEAL;
    }

    return true;
  };

  return (
  <View style={styles.actionGrid}>
    {/* Row 1: Scoring Positive */}
    {(shouldShowAction(EventType.POINT_1) || shouldShowAction(EventType.POINT_2) || shouldShowAction(EventType.POINT_3)) && (
      <View style={styles.actionRow}>
        {shouldShowAction(EventType.POINT_1) && (
          <ActionButton
            onPress={() => onAction(EventType.POINT_1, 1)}
            label="+1"
            sub="Lancer"
            color={STATUS_COLORS.success}
          />
        )}
        {shouldShowAction(EventType.POINT_2) && (
          <ActionButton
            onPress={() => onAction(EventType.POINT_2, 2)}
            label="+2"
            sub="Points"
            color="#4ade80"
          />
        )}
        {shouldShowAction(EventType.POINT_3) && (
          <ActionButton
            onPress={() => onAction(EventType.POINT_3, 3)}
            label="+3"
            sub="Points"
            color="#86efac"
          />
        )}
      </View>
    )}

    {/* Row 2: Scoring Negative (Misses) */}
    {(shouldShowAction(EventType.MISS_1) || shouldShowAction(EventType.MISS_2) || shouldShowAction(EventType.MISS_3)) && (
      <View style={[styles.actionRow, { height: 64 }]}>
        {shouldShowAction(EventType.MISS_1) && (
          <ActionButton
            onPress={() => onAction(EventType.MISS_1, 0)}
            label="Raté"
            sub="Lancer"
            color={isDark ? SLATE_COLORS[800] : SLATE_COLORS[200]}
            textColor="#ef4444"
          />
        )}
        {shouldShowAction(EventType.MISS_2) && (
          <ActionButton
            onPress={() => onAction(EventType.MISS_2, 0)}
            label="Raté"
            sub="2 Pts"
            color={isDark ? SLATE_COLORS[800] : SLATE_COLORS[200]}
            textColor="#ef4444"
          />
        )}
        {shouldShowAction(EventType.MISS_3) && (
          <ActionButton
            onPress={() => onAction(EventType.MISS_3, 0)}
            label="Raté"
            sub="3 Pts"
            color={isDark ? SLATE_COLORS[800] : SLATE_COLORS[200]}
            textColor="#ef4444"
          />
        )}
      </View>
    )}

    {/* Row 3: Rebounds */}
    {(shouldShowAction(EventType.REBOUND_DEF) || shouldShowAction(EventType.REBOUND_OFF)) && (
      <View style={[styles.actionRow, { height: 80 }]}>
        {shouldShowAction(EventType.REBOUND_DEF) && (
          <ActionButton
            onPress={() => onAction(EventType.REBOUND_DEF)}
            label="REB DEF"
            sub="Défensif"
            color="#2563eb"
          />
        )}
        {shouldShowAction(EventType.REBOUND_OFF) && (
          <ActionButton
            onPress={() => onAction(EventType.REBOUND_OFF)}
            label="REB OFF"
            sub="Offensif"
            color="#06b6d4"
          />
        )}
      </View>
    )}

    {/* Row 4: Other Stats */}
    {(shouldShowAction(EventType.ASSIST) || shouldShowAction(EventType.STEAL) || shouldShowAction(EventType.BLOCK) || shouldShowAction(EventType.FOUL)) && (
      <View style={styles.actionRow}>
        {shouldShowAction(EventType.ASSIST) && (
          <ActionButton
            onPress={() => onAction(EventType.ASSIST)}
            label="PASSE D"
            sub="Assist"
            color="#6366f1"
          />
        )}
        {shouldShowAction(EventType.STEAL) && (
          <ActionButton
            onPress={() => onAction(EventType.STEAL)}
            label="INTERC"
            sub="Vol"
            color="#8b5cf6"
          />
        )}
        {(shouldShowAction(EventType.BLOCK) || shouldShowAction(EventType.FOUL)) && (
          <View style={styles.miniColumn}>
            {shouldShowAction(EventType.BLOCK) && (
              <ActionButton
                onPress={() => onAction(EventType.BLOCK)}
                label="CONTRE"
                color={SLATE_COLORS[600]}
                textSize={14}
              />
            )}
            {shouldShowAction(EventType.FOUL) && (
              <ActionButton
                onPress={() => onAction(EventType.FOUL)}
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
    {shouldShowAction(EventType.TURNOVER) && (
      <View style={[styles.actionRow, { height: 56 }]}>
        <ActionButton
          onPress={() => onAction(EventType.TURNOVER)}
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
