# Project Intelligence Workspace

A local-first app that discovers software projects under a folder you choose, scans them for
real deterministic evidence (languages, manifests, frameworks, README, Git, tests, docs,
deployment config), builds a rule-based intelligence profile and a transparent Project
Health Score, and offers one AI-generated explanation per project when you configure a
provider. Everything runs on your own machine; nothing is uploaded anywhere unless you
explicitly enable a cloud AI provider.

**Status:** v0 (Phase 0 gate: READY FOR REVIEW, not APPROVED — real user testing is still
pending). See `docs/IMPLEMENTATION_STATUS.md` for exactly what's built vs. planned, and
`docs/DECISIONS.md` for the decision history. This name is a working title, not finalized.

## Main view (folder workspace) and demo data

The landing screen is a clean workspace view: four folder-style project nodes around a small
core, an inspector panel on the right (type, category, size, last modified, language,
framework, technology stack, project health with breakdown, components, recent activity,
"View Full Details" dialog) and a collapsible sidebar. It opens on a **Demo Workspace** — four
illustrative sample folders defined in `apps/web/src/demo/demoWorkspace.ts` and marked as
demo data everywhere (their health scores are not computed by the scorer). Open a local
folder from the sidebar and the same view shows real scanner results through the adapter in
`apps/web/src/model/fromApi.ts`; the table and the optional 3D graph remain available as
alternative stages for real workspaces. Screenshots at 1440×900, 768×1024 and 375×812 (plus
reduced motion) live in `docs/screenshots/` and are regenerated with
`node scripts/screenshots.mjs` while `npm run dev:web` is running.

The web app works without the server (demo workspace only); scanning needs `npm run dev:server`.

## What actually works today (not a roadmap)

- Select any local folder as a workspace.
- Discover real projects inside it (evidence-based — a `.git`, a recognized manifest, or a
  build file counts as strong evidence; a README alone is surfaced as low-confidence, never
  silently dropped or promoted).
- Scan each project for real facts only: languages, frameworks, package managers, lockfiles,
  README/docs presence, test/deployment setup, Git branch, scanned file count and byte size.
- A rule-based (non-AI) intelligence profile and a versioned, weighted, explainable **Project
  Health Score** — see `docs/DATA_AND_SCORING.md` for exactly how it's computed; missing
  evidence shows as `N/A`, never a fabricated zero.
- Two fully equivalent views: **Universe** (an interactive 3D graph, default) and **List**
  (a plain table) — switch anytime, both show the same real data, both keep working if the
  other one is unavailable (Universe falls back to List automatically if WebGL isn't
  available or the window is too narrow).
- One AI feature — "Explain this project" — using an offline deterministic mock provider by
  default (no API key needed anywhere) or a real Anthropic model if you configure one.
- Reopening the app restores your last workspace without re-scanning automatically (rescan is
  a manual, explicit action).

## What this is not (yet)

No project memory/history, no live filesystem watching, no team features, no autonomous
actions, no inter-project relationship detection, no native desktop packaging. All deferred
by design — see `docs/IMPLEMENTATION_STATUS.md` for the full, current list.

## Prerequisites

- Node.js 20+ (developed and tested on Node 26)
- npm 10+

No database server, no Docker, no Rust toolchain required.

## Setup

```bash
npm install
cp .env.example apps/server/.env
```

The defaults work out of the box with the offline mock AI provider — no API key required for
anything in this list.

Create the local database:

```bash
npm run prisma:migrate -w apps/server
```

## Run

In two terminals, from the repo root:

```bash
npm run dev:server
```

```bash
npm run dev:web
```

Open http://localhost:5173. The API listens on http://localhost:4310
(`GET /api/health` should return `{"ok":true}`).

**Selecting a workspace:** type or paste an absolute local folder path into the "Local
project folder" field and click "Open workspace." The backend needs read access to that
folder and its subfolders — run the server as a user account that actually has permission to
read the folders you plan to scan. Nothing outside the folder you select is ever touched.

## Filesystem scanning boundaries

- Never executes anything found inside a scanned project (no scripts, no build steps).
- Default exclusions (editable, not hard-coded limits): `.git`, `node_modules`, `venv`,
  build/output directories, caches, and common secret file patterns (`.env`, `*.key`, etc.) —
  see `apps/server/src/security/exclusions.ts` and `docs/DATA_AND_SCORING.md`.
- Bounded traversal — a very large or broken project is truncated and marked `PARTIAL`
  rather than hanging or crashing the whole scan.
- Symlinks are never followed during discovery/scanning.

## AI provider (optional)

Default: `AI_PROVIDER=mock` — deterministic, fully offline, no credentials, used in all
automated tests. To use a real model instead, set in `apps/server/.env`:

```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-5
```

The app is fully usable with the mock provider — discovery, scanning, the intelligence
profile, and the Health Score never depend on AI at all; only the "Explain this project"
feature's output differs.

## Repository structure

```
apps/
  server/   Express + TypeScript + Prisma + SQLite backend
    src/
      discovery/       project-boundary detection
      scanner/          deterministic evidence scanning (no code execution)
      intelligence/    rule-based profile + Health Score (no AI)
      ai/               provider abstraction (mock + Anthropic)
      workspace/        orchestration + read queries
      routes/, app.ts   HTTP layer
    prisma/             schema + migrations (SQLite)
    tests/
  web/      Vite + React + TypeScript frontend
    src/
      main/             folder workspace main view (stage, inspector, modal, shell) — DOM/SVG
      demo/             demo workspace data + provider (four sample folders)
      model/            view-model types + adapter from server types (fromApi.ts)
      components/       List Mode UI (table, legacy detail)
      graph/             optional 3D graph stage (three.js) — code-split, lazy
      api/, lib/
docs/       architecture, data/scoring, decisions, implementation status
ai-project-workspace-phase0/          Phase 0 product specification (sibling directory)
ai-project-workspace-future-phases/   Phase 1-5 execution pack (sibling directory)
```

## Build / test / lint

```bash
npm test          # 117 tests across both apps (vitest): 55 server + 62 web
npm run typecheck  # both apps
npm run lint       # both apps
npm run build      # both apps
```

## Privacy

Local-first by default: your project files, evidence, and Health Score never leave your
machine unless you explicitly configure `AI_PROVIDER=anthropic`. Even then, only a compact,
evidence-derived context is sent for the single "Explain this project" call — never raw file
contents, never the whole repository. See `docs/DATA_AND_SCORING.md` and
`ai-project-workspace-phase0/08-security/SECURITY.md`.

## Known limitations

See `docs/IMPLEMENTATION_STATUS.md` for the complete, current, honest list (real user testing
still pending, no inter-project relationship detection yet, no native packaging, some visual
details from the reference design not yet matched pixel-for-pixel).

## License

Not yet decided — no `LICENSE` file exists in this repository. Do not treat the absence of a
license as permission to use, copy, or redistribute this code; a license is being decided by
the project owner.
