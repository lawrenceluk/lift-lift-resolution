import { io, Socket } from 'socket.io-client';
import type { SendMessagePayload, MessageChunkPayload, SuggestedRepliesPayload, ToolCallsPayload, ErrorPayload } from '../../../server/lib/websocket';

/**
 * Socket.io event names (mirrored from server)
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
 * WebSocket connection manager
 */
export class ChatWebSocket {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Determine WebSocket URL based on environment
      const wsUrl = window.location.origin;

      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.socket.on('connect', () => {
        console.log('[WebSocket] Connected to server');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect to WebSocket server after multiple attempts'));
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);
      });
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Send a chat message
   */
  sendMessage(payload: SendMessagePayload): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('WebSocket is not connected');
    }

    this.socket.emit(SocketEvents.SEND_MESSAGE, payload);
  }

  /**
   * Subscribe to message chunks
   */
  onMessageChunk(callback: (payload: MessageChunkPayload) => void): () => void {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized');
    }

    this.socket.on(SocketEvents.MESSAGE_CHUNK, callback);

    // Return unsubscribe function
    return () => {
      if (this.socket) {
        this.socket.off(SocketEvents.MESSAGE_CHUNK, callback);
      }
    };
  }

  /**
   * Subscribe to suggested replies
   */
  onSuggestedReplies(callback: (payload: SuggestedRepliesPayload) => void): () => void {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized');
    }

    this.socket.on(SocketEvents.SUGGESTED_REPLIES, callback);

    return () => {
      if (this.socket) {
        this.socket.off(SocketEvents.SUGGESTED_REPLIES, callback);
      }
    };
  }

  /**
   * Subscribe to tool calls
   */
  onToolCalls(callback: (payload: ToolCallsPayload) => void): () => void {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized');
    }

    this.socket.on(SocketEvents.TOOL_CALLS, callback);

    return () => {
      if (this.socket) {
        this.socket.off(SocketEvents.TOOL_CALLS, callback);
      }
    };
  }

  /**
   * Subscribe to message complete event
   */
  onMessageComplete(callback: () => void): () => void {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized');
    }

    this.socket.on(SocketEvents.MESSAGE_COMPLETE, callback);

    return () => {
      if (this.socket) {
        this.socket.off(SocketEvents.MESSAGE_COMPLETE, callback);
      }
    };
  }

  /**
   * Subscribe to errors
   */
  onError(callback: (payload: ErrorPayload) => void): () => void {
    if (!this.socket) {
      throw new Error('WebSocket is not initialized');
    }

    this.socket.on(SocketEvents.ERROR, callback);

    return () => {
      if (this.socket) {
        this.socket.off(SocketEvents.ERROR, callback);
      }
    };
  }

  /**
   * Send ping and wait for pong (for connection health check)
   */
  ping(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);

      this.socket.once(SocketEvents.PONG, () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.emit(SocketEvents.PING);
    });
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }
}

// Export singleton instance
export const chatWebSocket = new ChatWebSocket();
