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

// Réduit le nombre de points d'un tracé pour l'animation (max 1 point tous les minDist unités)
function subsamplePath(points: DrawingPoint[], minDist = 1.5): DrawingPoint[] {
  if (points.length <= 2) return points;
  const result: DrawingPoint[] = [points[0]];
  let acc = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const dx = points[i].x - result[result.length - 1].x;
    const dy = points[i].y - result[result.length - 1].y;
    acc += Math.hypot(dx, dy);
    if (acc >= minDist) { result.push(points[i]); acc = 0; }
  }
  result.push(points[points.length - 1]);
  return result;
}

// Crée une animation de suivi de chemin via une unique Animated.Value (0→1) + addListener.
// Pas d'Animated.sequence → pas de gap inter-étape → fluide dès la première frame.
function buildPathAnimation(
  key: string,
  rawPoints: DrawingPoint[],
  duration: number,
  courtW: number,
  courtH: number,
  animMap: Record<string, Animated.ValueXY>,
): Animated.CompositeAnimation | null {
  const anim = animMap[key];
  if (!anim || rawPoints.length < 2) return null;

  const points = subsamplePath(rawPoints, 2);

  // Longueurs d'arc cumulées pour un lookup O(log N) par frame
  const cum: number[] = [0];
  let totalLen = 0;
  for (let i = 1; i < points.length; i++) {
    totalLen += Math.hypot(points[i].x - points[i-1].x, points[i].y - points[i-1].y);
    cum.push(totalLen);
  }
  if (totalLen < 0.1) return null;

  const offset = key === "BALL" ? 10 : 14;
  const progress = new Animated.Value(0);

  // Appelé à chaque frame par le driver Animated
  const listenerId = progress.addListener(({ value }) => {
    const arc = value * totalLen;
    // Recherche binaire du segment courant
    let lo = 0, hi = cum.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cum[mid] <= arc) lo = mid; else hi = mid - 1;
    }
    const segLen = cum[lo + 1] - cum[lo];
    const t = segLen > 0 ? (arc - cum[lo]) / segLen : 0;
    anim.setValue({
      x: ((points[lo].x + t * (points[lo+1].x - points[lo].x)) / COURT_VB_W) * courtW - offset,
      y: ((points[lo].y + t * (points[lo+1].y - points[lo].y)) / COURT_VB_H) * courtH - offset,
    });
  });

  const timing = Animated.timing(progress, {
    toValue: 1,
    duration,
    easing: Easing.linear,
    useNativeDriver: false,
  });

  return {
    start(cb?: (r: { finished: boolean }) => void) {
      timing.start((result) => { progress.removeListener(listenerId); cb?.(result); });
    },
    stop()  { timing.stop();  progress.removeListener(listenerId); },
    reset() { timing.reset(); progress.removeListener(listenerId); },
  } as unknown as Animated.CompositeAnimation;
}

// Animation linéaire simple pour un jeton sans tracé
function buildLinearAnimation(
  key: string,
  target: DrawingPoint,
  duration: number,
  courtW: number,
  courtH: number,
  animMap: Record<string, Animated.ValueXY>,
): Animated.CompositeAnimation | null {
  const anim = animMap[key];
  if (!anim) return null;
  const offset = key === "BALL" ? 10 : 14;
  return Animated.timing(anim, {
    toValue: {
      x: (target.x / COURT_VB_W) * courtW - offset,
      y: (target.y / COURT_VB_H) * courtH - offset,
    },
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: false,
  });
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

// Mode de tracé par défaut à la sélection de l'outil (droit = ligne, libre = tracé main levée)
const TOOL_DEFAULT_STRAIGHT: Partial<Record<DrawingTool, boolean>> = {
  [DrawingTool.Pass]:   true,
  [DrawingTool.Drive]:  false,
  [DrawingTool.Screen]: false,
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
  // Animation d'une seule étape (bouton "étape suivante") — distinct de isPlaying
  // (lecture en boucle) mais doit verrouiller l'édition de la même façon.
  const [isStepping, setIsStepping] = useState(false);
  const [speed, setSpeed] = useState(1500);
  const [showDefenders, setShowDefenders] = useState(true);
  const [hideArrows, setHideArrows] = useState(false);
  const isPlayingRef = useRef(false);
  const isSteppingRef = useRef(false);
  const speedRef = useRef(1500);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isSteppingRef.current = isStepping; }, [isStepping]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  const isAnimating = isPlaying || isStepping;

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

  const syncDrawColor    = (c: string)      => { drawColorRef.current   = c; setDrawColor(c); };
  const syncStraightMode = (v: boolean)     => { straightModeRef.current = v; setStraightMode(v); };
  const syncActiveTool   = (t: DrawingTool) => {
    activeToolRef.current = t;
    setActiveTool(t);
    const defaultColor = TOOL_DEFAULT_COLOR[t];
    if (defaultColor) syncDrawColor(defaultColor);
    const defaultStraight = TOOL_DEFAULT_STRAIGHT[t];
    if (defaultStraight !== undefined) syncStraightMode(defaultStraight);
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

  // ── Unsaved-changes tracking (for the close-confirmation prompt) ─────────
  const dirtyRef = useRef(false);
  const markDirty = useCallback(() => { dirtyRef.current = true; }, []);

  // ── Start/stop playback: commit pending edits before advanceSceneForPlayback
  // starts overwriting drawingsRef/positionsRef with stored scene data ─────────
  const handleTogglePlay = useCallback(() => {
    if (!isPlayingRef.current) {
      commitCurrentScene();
      // La lecture s'arrête désormais à la dernière étape (pas de bouclage) :
      // un nouvel appui repart du début plutôt que de ne rien animer.
      if (sceneIndexRef.current >= localScenesRef.current.length - 1) {
        setSceneIndex(0);
        loadScene(localScenesRef.current[0]);
      }
    }
    setIsPlaying((v) => !v);
    setIsSorting(false);
  }, [commitCurrentScene]);

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
    setIsEditingTitle(false);
  }, [snapPositions]);

  // ── Change scene: commit current → load next ──────────────────────────────
  const changeScene = useCallback((newIndex: number) => {
    commitCurrentScene();
    setSceneIndex(newIndex);
    loadScene(localScenesRef.current[newIndex]);
  }, [commitCurrentScene, loadScene]);

  // ── Save: commit current scene → emit update → clear dirty flag ──────────
  const persistChanges = useCallback(() => {
    if (!play) return;
    const scenes = commitCurrentScene();
    setLocalScenes(scenes);
    onUpdate({ ...play, scenes });
    dirtyRef.current = false;
  }, [play, commitCurrentScene, onUpdate]);

  const handleSave = useCallback(() => {
    setIsPlaying(false);
    persistChanges();
  }, [persistChanges]);

  // ── Close: warn if there are unsaved changes before discarding/closing ───
  const handleRequestClose = useCallback(() => {
    if (!play) { onClose(); return; }
    setIsPlaying(false);
    if (!dirtyRef.current) { onClose(); return; }
    Alert.alert(
      "Modifications non sauvegardées",
      "Ce système contient des changements non sauvegardés. Voulez-vous les sauvegarder avant de fermer ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Fermer sans sauvegarder", style: "destructive", onPress: () => onClose() },
        { text: "Sauvegarder", onPress: () => { persistChanges(); onClose(); } },
      ],
    );
  }, [play, onClose, persistChanges]);

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
    markDirty();
  }, [commitCurrentScene, loadScene, markDirty]);

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
          markDirty();
        },
      },
    ]);
  }, [commitCurrentScene, loadScene, markDirty]);

  // ── Update scene text (title / description) ───────────────────────────────
  const updateSceneText = useCallback((field: "title" | "description", value: string) => {
    const scenes = [...localScenesRef.current];
    scenes[sceneIndexRef.current] = { ...scenes[sceneIndexRef.current], [field]: value };
    localScenesRef.current = scenes;
    setLocalScenesState([...scenes]);
    markDirty();
  }, [markDirty]);

  // ── Advance one scene during playback (reads only from refs) ─────────────
  const advanceSceneForPlayback = useCallback((onDone: (finished: boolean) => void) => {
    if (localScenesRef.current.length < 2) { onDone(false); return; }
    // Dernière étape déjà atteinte : rien à animer, on s'arrête (pas de bouclage).
    if (sceneIndexRef.current >= localScenesRef.current.length - 1) { onDone(false); return; }

    // Capture tracés de la scène courante AVANT d'avancer (contiennent les waypoints)
    const currentDrawings = drawingsRef.current;
    const currentPositions = positionsRef.current;

    const nextIdx = sceneIndexRef.current + 1;
    sceneIndexRef.current = nextIdx;

    const scene = localScenesRef.current[nextIdx];
    const nextPos: Record<string, DrawingPoint> = {};
    for (const [k, v] of Object.entries(scene.positions)) nextPos[k] = { ...(v as DrawingPoint) };
    positionsRef.current = nextPos;

    const duration = speedRef.current;
    const cW = courtWRef.current;
    const cH = courtHRef.current;
    const animMap = animatedPositions.current;

    // Associe chaque jeton à la liste ordonnée de ses tracés (plusieurs tracés
    // successifs sur le même jeton, ex. deux passes chaînées dans une même étape,
    // doivent être chaînés en un seul chemin plutôt que de n'en garder qu'un seul)
    const keyStrokes = new Map<string, DrawingStroke[]>();
    const pushKey = (key: string, stroke: DrawingStroke) => {
      const arr = keyStrokes.get(key);
      if (arr) arr.push(stroke); else keyStrokes.set(key, [stroke]);
    };

    // Position simulée, mise à jour tracé après tracé (même logique que
    // derivePositionsFromDrawings) : un tracé peut suivre une passe/course
    // précédente dans la même étape, donc "où est le ballon ?" doit refléter
    // l'état APRÈS les tracés déjà traités, pas la position figée en début de scène.
    const simPos: Record<string, DrawingPoint> = { ...currentPositions };

    for (const stroke of currentDrawings) {
      if (stroke.points.length < 2) continue;
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      if (stroke.type === DrawingTool.Pass) {
        pushKey("BALL", stroke);
        simPos["BALL"] = end;
      } else if (stroke.type === DrawingTool.Drive && stroke.sourceToken) {
        pushKey(stroke.sourceToken, stroke);
        const ball = simPos["BALL"];
        const ballNear = ball && Math.hypot(ball.x - start.x, ball.y - start.y) < 8;
        simPos[stroke.sourceToken] = end;
        if (ballNear) {
          pushKey("BALL", stroke);
          simPos["BALL"] = end;
        }
      } else if (stroke.type === DrawingTool.Screen && stroke.sourceToken) {
        pushKey(stroke.sourceToken, stroke);
        simPos[stroke.sourceToken] = end;
      }
    }

    const handled = new Set<string>();
    const anims: Animated.CompositeAnimation[] = [];

    for (const [key, strokes] of keyStrokes) {
      handled.add(key);
      const points = strokes.flatMap((s) => s.points);
      const a = buildPathAnimation(key, points, duration, cW, cH, animMap);
      if (a) anims.push(a);
    }

    // Animation linéaire pour les jetons sans tracé
    for (const [key, target] of Object.entries(nextPos)) {
      if (handled.has(key)) continue;
      const a = buildLinearAnimation(key, target, duration, cW, cH, animMap);
      if (a) anims.push(a);
    }

    const dr = (scene.drawings ?? []).map((d) => ({ ...d }));
    drawingsRef.current = dr;
    livePointsRef.current = [];

    // Démarrer l'animation AVANT les setState pour éviter la concurrence
    // avec les re-renders sur les premières frames
    if (anims.length === 0) {
      setSceneIndexState(nextIdx);
      setDrawings([...dr]);
      setLivePoints([]);
      onDone(true);
      return;
    }
    Animated.parallel(anims).start(({ finished }) => onDone(finished));
    setSceneIndexState(nextIdx);
    setDrawings([...dr]);
    setLivePoints([]);
  }, []);

  // ── Step forward: anime jusqu'à l'étape suivante puis s'arrête (pas de boucle) ─
  const handleStepForward = useCallback(() => {
    if (isPlayingRef.current || isSteppingRef.current) return;
    if (sceneIndexRef.current >= localScenesRef.current.length - 1) return;
    commitCurrentScene();
    setIsStepping(true);
    advanceSceneForPlayback(() => setIsStepping(false));
  }, [commitCurrentScene, advanceSceneForPlayback]);

  // ── Playback loop — chaîne les scènes via callbacks, jamais de setInterval ──
  useEffect(() => {
    if (!isPlaying) return;
    let cancelled = false;

    function runLoop() {
      if (cancelled) return;
      advanceSceneForPlayback((finished) => {
        if (cancelled) return;
        if (finished) runLoop();
        else setIsPlaying(false); // dernière étape atteinte → on s'arrête au lieu de reboucler
      });
    }

    // Petite pause initiale pour voir la scène courante avant le premier mouvement
    const firstTimer = setTimeout(runLoop, speedRef.current * 0.15);

    return () => {
      cancelled = true;
      clearTimeout(firstTimer);
      Object.values(animatedPositions.current).forEach(a => a.stopAnimation());
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
    dirtyRef.current = false;
  }, [play?.id, visible]);

  // ── PanResponder ──────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isPlayingRef.current && !isSteppingRef.current,
      onMoveShouldSetPanResponder:  () => !isPlayingRef.current && !isSteppingRef.current,
      onStartShouldSetPanResponderCapture: () => !isPlayingRef.current && !isSteppingRef.current,
      onMoveShouldSetPanResponderCapture:  () => !isPlayingRef.current && !isSteppingRef.current,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (_evt, gs) => {
        // Traitement synchrone : courtAbsPos est maintenu à jour par onLayout (measureCourt).
        // On ne peut pas envelopper dans measure() car c'est async → draggingKey serait null
        // lors des premiers onPanResponderMove → positionsRef jamais mis à jour.
        const { x, y } = courtAbsPos.current;
        const pt = {
          x: Math.max(1, Math.min(99, ((gs.x0 - x) / courtW) * COURT_VB_W)),
          y: Math.max(1, Math.min(84, ((gs.y0 - y) / courtH) * COURT_VB_H)),
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
        // Refresh async pour les gestes futurs (scroll, clavier, rotation)
        courtRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
          courtAbsPos.current = { x: px, y: py };
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
          if (draggingKey.current) markDirty();
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
          markDirty();
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
    markDirty();
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
    markDirty();
  };

  const clearDrawings = () => {
    if (drawingsRef.current.length === 0) return;
    undoStackRef.current = [...undoStackRef.current, [...drawingsRef.current]];
    redoStackRef.current = [];
    drawingsRef.current = [];
    setDrawings([]);
    markDirty();
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

  // ── Scene title: read mode (Text) vs edit mode (TextInput) ────────────────
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus();
  }, [isEditingTitle]);

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
    markDirty();
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
    markDirty();
  }, [commitCurrentScene, loadScene, markDirty]);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!play) return null;
  const scene = localScenes[sceneIndex] ?? localScenes[0];
  const isDefense  = play.category === "DEFENSE";
  const badgeColor = isDefense ? STATUS_COLORS.errorLight : colors.primary;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleRequestClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleRequestClose} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
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
          <TouchableOpacity onPress={handleSave} style={[styles.headerBtn, { alignItems: "center" }]}>
            <MaterialCommunityIcons name="content-save-outline" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
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
              hideDrawings={isAnimating && hideArrows}
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
          style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border, opacity: isAnimating ? 0.4 : 1 }]}
        >
          {/* Row 1 : chips outils + actions */}
          <View style={styles.toolbarRow1}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolScroll}>
              {TOOLS.map(({ key, icon, label }) => {
                const active = activeTool === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => !isAnimating && syncActiveTool(key)}
                    style={[styles.toolBtn, active ? { backgroundColor: colors.primary } : { backgroundColor: colors.surfaceVariant }]}
                  >
                    <MaterialCommunityIcons name={icon as any} size={14} color={active ? colors.onPrimary : colors.text.secondary} />
                    <Text style={[styles.toolLabel, { color: active ? colors.onPrimary : colors.text.secondary }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

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

          {/* Row 2 : type de tracé (droit/libre) + couleurs, sous le choix d'outil */}
          {activeTool !== DrawingTool.Move && (
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
          isStepping={isStepping}
          speed={speed}
          showDefenders={showDefenders}
          hideArrows={hideArrows}
          sceneIndex={sceneIndex}
          totalScenes={localScenes.length}
          onTogglePlay={handleTogglePlay}
          onStepForward={handleStepForward}
          onSpeedChange={(ms) => setSpeed(ms)}
          onToggleDefenders={() => setShowDefenders(v => !v)}
          onToggleHideArrows={() => setHideArrows(v => !v)}
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
              <View style={styles.descTitleRow}>
                {isEditingTitle ? (
                  <TextInput
                    ref={titleInputRef}
                    value={scene.title}
                    onChangeText={(v) => updateSceneText("title", v)}
                    onBlur={() => setIsEditingTitle(false)}
                    onSubmitEditing={() => setIsEditingTitle(false)}
                    returnKeyType="done"
                    style={[
                      styles.descTitleInput,
                      styles.descTitleInputEditing,
                      { color: colors.text.primary, backgroundColor: colors.surfaceVariant, borderColor: colors.primary },
                    ]}
                    placeholder="Titre de l'étape..."
                    placeholderTextColor={colors.text.secondary}
                    maxLength={60}
                  />
                ) : (
                  <Text style={[styles.descTitleInput, styles.descTitleText, { color: colors.text.primary }]} numberOfLines={1}>
                    {scene.title || "Titre de l'étape..."}
                  </Text>
                )}
                <TouchableOpacity
                  onPress={() => setIsEditingTitle((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name={isEditingTitle ? "check" : "pencil-outline"}
                    size={14}
                    color={isEditingTitle ? colors.primary : colors.text.tertiary}
                  />
                </TouchableOpacity>
              </View>
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
              {/* Bouton TRI désactivé temporairement */}
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
  descTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  descTitleInput: { flexShrink: 1, fontSize: 15, fontWeight: "800", letterSpacing: -0.2, paddingVertical: 0 },
  descTitleText: { paddingVertical: 2 },
  descTitleInputEditing: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
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
