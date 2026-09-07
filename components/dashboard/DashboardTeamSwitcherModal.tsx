import React from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SHADOW_COLOR } from "../../src/theme";
import { ThemeColors } from "../../src/theme/colors";
import { useResponsive } from "../../src/hooks/useResponsive";
import JerseyIconSimple from "../icons/JerseySimpleIcon";
import { Team } from "../../models/Team";

interface DashboardTeamSwitcherModalProps {
  visible: boolean;
  teams: Team[];
  activeTeamId: string | null;
  colors: ThemeColors;
  onSelect: (teamId: string) => void;
  onClose: () => void;
}

/**
 * DashboardTeamSwitcherModal - Bottom sheet pour changer d'équipe active.
 * Remplace le Picker natif inutilisable sur iOS (pas de flèche, roue tronquée).
 */
export default function DashboardTeamSwitcherModal({
  visible,
  teams,
  activeTeamId,
  colors,
  onSelect,
  onClose,
}: DashboardTeamSwitcherModalProps) {
  const { t } = useTranslation();
  const { sp, font, sizes } = useResponsive();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.header, { padding: sp.lg, borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text.primary, fontSize: font.xl }]}>
              {t("dashboard.teamSwitcherTitle")}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={sizes.iconMd} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ paddingHorizontal: sp.lg }} contentContainerStyle={{ paddingVertical: sp.md }}>
            {teams.map((team) => {
              const isActive = team.id === activeTeamId;
              return (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.item,
                    {
                      backgroundColor: isActive ? `${colors.primary}1A` : "transparent",
                      borderColor: isActive ? colors.primary : colors.border,
                      padding: sp.md,
                      marginBottom: sp.sm,
                    },
                  ]}
                  onPress={() => onSelect(team.id)}
                >
                  <View style={[styles.itemLeft, { gap: sp.md }]}>
                    <JerseyIconSimple width={sizes.iconMd} height={sizes.iconMd} />
                    <Text style={[styles.itemName, { color: colors.text.primary, fontSize: font.lg }]}>
                      {team.name}
                    </Text>
                  </View>
                  {isActive && (
                    <MaterialCommunityIcons name="check-circle" size={sizes.iconMd} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: `${SHADOW_COLOR}80`,
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: "bold",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemName: {
    fontWeight: "600",
  },
});
