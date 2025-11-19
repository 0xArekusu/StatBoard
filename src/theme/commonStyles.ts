/**
 * Common shared styles across the app
 * For consistent UI elements like headers, buttons, etc.
 */

import { StyleSheet } from "react-native";

export const CommonStyles = StyleSheet.create({
  /**
   * Standard header for screen navigation
   * Use with dynamic colors from theme
   */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },

  /**
   * Header title text
   */
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  /**
   * Header with extra top padding (for screens without SafeArea)
   */
  headerWithSafeArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
});
