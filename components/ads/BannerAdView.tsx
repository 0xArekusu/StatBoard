/**
 * BannerAdView
 *
 * Renders an AdMob banner ad at the bottom of a screen.
 * Only renders for users eligible for ads (free / guest tier).
 * Waits for the ads SDK to be ready before displaying.
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useAds } from "../../src/contexts/AdContext";
import { useAdEligibility } from "../../hooks/useAdEligibility";
import { BANNER_AD_UNIT_ID } from "../../constants/adUnits";

export function BannerAdView() {
  const { colors } = useTheme();
  const { adsReady } = useAds();
  const isEligible = useAdEligibility();

  if (!isEligible || !adsReady) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
});
