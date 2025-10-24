/**
 * Chat API client for communicating with the coach
 */

import { apiRequest } from './api';
import type { ChatApiRequest, ChatApiResponse } from '@/types/chat';

/**
 * Send a chat message to the coach
 * @param request - Chat request containing messages
 * @returns Coach response with message and suggested replies
 */
export async function sendChatMessage(
  request: ChatApiRequest
): Promise<ChatApiResponse> {
  return apiRequest<ChatApiResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
