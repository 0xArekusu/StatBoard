import { useState, useCallback } from "react";

// Types for the action system
export interface ActionStep {
  step: number;
  title: string;
  canGoBack: boolean;
}

export interface ActionData {
  type: string;
  specification?: string;
  points?: number; // Number of points for shots (1, 2, or 3)
  player?: number;
  team: "A" | "B"; // Add team information
  timestamp: Date;
  period_number: number; // Period number when the action occurred
  time_in_period?: number; // Time in seconds since the beginning of the period
  position: {
    x: number;
    y: number;
  };
  // Normalized semantic position for portability between orientations and devices
  semanticPosition: {
    xNormalized: number; // Normalized position in logical court (0.0 to 1.0)
    yNormalized: number; // Normalized position in logical court (0.0 to 1.0)
    capturedInPortrait?: boolean; // Whether the position was captured in portrait mode
  };
}

export interface ActionDefinition {
  id: string;
  icon: string;
  label: string;
  backgroundColor: string;
  description: string;
  hasPointsSelection?: boolean; // Whether this action needs points selection (shots)
  pointsOptions?: {
    id: number;
    label: string;
    icon: string;
    color: string;
  }[];
  specifications: {
    id: string;
    label: string;
    icon: string;
    color: string;
  }[];
}

export interface ActionSystemState {
  isVisible: boolean;
  currentStep: number;
  actionType: string | null;
  actionPoints: number | null; // Points for shots (1, 2, or 3)
  actionSpec: string | null;
  playerNumber: number | null;
  selectedTeam: "A" | "B" | null; // Add selected team
  position: {
    x: number;
    y: number;
    pointerX: number;
    showPointerOnTop: boolean;
  };
  clickPosition: {
    x: number;
    y: number;
  };
}

export interface ActionSystemProps {
  visible: boolean;
  onClose: () => void;
  onActionComplete: (actionData: ActionData) => void;
  position: {
    x: number;
    y: number;
    pointerX: number;
    showPointerOnTop: boolean;
  };
  clickPosition: {
    x: number;
    y: number;
  };
  players: Array<{
    id: number;
    num: number;
    name: string;
  }>;
  teamMode: "A" | "B" | "both"; // Add team mode
  teamA: string;
  teamB: string;
  currentTeam: "A" | "B"; // Current team for single team mode
  currentPeriod: number; // Current period number
  timeElapsed: number; // Time elapsed in current period
}

// Action definitions with sub-specifications
export const ACTION_DEFINITIONS: ActionDefinition[] = [
  {
    id: "tir",
    icon: "🏀",
    label: "Tir",
    backgroundColor: "#FF6B35",
    description: "Enregistrer un tir",
    hasPointsSelection: true,
    pointsOptions: [
      {
        id: 1,
        label: "1 point",
        icon: "1️⃣",
        color: "#9C27B0",
      },
      {
        id: 2,
        label: "2 points",
        icon: "2️⃣",
        color: "#2196F3",
      },
      {
        id: 3,
        label: "3 points",
        icon: "3️⃣",
        color: "#FF9800",
      },
    ],
    specifications: [
      {
        id: "reussi",
        label: "Réussi",
        icon: "✅",
        color: "#4CAF50",
      },
      {
        id: "rate",
        label: "Raté",
        icon: "❌",
        color: "#F44336",
      },
    ],
  },
  {
    id: "rebond",
    icon: "📥",
    label: "Rebond",
    backgroundColor: "#4A90E2",
    description: "Action de rebond",
    specifications: [
      {
        id: "offensif",
        label: "Offensif",
        icon: "🔵",
        color: "#FF9800",
      },
      {
        id: "defensif",
        label: "Défensif",
        icon: "🛡️",
        color: "#2196F3",
      },
    ],
  },
  {
    id: "faute",
    icon: "⚠️",
    label: "Faute",
    backgroundColor: "#E74C3C",
    description: "Faute commise",
    specifications: [
      {
        id: "personnelle",
        label: "Personnelle",
        icon: "👤",
        color: "#E74C3C",
      },
      {
        id: "technique",
        label: "Technique",
        icon: "⚡",
        color: "#9C27B0",
      },
    ],
  },
];

// Helper function to get the correct icon for displaying on the court
export const getActionIcon = (
  actionType: string,
  specification?: string
): string => {
  const action = ACTION_DEFINITIONS.find((a) => a.id === actionType);
  if (!action) return "❓";

  if (specification) {
    const spec = action.specifications.find((s) => s.id === specification);
    return spec ? spec.icon : action.icon;
  }

  return action.icon;
};

export const useActionSystem = () => {
  const [state, setState] = useState<ActionSystemState>({
    isVisible: false,
    currentStep: 1,
    actionType: null,
    actionPoints: null,
    actionSpec: null,
    playerNumber: null,
    selectedTeam: null,
    position: {
      x: 0,
      y: 0,
      pointerX: 0,
      showPointerOnTop: true,
    },
    clickPosition: {
      x: 0,
      y: 0,
    },
  });

  const [completedActions, setCompletedActions] = useState<ActionData[]>([]);

  const startAction = useCallback(
    (
      position: ActionSystemState["position"],
      clickPosition: ActionSystemState["clickPosition"],
      teamMode: "A" | "B" | "both",
      currentTeam: "A" | "B"
    ) => {
      console.log("🔍 startAction called:", { teamMode, currentTeam }); // 🔍 DEBUG
      const selectedTeam = teamMode === "both" ? null : currentTeam;
      console.log("🔍 selectedTeam will be:", selectedTeam); // 🔍 DEBUG

      setState({
        isVisible: true,
        currentStep: teamMode === "both" ? 1 : 2, // Start with team selection if both, otherwise skip to action
        actionType: null,
        actionPoints: null,
        actionSpec: null,
        playerNumber: null,
        selectedTeam: selectedTeam, // Pre-select team if single team mode
        position,
        clickPosition,
      });
    },
    []
  );

  const selectTeam = useCallback((team: "A" | "B") => {
    setState((prev) => ({
      ...prev,
      selectedTeam: team,
      currentStep: 2, // Move to action selection
    }));
  }, []);

  const selectActionType = useCallback((actionType: string) => {
    const action = ACTION_DEFINITIONS.find((a) => a.id === actionType);
    const hasPointsSelection = action?.hasPointsSelection || false;

    setState((prev) => ({
      ...prev,
      actionType,
      // If action has points selection (shot), go to step 3 (points), otherwise skip to step 4 (spec)
      currentStep: hasPointsSelection ? 3 : 4,
    }));
  }, []);

  const selectActionPoints = useCallback((points: number) => {
    setState((prev) => ({
      ...prev,
      actionPoints: points,
      currentStep: 4, // Move to specification selection
    }));
  }, []);

  const selectActionSpec = useCallback((actionSpec: string) => {
    setState((prev) => ({
      ...prev,
      actionSpec,
      currentStep: 5, // Move to player selection
    }));
  }, []);

  const selectPlayer = useCallback((playerNumber: number) => {
    setState((prev) => ({
      ...prev,
      playerNumber,
    }));
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep > 1) {
        let newStep = prev.currentStep - 1;

        // If going back from step 4 (spec) and action doesn't have points, skip to step 2 (action type)
        if (newStep === 3 && prev.actionType) {
          const action = ACTION_DEFINITIONS.find((a) => a.id === prev.actionType);
          if (!action?.hasPointsSelection) {
            newStep = 2;
          }
        }

        return {
          ...prev,
          currentStep: newStep,
          // Reset data for steps we're going back from
          ...(newStep === 1 && {
            selectedTeam: null,
            actionType: null,
            actionPoints: null,
            actionSpec: null,
            playerNumber: null,
          }),
          ...(newStep === 2 && {
            actionType: null,
            actionPoints: null,
            actionSpec: null,
            playerNumber: null,
          }),
          ...(newStep === 3 && {
            actionPoints: null,
            actionSpec: null,
            playerNumber: null,
          }),
          ...(newStep === 4 && {
            actionSpec: null,
            playerNumber: null,
          }),
          ...(newStep === 5 && { playerNumber: null }),
        };
      }
      return prev;
    });
  }, []);

  const completeAction = useCallback(
    (onActionComplete: (actionData: ActionData) => void, currentPeriod: number, timeElapsed: number) => {
      console.log("🔍 completeAction - state.selectedTeam:", state.selectedTeam); // 🔍 DEBUG

      if (
        state.actionType &&
        state.actionSpec &&
        state.playerNumber &&
        state.selectedTeam
      ) {
        const actionData: ActionData = {
          type: state.actionType,
          specification: state.actionSpec,
          points: state.actionPoints || undefined, // Include points if selected
          player: state.playerNumber,
          team: state.selectedTeam,
          timestamp: new Date(),
          period_number: currentPeriod,
          time_in_period: timeElapsed,
          position: state.clickPosition,
          // Semantic coordinates will be calculated in BoardScreen.tsx
          semanticPosition: { xNormalized: 0, yNormalized: 0, capturedInPortrait: true },
        };

        console.log("🔍 completeAction - actionData.team:", actionData.team); // 🔍 DEBUG

        setCompletedActions((prev) => [...prev, actionData]);
        onActionComplete(actionData);

        // Reset state
        setState({
          isVisible: false,
          currentStep: 1,
          actionType: null,
          actionPoints: null,
          actionSpec: null,
          playerNumber: null,
          selectedTeam: null,
          position: {
            x: 0,
            y: 0,
            pointerX: 0,
            showPointerOnTop: true,
          },
          clickPosition: {
            x: 0,
            y: 0,
          },
        });
      }
    },
    [state]
  );

  const closeAction = useCallback(() => {
    setState({
      isVisible: false,
      currentStep: 1,
      actionType: null,
      actionPoints: null,
      actionSpec: null,
      playerNumber: null,
      selectedTeam: null,
      position: {
        x: 0,
        y: 0,
        pointerX: 0,
        showPointerOnTop: true,
      },
      clickPosition: {
        x: 0,
        y: 0,
      },
    });
  }, []);

  return {
    state,
    completedActions,
    startAction,
    selectTeam,
    selectActionType,
    selectActionPoints,
    selectActionSpec,
    selectPlayer,
    goBack,
    completeAction,
    closeAction,
  };
};
