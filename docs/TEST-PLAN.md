# TEST-PLAN.md — Quality Strategy, Cases & Acceptance

**Status:** Draft v1 (living)
**Owner:** Levi (QA Lead by hat)
**Last updated:** 2025-11-04 (America/São_Paulo)
**Scope:** GitHub Pages build (browser-only), Electron-ready later
**Contract:** Shipping requires all **Release-Blocking** tests to pass and **Performance/A11y** thresholds to be met. All tests are deterministic (seeded) and repeatable.

---

## 1) Goals & non-goals

* **Goals**

  * Prove correctness of core model (`GraphDocument`), topology enforcement, layout determinism, label readability invariants (never rotated), MapScript determinism, I/O safety (no mutation on parse/validate errors), and local persistence.
  * Validate **repair workflows** (“Fix plans”) are transactional and undoable.
  * Guarantee **cross-browser** behavior (Chromium/Firefox/Safari latest −1), **touch + mouse** parity, and **WCAG 2.1 AA** basics.
  * Keep performance within thresholds on 20–150 node maps; scale gracefully to ~300 nodes.

* **Non-goals (for this Pages release)**

  * No server sync or multi-device reconciliation.
  * No LLM features (reserved for Electron).

---

## 2) Environments & tooling

* **Runtimes:**

  * Chromium (Chrome latest, Edge latest)
  * Firefox latest
  * Safari latest (macOS)
  * iOS Safari (latest) — smoke on touch flows

* **OS:** Windows 10/11, macOS 13+, iOS 17+

* **Tooling:**

  * **Unit**: Vitest (+ jsdom)
  * **Integration/E2E**: Playwright (desktop & mobile emulation)
  * **Lint/Type**: ESLint + TypeScript `strict`
  * **A11y**: axe-core automation + manual keyboard walkthrough
  * **Coverage**: c8 (branches ≥ 80% on core packages)
  * **CI**: GitHub Actions (matrix: {browser, os})

* **Determinism:** All randomized algorithms accept a **seed**. Layout seeds stored in doc and in tests.

---

## 3) Fixtures & datasets

* **Tiny** (T): 6 nodes / 6 edges; 1 group; orthogonal routing.
* **Classroom** (C): 80 nodes / 120 edges; 5 groups; mixed routing; typical labels.
* **Edge-Case** (E): duplicates, reciprocal pairs, self-loops, orphans, 3 components, long labels (180 chars), emojis, RTL snippets.
* **Large** (L): 220 nodes / 320 edges (upper bound for Pages target).
* **Tree** (TR): MindTree profile with one root, in-degree=1.
* **DAG** (DG): CausalDAG with 3 known cycles injected for fix tests.

Fixtures exist as `.netmap.json` (Full) and generated variants (Skeleton/Styled).

---

## 4) Acceptance thresholds (Release-Blocking)

* **Perf (desktop Chromium, mid laptop):**

  * Open **C** from library to interactive: **≤ 250 ms**
  * Apply layout (Force intent) on **C**: **≤ 300 ms** to settle (seeded)
  * Import (Merge) on **C** with 40 changes: **≤ 150 ms** to Diff
  * PNG export (scale 2) **C**: **≤ 120 ms**
  * MapScript 300 lines dry-run: **≤ 30 ms**

* **A11y:** axe score “serious/critical” **0**; keyboard can reach all controls; focus visible; color contrast ≥ 4.5:1.

* **Readability invariants:** No vertical label rendering. Edge label boxes never fully occluded.

* **Persistence:** No data loss after reload; autosave recovery offered when hashes differ.

---

## 5) Test taxonomy & cases

### 5.1 Schema & model (Unit)

**Blockers**

* **TP-M01** Parse/validate GraphDocument (T, C, E, L) passes JSON-Schema.
* **TP-M02** Canonicalization: colors → HEX, numbers rounded; stable hash across runs.
* **TP-M03** ID rules: no auto-rename; explicit rename updates references or warns (as spec).
* **TP-M04** Granularity prune/expand round-trip (Skeleton/Styled/Full) preserves required fields.

**Nice-to-have**

* **TP-M05** Group membership integrity after add/remove.

### 5.2 Topology rules & fixes (Unit + Integration)

**Blockers**

* **TP-T01** **ConceptStrict** blocks self-loop on live edge creation; focuses error.
* **TP-T02** Duplicate A→B creation is blocked; **Fix plan** “mergeConcat” produces single survivor with concatenated label.
* **TP-T03** Reciprocal A↔B in **CausalDAG** shows **Error** and “breakCycleWeakest” plan; applying removes one edge; graph becomes acyclic (SCC count==1 for all nodes).
* **TP-T04** Orphans detected; “attachOrphans” offers ≥1 sensible candidate; apply creates connection.
* **TP-T05** Multiple components in **MindTree** → **Error**; “connectNearest” joins into single component.
* **TP-T06** “Fix All” produces zero blocking problems and is a **single** undoable command.

**Nice-to-have**

* **TP-T07** Readability lints (long edge label) suggest wrap and do not block Apply.

### 5.3 Layout intent & engine (Unit + Visual Snapshot)

**Blockers**

* **TP-L01** Applying **hierarchy** intent on TR: ranks respected (root top), **no overlaps** above threshold.
* **TP-L02** Applying **force** intent on C with same seed → **identical positions** (±1px tolerance) across runs.
* **TP-L03** Orthogonal routing produces 90° segments; label remains **horizontal** (`followEdge:false`), and never clipped.
* **TP-L04** Pins respected: running any layout keeps pinned positions within ±0.5px.
* **TP-L05** Edge length hints adjust average path length for tagged edges (monotonic short < medium < long).

**Nice-to-have**

* **TP-L06** Multi-edge separation offsets parallel edges visually.

### 5.4 Label rendering & readability (Integration + Visual)

**Blockers**

* **TP-R01** Node labels never overlap node body padding; wrapping obeys `wrapWidth`.
* **TP-R02** Edge labels draw **horizontally** by default; toggling `followEdge:true` triggers a **Warning**.
* **TP-R03** Label box halo masks underlying strokes; legibility on light/dark themes meets contrast rule.
* **TP-R04** Hover affordance shows Info Box with element properties; never escapes viewport; ESC closes.

### 5.5 MapScript (Unit + Integration)

**Blockers**

* **TP-S01** Syntax errors report line/column and block Apply; document unchanged.
* **TP-S02** Determinism: given same doc + script → same Diff hash; `begin/commit` yields distinct undo entries.
* **TP-S03** Topology gates enforce profile: creating duplicate A→B in Strict yields `ProfileBlock`.
* **TP-S04** `set group:ID { … }` cascades styles to all members; visual snapshot matches reference.
* **TP-S05** Deleting edges with regex selector (`label~`) affects only matches.

**Nice-to-have**

* **TP-S06** Autocomplete lists known properties; unknown emits `SemanticError`.

### 5.6 I/O (Import/Export) (Integration)

**Blockers**

* **TP-I01** Import malformed JSON → ParseError with pointer/snippet; canvas not mutated.
* **TP-I02** SchemaError at `/document/edges/e9/to` blocks Apply; Problems drawer shows pointer.
* **TP-I03** Merge by ID updates only present fields; **Remove missing** deletes and lists in Diff.
* **TP-I04** Markdown export on TR (Tree) produces expected outline; OPML export prompts for tree projection if needed.
* **TP-I05** PNG export at scale=2 reproduces canvas visuals (pixel-diff within 1%).
* **TP-I06** ZIP bundle import with missing theme → prompts to map theme; after selection, import applies cleanly.

### 5.7 Undo/redo & transactions (Integration)

**Blockers**

* **TP-U01** Every GUI mutation (create edge, delete node, apply fix, import apply) is **one command**; Undo reverts exactly that diff.
* **TP-U02** Redo re-applies identically (positions/styles preserved).

### 5.8 Library & persistence (Integration)

**Blockers**

* **TP-P01** Create → Save → Reload → Doc content, preview, and modifiedAt persist.
* **TP-P02** Autosave triggers on idle/visibility change; recovery offered when autosave hash ≠ manifest hash.
* **TP-P03** Multi-tab lock: second tab opens in read-only; “Take control” transfers editing.
* **TP-P04** QuotaExceededError → GC previews then autosaves; subsequent save succeeds (or surfaces export advice).

### 5.9 Cross-browser & touch (E2E)

**Blockers**

* **TP-X01** Mouse flows: create node/edge, edit label inline, select, group, fix, export (Chromium/Firefox/Safari).
* **TP-X02** Touch flows (iOS Safari): tap-and-hold connector to create edge; pan/zoom; inline label; no hover-critical control (hover has fallback).
* **TP-X03** Keyboard: full navigation, shortcuts (Undo/Redo/Delete), focus order logical.

### 5.10 Security & CSP (Integration)

**Blockers**

* **TP-C01** No remote requests during import/export; CSP blocks inline scripts; app still works.
* **TP-C02** Drag-dropping a non-JSON file yields a friendly error; no crash.

---

## 6) E2E scenarios (Playwright scripts outline)

1. **Happy path authoring (C):**

   * New doc → add 10 nodes via GUI → connect edges → set hierarchy intent → Fix components (if any) → export PNG → Undo/Redo sequence → Save → Reload → Visual diff == 0.

2. **Import with repairs (E):**

   * Import with duplicate A→B, self-loop, orphans.
   * Problems drawer shows counts; apply **Merge** and **Attach orphans**.
   * Apply import; validate zero **error** severities remain.

3. **MapScript bulk edit:**

   * Paste 200-line script (batch styles, pins, constraints).
   * Dry-run → 0 blocking; Apply → one command.
   * Undo → positions/styles revert.

4. **Library lifecycle:**

   * Create 3 maps; rename, tag, export ZIP; purge local data; reimport ZIP; previews regenerate; modifiedAt order preserved.

5. **Autosave recovery:**

   * Edit without saving; close tab; reopen; banner offers recovery; diff preview shows pending changes; apply.

---

## 7) Visual regression strategy

* Use **Playwright screenshot** with strict viewport & device pixel ratio.
* Seeded layouts → stable coordinates → pixel diff threshold 1–2%.
* Golden images stored in repo under `tests/golden/<case>/<browser>.png`.
* Areas with expected randomness (e.g., animated settle) are captured **post-settle** event.

---

## 8) Accessibility plan

* Automated: run **axe-core** on Library and Editor; fail build on serious/critical.
* Manual keyboard path:

  * Tab order through: Library list → New → Editor toolbar → Canvas → Problems drawer → Info panel → MapScript console.
  * Space/Enter activate; ESC closes modals/drawers; visible focus ring always present.
* Labels: ARIA labels for buttons; live regions for toast messages.

---

## 9) Performance tests

* Micro-benchmarks (Vitest) for:

  * Validator on C, E, L.
  * Diff builder (40 updates).
  * Canonicalizer + hash.
* E2E timing (Playwright) around:

  * Open doc → first paint → interactive.
  * Apply layout (emit `layout:done`).
  * PNG export completion.

**Fail build** if above thresholds (see §4).

---

## 10) Reporting & CI gates

* GitHub Actions matrix:

  * `unit` (Node + jsdom), `integration` (Chromium headless), `e2e` (Chromium + WebKit + Firefox).
* Artifacts:

  * Coverage reports (lcov), E2E videos on failure, visual diffs.
* Gates:

  * Typecheck clean.
  * Lint clean.
  * Coverage ≥ 80% on **core packages** (`model`, `validate`, `layout-intent`, `mapscript`, `io`).
  * All **Release-Blocking** tests green.

---

## 11) Manual exploratory checklist (pre-release)

* [ ] Long label wrapping/reflow while zooming.
* [ ] Theme switch (light/dark): contrast, halos, PNG background.
* [ ] Grouping: drag selection into/out of group; style inheritance edges.
* [ ] Orthogonal edges around tight clusters; label offset editing.
* [ ] Problems overlay clarity on dense maps (clickability).
* [ ] Mobile pinch zoom, two-finger pan; edit without accidental drags.
* [ ] Import a maliciously large JSON (guarded and error surfaced).
* [ ] Library: sort/filter, bulk export, trash & restore.

---

## 12) Test data generation helpers (dev-only)

* `genConceptMap(nNodes, density, seed)` → returns valid GraphDocument.
* `injectProblems(doc, options)` → adds duplicates, self-loops, orphans.
* `projectToTree(doc, rootId)` → produces arborescence for OPML tests.

---

## 13) Open risks & mitigations

* **Safari text rendering quirks** → keep PNG pixel diff threshold slightly higher on Safari (2%).
* **Touch hit-targets** → maintain min 40×40 px targets; add “tap handles” magnifier if necessary.
* **Quota fragmentation** → GC policy tested under forced quota; prompt user early.

---

## 14) Exit criteria (ready to ship)

* All Release-Blocking tests pass on CI matrix.
* Performance thresholds met in CI and one manual local run.
* A11y automated pass (no serious/critical) + manual keyboard walkthrough OK.
* Visual diffs within thresholds on golden cases.
* No P0/P1 bugs open.

---

## 15) Maintenance

* Every bug gets a **regression test** before closing.
* Keep fixtures small where possible; large map only for perf and cross-browser.
* Re-seed goldens on intentional visual changes with review.

---

**This plan is binding.** Any release that skips topology gates, allows vertical labels by default, mutates state on import error, or ships without passing Release-Blocking tests is **not acceptable**.
