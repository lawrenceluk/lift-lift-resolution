import { WorkoutProgram } from '@/types/workout';

const STORAGE_KEY = 'workout_program';

export const saveWorkoutProgram = (program: WorkoutProgram): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(program));
  } catch (error) {
    console.error('Error saving workout program:', error);
    throw new Error('Failed to save workout program');
  }
};

export const loadWorkoutProgram = (): WorkoutProgram | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as WorkoutProgram;
  } catch (error) {
    console.error('Error loading workout program:', error);
    return null;
  }
};

export const exportWorkoutProgram = (program: WorkoutProgram): void => {
  const dataStr = JSON.stringify(program, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `workout-program-${program.name.replace(/\s+/g, '-').toLowerCase()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const importWorkoutProgram = (file: File): Promise<WorkoutProgram> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const program = JSON.parse(e.target?.result as string) as WorkoutProgram;
        resolve(program);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
};
