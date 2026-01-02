import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { ClubFormData, CLUB_COLOR_PALETTE, COURT_COLOR_PALETTE } from "../../constants/clubConstants";
import CourtPreview from "./CourtPreview";
import JerseyIconSimple from "../icons/JerseySimpleIcon";
import ColorPickerModal from "./ColorPickerModal";
import { COACH_ASSISTANT_LOGO_MARGIN } from "../../src/utils/logoHelper";

interface CreateClubFormProps {
  formData: ClubFormData;
  setFormData: (data: ClubFormData) => void;
  onPickImage: () => void;
  onSubmit: () => void;
  isEditMode: boolean;
}

export default function CreateClubForm({
  formData,
  setFormData,
  onPickImage,
  onSubmit,
  isEditMode,
}: CreateClubFormProps) {
  const { colors, isDark } = useTheme();

  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  const [showCourtPicker, setShowCourtPicker] = useState(false);
  const [showCourtLinesPicker, setShowCourtLinesPicker] = useState(false);

  return (
    <View style={styles.formContainer}>
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <TouchableOpacity
          style={[
            styles.logoPlaceholder,
            {
              backgroundColor: colors.surfaceVariant,
              borderColor: colors.border,
            },
          ]}
          onPress={onPickImage}
        >
          {formData.logoUri ? (
            <Image
              source={{ uri: formData.logoUri }}
              style={styles.logoImage}
            />
          ) : (
            <Image
              source={COACH_ASSISTANT_LOGO_MARGIN}
              style={styles.logoImage}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Club Name - Only show in create mode */}
      {!isEditMode && (
        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
            NOM DU CLUB <Text style={{ color: colors.required }}>*</Text>
          </Text>
          <TextInput
            placeholder="Ex: Los Angeles Lakers"
            placeholderTextColor={colors.text.secondary}
            value={formData.name}
            onChangeText={(value) =>
              setFormData({ ...formData, name: value })
            }
            style={[
              styles.formInput,
              {
                backgroundColor: colors.input.background,
                borderColor: colors.input.border,
                color: colors.text.primary,
              },
            ]}
          />
        </View>
      )}

      {/* Acronym - Only show in create mode */}
      {!isEditMode && (
        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.text.secondary }]}>
            SIGLE <Text style={{ color: colors.required }}>*</Text>
          </Text>
          <TextInput
            placeholder="LAL"
            placeholderTextColor={colors.text.secondary}
            value={formData.acronym}
            onChangeText={(value) =>
              setFormData({ ...formData, acronym: value.toUpperCase() })
            }
            maxLength={6}
            style={[
              styles.formInput,
              styles.acronymInput,
              {
                backgroundColor: colors.input.background,
                borderColor: colors.input.border,
                color: colors.text.primary,
              },
            ]}
          />
        </View>
      )}

      {/* Colors Section */}
      <View
        style={[
          styles.formSection,
          styles.borderTop,
          { borderTopColor: colors.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="palette-outline"
            size={16}
            color={colors.primary}
          />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Couleurs du Club
          </Text>
        </View>

        {/* Primary Color */}
        <Text style={[styles.colorLabel, { color: colors.text.secondary }]}>
          Couleur principale
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorPickerScrollView}
          contentContainerStyle={styles.colorPickerRow}
        >
          <TouchableOpacity
            style={[
              styles.colorOption,
              styles.pickerButton,
              { borderColor: colors.border },
            ]}
            onPress={() => setShowPrimaryPicker(true)}
          >
            <Ionicons name="add" size={28} color={colors.text.secondary} />
          </TouchableOpacity>
          {CLUB_COLOR_PALETTE.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                formData.primaryColor === color &&
                  styles.colorOptionSelected,
              ]}
              onPress={() => {
                setFormData({ ...formData, primaryColor: color });
              }}
            >
              {formData.primaryColor === color && (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Secondary Color */}
        <Text style={[styles.colorLabel, { color: colors.text.secondary }]}>
          Couleur secondaire
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorPickerScrollView}
          contentContainerStyle={styles.colorPickerRow}
        >
          <TouchableOpacity
            style={[
              styles.colorOption,
              styles.pickerButton,
              { borderColor: colors.border },
            ]}
            onPress={() => setShowSecondaryPicker(true)}
          >
            <Ionicons name="add" size={28} color={colors.text.secondary} />
          </TouchableOpacity>
          {CLUB_COLOR_PALETTE.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                formData.secondaryColor === color &&
                  styles.colorOptionSelected,
              ]}
              onPress={() => {
                setFormData({ ...formData, secondaryColor: color });
              }}
            >
              {formData.secondaryColor === color && (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Jersey Preview */}
        <View style={styles.jerseyPreviewContainer}>
          <Text style={[styles.colorLabel, { color: colors.text.secondary }]}>
            Aperçu maillot
          </Text>
          <View style={styles.jerseyPreview}>
            <JerseyIconSimple
              width={80}
              height={80}
              primaryColor={formData.primaryColor}
              secondaryColor={formData.secondaryColor}
              strokeWidth={20}
            />
          </View>
        </View>
      </View>

      {/* Court Customization */}
      <View
        style={[
          styles.formSection,
          styles.borderTop,
          { borderTopColor: colors.border },
        ]}
      >
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="basketball-hoop-outline"
            size={16}
            color={colors.primary}
          />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Personnalisation du terrain
          </Text>
        </View>

        <Text style={[styles.colorLabel, { color: colors.text.secondary }]}>
          Couleur du parquet
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorPickerScrollView}
          contentContainerStyle={styles.colorPickerRow}
        >
          <TouchableOpacity
            style={[
              styles.courtColorButton,
              styles.pickerButton,
              { borderColor: colors.border },
            ]}
            onPress={() => setShowCourtPicker(true)}
          >
            <Ionicons name="add" size={28} color={colors.text.secondary} />
          </TouchableOpacity>
          {COURT_COLOR_PALETTE.map((c) => (
            <TouchableOpacity
              key={`c-${c}`}
              onPress={() => {
                setFormData({ ...formData, courtColor: c });
              }}
              style={[
                styles.courtColorButton,
                { backgroundColor: c },
                formData.courtColor === c && styles.colorOptionSelected,
              ]}
            >
              {formData.courtColor === c && (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.colorLabel, { color: colors.text.secondary }]}>
          Couleur des lignes
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorPickerScrollView}
          contentContainerStyle={styles.colorPickerRow}
        >
          <TouchableOpacity
            style={[
              styles.colorOption,
              styles.pickerButton,
              { borderColor: colors.border },
            ]}
            onPress={() => setShowCourtLinesPicker(true)}
          >
            <Ionicons name="add" size={28} color={colors.text.secondary} />
          </TouchableOpacity>
          {CLUB_COLOR_PALETTE.map((c) => (
            <TouchableOpacity
              key={`l-${c}`}
              onPress={() => {
                setFormData({ ...formData, courtLinesColor: c });
              }}
              style={[
                styles.colorOption,
                { backgroundColor: c },
                formData.courtLinesColor === c &&
                  styles.colorOptionSelected,
              ]}
            >
              {formData.courtLinesColor === c && (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Court Preview */}
      <View style={[styles.courtPreviewContainer, { borderColor: colors.border }]}>
        <CourtPreview
          backgroundColor={formData.courtColor}
          lineColor={formData.courtLinesColor}
          logoUri={
            formData.logoUri
          }
          width={320}
          height={180}
        />
      </View>

      {/* Color Picker Modals */}
      <ColorPickerModal
        visible={showPrimaryPicker}
        onClose={() => setShowPrimaryPicker(false)}
        onSelectColor={(color) => {
          setFormData({ ...formData, primaryColor: color });
        }}
        currentColor={formData.primaryColor}
        presetColors={CLUB_COLOR_PALETTE}
        title="Couleur principale"
      />

      <ColorPickerModal
        visible={showSecondaryPicker}
        onClose={() => setShowSecondaryPicker(false)}
        onSelectColor={(color) => {
          setFormData({ ...formData, secondaryColor: color });
        }}
        currentColor={formData.secondaryColor}
        presetColors={CLUB_COLOR_PALETTE}
        title="Couleur secondaire"
      />

      <ColorPickerModal
        visible={showCourtPicker}
        onClose={() => setShowCourtPicker(false)}
        onSelectColor={(color) => {
          setFormData({ ...formData, courtColor: color });
        }}
        currentColor={formData.courtColor}
        presetColors={COURT_COLOR_PALETTE}
        title="Couleur du parquet"
      />

      <ColorPickerModal
        visible={showCourtLinesPicker}
        onClose={() => setShowCourtLinesPicker(false)}
        onSelectColor={(color) => {
          setFormData({ ...formData, courtLinesColor: color });
        }}
        currentColor={formData.courtLinesColor}
        presetColors={CLUB_COLOR_PALETTE}
        title="Couleur des lignes"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 24,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  formSection: {
    gap: 8,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  formInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: "bold",
  },
  acronymInput: {
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  borderTop: {
    paddingTop: 24,
    borderTopWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 10,
  },
  colorPickerScrollView: {
    marginTop: 5,
  },
  colorPickerRow: {
    flexDirection: "row",
    gap: 10,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorOptionSelected: {
    borderColor: "#333",
  },
  pickerButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderStyle: "dashed",
  },
  courtColorButton: {
    width: 64,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  jerseyPreviewContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  jerseyPreview: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  courtPreviewContainer: {
    width: "100%",
    aspectRatio: 2,
    overflow: "hidden",
  },
});
