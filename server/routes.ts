import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocket } from "./lib/websocket";
import { processChatRequest } from "./lib/chat-handler";
import type { ChatRequest } from "./lib/ai-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  // Chat endpoint (HTTP fallback for when WebSocket is unavailable)
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, context } = req.body;

      // Validation
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          error: "Invalid request: messages array is required"
        });
      }

      // Build chat request
      const chatRequest: ChatRequest = {
        messages,
        context
      };

      // Process with shared handler
      const response = await processChatRequest(chatRequest);

      // Return in format expected by client
      res.json({
        message: response.fullResponse,
        suggestedReplies: response.suggestedReplies,
        inputMode: response.suggestedReplies.length > 0 ? 'options' : 'freeform',
        toolCalls: response.writeToolCalls.length > 0 ? response.writeToolCalls : undefined,
      });
    } catch (error) {
      console.error('[API] Error processing chat request:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  // Initialize WebSocket server
  setupWebSocket(httpServer);
  console.log('[WebSocket] Server initialized');

  return httpServer;
}
