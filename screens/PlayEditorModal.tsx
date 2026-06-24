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
import { STATUS_COLORS, COMMON_COLORS } from "../src/theme";
import { PlaybookItem, PlayScene, DrawingPoint, DrawingStroke, DrawingTool } from "../src/models/PlayTypes";
import TacticalCourtSVG from "../components/Playbook/TacticalCourtSVG";
import DrawingOverlaySVG from "../components/Playbook/DrawingOverlaySVG";
import PlayerToken from "../components/Playbook/PlayerToken";
import PlaybackControls from "../components/Playbook/PlaybackControls";
import StrokeManagerSheet from "../components/Playbook/StrokeManagerSheet";

const COURT_VB_W = 100;
const COURT_VB_H = 85;
const DRAG_THRESHOLD = 10;
const ALL_TOKEN_KEYS = ["A1","A2","A3","A4","A5","D1","D2","D3","D4","D5","BALL"] as const;
const ATTACKER_KEYS = ["A1","A2","A3","A4","A5"] as const;

function derivePositionsFromDrawings(
  positions: Record<string, DrawingPoint>,
  drawings: DrawingStroke[],
): Record<string, DrawingPoint> {
  const pos: Record<string, DrawingPoint> = {};
  for (const k of Object.keys(positions)) pos[k] = { ...positions[k] };

  for (const stroke of drawings) {
    if (stroke.points.length < 2) continue;
    const start = stroke.points[0];
    const end   = stroke.points[stroke.points.length - 1];

    const sourceKey = stroke.sourceToken ?? null;

    if (stroke.type === DrawingTool.Pass) {
      pos["BALL"] = { x: end.x, y: end.y };
    } else if (stroke.type === DrawingTool.Drive) {
      if (!sourceKey) continue;
      const ball = pos["BALL"];
      const ballNear = ball && Math.hypot(ball.x - start.x, ball.y - start.y) < 8;
      pos[sourceKey] = { x: end.x, y: end.y };
      if (ballNear) pos["BALL"] = { x: end.x, y: end.y };
    } else if (stroke.type === DrawingTool.Screen) {
      if (!sourceKey) continue;
      pos[sourceKey] = { x: end.x, y: end.y };
    }
  }

  return pos;
}

const CATEGORY_LABELS: Record<string, string> = {
  OFFENSE: "ATTAQUE", DEFENSE: "DÉFENSE",
  OUT_OF_BOUNDS: "TOUCHE", PRESS_BREAK: "PRESSE", OTHER: "AUTRE",
};


const DRAW_COLORS = [
  "#2563eb",
  STATUS_COLORS.errorLight,
  STATUS_COLORS.warning,
  STATUS_COLORS.successLight,
  "#eab308",
  COMMON_COLORS.white,
];

const TOOL_DEFAULT_COLOR: Partial<Record<DrawingTool, string>> = {
  [DrawingTool.Drive]:  "#2563eb",
  [DrawingTool.Pass]:   STATUS_COLORS.warning,
  [DrawingTool.Screen]: COMMON_COLORS.white,
};

const TOOLS: { key: DrawingTool; icon: string; label: string }[] = [
  { key: DrawingTool.Move,   icon: "cursor-move",       label: "DÉPLACER" },
  { key: DrawingTool.Pass,   icon: "dots-horizontal",   label: "PASSE" },
  { key: DrawingTool.Drive,  icon: "arrow-right-bold",  label: "COURSE" },
  { key: DrawingTool.Screen, icon: "rectangle-outline", label: "ÉCRAN" },
  { key: DrawingTool.Pencil, icon: "pencil",            label: "DESSIN" },
];

interface PlayEditorModalProps {
  play: PlaybookItem | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (updated: PlaybookItem) => void;
}

export default function PlayEditorModal({ play, visible, onClose, onUpdate }: PlayEditorModalProps) {
  const { colors } = useTheme();
  const { width: screenW } = useWindowDimensions();

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
  const [activeTool, setActiveTool] = useState<DrawingTool>(DrawingTool.Move);
  const activeToolRef = useRef<DrawingTool>(DrawingTool.Move);
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const drawColorRef = useRef(DRAW_COLORS[0]);
  const [straightMode, setStraightMode] = useState(true);
  const straightModeRef = useRef(true);
  const [toolbarWrap, setToolbarWrap] = useState(false);

  const syncDrawColor    = (c: string)      => { drawColorRef.current   = c; setDrawColor(c); };
  const syncStraightMode = (v: boolean)     => { straightModeRef.current = v; setStraightMode(v); };
  const syncActiveTool   = (t: DrawingTool) => {
    activeToolRef.current = t;
    setActiveTool(t);
    const defaultColor = TOOL_DEFAULT_COLOR[t];
    if (defaultColor) syncDrawColor(defaultColor);
  };

  // ── Drag ─────────────────────────────────────────────────────────────────
  const draggingKey    = useRef<string | null>(null);
  const sourceTokenRef = useRef<string | null>(null);
  const courtRef       = useRef<View>(null);
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
    const derivedPositions = derivePositionsFromDrawings(positionsRef.current, drawingsRef.current);
    const newScene: PlayScene = {
      id: `scene-${Date.now()}`,
      title: `Étape ${scenes.length + 1}`,
      description: "",
      positions: derivedPositions as any,
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
    syncActiveTool(DrawingTool.Move);
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
          if (activeToolRef.current === DrawingTool.Move) {
            let best: string | null = null, bestDist = DRAG_THRESHOLD;
            for (const [key, pos] of Object.entries(positionsRef.current)) {
              const d = Math.hypot(pos.x - pt.x, pos.y - pt.y);
              if (d < bestDist) { bestDist = d; best = key; }
            }
            draggingKey.current = best;
          } else if (activeToolRef.current === DrawingTool.Pencil) {
            draggingKey.current = null;
            sourceTokenRef.current = null;
            livePointsRef.current = [pt];
            setLivePoints([pt]);
          } else {
            // pass / drive / screen : doit démarrer depuis un attaquant
            draggingKey.current = null;
            let found: string | null = null;
            let foundPos: DrawingPoint | null = null;
            let foundDist = DRAG_THRESHOLD;
            for (const key of ATTACKER_KEYS) {
              const p = positionsRef.current[key];
              if (!p) continue;
              const d = Math.hypot(p.x - pt.x, p.y - pt.y);
              if (d < foundDist) { foundDist = d; found = key; foundPos = p; }
            }
            if (found && foundPos) {
              sourceTokenRef.current = found;
              const snap = { x: foundPos.x, y: foundPos.y };
              livePointsRef.current = [snap];
              setLivePoints([snap]);
            } else {
              sourceTokenRef.current = null;
              livePointsRef.current = [];
              setLivePoints([]);
            }
          }
        });
      },

      onPanResponderMove: (_evt, gs) => {
        const { x, y } = courtAbsPos.current;
        const cx = Math.max(1, Math.min(99, ((gs.moveX - x) / courtW) * COURT_VB_W));
        const cy = Math.max(1, Math.min(84, ((gs.moveY - y) / courtH) * COURT_VB_H));

        if (activeToolRef.current === DrawingTool.Move) {
          const key = draggingKey.current;
          if (!key) return;
          positionsRef.current = { ...positionsRef.current, [key]: { x: cx, y: cy } };
          const offset = key === "BALL" ? 10 : 14;
          animatedPositions.current[key]?.setValue({
            x: (cx / COURT_VB_W) * courtWRef.current - offset,
            y: (cy / COURT_VB_H) * courtHRef.current - offset,
          });
        } else {
          const prev = livePointsRef.current;
          if (prev.length === 0) return;
          const pt = { x: cx, y: cy };
          const isFreeDraw = activeToolRef.current === DrawingTool.Pencil || !straightModeRef.current;
          const next = isFreeDraw ? [...prev, pt] : [prev[0], pt];
          livePointsRef.current = next;
          setLivePoints([...next]);
        }
      },

      onPanResponderRelease: () => {
        if (activeToolRef.current === DrawingTool.Move) {
          draggingKey.current = null;
          return;
        }
        const pts = livePointsRef.current;
        if (pts.length >= 2) {
          const stroke: DrawingStroke = {
            id: `s-${Date.now()}`,
            type: activeToolRef.current as Exclude<DrawingTool, DrawingTool.Move>,
            points: pts,
            color: drawColorRef.current,
            width: 1.5,
            sourceToken: sourceTokenRef.current ?? undefined,
          };
          undoStackRef.current = [...undoStackRef.current, [...drawingsRef.current]];
          redoStackRef.current = [];
          const next = [...drawingsRef.current, stroke];
          drawingsRef.current = next;
          setDrawings([...next]);
          setCanUndo(true);
          setCanRedo(false);
        }
        sourceTokenRef.current = null;
        livePointsRef.current = [];
        setLivePoints([]);
      },

      onPanResponderTerminate: () => {
        draggingKey.current = null;
        sourceTokenRef.current = null;
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

  // ── Stroke manager sheet ──────────────────────────────────────────────────
  const [showStrokeManager, setShowStrokeManager] = useState(false);

  const deleteStroke = (id: string) => {
    undoStackRef.current = [...undoStackRef.current, [...drawingsRef.current]];
    redoStackRef.current = [];
    const next = drawingsRef.current.filter((s) => s.id !== id);
    drawingsRef.current = next;
    setDrawings([...next]);
    setCanUndo(true);
    setCanRedo(false);
  };

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
  const isDefense  = play.category === "DEFENSE";
  const badgeColor = isDefense ? STATUS_COLORS.errorLight : colors.primary;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="chevron-down" size={26} color={colors.text.secondary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={[styles.badge, { backgroundColor: `${badgeColor}20` }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>
                {CATEGORY_LABELS[play.category] ?? play.category}
              </Text>
            </View>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {play.name}
            </Text>
          </View>
          <TouchableOpacity onPress={handleShare} style={[styles.headerBtn, { alignItems: "center" }]}>
            <MaterialCommunityIcons name="share-variant-outline" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* ── Court ──────────────────────────────────────────────────────── */}
        <View style={[styles.courtOuter, { backgroundColor: colors.background }]}>
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
              liveTool={activeTool === DrawingTool.Move ? DrawingTool.Pencil : activeTool}
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
        <View
          onLayout={(e) => setToolbarWrap(e.nativeEvent.layout.width < 430)}
          style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border, opacity: isPlaying ? 0.4 : 1 }]}
        >
          {/* Row 1 : chips outils + (mode+couleurs si grand écran) + actions */}
          <View style={styles.toolbarRow1}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolScroll}>
              {TOOLS.map(({ key, icon, label }) => {
                const active = activeTool === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => !isPlaying && syncActiveTool(key)}
                    style={[styles.toolBtn, active ? { backgroundColor: colors.primary } : { backgroundColor: colors.surfaceVariant }]}
                  >
                    <MaterialCommunityIcons name={icon as any} size={14} color={active ? colors.onPrimary : colors.text.secondary} />
                    <Text style={[styles.toolLabel, { color: active ? colors.onPrimary : colors.text.secondary }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Mode + couleurs : inline si grand écran */}
            {!toolbarWrap && activeTool !== DrawingTool.Move && (
              <View style={styles.drawingControls}>
                <View style={[styles.modeSep, { backgroundColor: colors.border }]} />
                <TouchableOpacity
                  onPress={() => syncStraightMode(true)}
                  style={[styles.modeBtn, { backgroundColor: colors.surfaceVariant, borderColor: straightMode ? colors.primary : colors.border }]}
                >
                  <MaterialCommunityIcons name="ruler" size={14} color={straightMode ? colors.primary : colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => syncStraightMode(false)}
                  style={[styles.modeBtn, { backgroundColor: colors.surfaceVariant, borderColor: !straightMode ? colors.primary : colors.border }]}
                >
                  <MaterialCommunityIcons name="sine-wave" size={14} color={!straightMode ? colors.primary : colors.text.secondary} />
                </TouchableOpacity>
                <View style={[styles.modeSep, { backgroundColor: colors.border }]} />
                <View style={styles.colorRow}>
                  {DRAW_COLORS.map((c) => (
                    <TouchableOpacity key={c} onPress={() => syncDrawColor(c)}
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        c === COMMON_COLORS.white && styles.colorDotWhite,
                        drawColor === c && (c === COMMON_COLORS.white ? styles.colorDotActiveWhite : styles.colorDotActive),
                      ]} />
                  ))}
                </View>
              </View>
            )}

            <View style={styles.toolActions}>
              <TouchableOpacity onPress={undo} disabled={!canUndo}
                style={[styles.iconBtn, { opacity: !canUndo ? 0.3 : 1 }]}>
                <MaterialCommunityIcons name="undo" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={redo} disabled={!canRedo}
                style={[styles.iconBtn, { opacity: !canRedo ? 0.3 : 1 }]}>
                <MaterialCommunityIcons name="redo" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowStrokeManager(true)} disabled={drawings.length === 0}
                style={[styles.iconBtn, { opacity: drawings.length === 0 ? 0.3 : 1 }]}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2 : mode + couleurs sur petit écran uniquement */}
          {toolbarWrap && activeTool !== DrawingTool.Move && (
            <View style={styles.toolbarRow2}>
              <TouchableOpacity
                onPress={() => syncStraightMode(true)}
                style={[styles.modeBtn, { backgroundColor: colors.surfaceVariant, borderColor: straightMode ? colors.primary : colors.border }]}
              >
                <MaterialCommunityIcons name="ruler" size={14} color={straightMode ? colors.primary : colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => syncStraightMode(false)}
                style={[styles.modeBtn, { backgroundColor: colors.surfaceVariant, borderColor: !straightMode ? colors.primary : colors.border }]}
              >
                <MaterialCommunityIcons name="sine-wave" size={14} color={!straightMode ? colors.primary : colors.text.secondary} />
              </TouchableOpacity>
              <View style={[styles.modeSep, { backgroundColor: colors.border }]} />
              <View style={styles.colorRow}>
                {DRAW_COLORS.map((c) => (
                  <TouchableOpacity key={c} onPress={() => syncDrawColor(c)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      c === COMMON_COLORS.white && styles.colorDotWhite,
                      drawColor === c && (c === COMMON_COLORS.white ? styles.colorDotActiveWhite : styles.colorDotActive),
                    ]} />
                ))}
              </View>
            </View>
          )}
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
        />

        {/* ── Scrollable bottom ──────────────────────────────────────────── */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Scene description — inline editable */}
          {scene && (
            <View style={[styles.descBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.descHeader}>
                <Text style={[styles.descStep, { color: colors.primary }]}>
                  ÉTAPE {sceneIndex + 1} / {localScenes.length}
                </Text>
                {localScenes.length > 1 && (
                  <TouchableOpacity
                    onPress={() => deleteScene(sceneIndex)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={15} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                value={scene.title}
                onChangeText={(v) => updateSceneText("title", v)}
                style={[styles.descTitleInput, { color: colors.text.primary }]}
                placeholder="Titre de l'étape..."
                placeholderTextColor={colors.text.secondary}
                maxLength={60}
              />
              <TextInput
                value={scene.description}
                onChangeText={(v) => updateSceneText("description", v)}
                style={[styles.descTextInput, { color: colors.text.secondary, backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                placeholder="Décrivez les mouvements de cette étape..."
                placeholderTextColor={colors.text.disabled}
                multiline
                textAlignVertical="top"
                maxLength={300}
              />
            </View>
          )}

          {/* Timeline + add scene */}
          <View style={styles.timelineHeader}>
            <Text style={[styles.timelineLabel, { color: colors.text.secondary }]}>ÉTAPES</Text>
            <View style={styles.timelineActions}>
              {localScenes.length > 1 && !isPlaying && (
                <TouchableOpacity
                  onPress={() => setIsSorting((v) => !v)}
                  style={[styles.addSceneBtn, {
                    backgroundColor: isSorting ? colors.primary : colors.surfaceVariant,
                  }]}
                >
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={13}
                    color={isSorting ? colors.onPrimary : colors.text.secondary}
                  />
                  <Text style={[styles.addSceneBtnText, { color: isSorting ? colors.onPrimary : colors.text.secondary }]}>
                    TRI
                  </Text>
                </TouchableOpacity>
              )}
              {(() => {
                const isLast = sceneIndex === localScenes.length - 1;
                return (
                  <TouchableOpacity
                    onPress={isLast ? addScene : undefined}
                    style={[styles.addSceneBtn, {
                      backgroundColor: isLast ? colors.primary : colors.surfaceVariant,
                      opacity: isLast ? 1 : 0.4,
                    }]}
                    disabled={!isLast}
                  >
                    <MaterialCommunityIcons name="plus" size={13} color={isLast ? colors.onPrimary : colors.text.secondary} />
                    <Text style={[styles.addSceneBtnText, { color: isLast ? colors.onPrimary : colors.text.secondary }]}>AJOUTER</Text>
                  </TouchableOpacity>
                );
              })()}
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
                      <MaterialCommunityIcons name="chevron-left" size={14} color={colors.text.secondary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => isSorting ? undefined : changeScene(i)}
                    style={[styles.pill, {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: isSorting ? colors.text.tertiary : active ? colors.primary : colors.border,
                      borderStyle: isSorting ? "dashed" : "solid",
                    }]}
                  >
                    <Text style={[styles.pillNum, { color: active ? colors.onPrimary : colors.text.secondary }]}>{i + 1}</Text>
                    <Text style={[styles.pillLabel, { color: active ? colors.onPrimary : colors.text.secondary }]} numberOfLines={1}>
                      {s.title}
                    </Text>
                  </TouchableOpacity>
                  {isSorting && (
                    <TouchableOpacity
                      onPress={() => moveScene(i, 1)}
                      disabled={i === localScenes.length - 1}
                      style={[styles.pillArrow, { opacity: i === localScenes.length - 1 ? 0.2 : 1 }]}
                    >
                      <MaterialCommunityIcons name="chevron-right" size={14} color={colors.text.secondary} />
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
                style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: sceneIndex === 0 ? 0.3 : 1 }]}
              >
                <MaterialCommunityIcons name="chevron-left" size={20} color={colors.text.primary} />
                <Text style={[styles.navBtnText, { color: colors.text.primary }]}>Précédent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => changeScene(Math.min(localScenes.length - 1, sceneIndex + 1))}
                disabled={sceneIndex === localScenes.length - 1}
                style={[styles.navBtn, {
                  backgroundColor: sceneIndex < localScenes.length - 1 ? colors.primary : colors.surface,
                  borderColor: colors.border,
                  opacity: sceneIndex === localScenes.length - 1 ? 0.3 : 1,
                }]}
              >
                <Text style={[styles.navBtnText, { color: sceneIndex < localScenes.length - 1 ? colors.onPrimary : colors.text.primary }]}>Suivant</Text>
                <MaterialCommunityIcons name="chevron-right" size={20}
                  color={sceneIndex < localScenes.length - 1 ? colors.onPrimary : colors.text.primary} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <StrokeManagerSheet
          visible={showStrokeManager}
          drawings={drawings}
          onClose={() => setShowStrokeManager(false)}
          onDeleteStroke={deleteStroke}
          onClearAll={clearDrawings}
        />
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

  toolbar: { flexDirection: "column", borderBottomWidth: 1, paddingVertical: 8 },
  toolbarRow1: { flexDirection: "row", alignItems: "center", paddingRight: 8 },
  toolbarRow2: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingTop: 6 },
  toolScroll: { paddingHorizontal: 10, gap: 6 },
  toolBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  toolLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
  toolActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  drawingControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  modeSep: { width: 1, height: 16 },
  modeBtn: { padding: 6, borderRadius: 8, borderWidth: 1.5 },
  colorRow: { flexDirection: "row", gap: 5 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  colorDotActive: { borderWidth: 2, borderColor: "#FFF", transform: [{ scale: 1.2 }] },
  colorDotWhite: { borderWidth: 1, borderColor: "#94a3b8" },
  colorDotActiveWhite: { borderWidth: 2, borderColor: "#475569", transform: [{ scale: 1.2 }] },
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
