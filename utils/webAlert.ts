/**
 * Polyfill Alert pour le web.
 *
 * react-native-web n'implémente pas `Alert` : les appels `Alert.alert(...)`
 * sont silencieusement ignorés. L'utilisateur web n'a donc AUCUN retour en cas
 * d'erreur (limite d'équipes atteinte, échec réseau, validation...) — le bouton
 * semble « ne rien faire ».
 *
 * Ce module remplace `Alert.alert` par une version basée sur `window.alert` /
 * `window.confirm` lorsqu'on tourne sur le web. Sur iOS/Android, le
 * comportement d'origine est conservé à l'identique.
 *
 * Importé une seule fois au démarrage (voir index.ts).
 */
import { Alert, Platform } from "react-native";

interface AlertButton {
  text?: string;
  onPress?: (value?: string) => void;
  style?: "default" | "cancel" | "destructive";
}

if (Platform.OS === "web") {
  const webAlert = Alert as unknown as {
    alert: (title?: string, message?: string, buttons?: AlertButton[]) => void;
  };

  webAlert.alert = (
    title?: string,
    message?: string,
    buttons?: AlertButton[],
  ): void => {
    const text = [title, message]
      .filter((part) => part && String(part).trim().length > 0)
      .join("\n\n");
    const list = buttons ?? [];

    // Deux boutons → on laisse le choix à l'utilisateur (Confirmer / Annuler).
    if (list.length === 2) {
      const confirmed = window.confirm(text || "Confirmer ?");
      const target = confirmed
        ? (list.find((b) => b.style !== "cancel") ?? list[0])
        : (list.find((b) => b.style === "cancel") ?? list[1]);
      target?.onPress?.();
      return;
    }

    // Un seul bouton (ou aucun) → simple message d'information.
    window.alert(text || "Information");
    const main = list.find((b) => b.style !== "cancel") ?? list[0];
    main?.onPress?.();
  };

  // Marqueur de diagnostic (permet de vérifier que le polyfill est bien chargé).
  (window as unknown as { __webAlertPatched?: boolean }).__webAlertPatched = true;
}
