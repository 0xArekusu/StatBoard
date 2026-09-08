import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import ColorPicker, {
  Panel1,
  HueSlider,
  type ColorFormatsObject,
} from "reanimated-color-picker";
import { useTheme } from "../../src/contexts/ThemeContext";
import { SLATE_COLORS, BRAND_COLORS, COMMON_COLORS } from "../../src/theme";

interface ColorPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  currentColor: string;
  presetColors: readonly string[];
  title: string;
}

export default function ColorPickerModal({
  visible,
  onClose,
  onSelectColor,
  currentColor,
  presetColors,
  title,
}: ColorPickerModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  // Theme-aware colors
  const surfaceColor = isDark ? SLATE_COLORS[900] : COMMON_COLORS.white;
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const borderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

  const handleColorChange = useCallback(
    (colors: ColorFormatsObject) => {
      onSelectColor(colors.hex);
    },
    [onSelectColor],
  );

  const handlePresetSelect = useCallback(
    (color: string) => {
      onSelectColor(color);
    },
    [onSelectColor],
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Preset Colors Grid */}
          <View style={styles.presetSection}>
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>
              {t("colorPickerModal.presetColors")}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetGrid}
            >
              {presetColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    currentColor === color && styles.colorSwatchSelected,
                  ]}
                  onPress={() => handlePresetSelect(color)}
                >
                  {currentColor === color && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={COMMON_COLORS.white}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Custom Color Picker */}
          <View style={styles.customSection}>
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>
              {t("colorPickerModal.customColor")}
            </Text>
            <ColorPicker value={currentColor} onCompleteJS={handleColorChange}>
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.modalConfirmButton,
              { backgroundColor: BRAND_COLORS[600] },
            ]}
            onPress={onClose}
          >
            <Text style={styles.modalConfirmText}>{t("common.confirm")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  presetSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: "row",
    gap: 10,
  },
  colorSwatch: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorSwatchSelected: {
    borderColor: "#333",
  },
  customSection: {
    marginBottom: 24,
  },
  colorPanel: {
    width: "100%",
    height: 200,
    marginBottom: 20,
    borderRadius: 10,
  },
  hueSlider: {
    width: "100%",
    height: 40,
    borderRadius: 20,
    marginBottom: 20,
  },
  modalConfirmButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  modalConfirmText: {
    color: COMMON_COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
