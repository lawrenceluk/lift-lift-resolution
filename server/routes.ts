import type { Express } from "express";
import { createServer, type Server } from "http";
import { pointOneStore } from "./lib/point-one-store";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  // --- GIT SEAM ----------------------------------------------------------
  // This frontend is a thin limb of the Point One brain, whose canonical state
  // is a git repo. The brain writes the program (the plan); the frontend reads
  // it and appends performed sessions (actuals) back. See lib/point-one-store.
  //
  // A later phase adds a secret-code gate: a secret-check middleware would
  // attach here (e.g. `app.use("/api", requireSecret)`) ahead of these routes.

  // GET /api/program — read the program JSON the brain wrote.
  app.get("/api/program", async (_req, res) => {
    try {
      const program = await pointOneStore.readProgram();
      res.json(program);
    } catch (err) {
      res.status(404).json({ message: (err as Error).message });
    }
  });

  // POST /api/session — append a performed session (actuals). Append-only:
  // writes one file per session, commits only that file, never the program.
  app.post("/api/session", async (req, res) => {
    const body = req.body;
    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      typeof body.name !== "string" ||
      body.name.trim() === ""
    ) {
      res
        .status(400)
        .json({ message: "Body must be a session object with a non-empty `name`." });
      return;
    }
    try {
      const { path, committed } = await pointOneStore.writeSession(body);
      res.json({ ok: true, path, committed });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
  // -----------------------------------------------------------------------

  const httpServer = createServer(app);

  return httpServer;
}
