import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { useResponsive } from "../src/hooks/useResponsive";
import { ChangelogItem } from "../hooks/useAppUpdateCheck";

interface ChangelogModalProps {
  visible: boolean;
  title: string | null;
  items: ChangelogItem[];
  onClose: () => void;
}

export default function ChangelogModal({ visible, title, items, onClose }: ChangelogModalProps) {
  const { colors, isDark } = useTheme();
  const { sp, font, sizes } = useResponsive();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { padding: sp.lg }]}>
        <View
          style={[
            styles.modal,
            { backgroundColor: colors.surface, borderRadius: sp.lg, padding: sp.lg },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDark ? `${colors.primary}33` : `${colors.primary}1A`,
                width: sizes.avatarLg,
                height: sizes.avatarLg,
                borderRadius: sizes.avatarLg / 2,
                marginBottom: sp.md,
              },
            ]}
          >
            <Ionicons name="sparkles" size={sizes.avatarMd} color={colors.primary} />
          </View>

          <Text
            style={[
              styles.title,
              { color: colors.text.primary, fontSize: font.xxl, marginBottom: sp.md },
            ]}
          >
            {title ?? "Nouveautés"}
          </Text>

          <ScrollView
            style={{ maxHeight: 260, alignSelf: "stretch" }}
            contentContainerStyle={{ paddingBottom: sp.sm }}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item, i) => (
              <View key={i} style={[styles.itemRow, { marginBottom: sp.md }]}>
                {item.emoji ? (
                  <Text style={[styles.itemEmoji, { fontSize: font.lg, marginRight: sp.sm }]}>
                    {item.emoji}
                  </Text>
                ) : (
                  <Ionicons
                    name="checkmark-circle"
                    size={sizes.iconMd}
                    color={colors.primary}
                    style={{ marginRight: sp.sm }}
                  />
                )}
                <View style={styles.itemBody}>
                  <Text
                    style={[styles.itemTitle, { color: colors.text.primary, fontSize: font.md }]}
                  >
                    {item.title}
                  </Text>
                  {!!item.text && (
                    <Text
                      style={[
                        styles.itemText,
                        { color: colors.text.secondary, fontSize: font.sm, marginTop: sp.xs },
                      ]}
                    >
                      {item.text}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary, paddingVertical: sp.md, borderRadius: sp.md, marginTop: sp.md },
            ]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: colors.onPrimary, fontSize: font.md }]}>
              J'ai compris
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  title: {
    fontWeight: "bold",
    textAlign: "center",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    alignSelf: "stretch",
  },
  itemEmoji: {
    lineHeight: 24,
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: "700",
  },
  itemText: {
    lineHeight: 20,
  },
  button: {
    width: "100%",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontWeight: "bold",
  },
});
