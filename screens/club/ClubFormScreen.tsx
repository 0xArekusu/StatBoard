import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { usePostHog } from "posthog-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { useClub } from "../../src/contexts/ClubContext";
import { useResponsive } from "../../src/hooks/useResponsive";
import { ServiceFactory } from "../../services/ServiceFactory";
import { supabase } from "../../src/config/supabase";
import { ClubStorageService } from "../../services/ClubStorageService";
import { CreateClubForm } from "../../components/Club";
import { showErrorAlert } from "../../utils/errorAlert";
import {
  ClubFormData,
  INITIAL_CLUB_FORM_DATA,
  ANALYTICS_EVENTS,
} from "../../constants";

interface ClubFormScreenProps {
  navigation: any;
  route?: any;
}

type ClubFormMode = "create" | "edit";

/**
 * ClubFormScreen - Écran plein écran (hors tab bar) pour créer un club
 * supplémentaire ou éditer le club courant. La création du 1er club reste
 * dans l'onglet Club (état vide).
 */
export default function ClubFormScreen({ navigation, route }: ClubFormScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const posthog = usePostHog();
  const { currentClub, refreshClubs } = useClub();
  const { sp, font } = useResponsive();

  const mode: ClubFormMode = route?.params?.mode === "edit" ? "edit" : "create";
  const isEditMode = mode === "edit";

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ClubFormData>(
    isEditMode && currentClub
      ? {
          name: currentClub.name,
          acronym: currentClub.acronym || "",
          code: currentClub.code,
          logoUri: currentClub.logoUrl || null,
          primaryColor: currentClub.primaryColor || "#FF0000",
          secondaryColor: currentClub.secondaryColor || "#0000FF",
          courtColor: currentClub.courtBackgroundColor || "#c2410c",
          courtLinesColor: currentClub.courtLineColor || "#ffffff",
        }
      : INITIAL_CLUB_FORM_DATA,
  );

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFormData({ ...formData, logoUri: result.assets[0].uri });
    }
  };

  const submitEdit = async () => {
    if (!currentClub || !user) return;

    let uploadedLogoUrl = formData.logoUri;
    if (formData.logoUri && formData.logoUri.startsWith("file://")) {
      const clubStorageService = new ClubStorageService(supabase);
      const { path, error } = await clubStorageService.uploadClubLogo(
        formData.logoUri,
        currentClub.id,
      );
      if (error) {
        showErrorAlert({
          messageKey: "clubScreen.errors.uploadLogoFailed",
          error: new Error(t("clubScreen.errors.uploadLogoFailed")),
          context: "ClubFormScreen",
        });
        return;
      }
      uploadedLogoUrl = path;
    }

    const clubService = ServiceFactory.getClubService(supabase);
    await clubService.updateClub(currentClub.id, {
      logoUrl: uploadedLogoUrl || undefined,
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      courtBackgroundColor: formData.courtColor,
      courtLineColor: formData.courtLinesColor,
    });
    await refreshClubs();

    posthog?.capture(ANALYTICS_EVENTS.CLUB_UPDATED);
    Alert.alert(t("common.success"), t("clubScreen.alerts.clubUpdatedSuccess"), [
      { text: t("common.ok"), onPress: () => navigation.goBack() },
    ]);
  };

  const submitCreate = async () => {
    if (!formData.name || !formData.acronym) {
      Alert.alert(t("common.error"), t("clubScreen.alerts.nameAndAcronymRequired"));
      return;
    }
    if (!user) return;

    const clubService = ServiceFactory.getClubService(supabase);
    const result = await clubService.createClub(
      {
        name: formData.name,
        acronym: formData.acronym,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        courtBackgroundColor: formData.courtColor,
        courtLineColor: formData.courtLinesColor,
      },
      user.id,
    );

    if (!result.success || !result.club) {
      showErrorAlert({
        messageKey: "clubScreen.errors.createClubFailed",
        error: new Error(result.error || t("clubScreen.errors.createClubFailed")),
        context: "ClubFormScreen",
      });
      return;
    }

    if (formData.logoUri && formData.logoUri.startsWith("file://")) {
      const clubStorageService = new ClubStorageService(supabase);
      const { path, error } = await clubStorageService.uploadClubLogo(
        formData.logoUri,
        result.club.id,
      );
      if (error) {
        showErrorAlert({
          messageKey: "clubScreen.errors.uploadClubLogoFailed",
          error: new Error(t("clubScreen.errors.uploadClubLogoFailed")),
          context: "ClubFormScreen",
        });
      } else if (path) {
        await clubService.updateClub(result.club.id, { logoUrl: path });
      }
    }

    await refreshClubs();

    posthog?.capture(ANALYTICS_EVENTS.CLUB_CREATED);
    Alert.alert(t("common.success"), t("clubScreen.alerts.clubCreatedSuccess"), [
      { text: t("common.ok"), onPress: () => navigation.goBack() },
    ]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (isEditMode) {
        await submitEdit();
      } else {
        await submitCreate();
      }
    } catch (error) {
      console.error("Error submitting club form:", error);
      showErrorAlert({
        messageKey: isEditMode
          ? "clubScreen.errors.updateClubFailed"
          : "clubScreen.errors.createClubFailed",
        error,
        context: "ClubFormScreen",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={[styles.content, { padding: sp.lg, paddingTop: sp.md }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.header, { marginBottom: sp.lg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text
            style={[
              styles.title,
              { color: colors.text.primary, fontSize: font.xxl },
            ]}
          >
            {isEditMode
              ? t("clubScreen.editClubTitle")
              : t("clubScreen.createNewClubTitle")}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <CreateClubForm
          formData={formData}
          setFormData={setFormData}
          onPickImage={handlePickImage}
          onSubmit={handleSubmit}
          isEditMode={isEditMode}
        />
      </ScrollView>

      <View style={[styles.footer, { padding: sp.lg }]}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={[
            styles.submitButton,
            {
              backgroundColor: submitting ? colors.text.secondary : colors.primary,
              opacity: submitting ? 0.7 : 1,
              padding: sp.md,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.text.primary} />
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={20} color={colors.text.primary} />
              <Text
                style={[
                  styles.submitButtonText,
                  { color: colors.text.primary, fontSize: font.lg },
                ]}
              >
                {isEditMode
                  ? t("clubScreen.editButton")
                  : t("clubScreen.createNewClubTitle")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
  },
  submitButtonText: {
    fontWeight: "bold",
  },
});
