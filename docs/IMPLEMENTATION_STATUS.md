# Implementation Status

Durable continuity record — written so another session (Claude Code or a human) can pick
up work here without depending on prior chat history. Update this file as work progresses;
it is the single source of truth for "what's actually done" in this repo.

**Last updated:** 2026-09-12
**Phase 0 gate:** READY FOR REVIEW (not APPROVED — real user testing still pending; see
`../ai-project-workspace-phase0/10-validation/PHASE0_GATE.md`)
**Phase 1 (v0) gate:** READY FOR REVIEW (see `PHASE1_GATE_REVIEW.md`)
**Decisions D/J/K/L** (3D-in-v0, Graph Mode expansion, Universe-as-default): individually
APPROVED by the human product owner in-session — this is **not** the same as the Phase 0
gate itself being approved. See `DECISIONS.md` for the distinction.

## What works right now (verified, not assumed)

Run `npm run dev:server` + `npm run dev:web`, open http://localhost:5173:

1. Select a real local folder → discovers real projects (evidence-based: `.git`/manifest/
   build-file = high confidence, README-only = low confidence, never silently dropped or
   promoted).
2. Scan → deterministic evidence per project: languages, frameworks, package managers,
   lockfiles, README/docs presence, test/deployment components, Git branch, scanned file
   count and byte size (with exclusions visible in the UI).
3. Project Health Score — real, versioned (`v1`), weighted, per-component-explained, N/A
   shown as text (not a fake zero) when evidence is missing. See `DATA_AND_SCORING.md`.
4. Universe (3D graph, default view) and List Mode (fully equivalent fallback) — both fully
   functional, switchable, sharing all state (select a project in one, see it in the other).
5. Universe interactions verified live: hover tooltip, click-to-select with camera focus,
   drag-to-reposition-and-settle, category-based node coloring, cluster grouping by real
   category, focus-mode dimming, command palette (Ctrl/Cmd+K) search, Esc-to-deselect,
   Reset-view button, Pause-motion toggle, real central-core project/category counts.
6. AI "Explain this project" — mock provider (default, offline, no key) verified live;
   Anthropic adapter implemented and type/error-path tested, never live-called (no API key
   in this environment).
7. Reopening: workspace/project state persists in SQLite; reopening the app restores the
   last-used workspace without forcing a rescan.

## What is explicitly NOT built yet (documented, not silently skipped)

- Real user testing (`../ai-project-workspace-phase0/10-validation/MVP_TEST_PLAN.md` Tests
  1-6) — needs an actual second person, not something this session can self-certify.
- Inter-project relationships from real evidence (e.g. local path dependencies) — graph
  connections currently represent workspace membership only, never a claimed relationship.
- Continuity/history (filesystem watcher, Project Memory, resurfacing) — explicitly deferred
  per the Phase 0 roadmap; "Documented activity" in the Health Score is therefore limited to
  "is this under Git" rather than real commit-frequency analysis.
- Native desktop packaging (Tauri/Electron) — runs as a local web app for now (Decision F).
- Pixel-exact match to the "Project Nexus" reference image's 3-column layout, donut health
  chart, and left nav rail with "Knowledge Graph"/"AI Assistant" items — those two nav items
  aren't real features yet, so they were not added as non-functional buttons. The reference
  image's specific hex palette, exact column widths, and stat-card row were not fully
  replicated; the existing dark/burgundy system with category accents was kept and refined
  instead of a full visual rebuild. Revisit if pixel-parity is actually required.
- Keyboard Tab/arrow navigation directly on 3D graph nodes — List Mode (a real, fully
  keyboard-navigable `<table>`) is the accessible-list fallback the Phase 0/Task 03 specs
  require; it was not duplicated as a second in-canvas keyboard nav system given the added
  complexity of making raycasted canvas objects independently focusable.
- GitHub publish — see "Access needed" below.

## Files changed this pass (project-nexus-claude-pack tasks 01-04)

**Task 02 (real data behind every displayed field):**
- `apps/server/src/scanner/scan.ts` — added `totalSizeBytes` tracking; test/docs/deployment
  "component" detection; lockfile detection.
- `apps/server/src/intelligence/healthScore.ts` (new) — the Health Score formula.
- `apps/server/prisma/schema.prisma` + migration `20260912135800_health_score_and_size` —
  replaced the ad-hoc `sizeSummary` JSON column with typed `totalSizeBytes`/`truncated`.
- `apps/server/src/workspace/projectQueries.ts` — computes Health Score live at read time.
- `apps/server/tests/healthScore.test.ts` (new, 10 tests), `apps/server/tests/scanner.test.ts`
  (+8 tests for the new detections).
- `apps/web/src/api/types.ts` — `HealthScoreResult`/`HealthComponentResult` types, extended
  `ScanResultSummary`.
- `apps/web/src/components/HealthScorePanel.tsx` (new), wired into `ProjectDetail.tsx` with a
  real scanned-size/exclusion line.
- `apps/web/src/lib/formatBytes.ts` (new, tested).

**Task 03 (UI/UX refinements against the reference image, prioritized subset):**
- `apps/web/src/graph/GraphScene.tsx` — Esc-to-deselect, Reset-view button, Pause-motion
  toggle (independent of OS `prefers-reduced-motion`).
- `apps/web/src/graph/SceneContents.tsx` — `resetToken` prop to force camera-to-overview on
  demand.
- `apps/web/src/App.tsx` — wired `onDeselect` through to Graph Mode.

**Task 01 (repository/GitHub readiness):**
- `git init` — this was not a git repository before this pass.
- `docs/ARCHITECTURE.md`, `docs/DATA_AND_SCORING.md`, `docs/DECISIONS.md` (new).
- `docs/IMPLEMENTATION_STATUS.md` (this file — supersedes the old root `PROGRESS.md`).
- `docs/PHASE1_GATE_REVIEW.md` (moved from root, unchanged content).
- `README.md` (root) — rewritten to be accurate and complete.
- `.github/workflows/ci.yml` (new) — lint/typecheck/test/build on push/PR, using only
  commands verified to actually run in this repo.
- `.gitignore` — verified (already covered `.env`, `dev.db`, `test.db`, `node_modules`,
  `dist`) before the first commit; no changes needed.
- `LICENSE` — **not created**. See "Decisions still required" below.

## Test/build status (last run this pass)

```
apps/server: 55 tests passing (vitest)
apps/web:    44 tests passing (vitest)
Total:       99 tests passing, 0 failing
typecheck:   clean (both apps)
lint:        clean (both apps)
build:       clean (both apps)
```

Run yourself: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` from the repo
root.

## Decisions still required (yours, not invented)

1. **LICENSE** — no license file was created. Tell me the license (MIT, Apache-2.0,
   proprietary/none, etc.) and I'll add it; I won't guess one.
2. **GitHub destination** — no remote exists yet. Tell me: new repo name, personal account or
   an org, and public or private. I can create it via `gh` if you authorize that, or you can
   create an empty repo yourself and give me the remote URL to push to.
3. **Real user testing** — who tests the core loop, and when, per `MVP_TEST_PLAN.md`.

## Access needed (none yet consumed, none yet required)

- GitHub: none requested yet — waiting on the destination decision above before asking for
  the specific minimum scope (`repo` scope via `gh auth login`, or just a push URL if you
  create the repo yourself).
- No other external access was needed or used this pass (AI stayed on the offline mock
  provider throughout; no network calls were made for scanning or scoring).

## Next concrete action

Once you answer the LICENSE and GitHub-destination questions above: add the license file,
create/point at the remote, commit, push, and verify the pushed result (clone-and-run check).
Until then, everything else in this pass is complete and locally verified — there is no
other blocker.


## Update — folder workspace main view (2026-09-13)

**Built:** new landing screen in `apps/web/src/main/` (MainView, FolderUniverse, WorkspaceGrid,
ProjectInspector, FullDetailsModal, HealthRing, StatusBadge, FolderIcon, useProjectSelection),
a UI-independent data layer (`model/workspaceView.ts`, `demo/demoWorkspace.ts`,
`model/fromApi.ts`) and a calmer navy/violet palette (`main/main.css`, tokens in `styles.css`).
Click / Tab+Enter / arrow-key selection, empty-stage click to clear, selection kept across
resize, re-render and reload; inspector states: empty, loading, error (with retry), incomplete
data, ready; "View Full Details" opens an accessible dialog. Responsive: collapsible sidebar,
inspector becomes a drawer below 980 px, radial stage becomes a grid below 640 px.
`prefers-reduced-motion` disables float, pulse, particles and skeleton shimmer.

**Verified:** `npm run lint`, `npm run typecheck`, `npm test` (55 server + 62 web) and
`npm run build` pass; screenshots in `docs/screenshots/`.

**Not done / honest limits:** the demo health numbers are sample data (labelled as such);
the real-scan adapter derives "components" from evidence keywords and maps the scorer's
`structure` component to the "Code Quality" row; `GraphDetailPanel.tsx` is no longer used by
the app (kept for reference); no live end-to-end test against a real folder scan was added
in this step (the adapter is unit-tested with server-shaped fixtures).
