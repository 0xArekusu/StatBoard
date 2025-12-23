/**
 * Action Types and Specifications
 *
 * Enums for basketball actions with French translations for UI display.
 * Internal code uses English enums, but user-facing text remains in French.
 */

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
