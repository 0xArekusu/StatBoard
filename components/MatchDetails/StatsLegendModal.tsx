/**
 * StatsLegendModal Component
 *
 * Modal displaying the legend for all statistics abbreviations.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native";
import Svg, { Circle, Polygon } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../src/contexts/ThemeContext";
import {
  getActionColor,
  ActionType,
  ReboundSpecification,
} from "../../src/models/ActionTypes";
import { MarkerType } from "./SharedComponents";
import { useResponsive } from "../../src/hooks/useResponsive";

interface StatsLegendModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function StatsLegendModal({
  visible,
  onClose,
}: StatsLegendModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { sp, font, sizes } = useResponsive();

  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  const renderMarker = (type: MarkerType, color: string) => {
    const size = 16;

    if (type === MarkerType.CIRCLE) {
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          style={styles.markerIcon}
        >
          <Circle
            cx={8}
            cy={8}
            r={6}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </Svg>
      );
    }

    if (type === MarkerType.TRIANGLE) {
      const height = 6;
      const width = 6;
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          style={styles.markerIcon}
        >
          <Polygon
            points={`8,${8 - height} ${8 + width},${8 + height} ${8 - width},${
              8 + height
            }`}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth="1"
          />
        </Svg>
      );
    }

    if (type === MarkerType.DIAMOND) {
      const diamondSize = 6;
      return (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          style={styles.markerIcon}
        >
          <Polygon
            points={`8,${8 - diamondSize} ${8 + diamondSize},8 8,${
              8 + diamondSize
            } ${8 - diamondSize},8`}
            fill={color}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </Svg>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={colors.text.secondary}
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.modalTitle,
              {
                color: colors.text.primary,
              },
            ]}
          >
            {t("statsLegendModal.title")}
          </Text>

          <ScrollView
            style={styles.legendScroll}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
          >
          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("statsLegendModal.min")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("statsLegendModal.minutesPlayed")}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("statsLegendModal.pts")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("liveMatchModals.filter.points")}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("statsLegendModal.tirs")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("statsLegendModal.shotsMadeAttempted")}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("statsLegendModal.twoPts")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("statsLegendModal.twoPointShots")}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("statsLegendModal.threePts")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("statsLegendModal.threePointShots")}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("liveMatchModals.filter.freeThrows")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("statsLegendModal.freeThrowsFull")}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("playerDetailModal.reb")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("liveMatchModals.filter.rebounds")}
              </Text>
              {renderMarker(
                MarkerType.TRIANGLE,
                getActionColor(ActionType.REBOUND, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("statsLegendModal.ro")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("statsLegendModal.offensiveRebounds")}
              </Text>
              {renderMarker(
                MarkerType.TRIANGLE,
                getActionColor(
                  ActionType.REBOUND,
                  ReboundSpecification.OFFENSIVE,
                  0
                )
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("statsLegendModal.rd")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("statsLegendModal.defensiveRebounds")}
              </Text>
              {renderMarker(
                MarkerType.TRIANGLE,
                getActionColor(
                  ActionType.REBOUND,
                  ReboundSpecification.DEFENSIVE,
                  0
                )
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("statsLegendModal.re")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("statsLegendModal.teamRebounds")}
              </Text>
              {renderMarker(
                MarkerType.TRIANGLE,
                getActionColor(
                  ActionType.REBOUND,
                  ReboundSpecification.TEAM,
                  0
                )
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("playerDetailModal.ast")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("playerDetailModal.assistsSub")}
              </Text>
              {renderMarker(
                MarkerType.CIRCLE,
                getActionColor(ActionType.ASSIST, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("playerDetailModal.int")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("liveMatchModals.filter.steals")}
              </Text>
              {renderMarker(
                MarkerType.CIRCLE,
                getActionColor(ActionType.STEAL, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("playerDetailModal.ctr")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("liveMatchModals.filter.blocks")}
              </Text>
              {renderMarker(
                MarkerType.CIRCLE,
                getActionColor(ActionType.BLOCK, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("playerDetailModal.bp")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("playerDetailModal.turnoversSub")}
              </Text>
              {renderMarker(
                MarkerType.CIRCLE,
                getActionColor(ActionType.TURNOVER, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("statsLegendModal.ft")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("statsLegendModal.foulsTotalDescription")}
              </Text>
              {renderMarker(
                MarkerType.DIAMOND,
                getActionColor(ActionType.FOUL, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("playerDetailModal.fp")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("liveMatchModals.filter.foulsDrawn")}
              </Text>
              {renderMarker(
                MarkerType.DIAMOND,
                getActionColor(ActionType.FOUL_DRAWN, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                +/-
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("statsLegendModal.plusMinusDescription")}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                {t("statsLegendModal.eval")}
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                {t("statsLegendModal.evaluation")}
              </Text>
            </View>
          </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "85%",
    borderRadius: 16,
    padding: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  legendScroll: {
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 20,
    letterSpacing: 1,
    textAlign: "center",
  },
  legendGrid: {
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    width: 60,
  },
  legendValue: {
    fontSize: 12,
    flex: 1,
  },
  markerIcon: {
    marginLeft: 8,
  },
});
