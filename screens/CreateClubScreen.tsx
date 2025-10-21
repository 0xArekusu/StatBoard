import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import BasketballCourtSVG from "../components/BasketballCourtSVG";

const PRESET_COLORS = [
  "#FF6B35",
  "#4CAF50",
  "#2196F3",
  "#9C27B0",
  "#FFC107",
  "#E91E63",
  "#00BCD4",
  "#FF5722",
  "#607D8B",
  "#8BC34A",
];

export default function CreateClubScreen() {
  const navigation = useNavigation();
  const [clubName, setClubName] = useState("");
  const [sigle, setSigle] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#FF6B35");
  const [secondaryColor, setSecondaryColor] = useState("#4CAF50");
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const handlePickImage = async () => {
    Alert.alert("Logo", "Fonctionnalité bientôt disponible");
    // TODO: Implémenter expo-image-picker
  };

  const handleCreateClub = () => {
    if (!clubName.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un nom de club");
      return;
    }
    if (!sigle.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un sigle");
      return;
    }

    // TODO: Créer le club dans Supabase
    const clubCode = Math.floor(100000 + Math.random() * 900000).toString();
    Alert.alert(
      "Club créé !",
      `Votre code de club : ${clubCode}\nPartagez-le avec vos membres.`,
      [
        { text: "Copier le code", onPress: () => {} },
        { text: "OK", onPress: () => navigation.goBack() },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer un club</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
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
            placeholder="Ex: LAL, LAL, CHI"
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
                onPress={() => setPrimaryColor(color)}
              >
                {primaryColor === color && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
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
                onPress={() => setSecondaryColor(color)}
              >
                {secondaryColor === color && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
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
            <View style={styles.courtContainer}>
              <BasketballCourtSVG
                width={320}
                height={180}
                backgroundColor="#1a472a"
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
          style={styles.createButton}
          onPress={handleCreateClub}
        >
          <Text style={styles.createButtonText}>Créer mon club</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
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
  courtPreview: {
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
  createButton: {
    backgroundColor: "#9C27B0",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
