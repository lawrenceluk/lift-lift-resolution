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
  executionSnapshot?: ToolCallSnapshot[]; // Captured preview of tool calls at execution time
  toolResultCache?: ToolResultCacheMetadata; // Metadata for cached read tool results
}

/**
 * Metadata for cached tool results
 * Enables smart cache invalidation when workout data changes
 */
export interface ToolResultCacheMetadata {
  toolName: string;        // e.g., "get_current_week_detail"
  toolParams: string;      // JSON stringified params for cache key
  dataHash: string;        // Hash of workout data when cached
}

/**
 * Snapshot of a tool call preview at execution time
 * Preserves the exact before/after state when the tool was executed
 */
export interface ToolCallSnapshot {
  toolCallId: string;
  title: string;
  changes: Array<{
    field: string;
    before?: string;
    after: string;
  }>;
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
