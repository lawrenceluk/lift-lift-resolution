import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocket } from "./lib/websocket";
import { processChatRequest } from "./lib/chat-handler";
import type { ChatRequest } from "./lib/ai-service";
import { supabase } from "./lib/supabase";
import { generateProgramMetadata } from "./lib/program-metadata-generator";

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

  // Generate AI metadata for a workout program
  app.post("/api/programs/:programId/generate-metadata", async (req, res) => {
    try {
      const { programId } = req.params;
      const { userId } = req.body;

      // Debug logging
      console.log(`[API] Received metadata generation request:`, {
        programId,
        userId,
        bodyKeys: Object.keys(req.body),
        body: req.body
      });

      // Validation
      if (!programId) {
        return res.status(400).json({
          error: "Program ID is required"
        });
      }

      if (!userId) {
        return res.status(400).json({
          error: "User ID is required"
        });
      }

      console.log(`[API] Generating metadata for program ${programId}, user ${userId}`);

      // Fetch program from database
      const { data: program, error: fetchError } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('id', programId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !program) {
        console.error('[API] Program not found:', {
          programId,
          userId,
          fetchError,
          hasProgram: !!program
        });
        return res.status(404).json({
          error: "Program not found",
          details: fetchError?.message || 'No program returned from query'
        });
      }

      // Generate metadata using AI
      const metadata = await generateProgramMetadata(program.weeks);

      // Update program in database (don't touch updated_at - this is auto-generated, not a user change)
      const { error: updateError } = await supabase
        .from('workout_programs')
        .update({
          name: metadata.name,
          description: metadata.description
        })
        .eq('id', programId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('[API] Failed to update program:', updateError);
        return res.status(500).json({
          error: "Failed to update program"
        });
      }

      console.log(`[API] Successfully generated metadata for program ${programId}:`, metadata);

      // Return generated metadata
      res.json(metadata);
    } catch (error) {
      console.error('[API] Error generating program metadata:', error);
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
