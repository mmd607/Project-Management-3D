# Architecture

## Overview

A local-first desktop-style app, currently running as two local processes on the user's own
machine — no cloud dependency for any required function:

```
apps/server  — Express + TypeScript + Prisma + SQLite (local file)
apps/web     — Vite + React + TypeScript, talks to apps/server over localhost HTTP
```

Both run on `localhost` only. AI calls are opt-in and clearly labeled by provider mode
(`mock` by default, no network, no key needed; `anthropic` optional).

## Why this stack (Decision F, `IMPLEMENTATION_DECISION_LOG.md`)

Tauri was the original candidate (native desktop shell) but this development environment had
no Rust toolchain, so v0 shipped as a local web app instead — still fully local-first in
substance (filesystem access, scanning, storage, and the AI boundary all run on the user's
machine; only the presentation layer is a localhost page instead of a native window). Native
packaging (Tauri/Electron) is deferred, not rejected.

## Module boundaries (`apps/server/src`)

```
config/         env loading + validation (fails fast at startup)
domain/         shared types (Confidence, etc.)
security/       exclusion policy (default excluded dirs, secret file patterns, size guard)
discovery/      project-boundary detection (evidence-based, not "every folder")
scanner/        deterministic file/evidence scanning — no code execution, ever
intelligence/   rule-based profile + Health Score built from scanner evidence (no AI)
ai/             provider abstraction (mock + Anthropic adapter), the one AI feature
storage/        Prisma client
workspace/      orchestrates discovery → scan → intelligence → persistence; read queries
routes/         Express routers binding the above to HTTP
app.ts          Express app wiring, central error handler
index.ts        entrypoint
```

Rule enforced throughout (`13-development/DEVELOPMENT_RULES.md`): scanner/domain logic never
contains plan/billing checks, AI is behind the provider interface, deterministic evidence and
AI-generated text are never merged into one un-labeled value.

## Module boundaries (`apps/web/src`)

```
api/            typed HTTP client + response types
components/     List Mode UI (ProjectList, ProjectDetail, HealthScorePanel, ...) — reused,
                not duplicated, inside Graph Mode's detail panel too
graph/          Graph/"Universe" Mode — Three.js/React Three Fiber, entirely additive;
                List Mode works completely unchanged with Graph Mode's code un-loaded
                (code-split — three.js only downloads when the user opens Universe view)
lib/            small pure utilities (formatBytes, ...)
```

Inside `graph/`, the split follows what's independently testable:
- `layout.ts`, `clustering.ts`, `forceSimulation.ts`, `categoryColor.ts`,
  `performanceGovernor.ts` — pure functions/data, unit tested without a browser or WebGL.
- `SceneContents.tsx` — owns the one per-frame loop: steps the simulation, writes positions
  onto node/connection refs imperatively (no per-frame React state, for performance).
- `ProjectNode.tsx`, `Connection.tsx`, `CentralCore.tsx`, `ParticleField.tsx`,
  `ConnectionPulse.tsx` — the R3F visual tree.
- `CommandPalette.tsx`, `GraphDetailPanel.tsx`, `GraphTooltip.tsx` — DOM overlays, not R3F.

## Data flow (core loop)

```
User selects a folder
  → POST /api/workspaces (validates path exists)
  → POST /api/workspaces/:id/scan
      → discovery: evidence-based project-boundary detection
      → per project: scanner (deterministic evidence, size, components) 
      → intelligence: rule-based profile (no AI)
      → persisted (SQLite via Prisma)
  → GET /api/workspaces/:id/projects  → List Mode / Universe nodes
  → GET /api/projects/:id             → detail panel (evidence, tech stack, Health Score,
                                         computed live from stored evidence — see
                                         docs/DATA_AND_SCORING.md)
  → POST /api/projects/:id/explain    → the one AI feature (mock by default)
```

## Why the Health Score is computed live, not stored

`computeHealthScore()` runs at read time against currently-stored evidence, not as a column
written once at scan time. Changing the formula (or its weights) takes effect immediately on
the next read, with no migration and no risk of stale persisted scores silently disagreeing
with the documented formula.

## Decision record

Product/architecture decisions with rationale live in two places:
- `../ai-project-workspace-phase0/11-decisions/DECISION_LOG.md` — the authoritative product
  decisions (A through L at time of writing): v0 scope, 3D-in-v0, monetization architecture,
  Universe-as-default-view, category color system, etc.
- `IMPLEMENTATION_DECISION_LOG.md` (this repo) — engineering decisions made while building
  (stack choice, storage engine, module structure, AI provider), explicitly subordinate to
  and never contradicting the product decisions above.

Do not duplicate decision content between the two — `docs/DECISIONS.md` in this repo is a
short index pointing to both, not a third copy.
