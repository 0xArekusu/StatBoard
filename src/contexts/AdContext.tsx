/**
 * AdContext
 *
 * Manages Google Mobile Ads SDK initialization and GDPR consent (UMP).
 * Must wrap the app at startup before any ad component is rendered.
 *
 * Consent flow:
 *  1. Request consent info update from UMP (detects user location)
 *  2. Show the consent form if required (EU users, first launch or expired)
 *  3. Initialize the ads SDK once consent is handled
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import mobileAds, {
  AdsConsent,
  AdsConsentStatus,
} from "react-native-google-mobile-ads";

interface AdContextType {
  adsReady: boolean;
}

const AdContext = createContext<AdContextType>({ adsReady: false });

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [adsReady, setAdsReady] = useState(false);

  useEffect(() => {
    async function initAds() {
      try {
        // Request consent info — UMP auto-detects EU vs non-EU users
        const consentInfo = await AdsConsent.requestInfoUpdate();

        // Show the consent form only if the user is in the EU and hasn't consented yet
        if (
          consentInfo.isConsentFormAvailable &&
          consentInfo.status === AdsConsentStatus.REQUIRED
        ) {
          await AdsConsent.showForm();
        }
      } catch (error) {
        // Consent errors must not block ad initialization
        console.warn("[AdContext] Consent error:", error);
      }

      try {
        await mobileAds().initialize();
        setAdsReady(true);
      } catch (error) {
        console.warn("[AdContext] Ads initialization error:", error);
      }
    }

    initAds();
  }, []);

  return (
    <AdContext.Provider value={{ adsReady }}>
      {children}
    </AdContext.Provider>
  );
}

export function useAds() {
  return useContext(AdContext);
}
