/**
 * Web polyfill: `locationX` / `locationY` on SVG press events.
 *
 * On native, press events expose `nativeEvent.locationX/locationY` (position
 * relative to the pressed element). react-native-svg on the web forwards the
 * raw DOM MouseEvent instead, which has no such fields: BasketballCourtSVG
 * then computes NaN court coordinates, the action marker is not drawn and the
 * action is rejected by SQLite (semantic_x / semantic_y are NOT NULL).
 *
 * This adds read-only getters on MouseEvent, relative to the closest <svg>
 * ancestor of the event target, so the existing court component works on the
 * web unchanged. No-op on iOS/Android and when the fields already exist.
 *
 * Imported once by the demo root, before any screen renders.
 */

import { Platform } from "react-native";

type PressAxis = "x" | "y";

const LOCATION_PROPERTIES: Record<PressAxis, "locationX" | "locationY"> = {
  x: "locationX",
  y: "locationY",
};

function getLocationOnClosestSvg(event: MouseEvent, axis: PressAxis): number | undefined {
  const target = event.target;
  if (!(target instanceof Element)) return undefined;

  const svg = target.closest("svg");
  if (!svg) return undefined;

  const bounds = svg.getBoundingClientRect();
  return axis === "x" ? event.clientX - bounds.left : event.clientY - bounds.top;
}

function definePressLocation(axis: PressAxis): void {
  const property = LOCATION_PROPERTIES[axis];
  if (property in MouseEvent.prototype) return;

  Object.defineProperty(MouseEvent.prototype, property, {
    configurable: true,
    get(this: MouseEvent) {
      return getLocationOnClosestSvg(this, axis);
    },
  });
}

if (Platform.OS === "web" && typeof MouseEvent !== "undefined") {
  definePressLocation("x");
  definePressLocation("y");
}
