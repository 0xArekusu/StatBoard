export type DrawingTool = 'move' | 'pencil' | 'pass' | 'drive' | 'screen';

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
  type: Exclude<DrawingTool, 'move'>;
  points: DrawingPoint[];
  color: string;
  width: number;
}

export interface PlayScene {
  id: string;
  title: string;
  description: string;
  positions: Record<PlayerKey, DrawingPoint>;
  drawings: DrawingStroke[];
}

export interface PlaybookItem {
  id: string;
  name: string;
  category: PlayCategory;
  description: string;
  scenes: PlayScene[];
  createdAt: string;
}
