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
  }>;
}

export default function ActionSystemModal({
  visible,
  onClose,
  onActionComplete,
  position,
  clickPosition,
  players,
}: ActionSystemModalProps) {
  const {
    state,
    startAction,
    selectActionType,
    selectActionSpec,
    selectPlayer,
    goBack,
    completeAction,
    closeAction,
  } = useActionSystem();

  // Start action when modal becomes visible
  React.useEffect(() => {
    if (visible && !state.isVisible) {
      startAction(position, clickPosition);
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
  ]);

  // Auto-complete action when player is selected
  React.useEffect(() => {
    if (state.actionType && state.actionSpec && state.playerNumber) {
      completeAction(onActionComplete);
    }
  }, [
    state.actionType,
    state.actionSpec,
    state.playerNumber,
    completeAction,
    onActionComplete,
  ]);

  const handleActionSelect = (actionType: string) => {
    selectActionType(actionType);
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
      onActionSelect={handleActionSelect}
      onSpecificationSelect={handleSpecificationSelect}
      onPlayerSelect={handlePlayerSelect}
      onGoBack={handleGoBack}
      position={state.position}
      currentStep={state.currentStep}
      selectedAction={state.actionType}
      selectedSpec={state.actionSpec}
      players={players}
    />
  );
}

// Export the hook for external use
export { useActionSystem } from "./ActionSystem";
export type { ActionData } from "./ActionSystem";
export { getActionIcon } from "./ActionSystem";
