import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  SafeAreaView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { BRAND_COLORS, SLATE_COLORS } from "../src/theme";
import { PlaybookItem, PlayScene } from "../src/models/PlayTypes";
import TacticalCourtSVG from "../components/Playbook/TacticalCourtSVG";

// Court coordinate space: viewBox "0 0 100 85"
// x: 0–100, y: 0–85
const COURT_VB_W = 100;
const COURT_VB_H = 85;

const CATEGORY_LABELS: Record<string, string> = {
  OFFENSE: "ATTAQUE",
  DEFENSE: "DÉFENSE",
  OUT_OF_BOUNDS: "TOUCHE",
  PRESS_BREAK: "PRESSE",
  OTHER: "AUTRE",
};

interface PlayEditorModalProps {
  play: PlaybookItem | null;
  visible: boolean;
  onClose: () => void;
}

export default function PlayEditorModal({ play, visible, onClose }: PlayEditorModalProps) {
  const { isDark } = useTheme();
  const { width: screenW } = useWindowDimensions();

  const [sceneIndex, setSceneIndex] = useState(0);

  // Reset scene when a different play is opened
  useEffect(() => {
    if (visible) setSceneIndex(0);
  }, [play?.id, visible]);

  const bg = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surface = isDark ? SLATE_COLORS[900] : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const border = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

  if (!play) return null;

  const scene = play.scenes[sceneIndex] ?? play.scenes[0];

  // Court renders square-ish; keep aspect ratio of 100:85
  const courtW = Math.min(screenW - 32, 420);
  const courtH = Math.round((courtW * COURT_VB_H) / COURT_VB_W);

  const isDefense = play.category === "DEFENSE";
  const badgeColor = isDefense ? "#ef4444" : BRAND_COLORS[500];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.root, { backgroundColor: bg }]}>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="chevron-down" size={24} color={textSecondary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={[styles.categoryBadge, { backgroundColor: `${badgeColor}20` }]}>
              <Text style={[styles.categoryBadgeText, { color: badgeColor }]}>
                {CATEGORY_LABELS[play.category] ?? play.category}
              </Text>
            </View>
            <Text style={[styles.headerTitle, { color: textPrimary }]} numberOfLines={1}>
              {play.name}
            </Text>
          </View>

          {/* Placeholder actions button (future: edit) */}
          <View style={styles.closeBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Court container */}
          <View style={[styles.courtWrapper, { width: courtW, height: courtH }]}>
            <TacticalCourtSVG width={courtW} height={courtH} />
            <PlayerOverlay scene={scene} courtW={courtW} courtH={courtH} />
          </View>

          {/* Scene description */}
          <View style={[styles.descBox, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.descStep, { color: BRAND_COLORS[500] }]}>
              ÉTAPE {sceneIndex + 1} / {play.scenes.length}
            </Text>
            <Text style={[styles.descTitle, { color: textPrimary }]}>{scene.title}</Text>
            {scene.description ? (
              <Text style={[styles.descText, { color: textSecondary }]}>{scene.description}</Text>
            ) : null}
          </View>

          {/* Scene timeline */}
          <View style={styles.timeline}>
            {play.scenes.map((s, i) => {
              const isActive = i === sceneIndex;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSceneIndex(i)}
                  style={[
                    styles.timelineBtn,
                    {
                      backgroundColor: isActive ? BRAND_COLORS[500] : surface,
                      borderColor: isActive ? BRAND_COLORS[500] : border,
                    },
                  ]}
                >
                  <Text style={[styles.timelineBtnNum, { color: isActive ? "#FFF" : textSecondary }]}>
                    {i + 1}
                  </Text>
                  <Text
                    style={[styles.timelineBtnLabel, { color: isActive ? "#FFF" : textSecondary }]}
                    numberOfLines={1}
                  >
                    {s.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Prev / Next */}
          {play.scenes.length > 1 && (
            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={() => setSceneIndex((i) => Math.max(0, i - 1))}
                disabled={sceneIndex === 0}
                style={[styles.navBtn, { backgroundColor: surface, borderColor: border, opacity: sceneIndex === 0 ? 0.3 : 1 }]}
              >
                <MaterialCommunityIcons name="chevron-left" size={22} color={textPrimary} />
                <Text style={[styles.navBtnText, { color: textPrimary }]}>Précédent</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSceneIndex((i) => Math.min(play.scenes.length - 1, i + 1))}
                disabled={sceneIndex === play.scenes.length - 1}
                style={[
                  styles.navBtn,
                  {
                    backgroundColor: sceneIndex < play.scenes.length - 1 ? BRAND_COLORS[500] : surface,
                    borderColor: border,
                    opacity: sceneIndex === play.scenes.length - 1 ? 0.3 : 1,
                  },
                ]}
              >
                <Text style={[styles.navBtnText, { color: sceneIndex < play.scenes.length - 1 ? "#FFF" : textPrimary }]}>
                  Suivant
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={sceneIndex < play.scenes.length - 1 ? "#FFF" : textPrimary}
                />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Player token overlay
// ---------------------------------------------------------------------------

interface PlayerOverlayProps {
  scene: PlayScene;
  courtW: number;
  courtH: number;
}

const POSITION_NAMES: Record<string, string> = {
  A1: "Meneur", A2: "Arrière", A3: "Ailier", A4: "Ailier F.", A5: "Pivot",
};

function PlayerOverlay({ scene, courtW, courtH }: PlayerOverlayProps) {
  const { isDark } = useTheme();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Object.entries(scene.positions).map(([key, pos]) => {
        const isBall = key === "BALL";
        const isDefender = key.startsWith("D");
        const num = key.replace("A", "").replace("D", "");

        // Convert 0-100 (x) and 0-85 (y) to pixel positions
        const left = (pos.x / COURT_VB_W) * courtW;
        const top = (pos.y / COURT_VB_H) * courtH;

        if (isBall) {
          return (
            <View
              key={key}
              style={[styles.token, styles.ball, { left: left - 10, top: top - 10 }]}
            />
          );
        }

        return (
          <View
            key={key}
            style={[styles.tokenWrapper, { left: left - 14, top: top - 14 }]}
          >
            <View
              style={[
                styles.token,
                isDefender ? styles.tokenDefender : styles.tokenAttacker,
              ]}
            >
              <Text style={styles.tokenText}>{isDefender ? `D${num}` : num}</Text>
            </View>
            {!isDefender && POSITION_NAMES[key] ? (
              <Text style={styles.tokenLabel} numberOfLines={1}>
                {POSITION_NAMES[key]}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: { width: 36, alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  categoryBadgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  headerTitle: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { alignItems: "center", padding: 16, gap: 16, paddingBottom: 40 },

  // Court
  courtWrapper: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  // Description box
  descBox: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  descStep: { fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  descTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  descText: { fontSize: 13, fontWeight: "500", lineHeight: 20, marginTop: 4 },

  // Timeline
  timeline: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    justifyContent: "center",
  },
  timelineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 64,
    maxWidth: 110,
    gap: 2,
  },
  timelineBtnNum: { fontSize: 14, fontWeight: "900" },
  timelineBtnLabel: { fontSize: 8, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" },

  // Nav row
  navRow: { flexDirection: "row", gap: 12, width: "100%" },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  navBtnText: { fontSize: 13, fontWeight: "800" },

  // Player tokens
  tokenWrapper: { position: "absolute", alignItems: "center", gap: 2 },
  token: {
    width: 28, height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tokenAttacker: {
    backgroundColor: "#4f46e5",
    borderWidth: 2,
    borderColor: "#818cf8",
  },
  tokenDefender: {
    backgroundColor: "#dc2626",
    borderWidth: 2,
    borderColor: "#f87171",
  },
  ball: {
    position: "absolute",
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: "#f97316",
    borderWidth: 1.5,
    borderColor: "#ea580c",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tokenText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  tokenLabel: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
});
