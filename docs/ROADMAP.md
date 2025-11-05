# ROADMAP.md — Delivery Plan, Milestones, Gates & Risk

**Status:** Draft v1 (living)
**Owner:** Levi (PM/Tech Lead)
**Last updated:** 2025-11-04 (America/São_Paulo)
**Scope:** GitHub Pages (browser-only) **now**; Electron wrapper **later**
**Note to reader:** This is the last doc in the spec set. All other docs are done: `VISION.md`, `DATA-SCHEMA.md`, `UI-UX-SPEC.md`, `LAYOUT-INTENT.md`, `TOPOLOGY-RULES.md`, `IO-SPEC.md`, `MAPSCRIPT.md`, `LOCAL-STORAGE.md`, `TEST-PLAN.md`. **Remaining: 0.**

---

## 0) Release tracks & gates (what “done” means)

We ship in **three tracks**, but **no features are dropped**—only sequenced.

* **A. Alpha (Pages Editor)** — public GitHub Pages build with:

  * Canvas editor (nodes/edges/groups, inline labels, color/shape pickers), **label boxes horizontal**, orthogonal/curved/straight routing, layout intents (force/hierarchy/concentric/grid), pins/ranks/edge-length hints, **live topology validation + Fix plans**, import/export (Full/Skeleton/Styled), library (IndexedDB), PNG export, Problems panel, MapScript console (Apply/Dry-run), Undo/Redo, Accessibility basics, deterministic seeds.
  * **Gate:** All Release-Blocking tests in `TEST-PLAN.md` pass; WCAG checks clean; perf thresholds met on the Classroom fixture.

* **B. Beta (Pages Polishing)** — same as Alpha plus:

  * ZIP bundles (multi-map + manifest), OPML export (tree projection), Diff preview enhancements, multi-tab lock, autosave recovery UI, snapshots, Library bulk actions, more edge styling (separation, dashes), visual overlays, keyboard power shortcuts.
  * **Gate:** additional Beta tests green; visual regression baselines stable across 3 browsers.

* **C. Electron (Local LLM-ready)** — identical UX with desktop filesystem, IPC hook for future on-device LLM (not in scope to implement the LLM).

  * **Gate:** Installer works on Win/macOS; storage migrator aware of desktop paths; parity with Pages features.

---

## 1) Work breakdown structure (WBS)

### 1. Foundations

1. Repo scaffolding, toolchain (Vite + TS + ESLint + Prettier + Vitest), CI (GitHub Actions).
2. Core packages:

   * `model` (types + factories, canonicalizer, hashing)
   * `validate` (schema + topology)
   * `layout-intent` (adapters + seed control)
   * `render` (canvas/SVG engine with label boxes)
   * `io` (envelopes, diffs, PNG, Markdown)
   * `mapscript` (parser, planner, apply)
   * `storage` (IndexedDB wrapper)
   * `app` (Library + Editor shell)
3. Test harness (Vitest + Playwright), fixtures generator.

### 2. Editor core (UI/UX-SPEC)

* Canvas interactions (select/move, connectors on hover/touch, inline label editor, Info Box).
* Style panel (color picker, shape picker, fonts, wrap/halo/background).
* Groups (create/delete, add/remove members, inheritance).
* Problems drawer, overlays (components, cycles, parallel pairs).
* Command bus & undo/redo (single-transaction rule).

### 3. Layout Intent (LAYOUT-INTENT)

* Intent model & UI sliders; seed management.
* Engines: Force (WebCola), Hierarchy, Concentric, Grid, Preset.
* Constraints: pins, ranks, edge-length hints.
* Edge routing: orthogonal/curved/straight with label horizontal.

### 4. Topology & Fix plans (TOPOLOGY-RULES)

* Incremental validator (R1–R10).
* Fix plans: mergeParallel, resolveReciprocal, connectComponents, attachOrphans, breakCycleWeakest, enforceTree.
* “Fix All” orchestrator.

### 5. I/O (IO-SPEC)

* Envelope schema & canonicalization, hash.
* Import policies (Replace/Merge/Assist) + Diff Preview.
* PNG export (scale, margin, background), Markdown export, (Beta: ZIP/OPML).

### 6. MapScript (MAPSCRIPT)

* Lexer + parser (EBNF), AST, semantic checks, selectors engine.
* Planner (pure transforms), dry-run/apply, diagnostics with line/col.
* Monaco integration (syntax highlight, autocomplete, examples).

### 7. Persistence (LOCAL-STORAGE)

* IndexedDB stores, manifest, autosave ring, snapshots, previews.
* Multi-tab lock (BroadcastChannel), GC & quotas, trash bin.
* Library UI (list/search/sort, preview tiles, actions).

### 8. QA, A11y, Perf (TEST-PLAN)

* Unit + Integration + E2E coverage, visual regression baselines.
* Axe automated checks + manual keyboard walkthrough.
* Performance budgets enforced in CI.

---

## 2) Sequenced plan (by day blocks)

> Adjust blocks to your calendar; each “Day” is a focused working block, not necessarily 24h.

### Day 0 — Bootstrap & skeleton

* Create repo & branch rules. Set up Vite + TypeScript + ESLint/Prettier + Vitest.
* Add CI pipelines (typecheck, unit, Playwright smoke).
* Implement `model` types + canonicalization + hash.
* Add fixtures (Tiny, Classroom minimal).

**Exit:** `model` unit tests green; CI green.

### Day 1 — Canvas & render core

* Implement `render` with horizontal label boxes (node/edge), halos, orthogonal/curved/straight strokes.
* Basic interactions: pan/zoom, select, move, create node/edge from handles, delete via toolbar/Delete key.
* Inline label editing; Info Box on hover/click; no vertical label rotation.

**Exit:** Can author Tiny fixture visually; PNG export renders exactly.

### Day 2 — Layout intent + constraints

* Integrate force + hierarchy + concentric + grid + preset.
* Seed control; pins/ranks/edge-length hints; stability slider; avoidOverlap.
* Deterministic “layout:done” event & settle logic.

**Exit:** Classroom fixture lays out deterministically (±1px); pins/ranks obeyed.

### Day 3 — Topology validator + Fix plans

* Implement R1–R6 (self-loop, parallel, reciprocal, components, orphans, parallelUndirected) incremental checks; Problems drawer.
* Implement key Fix plans: mergeParallel, resolveReciprocal, connectComponents, attachOrphans.
* Blockers wired at creation/import.

**Exit:** Violations are surfaced live; one-click repairs apply as single undo commands.

### Day 4 — I/O (JSON/PNG/Markdown) + Diff Preview

* Envelope schema + parser; Import policies Replace/Merge (Assist stub).
* Diff builder + Preview UI; blocking on **error** severities.
* PNG export finalized; Markdown outline export.

**Exit:** Import malformed shows pointer/snippet; diff preview trustworthy; exports round-trip.

### Day 5 — MapScript v1

* Lexer/parser; selectors; `add/set/delete/group/pin/layout intent/edgehint/fix`.
* Dry-run report; Apply as one command; diagnostics with line/col; Monaco editor wired.

**Exit:** 200-line script on Classroom fixture: deterministic diff; blocked on topology errors.

### Day 6 — Storage & Library

* IndexedDB wrapper; manifest; save/open/delete/trash; previews; autosave ring; recovery.
* Library page: tiles with previews, search/sort, actions (Open, Duplicate, Export, Trash).

**Exit:** Reload preserves docs; autosave recovery banner works; multi-tab lock read-only mode.

### Day 7 — Polish, A11y, Perf, Alpha release

* Axe pass (fix contrast, focus order, ARIA labels).
* Performance tuning (debounce layout/apply; canvas batch).
* E2E goldens recorded across Chromium/Firefox/Safari.
* GitHub Pages deployment; tag **alpha**.

**Exit (Alpha Gate):** All Release-Blocking tests green; perf thresholds met.

### Beta Block (post-alpha, ~3–5 days)

* ZIP bundle import/export + manifest; OPML with tree projection.
* Multi-edge separation visuals; dashes; more shapes.
* Snapshots UI; Library bulk export; multi-tab “take control” UX.
* Diff Preview enhancements (property-level view).
* Visual baseline refresh across browsers; Beta tag.

### Electron Block (1–2 days)

* Tauri/Electron shell; load/save dialogs; app menu; system shortcuts.
* IPC scaffold for future LLM; parity QA pass.

---

## 3) Deliverables checklist (per block)

* **Code:** package folders + typed APIs as in WBS.
* **Docs:** keep all `.md` in `/docs/` updated per changes; changelog appended.
* **Tests:** unit + e2e added alongside features; visual baselines updated deliberately (PR with diffs).
* **Demos:** fixtures rendered screenshots in `/docs/demos/`.

---

## 4) Roles & RASCI (even if solo)

| Area                | Responsible | Accountable | Support | Consulted                     | Informed     |
| ------------------- | ----------- | ----------- | ------- | ----------------------------- | ------------ |
| Product vision / UX | Levi        | Levi        | —       | Med peers (concept-map users) | Future users |
| Model/Schema        | Levi        | Levi        | —       | —                             | —            |
| Layout/Rendering    | Levi        | Levi        | —       | —                             | —            |
| Validation/Fixes    | Levi        | Levi        | —       | —                             | —            |
| I/O & MapScript     | Levi        | Levi        | —       | —                             | —            |
| Persistence         | Levi        | Levi        | —       | —                             | —            |
| QA & A11y           | Levi        | Levi        | —       | —                             | —            |
| Release Ops         | Levi        | Levi        | —       | —                             | —            |

---

## 5) Metrics (definition of success)

* **User-time to first valid map (20 nodes):** ≤ 10 minutes (Alpha).
* **Fix time for a broken import (E fixture):** ≤ 90 seconds with Fix All + 1–2 manual edits.
* **Authoring speed:** ≥ 2× faster than manual (MapScript + GUI) on Classroom scenario (measured by steps/time).
* **Stability:** crash-free sessions on 3 browsers during E2E matrix for 7 consecutive runs.

---

## 6) Risk register & mitigation

| Risk                                  | Impact | Likelihood | Mitigation                                                                                              |
| ------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------- |
| Safari canvas text quirks blur labels | Medium | Medium     | Use explicit pixel ratio; avoid CSS transforms for text; raise threshold in visual diffs; test early.   |
| Force layout jitter / non-determinism | Medium | Medium     | Seed all randomness; freeze after settle; snapshot positions.                                           |
| IndexedDB quota                       | Medium | Low–Med    | Previews cap (8 MB), autosave ring GC, export-and-purge workflow.                                       |
| Touch hit-target difficulty           | Medium | Med        | 40×40 px min; long-press handles with magnifier.                                                        |
| Complexity creep in MapScript         | High   | Med        | Ship v1 command subset first; strict grammar; deterministic planner; extensive examples.                |
| Perf on 200+ nodes                    | Medium | Med        | Batch renders; spatial index for label overlap checks; avoid synchronous layout in UI thread; debounce. |
| A11y gaps                             | Medium | Low        | Axe in CI; keyboard audits; focus management tested in E2E.                                             |

---

## 7) Tracking & burndown

* **Project board columns:** Backlog → In Progress → In Review → QA → Done.
* **Issue labels:** `alpha`, `beta`, `electron`, `perf`, `a11y`, `topology`, `layout`, `mapscript`, `io`, `storage`, `tests`.
* **Daily discipline:** close day with: what shipped, what’s blocked, next step; keep docs updated.

---

## 8) Release packaging

* **Alpha tag:** `v0.1.0-alpha` (Pages).
* **Beta tag:** `v0.2.0-beta` (Pages).
* **Desktop tag:** `v0.3.0-desktop` (Electron/Tauri).
* **SemVer policy:** bump minor when adding features; patch for fixes; schema bumps require migration and `packageVersion` increment in I/O.

---

## 9) Post-Alpha backlog (not optional, but after Alpha)

* ZIP bundle import/export with manifest.
* OPML export with tree projection helper.
* Multi-edge separation; improved parallel-edge visuals.
* Snapshot manager UI.
* Library bulk export; trash management UI enrichments.
* Semantic Assist (ID aliasing prompts) refinement.
* Additional layout constraints presets (Novak vs MindTree profiles) and “Discipline presets.”

---

## 10) Exit criteria recap

* **Alpha:** all Release-Blocking tests pass; perf within budgets; A11y basics; deterministic layouts; GitHub Pages live.
* **Beta:** feature-complete Pages app per specs; cross-browser parity; visual baselines locked.
* **Electron:** desktop parity; filesystem I/O; IPC scaffold; installer verified.

---

**This roadmap is binding.** If a task jeopardizes Alpha gate quality (tests, determinism, readability), it is postponed to Beta rather than shipped degraded.
