import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { FilterMode } from "../constants/liveMatchConstants";
import { ActionType, ShotSpecification, getActionColor } from "../src/models/ActionTypes";
import { useTheme } from "../src/contexts/ThemeContext";

export interface ActionData {
  action_type: string;
  specification?: string;
  points?: number;
}

interface MatchActionGridProps {
  onAction: (actionData: ActionData) => void;
  filterMode?: FilterMode;
}

export const MatchActionGrid: React.FC<MatchActionGridProps> = ({ onAction, filterMode = FilterMode.ALL }) => {
  const { colors, isDark } = useTheme();
  const shouldShowAction = (actionType: string): boolean => {
    if (filterMode === FilterMode.ALL) return true;
    if (filterMode === FilterMode.SHOOTING) return actionType === ActionType.SHOT;
    if (filterMode === FilterMode.REBOUNDS) return actionType === ActionType.REBOUND;
    if (filterMode === FilterMode.FOULS) return actionType === ActionType.FOUL;
    if (filterMode === FilterMode.TURNOVERS) return actionType === ActionType.TURNOVER;
    if (filterMode === FilterMode.BLOCKS) return actionType === ActionType.BLOCK;
    if (filterMode === FilterMode.STEALS) return actionType === ActionType.STEAL;
    return true;
  };

  return (
  <View style={styles.actionGrid}>
    {/* Row 1: Scoring Positive */}
    {shouldShowAction(ActionType.SHOT) && (
      <View style={styles.actionRow}>
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.SHOT, specification: ShotSpecification.MADE, points: 1 })}
          label="+1"
          sub="Lancer"
          color={getActionColor(ActionType.SHOT, ShotSpecification.MADE, 1)}
        />
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.SHOT, specification: ShotSpecification.MADE, points: 2 })}
          label="+2"
          sub="Points"
          color={getActionColor(ActionType.SHOT, ShotSpecification.MADE, 2)}
        />
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.SHOT, specification: ShotSpecification.MADE, points: 3 })}
          label="+3"
          sub="Points"
          color={getActionColor(ActionType.SHOT, ShotSpecification.MADE, 3)}
        />
      </View>
    )}

    {/* Row 2: Scoring Negative (Misses) */}
    {shouldShowAction(ActionType.SHOT) && (
      <View style={[styles.actionRow, { height: 64 }]}>
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.SHOT, specification: ShotSpecification.MISSED, points: 1 })}
          label="Raté"
          sub="Lancer"
          color={colors.surfaceVariant}
          textColor={getActionColor(ActionType.SHOT, ShotSpecification.MISSED, 1)}
        />
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.SHOT, specification: ShotSpecification.MISSED, points: 2 })}
          label="Raté"
          sub="2 Pts"
          color={colors.surfaceVariant}
          textColor={getActionColor(ActionType.SHOT, ShotSpecification.MISSED, 2)}
        />
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.SHOT, specification: ShotSpecification.MISSED, points: 3 })}
          label="Raté"
          sub="3 Pts"
          color={colors.surfaceVariant}
          textColor={getActionColor(ActionType.SHOT, ShotSpecification.MISSED, 3)}
        />
      </View>
    )}

    {/* Row 3: Rebounds */}
    {shouldShowAction(ActionType.REBOUND) && (
      <View style={[styles.actionRow, { height: 80 }]}>
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.REBOUND, specification: "defensive" })}
          label="REB DEF"
          sub="Défensif"
          color={getActionColor(ActionType.REBOUND, "defensive")}
        />
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.REBOUND, specification: "offensive" })}
          label="REB OFF"
          sub="Offensif"
          color={getActionColor(ActionType.REBOUND, "offensive")}
        />
      </View>
    )}

    {/* Row 4: Other Stats */}
    <View style={styles.actionRow}>
      {shouldShowAction(ActionType.ASSIST) && (
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.ASSIST })}
          label="PASSE D"
          sub="Assist"
          color={getActionColor(ActionType.ASSIST)}
        />
      )}
      {shouldShowAction(ActionType.STEAL) && (
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.STEAL })}
          label="INTERC"
          sub="Vol"
          color={getActionColor(ActionType.STEAL)}
        />
      )}
      <View style={styles.miniColumn}>
        {shouldShowAction(ActionType.BLOCK) && (
          <ActionButton
            onPress={() => onAction({ action_type: ActionType.BLOCK })}
            label="CONTRE"
            color={getActionColor(ActionType.BLOCK)}
            textSize={14}
          />
        )}
        {shouldShowAction(ActionType.FOUL) && (
          <ActionButton
            onPress={() => onAction({ action_type: ActionType.FOUL })}
            label="FAUTE"
            color={getActionColor(ActionType.FOUL)}
            textSize={14}
          />
        )}
      </View>
    </View>

    {/* Row 5: Turnover */}
    {shouldShowAction(ActionType.TURNOVER) && (
      <View style={[styles.actionRow, { height: 56 }]}>
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.TURNOVER })}
          label="BALLE PERDUE"
          color={getActionColor(ActionType.TURNOVER)}
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
