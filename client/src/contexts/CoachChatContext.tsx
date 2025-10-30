import React, { createContext, useContext, useState, useCallback } from 'react';

interface CoachChatContextType {
  isOpen: boolean;
  openCoach: () => void;
  closeCoach: () => void;
  sendMessage: (message: string) => void;
  pendingMessage: string | null;
  clearPendingMessage: () => void;
}

const CoachChatContext = createContext<CoachChatContextType | undefined>(undefined);

export const CoachChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const openCoach = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeCoach = useCallback(() => {
    setIsOpen(false);
  }, []);

  const sendMessage = useCallback((message: string) => {
    setPendingMessage(message);
    setIsOpen(true);
  }, []);

  const clearPendingMessage = useCallback(() => {
    setPendingMessage(null);
  }, []);

  return (
    <CoachChatContext.Provider
      value={{
        isOpen,
        openCoach,
        closeCoach,
        sendMessage,
        pendingMessage,
        clearPendingMessage,
      }}
    >
      {children}
    </CoachChatContext.Provider>
  );
};

export const useCoachChatContext = () => {
  const context = useContext(CoachChatContext);
  if (!context) {
    throw new Error('useCoachChatContext must be used within CoachChatProvider');
  }
  return context;
};
