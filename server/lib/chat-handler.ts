import { AIService, ChatRequest } from './ai-service';
import { toolSchemasByName } from '../../client/src/lib/tools/schemas';
import { executeReadTool } from './read-tools';
import type { ToolCall } from './openrouter';

/**
 * Categorized tool calls result
 */
export interface CategorizedToolCalls {
  uiToolCalls: ToolCall[];
  writeToolCalls: ToolCall[];
  readToolCalls: ToolCall[];
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
 * Categorize tool calls into ui, write, and read categories
 * Extract suggested replies from ui tools
 */
export function categorizeToolCalls(toolCalls: ToolCall[]): CategorizedToolCalls {
  const uiToolCalls: ToolCall[] = [];
  const writeToolCalls: ToolCall[] = [];
  const readToolCalls: ToolCall[] = [];
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
    } else if (schema.category === 'read') {
      readToolCalls.push(toolCall);
    }
  }

  return { uiToolCalls, writeToolCalls, readToolCalls, suggestedReplies };
}

/**
 * Process a chat request with AI service and return complete response
 * This is the non-streaming version - accumulates all chunks before returning
 * Used by HTTP endpoint
 *
 * Handles read tools with automatic server-side execution and follow-up requests
 */
export async function processChatRequest(request: ChatRequest): Promise<ProcessedChatResponse> {
  console.log('[chat-handler] Processing chat request (non-streaming)');

  const aiService = new AIService();
  let { streamGenerator, getToolCalls } = await aiService.processChatRequest(request);

  // Accumulate all streaming chunks
  let fullResponse = '';
  for await (const chunk of streamGenerator) {
    fullResponse += chunk;
  }

  // Get and categorize tool calls
  let allToolCalls = getToolCalls();
  let { writeToolCalls, readToolCalls, suggestedReplies } = categorizeToolCalls(allToolCalls);

  // Handle read tools: execute them server-side and make follow-up request
  if (readToolCalls.length > 0) {
    console.log(`[chat-handler] Executing ${readToolCalls.length} read tool(s) server-side`);

    // Execute all read tools and collect results
    const toolResults: string[] = [];
    for (const toolCall of readToolCalls) {
      try {
        const params = JSON.parse(toolCall.function.arguments);
        const result = executeReadTool(toolCall.function.name, params, request.context!);
        toolResults.push(result); // Just the result, no wrapper
        console.log(`[chat-handler] Executed ${toolCall.function.name}:`, result.substring(0, 200) + '...');
      } catch (error) {
        console.error(`[chat-handler] Error executing read tool ${toolCall.function.name}:`, error);
        toolResults.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add tool results as a new message and make follow-up request
    const messagesWithToolResults = [
      ...request.messages,
      {
        id: `coach-${Date.now()}`,
        role: 'coach' as const,
        content: fullResponse,
        timestamp: new Date().toISOString(),
      },
      {
        id: `data-${Date.now()}`,
        role: 'user' as const,
        content: toolResults.join('\n\n'), // Simple join, no wrappers
        timestamp: new Date().toISOString(),
      },
    ];

    console.log('[chat-handler] Making follow-up request with tool results');
    const followUpRequest: ChatRequest = {
      messages: messagesWithToolResults,
      context: request.context,
    };

    const followUp = await aiService.processChatRequest(followUpRequest);

    // Accumulate follow-up response
    fullResponse = '';
    for await (const chunk of followUp.streamGenerator) {
      fullResponse += chunk;
    }

    // Get tool calls from follow-up (should be write/ui tools now)
    allToolCalls = followUp.getToolCalls();
    const categorized = categorizeToolCalls(allToolCalls);
    writeToolCalls = categorized.writeToolCalls;
    suggestedReplies = categorized.suggestedReplies;

    // If there are still read tools, we have a problem (infinite loop protection)
    if (categorized.readToolCalls.length > 0) {
      console.warn('[chat-handler] LLM requested read tools again after receiving results - ignoring');
    }
  }

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
