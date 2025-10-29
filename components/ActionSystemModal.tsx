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

  const handleTeamSelect = (team: "A" | "B") => {
    selectTeam(team);
  };

  const handleActionSelect = (actionType: string) => {
    selectActionType(actionType);
  };

  const handlePointsSelect = (points: number) => {
    selectActionPoints(points);
  };

  const handleSpecificationSelect = (spec: string) => {
    selectActionSpec(spec);
  };

  const handlePlayerSelect = (playerNum: number) => {
    selectPlayer(playerNum);
    // Action will be completed automatically via useEffect
  };

  const handleGoBack = () => {
    goBack();
  };

  const handleClose = () => {
    closeAction();
    onClose();
  };

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
