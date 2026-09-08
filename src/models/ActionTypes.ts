/**
 * Action Types and Specifications
 *
 * Enums for basketball actions. Internal code uses English enums;
 * user-facing labels are resolved through i18n at access time.
 */

import { ACTION_COLORS } from "../theme/colors";
import i18n from "../i18n";

/**
 * Main action types
 */
export enum ActionType {
  SHOT = "shot",
  REBOUND = "rebound",
  FOUL = "foul",
  FOUL_DRAWN = "foul_drawn",
  ASSIST = "assist",
  STEAL = "steal",
  BLOCK = "block",
  TURNOVER = "turnover",
  SUBSTITUTION = "substitution",
  TIMEOUT = "timeout",
}

/**
 * Shot specifications
 */
export enum ShotSpecification {
  MADE = "made",
  MISSED = "missed",
}

/**
 * Rebound specifications
 */
export enum ReboundSpecification {
  OFFENSIVE = "offensive",
  DEFENSIVE = "defensive",
  TEAM = "team",
}

/**
 * Foul specifications
 */
export enum FoulSpecification {
  PERSONAL = "personal",
  TECHNICAL = "technical",
  PENALITY = "penality",
  DISQUALIFICATION = "disqualificiation",
}

const FOUL_SPECIFICATION_KEYS: Record<FoulSpecification, string> = {
  [FoulSpecification.PERSONAL]: "personal",
  [FoulSpecification.TECHNICAL]: "technical",
  [FoulSpecification.PENALITY]: "penality",
  [FoulSpecification.DISQUALIFICATION]: "disqualification",
};

/**
 * Localized label for a foul specification (Personal, Technical, Unsportsmanlike, Disqualifying).
 * Returns undefined for an unrecognized specification, mirroring the old
 * `FOUL_SPECIFICATION_FR[spec]` object-indexing behavior so callers can fall back gracefully.
 */
export function getFoulSpecificationLabel(spec: FoulSpecification): string | undefined {
  const key = FOUL_SPECIFICATION_KEYS[spec];
  return key ? i18n.t(`foulSpecification.${key}`) : undefined;
}

/**
 * Substitution specifications
 */
export enum SubstitutionSpecification {
  IN = "in",
  OUT = "out",
}

/**
 * Generic action specification for simple actions
 */
export enum GenericSpecification {
  STANDARD = "standard",
}

/**
 * Check if a shot specification is a made shot
 */
export function isShotMade(spec: ShotSpecification): boolean {
  return spec === ShotSpecification.MADE;
}

/**
 * Action configuration interface
 */
export interface ActionConfig {
  id: string;
  label: string;
  color: string;
  description: string;
  hasPointsSelection?: boolean;
  pointsOptions?: {
    id: number;
    label: string;
    color: string;
  }[];
  specifications?: {
    id: string;
    label: string;
    color: string;
  }[];
}

/**
 * ACTION_CONFIG: Complete configuration for all basketball actions
 *
 * Colors are imported from theme/colors.ts for centralized color management
 */
export const ACTION_CONFIG: Record<string, ActionConfig> = {
  [ActionType.SHOT]: {
    id: ActionType.SHOT,
    get label() { return i18n.t("actionTypes.shot.label"); },
    color: ACTION_COLORS.shot.base,
    get description() { return i18n.t("actionTypes.shot.description"); },
    hasPointsSelection: true,
    pointsOptions: [
      {
        id: 1,
        get label() { return i18n.t("actionTypes.pointsOption", { count: 1 }); },
        color: ACTION_COLORS.shot.points.one,
      },
      {
        id: 2,
        get label() { return i18n.t("actionTypes.pointsOption", { count: 2 }); },
        color: ACTION_COLORS.shot.points.two,
      },
      {
        id: 3,
        get label() { return i18n.t("actionTypes.pointsOption", { count: 3 }); },
        color: ACTION_COLORS.shot.points.three,
      },
    ],
    specifications: [
      {
        id: ShotSpecification.MADE,
        get label() { return i18n.t("shotSpecification.made"); },
        color: ACTION_COLORS.shot.made,
      },
      {
        id: ShotSpecification.MISSED,
        get label() { return i18n.t("shotSpecification.missed"); },
        color: ACTION_COLORS.shot.missed,
      },
    ],
  },
  [ActionType.REBOUND]: {
    id: ActionType.REBOUND,
    get label() { return i18n.t("actionTypes.rebound.label"); },
    color: ACTION_COLORS.rebound.base,
    get description() { return i18n.t("actionTypes.rebound.description"); },
    specifications: [
      {
        id: ReboundSpecification.OFFENSIVE,
        get label() { return i18n.t("reboundSpecification.offensive"); },
        color: ACTION_COLORS.rebound.offensive,
      },
      {
        id: ReboundSpecification.DEFENSIVE,
        get label() { return i18n.t("reboundSpecification.defensive"); },
        color: ACTION_COLORS.rebound.defensive,
      },
      {
        id: ReboundSpecification.TEAM,
        get label() { return i18n.t("reboundSpecification.team"); },
        color: ACTION_COLORS.rebound.base,
      },
    ],
  },
  [ActionType.FOUL]: {
    id: ActionType.FOUL,
    get label() { return i18n.t("actionTypes.foul.label"); },
    color: ACTION_COLORS.foul.base,
    get description() { return i18n.t("actionTypes.foul.description"); },
    specifications: [
      {
        id: FoulSpecification.PERSONAL,
        get label() { return getFoulSpecificationLabel(FoulSpecification.PERSONAL)!; },
        color: ACTION_COLORS.foul.personal,
      },
      {
        id: FoulSpecification.PENALITY,
        get label() { return getFoulSpecificationLabel(FoulSpecification.PENALITY)!; },
        color: ACTION_COLORS.foul.penality,
      },
      {
        id: FoulSpecification.TECHNICAL,
        get label() { return getFoulSpecificationLabel(FoulSpecification.TECHNICAL)!; },
        color: ACTION_COLORS.foul.technical,
      },
      {
        id: FoulSpecification.DISQUALIFICATION,
        get label() { return getFoulSpecificationLabel(FoulSpecification.DISQUALIFICATION)!; },
        color: ACTION_COLORS.foul.disqualification,
      },
    ],
  },
  [ActionType.ASSIST]: {
    id: ActionType.ASSIST,
    get label() { return i18n.t("actionTypes.assist.label"); },
    color: ACTION_COLORS.assist,
    get description() { return i18n.t("actionTypes.assist.description"); },
    specifications: [],
  },
  [ActionType.STEAL]: {
    id: ActionType.STEAL,
    get label() { return i18n.t("actionTypes.steal.label"); },
    color: ACTION_COLORS.steal,
    get description() { return i18n.t("actionTypes.steal.description"); },
    specifications: [],
  },
  [ActionType.BLOCK]: {
    id: ActionType.BLOCK,
    get label() { return i18n.t("actionTypes.block.label"); },
    color: ACTION_COLORS.block,
    get description() { return i18n.t("actionTypes.block.description"); },
    specifications: [],
  },
  [ActionType.TURNOVER]: {
    id: ActionType.TURNOVER,
    get label() { return i18n.t("actionTypes.turnover.label"); },
    color: ACTION_COLORS.turnover,
    get description() { return i18n.t("actionTypes.turnover.description"); },
    specifications: [],
  },
  [ActionType.FOUL_DRAWN]: {
    id: ActionType.FOUL_DRAWN,
    get label() { return i18n.t("actionTypes.foul_drawn.label"); },
    color: ACTION_COLORS.foulDrawn,
    get description() { return i18n.t("actionTypes.foul_drawn.description"); },
    specifications: [],
  },
  [ActionType.SUBSTITUTION]: {
    id: ActionType.SUBSTITUTION,
    get label() { return i18n.t("actionTypes.substitution.label"); },
    color: "#26A69A",
    get description() { return i18n.t("actionTypes.substitution.description"); },
    specifications: [
      {
        id: SubstitutionSpecification.IN,
        get label() { return i18n.t("substitutionSpecification.in"); },
        color: "#4CAF50",
      },
      {
        id: SubstitutionSpecification.OUT,
        get label() { return i18n.t("substitutionSpecification.out"); },
        color: "#FF7043",
      },
    ],
  },
};

/**
 * Get action configuration by type
 */
export function getActionConfig(actionType: string): ActionConfig | undefined {
  return ACTION_CONFIG[actionType];
}

/**
 * Get emoji for an action (with optional specification)
 * @deprecated Emojis have been removed from the config
 */
export function getActionEmoji(
  _actionType: string,
  _specification?: string
): string {
  return "";
}

/**
 * Get color for an action (with optional specification)
 */
export function getActionColor(
  actionType: string,
  specification?: string,
  points?: number
): string {
  const config = ACTION_CONFIG[actionType];
  if (!config) return "#95A5A6"; // Default gray

  // For shots, prioritize specification (made/missed) over points
  // This ensures made shots are green and missed shots are red
  if (
    actionType === ActionType.SHOT &&
    specification &&
    config.specifications
  ) {
    const spec = config.specifications.find((s) => s.id === specification);
    if (spec) return spec.color;
  }

  // For other actions with specification, use spec color
  if (specification && config.specifications) {
    const spec = config.specifications.find((s) => s.id === specification);
    if (spec) return spec.color;
  }

  // For shots with points but no specification (shouldn't happen), return points color
  if (actionType === ActionType.SHOT && points && config.pointsOptions) {
    const pointOption = config.pointsOptions.find((p) => p.id === points);
    if (pointOption) return pointOption.color;
  }

  return config.color;
}

/**
 * Get label for an action
 */
export function getActionLabel(actionType: string): string {
  const config = ACTION_CONFIG[actionType];
  return config?.label || actionType;
}

/**
 * Get all action types (for filters, etc.)
 */
export function getAllActionTypes(): ActionConfig[] {
  return Object.values(ACTION_CONFIG);
}

/**
 * Build the action definitions array for ActionModal and other components.
 * A function (not a static constant) because ACTION_CONFIG's labels are
 * resolved live from i18n — a one-time `.map()` at import time would freeze
 * whichever language was active on first import.
 */
export function getActionDefinitions() {
  return Object.values(ACTION_CONFIG).map((config) => ({
    id: config.id,
    icon: "",
    label: config.label,
    backgroundColor: config.color,
    description: config.description,
    hasPointsSelection: config.hasPointsSelection || false,
    pointsOptions:
      config.pointsOptions?.map((opt) => ({
        id: opt.id,
        label: opt.label,
        icon: "",
        color: opt.color,
      })) || [],
    specifications: (config.specifications || []).map((spec) => ({
      id: spec.id,
      label: spec.label,
      icon: "",
      color: spec.color,
    })),
  }));
}

/**
 * Marker rendering utilities for basketball court visualizations
 */

export interface MarkerPosition {
  x: number;
  y: number;
}

/**
 * Generate SVG string for any marker based on action type and specification
 * Used for both React Native SVG and PDF/SVG exports
 *
 * @param pos - Position of the marker (x, y coordinates)
 * @param color - Color of the marker
 * @param actionType - Type of action (SHOT, REBOUND, FOUL, etc.)
 * @param specification - Specification of the action (MADE, MISSED, etc.)
 * @param size - Size of the marker (default: 8)
 * @returns SVG string for the marker
 */
export function renderMarkerSVG(
  pos: MarkerPosition,
  color: string,
  actionType?: string,
  specification?: string,
  size: number = 8
): string {
  const normalizedActionType = actionType?.toUpperCase();
  const normalizedSpecification = specification?.toUpperCase();

  // Shot made: empty circle (border only)
  if (
    normalizedActionType === ActionType.SHOT.toUpperCase() &&
    normalizedSpecification === ShotSpecification.MADE.toUpperCase()
  ) {
    return `<circle cx="${pos.x}" cy="${pos.y}" r="${size}" fill="none" stroke="${color}" stroke-width="5"/>`;
  }

  // Shot missed: cross (X)
  if (
    normalizedActionType === ActionType.SHOT.toUpperCase() &&
    normalizedSpecification === ShotSpecification.MISSED.toUpperCase()
  ) {
    return `
      <line x1="${pos.x - size}" y1="${pos.y - size}" x2="${
      pos.x + size
    }" y2="${pos.y + size}"
            stroke="${color}" stroke-width="5" stroke-linecap="round"/>
      <line x1="${pos.x + size}" y1="${pos.y - size}" x2="${
      pos.x - size
    }" y2="${pos.y + size}"
            stroke="${color}" stroke-width="5" stroke-linecap="round"/>
    `;
  }

  // Rebound: triangle
  if (normalizedActionType === ActionType.REBOUND.toUpperCase()) {
    const height = size * 1.2;
    const width = size * 1.2;
    return `<polygon points="${pos.x},${pos.y - height} ${pos.x + width},${
      pos.y + height
    } ${pos.x - width},${pos.y + height}"
                     fill="${color}" stroke="#FFFFFF" stroke-width="1"/>`;
  }

  // Foul: diamond (losange)
  if (normalizedActionType === ActionType.FOUL.toUpperCase()) {
    const diamondSize = size * 1.2;
    return `<polygon points="${pos.x},${pos.y - diamondSize} ${
      pos.x + diamondSize
    },${pos.y} ${pos.x},${pos.y + diamondSize} ${pos.x - diamondSize},${pos.y}"
                     fill="${color}" stroke="#FFFFFF" stroke-width="2"/>`;
  }

  // Foul Drawn: diamond (losange)
  if (normalizedActionType === ActionType.FOUL_DRAWN.toUpperCase()) {
    const diamondSize = size * 1.2;
    return `<polygon points="${pos.x},${pos.y - diamondSize} ${
      pos.x + diamondSize
    },${pos.y} ${pos.x},${pos.y + diamondSize} ${pos.x - diamondSize},${pos.y}"
                     fill="${color}" stroke="#FFFFFF" stroke-width="2"/>`;
  }

  // Default: filled circle for all other actions (assist, steal, block, turnover)
  return `<circle cx="${pos.x}" cy="${pos.y}" r="${size}" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>`;
}

/**
 * Get marker shape type for determining which React Native SVG component to render
 * Returns: 'circle-outline' | 'cross' | 'triangle' | 'diamond' | 'circle'
 */
export function getMarkerShapeType(
  actionType?: string,
  specification?: string
): "circle-outline" | "cross" | "triangle" | "diamond" | "circle" {
  const normalizedActionType = actionType?.toUpperCase();
  const normalizedSpecification = specification?.toUpperCase();

  if (normalizedActionType === ActionType.SHOT.toUpperCase()) {
    if (normalizedSpecification === ShotSpecification.MADE.toUpperCase()) {
      return "circle-outline";
    }
    if (normalizedSpecification === ShotSpecification.MISSED.toUpperCase()) {
      return "cross";
    }
  }

  if (normalizedActionType === ActionType.REBOUND.toUpperCase()) {
    return "triangle";
  }

  if (normalizedActionType === ActionType.FOUL.toUpperCase()) {
    return "diamond";
  }

  if (normalizedActionType === ActionType.FOUL_DRAWN.toUpperCase()) {
    return "diamond";
  }

  return "circle";
}
