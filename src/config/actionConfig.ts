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
  emoji: string;
  label: string;
  color: string;
  description: string;
  hasPointsSelection?: boolean;
  pointsOptions?: {
    id: number;
    label: string;
    emoji: string;
    color: string;
  }[];
  specifications?: {
    id: string;
    label: string;
    emoji: string;
    color: string;
  }[];
}

/**
 * ACTION_CONFIG: Complete configuration for all basketball actions
 *
 * Color palette:
 * - Shot: Orange/Red tones (#FF6B35, #4CAF50, #F44336)
 * - Rebound: Blue tones (#4A90E2, #FF9800, #2196F3)
 * - Foul: Red/Purple tones (#E74C3C, #9C27B0)
 * - Assist: Green (#27AE60)
 * - Steal: Yellow (#F39C12)
 * - Block: Purple (#8E44AD)
 * - Turnover: Gray (#95A5A6)
 */
export const ACTION_CONFIG: Record<string, ActionConfig> = {
  [ActionType.SHOT]: {
    id: ActionType.SHOT,
    emoji: "🏀",
    label: "Tir",
    color: "#FF6B35",
    description: "Enregistrer un tir",
    hasPointsSelection: true,
    pointsOptions: [
      {
        id: 1,
        label: "1 point",
        emoji: "1️⃣",
        color: "#9C27B0",
      },
      {
        id: 2,
        label: "2 points",
        emoji: "2️⃣",
        color: "#2196F3",
      },
      {
        id: 3,
        label: "3 points",
        emoji: "3️⃣",
        color: "#FF9800",
      },
    ],
    specifications: [
      {
        id: ShotSpecification.MADE,
        label: "Réussi",
        emoji: "✅",
        color: "#4CAF50",
      },
      {
        id: ShotSpecification.MISSED,
        label: "Raté",
        emoji: "❌",
        color: "#F44336",
      },
    ],
  },
  [ActionType.REBOUND]: {
    id: ActionType.REBOUND,
    emoji: "📥",
    label: "Rebond",
    color: "#4A90E2",
    description: "Action de rebond",
    specifications: [
      {
        id: ReboundSpecification.OFFENSIVE,
        label: "Offensif",
        emoji: "🔵",
        color: "#FF9800",
      },
      {
        id: ReboundSpecification.DEFENSIVE,
        label: "Défensif",
        emoji: "🛡️",
        color: "#2196F3",
      },
    ],
  },
  [ActionType.FOUL]: {
    id: ActionType.FOUL,
    emoji: "⚠️",
    label: "Faute",
    color: "#E74C3C",
    description: "Faute commise",
    specifications: [
      {
        id: FoulSpecification.PERSONAL,
        label: "Personnelle",
        emoji: "👤",
        color: "#E74C3C",
      },
      {
        id: FoulSpecification.TECHNICAL,
        label: "Technique",
        emoji: "⚡",
        color: "#9C27B0",
      },
      {
        id: FoulSpecification.PENALITY,
        label: "Antisportive",
        emoji: "🚨",
        color: "#FF5722",
      },
      {
        id: FoulSpecification.DISQUALIFICATION,
        label: "Disqualifiante",
        emoji: "🚫",
        color: "#D32F2F",
      },
    ],
  },
  [ActionType.ASSIST]: {
    id: ActionType.ASSIST,
    emoji: "🤝",
    label: "Passe décisive",
    color: "#27AE60",
    description: "Passe décisive",
    specifications: [],
  },
  [ActionType.STEAL]: {
    id: ActionType.STEAL,
    emoji: "🥷",
    label: "Interception",
    color: "#F39C12",
    description: "Interception de balle",
    specifications: [],
  },
  [ActionType.BLOCK]: {
    id: ActionType.BLOCK,
    emoji: "🚧",
    label: "Contre",
    color: "#8E44AD",
    description: "Contre",
    specifications: [],
  },
  [ActionType.TURNOVER]: {
    id: ActionType.TURNOVER,
    emoji: "💨",
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
 */
export function getActionEmoji(
  actionType: string,
  specification?: string
): string {
  const config = ACTION_CONFIG[actionType];
  if (!config) return "❓";

  // If specification provided, try to find spec emoji
  if (specification && config.specifications) {
    const spec = config.specifications.find((s) => s.id === specification);
    if (spec) return spec.emoji;
  }

  return config.emoji;
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

  // For shots with points, return points color
  if (actionType === ActionType.SHOT && points && config.pointsOptions) {
    const pointOption = config.pointsOptions.find((p) => p.id === points);
    if (pointOption) return pointOption.color;
  }

  // If specification provided, try to find spec color
  if (specification && config.specifications) {
    const spec = config.specifications.find((s) => s.id === specification);
    if (spec) return spec.color;
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
  icon: config.emoji,
  label: config.label,
  backgroundColor: config.color,
  description: config.description,
  hasPointsSelection: config.hasPointsSelection || false,
  pointsOptions: config.pointsOptions?.map((opt) => ({
    id: opt.id,
    label: opt.label,
    icon: opt.emoji,
    color: opt.color,
  })) || [],
  specifications: (config.specifications || []).map((spec) => ({
    id: spec.id,
    label: spec.label,
    icon: spec.emoji,
    color: spec.color,
  })),
}));
