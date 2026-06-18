import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  SafeAreaView,
  PanResponder,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { BRAND_COLORS, SLATE_COLORS } from "../src/theme";
import { PlaybookItem, DrawingPoint } from "../src/models/PlayTypes";
import TacticalCourtSVG from "../components/Playbook/TacticalCourtSVG";

// Court SVG coordinate space: 100 wide × 85 tall
const COURT_VB_W = 100;
const COURT_VB_H = 85;
// Snap threshold in court units: how close a finger must be to a token
const DRAG_THRESHOLD = 10;

const CATEGORY_LABELS: Record<string, string> = {
  OFFENSE: "ATTAQUE",
  DEFENSE: "DÉFENSE",
  OUT_OF_BOUNDS: "TOUCHE",
  PRESS_BREAK: "PRESSE",
  OTHER: "AUTRE",
};

const POSITION_NAMES: Record<string, string> = {
  A1: "Meneur", A2: "Arrière", A3: "Ailier", A4: "Ailier F.", A5: "Pivot",
};

interface PlayEditorModalProps {
  play: PlaybookItem | null;
  visible: boolean;
  onClose: () => void;
}

export default function PlayEditorModal({ play, visible, onClose }: PlayEditorModalProps) {
  const { isDark } = useTheme();
  const { width: screenW } = useWindowDimensions();

  const bg = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surface = isDark ? SLATE_COLORS[900] : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const border = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

  // Scene navigation
  const [sceneIndex, setSceneIndex] = useState(0);

  // Local mutable positions for the current scene (drag state)
  const [positions, setPositions] = useState<Record<string, DrawingPoint>>({});
  // Ref so PanResponder callbacks never read stale closures
  const positionsRef = useRef<Record<string, DrawingPoint>>({});

  const updatePositions = useCallback((next: Record<string, DrawingPoint>) => {
    positionsRef.current = next;
    setPositions(next);
  }, []);

  // Load scene positions whenever play or scene changes
  useEffect(() => {
    if (!play || !visible) return;
    const scene = play.scenes[sceneIndex] ?? play.scenes[0];
    const copy: Record<string, DrawingPoint> = {};
    for (const [k, v] of Object.entries(scene.positions)) copy[k] = { ...v };
    updatePositions(copy);
  }, [play?.id, sceneIndex, visible]);

  // Reset to first scene when a new play is opened
  useEffect(() => {
    if (visible) setSceneIndex(0);
  }, [play?.id, visible]);

  // Court layout on screen (absolute page coordinates)
  const courtRef = useRef<View>(null);
  const courtAbsPos = useRef({ x: 0, y: 0 });
  const draggingKey = useRef<string | null>(null);

  // Court pixel dimensions (portrait-friendly, tablet aware)
  const courtW = Math.min(screenW - 32, 480);
  const courtH = Math.round((courtW * COURT_VB_H) / COURT_VB_W);

  const measureCourt = useCallback(() => {
    courtRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
      courtAbsPos.current = { x: px, y: py };
    });
  }, []);

  // Single PanResponder on the court container
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => !!draggingKey.current,

      onPanResponderGrant: (evt, gs) => {
        // Re-measure in case the modal scrolled or layout changed
        courtRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
          courtAbsPos.current = { x: px, y: py };

          const { x, y } = courtAbsPos.current;
          const touchCX = ((gs.x0 - x) / courtW) * COURT_VB_W;
          const touchCY = ((gs.y0 - y) / courtH) * COURT_VB_H;

          // Find the closest token within the drag threshold
          let best: string | null = null;
          let bestDist = DRAG_THRESHOLD;
          for (const [key, pos] of Object.entries(positionsRef.current)) {
            const d = Math.hypot(pos.x - touchCX, pos.y - touchCY);
            if (d < bestDist) { bestDist = d; best = key; }
          }
          draggingKey.current = best;
        });
      },

      onPanResponderMove: (_evt, gs) => {
        const key = draggingKey.current;
        if (!key) return;

        const { x, y } = courtAbsPos.current;
        const cx = Math.max(2, Math.min(98, ((gs.moveX - x) / courtW) * COURT_VB_W));
        const cy = Math.max(2, Math.min(83, ((gs.moveY - y) / courtH) * COURT_VB_H));

        const next = { ...positionsRef.current, [key]: { x: cx, y: cy } };
        positionsRef.current = next;
        setPositions({ ...next });
      },

      onPanResponderRelease: () => {
        draggingKey.current = null;
      },

      onPanResponderTerminate: () => {
        draggingKey.current = null;
      },
    })
  ).current;

  if (!play) return null;

  const scene = play.scenes[sceneIndex] ?? play.scenes[0];
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

        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="chevron-down" size={26} color={textSecondary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={[styles.badge, { backgroundColor: `${badgeColor}20` }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>
                {CATEGORY_LABELS[play.category] ?? play.category}
              </Text>
            </View>
            <Text style={[styles.headerTitle, { color: textPrimary }]} numberOfLines={1}>
              {play.name}
            </Text>
          </View>

          {/* Right slot — future: edit menu */}
          <View style={styles.headerBtn} />
        </View>

        {/* ── Court (outside ScrollView so drag never conflicts) ── */}
        <View
          style={[styles.courtOuter, { backgroundColor: isDark ? SLATE_COLORS[950] : SLATE_COLORS[100] }]}
        >
          <View
            ref={courtRef}
            onLayout={measureCourt}
            style={{ width: courtW, height: courtH, borderRadius: 16, overflow: "hidden" }}
            {...panResponder.panHandlers}
          >
            <TacticalCourtSVG width={courtW} height={courtH} />

            {/* Player token overlay */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {Object.entries(positions).map(([key, pos]) => {
                const isBall = key === "BALL";
                const isDefender = key.startsWith("D");
                const num = key.replace("A", "").replace("D", "");

                const left = (pos.x / COURT_VB_W) * courtW;
                const top = (pos.y / COURT_VB_H) * courtH;

                if (isBall) {
                  return (
                    <View
                      key={key}
                      style={[styles.ball, { left: left - 10, top: top - 10 }]}
                    />
                  );
                }

                return (
                  <View
                    key={key}
                    style={[styles.tokenWrapper, { left: left - 14, top: top - 14 }]}
                  >
                    <View style={[styles.token, isDefender ? styles.tokenDef : styles.tokenAtk]}>
                      <Text style={styles.tokenNum}>{isDefender ? `D${num}` : num}</Text>
                    </View>
                    {!isDefender && POSITION_NAMES[key] ? (
                      <View style={styles.tokenLabelBg}>
                        <Text style={styles.tokenLabelText} numberOfLines={1}>
                          {POSITION_NAMES[key]}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Drag hint */}
          <Text style={[styles.dragHint, { color: textSecondary }]}>
            Touchez et glissez les jetons pour repositionner
          </Text>
        </View>

        {/* ── Scrollable bottom section ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Scene timeline pills */}
          {play.scenes.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timelineScroll}
            >
              {play.scenes.map((s, i) => {
                const active = i === sceneIndex;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setSceneIndex(i)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: active ? BRAND_COLORS[500] : surface,
                        borderColor: active ? BRAND_COLORS[500] : border,
                      },
                    ]}
                  >
                    <Text style={[styles.pillNum, { color: active ? "#FFF" : textSecondary }]}>{i + 1}</Text>
                    <Text
                      style={[styles.pillLabel, { color: active ? "#FFF" : textSecondary }]}
                      numberOfLines={1}
                    >
                      {s.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Prev / Next */}
          {play.scenes.length > 1 && (
            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={() => setSceneIndex((i) => Math.max(0, i - 1))}
                disabled={sceneIndex === 0}
                style={[
                  styles.navBtn,
                  { backgroundColor: surface, borderColor: border, opacity: sceneIndex === 0 ? 0.3 : 1 },
                ]}
              >
                <MaterialCommunityIcons name="chevron-left" size={20} color={textPrimary} />
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
                <Text style={[
                  styles.navBtnText,
                  { color: sceneIndex < play.scenes.length - 1 ? "#FFF" : textPrimary },
                ]}>
                  Suivant
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
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

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  headerTitle: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },

  // Court
  courtOuter: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  dragHint: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },

  // Description
  descBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  descStep: { fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  descTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  descText: { fontSize: 13, fontWeight: "500", lineHeight: 20, marginTop: 2 },

  // Timeline
  timelineScroll: { gap: 8, paddingHorizontal: 2, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 70,
    maxWidth: 120,
    gap: 2,
  },
  pillNum: { fontSize: 14, fontWeight: "900" },
  pillLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    textAlign: "center",
  },

  // Nav
  navRow: { flexDirection: "row", gap: 10 },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  navBtnText: { fontSize: 13, fontWeight: "800" },

  // Tokens
  tokenWrapper: { position: "absolute", alignItems: "center", gap: 2 },
  token: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  tokenAtk: { backgroundColor: "#4f46e5", borderWidth: 2, borderColor: "#818cf8" },
  tokenDef: { backgroundColor: "#dc2626", borderWidth: 2, borderColor: "#f87171" },
  tokenNum: { color: "#FFF", fontSize: 9, fontWeight: "900" },
  tokenLabelBg: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 4, paddingVertical: 1,
    borderRadius: 4,
  },
  tokenLabelText: { color: "#FFF", fontSize: 7, fontWeight: "700" },

  ball: {
    position: "absolute",
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#f97316",
    borderWidth: 1.5, borderColor: "#c2410c",
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
});
