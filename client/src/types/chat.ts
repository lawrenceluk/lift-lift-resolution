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
  toolCalls?: ToolCall[]; // Tool calls from LLM (coach messages only)
}

/**
 * Tool call from LLM (Anthropic format)
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string of parameters
  };
}

/**
 * Tool result sent back to LLM
 */
export interface ToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
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
  toolCalls?: ToolCall[]; // Tool calls from LLM
}
