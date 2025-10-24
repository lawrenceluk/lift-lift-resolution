import { streamChatCompletion } from './openrouter';
import { simulateStreamingText, parseSuggestedReplies } from './text-processing';
import { buildSystemPrompt } from './ai-config';

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
   * Process a chat request and return streaming response
   * The caller is responsible for consuming the stream and then calling parseSuggestedReplies
   */
  async processChatRequest(request: ChatRequest): Promise<{
    streamGenerator: AsyncGenerator<string>;
    getSuggestedReplies: (fullResponse: string) => string[];
  }> {
    console.log('[AIService] Processing chat request');

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

    // Stream from OpenRouter with buffering
    const rawStream = streamChatCompletion({
      model: 'anthropic/claude-haiku-4.5',
      messages,
      apiKey: this.apiKey
    });

    // Create streaming generator
    const streamGenerator = simulateStreamingText(rawStream);

    return {
      streamGenerator,
      getSuggestedReplies: parseSuggestedReplies
    };
  }
}
