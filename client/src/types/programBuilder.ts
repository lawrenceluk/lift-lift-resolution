/**
 * Types for the AI-powered program builder
 */

export interface QuestionnaireData {
  duration: string;
  sessionsPerWeek: number;
  goal: string;
  experience: string;
  equipment: string;
  notes?: string;
}

export const DURATION_OPTIONS = [
  { value: '2', label: '2 weeks' },
  { value: '3', label: '3 weeks' },
  { value: '4', label: '4 weeks' },
] as const;

export const SESSIONS_PER_WEEK_OPTIONS = [
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5 days' },
  { value: 6, label: '6 days' },
] as const;

export const GOAL_OPTIONS = [
  {
    value: 'strength',
    label: 'Strength',
    description: 'Get stronger on the main lifts (squat, bench, deadlift)',
  },
  {
    value: 'hypertrophy',
    label: 'Hypertrophy',
    description: 'Build muscle size and definition',
  },
  {
    value: 'conditioning',
    label: 'Conditioning',
    description: 'Improve endurance and work capacity',
  },
  {
    value: 'general',
    label: 'General Fitness',
    description: 'Overall health and athleticism',
  },
] as const;

export const EXPERIENCE_OPTIONS = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Less than 1 year of consistent training',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: '1-3 years of consistent training',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: '3+ years of consistent training',
  },
] as const;

export const EQUIPMENT_OPTIONS = [
  { value: 'full-gym', label: 'Full gym' },
  { value: 'home-gym', label: 'Home gym' },
  { value: 'dumbbells', label: 'Dumbbells only' },
  { value: 'bodyweight', label: 'Bodyweight' },
] as const;
