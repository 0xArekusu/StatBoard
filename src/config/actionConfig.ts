/**
 * Action Configuration
 *
 * Centralized configuration for all basketball actions.
 * Defines emojis, colors, and specifications for each action type.
 *
 * Used by:
 * - ActionModal (buttons, colors)
 * - BasketballCourtSVG (marker colors)
 * - Filters (icons, colors)
 * - Match statistics (display)
 */

import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
} from "../models/ActionTypes";

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
 * Color palette:
 * - Shot: Orange/Red tones (#FF6B35, #4CAF50, #F44336)
 * - Rebound: Blue tones (#4A90E2, #FF9800, #3F51B5)
 * - Foul: Pink/Purple tones (#E91E63, #9C27B0)
 * - Assist: Cyan (#00BCD4)
 * - Steal: Yellow (#F39C12)
 * - Block: Purple (#8E44AD)
 * - Turnover: Gray (#95A5A6)
 */
export const ACTION_CONFIG: Record<string, ActionConfig> = {
  [ActionType.SHOT]: {
    id: ActionType.SHOT,
    label: "Tir",
    color: "#FF6B35",
    description: "Enregistrer un tir",
    hasPointsSelection: true,
    pointsOptions: [
      {
        id: 1,
        label: "1 point",
        color: "#9C27B0",
      },
      {
        id: 2,
        label: "2 points",
        color: "#2196F3",
      },
      {
        id: 3,
        label: "3 points",
        color: "#FF9800",
      },
    ],
    specifications: [
      {
        id: ShotSpecification.MADE,
        label: "Réussi",
        color: "#4CAF50",
      },
      {
        id: ShotSpecification.MISSED,
        label: "Raté",
        color: "#F44336",
      },
    ],
  },
  [ActionType.REBOUND]: {
    id: ActionType.REBOUND,
    label: "Rebond",
    color: "#4A90E2",
    description: "Action de rebond",
    specifications: [
      {
        id: ReboundSpecification.OFFENSIVE,
        label: "Offensif",
        color: "#2E7D32", // Dark green - rebond offensif
      },
      {
        id: ReboundSpecification.DEFENSIVE,
        label: "Défensif",
        color: "#1976D2", // Blue - rebond défensif
      },
    ],
  },
  [ActionType.FOUL]: {
    id: ActionType.FOUL,
    label: "Faute",
    color: "#FFD700",
    description: "Faute commise",
    specifications: [
      {
        id: FoulSpecification.PERSONAL,
        label: "Personnelle",
        color: "#FFD700", // Gold/Yellow - faute personnelle
      },
      {
        id: FoulSpecification.TECHNICAL,
        label: "Technique",
        color: "#FF1744", // Pink/Red - faute technique
      },
      {
        id: FoulSpecification.PENALITY,
        label: "Antisportive",
        color: "#FF6F00", // Dark orange - faute antisportive
      },
      {
        id: FoulSpecification.DISQUALIFICATION,
        label: "Disqualifiante",
        color: "#000000", // Black - faute disqualifiante
      },
    ],
  },
  [ActionType.ASSIST]: {
    id: ActionType.ASSIST,
    label: "Passe décisive",
    color: "#00BCD4",
    description: "Passe décisive",
    specifications: [],
  },
  [ActionType.STEAL]: {
    id: ActionType.STEAL,
    label: "Interception",
    color: "#F39C12",
    description: "Interception de balle",
    specifications: [],
  },
  [ActionType.BLOCK]: {
    id: ActionType.BLOCK,
    label: "Contre",
    color: "#8E44AD",
    description: "Contre",
    specifications: [],
  },
  [ActionType.TURNOVER]: {
    id: ActionType.TURNOVER,
    label: "Balle perdue",
    color: "#95A5A6",
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
