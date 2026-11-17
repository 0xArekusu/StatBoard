/**
 * STUB WEB — react-native-google-mobile-ads
 *
 * Ce module natif (AdMob) n'est pas supporté par React Native Web et fait
 * échouer le bundle web. Sur la branche `web-demo`, on le remplace par ce stub :
 * les pubs sont simplement désactivées (aucun rendu), ce qui est exactement
 * ce qu'on veut pour des captures / vidéos marketing.
 *
 * Résolution via metro.config.js (resolveRequest sur platform === 'web').
 */

const noop = async () => {};

// Default export : mobileAds() renvoie un objet avec initialize()
const mobileAds = () => ({
  initialize: noop,
  setRequestConfiguration: noop,
  openAdInspector: noop,
});

const AdsConsent = {
  requestInfoUpdate: async () => ({
    isConsentFormAvailable: false,
    status: "NOT_REQUIRED",
  }),
  showForm: async () => ({ status: "NOT_REQUIRED" }),
  getConsentInfo: async () => ({ status: "NOT_REQUIRED" }),
};

const AdsConsentStatus = {
  UNKNOWN: "UNKNOWN",
  REQUIRED: "REQUIRED",
  NOT_REQUIRED: "NOT_REQUIRED",
  OBTAINED: "OBTAINED",
};

// Composants de pub : ne rendent rien en web
const BannerAd = () => null;
const NativeAd = () => null;

/**
 * Événements du SDK. Le stub doit exposer les mêmes clés que le vrai module :
 * `useInterstitialAd` lit `AdEventType.LOADED` / `.ERROR` / `.CLOSED` au chargement
 * de l'écran. Sans cet export, `AdEventType` est undefined et l'app web plante
 * sur `Cannot read properties of undefined (reading 'LOADED')` dès qu'un écran
 * utilise le hook (bouton « New Match », fin de match...).
 */
const AdEventType = {
  LOADED: "loaded",
  ERROR: "error",
  OPENED: "opened",
  CLOSED: "closed",
  CLICKED: "clicked",
  IMPRESSION: "impression",
};

// Interstitiel inerte : load() ne charge rien, show() résout tout de suite et
// addAdEventListener renvoie un désabonnement inoffensif (le hook appelle
// systématiquement la fonction retournée pour nettoyer).
const InterstitialAd = {
  createForAdRequest: () => ({
    load: noop,
    show: async () => {},
    addAdEventListener: () => () => {},
  }),
};

const BannerAdSize = {
  BANNER: "BANNER",
  ANCHORED_ADAPTIVE_BANNER: "ANCHORED_ADAPTIVE_BANNER",
  ADAPTIVE_BANNER: "ADAPTIVE_BANNER",
  FULL_BANNER: "FULL_BANNER",
  LARGE_BANNER: "LARGE_BANNER",
  LEADERBOARD: "LEADERBOARD",
  MEDIUM_RECTANGLE: "MEDIUM_RECTANGLE",
  SMART_BANNER: "SMART_BANNER",
};

const TestIds = { BANNER: "test-banner", INTERSTITIAL: "test-interstitial" };

module.exports = mobileAds;
module.exports.default = mobileAds;
module.exports.mobileAds = mobileAds;
module.exports.AdsConsent = AdsConsent;
module.exports.AdsConsentStatus = AdsConsentStatus;
module.exports.BannerAd = BannerAd;
module.exports.NativeAd = NativeAd;
module.exports.InterstitialAd = InterstitialAd;
module.exports.AdEventType = AdEventType;
module.exports.BannerAdSize = BannerAdSize;
module.exports.TestIds = TestIds;
