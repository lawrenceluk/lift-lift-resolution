import { streamChatCompletionWithTools, type ToolCall } from './openrouter';
import { simulateStreamingText, parseSuggestedReplies } from './text-processing';
import { buildSystemPrompt } from './ai-config';
import { allToolSchemas } from '../../client/src/lib/tools/schemas';

/**
 * OpenAI tool format (used by OpenRouter)
 */
interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

/**
 * Convert Anthropic tool schema format to OpenAI format
 * OpenRouter uses OpenAI's function calling standard
 */
function convertToOpenAIToolSchema(anthropicSchema: any): OpenAITool {
  return {
    type: 'function',
    function: {
      name: anthropicSchema.name,
      description: anthropicSchema.description,
      parameters: anthropicSchema.input_schema // OpenAI uses 'parameters' instead of 'input_schema'
    }
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: string;
}

export interface WorkoutContext {
  currentSession?: any; // WorkoutSession
  currentWeek?: any; // Week
  fullProgram: any[]; // Week[]
  currentUrl?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  context?: WorkoutContext;
}

export interface ChatResponse {
  fullResponse: string;
  suggestedReplies: string[];
  toolCalls?: ToolCall[];
}

/**
 * AI service for handling chat completions with OpenRouter
 * Handles streaming responses and suggested replies generation
 */
export class AIService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set in environment variables');
    }
  }

  /**
   * Process a chat request and return streaming response with tool call support
   * The caller is responsible for consuming the stream and then calling parseSuggestedReplies
   */
  async processChatRequest(request: ChatRequest): Promise<{
    streamGenerator: AsyncGenerator<string>;
    getSuggestedReplies: (fullResponse: string) => string[];
    getToolCalls: () => ToolCall[];
  }> {
    // Convert Anthropic tool schemas to OpenAI format for OpenRouter
    const openAITools: OpenAITool[] = allToolSchemas.map(convertToOpenAIToolSchema);

    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(request.context);

    // Convert messages to OpenRouter format
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      ...request.messages.map(m => ({
        role: m.role === 'coach' ? 'assistant' as const : m.role as 'user',
        content: m.content
      }))
    ];

    // Stream from OpenRouter with tool support (using OpenAI format)
    const { textGenerator, getToolCalls } = await streamChatCompletionWithTools({
      model: 'anthropic/claude-haiku-4.5',
      messages,
      apiKey: this.apiKey,
      tools: openAITools // Use converted OpenAI format tools
    });

    // Create streaming generator with buffering
    const streamGenerator = simulateStreamingText(textGenerator);

    return {
      streamGenerator,
      getSuggestedReplies: parseSuggestedReplies,
      getToolCalls
    };
  }
}
