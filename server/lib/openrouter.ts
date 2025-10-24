/**
 * OpenRouter API client for streaming LLM responses
 * Uses Server-Sent Events (SSE) for real-time streaming
 */

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterStreamOptions {
  model: string;
  messages: Message[];
  apiKey: string;
}

/**
 * Stream a chat completion from OpenRouter
 * Yields text chunks as they arrive from the LLM
 */
export async function* streamChatCompletion(
  options: OpenRouterStreamOptions
): AsyncGenerator<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://workout-tracker.example.com', // Optional: for rankings
      'X-Title': 'Workout Coach' // Optional: shows in rankings
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
    }),
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
