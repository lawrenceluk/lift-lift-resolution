import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { AIService, ChatRequest } from './ai-service';
import { toolSchemasByName } from '../../client/src/lib/tools/schemas';

/**
 * Handle incoming chat message with AI service
 */
async function handleChatMessage(socket: Socket, payload: SendMessagePayload): Promise<void> {
  console.log(`[WebSocket] Starting AI streaming response for ${socket.id}`);

  try {
    const aiService = new AIService();
    const chatRequest: ChatRequest = {
      messages: payload.messages,
      context: payload.context
    };

    const { streamGenerator, getToolCalls } = await aiService.processChatRequest(chatRequest);

    // Stream chunks to client and accumulate full response
    let fullResponse = '';
    for await (const chunk of streamGenerator) {
      fullResponse += chunk;
      socket.emit(SocketEvents.MESSAGE_CHUNK, {
        text: chunk,
        isComplete: false,
      } as MessageChunkPayload);
    }

    // Send final chunk marker
    socket.emit(SocketEvents.MESSAGE_CHUNK, {
      text: '',
      isComplete: true,
    } as MessageChunkPayload);

    // Get tool calls from LLM
    const allToolCalls = getToolCalls();

    // Separate tool calls by category
    const uiToolCalls: any[] = [];
    const writeToolCalls: any[] = [];

    if (allToolCalls && allToolCalls.length > 0) {
      console.log(`[WebSocket] Processing ${allToolCalls.length} tool call(s)`);

      for (const toolCall of allToolCalls) {
        const schema = toolSchemasByName[toolCall.function.name];
        if (!schema) {
          console.warn(`[WebSocket] Unknown tool: ${toolCall.function.name}`);
          continue;
        }

        if (schema.category === 'ui') {
          uiToolCalls.push(toolCall);
        } else if (schema.category === 'write') {
          writeToolCalls.push(toolCall);
        }
        // 'read' tools would be handled here in the future
      }
    }

    // Auto-execute UI tools (suggest_replies)
    let suggestedReplies: string[] = [];
    for (const uiTool of uiToolCalls) {
      if (uiTool.function.name === 'suggest_replies') {
        const params = JSON.parse(uiTool.function.arguments);
        suggestedReplies = params.replies || [];
        console.log(`[WebSocket] Extracted suggested replies from tool call:`, suggestedReplies);
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
