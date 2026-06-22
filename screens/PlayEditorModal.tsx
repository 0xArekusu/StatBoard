import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  PanResponder,
  Alert,
  Share,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { BRAND_COLORS, SLATE_COLORS } from "../src/theme";
import { PlaybookItem, PlayScene, DrawingPoint, DrawingStroke, DrawingTool } from "../src/models/PlayTypes";
import TacticalCourtSVG from "../components/Playbook/TacticalCourtSVG";
import DrawingOverlaySVG from "../components/Playbook/DrawingOverlaySVG";
import PlayerToken from "../components/Playbook/PlayerToken";
import PlaybackControls from "../components/Playbook/PlaybackControls";

const COURT_VB_W = 100;
const COURT_VB_H = 85;
const DRAG_THRESHOLD = 10;
const ALL_TOKEN_KEYS = ["A1","A2","A3","A4","A5","D1","D2","D3","D4","D5","BALL"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  OFFENSE: "ATTAQUE", DEFENSE: "DÉFENSE",
  OUT_OF_BOUNDS: "TOUCHE", PRESS_BREAK: "PRESSE", OTHER: "AUTRE",
};


const DRAW_COLORS = ["#2563eb", "#dc2626", "#ea580c", "#16a34a", "#eab308"];

const TOOLS: { key: DrawingTool; icon: string; label: string }[] = [
  { key: "move",   icon: "cursor-move",      label: "DÉPLACER" },
  { key: "pass",   icon: "dots-horizontal",  label: "PASSE" },
  { key: "drive",  icon: "arrow-right-bold", label: "COURSE" },
  { key: "screen", icon: "rectangle-outline",label: "ÉCRAN" },
  { key: "pencil", icon: "pencil",           label: "DESSIN" },
];

interface PlayEditorModalProps {
  play: PlaybookItem | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (updated: PlaybookItem) => void;
}

export default function PlayEditorModal({ play, visible, onClose, onUpdate }: PlayEditorModalProps) {
  const { isDark } = useTheme();
  const { width: screenW } = useWindowDimensions();

  const bg          = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surface     = isDark ? SLATE_COLORS[900] : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const border      = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];
  const inputBg     = isDark ? SLATE_COLORS[800] : SLATE_COLORS[50];

  const courtW = Math.min(screenW - 32, 480);
  const courtH = Math.round((courtW * COURT_VB_H) / COURT_VB_W);
  const courtWRef = useRef(courtW);
  const courtHRef = useRef(courtH);
  useEffect(() => { courtWRef.current = courtW; courtHRef.current = courtH; }, [courtW, courtH]);

  // ── Scene list (local mutable copy of all scenes) ─────────────────────────
  const [localScenes, setLocalScenesState] = useState<PlayScene[]>([]);
  const localScenesRef = useRef<PlayScene[]>([]);

  const setLocalScenes = (scenes: PlayScene[]) => {
    localScenesRef.current = scenes;
    setLocalScenesState(scenes);
  };

  // ── Scene index ───────────────────────────────────────────────────────────
  const [sceneIndex, setSceneIndexState] = useState(0);
  const sceneIndexRef = useRef(0);

  const setSceneIndex = (i: number) => {
    sceneIndexRef.current = i;
    setSceneIndexState(i);
  };

  // ── Playback ──────────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1500);
  const [showDefenders, setShowDefenders] = useState(true);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(1500);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // ── Animated token positions ───────────────────────────────────────────────
  const animatedPositions = useRef<Record<string, Animated.ValueXY>>(
    Object.fromEntries(ALL_TOKEN_KEYS.map(k => [k, new Animated.ValueXY()]))
  );

  const snapPositions = useCallback((pos: Record<string, DrawingPoint>) => {
    for (const [key, p] of Object.entries(pos)) {
      const anim = animatedPositions.current[key];
      if (!anim) continue;
      const offset = key === "BALL" ? 10 : 14;
      anim.setValue({
        x: (p.x / COURT_VB_W) * courtWRef.current - offset,
        y: (p.y / COURT_VB_H) * courtHRef.current - offset,
      });
    }
  }, []);

  const animatePositions = useCallback((pos: Record<string, DrawingPoint>, duration: number) => {
    const anims = Object.entries(pos).map(([key, p]) => {
      const anim = animatedPositions.current[key];
      if (!anim) return null;
      const offset = key === "BALL" ? 10 : 14;
      return Animated.timing(anim, {
        toValue: {
          x: (p.x / COURT_VB_W) * courtWRef.current - offset,
          y: (p.y / COURT_VB_H) * courtHRef.current - offset,
        },
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      });
    }).filter(Boolean) as Animated.CompositeAnimation[];
    Animated.parallel(anims).start();
  }, []);

  // ── Per-scene mutable state (positions + drawings) ────────────────────────
  const positionsRef = useRef<Record<string, DrawingPoint>>({});

  const [drawings, setDrawings] = useState<DrawingStroke[]>([]);
  const drawingsRef = useRef<DrawingStroke[]>([]);

  const [livePoints, setLivePoints] = useState<DrawingPoint[]>([]);
  const livePointsRef = useRef<DrawingPoint[]>([]);

  // ── Undo / redo stacks (drawings only) ───────────────────────────────────
  const undoStackRef = useRef<DrawingStroke[][]>([]);
  const redoStackRef = useRef<DrawingStroke[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // ── Tool & color ──────────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<DrawingTool>("move");
  const activeToolRef = useRef<DrawingTool>("move");
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const drawColorRef = useRef(DRAW_COLORS[0]);

  const syncActiveTool = (t: DrawingTool) => { activeToolRef.current = t; setActiveTool(t); };
  const syncDrawColor  = (c: string)     => { drawColorRef.current  = c; setDrawColor(c); };

  // ── Drag ─────────────────────────────────────────────────────────────────
  const draggingKey = useRef<string | null>(null);
  const courtRef    = useRef<View>(null);
  const courtAbsPos = useRef({ x: 0, y: 0 });

  const measureCourt = useCallback(() => {
    courtRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
      courtAbsPos.current = { x: px, y: py };
    });
  }, []);

  // ── Commit current scene edits into localScenesRef ───────────────────────
  const commitCurrentScene = useCallback((): PlayScene[] => {
    const scenes = [...localScenesRef.current];
    if (scenes.length === 0) return scenes;
    scenes[sceneIndexRef.current] = {
      ...scenes[sceneIndexRef.current],
      positions: { ...positionsRef.current } as any,
      drawings: [...drawingsRef.current],
    };
    localScenesRef.current = scenes;
    return scenes;
  }, []);

  // ── Load a scene into local edit state ───────────────────────────────────
  const loadScene = useCallback((scene: PlayScene) => {
    const pos: Record<string, DrawingPoint> = {};
    for (const [k, v] of Object.entries(scene.positions)) pos[k] = { ...v };
    positionsRef.current = pos;
    snapPositions(pos);

    const dr = (scene.drawings ?? []).map((d) => ({ ...d }));
    drawingsRef.current = dr;
    setDrawings([...dr]);

    livePointsRef.current = [];
    setLivePoints([]);

    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, [snapPositions]);

  // ── Change scene: commit current → load next ──────────────────────────────
  const changeScene = useCallback((newIndex: number) => {
    commitCurrentScene();
    setSceneIndex(newIndex);
    loadScene(localScenesRef.current[newIndex]);
  }, [commitCurrentScene, loadScene]);

  // ── Close: stop playback → commit → emit update → close ──────────────────
  const handleClose = useCallback(() => {
    if (!play) { onClose(); return; }
    setIsPlaying(false);
    const scenes = commitCurrentScene();
    setLocalScenes(scenes);
    onUpdate({ ...play, scenes });
    onClose();
  }, [play, commitCurrentScene, onUpdate, onClose]);

  // ── Add scene (duplicate current positions, blank drawings) ───────────────
  const addScene = useCallback(() => {
    const scenes = commitCurrentScene();
    const newScene: PlayScene = {
      id: `scene-${Date.now()}`,
      title: `Étape ${scenes.length + 1}`,
      description: "",
      positions: { ...positionsRef.current } as any,
      drawings: [],
    };
    const updated = [...scenes, newScene];
    localScenesRef.current = updated;
    setLocalScenesState([...updated]);
    const newIndex = updated.length - 1;
    setSceneIndex(newIndex);
    loadScene(newScene);
  }, [commitCurrentScene, loadScene]);

  // ── Delete scene ──────────────────────────────────────────────────────────
  const deleteScene = useCallback((indexToDelete: number) => {
    if (localScenesRef.current.length <= 1) return;
    Alert.alert("Supprimer l'étape", "Supprimer cette étape du système ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          const scenes = commitCurrentScene();
          const updated = scenes.filter((_, i) => i !== indexToDelete);
          localScenesRef.current = updated;
          setLocalScenesState([...updated]);
          const newIndex = Math.max(0, Math.min(indexToDelete, updated.length - 1));
          setSceneIndex(newIndex);
          loadScene(updated[newIndex]);
        },
      },
    ]);
  }, [commitCurrentScene, loadScene]);

  // ── Update scene text (title / description) ───────────────────────────────
  const updateSceneText = useCallback((field: "title" | "description", value: string) => {
    const scenes = [...localScenesRef.current];
    scenes[sceneIndexRef.current] = { ...scenes[sceneIndexRef.current], [field]: value };
    localScenesRef.current = scenes;
    setLocalScenesState([...scenes]);
  }, []);

  // ── Advance one scene during playback (reads only from refs) ─────────────
  const advanceSceneForPlayback = useCallback(() => {
    if (localScenesRef.current.length < 2) return;
    const nextIdx = (sceneIndexRef.current + 1) % localScenesRef.current.length;
    sceneIndexRef.current = nextIdx;
    setSceneIndexState(nextIdx);
    const scene = localScenesRef.current[nextIdx];
    const pos: Record<string, DrawingPoint> = {};
    for (const [k, v] of Object.entries(scene.positions)) pos[k] = { ...(v as DrawingPoint) };
    positionsRef.current = pos;
    animatePositions(pos, speedRef.current * 0.88);
    const dr = (scene.drawings ?? []).map((d) => ({ ...d }));
    drawingsRef.current = dr;
    setDrawings([...dr]);
    livePointsRef.current = [];
    setLivePoints([]);
  }, [animatePositions]);

  // ── Playback loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(advanceSceneForPlayback, speedRef.current);
    return () => {
      clearInterval(timer);
      Object.values(animatedPositions.current).forEach(a => a.stopAnimation());
      // Snap back to current scene positions
      const scene = localScenesRef.current[sceneIndexRef.current];
      if (scene) {
        const pos: Record<string, DrawingPoint> = {};
        for (const [k, v] of Object.entries(scene.positions)) pos[k] = { ...(v as DrawingPoint) };
        snapPositions(pos);
      }
    };
  }, [isPlaying, advanceSceneForPlayback, snapPositions]);

  // ── Init on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!play || !visible) return;
    setIsPlaying(false);
    const scenes = play.scenes.map((s) => ({
      ...s,
      positions: Object.fromEntries(Object.entries(s.positions).map(([k, v]) => [k, { ...(v as DrawingPoint) }])),
      drawings: (s.drawings ?? []).map((d) => ({ ...d, points: [...d.points] })),
    })) as PlayScene[];
    localScenesRef.current = scenes;
    setLocalScenesState(scenes);
    setSceneIndex(0);
    loadScene(scenes[0]);
    syncActiveTool("move");
  }, [play?.id, visible]);

  // ── PanResponder ──────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isPlayingRef.current,
      onMoveShouldSetPanResponder:  () => !isPlayingRef.current,

      onPanResponderGrant: (_evt, gs) => {
        courtRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
          courtAbsPos.current = { x: px, y: py };
          const pt = {
            x: Math.max(1, Math.min(99, ((gs.x0 - px) / courtW) * COURT_VB_W)),
            y: Math.max(1, Math.min(84, ((gs.y0 - py) / courtH) * COURT_VB_H)),
          };
          if (activeToolRef.current === "move") {
            let best: string | null = null, bestDist = DRAG_THRESHOLD;
            for (const [key, pos] of Object.entries(positionsRef.current)) {
              const d = Math.hypot(pos.x - pt.x, pos.y - pt.y);
              if (d < bestDist) { bestDist = d; best = key; }
            }
            draggingKey.current = best;
          } else {
            draggingKey.current = null;
            livePointsRef.current = [pt];
            setLivePoints([pt]);
          }
        });
      },

      onPanResponderMove: (_evt, gs) => {
        const { x, y } = courtAbsPos.current;
        const cx = Math.max(1, Math.min(99, ((gs.moveX - x) / courtW) * COURT_VB_W));
        const cy = Math.max(1, Math.min(84, ((gs.moveY - y) / courtH) * COURT_VB_H));

        if (activeToolRef.current === "move") {
          const key = draggingKey.current;
          if (!key) return;
          positionsRef.current = { ...positionsRef.current, [key]: { x: cx, y: cy } };
          const offset = key === "BALL" ? 10 : 14;
          animatedPositions.current[key]?.setValue({
            x: (cx / COURT_VB_W) * courtWRef.current - offset,
            y: (cy / COURT_VB_H) * courtHRef.current - offset,
          });
        } else {
          const pt = { x: cx, y: cy };
          const prev = livePointsRef.current;
          const next = activeToolRef.current === "pencil"
            ? [...prev, pt]
            : [prev[0] ?? pt, pt];
          livePointsRef.current = next;
          setLivePoints([...next]);
        }
      },

      onPanResponderRelease: () => {
        if (activeToolRef.current === "move") {
          draggingKey.current = null;
          return;
        }
        const pts = livePointsRef.current;
        if (pts.length >= 2) {
          const stroke: DrawingStroke = {
            id: `s-${Date.now()}`,
            type: activeToolRef.current as DrawingStroke["type"],
            points: pts,
            color: drawColorRef.current,
            width: 3,
          };
          undoStackRef.current = [...undoStackRef.current, [...drawingsRef.current]];
          redoStackRef.current = [];
          const next = [...drawingsRef.current, stroke];
          drawingsRef.current = next;
          setDrawings([...next]);
          setCanUndo(true);
          setCanRedo(false);
        }
        livePointsRef.current = [];
        setLivePoints([]);
      },

      onPanResponderTerminate: () => {
        draggingKey.current = null;
        livePointsRef.current = [];
        setLivePoints([]);
      },
    })
  ).current;

  const undo = () => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    redoStackRef.current = [[...drawingsRef.current], ...redoStackRef.current];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    drawingsRef.current = prev;
    setDrawings([...prev]);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  };

  const redo = () => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[0];
    undoStackRef.current = [...undoStackRef.current, [...drawingsRef.current]];
    redoStackRef.current = redoStackRef.current.slice(1);
    drawingsRef.current = next;
    setDrawings([...next]);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const clearDrawings = () => {
    if (drawingsRef.current.length === 0) return;
    undoStackRef.current = [...undoStackRef.current, [...drawingsRef.current]];
    redoStackRef.current = [];
    drawingsRef.current = [];
    setDrawings([]);
    setCanUndo(true);
    setCanRedo(false);
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = useCallback(() => {
    if (!play) return;
    const scenes = commitCurrentScene();
    const CATEGORY: Record<string, string> = {
      OFFENSE: "Attaque", DEFENSE: "Défense",
      OUT_OF_BOUNDS: "Touche", PRESS_BREAK: "Presse", OTHER: "Autre",
    };
    const lines: string[] = [
      `🏀 ${play.name}`,
      `Catégorie : ${CATEGORY[play.category] ?? play.category}`,
      play.description ? `\n${play.description}` : "",
      "",
    ];
    scenes.forEach((s, i) => {
      lines.push(`Étape ${i + 1} — ${s.title}`);
      if (s.description) lines.push(s.description);
      const drawCount = s.drawings.length;
      if (drawCount > 0) lines.push(`(${drawCount} tracé${drawCount > 1 ? "s" : ""})`);
      lines.push("");
    });
    lines.push("— Partagé depuis StatBoard");
    Share.share({ message: lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n") });
  }, [play, commitCurrentScene]);

  // ── Sort mode ────────────────────────────────────────────────────────────
  const [isSorting, setIsSorting] = useState(false);

  const moveScene = useCallback((from: number, direction: -1 | 1) => {
    const to = from + direction;
    const scenes = commitCurrentScene();
    if (to < 0 || to >= scenes.length) return;
    const reordered = [...scenes];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    localScenesRef.current = reordered;
    setLocalScenesState([...reordered]);
    // keep active scene selected after move
    const newIdx = sceneIndexRef.current === from ? to : sceneIndexRef.current;
    setSceneIndex(newIdx);
    loadScene(reordered[newIdx]);
  }, [commitCurrentScene, loadScene]);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!play) return null;
  const scene = localScenes[sceneIndex] ?? localScenes[0];
  const isDefense = play.category === "DEFENSE";
  const badgeColor = isDefense ? "#ef4444" : BRAND_COLORS[500];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: bg }]}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
          <TouchableOpacity onPress={handleShare} style={[styles.headerBtn, { alignItems: "center" }]}>
            <MaterialCommunityIcons name="share-variant-outline" size={20} color={textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Court ──────────────────────────────────────────────────────── */}
        <View style={[styles.courtOuter, { backgroundColor: isDark ? SLATE_COLORS[950] : SLATE_COLORS[100] }]}>
          <View
            ref={courtRef}
            onLayout={measureCourt}
            style={{ width: courtW, height: courtH, borderRadius: 16, overflow: "hidden" }}
            {...panResponder.panHandlers}
          >
            <TacticalCourtSVG width={courtW} height={courtH} />
            <DrawingOverlaySVG
              width={courtW} height={courtH}
              drawings={drawings}
              livePoints={livePoints}
              liveTool={activeTool === "move" ? "pencil" : activeTool}
              liveColor={drawColor}
            />
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {ALL_TOKEN_KEYS.map((key) => (
                <PlayerToken
                  key={key}
                  tokenKey={key}
                  animX={animatedPositions.current[key].x}
                  animY={animatedPositions.current[key].y}
                  visible={!key.startsWith("D") || showDefenders}
                />
              ))}
            </View>
          </View>
        </View>

        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <View style={[styles.toolbar, { backgroundColor: surface, borderBottomColor: border, opacity: isPlaying ? 0.4 : 1 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolScroll}>
            {TOOLS.map(({ key, icon, label }) => {
              const active = activeTool === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => !isPlaying && syncActiveTool(key)}
                  style={[styles.toolBtn, active ? { backgroundColor: BRAND_COLORS[500] } : { backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100] }]}
                >
                  <MaterialCommunityIcons name={icon as any} size={14} color={active ? "#FFF" : textSecondary} />
                  <Text style={[styles.toolLabel, { color: active ? "#FFF" : textSecondary }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.toolRight}>
            {activeTool !== "move" && (
              <View style={styles.colorRow}>
                {DRAW_COLORS.map((c) => (
                  <TouchableOpacity key={c} onPress={() => syncDrawColor(c)}
                    style={[styles.colorDot, { backgroundColor: c }, drawColor === c && styles.colorDotActive]} />
                ))}
              </View>
            )}
            <TouchableOpacity onPress={undo} disabled={!canUndo}
              style={[styles.iconBtn, { opacity: !canUndo ? 0.3 : 1 }]}>
              <MaterialCommunityIcons name="undo" size={18} color={textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={redo} disabled={!canRedo}
              style={[styles.iconBtn, { opacity: !canRedo ? 0.3 : 1 }]}>
              <MaterialCommunityIcons name="redo" size={18} color={textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={clearDrawings} disabled={drawings.length === 0}
              style={[styles.iconBtn, { opacity: drawings.length === 0 ? 0.3 : 1 }]}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Playback controls ──────────────────────────────────────────── */}
        <PlaybackControls
          isPlaying={isPlaying}
          speed={speed}
          showDefenders={showDefenders}
          sceneIndex={sceneIndex}
          totalScenes={localScenes.length}
          onTogglePlay={() => { setIsPlaying(v => !v); setIsSorting(false); }}
          onSpeedChange={(ms) => setSpeed(ms)}
          onToggleDefenders={() => setShowDefenders(v => !v)}
          isDark={isDark}
          surface={surface}
          border={border}
          textSecondary={textSecondary}
        />

        {/* ── Scrollable bottom ──────────────────────────────────────────── */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Scene description — inline editable */}
          {scene && (
            <View style={[styles.descBox, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.descHeader}>
                <Text style={[styles.descStep, { color: BRAND_COLORS[500] }]}>
                  ÉTAPE {sceneIndex + 1} / {localScenes.length}
                </Text>
                {localScenes.length > 1 && (
                  <TouchableOpacity
                    onPress={() => deleteScene(sceneIndex)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={15} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                value={scene.title}
                onChangeText={(v) => updateSceneText("title", v)}
                style={[styles.descTitleInput, { color: textPrimary }]}
                placeholder="Titre de l'étape..."
                placeholderTextColor={textSecondary}
                maxLength={60}
              />
              <TextInput
                value={scene.description}
                onChangeText={(v) => updateSceneText("description", v)}
                style={[styles.descTextInput, { color: textSecondary, backgroundColor: inputBg, borderColor: border }]}
                placeholder="Décrivez les mouvements de cette étape..."
                placeholderTextColor={isDark ? SLATE_COLORS[600] : SLATE_COLORS[400]}
                multiline
                textAlignVertical="top"
                maxLength={300}
              />
            </View>
          )}

          {/* Timeline + add scene */}
          <View style={styles.timelineHeader}>
            <Text style={[styles.timelineLabel, { color: textSecondary }]}>ÉTAPES</Text>
            <View style={styles.timelineActions}>
              {localScenes.length > 1 && !isPlaying && (
                <TouchableOpacity
                  onPress={() => setIsSorting((v) => !v)}
                  style={[styles.addSceneBtn, {
                    backgroundColor: isSorting
                      ? BRAND_COLORS[500]
                      : isDark ? SLATE_COLORS[800] : SLATE_COLORS[100],
                  }]}
                >
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={13}
                    color={isSorting ? "#FFF" : textSecondary}
                  />
                  <Text style={[styles.addSceneBtnText, { color: isSorting ? "#FFF" : textSecondary }]}>
                    TRI
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={addScene} style={[styles.addSceneBtn, { backgroundColor: BRAND_COLORS[500] }]}>
                <MaterialCommunityIcons name="plus" size={13} color="#FFF" />
                <Text style={styles.addSceneBtnText}>AJOUTER</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineScroll}>
            {localScenes.map((s, i) => {
              const active = i === sceneIndex;
              return (
                <View key={s.id} style={styles.pillWrapper}>
                  {isSorting && (
                    <TouchableOpacity
                      onPress={() => moveScene(i, -1)}
                      disabled={i === 0}
                      style={[styles.pillArrow, { opacity: i === 0 ? 0.2 : 1 }]}
                    >
                      <MaterialCommunityIcons name="chevron-left" size={14} color={textSecondary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => isSorting ? undefined : changeScene(i)}
                    style={[styles.pill, {
                      backgroundColor: active ? BRAND_COLORS[500] : surface,
                      borderColor: isSorting
                        ? (isDark ? SLATE_COLORS[600] : SLATE_COLORS[300])
                        : active ? BRAND_COLORS[500] : border,
                      borderStyle: isSorting ? "dashed" : "solid",
                    }]}
                  >
                    <Text style={[styles.pillNum, { color: active ? "#FFF" : textSecondary }]}>{i + 1}</Text>
                    <Text style={[styles.pillLabel, { color: active ? "#FFF" : textSecondary }]} numberOfLines={1}>
                      {s.title}
                    </Text>
                  </TouchableOpacity>
                  {isSorting && (
                    <TouchableOpacity
                      onPress={() => moveScene(i, 1)}
                      disabled={i === localScenes.length - 1}
                      style={[styles.pillArrow, { opacity: i === localScenes.length - 1 ? 0.2 : 1 }]}
                    >
                      <MaterialCommunityIcons name="chevron-right" size={14} color={textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Prev / Next */}
          {localScenes.length > 1 && (
            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={() => changeScene(Math.max(0, sceneIndex - 1))}
                disabled={sceneIndex === 0}
                style={[styles.navBtn, { backgroundColor: surface, borderColor: border, opacity: sceneIndex === 0 ? 0.3 : 1 }]}
              >
                <MaterialCommunityIcons name="chevron-left" size={20} color={textPrimary} />
                <Text style={[styles.navBtnText, { color: textPrimary }]}>Précédent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => changeScene(Math.min(localScenes.length - 1, sceneIndex + 1))}
                disabled={sceneIndex === localScenes.length - 1}
                style={[styles.navBtn, {
                  backgroundColor: sceneIndex < localScenes.length - 1 ? BRAND_COLORS[500] : surface,
                  borderColor: border,
                  opacity: sceneIndex === localScenes.length - 1 ? 0.3 : 1,
                }]}
              >
                <Text style={[styles.navBtnText, { color: sceneIndex < localScenes.length - 1 ? "#FFF" : textPrimary }]}>Suivant</Text>
                <MaterialCommunityIcons name="chevron-right" size={20}
                  color={sceneIndex < localScenes.length - 1 ? "#FFF" : textPrimary} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  headerTitle: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },

  courtOuter: { alignItems: "center", paddingVertical: 12 },

  toolbar: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingVertical: 8, paddingRight: 8, gap: 8 },
  toolScroll: { paddingHorizontal: 10, gap: 6 },
  toolBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  toolLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
  toolRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  colorRow: { flexDirection: "row", gap: 5 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  colorDotActive: { borderWidth: 2, borderColor: "#FFF", transform: [{ scale: 1.2 }] },
  iconBtn: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 40 },

  descBox: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  descHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  descStep: { fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  descTitleInput: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2, paddingVertical: 0 },
  descTextInput: {
    fontSize: 13, fontWeight: "500", lineHeight: 20,
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    minHeight: 70,
  },

  timelineHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timelineLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  timelineActions: { flexDirection: "row", gap: 6 },
  addSceneBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  addSceneBtnText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },

  timelineScroll: { gap: 8, paddingVertical: 2 },
  pillWrapper: { flexDirection: "row", alignItems: "center", gap: 2 },
  pillArrow: { padding: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, alignItems: "center", minWidth: 70, maxWidth: 120, gap: 2 },
  pillNum: { fontSize: 14, fontWeight: "900" },
  pillLabel: { fontSize: 8, fontWeight: "700", letterSpacing: 0.2, textTransform: "uppercase", textAlign: "center" },

  navRow: { flexDirection: "row", gap: 10 },
  navBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 13, borderRadius: 14, borderWidth: 1 },
  navBtnText: { fontSize: 13, fontWeight: "800" },

});
