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
  player?: number;
  team: "A" | "B"; // Add team information
  timestamp: Date;
  position: {
    x: number;
    y: number;
  };
}

export interface ActionDefinition {
  id: string;
  icon: string;
  label: string;
  backgroundColor: string;
  description: string;
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
}

// Action definitions with sub-specifications
export const ACTION_DEFINITIONS: ActionDefinition[] = [
  {
    id: "tir",
    icon: "🏀",
    label: "Tir",
    backgroundColor: "#FF6B35",
    description: "Enregistrer un tir",
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
      setState({
        isVisible: true,
        currentStep: teamMode === "both" ? 1 : 2, // Start with team selection if both, otherwise skip to action
        actionType: null,
        actionSpec: null,
        playerNumber: null,
        selectedTeam: teamMode === "both" ? null : currentTeam, // Pre-select team if single team mode
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
    setState((prev) => ({
      ...prev,
      actionType,
      currentStep: 3,
    }));
  }, []);

  const selectActionSpec = useCallback((actionSpec: string) => {
    setState((prev) => ({
      ...prev,
      actionSpec,
      currentStep: 4,
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
        const newStep = prev.currentStep - 1;
        return {
          ...prev,
          currentStep: newStep,
          // Reset data for steps we're going back from
          ...(newStep === 1 && {
            selectedTeam: null,
            actionType: null,
            actionSpec: null,
            playerNumber: null,
          }),
          ...(newStep === 2 && {
            actionType: null,
            actionSpec: null,
            playerNumber: null,
          }),
          ...(newStep === 3 && {
            actionSpec: null,
            playerNumber: null,
          }),
          ...(newStep === 4 && { playerNumber: null }),
        };
      }
      return prev;
    });
  }, []);

  const completeAction = useCallback(
    (onActionComplete: (actionData: ActionData) => void) => {
      if (
        state.actionType &&
        state.actionSpec &&
        state.playerNumber &&
        state.selectedTeam
      ) {
        const actionData: ActionData = {
          type: state.actionType,
          specification: state.actionSpec,
          player: state.playerNumber,
          team: state.selectedTeam,
          timestamp: new Date(),
          position: state.clickPosition,
        };

        setCompletedActions((prev) => [...prev, actionData]);
        onActionComplete(actionData);

        // Reset state
        setState({
          isVisible: false,
          currentStep: 1,
          actionType: null,
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
    selectActionSpec,
    selectPlayer,
    goBack,
    completeAction,
    closeAction,
  };
};
