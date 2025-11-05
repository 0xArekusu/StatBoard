/**
 * ActionSystemModal
 *
 * Main modal component for recording basketball actions during a match.
 * Manages the multi-step action recording flow:
 * 1. Team selection (if both teams mode)
 * 2. Action type selection (shot, rebound, foul, etc.)
 * 3. Shot points selection (1pt/2pt/3pt) if applicable
 * 4. Action specification (made/missed, offensive/defensive, etc.)
 * 5. Player selection
 *
 * Uses ActionSystem hook for state management and ActionModal for UI rendering.
 * Auto-completes action when all required data is collected.
 */
import React from "react";
import { useActionSystem, ActionData } from "./ActionSystem";
import ActionModal from "./ActionModal";

interface ActionSystemModalProps {
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
    team: "A" | "B";
    isSubstitute: boolean;
  }>;
  teamMode: "A" | "B" | "BOTH";
  teamA: string;
  teamB: string;
  currentTeam: "A" | "B";
  currentPeriod: number;
  timeElapsed: number;
}

export default function ActionSystemModal({
  visible,
  onClose,
  onActionComplete,
  position,
  clickPosition,
  players,
  teamMode,
  teamA,
  teamB,
  currentTeam,
  currentPeriod,
  timeElapsed,
}: ActionSystemModalProps) {
  // Hook for managing action state machine (steps, selections, data)
  const {
    state,
    startAction,
    selectTeam,
    selectActionType,
    selectActionPoints,
    selectActionSpec,
    selectPlayer,
    goBack,
    completeAction,
    closeAction,
  } = useActionSystem();

  // Start action when modal becomes visible
  React.useEffect(() => {
    if (visible && !state.isVisible) {
      startAction(position, clickPosition, teamMode, currentTeam);
    }
    if (!visible && state.isVisible) {
      closeAction();
    }
  }, [
    visible,
    state.isVisible,
    startAction,
    closeAction,
    position,
    clickPosition,
    teamMode,
    currentTeam,
  ]);

  // Auto-complete action when player is selected
  React.useEffect(() => {
    if (
      state.actionType &&
      state.actionSpec &&
      state.playerNumber &&
      state.selectedTeam
    ) {
      completeAction(onActionComplete, currentPeriod, timeElapsed);
    }
  }, [
    state.actionType,
    state.actionSpec,
    state.playerNumber,
    state.selectedTeam,
    completeAction,
    onActionComplete,
    currentPeriod,
    timeElapsed,
  ]);

  // Handler: User selected a team (A or B)
  const handleTeamSelect = (team: "A" | "B") => {
    selectTeam(team);
  };

  // Handler: User selected an action type (shot, rebound, foul, etc.)
  const handleActionSelect = (actionType: string) => {
    selectActionType(actionType);
  };

  // Handler: User selected shot point value (1pt, 2pt, or 3pt)
  const handlePointsSelect = (points: number) => {
    selectActionPoints(points);
  };

  // Handler: User selected action specification (made/missed, offensive/defensive, etc.)
  const handleSpecificationSelect = (spec: string) => {
    selectActionSpec(spec);
  };

  // Handler: User selected player number - triggers auto-completion
  const handlePlayerSelect = (playerNum: number) => {
    selectPlayer(playerNum);
    // Action will be completed automatically via useEffect
  };

  // Handler: User clicked back button to return to previous step
  const handleGoBack = () => {
    goBack();
  };

  // Handler: User closed modal without completing action
  const handleClose = () => {
    closeAction();
    onClose();
  };

  // Render the action modal with current state and handlers
  return (
    <ActionModal
      visible={state.isVisible}
      onClose={handleClose}
      onTeamSelect={handleTeamSelect}
      onActionSelect={handleActionSelect}
      onPointsSelect={handlePointsSelect}
      onSpecificationSelect={handleSpecificationSelect}
      onPlayerSelect={handlePlayerSelect}
      onGoBack={handleGoBack}
      position={state.position}
      currentStep={state.currentStep}
      selectedTeam={state.selectedTeam}
      selectedAction={state.actionType}
      selectedPoints={state.actionPoints}
      selectedSpec={state.actionSpec}
      players={players}
      teamMode={teamMode}
      teamA={teamA}
      teamB={teamB}
    />
  );
}

// Export the hook for external use
export { useActionSystem } from "./ActionSystem";
export type { ActionData } from "./ActionSystem";
export { getActionIcon } from "./ActionSystem";
