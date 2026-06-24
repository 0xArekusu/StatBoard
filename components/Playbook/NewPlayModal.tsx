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
import { STATUS_COLORS } from "../../src/theme";
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
  const { colors } = useTheme();

  const [name, setName]           = useState("");
  const [category, setCategory]   = useState<PlayCategory>("OFFENSE");
  const [description, setDescription] = useState("");

  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setName("");
      setCategory("OFFENSE");
      setDescription("");
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
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>NOUVEAU SYSTÈME</Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!canCreate}
              style={[styles.createBtn, { backgroundColor: canCreate ? colors.primary : colors.button.secondary }]}
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
              <Text style={[styles.label, { color: colors.text.secondary }]}>NOM DU SYSTÈME *</Text>
              <TextInput
                ref={nameRef}
                value={name}
                onChangeText={setName}
                placeholder="ex : Pick & Roll haut, Zone 2-3..."
                placeholderTextColor={colors.text.disabled}
                style={[styles.input, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, color: colors.text.primary }]}
                returnKeyType="next"
                maxLength={60}
              />
            </View>

            {/* Category */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>CATÉGORIE</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map(({ key, label, icon }) => {
                  const active = category === key;
                  const activeColor = key === "DEFENSE" ? STATUS_COLORS.errorLight : colors.primary;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setCategory(key)}
                      style={[
                        styles.categoryPill,
                        {
                          backgroundColor: active ? `${activeColor}20` : colors.surfaceVariant,
                          borderColor: active ? activeColor : colors.border,
                          borderWidth: active ? 1.5 : 1,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={icon as any}
                        size={14}
                        color={active ? activeColor : colors.text.secondary}
                      />
                      <Text style={[styles.categoryLabel, { color: active ? activeColor : colors.text.secondary }]}>
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
              <Text style={[styles.label, { color: colors.text.secondary }]}>DESCRIPTION (optionnel)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Décrivez l'objectif tactique de ce système..."
                placeholderTextColor={colors.text.disabled}
                style={[styles.textarea, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, color: colors.text.primary }]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={300}
              />
              <Text style={[styles.charCount, { color: colors.text.secondary }]}>
                {description.length}/300
              </Text>
            </View>

            {/* Info tip */}
            <View style={[styles.tip, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
              <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
              <Text style={[styles.tipText, { color: colors.text.secondary }]}>
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
  createBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
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
