import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      {/* <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      /> */}
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Chargement...</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#666",
  },
});
