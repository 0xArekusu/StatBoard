import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { BRAND_COLORS, SLATE_COLORS } from "../src/theme";

export default function PlaybookScreen() {
  const { isDark } = useTheme();

  const bg = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surface = isDark ? SLATE_COLORS[900] : SLATE_COLORS[100];
  const textPrimary = isDark ? "#FFFFFF" : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const border = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { backgroundColor: isDark ? SLATE_COLORS[900] : "#FFFFFF", borderBottomColor: border }]}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>SYSTÈMES TACTIQUES</Text>
      </View>

      <View style={styles.body}>
        <View style={[styles.placeholder, { backgroundColor: surface, borderColor: border }]}>
          <MaterialCommunityIcons
            name="strategy"
            size={48}
            color={BRAND_COLORS[500]}
          />
          <Text style={[styles.placeholderTitle, { color: textPrimary }]}>
            Éditeur de systèmes
          </Text>
          <Text style={[styles.placeholderSub, { color: textSecondary }]}>
            Créez et animez vos systèmes tactiques basketball.{"\n"}
            Bientôt disponible.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  placeholder: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
  },
  placeholderSub: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
});
