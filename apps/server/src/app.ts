import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { ZodError } from "zod";
import type { Env } from "./config/env.js";
import { workspaceRouter, WorkspacePathError } from "./routes/workspaceRoutes.js";
import { createProjectRouter, ProjectNotFoundError } from "./routes/projectRoutes.js";
import { AiProviderError, AiProviderTimeoutError } from "./ai/provider.js";
import { ExplainTimeoutError } from "./ai/explainProject.js";

export function createApp(env: Env) {
  const app = express();

  app.use(cors({ origin: env.WEB_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", workspaceRouter);
  app.use("/api", createProjectRouter(env));

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err?.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Request body is not valid JSON" });
    }
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Invalid request", details: err.issues });
    }
    if (err instanceof WorkspacePathError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof ProjectNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof ExplainTimeoutError || err instanceof AiProviderTimeoutError) {
      return res.status(504).json({ error: err.message });
    }
    if (err instanceof AiProviderError) {
      return res.status(502).json({ error: "AI provider error", details: err.message });
    }
    if (err?.code === "P2025") {
      // Prisma "record not found" for findUniqueOrThrow etc.
      return res.status(404).json({ error: "Resource not found" });
    }

    // eslint-disable-next-line no-console
    console.error("Unhandled request error:", err);
    return res.status(500).json({ error: "Internal server error" });
  };

  app.use(errorHandler);

  return app;
}
