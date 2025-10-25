import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocket } from "./lib/websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  // Chat endpoint (stub - hardcoded response for M5.2)
  app.post("/api/chat", (req, res) => {
    const { messages } = req.body;

    // Validation
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: "Invalid request: messages array is required"
      });
    }

    // Hardcoded response (M5.2)
    // Vary the suggested replies to see the animation
    const replySets = [
      ["That makes sense", "Tell me more", "What else?"],
      ["Sounds good!", "I have a question", "Continue"],
      ["Perfect", "Can you explain further?", "Next topic"],
      ["Got it", "Interesting", "What about..."],
    ];

    const randomReplies = replySets[messages.length % replySets.length];

    const response = {
      message: "This is a hardcoded response! I received your message and I'm here to help with your workout.",
      suggestedReplies: randomReplies,
      inputMode: "options" as const
    };

    res.json(response);
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  // Initialize WebSocket server
  setupWebSocket(httpServer);
  console.log('[WebSocket] Server initialized');

  return httpServer;
}
