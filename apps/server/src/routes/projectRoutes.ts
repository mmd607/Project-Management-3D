import { Router } from "express";
import { getProjectDetail } from "../workspace/projectQueries.js";
import { explainProject, listInsightsForProject, ProjectNotFoundError } from "../ai/explainProject.js";
import type { Env } from "../config/env.js";

export function createProjectRouter(env: Env): Router {
  const router = Router();

  router.get("/projects/:id", async (req, res, next) => {
    try {
      const project = await getProjectDetail(req.params.id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (err) {
      next(err);
    }
  });

  router.post("/projects/:id/explain", async (req, res, next) => {
    try {
      const insight = await explainProject(env, req.params.id);
      res.status(201).json(insight);
    } catch (err) {
      next(err);
    }
  });

  router.get("/projects/:id/insights", async (req, res, next) => {
    try {
      res.json(await listInsightsForProject(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export { ProjectNotFoundError };
