/**
 * ActionSystem
 *
 * State management hook for the action recording system.
 * Implements a multi-step state machine for recording basketball actions.
 *
 * Flow:
 * Step 1: Team selection (A or B) - skipped in single team mode
 * Step 2: Action type selection (shot, rebound, foul)
 * Step 3: Points selection (1pt, 2pt, 3pt) - only for shots
 * Step 4: Specification selection (made/missed, offensive/defensive, etc.)
 * Step 5: Player selection (by jersey number)
 *
 * Features:
 * - Conditional step flow (e.g., skip points selection for non-shot actions)
 * - Back navigation with proper state cleanup
 * - Auto-completion when all required data is collected
 * - Semantic position tracking for orientation-independent coordinate storage
 */
import { useState, useCallback } from "react";

// Types for the action system

/**
 * ActionStep: Represents a single step in the action recording flow
 */
export interface ActionStep {
  step: number;
  title: string;
  canGoBack: boolean;
}

/**
 * ActionData: Complete data for a recorded basketball action
 * Used for both immediate UI updates and SQLite persistence
 */
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

/**
 * ActionDefinition: Configuration for a type of basketball action
 * Defines available actions, their specifications, and points options
 */
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

/**
 * ActionSystemState: Current state of the action recording flow
 * Tracks which step the user is on and what selections they've made
 */
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

/**
 * ActionSystemProps: Props for ActionSystemModal component
 * Provides context about the match, teams, and players
 */
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
  teamMode: "A" | "B" | "BOTH"; // Add team mode
  teamA: string;
  teamB: string;
  currentTeam: "A" | "B"; // Current team for single team mode
  currentPeriod: number; // Current period number
  timeElapsed: number; // Time elapsed in current period
}

/**
 * ACTION_DEFINITIONS: Available basketball actions
 * Each action has specifications (made/missed, offensive/defensive, etc.)
 * Shots have additional points selection (1pt, 2pt, 3pt)
 */
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

/**
 * getActionIcon: Returns the appropriate icon for displaying an action on the court
 * Uses specification icon if available, otherwise falls back to action type icon
 *
 * @param actionType - The action type ID (e.g., "tir", "rebond", "faute")
 * @param specification - Optional specification ID (e.g., "reussi", "rate")
 * @returns Emoji icon string for display
 */
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

/**
 * useActionSystem: React hook for managing action recording state
 *
 * Returns state and action handlers for the multi-step action flow.
 * Handles conditional step navigation (e.g., skip points for rebounds/fouls).
 */
export const useActionSystem = () => {
  // State: Tracks current step, selections, and modal position
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

  // History of all completed actions (not currently used, but available for future features)
  const [completedActions, setCompletedActions] = useState<ActionData[]>([]);

  /**
   * startAction: Initialize the action recording flow
   * Opens the modal and sets initial step based on team mode
   */
  const startAction = useCallback(
    (
      position: ActionSystemState["position"],
      clickPosition: ActionSystemState["clickPosition"],
      teamMode: "A" | "B" | "BOTH",
      currentTeam: "A" | "B"
    ) => {
      const selectedTeam = teamMode === "BOTH" ? null : currentTeam;

      setState({
        isVisible: true,
        currentStep: teamMode === "BOTH" ? 1 : 2, // Start with team selection if both, otherwise skip to action
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

  /**
   * selectTeam: User selected a team (A or B)
   * Advances to step 2 (action type selection)
   */
  const selectTeam = useCallback((team: "A" | "B") => {
    setState((prev) => ({
      ...prev,
      selectedTeam: team,
      currentStep: 2, // Move to action selection
    }));
  }, []);

  /**
   * selectActionType: User selected an action type (shot, rebound, foul)
   * If shot, advances to step 3 (points), otherwise skips to step 4 (specification)
   */
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

  /**
   * selectActionPoints: User selected shot points (1pt, 2pt, 3pt)
   * Advances to step 4 (specification)
   */
  const selectActionPoints = useCallback((points: number) => {
    setState((prev) => ({
      ...prev,
      actionPoints: points,
      currentStep: 4, // Move to specification selection
    }));
  }, []);

  /**
   * selectActionSpec: User selected specification (made/missed, offensive/defensive, etc.)
   * Advances to step 5 (player selection)
   */
  const selectActionSpec = useCallback((actionSpec: string) => {
    setState((prev) => ({
      ...prev,
      actionSpec,
      currentStep: 5, // Move to player selection
    }));
  }, []);

  /**
   * selectPlayer: User selected player by number
   * Triggers auto-completion in ActionSystemModal via useEffect
   */
  const selectPlayer = useCallback((playerNumber: number) => {
    setState((prev) => ({
      ...prev,
      playerNumber,
    }));
  }, []);

  /**
   * goBack: Navigate to previous step
   * Intelligently handles skipped steps (e.g., points selection for non-shots)
   * Clears data from steps being navigated away from
   */
  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep > 1) {
        let newStep = prev.currentStep - 1;

        // If going back from step 4 (spec) and action doesn't have points, skip to step 2 (action type)
        if (newStep === 3 && prev.actionType) {
          const action = ACTION_DEFINITIONS.find(
            (a) => a.id === prev.actionType
          );
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

  /**
   * completeAction: Finalize the action and pass data to parent
   * Validates all required data is present, creates ActionData object,
   * calls parent callback, and resets state for next action
   */
  const completeAction = useCallback(
    (
      onActionComplete: (actionData: ActionData) => void,
      currentPeriod: number,
      timeElapsed: number
    ) => {
      // Validate all required data is present
      if (
        state.actionType &&
        state.actionSpec &&
        state.playerNumber &&
        state.selectedTeam
      ) {
        // Build complete action data object
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
          semanticPosition: {
            xNormalized: 0,
            yNormalized: 0,
            capturedInPortrait: true,
          },
        };

        // Store in history and notify parent
        setCompletedActions((prev) => [...prev, actionData]);
        onActionComplete(actionData);

        // Reset state for next action
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

  /**
   * closeAction: Close the modal without completing an action
   * Resets all state to initial values
   */
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

  // Return state and all action handlers
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
