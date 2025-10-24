import { useState, useEffect, useCallback, useRef } from 'react';
import { chatWebSocket } from '@/lib/websocket';
import { sendChatMessage } from '@/lib/chatApi';
import type { Message, WorkoutContext } from '@/types/chat';

interface UseChatWebSocketOptions {
  initialMessage?: Message;
  workoutContext?: WorkoutContext;
}

interface UseChatWebSocketReturn {
  conversationHistory: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessage: string;
  error: string | null;
  isWebSocketConnected: boolean;
  sendMessage: (content: string) => Promise<void>;
  resetConversation: () => void;
}

/**
 * Custom hook for managing chat WebSocket connection and message handling
 * Handles streaming responses, fallback to HTTP, and conversation state
 */
export function useChatWebSocket(options: UseChatWebSocketOptions = {}): UseChatWebSocketReturn {
  const [conversationHistory, setConversationHistory] = useState<Message[]>(
    options.initialMessage ? [options.initialMessage] : []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [useWebSocket, setUseWebSocket] = useState(true);

  // Use ref to store pending suggested replies during streaming
  const pendingSuggestedRepliesRef = useRef<string[]>([]);
  // Track if we've hit the separator to stop processing chunks
  const hitSeparatorRef = useRef<boolean>(false);
  // Use ref to store current workout context to ensure sendMessage always has latest context
  const workoutContextRef = useRef<WorkoutContext | undefined>(options.workoutContext);

  // Update workout context ref whenever options.workoutContext changes
  useEffect(() => {
    workoutContextRef.current = options.workoutContext;
  }, [options.workoutContext]);

  // WebSocket connection management
  useEffect(() => {
    let mounted = true;
    const unsubscribeFns: Array<() => void> = [];

    const connectWebSocket = async () => {
      if (!useWebSocket) return;

      try {
        await chatWebSocket.connect();
        if (!mounted) return;

        setIsWebSocketConnected(true);
        console.log('[useChatWebSocket] WebSocket connected');

        // Subscribe to error events
        const unsubError = chatWebSocket.onError((payload) => {
          console.error('[useChatWebSocket] WebSocket error:', payload);
          setError(payload.message);
          setIsLoading(false);
          setIsStreaming(false);
        });
        unsubscribeFns.push(unsubError);

        // Subscribe to message chunk events (streaming)
        const unsubChunk = chatWebSocket.onMessageChunk((payload) => {
          if (payload.isComplete) {
            console.log('[useChatWebSocket] Message chunk complete');
            // Reset separator flag for next message
            hitSeparatorRef.current = false;
          } else {
            setIsStreaming(true);

            // Once we've hit the separator, ignore all subsequent chunks
            if (hitSeparatorRef.current) {
              return;
            }

            setStreamingMessage(prev => {
              const newText = prev + payload.text;

              // Check if this chunk contains the separator
              const separatorIndex = newText.indexOf('---');
              if (separatorIndex !== -1) {
                // Mark that we've hit the separator
                hitSeparatorRef.current = true;
                // Return only the message part, truncated at separator
                return newText.substring(0, separatorIndex).trim();
              }

              return newText;
            });
          }
        });
        unsubscribeFns.push(unsubChunk);

        // Subscribe to suggested replies events
        const unsubReplies = chatWebSocket.onSuggestedReplies((payload) => {
          pendingSuggestedRepliesRef.current = payload.replies;
        });
        unsubscribeFns.push(unsubReplies);

        // Subscribe to message complete events
        let messageCompleteTimeout: NodeJS.Timeout | null = null;
        const unsubComplete = chatWebSocket.onMessageComplete(() => {
          // Small delay to ensure streamingMessage state is updated
          messageCompleteTimeout = setTimeout(() => {
            setIsStreaming(false);
            setIsLoading(false);

            // Create the final coach message with the accumulated streaming text
            setStreamingMessage(currentStreamingMessage => {
              if (currentStreamingMessage) {
                // Strip suggested replies section (everything after "---")
                let messageContent = currentStreamingMessage;
                const separatorIndex = currentStreamingMessage.indexOf('---');
                if (separatorIndex !== -1) {
                  messageContent = currentStreamingMessage.substring(0, separatorIndex).trim();
                }

                const coachMessage: Message = {
                  id: `coach-${Date.now()}`,
                  role: 'coach',
                  content: messageContent,
                  timestamp: new Date().toISOString(),
                  avatarPose: 'default-pose',
                  suggestedReplies: pendingSuggestedRepliesRef.current.length > 0
                    ? pendingSuggestedRepliesRef.current
                    : undefined,
                };

                setConversationHistory(prev => [...prev, coachMessage]);

                // Clear pending state
                pendingSuggestedRepliesRef.current = [];
                return '';
              }
              return currentStreamingMessage;
            });
          }, 100);
        });
        unsubscribeFns.push(unsubComplete);
        unsubscribeFns.push(() => {
          if (messageCompleteTimeout) clearTimeout(messageCompleteTimeout);
        });
      } catch (error) {
        console.error('[useChatWebSocket] WebSocket connection failed, falling back to HTTP:', error);
        if (mounted) {
          setIsWebSocketConnected(false);
          setUseWebSocket(false);
        }
      }
    };

    connectWebSocket();

    return () => {
      mounted = false;
      unsubscribeFns.forEach(unsub => unsub());
      if (chatWebSocket.isConnected()) {
        chatWebSocket.disconnect();
      }
    };
  }, [useWebSocket]);

  // Send message function
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Create user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message to conversation
    const updatedHistory = [...conversationHistory, userMessage];
    setConversationHistory(updatedHistory);

    try {
      if (isWebSocketConnected && useWebSocket) {
        // Use WebSocket for streaming
        console.log('[useChatWebSocket] Sending via WebSocket');
        chatWebSocket.sendMessage({
          messages: updatedHistory.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
          context: workoutContextRef.current,
        });
        // Response will be handled by WebSocket event listeners
      } else {
        // Fallback to HTTP API
        console.log('[useChatWebSocket] Sending via HTTP (WebSocket not available)');
        const response = await sendChatMessage({
          messages: updatedHistory,
          context: workoutContextRef.current,
        });

        // Create coach message from response
        const coachMessage: Message = {
          id: `coach-${Date.now()}`,
          role: 'coach',
          content: response.message,
          timestamp: new Date().toISOString(),
          avatarPose: 'default-pose',
          suggestedReplies: response.suggestedReplies,
        };

        setConversationHistory(prev => [...prev, coachMessage]);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setIsLoading(false);
    }
  }, [conversationHistory, isLoading, isWebSocketConnected, useWebSocket]);

  // Reset conversation function
  const resetConversation = useCallback(() => {
    setConversationHistory(options.initialMessage ? [options.initialMessage] : []);
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
    setStreamingMessage('');
    pendingSuggestedRepliesRef.current = [];
    hitSeparatorRef.current = false;
  }, [options.initialMessage]);

  return {
    conversationHistory,
    isLoading,
    isStreaming,
    streamingMessage,
    error,
    isWebSocketConnected,
    sendMessage,
    resetConversation,
  };
}
