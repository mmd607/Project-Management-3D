import { Router } from "express";
import { z } from "zod";
import { selectWorkspace, listWorkspaces, rescanWorkspace, WorkspacePathError } from "../workspace/workspaceService.js";
import { listProjectsForWorkspace } from "../workspace/projectQueries.js";

const SelectWorkspaceSchema = z.object({ rootPath: z.string().min(1, "rootPath is required") });

export const workspaceRouter = Router();

workspaceRouter.get("/workspaces", async (_req, res, next) => {
  try {
    res.json(await listWorkspaces());
  } catch (err) {
    next(err);
  }
});

workspaceRouter.post("/workspaces", async (req, res, next) => {
  try {
    const body = SelectWorkspaceSchema.parse(req.body);
    const workspace = await selectWorkspace(body.rootPath);
    res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
});

workspaceRouter.post("/workspaces/:id/scan", async (req, res, next) => {
  try {
    const summary = await rescanWorkspace(req.params.id);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

workspaceRouter.get("/workspaces/:id/projects", async (req, res, next) => {
  try {
    res.json(await listProjectsForWorkspace(req.params.id));
  } catch (err) {
    next(err);
  }
});

export { WorkspacePathError };
