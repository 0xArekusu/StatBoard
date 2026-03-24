/**
 * useInterstitialAd
 *
 * Preloads an AdMob interstitial and exposes a `showIfReady` function.
 * Callers await `showIfReady()` before navigating — if an ad is ready it
 * plays first, then the promise resolves so navigation can proceed.
 * If no ad is loaded (SDK not ready, user not eligible, load error),
 * the promise resolves immediately without any delay.
 */

import { useEffect, useRef, useCallback } from "react";
import {
  InterstitialAd,
  AdEventType,
} from "react-native-google-mobile-ads";
import { useAds } from "../src/contexts/AdContext";
import { useAdEligibility } from "./useAdEligibility";
import { INTERSTITIAL_AD_UNIT_ID } from "../constants/adUnits";

export function useInterstitialAd() {
  const { adsReady } = useAds();
  const isEligible = useAdEligibility();

  // Mutable ref so callbacks always see the latest instance
  const adRef = useRef<InterstitialAd | null>(null);
  const isLoadedRef = useRef(false);

  const loadAd = useCallback(() => {
    if (!adsReady || !isEligible) return;

    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID);

    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      isLoadedRef.current = true;
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, () => {
      isLoadedRef.current = false;
      unsubscribeLoaded();
      unsubscribeError();
    });

    adRef.current = ad;
    isLoadedRef.current = false;
    ad.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeError();
    };
  }, [adsReady, isEligible]);

  // Load on mount and whenever eligibility / SDK readiness changes
  useEffect(() => {
    const cleanup = loadAd();
    return cleanup;
  }, [loadAd]);

  /**
   * Shows the interstitial if one is loaded, then resolves.
   * If no ad is ready the promise resolves immediately.
   */
  const showIfReady = useCallback((): Promise<void> => {
    const ad = adRef.current;

    if (!ad || !isLoadedRef.current) return Promise.resolve();

    return new Promise((resolve) => {
      const unsubscribeClosed = ad.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          unsubscribeClosed();
          isLoadedRef.current = false;
          // Preload next ad for the following transition
          loadAd();
          resolve();
        }
      );

      const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, () => {
        unsubscribeError();
        resolve();
      });

      ad.show();
    });
  }, [loadAd]);

  return { showIfReady };
}