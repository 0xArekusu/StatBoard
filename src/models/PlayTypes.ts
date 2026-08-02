export enum DrawingTool {
  Move   = 'move',
  Pencil = 'pencil',
  Pass   = 'pass',
  Drive  = 'drive',
  Screen = 'screen',
}

export type PlayCategory =
  | 'OFFENSE'
  | 'DEFENSE'
  | 'OUT_OF_BOUNDS'
  | 'PRESS_BREAK'
  | 'OTHER';

// Player keys: A1–A5 (attackers), D1–D5 (defenders), BALL
export type PlayerKey =
  | 'A1' | 'A2' | 'A3' | 'A4' | 'A5'
  | 'D1' | 'D2' | 'D3' | 'D4' | 'D5'
  | 'BALL';

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingStroke {
  id: string;
  type: Exclude<DrawingTool, DrawingTool.Move>;
  points: DrawingPoint[];
  color: string;
  width: number;
  sourceToken?: string;
}

// Déplacement net d'un jeton (outil Déplacer) sur une étape : un seul par
// jeton, comparé à sa position au chargement de l'étape (pas à un historique
// de drags intermédiaires).
export interface PlayerMove {
  id: string;
  tokenKey: string;
  from: DrawingPoint;
  to: DrawingPoint;
}

export interface PlayScene {
  id: string;
  title: string;
  description: string;
  positions: Record<PlayerKey, DrawingPoint>;
  drawings: DrawingStroke[];
  moves?: PlayerMove[];
}

export interface PlaybookItem {
  id: string;
  name: string;
  category: PlayCategory;
  description: string;
  scenes: PlayScene[];
  createdAt: string;
}
