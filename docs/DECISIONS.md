# Decisions — Index

This file is an index, not a third copy of decision content. Full rationale, options
considered, and risks live in the two files linked below — update those, not this list.

## Product decisions

Authoritative source: `../ai-project-workspace-phase0/11-decisions/DECISION_LOG.md`

| # | Decision | Status |
|---|---|---|
| A | True v0 scope: workspace + reduced scanner + reduced intelligence + flat explorer + one AI feature | APPROVED |
| B | Product identity must not depend on 3D until validated | APPROVED |
| C | Pro tier gets a capped AI allowance, not unlimited cloud inference | APPROVED |
| D | v0 includes a tiny 3D proof-of-concept, additive to the flat explorer | APPROVED (human decision) |
| E | The one v0 AI feature is "Explain this project" | APPROVED |
| F–I | Engineering decisions (stack, storage, module structure, AI provider) | see `IMPLEMENTATION_DECISION_LOG.md` |
| J | Graph Mode expands beyond Decision D's minimal constraints (still no physics engine, no particle spam, no fabricated activity) | APPROVED (human decision) |
| K | Physics-like motion, particles, clustering, command palette, focus mode, performance governor, reduced-motion added to Graph Mode | APPROVED (human decision) |
| L | Universe (Graph Mode) becomes the default landing view; category-based node color palette | APPROVED (human decision) |

**Important nuance for anyone continuing this work:** Decision D (and its later refinements
J/K/L) are individually APPROVED by the human product owner, in-session. That is **not** the
same thing as the overall **Phase 0 gate** being APPROVED — the gate
(`../ai-project-workspace-phase0/10-validation/PHASE0_GATE.md`) is still **READY FOR REVIEW**,
not APPROVED, pending real user testing per `MVP_TEST_PLAN.md`. Do not conflate "a decision
inside Phase 0 was approved" with "Phase 0 itself is approved" — they are tracked separately
on purpose.

## Engineering decisions

Authoritative source: `../IMPLEMENTATION_DECISION_LOG.md`

- **F** — Desktop framework: Node/Vite local web app instead of Tauri (no Rust toolchain in
  this dev environment); native packaging deferred.
- **G** — Storage: Prisma + SQLite.
- **H** — Module structure: single `apps/server` app with internal folders, not a
  package-per-module monorepo (deferred until actually needed).
- **I** — AI provider: mock (default) + Anthropic adapter behind a provider interface.

## Where to add the next decision

If it changes product scope/behavior a user would notice → the Phase 0 pack's
`DECISION_LOG.md`. If it's a "how we built it" call with no product-visible behavior change →
`IMPLEMENTATION_DECISION_LOG.md`. Either way, add an entry there and a one-line pointer here —
never edit past entries to reflect a new decision; append a new one that explicitly
supersedes the old, the way D→J→K→L did.
