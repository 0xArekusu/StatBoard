import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { FilterMode } from "../constants/liveMatchConstants";
import { BREAKPOINTS } from "../constants/breakpoints";
import { ActionType, ShotSpecification, getActionColor } from "../src/models/ActionTypes";
import { useTranslation } from "react-i18next";
import { useTheme } from "../src/contexts/ThemeContext";
import { useResponsive } from "../src/hooks/useResponsive";
import { Spacing, Typography } from "../src/theme";

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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sp: spResponsive, font: fontResponsive, isPortrait, width } = useResponsive();

  // Detect mobile landscape mode (not tablet)
  const isMobileLandscape = !isPortrait && width < BREAKPOINTS.mobileLandscapeMaxWidth;

  // Use normal (non-compact) values for tablets, compact values for mobile landscape
  const sp = isMobileLandscape ? spResponsive : {
    xs: Spacing.xs,
    sm: Spacing.sm,
    md: Spacing.md,
    lg: Spacing.lg,
    xl: Spacing.xl,
    xxl: Spacing.xxl,
  };

  const font = isMobileLandscape ? fontResponsive : {
    xxs: Typography.fontSize.xs,
    xs: Typography.fontSize.xs,
    sm: Typography.fontSize.sm,
    md: Typography.fontSize.md,
    lg: Typography.fontSize.lg,
    xl: Typography.fontSize.xl,
    xxl: Typography.fontSize.xxl,
    xxxl: Typography.fontSize.xxxl,
  };

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

  // Responsive row heights
  const rowHeightLarge = isMobileLandscape ? sp.xxl + sp.lg : sp.xxl * 2 + sp.md;
  const rowHeightMedium = isMobileLandscape ? sp.xxl + sp.xs : sp.xxl + sp.xl;
  const rowHeightSmall = isMobileLandscape ? sp.xl + sp.sm : sp.xxl + sp.md;

  return (
  <View style={[styles.actionGrid, { padding: sp.sm, gap: sp.sm }]}>
    {/* Row 1: Scoring Positive */}
    {shouldShowAction(ActionType.SHOT) && (
      <View style={[styles.actionRow, { height: rowHeightLarge, gap: sp.sm }]}>
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.SHOT, specification: ShotSpecification.MADE, points: 1 })}
          label="+1"
          sub={t("matchActionGrid.freeThrow")}
          color={getActionColor(ActionType.SHOT, ShotSpecification.MADE, 1)}
          isMobileLandscape={isMobileLandscape}
          sp={sp}
          font={font}
        />
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.SHOT, specification: ShotSpecification.MADE, points: 2 })}
          label="+2"
          sub={t("matchActionGrid.points")}
          color={getActionColor(ActionType.SHOT, ShotSpecification.MADE, 2)}
          isMobileLandscape={isMobileLandscape}
          sp={sp}
          font={font}
        />
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.SHOT, specification: ShotSpecification.MADE, points: 3 })}
          label="+3"
          sub={t("matchActionGrid.points")}
          color={getActionColor(ActionType.SHOT, ShotSpecification.MADE, 3)}
          isMobileLandscape={isMobileLandscape}
          sp={sp}
          font={font}
        />
      </View>
    )}

    {/* Row 2: Scoring Negative (Misses) */}
    {shouldShowAction(ActionType.SHOT) && (
      <View style={[styles.actionRow, { height: rowHeightMedium, gap: sp.sm }]}>
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.SHOT, specification: ShotSpecification.MISSED, points: 1 })}
          label={t("matchActionGrid.missed")}
          sub={t("matchActionGrid.freeThrow")}
          color={colors.surfaceVariant}
          textColor={getActionColor(ActionType.SHOT, ShotSpecification.MISSED, 1)}
          isMobileLandscape={isMobileLandscape}
          sp={sp}
          font={font}
        />
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.SHOT, specification: ShotSpecification.MISSED, points: 2 })}
          label={t("matchActionGrid.missed")}
          sub={t("matchActionGrid.pointsN", { count: 2 })}
          color={colors.surfaceVariant}
          textColor={getActionColor(ActionType.SHOT, ShotSpecification.MISSED, 2)}
          isMobileLandscape={isMobileLandscape}
          sp={sp}
          font={font}
        />
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.SHOT, specification: ShotSpecification.MISSED, points: 3 })}
          label={t("matchActionGrid.missed")}
          sub={t("matchActionGrid.pointsN", { count: 3 })}
          color={colors.surfaceVariant}
          textColor={getActionColor(ActionType.SHOT, ShotSpecification.MISSED, 3)}
          isMobileLandscape={isMobileLandscape}
          sp={sp}
          font={font}
        />
      </View>
    )}

    {/* Row 3: Rebounds */}
    {shouldShowAction(ActionType.REBOUND) && (
      <View style={[styles.actionRow, { height: rowHeightLarge, gap: sp.sm }]}>
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.REBOUND, specification: "defensive" })}
          label={t("matchActionGrid.rebDef")}
          sub={t("shotChainModal.defensive")}
          color={getActionColor(ActionType.REBOUND, "defensive")}
          isMobileLandscape={isMobileLandscape}
          sp={sp}
          font={font}
        />
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.REBOUND, specification: "offensive" })}
          label={t("matchActionGrid.rebOff")}
          sub={t("shotChainModal.offensive")}
          color={getActionColor(ActionType.REBOUND, "offensive")}
          isMobileLandscape={isMobileLandscape}
          sp={sp}
          font={font}
        />
      </View>
    )}

    {/* Row 4: Other Stats */}
    <View style={[styles.actionRow, { height: rowHeightLarge, gap: sp.sm }]}>
      {shouldShowAction(ActionType.ASSIST) && (
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.ASSIST })}
          label={t("matchActionGrid.assist")}
          sub={t("matchActionGrid.assistSub")}
          color={getActionColor(ActionType.ASSIST)}
          isMobileLandscape={isMobileLandscape}
          sp={sp}
          font={font}
        />
      )}
      {shouldShowAction(ActionType.STEAL) && (
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.STEAL })}
          label={t("matchActionGrid.steal")}
          sub={t("matchActionGrid.stealSub")}
          color={getActionColor(ActionType.STEAL)}
          isMobileLandscape={isMobileLandscape}
          sp={sp}
          font={font}
        />
      )}
      <View style={[styles.miniColumn, { gap: sp.xs }]}>
        {shouldShowAction(ActionType.BLOCK) && (
          <ActionButton
            onPress={() => onAction({ action_type: ActionType.BLOCK })}
            label={t("matchActionGrid.block")}
            color={getActionColor(ActionType.BLOCK)}
            textSize={isMobileLandscape ? font.xs : font.md}
            isMobileLandscape={isMobileLandscape}
            sp={sp}
            font={font}
          />
        )}
        {shouldShowAction(ActionType.FOUL) && (
          <ActionButton
            onPress={() => onAction({ action_type: ActionType.FOUL })}
            label={t("matchActionGrid.foul")}
            color={getActionColor(ActionType.FOUL)}
            textSize={isMobileLandscape ? font.xs : font.md}
            isMobileLandscape={isMobileLandscape}
            sp={sp}
            font={font}
          />
        )}
      </View>
    </View>

    {/* Row 5: Turnover & Foul Drawn */}
    <View style={[styles.actionRow, { height: rowHeightSmall, gap: sp.sm }]}>
      {shouldShowAction(ActionType.TURNOVER) && (
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.TURNOVER })}
          label={t("matchActionGrid.turnover")}
          color={getActionColor(ActionType.TURNOVER)}
          isMobileLandscape={isMobileLandscape}
          sp={sp}
          font={font}
        />
      )}
      {shouldShowAction(ActionType.FOUL_DRAWN) && (
        <ActionButton
          onPress={() => onAction({ action_type: ActionType.FOUL_DRAWN })}
          label={t("matchActionGrid.foulDrawn")}
          sub={t("liveMatchModals.filter.foulsDrawn")}
          color={getActionColor(ActionType.FOUL_DRAWN)}
          isMobileLandscape={isMobileLandscape}
          sp={sp}
          font={font}
        />
      )}
    </View>
  </View>
);};

interface ActionButtonProps {
  onPress: () => void;
  label: string;
  sub?: string;
  color: string;
  textColor?: string;
  textSize?: number;
  isMobileLandscape?: boolean;
  sp?: any;
  font?: any;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onPress,
  label,
  sub,
  color,
  textColor,
  textSize,
  isMobileLandscape = false,
  sp,
  font,
}) => {
  const finalTextSize = textSize || (isMobileLandscape ? font?.md || 12 : font?.lg || 16);
  const subTextSize = isMobileLandscape ? font?.xxs || 8 : font?.xs || 10;
  const padding = sp ? (isMobileLandscape ? sp.xs : sp.sm) : (isMobileLandscape ? 4 : 8);
  const borderRadius = sp ? sp.sm : 12;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.actionButton, { backgroundColor: color, padding, borderRadius }]}
    >
      <Text
        style={[
          styles.actionButtonLabel,
          { color: textColor || "#fff", fontSize: finalTextSize },
        ]}
      >
        {label}
      </Text>
      {sub && (
        <Text style={[styles.actionButtonSub, { color: textColor || "#fff", fontSize: subTextSize }]}>{sub}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  actionGrid: {
    // padding and gap set dynamically
  },
  actionRow: {
    flexDirection: "row",
    // gap and height set dynamically
  },
  miniColumn: {
    flex: 1,
    // gap set dynamically
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // padding and borderRadius set dynamically
  },
  actionButtonLabel: {
    fontWeight: "900",
    textAlign: "center",
    // fontSize set dynamically
  },
  actionButtonSub: {
    marginTop: 2,
    opacity: 0.8,
    // fontSize set dynamically
  },
});
