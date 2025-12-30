/**
 * Action Types and Specifications
 *
 * Enums for basketball actions with French translations for UI display.
 * Internal code uses English enums, but user-facing text remains in French.
 */

import { ACTION_COLORS } from "../theme/colors";

/**
 * Main action types
 */
export enum ActionType {
  SHOT = "shot",
  REBOUND = "rebound",
  FOUL = "foul",
  ASSIST = "assist",
  STEAL = "steal",
  BLOCK = "block",
  TURNOVER = "turnover",
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

/**
 * French translations for UI display
 */
export const ACTION_TYPE_FR: Record<ActionType, string> = {
  [ActionType.SHOT]: "Tir",
  [ActionType.REBOUND]: "Rebond",
  [ActionType.FOUL]: "Faute",
  [ActionType.ASSIST]: "Passe décisive",
  [ActionType.STEAL]: "Interception",
  [ActionType.BLOCK]: "Contre",
  [ActionType.TURNOVER]: "Balle perdue",
};

export const SHOT_SPECIFICATION_FR: Record<ShotSpecification, string> = {
  [ShotSpecification.MADE]: "Réussi",
  [ShotSpecification.MISSED]: "Raté",
};

export const REBOUND_SPECIFICATION_FR: Record<ReboundSpecification, string> = {
  [ReboundSpecification.OFFENSIVE]: "Offensif",
  [ReboundSpecification.DEFENSIVE]: "Défensif",
};

export const FOUL_SPECIFICATION_FR: Record<FoulSpecification, string> = {
  [FoulSpecification.PERSONAL]: "Personnelle",
  [FoulSpecification.TECHNICAL]: "Technique",
  [FoulSpecification.PENALITY]: "Antisportive",
  [FoulSpecification.DISQUALIFICATION]: "Disqualifiante",
};

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
    label: "Tir",
    color: ACTION_COLORS.shot.base,
    description: "Enregistrer un tir",
    hasPointsSelection: true,
    pointsOptions: [
      {
        id: 1,
        label: "1 point",
        color: ACTION_COLORS.shot.points.one,
      },
      {
        id: 2,
        label: "2 points",
        color: ACTION_COLORS.shot.points.two,
      },
      {
        id: 3,
        label: "3 points",
        color: ACTION_COLORS.shot.points.three,
      },
    ],
    specifications: [
      {
        id: ShotSpecification.MADE,
        label: "Réussi",
        color: ACTION_COLORS.shot.made,
      },
      {
        id: ShotSpecification.MISSED,
        label: "Raté",
        color: ACTION_COLORS.shot.missed,
      },
    ],
  },
  [ActionType.REBOUND]: {
    id: ActionType.REBOUND,
    label: "Rebond",
    color: ACTION_COLORS.rebound.base,
    description: "Action de rebond",
    specifications: [
      {
        id: ReboundSpecification.OFFENSIVE,
        label: "Offensif",
        color: ACTION_COLORS.rebound.offensive,
      },
      {
        id: ReboundSpecification.DEFENSIVE,
        label: "Défensif",
        color: ACTION_COLORS.rebound.defensive,
      },
    ],
  },
  [ActionType.FOUL]: {
    id: ActionType.FOUL,
    label: "Faute",
    color: ACTION_COLORS.foul.base,
    description: "Faute commise",
    specifications: [
      {
        id: FoulSpecification.PERSONAL,
        label: "Personnelle",
        color: ACTION_COLORS.foul.personal,
      },
      {
        id: FoulSpecification.TECHNICAL,
        label: "Technique",
        color: ACTION_COLORS.foul.technical,
      },
      {
        id: FoulSpecification.PENALITY,
        label: "Antisportive",
        color: ACTION_COLORS.foul.penality,
      },
      {
        id: FoulSpecification.DISQUALIFICATION,
        label: "Disqualifiante",
        color: ACTION_COLORS.foul.disqualification,
      },
    ],
  },
  [ActionType.ASSIST]: {
    id: ActionType.ASSIST,
    label: "Passe décisive",
    color: ACTION_COLORS.assist,
    description: "Passe décisive",
    specifications: [],
  },
  [ActionType.STEAL]: {
    id: ActionType.STEAL,
    label: "Interception",
    color: ACTION_COLORS.steal,
    description: "Interception de balle",
    specifications: [],
  },
  [ActionType.BLOCK]: {
    id: ActionType.BLOCK,
    label: "Contre",
    color: ACTION_COLORS.block,
    description: "Contre",
    specifications: [],
  },
  [ActionType.TURNOVER]: {
    id: ActionType.TURNOVER,
    label: "Balle perdue",
    color: ACTION_COLORS.turnover,
    description: "Balle perdue",
    specifications: [],
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
  if (actionType === ActionType.SHOT && specification && config.specifications) {
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
 * Export as array for ActionModal and other components
 */
export const ACTION_DEFINITIONS = Object.values(ACTION_CONFIG).map((config) => ({
  id: config.id,
  icon: "",
  label: config.label,
  backgroundColor: config.color,
  description: config.description,
  hasPointsSelection: config.hasPointsSelection || false,
  pointsOptions: config.pointsOptions?.map((opt) => ({
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
