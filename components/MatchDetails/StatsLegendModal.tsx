/**
 * StatsLegendModal Component
 *
 * Modal displaying the legend for all statistics abbreviations.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import Svg, { Circle, Polygon } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
            },
          ]}
          onStartShouldSetResponder={() => true}
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
            LÉGENDE DES STATISTIQUES
          </Text>

          <View style={styles.legendGrid}>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                MIN
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Minutes jouées
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                PTS
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Points
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                TIRS
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Tirs réussis/tentés
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                2PTS
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Tirs à 2 points
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                3PTS
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Tirs à 3 points
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                LF
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Lancers francs
              </Text>
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                REB
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Rebonds
              </Text>
              {renderMarker(
                MarkerType.TRIANGLE,
                getActionColor(ActionType.REBOUND, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                RO
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Rebonds offensifs
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
                RD
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Rebonds défensifs
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
                AST
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Passes décisives
              </Text>
              {renderMarker(
                MarkerType.CIRCLE,
                getActionColor(ActionType.ASSIST, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                INT
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Interceptions
              </Text>
              {renderMarker(
                MarkerType.CIRCLE,
                getActionColor(ActionType.STEAL, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                CTR
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Contres
              </Text>
              {renderMarker(
                MarkerType.CIRCLE,
                getActionColor(ActionType.BLOCK, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                BP
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Balles perdues
              </Text>
              {renderMarker(
                MarkerType.CIRCLE,
                getActionColor(ActionType.TURNOVER, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                FT
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Fautes
              </Text>
              {renderMarker(
                MarkerType.DIAMOND,
                getActionColor(ActionType.FOUL, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                FP
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Fautes provoquées
              </Text>
              {renderMarker(
                MarkerType.DIAMOND,
                getActionColor(ActionType.FOUL_DRAWN, "", 0)
              )}
            </View>
            <View style={styles.legendItem}>
              <Text style={[styles.legendLabel, { color: textSecondary }]}>
                EVAL
              </Text>
              <Text style={[styles.legendValue, { color: textPrimary }]}>
                Evaluation
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
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
