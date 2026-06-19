import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { BRAND_COLORS, SLATE_COLORS } from "../src/theme";
import { PlaybookItem, PlayCategory } from "../src/models/PlayTypes";
import { MOCK_PLAYS, STORAGE_KEY_PLAYBOOK, DEFAULT_POSITIONS } from "../constants/mockPlays";
import PlayEditorModal from "./PlayEditorModal";
import NewPlayModal, { NewPlayData } from "../components/Playbook/NewPlayModal";
import PlayThumbnail from "../components/Playbook/PlayThumbnail";

const CATEGORY_LABELS: Record<PlayCategory | "ALL", string> = {
  ALL: "Tous",
  OFFENSE: "Attaque",
  DEFENSE: "Défense",
  OUT_OF_BOUNDS: "Touche",
  PRESS_BREAK: "Presse",
  OTHER: "Autre",
};

const CATEGORY_ORDER: (PlayCategory | "ALL")[] = [
  "ALL", "OFFENSE", "DEFENSE", "OUT_OF_BOUNDS", "PRESS_BREAK", "OTHER",
];

export default function PlaybookScreen() {
  const { isDark } = useTheme();

  const bg          = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surface     = isDark ? SLATE_COLORS[900] : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const border      = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

  // ── Plays state ────────────────────────────────────────────────────────────
  const [plays, setPlays] = useState<PlaybookItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [selectedPlay, setSelectedPlay]     = useState<PlaybookItem | null>(null);
  const [showNewPlayModal, setShowNewPlayModal] = useState(false);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<PlayCategory | "ALL">("ALL");

  // ── Load from AsyncStorage on mount ───────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_PLAYBOOK)
      .then((raw) => {
        if (raw) {
          try {
            setPlays(JSON.parse(raw));
          } catch {
            setPlays(MOCK_PLAYS);
          }
        } else {
          // First launch: seed with presets and persist them
          setPlays(MOCK_PLAYS);
          AsyncStorage.setItem(STORAGE_KEY_PLAYBOOK, JSON.stringify(MOCK_PLAYS));
        }
      })
      .catch(() => setPlays(MOCK_PLAYS))
      .finally(() => setLoading(false));
  }, []);

  // ── Persist helper ─────────────────────────────────────────────────────────
  const persist = (updated: PlaybookItem[]) => {
    setPlays(updated);
    AsyncStorage.setItem(STORAGE_KEY_PLAYBOOK, JSON.stringify(updated));
  };

  // ── Create new play ────────────────────────────────────────────────────────
  const handleCreate = (data: NewPlayData) => {
    const newPlay: PlaybookItem = {
      id: `play-${Date.now()}`,
      name: data.name,
      category: data.category,
      description: data.description,
      createdAt: new Date().toISOString(),
      scenes: [
        {
          id: `scene-${Date.now()}`,
          title: "Positionnement initial",
          description: "",
          positions: { ...DEFAULT_POSITIONS } as any,
          drawings: [],
        },
      ],
    };

    const updated = [newPlay, ...plays];
    persist(updated);
    setShowNewPlayModal(false);
    // Open the editor immediately after creation
    setSelectedPlay(newPlay);
  };

  // ── Update play (called by editor on close) ───────────────────────────────
  const handleUpdate = (updated: PlaybookItem) => {
    setPlays((prev) => {
      const next = prev.map((p) => (p.id === updated.id ? updated : p));
      AsyncStorage.setItem(STORAGE_KEY_PLAYBOOK, JSON.stringify(next));
      return next;
    });
    setSelectedPlay(updated);
  };

  // ── Delete play ────────────────────────────────────────────────────────────
  const handleDelete = (play: PlaybookItem) => {
    Alert.alert(
      "Supprimer le système",
      `Voulez-vous supprimer "${play.name}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            const updated = plays.filter((p) => p.id !== play.id);
            persist(updated);
            if (selectedPlay?.id === play.id) setSelectedPlay(null);
          },
        },
      ]
    );
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filteredPlays = useMemo(() => {
    if (activeCategory === "ALL") return plays;
    return plays.filter((p) => p.category === activeCategory);
  }, [plays, activeCategory]);

  const visibleCategories = useMemo<(PlayCategory | "ALL")[]>(() => {
    const present = new Set(plays.map((p) => p.category));
    return CATEGORY_ORDER.filter((c) => c === "ALL" || present.has(c as PlayCategory));
  }, [plays]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
        <View>
          <Text style={[styles.headerLabel, { color: BRAND_COLORS[500] }]}>TABLEAU TACTIQUE</Text>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Systèmes tactiques</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowNewPlayModal(true)}
          style={[styles.newButton, { backgroundColor: BRAND_COLORS[500] }]}
        >
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.newButtonText}>NOUVEAU</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter */}
      <View style={[styles.filterRow, { backgroundColor: surface, borderBottomColor: border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {visibleCategories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.filterPill,
                  isActive
                    ? { backgroundColor: BRAND_COLORS[500] }
                    : { backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100], borderColor: border, borderWidth: 1 },
                ]}
              >
                <Text style={[styles.filterPillText, { color: isActive ? "#FFFFFF" : textSecondary }]}>
                  {CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Play list */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {loading ? null : filteredPlays.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="strategy" size={40} color={isDark ? SLATE_COLORS[700] : SLATE_COLORS[300]} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              Aucun système dans cette catégorie.
            </Text>
            <TouchableOpacity
              onPress={() => setShowNewPlayModal(true)}
              style={[styles.emptyNewBtn, { backgroundColor: BRAND_COLORS[500] }]}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#FFF" />
              <Text style={styles.emptyNewBtnText}>Créer un système</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredPlays.map((play) => (
            <PlayCard
              key={play.id}
              play={play}
              surface={surface}
              border={border}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              onPress={() => setSelectedPlay(play)}
              onDelete={() => handleDelete(play)}
            />
          ))
        )}
      </ScrollView>

      {/* Editor modal */}
      <PlayEditorModal
        play={selectedPlay}
        visible={selectedPlay !== null}
        onClose={() => setSelectedPlay(null)}
        onUpdate={handleUpdate}
      />

      {/* New play modal */}
      <NewPlayModal
        visible={showNewPlayModal}
        onClose={() => setShowNewPlayModal(false)}
        onCreate={handleCreate}
      />
    </SafeAreaView>
  );
}

// ── PlayCard ──────────────────────────────────────────────────────────────────

interface PlayCardProps {
  play: PlaybookItem;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  onPress: () => void;
  onDelete: () => void;
}

const THUMB_W = 100;
const THUMB_H = Math.round((THUMB_W * 85) / 100);

function PlayCard({ play, surface, border, textPrimary, textSecondary, onPress, onDelete }: PlayCardProps) {
  const isDefense  = play.category === "DEFENSE";
  const badgeColor = isDefense ? "#ef4444" : BRAND_COLORS[500];
  const badgeBg    = isDefense ? "#ef444420" : `${BRAND_COLORS[500]}20`;
  const firstScene = play.scenes[0];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.card, { backgroundColor: surface, borderColor: border }]}
    >
      <View style={styles.cardInner}>
        {/* Left: text content */}
        <View style={styles.cardLeft}>
          <View style={styles.cardHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.categoryBadgeText, { color: badgeColor }]}>
                {CATEGORY_LABELS[play.category]}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={15} color={SLATE_COLORS[500]} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardTitle, { color: textPrimary }]} numberOfLines={2}>
            {play.name}
          </Text>
          {play.description ? (
            <Text style={[styles.cardDesc, { color: textSecondary }]} numberOfLines={2}>
              {play.description}
            </Text>
          ) : null}

          <View style={styles.scenesChip}>
            <MaterialCommunityIcons name="layers-outline" size={11} color={SLATE_COLORS[400]} />
            <Text style={[styles.scenesText, { color: SLATE_COLORS[400] }]}>
              {play.scenes.length} étape{play.scenes.length > 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Right: thumbnail */}
        {firstScene && (
          <View style={[styles.thumbWrapper, { borderColor: border }]}>
            <PlayThumbnail scene={firstScene} width={THUMB_W} height={THUMB_H} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  newButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },

  filterRow: { borderBottomWidth: 1 },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  filterPillText: { fontSize: 12, fontWeight: "700" },

  list: { flex: 1 },
  listContent: { padding: 16, gap: 12 },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 14 },
  emptyText: { fontSize: 14, fontWeight: "500" },
  emptyNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyNewBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },

  card: { borderRadius: 20, borderWidth: 1, padding: 14 },
  cardInner: { flexDirection: "row", gap: 12, alignItems: "center" },
  cardLeft: { flex: 1, gap: 5 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  categoryBadgeText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase" },
  scenesChip: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  scenesText: { fontSize: 11, fontWeight: "600" },
  cardTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  cardDesc: { fontSize: 12, fontWeight: "500", lineHeight: 18 },
  thumbWrapper: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
});
