import { useEffect, useState } from "react";

/**
 * État replié/déployé d'une barre qui se réduit en paysage téléphone
 * (barre de score, barre d'actions...). Repart toujours repliée à chaque
 * nouvelle entrée en paysage, indépendamment de l'état précédent.
 */
export function useLandscapeCollapse(isMobileLandscape: boolean) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isMobileLandscape) setExpanded(false);
  }, [isMobileLandscape]);

  return [expanded, setExpanded] as const;
}
