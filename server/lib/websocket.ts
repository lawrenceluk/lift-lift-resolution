import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { AIService, ChatRequest } from './ai-service';
import { categorizeToolCalls } from './chat-handler';
import { executeReadTool } from './read-tools';
import { hashWorkoutData } from './hash-helpers';

/**
 * Handle incoming chat message with AI service
 */
async function handleChatMessage(socket: Socket, payload: SendMessagePayload): Promise<void> {
  console.log(`[WebSocket] Starting AI streaming response for ${socket.id}`);

  try {
    const aiService = new AIService();
    let chatRequest: ChatRequest = {
      messages: payload.messages,
      context: payload.context
    };

    let { streamGenerator, getToolCalls } = await aiService.processChatRequest(chatRequest);

    // Stream chunks to client and accumulate full response
    let fullResponse = '';
    let lastChunk = '';
    for await (const chunk of streamGenerator) {
      fullResponse += chunk;
      lastChunk = chunk;
      socket.emit(SocketEvents.MESSAGE_CHUNK, {
        text: chunk,
        isComplete: false,
      } as MessageChunkPayload);
    }

    // Force flush any remaining text with explicit delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send final chunk marker
    socket.emit(SocketEvents.MESSAGE_CHUNK, {
      text: '',
      isComplete: true,
    } as MessageChunkPayload);

    // Another delay to ensure text is fully rendered on client
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get and categorize tool calls from LLM
    let allToolCalls = getToolCalls();
    let { writeToolCalls, readToolCalls, suggestedReplies } = categorizeToolCalls(allToolCalls);

    // Handle read tools: execute them server-side and make follow-up request
    if (readToolCalls.length > 0) {
      console.log(`[WebSocket] Executing ${readToolCalls.length} read tool(s) server-side`);

      // Emit progress indicator
      socket.emit(SocketEvents.TOOL_CALL_PROGRESS, {
        status: 'generating',
        message: `Fetching workout data...`,
      } as ToolCallProgressPayload);

      // Execute all read tools and collect results
      const toolResults: string[] = [];
      for (const toolCall of readToolCalls) {
        try {
          const params = JSON.parse(toolCall.function.arguments);
          const result = executeReadTool(toolCall.function.name, params, chatRequest.context!);
          toolResults.push(result); // Just the result, no wrapper
          console.log(`[WebSocket] Executed ${toolCall.function.name}`);
        } catch (error) {
          console.error(`[WebSocket] Error executing read tool ${toolCall.function.name}:`, error);
          toolResults.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Compute data hash for cache invalidation
      const dataHash = chatRequest.context?.fullProgram
        ? hashWorkoutData(chatRequest.context.fullProgram)
        : '';

      // Build cache metadata for deduplication
      const cacheMetadata = readToolCalls.length > 0 ? {
        toolName: readToolCalls[0].function.name,
        toolParams: readToolCalls[0].function.arguments,
        dataHash,
      } : undefined;

      // Add tool results as a new message and make follow-up request
      const messagesWithToolResults = [
        ...chatRequest.messages,
        {
          id: `coach-${Date.now()}`,
          role: 'coach' as const,
          content: fullResponse,
          timestamp: new Date().toISOString(),
        },
        {
          id: `data-${Date.now()}`,
          role: 'user' as const,
          content: toolResults.join('\n\n'),
          timestamp: new Date().toISOString(),
          toolResultCache: cacheMetadata, // Add cache metadata
        },
      ];

      console.log('[WebSocket] Making follow-up request with tool results');
      const followUpRequest: ChatRequest = {
        messages: messagesWithToolResults,
        context: chatRequest.context,
      };

      const followUp = await aiService.processChatRequest(followUpRequest);

      // Stream follow-up response
      fullResponse = '';
      for await (const chunk of followUp.streamGenerator) {
        fullResponse += chunk;
        socket.emit(SocketEvents.MESSAGE_CHUNK, {
          text: chunk,
          isComplete: false,
        } as MessageChunkPayload);
      }

      // Send final chunk marker for follow-up
      socket.emit(SocketEvents.MESSAGE_CHUNK, {
        text: '',
        isComplete: true,
      } as MessageChunkPayload);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Get tool calls from follow-up (should be write/ui tools now)
      allToolCalls = followUp.getToolCalls();
      const categorized = categorizeToolCalls(allToolCalls);
      writeToolCalls = categorized.writeToolCalls;
      suggestedReplies = categorized.suggestedReplies;

      // If there are still read tools, ignore them (infinite loop protection)
      if (categorized.readToolCalls.length > 0) {
        console.warn('[WebSocket] LLM requested read tools again after receiving results - ignoring');
      }
    }

    if (allToolCalls && allToolCalls.length > 0) {
      console.log(`[WebSocket] Processing ${allToolCalls.length} tool call(s)`);

      // Emit progress indicator for tool calls
      if (writeToolCalls.length > 0) {
        socket.emit(SocketEvents.TOOL_CALL_PROGRESS, {
          status: 'generating',
          message: `Preparing ${writeToolCalls.length} workout modification${writeToolCalls.length > 1 ? 's' : ''}...`,
        } as ToolCallProgressPayload);

        // Small delay to ensure UI shows the progress message
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    // Send suggested replies to client
    if (suggestedReplies.length > 0) {
      socket.emit(SocketEvents.SUGGESTED_REPLIES, {
        replies: suggestedReplies,
        mode: 'quick_reply',
      } as SuggestedRepliesPayload);
    }

    // Send write tools to client for approval
    if (writeToolCalls.length > 0) {
      console.log(`[WebSocket] Sending ${writeToolCalls.length} write tool(s) for approval`);

      const toolCallsPayload: ToolCallsPayload = {
        calls: writeToolCalls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          parameters: JSON.parse(tc.function.arguments)
        }))
      };

      socket.emit(SocketEvents.TOOL_CALLS, toolCallsPayload);
    }

    // Send completion event
    socket.emit(SocketEvents.MESSAGE_COMPLETE, {
      messageId: `coach-${Date.now()}`,
    } as MessageCompletePayload);

    console.log(`[WebSocket] Completed AI streaming response for ${socket.id}`);
  } catch (error) {
    console.error(`[WebSocket] Error in AI service for ${socket.id}:`, error);
    throw error;
  }
}

/**
 * Socket.io event names
 */
export enum SocketEvents {
  // Client → Server
  SEND_MESSAGE = 'send_message',
  PING = 'ping',

  // Server → Client
  MESSAGE_CHUNK = 'message_chunk',
  SUGGESTED_REPLIES = 'suggested_replies',
  TOOL_CALLS = 'tool_calls',
  TOOL_CALL_PROGRESS = 'tool_call_progress',
  MESSAGE_COMPLETE = 'message_complete',
  ERROR = 'error',
  PONG = 'pong',
}

/**
 * Event payload types
 */
export interface SendMessagePayload {
  messages: Array<{
    id: string;
    role: 'user' | 'coach';
    content: string;
    timestamp: string;
  }>;
  context?: {
    currentSession?: any; // WorkoutSession
    currentWeek?: any; // Week
    fullProgram: any[]; // Week[]
    currentUrl?: string;
  };
}

export interface MessageChunkPayload {
  text: string;
  isComplete: boolean;
}

export interface SuggestedRepliesPayload {
  replies: string[];
  mode: 'quick_reply' | 'text_input';
}

export interface ToolCallsPayload {
  calls: Array<{
    id: string;
    name: string;
    parameters: Record<string, unknown>;
  }>;
}

export interface ToolCallProgressPayload {
  status: 'generating' | 'complete';
  message: string;
}

export interface MessageCompletePayload {
  messageId: string;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

/**
 * Initialize Socket.io server and attach event handlers
 */
export function setupWebSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    // Connection settings
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Handle ping/pong for connection health
    socket.on(SocketEvents.PING, () => {
      socket.emit(SocketEvents.PONG);
    });

    // Handle incoming chat messages
    socket.on(SocketEvents.SEND_MESSAGE, async (payload: SendMessagePayload) => {
      console.log(`[WebSocket] Received message from ${socket.id}:`, payload.messages.length, 'messages');

      try {
        await handleChatMessage(socket, payload);
      } catch (error) {
        console.error('[WebSocket] Error handling message:', error);
        socket.emit(SocketEvents.ERROR, {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        } as ErrorPayload);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`[WebSocket] Socket error for ${socket.id}:`, error);
    });
  });

  return io;
}
