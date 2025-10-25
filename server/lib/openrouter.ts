/**
 * OpenRouter API client for streaming LLM responses
 * Uses Server-Sent Events (SSE) for real-time streaming
 */

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: 'text' | 'tool_result';
  text?: string;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// OpenAI tool format (used by OpenRouter)
interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

interface OpenRouterStreamOptions {
  model: string;
  messages: Message[];
  apiKey: string;
  tools?: ToolSchema[] | OpenAITool[];
}

/**
 * Tool call information from LLM response
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Stream result with tool calls
 */
export interface StreamResult {
  textChunks: string[];
  toolCalls: ToolCall[];
}

/**
 * Stream a chat completion from OpenRouter
 * Yields text chunks as they arrive from the LLM
 */
export async function* streamChatCompletion(
  options: OpenRouterStreamOptions
): AsyncGenerator<string> {
  const requestBody: any = {
    model: options.model,
    messages: options.messages,
    stream: true,
  };

  // Add tools if provided
  if (options.tools && options.tools.length > 0) {
    requestBody.tools = options.tools;
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://workout-tracker.example.com', // Optional: for rankings
      'X-Title': 'Workout Coach' // Optional: shows in rankings
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  // Parse SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(trimmed.slice(6)); // Remove "data: " prefix
          const delta = data.choices?.[0]?.delta?.content;
          if (delta) {
            yield delta;
          }
        } catch (e) {
          console.error('[OpenRouter] Failed to parse SSE line:', trimmed, e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Stream a chat completion with tool call support
 * Returns both streaming text generator and collected tool calls
 */
export async function streamChatCompletionWithTools(
  options: OpenRouterStreamOptions
): Promise<{
  textGenerator: AsyncGenerator<string>;
  getToolCalls: () => ToolCall[];
}> {
  const requestBody: any = {
    model: options.model,
    messages: options.messages,
    stream: true,
  };

  // Add tools if provided
  if (options.tools && options.tools.length > 0) {
    requestBody.tools = options.tools;
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://workout-tracker.example.com',
      'X-Title': 'Workout Coach'
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  // Collect tool calls as they arrive
  const toolCalls: ToolCall[] = [];
  const toolCallsMap = new Map<number, Partial<ToolCall>>();

  async function* parseStream(): AsyncGenerator<string> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));

            // Check for errors in response
            if (data.error) {
              console.error('[OpenRouter] API returned error:', data.error);
            }

            const choice = data.choices?.[0];
            const delta = choice?.delta;

            // Handle text content
            if (delta?.content) {
              yield delta.content;
            }

            // Handle tool calls (streaming format)
            if (delta?.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index ?? 0;

                if (!toolCallsMap.has(index)) {
                  toolCallsMap.set(index, {
                    id: toolCallDelta.id || '',
                    type: 'function',
                    function: {
                      name: '',
                      arguments: ''
                    }
                  });
                }

                const toolCall = toolCallsMap.get(index)!;

                // Accumulate tool call data
                if (toolCallDelta.id) {
                  toolCall.id = toolCallDelta.id;
                }
                if (toolCallDelta.function?.name) {
                  toolCall.function!.name = toolCallDelta.function.name;
                }
                if (toolCallDelta.function?.arguments) {
                  toolCall.function!.arguments = (toolCall.function!.arguments || '') + toolCallDelta.function.arguments;
                }
              }
            }
          } catch (e) {
            console.error('[OpenRouter] Failed to parse SSE line:', trimmed, e);
          }
        }
      }

      // Convert collected tool calls to array
      toolCallsMap.forEach((toolCall, index) => {
        if (toolCall.id && toolCall.function?.name) {
          toolCalls.push(toolCall as ToolCall);
        }
      });

      if (toolCalls.length > 0) {
        console.log('[OpenRouter] Collected', toolCalls.length, 'tool call(s):',
          toolCalls.map(tc => tc.function.name).join(', '));
      }
    } finally {
      reader.releaseLock();
    }
  }

  return {
    textGenerator: parseStream(),
    getToolCalls: () => toolCalls
  };
}
