import { PlaybookItem, DrawingPoint } from "../src/models/PlayTypes";

export const STORAGE_KEY_PLAYBOOK = "statboard_playbook_v1";

// Default 5-out formation used when creating a new play
export const DEFAULT_POSITIONS: Record<string, DrawingPoint> = {
  A1: { x: 50, y: 75 },
  A2: { x: 15, y: 52 },
  A3: { x: 85, y: 52 },
  A4: { x: 25, y: 25 },
  A5: { x: 75, y: 25 },
  D1: { x: 50, y: 67 },
  D2: { x: 20, y: 45 },
  D3: { x: 80, y: 45 },
  D4: { x: 30, y: 18 },
  D5: { x: 70, y: 18 },
  BALL: { x: 50, y: 72 },
};

// Player positions use percentage coordinates (0–100) relative to the half-court view.
// Origin (0,0) = top-left, (100,100) = bottom-right.
// Basket is near the top (y ≈ 15), half-court line at the bottom (y ≈ 100).

export const MOCK_PLAYS: PlaybookItem[] = [
  {
    id: "preset-1",
    name: "Pick & Roll Classique",
    category: "OFFENSE",
    description:
      "Le système fondamental du basket moderne : un intérieur pose un écran pour le porteur de balle afin de créer un surnombre ou un tir ouvert.",
    createdAt: "2026-06-14T12:00:00Z",
    scenes: [
      {
        id: "p1-s1",
        title: "Mise en place de l'écran",
        description:
          "Le meneur (1) a la balle au milieu du terrain. Le pivot (5) monte depuis le poste droit pour poser un écran solide sur le défenseur direct du meneur.",
        positions: {
          A1: { x: 50, y: 72 },
          A2: { x: 12, y: 18 },
          A3: { x: 88, y: 18 },
          A4: { x: 28, y: 35 },
          A5: { x: 62, y: 45 },
          D1: { x: 50, y: 65 },
          D2: { x: 15, y: 22 },
          D3: { x: 85, y: 22 },
          D4: { x: 30, y: 30 },
          D5: { x: 64, y: 38 },
          BALL: { x: 50, y: 68 },
        },
        drawings: [
          {
            id: "d-1",
            type: "screen",
            points: [{ x: 62, y: 45 }, { x: 53, y: 64 }],
            color: "#dc2626",
            width: 3,
          },
          {
            id: "d-2",
            type: "drive",
            points: [{ x: 50, y: 72 }, { x: 32, y: 70 }],
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
          A1: { x: 34, y: 68 },
          A2: { x: 12, y: 18 },
          A3: { x: 88, y: 18 },
          A4: { x: 28, y: 35 },
          A5: { x: 52, y: 55 },
          D1: { x: 44, y: 64 },
          D2: { x: 15, y: 22 },
          D3: { x: 85, y: 22 },
          D4: { x: 30, y: 30 },
          D5: { x: 48, y: 58 },
          BALL: { x: 34, y: 64 },
        },
        drawings: [
          {
            id: "d-3",
            type: "drive",
            points: [{ x: 52, y: 55 }, { x: 50, y: 24 }],
            color: "#2563eb",
            width: 3,
          },
          {
            id: "d-4",
            type: "pass",
            points: [{ x: 34, y: 68 }, { x: 50, y: 26 }],
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
          A1: { x: 32, y: 60 },
          A2: { x: 12, y: 18 },
          A3: { x: 88, y: 18 },
          A4: { x: 28, y: 35 },
          A5: { x: 50, y: 20 },
          D1: { x: 36, y: 54 },
          D2: { x: 15, y: 22 },
          D3: { x: 85, y: 22 },
          D4: { x: 30, y: 30 },
          D5: { x: 48, y: 26 },
          BALL: { x: 50, y: 18 },
        },
        drawings: [],
      },
    ],
  },
  {
    id: "preset-2",
    name: 'Système "Horns" (Cornes)',
    category: "OFFENSE",
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
          A1: { x: 50, y: 78 },
          A2: { x: 10, y: 12 },
          A3: { x: 90, y: 12 },
          A4: { x: 38, y: 44 },
          A5: { x: 62, y: 44 },
          D1: { x: 50, y: 70 },
          D2: { x: 12, y: 18 },
          D3: { x: 88, y: 18 },
          D4: { x: 38, y: 38 },
          D5: { x: 62, y: 38 },
          BALL: { x: 50, y: 74 },
        },
        drawings: [
          {
            id: "d-h1",
            type: "screen",
            points: [{ x: 38, y: 44 }, { x: 46, y: 70 }],
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
          A1: { x: 28, y: 68 },
          A2: { x: 10, y: 12 },
          A3: { x: 90, y: 12 },
          A4: { x: 48, y: 62 },
          A5: { x: 50, y: 30 },
          D1: { x: 34, y: 64 },
          D2: { x: 12, y: 18 },
          D3: { x: 88, y: 18 },
          D4: { x: 40, y: 55 },
          D5: { x: 54, y: 35 },
          BALL: { x: 28, y: 64 },
        },
        drawings: [
          {
            id: "d-h2",
            type: "pass",
            points: [{ x: 28, y: 68 }, { x: 48, y: 62 }],
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
          A1: { x: 26, y: 64 },
          A2: { x: 10, y: 12 },
          A3: { x: 90, y: 12 },
          A4: { x: 48, y: 62 },
          A5: { x: 50, y: 22 },
          D1: { x: 30, y: 60 },
          D2: { x: 12, y: 18 },
          D3: { x: 88, y: 18 },
          D4: { x: 44, y: 60 },
          D5: { x: 50, y: 28 },
          BALL: { x: 48, y: 58 },
        },
        drawings: [],
      },
    ],
  },
  {
    id: "preset-3",
    name: "Presse Tout Terrain 1-2-1-1",
    category: "DEFENSE",
    description:
      "Défense de presse tout-terrain très agressive conçue pour trapper la remise en jeu et provoquer d'immédiates pertes de balle.",
    createdAt: "2026-06-14T12:00:00Z",
    scenes: [
      {
        id: "p3-s1",
        title: "Mise en place de la presse",
        description:
          "D1 en pointe empêche la passe facile. D2 et D3 surveillent les passes latérales pour amorcer la souricière (trap).",
        positions: {
          A1: { x: 30, y: 80 },
          A2: { x: 16, y: 62 },
          A3: { x: 84, y: 62 },
          A4: { x: 50, y: 45 },
          A5: { x: 50, y: 20 },
          D1: { x: 30, y: 72 },
          D2: { x: 25, y: 56 },
          D3: { x: 75, y: 56 },
          D4: { x: 50, y: 38 },
          D5: { x: 50, y: 14 },
          BALL: { x: 30, y: 80 },
        },
        drawings: [
          {
            id: "d-p1",
            type: "pass",
            points: [{ x: 30, y: 80 }, { x: 16, y: 62 }],
            color: "#ea580c",
            width: 2.5,
          },
        ],
      },
      {
        id: "p3-s2",
        title: 'Le "Trap" dans le corner',
        description:
          "Dès que A2 reçoit la passe, D1 et D2 sprintent pour former la souricière. D3 coupe les lignes de passe centrales.",
        positions: {
          A1: { x: 32, y: 75 },
          A2: { x: 15, y: 60 },
          A3: { x: 82, y: 58 },
          A4: { x: 48, y: 40 },
          A5: { x: 50, y: 20 },
          D1: { x: 18, y: 55 },
          D2: { x: 11, y: 64 },
          D3: { x: 50, y: 56 },
          D4: { x: 50, y: 34 },
          D5: { x: 50, y: 14 },
          BALL: { x: 15, y: 58 },
        },
        drawings: [],
      },
    ],
  },
];
