import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import request from "supertest";

const serverRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const testDbPath = join(serverRoot, "prisma", "test.db");

beforeAll(() => {
  if (existsSync(testDbPath)) rmSync(testDbPath);
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: serverRoot,
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });
});

afterAll(async () => {
  const { prisma } = await import("../src/storage/prisma.js");
  await prisma.$disconnect();
});

// Imports that touch the Prisma client must happen after DATABASE_URL is finalized
// (tests/setup.ts already sets it) and after the schema has been pushed above for
// modules imported lazily inside tests. app.js only wires routes; safe to import at top.
const { createApp } = await import("../src/app.js");
const { loadEnv } = await import("../src/config/env.js");
const { buildTree } = await import("./fixtures/buildTree.js");

const app = createApp(loadEnv());

describe("API integration — core v0 loop", () => {
  it("rejects workspace selection with no rootPath", async () => {
    const res = await request(app).post("/api/workspaces").send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 (not 500) for a malformed JSON body — realistic on Windows paths with backslashes", async () => {
    const res = await request(app)
      .post("/api/workspaces")
      .set("content-type", "application/json")
      .send('{"rootPath": "C:\\Users\\bad\\escape"}'); // single backslash: invalid JSON escape
    expect(res.status).toBe(400);
  });

  it("rejects workspace selection for a path that does not exist", async () => {
    const res = await request(app).post("/api/workspaces").send({ rootPath: "/definitely/not/a/real/path/xyz" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown project id", async () => {
    const res = await request(app).get("/api/projects/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("returns 404 when explaining an unknown project id", async () => {
    const res = await request(app).post("/api/projects/00000000-0000-0000-0000-000000000000/explain");
    expect(res.status).toBe(404);
  });

  it("selects a workspace with zero discoverable projects (empty/first-run state)", async () => {
    const { root, cleanup } = buildTree({ misc: { "notes.txt": "just a file, no project evidence" } });
    try {
      const created = await request(app).post("/api/workspaces").send({ rootPath: root });
      expect(created.status).toBe(201);

      const scanned = await request(app).post(`/api/workspaces/${created.body.id}/scan`);
      expect(scanned.status).toBe(200);
      expect(scanned.body.discoveredProjectCount).toBe(0);

      const projects = await request(app).get(`/api/workspaces/${created.body.id}/projects`);
      expect(projects.body).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it("runs the full core loop: select -> scan -> list -> detail -> explain -> insights", async () => {
    const { root, cleanup } = buildTree({
      "demo-app": {
        "package.json": JSON.stringify({ name: "demo-app", dependencies: { react: "^18.0.0" } }),
        "README.md": "# Demo App",
        ".git": { HEAD: "ref: refs/heads/main\n" },
        src: { "index.tsx": "export {}" },
      },
    });

    try {
      const workspaceRes = await request(app).post("/api/workspaces").send({ rootPath: root });
      expect(workspaceRes.status).toBe(201);
      const workspaceId = workspaceRes.body.id;

      const scanRes = await request(app).post(`/api/workspaces/${workspaceId}/scan`);
      expect(scanRes.status).toBe(200);
      expect(scanRes.body.discoveredProjectCount).toBe(1);
      expect(scanRes.body.projects[0].status).toBe("OK");

      const listRes = await request(app).get(`/api/workspaces/${workspaceId}/projects`);
      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(1);
      const projectId = listRes.body[0].id;
      expect(listRes.body[0].intelligenceProfile.category).toBe("Web frontend");
      expect(listRes.body[0].intelligenceProfile.confidence).toBe("INFERRED");

      const detailRes = await request(app).get(`/api/projects/${projectId}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.evidence.length).toBeGreaterThan(0);
      expect(detailRes.body.evidence.every((e: { confidence: string }) => e.confidence === "DETERMINISTIC")).toBe(
        true,
      );
      expect(detailRes.body.technologies.some((t: { name: string }) => t.name === "React")).toBe(true);

      const explainRes = await request(app).post(`/api/projects/${projectId}/explain`);
      expect(explainRes.status).toBe(201);
      expect(explainRes.body.providerMode).toBe("mock");
      expect(explainRes.body.confidence).toBe("AI_INFERRED");
      expect(explainRes.body.outputText).toContain("demo-app");

      const insightsRes = await request(app).get(`/api/projects/${projectId}/insights`);
      expect(insightsRes.status).toBe(200);
      expect(insightsRes.body).toHaveLength(1);
    } finally {
      cleanup();
    }
  });

  it("rescanning an already-known workspace updates rather than duplicates the project", async () => {
    const { root, cleanup } = buildTree({ app: { "package.json": "{}" } });
    try {
      const workspaceRes = await request(app).post("/api/workspaces").send({ rootPath: root });
      await request(app).post(`/api/workspaces/${workspaceRes.body.id}/scan`);
      await request(app).post(`/api/workspaces/${workspaceRes.body.id}/scan`);

      const listRes = await request(app).get(`/api/workspaces/${workspaceRes.body.id}/projects`);
      expect(listRes.body).toHaveLength(1);
    } finally {
      cleanup();
    }
  });
});
