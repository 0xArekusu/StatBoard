import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { BRAND_COLORS, SLATE_COLORS } from "../src/theme";
import { PlaybookItem, PlayCategory } from "../src/models/PlayTypes";
import { MOCK_PLAYS } from "../constants/mockPlays";

const CATEGORY_LABELS: Record<PlayCategory | "ALL", string> = {
  ALL: "Tous",
  OFFENSE: "Attaque",
  DEFENSE: "Défense",
  OUT_OF_BOUNDS: "Touche",
  PRESS_BREAK: "Presse",
  OTHER: "Autre",
};

const CATEGORY_ORDER: (PlayCategory | "ALL")[] = [
  "ALL",
  "OFFENSE",
  "DEFENSE",
  "OUT_OF_BOUNDS",
  "PRESS_BREAK",
  "OTHER",
];

export default function PlaybookScreen() {
  const { isDark } = useTheme();

  const bg = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surface = isDark ? SLATE_COLORS[900] : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const border = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

  const [plays] = useState<PlaybookItem[]>(MOCK_PLAYS);
  const [activeCategory, setActiveCategory] = useState<PlayCategory | "ALL">("ALL");

  const filteredPlays = useMemo(() => {
    if (activeCategory === "ALL") return plays;
    return plays.filter((p) => p.category === activeCategory);
  }, [plays, activeCategory]);

  const activeCategoriesWithAll = useMemo<(PlayCategory | "ALL")[]>(() => {
    const present = new Set(plays.map((p) => p.category));
    return CATEGORY_ORDER.filter(
      (c) => c === "ALL" || present.has(c as PlayCategory)
    );
  }, [plays]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? SLATE_COLORS[900] : "#FFFFFF", borderBottomColor: border }]}>
        <View>
          <Text style={[styles.headerLabel, { color: BRAND_COLORS[500] }]}>
            TABLEAU TACTIQUE
          </Text>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            Systèmes tactiques
          </Text>
        </View>
        <TouchableOpacity style={[styles.newButton, { backgroundColor: BRAND_COLORS[500] }]}>
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.newButtonText}>NOUVEAU</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter */}
      <View style={[styles.filterRow, { backgroundColor: isDark ? SLATE_COLORS[900] : "#FFFFFF", borderBottomColor: border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {activeCategoriesWithAll.map((cat) => {
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
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isActive ? "#FFFFFF" : textSecondary },
                  ]}
                >
                  {CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Play list */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredPlays.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="strategy" size={40} color={isDark ? SLATE_COLORS[700] : SLATE_COLORS[300]} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              Aucun système dans cette catégorie.
            </Text>
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
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------

interface PlayCardProps {
  play: PlaybookItem;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
}

function PlayCard({ play, surface, border, textPrimary, textSecondary }: PlayCardProps) {
  const isDefense = play.category === "DEFENSE";
  const badgeColor = isDefense ? "#ef4444" : BRAND_COLORS[500];
  const badgeBg = isDefense ? "#ef444420" : `${BRAND_COLORS[500]}20`;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: surface, borderColor: border }]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.categoryBadgeText, { color: badgeColor }]}>
            {CATEGORY_LABELS[play.category]}
          </Text>
        </View>
        <View style={styles.scenesChip}>
          <MaterialCommunityIcons name="layers-outline" size={11} color={SLATE_COLORS[400]} />
          <Text style={[styles.scenesText, { color: SLATE_COLORS[400] }]}>
            {play.scenes.length} étape{play.scenes.length > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardTitle, { color: textPrimary }]} numberOfLines={1}>
        {play.name}
      </Text>
      <Text style={[styles.cardDesc, { color: textSecondary }]} numberOfLines={2}>
        {play.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.sceneDots}>
          {play.scenes.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === 0 ? BRAND_COLORS[500] : SLATE_COLORS[600] },
              ]}
            />
          ))}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={18} color={SLATE_COLORS[500]} />
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  newButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Filter
  filterRow: {
    borderBottomWidth: 1,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // List
  list: { flex: 1 },
  listContent: {
    padding: 16,
    gap: 12,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },

  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  scenesChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scenesText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sceneDots: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
