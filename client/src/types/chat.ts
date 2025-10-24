/**
 * Chat-related type definitions
 */

import type { Week, WorkoutSession } from './workout';

export interface Message {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: string;
  avatarPose?: string; // Only relevant for coach messages
  suggestedReplies?: string[]; // Only relevant for coach messages
}

export interface WorkoutContext {
  currentSession?: WorkoutSession; // The session user is viewing
  currentWeek?: Week; // The week containing current session
  fullProgram: Week[]; // Complete workout program
  currentUrl?: string; // Current page URL for context
}

export interface ChatApiRequest {
  messages: Message[];
  context?: WorkoutContext;
}

export interface ChatApiResponse {
  message: string;
  suggestedReplies?: string[];
  inputMode: 'options' | 'freeform';
}
