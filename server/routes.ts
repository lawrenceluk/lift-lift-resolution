import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  // --- GIT SEAM (future phase) -------------------------------------------
  // This is where the git-backed program routes will live:
  //   GET  /api/program        -> fetch the program JSON from the git backend
  //   POST /api/program/actuals -> commit logged actuals back to the git backend
  // The standalone AI brain (chat, websocket, Supabase library, metadata
  // generation) has been stripped; nothing here talks to OpenRouter/Supabase.
  // Do not implement the git wiring yet — that is a later phase.
  // -----------------------------------------------------------------------

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
