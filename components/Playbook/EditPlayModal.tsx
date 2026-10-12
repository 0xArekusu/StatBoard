import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { PlaybookItem } from "../../src/models/PlayTypes";

export interface EditPlayData {
  name: string;
  description: string;
}

interface EditPlayModalProps {
  play: PlaybookItem | null;
  visible: boolean;
  onClose: () => void;
  onSave: (data: EditPlayData) => void;
}

export default function EditPlayModal({ play, visible, onClose, onSave }: EditPlayModalProps) {
  const { colors } = useTheme();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && play) {
      setName(play.name);
      setDescription(play.description ?? "");
      setTimeout(() => nameRef.current?.focus(), 250);
    }
  }, [visible, play?.id]);

  if (!play) return null;

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), description: description.trim() });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
      >
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>Modifier le système</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>NOM *</Text>
            <TextInput
              ref={nameRef}
              value={name}
              onChangeText={setName}
              placeholder="Nom du système..."
              placeholderTextColor={colors.text.disabled}
              style={[styles.input, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, color: colors.text.primary }]}
              returnKeyType="done"
              maxLength={60}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>DESCRIPTION</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Objectif tactique..."
              placeholderTextColor={colors.text.disabled}
              style={[styles.textarea, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, color: colors.text.primary }]}
              multiline
              textAlignVertical="top"
              maxLength={300}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.btn, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
            >
              <Text style={[styles.btnText, { color: colors.text.secondary }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              style={[styles.btn, { backgroundColor: canSave ? colors.primary : colors.button.secondary, borderColor: "transparent" }]}
            >
              <Text style={[styles.btnText, { color: colors.onPrimary }]}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  wrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },

  field: { gap: 6 },
  label: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "500",
    minHeight: 70,
  },

  actions: { flexDirection: "row", gap: 10, marginTop: 2 },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnText: { fontSize: 13, fontWeight: "800" },
});
