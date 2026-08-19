import { useEffect, useState } from "react";

/**
 * État replié/déployé d'une barre qui peut se réduire selon la configuration
 * d'écran (paysage téléphone, portrait téléphone...).
 * - `collapseWhen` : repasse en repliée dès que la condition devient vraie
 *   (ex: entrée en paysage téléphone, où l'espace est rare).
 * - `expandWhen` : repasse en déployée dès que la condition devient vraie
 *   (optionnel, ex: entrée en portrait téléphone, où on veut l'info par défaut).
 */
export function useCollapsibleBar(collapseWhen: boolean, expandWhen: boolean = false) {
  const [expanded, setExpanded] = useState(() => !collapseWhen);

  useEffect(() => {
    if (collapseWhen) setExpanded(false);
  }, [collapseWhen]);

  useEffect(() => {
    if (expandWhen) setExpanded(true);
  }, [expandWhen]);

  return [expanded, setExpanded] as const;
}
