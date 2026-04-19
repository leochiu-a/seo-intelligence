import { useState, type Dispatch, type SetStateAction } from "react";

export interface DialogStateResult {
  showImportDialog: boolean;
  setShowImportDialog: Dispatch<SetStateAction<boolean>>;
  showLegendDialog: boolean;
  setShowLegendDialog: Dispatch<SetStateAction<boolean>>;
  showCopyForAIDialog: boolean;
  setShowCopyForAIDialog: Dispatch<SetStateAction<boolean>>;
}

export function useDialogState(): DialogStateResult {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showLegendDialog, setShowLegendDialog] = useState(false);
  const [showCopyForAIDialog, setShowCopyForAIDialog] = useState(false);
  return {
    showImportDialog,
    setShowImportDialog,
    showLegendDialog,
    setShowLegendDialog,
    showCopyForAIDialog,
    setShowCopyForAIDialog,
  };
}
