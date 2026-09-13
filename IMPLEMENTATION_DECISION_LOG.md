# Implementation Decision Log

This log records engineering decisions made **during implementation** of Project Intelligence
Workspace. It is subordinate to, and must not contradict, the product/architecture decisions
already recorded in `../ai-project-workspace-phase0/11-decisions/DECISION_LOG.md` (Decisions
A-E). Those are preserved as-is; nothing here overwrites them. Entries below fill in the
"Open Technical Decisions" left blank by `../ai-project-workspace-phase0/03-architecture/TECH_DECISIONS_OPEN.md`.

## Decision F — Desktop framework (revised from Phase 1 plan)

**Question:** Tauri (recommended in `ai-project-workspace-future-phases/01-v0-validate-intelligence/PHASE1_ANALYSIS_AND_PLAN.md`) vs. an alternative.
**Decision:** Defer native desktop packaging. Build v0 as a local web app: an Express/TypeScript
backend + a Vite/React frontend, both running on localhost only, no cloud dependency for any
required function. Package as a desktop app (Tauri or Electron) once the core intelligence
loop is validated and packaging is actually needed.
**Reason:** This development environment has no Rust toolchain (`rustc`/`cargo` not found).
Tauri would require installing and validating an entire new toolchain before writing a single
line of product code — high setup risk for zero product validation value. Node.js 26 and npm
are already present and sufficient to build and test the entire v0 loop.
**Consistency check:** Still local-first in substance — filesystem access, scanning, storage,
and the AI provider boundary all run on the user's machine; only the presentation layer is a
localhost web page instead of a native window. Nothing in Phase 0 requires native packaging
for v0 (`00-overview/MASTER_SPEC.md` doesn't mention a specific framework).
**Risk:** Desktop-specific concerns (native file-picker dialogs, OS-level permissions, tray
icon, offline packaging) are deferred, not solved. Revisit before considering v0 "done" in
the product sense, though it can pass its own gate on functional/intelligence grounds first.
**Status:** APPROVED FOR IMPLEMENTATION (engineering judgment call, reversible, non-product-facing).

## Decision G — Storage engine

**Question:** Which SQLite access layer/migration tool.
**Decision:** Prisma + SQLite.
**Reason:** Matches `04-data/DATA_MODEL.md`'s relational conceptual model directly; gives
schema-as-code, generated types, and a real migration tool in one well-supported dependency,
satisfying `13-development/DEVELOPMENT_RULES.md`'s "reversible migrations" requirement without
hand-rolling a migration runner.
**Status:** APPROVED FOR IMPLEMENTATION.

## Decision H — Module structure

**Question:** True multi-package monorepo (one npm package per module in
`03-architecture/MODULE_BOUNDARIES.md`) vs. folders within a single server app.
**Decision:** Single `apps/server` app with clearly separated internal folders
(`workspace/`, `discovery/`, `scanner/`, `intelligence/`, `ai/`, `storage/`, `security/`),
each with its own tests and a narrow exported interface. No separate npm packages for v0.
**Reason:** `13-development/DEVELOPMENT_RULES.md` rule 9: "prefer simple interfaces before
speculative abstraction." A full package-per-module split adds real build/publish overhead
with no v0 benefit — nothing currently needs independent versioning or reuse outside this
app. Module boundaries are enforced by folder/interface discipline and can be promoted to
real packages later if e.g. a desktop shell needs to reuse them independently.
**Status:** APPROVED FOR IMPLEMENTATION.

## Decision I — AI provider for v0

**Question:** Which real cloud provider to wire up behind the provider abstraction.
**Decision:** Provider interface (`AiProvider`) with a deterministic `MockProvider` as the
default (`AI_PROVIDER=mock`, no key required, always available, used in tests) and an
`AnthropicProvider` adapter as the opt-in "real" mode, gated by `ANTHROPIC_API_KEY`.
**Reason:** Matches the existing pattern of shipping a working product without requiring
credentials up front (consistent with `05-ai/AI_SPEC.md` — AI is optional to deterministic
scanning). Anthropic chosen as the concrete adapter since no other provider was specified;
the interface is provider-neutral so swapping/adding providers later doesn't touch callers.
**Note:** This was an independent design choice, not a reuse of `system ai/`'s mock/real
provider pattern — the interface, schemas, and prompt content here are specific to "Explain
this project" and were written from `05-ai/AI_SPEC.md`, not copied from that unrelated repo.
**Status:** APPROVED FOR IMPLEMENTATION. Live Anthropic verification is BLOCKED pending an
API key — see EXECUTION_STATE.md / chat for the access request when that becomes the actual
next step.

## Decision M — Main view rendered with DOM/SVG; three.js kept as an optional stage

**Question:** The revised main screen (four folder-style project nodes around a small core,
inspector panel, demo data layer) — build it inside the existing three.js / react-three-fiber
"Universe" or with plain DOM + SVG?
**Decision:** Plain React DOM + inline SVG (`apps/web/src/main/*`). The three.js scene
(`apps/web/src/graph/*`) is untouched and still available as the "3D graph" stage for a real
scanned workspace; it stays a lazy-loaded chunk that only downloads when chosen.
**Cost check (measured, `npm run build`):** main bundle 186 KB (59 KB gzip) vs. the 3D chunk
887 KB (239 KB gzip). Nothing in the new brief needs WebGL: folder icons, a 2–4 px float,
a 180–250 ms hover transition, a one-shot selection pulse and a CSS gradient background are
all cheaper and crisper in DOM, and buttons give native Tab/Enter/focus behaviour for free
(the R3F nodes needed custom pointer/keyboard plumbing). Text is real text (selectable,
zoomable, screen-reader visible) instead of `<Html>` overlays.
**Data seam:** components render only `model/workspaceView.ts` view-models. `demo/demoWorkspace.ts`
supplies the four sample folders (labelled "Demo Workspace" / "demo data" in the UI);
`model/fromApi.ts` adapts the real server types into the same shapes, so scanner results
replace the demo without touching a component. Demo health numbers are illustrative and are
never called a probability or prediction.
**Status:** APPROVED FOR IMPLEMENTATION (reversible; the 3D stage remains selectable).
