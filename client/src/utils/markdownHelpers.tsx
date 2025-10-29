import React from 'react';

/**
 * Parse simple markdown formatting (bold and italic) and return React elements
 * Supports:
 * - **bold text** or __bold text__
 * - *italic text* or _italic text_
 *
 * Note: This is intentionally minimal - not full markdown support
 */
export function parseSimpleMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let keyCounter = 0;

  // Regex to match **bold**, __bold__, *italic*, or _italic_
  // Matches in priority order: bold first (2 chars), then italic (1 char)
  const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push(text.slice(currentIndex, match.index));
    }

    // Determine if it's bold or italic based on which capture group matched
    if (match[1] && match[2] !== undefined) {
      // Bold: **text** or __text__
      parts.push(
        <strong key={`bold-${keyCounter++}`}>
          {match[2]}
        </strong>
      );
    } else if (match[3] && match[4] !== undefined) {
      // Italic: *text* or _text_
      parts.push(
        <em key={`italic-${keyCounter++}`}>
          {match[4]}
        </em>
      );
    }

    currentIndex = regex.lastIndex;
  }

  // Add remaining text after last match
  if (currentIndex < text.length) {
    parts.push(text.slice(currentIndex));
  }

  return parts;
}

/**
 * Format coach message with simple markdown support
 * Handles line breaks and basic formatting
 */
export function formatCoachMessage(content: string): React.ReactNode {
  // Split by newlines to preserve line breaks
  const lines = content.split('\n');

  return lines.map((line, lineIndex) => {
    const formattedLine = parseSimpleMarkdown(line);

    // Add line breaks between lines (except after the last line)
    if (lineIndex < lines.length - 1) {
      return (
        <React.Fragment key={`line-${lineIndex}`}>
          {formattedLine}
          <br />
        </React.Fragment>
      );
    }

    return <React.Fragment key={`line-${lineIndex}`}>{formattedLine}</React.Fragment>;
  });
}
