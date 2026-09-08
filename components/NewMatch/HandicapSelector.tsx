import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { BRAND_COLORS, SLATE_COLORS, COMMON_COLORS } from "../../src/theme";
import { useResponsive } from "../../src/hooks/useResponsive";

interface HandicapSelectorProps {
  enabled: boolean;
  onToggle: () => void;
  myTeamName: string;
  opponentName: string;
  myTeamHandicap: number;
  opponentHandicap: number;
  onMyTeamHandicapChange: (value: number) => void;
  onOpponentHandicapChange: (value: number) => void;
  isDark: boolean;
  colors: {
    surfaceColor: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
  };
}

export const HandicapSelector: React.FC<HandicapSelectorProps> = ({
  enabled,
  onToggle,
  myTeamName,
  opponentName,
  myTeamHandicap,
  opponentHandicap,
  onMyTeamHandicapChange,
  onOpponentHandicapChange,
  isDark,
  colors,
}) => {
  const { t } = useTranslation();
  const { sp, font, sizes } = useResponsive();

  const renderAdjuster = (
    label: string,
    value: number,
    onChange: (v: number) => void
  ) => (
    <View style={styles.adjusterCol}>
      <Text
        style={[styles.teamLabel, { color: colors.textSecondary, fontSize: font.xs }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={[styles.adjuster, { gap: sp.xs, marginTop: sp.xs }]}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(0, value - 1))}
          style={[
            styles.adjusterBtn,
            {
              backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
              width: sp.xxl,
              height: sp.xxl,
              borderRadius: sp.md,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="minus"
            size={sizes.iconMd * 0.75}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        <View
          style={[
            styles.valueBox,
            {
              backgroundColor: value > 0 ? `${BRAND_COLORS[500]}18` : colors.surfaceColor,
              borderColor: value > 0 ? BRAND_COLORS[500] : colors.borderColor,
              paddingVertical: sp.sm,
              paddingHorizontal: sp.sm + sp.xs,
              borderRadius: sp.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.valueText,
              {
                color: value > 0 ? BRAND_COLORS[600] : colors.textPrimary,
                fontSize: font.md,
              },
            ]}
          >
            +{value}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onChange(value + 1)}
          style={[
            styles.adjusterBtn,
            {
              backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
              width: sp.xxl,
              height: sp.xxl,
              borderRadius: sp.md,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="plus"
            size={sizes.iconMd * 0.75}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { marginBottom: sp.lg }]}>
      {/* Toggle button — same style as OpponentStatsToggle */}
      <TouchableOpacity
        onPress={onToggle}
        style={[
          styles.toggleCard,
          {
            backgroundColor: colors.surfaceColor,
            borderColor: enabled ? BRAND_COLORS[500] : colors.borderColor,
            padding: sp.md,
            borderRadius: sp.md,
          },
        ]}
      >
        <View style={[styles.toggleLeft, { gap: sp.sm + sp.xs }]}>
          <View
            style={[
              styles.toggleIcon,
              {
                backgroundColor: enabled
                  ? `${BRAND_COLORS[500]}20`
                  : isDark
                  ? SLATE_COLORS[800]
                  : SLATE_COLORS[200],
                width: sizes.avatarMd,
                height: sizes.avatarMd,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="flag-checkered"
              size={sizes.iconMd}
              color={enabled ? BRAND_COLORS[600] : colors.textSecondary}
            />
          </View>
          <View style={styles.toggleTextContainer}>
            <Text
              style={[
                styles.toggleTitle,
                {
                  color: enabled ? colors.textPrimary : colors.textSecondary,
                  fontSize: font.md,
                },
              ]}
            >
              {t("handicapSelector.title")}
            </Text>
            <Text style={[styles.toggleSubtitle, { color: colors.textSecondary, fontSize: font.sm, marginTop: sp.xs }]}>
              {t("handicapSelector.subtitle")}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: enabled ? BRAND_COLORS[500] : colors.borderColor,
              backgroundColor: enabled ? BRAND_COLORS[500] : "transparent",
              width: sizes.avatarSm * 0.6,
              height: sizes.avatarSm * 0.6,
            },
          ]}
        >
          {enabled && (
            <MaterialCommunityIcons
              name="check"
              size={sizes.iconSm}
              color={COMMON_COLORS.white}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Adjusters — only visible when enabled */}
      {enabled && (
        <View
          style={[
            styles.adjustersCard,
            {
              backgroundColor: colors.surfaceColor,
              borderColor: BRAND_COLORS[500],
              borderTopColor: colors.borderColor,
              borderRadius: sp.md,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              padding: sp.md,
              gap: sp.md,
            },
          ]}
        >
          <View style={styles.adjustersRow}>
            {renderAdjuster(myTeamName || t("liveMatchModals.myTeamFallback"), myTeamHandicap, onMyTeamHandicapChange)}
            <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />
            {renderAdjuster(opponentName || t("liveMatchModals.opponentFallback"), opponentHandicap, onOpponentHandicapChange)}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  toggleIcon: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontWeight: "bold",
  },
  toggleSubtitle: {},
  checkbox: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  adjustersCard: {
    borderWidth: 1,
    borderTopWidth: 0,
    marginTop: -1,
  },
  adjustersRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  adjusterCol: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    marginVertical: 4,
  },
  teamLabel: {
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  adjuster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  adjusterBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  valueBox: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    minWidth: 52,
    flex: 1,
  },
  valueText: {
    fontWeight: "bold",
    textAlign: "center",
  },
});
