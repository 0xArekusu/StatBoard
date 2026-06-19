import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { BRAND_COLORS, SLATE_COLORS } from "../../src/theme";
import { PlayCategory } from "../../src/models/PlayTypes";

const CATEGORIES: { key: PlayCategory; label: string; icon: string }[] = [
  { key: "OFFENSE",       label: "Attaque",  icon: "arrow-up-bold" },
  { key: "DEFENSE",       label: "Défense",  icon: "shield-half-full" },
  { key: "OUT_OF_BOUNDS", label: "Touche",   icon: "arrow-right-box" },
  { key: "PRESS_BREAK",   label: "Presse",   icon: "run-fast" },
  { key: "OTHER",         label: "Autre",    icon: "dots-horizontal" },
];

export interface NewPlayData {
  name: string;
  category: PlayCategory;
  description: string;
}

interface NewPlayModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: NewPlayData) => void;
}

export default function NewPlayModal({ visible, onClose, onCreate }: NewPlayModalProps) {
  const { isDark } = useTheme();

  const surface   = isDark ? SLATE_COLORS[900] : "#FFFFFF";
  const bg        = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const textPrimary   = isDark ? "#FFFFFF" : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const border    = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];
  const inputBg   = isDark ? SLATE_COLORS[800] : SLATE_COLORS[50];

  const [name, setName]           = useState("");
  const [category, setCategory]   = useState<PlayCategory>("OFFENSE");
  const [description, setDescription] = useState("");

  const nameRef = useRef<TextInput>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setName("");
      setCategory("OFFENSE");
      setDescription("");
      // Auto-focus the name field after the modal animation
      setTimeout(() => nameRef.current?.focus(), 350);
    }
  }, [visible]);

  const canCreate = name.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    onCreate({ name: name.trim(), category, description: description.trim() });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.root, { backgroundColor: bg }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>NOUVEAU SYSTÈME</Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!canCreate}
              style={[styles.createBtn, { backgroundColor: canCreate ? BRAND_COLORS[500] : SLATE_COLORS[700] }]}
            >
              <Text style={styles.createBtnText}>CRÉER</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Name */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: textSecondary }]}>NOM DU SYSTÈME *</Text>
              <TextInput
                ref={nameRef}
                value={name}
                onChangeText={setName}
                placeholder="ex : Pick & Roll haut, Zone 2-3..."
                placeholderTextColor={isDark ? SLATE_COLORS[600] : SLATE_COLORS[400]}
                style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
                returnKeyType="next"
                maxLength={60}
              />
            </View>

            {/* Category */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: textSecondary }]}>CATÉGORIE</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map(({ key, label, icon }) => {
                  const active = category === key;
                  const isDefense = key === "DEFENSE";
                  const activeColor = isDefense ? "#ef4444" : BRAND_COLORS[500];
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setCategory(key)}
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: active ? `${activeColor}20` : inputBg,
                          borderColor: active ? activeColor : border,
                          borderWidth: active ? 1.5 : 1,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={icon as any}
                        size={14}
                        color={active ? activeColor : textSecondary}
                      />
                      <Text style={[styles.categoryLabel, { color: active ? activeColor : textSecondary }]}>
                        {label}
                      </Text>
                      {active && (
                        <MaterialCommunityIcons name="check" size={12} color={activeColor} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: textSecondary }]}>DESCRIPTION (optionnel)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Décrivez l'objectif tactique de ce système..."
                placeholderTextColor={isDark ? SLATE_COLORS[600] : SLATE_COLORS[400]}
                style={[styles.textarea, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={300}
              />
              <Text style={[styles.charCount, { color: textSecondary }]}>
                {description.length}/300
              </Text>
            </View>

            {/* Info tip */}
            <View style={[styles.tip, { backgroundColor: `${BRAND_COLORS[500]}12`, borderColor: `${BRAND_COLORS[500]}30` }]}>
              <MaterialCommunityIcons name="information-outline" size={16} color={BRAND_COLORS[500]} />
              <Text style={[styles.tipText, { color: isDark ? SLATE_COLORS[300] : SLATE_COLORS[600] }]}>
                Le système démarre avec une étape et une formation 5-out par défaut. Vous pourrez déplacer les joueurs et ajouter des tracés dans l'éditeur.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 13, fontWeight: "900", letterSpacing: 1 },
  createBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
  },
  createBtnText: { color: "#FFF", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 24, paddingBottom: 48 },

  field: { gap: 8 },
  label: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },

  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: "700",
  },

  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  categoryLabel: { fontSize: 12, fontWeight: "800" },

  textarea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    fontWeight: "500",
    minHeight: 90,
  },
  charCount: { fontSize: 10, fontWeight: "600", textAlign: "right" },

  tip: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  tipText: { flex: 1, fontSize: 12, fontWeight: "500", lineHeight: 18 },
});
