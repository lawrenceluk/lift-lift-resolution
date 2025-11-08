import React, { createContext, useContext, useState, ReactNode } from 'react';

interface WorkoutTimerContextType {
  isOpen: boolean;
  openTimer: () => void;
  closeTimer: () => void;
}

const WorkoutTimerContext = createContext<WorkoutTimerContextType | undefined>(undefined);

export const WorkoutTimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openTimer = () => setIsOpen(true);
  const closeTimer = () => setIsOpen(false);

  return (
    <WorkoutTimerContext.Provider value={{ isOpen, openTimer, closeTimer }}>
      {children}
    </WorkoutTimerContext.Provider>
  );
};

export const useWorkoutTimerContext = () => {
  const context = useContext(WorkoutTimerContext);
  if (!context) {
    throw new Error('useWorkoutTimerContext must be used within WorkoutTimerProvider');
  }
  return context;
};
