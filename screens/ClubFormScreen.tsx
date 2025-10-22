import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import BasketballCourtSVG from "../components/BasketballCourtSVG";
import ColorPicker, {
  Panel1,
  HueSlider,
  type ColorFormatsObject,
} from "reanimated-color-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../src/config/supabase";
import { ServiceFactory } from "../services/ServiceFactory";
import type { Club } from "../models/Club";
import { ROUTES } from "../constants/routes";

const PRESET_COLORS = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#0000FF",
  "#FFFF00",
  "#00FF00",
  "#FFA500",
  "#800080",
  "#808080",
  "#FFC0CB",
];

type RootStackParamList = {
  ClubForm: { clubId?: string };
};

type ClubFormRouteProp = RouteProp<RootStackParamList, "ClubForm">;

export default function ClubFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<ClubFormRouteProp>();
  const clubId = route.params?.clubId;
  const isEditMode = !!clubId;

  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  const [clubName, setClubName] = useState("");
  const [sigle, setSigle] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#FF0000");
  const [secondaryColor, setSecondaryColor] = useState("#0000FF");
  const [courtBackgroundColor, setCourtBackgroundColor] = useState("#1a472a");
  const [courtLineColor, setCourtLineColor] = useState("#FFFFFF");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  const [showCourtBgPicker, setShowCourtBgPicker] = useState(false);
  const [showCourtLinePicker, setShowCourtLinePicker] = useState(false);
  const [isCustomPrimary, setIsCustomPrimary] = useState(false);
  const [isCustomSecondary, setIsCustomSecondary] = useState(false);

  // Load club data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      loadClub();
    }
  }, [clubId]);

  const loadClub = async () => {
    try {
      setLoading(true);
      const clubService = ServiceFactory.getClubService(supabase);
      const clubData = await clubService.getClubById(clubId!);

      if (clubData) {
        setClub(clubData);
        setClubName(clubData.name);
        setSigle(clubData.acronym);
        setPrimaryColor(clubData.primaryColor);
        setSecondaryColor(clubData.secondaryColor);
        setCourtBackgroundColor(clubData.courtBackgroundColor);
        setCourtLineColor(clubData.courtLineColor);
        setLogoUri(clubData.logoUrl || null);
      } else {
        Alert.alert("Erreur", "Club introuvable");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error loading club:", error);
      Alert.alert("Erreur", "Impossible de charger le club");
    } finally {
      setLoading(false);
    }
  };

  const onPrimaryColorChange = useCallback((colors: ColorFormatsObject) => {
    setPrimaryColor(colors.hex);
    setIsCustomPrimary(true);
  }, []);

  const onSecondaryColorChange = useCallback((colors: ColorFormatsObject) => {
    setSecondaryColor(colors.hex);
    setIsCustomSecondary(true);
  }, []);

  const onCourtBgColorChange = useCallback((colors: ColorFormatsObject) => {
    setCourtBackgroundColor(colors.hex);
  }, []);

  const onCourtLineColorChange = useCallback((colors: ColorFormatsObject) => {
    setCourtLineColor(colors.hex);
  }, []);

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission requise",
        "Vous devez autoriser l'accès à vos photos pour importer un logo."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (saving) return;

    try {
      setSaving(true);
      const clubService = ServiceFactory.getClubService(supabase);

      if (isEditMode) {
        // Update existing club
        const result = await clubService.updateClub(clubId!, {
          name: clubName,
          acronym: sigle,
          logoUrl: logoUri || undefined,
          primaryColor,
          secondaryColor,
          courtBackgroundColor,
          courtLineColor,
        });

        if (!result.success) {
          Alert.alert(
            "Erreur",
            result.error || "Impossible de sauvegarder le club"
          );
          return;
        }

        Alert.alert("Succès", "Le club a été mis à jour", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        // Create new club
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          Alert.alert("Erreur", "Vous devez être connecté pour créer un club");
          return;
        }

        const result = await clubService.createClub(
          {
            name: clubName,
            acronym: sigle,
            logoUrl: logoUri || undefined,
            primaryColor,
            secondaryColor,
            courtBackgroundColor,
            courtLineColor,
          },
          user.id
        );

        if (!result.success) {
          Alert.alert("Erreur", result.error || "Impossible de créer le club");
          return;
        }

        const clubCode = result.club!.code;

        // Copy code to clipboard immediately
        Clipboard.setString(clubCode);

        // Success
        Alert.alert(
          "Club créé !",
          `Votre code de club : ${clubCode}\n\n✓ Code copié dans le presse-papier\n\nPartagez-le avec vos membres.`,
          [
            {
              text: "OK",
              onPress: () => {
                navigation.navigate(ROUTES.MAIN_MENU as never);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error saving club:", error);
      Alert.alert("Erreur", "Une erreur inattendue s'est produite");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? "Mon club" : "Créer un club"}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Club code - Only in edit mode */}
        {isEditMode && club && (
          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>Code du club</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{club.code}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  Clipboard.setString(club.code);
                }}
              >
                <Ionicons name="copy-outline" size={24} color="#9C27B0" />
              </TouchableOpacity>
            </View>
            <Text style={styles.codeHint}>
              Partagez ce code pour inviter des membres
            </Text>
          </View>
        )}

        {/* Informations de base */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>

          <Text style={styles.label}>Nom du club *</Text>
          <TextInput
            style={styles.input}
            placeholder="Mon super club"
            value={clubName}
            onChangeText={setClubName}
            maxLength={30}
          />

          <Text style={styles.label}>Sigle *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: LAL, GSW, CHI"
            value={sigle}
            onChangeText={setSigle}
            maxLength={5}
            autoCapitalize="characters"
          />
        </View>

        {/* Personnalisation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personnalisation</Text>

          <Text style={styles.label}>Couleur principale</Text>
          <View style={styles.colorPicker}>
            {PRESET_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  primaryColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => {
                  setPrimaryColor(color);
                  setIsCustomPrimary(false);
                }}
              >
                {primaryColor === color && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.gradientContainer}
              onPress={() => setShowPrimaryPicker(true)}
            >
              <View
                style={[
                  styles.gradientBorder,
                  isCustomPrimary && styles.gradientBorderSelected,
                ]}
              >
                <LinearGradient
                  colors={[
                    "#FF0000",
                    "#FFFF00",
                    "#00FF00",
                    "#00FFFF",
                    "#0000FF",
                    "#FF00FF",
                    "#FF0000",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  {isCustomPrimary ? (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  ) : (
                    <Ionicons name="color-palette" size={24} color="#fff" />
                  )}
                </LinearGradient>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Couleur secondaire</Text>
          <View style={styles.colorPicker}>
            {PRESET_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  secondaryColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => {
                  setSecondaryColor(color);
                  setIsCustomSecondary(false);
                }}
              >
                {secondaryColor === color && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.gradientContainer}
              onPress={() => setShowSecondaryPicker(true)}
            >
              <View
                style={[
                  styles.gradientBorder,
                  isCustomSecondary && styles.gradientBorderSelected,
                ]}
              >
                <LinearGradient
                  colors={[
                    "#FF0000",
                    "#FFFF00",
                    "#00FF00",
                    "#00FFFF",
                    "#0000FF",
                    "#FF00FF",
                    "#FF0000",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  {isCustomSecondary ? (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  ) : (
                    <Ionicons name="color-palette" size={24} color="#fff" />
                  )}
                </LinearGradient>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Logo du club</Text>
          <View style={styles.logoSection}>
            <TouchableOpacity
              style={styles.logoButton}
              onPress={handlePickImage}
            >
              <Ionicons name="camera" size={24} color="#666" />
              <Text style={styles.logoButtonText}>Importer un logo</Text>
            </TouchableOpacity>
            {logoUri && (
              <View style={styles.logoPreview}>
                <Image source={{ uri: logoUri }} style={styles.logoImage} />
              </View>
            )}
          </View>
        </View>

        {/* Prévisualisation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aperçu du terrain</Text>

          <View style={styles.courtPreview}>
            <View style={styles.courtColorPickers}>
              <TouchableOpacity
                style={[
                  styles.courtColorButton,
                  { backgroundColor: courtBackgroundColor },
                ]}
                onPress={() => setShowCourtBgPicker(true)}
              >
                <Ionicons name="color-palette" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.courtColorButton,
                  { backgroundColor: courtLineColor },
                ]}
                onPress={() => setShowCourtLinePicker(true)}
              >
                <Ionicons
                  name="brush"
                  size={20}
                  color={courtLineColor === "#FFFFFF" ? "#000" : "#fff"}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.courtContainer}>
              <BasketballCourtSVG
                width={320}
                height={180}
                backgroundColor={courtBackgroundColor}
                lineColor={courtLineColor}
                logoUri={logoUri}
              />
            </View>
            {clubName && (
              <Text style={styles.clubNamePreview}>
                {clubName} {sigle && `(${sigle})`}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditMode ? "Sauvegarder" : "Créer mon club"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Color Picker Modals */}
      <Modal visible={showPrimaryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Couleur principale</Text>
              <TouchableOpacity onPress={() => setShowPrimaryPicker(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <ColorPicker
              value={primaryColor}
              onCompleteJS={onPrimaryColorChange}
            >
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={() => setShowPrimaryPicker(false)}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSecondaryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Couleur secondaire</Text>
              <TouchableOpacity onPress={() => setShowSecondaryPicker(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <ColorPicker
              value={secondaryColor}
              onCompleteJS={onSecondaryColorChange}
            >
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={() => setShowSecondaryPicker(false)}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCourtBgPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Couleur du fond du terrain</Text>
              <TouchableOpacity onPress={() => setShowCourtBgPicker(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <ColorPicker
              value={courtBackgroundColor}
              onCompleteJS={onCourtBgColorChange}
            >
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={() => setShowCourtBgPicker(false)}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCourtLinePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Couleur des lignes du terrain
              </Text>
              <TouchableOpacity onPress={() => setShowCourtLinePicker(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <ColorPicker
              value={courtLineColor}
              onCompleteJS={onCourtLineColorChange}
            >
              <Panel1 style={styles.colorPanel} />
              <HueSlider style={styles.hueSlider} />
            </ColorPicker>
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={() => setShowCourtLinePicker(false)}
            >
              <Text style={styles.modalConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  scrollView: {
    padding: 20,
    paddingTop: 15,
  },
  codeSection: {
    backgroundColor: "#f8f8f8",
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    alignItems: "center",
  },
  codeLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  codeText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#9C27B0",
    letterSpacing: 4,
  },
  copyButton: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#9C27B0",
  },
  codeHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 5,
    fontStyle: "italic",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f8f8",
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 5,
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
  gradientContainer: {
    width: 50,
    height: 50,
  },
  gradientBorder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  gradientBorderSelected: {
    borderColor: "#333",
  },
  gradientButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  logoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 10,
    borderStyle: "dashed",
  },
  logoButtonText: {
    fontSize: 14,
    color: "#666",
  },
  logoPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#ddd",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  courtColorPickers: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 40,
    flexDirection: "column",
    justifyContent: "center",
    gap: 10,
    zIndex: 10,
  },
  courtColorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  courtPreview: {
    position: "relative",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f8f8",
    borderRadius: 15,
  },
  courtContainer: {
    width: 427,
    height: 240,
  },
  clubNamePreview: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#9C27B0",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  saveButtonDisabled: {
    backgroundColor: "#999",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
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
    color: "#333",
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
    backgroundColor: "#9C27B0",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
