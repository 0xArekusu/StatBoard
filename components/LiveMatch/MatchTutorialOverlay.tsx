import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useResponsive } from "../../src/hooks/useResponsive";
import { ANALYTICS_EVENTS } from "../../constants/analyticsEvents";

export const TUTORIAL_SKIP_KEY = "@match_tutorial_skip";

type Zone = "header" | "toggle" | "grid" | "toolbar";

interface TutorialStep {
  zone: Zone;
  icon: string;
  title: string;
  description: string;
  tooltipPosition: "below" | "center" | "above";
}

const STEPS: TutorialStep[] = [
  {
    zone: "header",
    icon: "timer-outline",
    title: "Chrono & Score",
    description:
      "Lancez ou mettez en pause le chrono, passez à la période suivante, visualisez le tableau des fautes, ajoutez des temps morts, effectuez des remplacements et marquez rapidement les points adverses.",
    tooltipPosition: "below",
  },
  {
    zone: "toggle",
    icon: "swap-horizontal",
    title: "Vue Terrain / Actions",
    description:
      "Basculez entre la vue terrain pour visualiser vos actions sur le parquet et la grille si vous souhaitez saisir les statistiques directement sans le terrain.",
    tooltipPosition: "below",
  },
  {
    zone: "grid",
    icon: "basketball",
    title: "Grille d'actions",
    description:
      "Cliquez sur le terrain pour saisir une action : tirs réussis ou manqués, rebonds, fautes etc... Les actions chaînées vous proposent automatiquement les actions liées (ex: tir réussi → passe décisive, faute → lancers francs) pour un suivi plus fluide et rapide.",
    tooltipPosition: "center",
  },
  {
    zone: "toolbar",
    icon: "toolbox-outline",
    title: "Barre d'outils",
    description:
      "Grâce à la barre d'action, vous pouvez annuler la dernière action, filtrer par type d'action et consulter les statistiques en temps réel, afficher ou masquer les marqueurs terrain et consulter l'historique complet.",
    tooltipPosition: "above",
  },
];

interface MatchTutorialOverlayProps {
  visible: boolean;
  onClose: () => void;
  headerHeight: number;
  toggleHeight: number;
  toolbarHeight: number;
  trackOpponentStats: boolean;
}

export function MatchTutorialOverlay({
  visible,
  onClose,
  headerHeight,
  toggleHeight,
  toolbarHeight,
  trackOpponentStats,
}: MatchTutorialOverlayProps) {
  const { colors } = useTheme();
  const { sp, font } = useResponsive();
  const posthog = usePostHog();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const step = STEPS[stepIndex];
  const stepDescription =
    step.zone === "header"
      ? `Lancez ou mettez en pause le chrono, passez à la période suivante, visualisez le tableau des fautes, ajoutez des temps morts et effectuez des remplacements.${
          !trackOpponentStats
            ? " Marquez rapidement les points adverses depuis l'en-tête."
            : ""
        }`
      : step.description;
  const isLast = stepIndex === STEPS.length - 1;

  // Don't render if heights aren't measured yet
  if (!visible || headerHeight === 0) return null;

  // onLayout measures relative to SafeAreaView (below status bar),
  // but Modal starts from absolute top of screen — offset by insets.top
  const safeTop = insets.top;

  const gridHeight = Math.max(
    0,
    screenHeight - safeTop - headerHeight - toggleHeight - toolbarHeight
  );
  
  const zones: Record<Zone, { top: number; height: number }> = {
    header: { top: safeTop, height: headerHeight },
    toggle: { top: safeTop + headerHeight, height: toggleHeight },
    grid: { top: safeTop + headerHeight + toggleHeight, height: gridHeight - Platform.select({ ios: 15, default: 0 }) },
    toolbar: { top: screenHeight - toolbarHeight - Platform.select({ ios: 10, default: 0 }), height: toolbarHeight - insets.bottom },
  };

  const activeZone = zones[step.zone];
  const zoneBottom = activeZone.top + activeZone.height;

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleSkip = async () => {
    if (dontShowAgain) {
      await AsyncStorage.setItem(TUTORIAL_SKIP_KEY, "true");
    }
    posthog?.capture(ANALYTICS_EVENTS.MATCH_TUTORIAL_SKIPPED, { step_index: stepIndex });
    setStepIndex(0);
    setDontShowAgain(false);
    onClose();
  };

  const handleClose = async () => {
    if (dontShowAgain) {
      await AsyncStorage.setItem(TUTORIAL_SKIP_KEY, "true");
    }
    posthog?.capture(ANALYTICS_EVENTS.MATCH_TUTORIAL_COMPLETED);
    setStepIndex(0);
    setDontShowAgain(false);
    onClose();
  };

  // Tooltip vertical position
  const TOOLTIP_HEIGHT = 220;
  const TOOLTIP_MARGIN = sp.md;
  let tooltipTop: number;
  if (step.tooltipPosition === "below") {
    tooltipTop = zoneBottom + TOOLTIP_MARGIN;
  } else if (step.tooltipPosition === "above") {
    tooltipTop = activeZone.top - TOOLTIP_HEIGHT - TOOLTIP_MARGIN;
  } else {
    tooltipTop = activeZone.top + (activeZone.height - TOOLTIP_HEIGHT) / 2;
  }
  // Clamp within screen
  tooltipTop = Math.max(
    sp.md,
    Math.min(tooltipTop, screenHeight - TOOLTIP_HEIGHT - sp.md)
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Dim above active zone */}
        {activeZone.top > 0 && (
          <View
            pointerEvents="auto"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: activeZone.top,
              backgroundColor: "rgba(0,0,0,0.80)",
            }}
          />
        )}
        {/* Dim below active zone */}
        {zoneBottom < screenHeight && (
          <View
            pointerEvents="auto"
            style={{
              position: "absolute",
              top: zoneBottom,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.80)",
            }}
          />
        )}

        {/* Highlight border on active zone (no pointer events so zone stays interactive) */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: activeZone.top,
            left: 0,
            right: 0,
            height: activeZone.height,
            borderWidth: 2,
            borderColor: colors.primary,
          }}
        />

        {/* Tooltip card */}
        <View
          pointerEvents="auto"
          style={[
            styles.tooltip,
            {
              position: "absolute",
              top: tooltipTop,
              left: sp.lg,
              right: sp.lg,
              backgroundColor: colors.surface,
              borderRadius: sp.md,
              padding: sp.lg,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 12,
            },
          ]}
        >
          {/* Step indicator */}
          <View style={styles.stepRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      i === stepIndex ? colors.primary : colors.border,
                    width: i === stepIndex ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {/* Icon + title */}
          <View style={[styles.headerRow, { marginBottom: sp.xs }]}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: `${colors.primary}22`,
                  borderRadius: sp.sm,
                  padding: sp.sm,
                  marginRight: sp.sm,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={step.icon as any}
                size={22}
                color={colors.primary}
              />
            </View>
            <Text
              style={[
                styles.title,
                { color: colors.text.primary, fontSize: font.lg },
              ]}
            >
              {step.title}
            </Text>
          </View>

          {/* Description */}
          <Text
            style={[
              styles.description,
              {
                color: colors.text.secondary,
                fontSize: font.sm,
                marginBottom: sp.md,
              },
            ]}
          >
            {stepDescription}
          </Text>

          {/* Checkbox + buttons row */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setDontShowAgain(!dontShowAgain)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: dontShowAgain ? colors.primary : colors.border,
                    backgroundColor: dontShowAgain
                      ? colors.primary
                      : "transparent",
                    borderRadius: 4,
                  },
                ]}
              >
                {dontShowAgain && (
                  <MaterialCommunityIcons
                    name="check"
                    size={12}
                    color={colors.onPrimary}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.checkboxLabel,
                  { color: colors.text.secondary, fontSize: font.xs },
                ]}
              >
                Ne plus afficher
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonsRow}>
              {!isLast && (
                <TouchableOpacity
                  onPress={handleSkip}
                  style={[
                    styles.skipBtn,
                    { borderColor: colors.error, borderRadius: sp.sm },
                  ]}
                >
                  <Text
                    style={[
                      styles.skipBtnText,
                      { color: colors.error, fontSize: font.sm },
                    ]}
                  >
                    Passer
                  </Text>
                </TouchableOpacity>
              )}
              <View style={styles.navButtons}>
                {stepIndex > 0 && (
                  <TouchableOpacity
                    onPress={() => setStepIndex((i) => i - 1)}
                    style={[
                      styles.skipBtn,
                      { borderColor: colors.border, borderRadius: sp.sm },
                    ]}
                  >
                    <Text
                      style={[
                        styles.skipBtnText,
                        { color: colors.text.secondary, fontSize: font.sm },
                      ]}
                    >
                      Précédent
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleNext}
                  style={[
                    styles.nextBtn,
                    {
                      backgroundColor: colors.primary,
                      borderRadius: sp.sm,
                      paddingHorizontal: sp.lg,
                      paddingVertical: sp.sm,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.nextBtnText,
                      { color: colors.onPrimary, fontSize: font.sm },
                    ]}
                  >
                    {isLast ? "Terminer" : "Suivant"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tooltip: {},
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {},
  title: {
    fontWeight: "700",
    flex: 1,
  },
  description: {
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {},
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  skipBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  skipBtnText: {
    fontWeight: "500",
  },
  nextBtn: {},
  nextBtnText: {
    fontWeight: "700",
  },
  navButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
