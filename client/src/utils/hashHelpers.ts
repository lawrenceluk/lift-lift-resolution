/**
 * Simple hash function for detecting workout data changes
 * Used for cache invalidation in tool result caching
 */

import type { Week } from '@/types/workout';

/**
 * Generate a simple hash from a string
 * Uses FNV-1a hash algorithm (fast, good distribution)
 */
function simpleHash(str: string): string {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36); // Convert to base36 string
}

/**
 * Compute hash of workout program data
 * This hash changes when user logs sets, modifies exercises, etc.
 */
export function hashWorkoutData(weeks: Week[]): string {
  // Create a deterministic representation of the data
  // Include only fields that matter for tool results (sets, exercises, completion status)
  const dataStr = JSON.stringify(weeks, (key, value) => {
    // Exclude fields that don't affect tool results
    if (key === 'id' || key === 'guid') return undefined;
    return value;
  });

  return simpleHash(dataStr);
}

/**
 * Compute hash for a specific week
 * More efficient when only checking current week changes
 */
export function hashWeekData(week: Week): string {
  const dataStr = JSON.stringify(week, (key, value) => {
    if (key === 'id' || key === 'guid') return undefined;
    return value;
  });

  return simpleHash(dataStr);
}
