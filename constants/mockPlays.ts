import { PlaybookItem, DrawingPoint, DrawingTool } from "../src/models/PlayTypes";

export const STORAGE_KEY_PLAYBOOK = "statboard_playbook_v1";

// ─────────────────────────────────────────────────────────────────────────────
// Repères de coordonnées (voir constants/courtConstants.ts → getPlaybookViewBox)
//
//  half → viewBox 100 × 93.1  (demi-terrain portrait, panier en haut)
//    panier  ≈ (50, 10.7)   |  ligne LF / coudes ≈ y 39, x 34 & 66
//    ailes 3pts ≈ (20, 41) / (80, 41)  |  corners 3pts ≈ (8, 16) / (92, 16)
//    tête de raquette ≈ y 53  |  ligne médiane ≈ y 93 (bord bas)
//
//  full → viewBox 186.2 × 100  (plein terrain paysage)
//    panier gauche ≈ (10.7, 50)  |  panier droit ≈ (175.5, 50)  |  centre ≈ (93.1, 50)
// ─────────────────────────────────────────────────────────────────────────────

// Formation 5-out par défaut à la création d'un système demi-terrain
export const DEFAULT_POSITIONS_HALF: Record<string, DrawingPoint> = {
  A1: { x: 50, y: 60 },
  A2: { x: 18, y: 46 },
  A3: { x: 82, y: 46 },
  A4: { x: 8, y: 20 },
  A5: { x: 92, y: 20 },
  D1: { x: 50, y: 52 },
  D2: { x: 22, y: 42 },
  D3: { x: 78, y: 42 },
  D4: { x: 12, y: 22 },
  D5: { x: 88, y: 22 },
  BALL: { x: 50, y: 57 },
};

// Alignement par défaut à la création d'un système plein terrain
// (attaque placée dans la moitié gauche, vers le panier gauche)
export const DEFAULT_POSITIONS_FULL: Record<string, DrawingPoint> = {
  A1: { x: 100, y: 50 },
  A2: { x: 65, y: 25 },
  A3: { x: 65, y: 75 },
  A4: { x: 35, y: 15 },
  A5: { x: 35, y: 85 },
  D1: { x: 85, y: 50 },
  D2: { x: 58, y: 30 },
  D3: { x: 58, y: 70 },
  D4: { x: 32, y: 22 },
  D5: { x: 32, y: 78 },
  BALL: { x: 103, y: 50 },
};

export const MOCK_PLAYS: PlaybookItem[] = [
  {
    id: "preset-1",
    name: "Pick & Roll Classique",
    category: "OFFENSE",
    courtMode: "half",
    description:
      "Le système fondamental du basket moderne : un intérieur pose un écran pour le porteur de balle afin de créer un surnombre ou un tir ouvert.",
    createdAt: "2026-06-14T12:00:00Z",
    scenes: [
      {
        id: "p1-s1",
        title: "Mise en place de l'écran",
        description:
          "Le meneur (1) a la balle au sommet. Le pivot (5) monte depuis le poste droit pour poser un écran solide sur le défenseur direct du meneur.",
        positions: {
          A1: { x: 50, y: 77.7 },
          A2: { x: 12, y: 14.2 },
          A3: { x: 88, y: 14.2 },
          A4: { x: 28, y: 34.2 },
          A5: { x: 62, y: 46 },
          D1: { x: 50, y: 69.5 },
          D2: { x: 15, y: 18.9 },
          D3: { x: 85, y: 18.9 },
          D4: { x: 30, y: 28.3 },
          D5: { x: 64, y: 37.7 },
          BALL: { x: 50, y: 73 },
        },
        drawings: [
          {
            id: "d-1",
            type: DrawingTool.Screen,
            points: [{ x: 62, y: 46 }, { x: 53, y: 68.3 }],
            color: "#dc2626",
            width: 3,
          },
          {
            id: "d-2",
            type: DrawingTool.Drive,
            points: [{ x: 50, y: 77.7 }, { x: 32, y: 75.4 }],
            color: "#2563eb",
            width: 3,
          },
        ],
      },
      {
        id: "p1-s2",
        title: "Drive & Roll",
        description:
          "Le meneur (1) contourne l'écran pour attaquer le panier ou fixer l'aide. Simultanément, le pivot (5) entame son Roll vers le cercle.",
        positions: {
          A1: { x: 34, y: 73 },
          A2: { x: 12, y: 14.2 },
          A3: { x: 88, y: 14.2 },
          A4: { x: 28, y: 34.2 },
          A5: { x: 52, y: 57.7 },
          D1: { x: 44, y: 68.3 },
          D2: { x: 15, y: 18.9 },
          D3: { x: 85, y: 18.9 },
          D4: { x: 30, y: 28.3 },
          D5: { x: 48, y: 61.3 },
          BALL: { x: 34, y: 68.3 },
        },
        drawings: [
          {
            id: "d-3",
            type: DrawingTool.Drive,
            points: [{ x: 52, y: 57.7 }, { x: 50, y: 21.3 }],
            color: "#2563eb",
            width: 3,
          },
          {
            id: "d-4",
            type: DrawingTool.Pass,
            points: [{ x: 34, y: 73 }, { x: 50, y: 23.6 }],
            color: "#ea580c",
            width: 3,
          },
        ],
      },
      {
        id: "p1-s3",
        title: "Finition sous le cercle",
        description:
          "Le pivot (5) reçoit la passe dans sa course et dispose d'un tir facile sous le cercle.",
        positions: {
          A1: { x: 32, y: 63.6 },
          A2: { x: 12, y: 14.2 },
          A3: { x: 88, y: 14.2 },
          A4: { x: 28, y: 34.2 },
          A5: { x: 50, y: 16.6 },
          D1: { x: 36, y: 56.6 },
          D2: { x: 15, y: 18.9 },
          D3: { x: 85, y: 18.9 },
          D4: { x: 30, y: 28.3 },
          D5: { x: 48, y: 23.6 },
          BALL: { x: 50, y: 14.2 },
        },
        drawings: [],
      },
    ],
  },
  {
    id: "preset-2",
    name: 'Système "Horns" (Cornes)',
    category: "OFFENSE",
    courtMode: "half",
    description:
      "Formation offensive avec les deux intérieurs aux coudes de la ligne de lancer-franc (elbows), offrant de multiples options : PnR, hand-off, pop.",
    createdAt: "2026-06-14T12:00:00Z",
    scenes: [
      {
        id: "p2-s1",
        title: "Mise en place initiale",
        description:
          "1 en tête. 4 et 5 aux deux coudes (elbows). 2 et 3 écartés en corners pour libérer l'espace.",
        positions: {
          A1: { x: 50, y: 84.8 },
          A2: { x: 10, y: 7.2 },
          A3: { x: 90, y: 7.2 },
          A4: { x: 37, y: 42 },
          A5: { x: 63, y: 42 },
          D1: { x: 50, y: 75.4 },
          D2: { x: 12, y: 14.2 },
          D3: { x: 88, y: 14.2 },
          D4: { x: 38, y: 37.7 },
          D5: { x: 62, y: 37.7 },
          BALL: { x: 50, y: 80.1 },
        },
        drawings: [
          {
            id: "d-h1",
            type: DrawingTool.Screen,
            points: [{ x: 37, y: 42 }, { x: 46, y: 75.4 }],
            color: "#dc2626",
            width: 3,
          },
        ],
      },
      {
        id: "p2-s2",
        title: "Attaque sur l'aile",
        description:
          "1 utilise l'écran de 4 pour driver vers l'aile gauche. 5 coupe vers le cercle, 4 pop à l'arc.",
        positions: {
          A1: { x: 28, y: 73 },
          A2: { x: 10, y: 7.2 },
          A3: { x: 90, y: 7.2 },
          A4: { x: 48, y: 65.9 },
          A5: { x: 50, y: 28.3 },
          D1: { x: 34, y: 68.3 },
          D2: { x: 12, y: 14.2 },
          D3: { x: 88, y: 14.2 },
          D4: { x: 40, y: 57.7 },
          D5: { x: 54, y: 34.2 },
          BALL: { x: 28, y: 68.3 },
        },
        drawings: [
          {
            id: "d-h2",
            type: DrawingTool.Pass,
            points: [{ x: 28, y: 73 }, { x: 48, y: 65.9 }],
            color: "#ea580c",
            width: 3,
          },
        ],
      },
      {
        id: "p2-s3",
        title: "Tir ouvert (Pop)",
        description:
          "1 fait la passe en retrait à 4 (pop). 4 reçoit totalement ouvert à trois points et tire.",
        positions: {
          A1: { x: 26, y: 68.3 },
          A2: { x: 10, y: 7.2 },
          A3: { x: 90, y: 7.2 },
          A4: { x: 48, y: 65.9 },
          A5: { x: 50, y: 18.9 },
          D1: { x: 30, y: 63.6 },
          D2: { x: 12, y: 14.2 },
          D3: { x: 88, y: 14.2 },
          D4: { x: 44, y: 63.6 },
          D5: { x: 50, y: 26 },
          BALL: { x: 48, y: 61.3 },
        },
        drawings: [],
      },
    ],
  },
  {
    id: "preset-3",
    name: "Presse Tout Terrain 1-2-1-1",
    category: "DEFENSE",
    courtMode: "full",
    description:
      "Défense de presse tout-terrain très agressive conçue pour trapper la remise en jeu et provoquer d'immédiates pertes de balle.",
    createdAt: "2026-06-14T12:00:00Z",
    scenes: [
      {
        id: "p3-s1",
        title: "Mise en place de la presse",
        description:
          "D1 en pointe empêche la passe facile sur la remise en jeu. D2 et D3 surveillent les passes latérales pour amorcer la souricière (trap).",
        positions: {
          A1: { x: 5, y: 55 },
          A2: { x: 30, y: 30 },
          A3: { x: 30, y: 75 },
          A4: { x: 60, y: 50 },
          A5: { x: 110, y: 50 },
          D1: { x: 16, y: 52 },
          D2: { x: 34, y: 25 },
          D3: { x: 34, y: 72 },
          D4: { x: 70, y: 50 },
          D5: { x: 120, y: 50 },
          BALL: { x: 5, y: 55 },
        },
        drawings: [
          {
            id: "d-p1",
            type: DrawingTool.Pass,
            points: [{ x: 5, y: 55 }, { x: 30, y: 30 }],
            color: "#ea580c",
            width: 2.5,
          },
        ],
      },
      {
        id: "p3-s2",
        title: 'Le "Trap" dans le corner',
        description:
          "Dès que A2 reçoit la passe, D1 et D2 sprintent pour former la souricière. D3 coupe les lignes de passe centrales, D4 lit l'interception.",
        positions: {
          A1: { x: 14, y: 40 },
          A2: { x: 28, y: 20 },
          A3: { x: 34, y: 78 },
          A4: { x: 58, y: 45 },
          A5: { x: 110, y: 50 },
          D1: { x: 34, y: 26 },
          D2: { x: 22, y: 22 },
          D3: { x: 55, y: 45 },
          D4: { x: 75, y: 50 },
          D5: { x: 120, y: 50 },
          BALL: { x: 28, y: 20 },
        },
        drawings: [],
      },
    ],
  },
];
