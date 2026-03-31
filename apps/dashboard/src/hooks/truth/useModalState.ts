'use client';

import { useState } from 'react';

/**
 * Modal state interface for all truth page local modals.
 * Note: DocumentArchive uses documentStore (not local state).
 */
export interface TruthModalState {
  showDocSubmit: boolean;
  setShowDocSubmit: (value: boolean) => void;
  showMoneyTracker: boolean;
  setShowMoneyTracker: (value: boolean) => void;
  showSystemPulse: boolean;
  setShowSystemPulse: (value: boolean) => void;
  showIsikTut: boolean;
  setShowIsikTut: (value: boolean) => void;
  showProfilePanel: boolean;
  setShowProfilePanel: (value: boolean) => void;
  showDMS: boolean;
  setShowDMS: (value: boolean) => void;
  showCollectiveShield: boolean;
  setShowCollectiveShield: (value: boolean) => void;
  epistemologicalMode: boolean;
  setEpistemologicalMode: (value: boolean) => void;
}

/**
 * Hook to manage all local modal states in the truth page
 * Extracted from truth/page.tsx lines 131-139, 149
 */
export function useModalState(): TruthModalState {
  const [showDocSubmit, setShowDocSubmit] = useState(false);
  const [showMoneyTracker, setShowMoneyTracker] = useState(false);
  const [showSystemPulse, setShowSystemPulse] = useState(false);
  const [showIsikTut, setShowIsikTut] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showDMS, setShowDMS] = useState(false);
  const [showCollectiveShield, setShowCollectiveShield] = useState(false);
  const [epistemologicalMode, setEpistemologicalMode] = useState(false);

  return {
    showDocSubmit, setShowDocSubmit,
    showMoneyTracker, setShowMoneyTracker,
    showSystemPulse, setShowSystemPulse,
    showIsikTut, setShowIsikTut,
    showProfilePanel, setShowProfilePanel,
    showDMS, setShowDMS,
    showCollectiveShield, setShowCollectiveShield,
    epistemologicalMode, setEpistemologicalMode,
  };
}
