import React from "react";
import {
  View, Text, Modal, TouchableOpacity,
  ScrollView, StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { STATUS_COLORS } from "../../src/theme";
import { DrawingStroke, DrawingTool } from "../../src/models/PlayTypes";

const STROKE_META: Record<string, { label: string; icon: string }> = {
  [DrawingTool.Pass]:   { label: "Passe",  icon: "dots-horizontal" },
  [DrawingTool.Drive]:  { label: "Course", icon: "arrow-right-bold" },
  [DrawingTool.Screen]: { label: "Écran",  icon: "rectangle-outline" },
  [DrawingTool.Pencil]: { label: "Dessin", icon: "pencil" },
};

interface Props {
  visible: boolean;
  drawings: DrawingStroke[];
  onClose: () => void;
  onDeleteStroke: (id: string) => void;
  onClearAll: () => void;
}

export default function StrokeManagerSheet({
  visible, drawings, onClose, onDeleteStroke, onClearAll,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Tracés — {drawings.length} élément{drawings.length > 1 ? "s" : ""}
            </Text>
            <View style={styles.headerActions}>
              {drawings.length > 0 && (
                <TouchableOpacity
                  onPress={() => { onClearAll(); onClose(); }}
                  style={[styles.clearAllBtn, { borderColor: STATUS_COLORS.errorLight }]}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={13} color={STATUS_COLORS.errorLight} />
                  <Text style={[styles.clearAllText, { color: STATUS_COLORS.errorLight }]}>Tout supprimer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          {drawings.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="draw" size={32} color={colors.text.disabled} />
              <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                Aucun tracé sur cette étape
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {drawings.map((stroke, index) => {
                const meta = STROKE_META[stroke.type] ?? { label: stroke.type, icon: "pencil" };
                return (
                  <View
                    key={stroke.id}
                    style={[styles.item, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                  >
                    {/* Index */}
                    <Text style={[styles.itemIndex, { color: colors.text.tertiary }]}>
                      {index + 1}
                    </Text>

                    {/* Color swatch */}
                    <View style={[styles.colorDot, { backgroundColor: stroke.color, borderColor: colors.border }]} />

                    {/* Icon + label */}
                    <MaterialCommunityIcons
                      name={meta.icon as any}
                      size={16}
                      color={colors.text.secondary}
                    />
                    <Text style={[styles.itemLabel, { color: colors.text.primary }]}>
                      {meta.label}
                    </Text>

                    <View style={{ flex: 1 }} />

                    {/* Delete */}
                    <TouchableOpacity
                      onPress={() => onDeleteStroke(stroke.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={[styles.deleteBtn, { backgroundColor: `${STATUS_COLORS.errorLight}15` }]}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={15} color={STATUS_COLORS.errorLight} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject },

  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    minHeight: 450,
    maxHeight: "70%",
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: "center", marginTop: 10, marginBottom: 4,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 14, fontWeight: "800" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  clearAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
  },
  clearAllText: { fontSize: 11, fontWeight: "700" },

  empty: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 13, fontWeight: "500" },

  list: { flex: 1, minHeight: 0 },
  listContent: { padding: 12, gap: 8 },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemIndex: { fontSize: 11, fontWeight: "700", width: 16, textAlign: "center" },
  colorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 },
  itemLabel: { fontSize: 13, fontWeight: "700" },
  deleteBtn: { padding: 6, borderRadius: 8 },
});
