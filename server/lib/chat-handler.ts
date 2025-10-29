import { AIService, ChatRequest } from './ai-service';
import { toolSchemasByName } from '../../client/src/lib/tools/schemas';
import type { ToolCall } from './openrouter';

/**
 * Categorized tool calls result
 */
export interface CategorizedToolCalls {
  uiToolCalls: ToolCall[];
  writeToolCalls: ToolCall[];
  suggestedReplies: string[];
}

/**
 * Complete chat response with all data
 */
export interface ProcessedChatResponse {
  fullResponse: string;
  suggestedReplies: string[];
  writeToolCalls: ToolCall[];
}

/**
 * Categorize tool calls into ui and write categories
 * Extract suggested replies from ui tools
 */
export function categorizeToolCalls(toolCalls: ToolCall[]): CategorizedToolCalls {
  const uiToolCalls: ToolCall[] = [];
  const writeToolCalls: ToolCall[] = [];
  let suggestedReplies: string[] = [];

  for (const toolCall of toolCalls) {
    const schema = toolSchemasByName[toolCall.function.name];
    if (!schema) {
      console.warn(`[chat-handler] Unknown tool: ${toolCall.function.name}`);
      continue;
    }

    if (schema.category === 'ui') {
      uiToolCalls.push(toolCall);

      // Auto-extract suggested replies from ui tools
      if (toolCall.function.name === 'suggest_replies') {
        try {
          const params = JSON.parse(toolCall.function.arguments);
          suggestedReplies = params.replies || [];
          console.log(`[chat-handler] Extracted suggested replies:`, suggestedReplies);
        } catch (error) {
          console.error(`[chat-handler] Failed to parse suggest_replies arguments:`, error);
        }
      }
    } else if (schema.category === 'write') {
      writeToolCalls.push(toolCall);
    }
    // 'read' tools would be handled here in the future
  }

  return { uiToolCalls, writeToolCalls, suggestedReplies };
}

/**
 * Process a chat request with AI service and return complete response
 * This is the non-streaming version - accumulates all chunks before returning
 * Used by HTTP endpoint
 */
export async function processChatRequest(request: ChatRequest): Promise<ProcessedChatResponse> {
  console.log('[chat-handler] Processing chat request (non-streaming)');

  const aiService = new AIService();
  const { streamGenerator, getToolCalls } = await aiService.processChatRequest(request);

  // Accumulate all streaming chunks
  let fullResponse = '';
  for await (const chunk of streamGenerator) {
    fullResponse += chunk;
  }

  // Get and categorize tool calls
  const allToolCalls = getToolCalls();
  const { writeToolCalls, suggestedReplies } = categorizeToolCalls(allToolCalls);

  console.log('[chat-handler] Completed processing:', {
    responseLength: fullResponse.length,
    suggestedRepliesCount: suggestedReplies.length,
    writeToolCallsCount: writeToolCalls.length,
  });

  return {
    fullResponse,
    suggestedReplies,
    writeToolCalls,
  };
}
