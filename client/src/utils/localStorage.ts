import { Week } from '@/types/workout';

const STORAGE_KEY = 'workout_weeks';

export const saveWeeks = (weeks: Week[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weeks));
  } catch (error) {
    console.error('Error saving workout weeks:', error);
    throw new Error('Failed to save workout weeks');
  }
};

export const loadWeeks = (): Week[] | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as Week[];
  } catch (error) {
    console.error('Error loading workout weeks:', error);
    return null;
  }
};

export const exportWeeks = (weeks: Week[]): void => {
  const dataStr = JSON.stringify(weeks, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  const firstWeek = weeks[0];
  const filename = firstWeek
    ? `workout-weeks-${firstWeek.weekNumber}-to-${weeks[weeks.length - 1].weekNumber}.json`
    : 'workout-weeks.json';
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const importWeeks = (file: File): Promise<Week[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);

        // Handle both array and single object formats
        let weeks: Week[];
        if (Array.isArray(parsed)) {
          weeks = parsed as Week[];
        } else if (parsed && typeof parsed === 'object' && 'weekNumber' in parsed) {
          // Single week object - wrap it in an array
          weeks = [parsed as Week];
        } else {
          reject(new Error('Invalid workout data format'));
          return;
        }

        resolve(weeks);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
};
