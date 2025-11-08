/**
 * Buffer streaming text into word-based chunks for smooth display
 * Accepts either a string (for testing) or an async generator (for OpenRouter)
 * Uses hybrid buffering: words with sentence boundaries
 */
export async function* simulateStreamingText(
  input: string | AsyncGenerator<string>
): AsyncGenerator<string> {
  let buffer = '';
  const WORD_THRESHOLD = 3; // Emit every 3 words or at sentence boundaries
  const DELAY_MS = 10; // Delay between emitted chunks (reduced from 50ms for faster responses)

  // Handle string input (backward compatibility for testing)
  if (typeof input === 'string') {
    const words = input.split(' ');
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      buffer += (buffer ? ' ' : '') + word;

      const hasSentenceEnd = /[.!?]$/.test(word);
      const wordCount = buffer.split(' ').length;

      if (wordCount >= WORD_THRESHOLD || hasSentenceEnd || i === words.length - 1) {
        yield buffer;
        buffer = '';
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }
  } else {
    // Handle async generator input (OpenRouter stream)
    for await (const chunk of input) {
      buffer += chunk;

      // Check if we have complete words
      const words = buffer.split(' ');
      const hasSentenceEnd = /[.!?]$/.test(buffer);

      // Keep last incomplete word in buffer
      if (words.length >= WORD_THRESHOLD || hasSentenceEnd) {
        const lastSpace = buffer.lastIndexOf(' ');
        if (lastSpace !== -1) {
          yield buffer.substring(0, lastSpace + 1);
          buffer = buffer.substring(lastSpace + 1);
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }
    }
  }

  // Emit any remaining buffer
  if (buffer.trim()) {
    yield buffer;
  }
}

/**
 * Parse suggested replies from LLM response
 * Looks for the "---" separator and extracts lines after it
 * Returns default replies if parsing fails
 */
export function parseSuggestedReplies(fullResponse: string): string[] {
  const separator = '---';
  const separatorIndex = fullResponse.indexOf(separator);

  if (separatorIndex === -1) {
    // No separator found, return defaults
    return ["Tell me more", "Sounds good!", "What else?"];
  }

  // Extract everything after the separator
  const repliesSection = fullResponse.substring(separatorIndex + separator.length).trim();

  // Split by newlines and clean up
  const replies = repliesSection
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.length <= 50) // Sanity check
    .slice(0, 3); // Max 3 replies

  if (replies.length === 0) {
    console.log('[TextProcessing] Could not parse suggested replies, using defaults');
    return ["Tell me more", "Sounds good!", "What else?"];
  }

  console.log('[TextProcessing] Parsed suggested replies:', replies);
  return replies;
}
