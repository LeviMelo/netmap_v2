# PRD.md — Product Requirements

**Status:** Draft v1 (living)
**Owner:** Levi (Product)
**Last updated:** 2025-11-04 (America/São_Paulo)
**Applies to:** Concept-map editor (GitHub Pages build)
**Traceability:** IDs used here (e.g., `REQ-LABEL-002`) must be referenced in tests, code comments, and ADRs.

---

## 0) Scope & assumptions

* **Scope:** Single-user, offline, static web app hosted on GitHub Pages. Multi-page UI: Library, Editor, Themes, Settings, Help.
* **Assumptions:** Runs in latest stable Chromium-class browsers (Chrome/Edge ≥ 120). No backend. IndexedDB available.
* **Non-negotiables:** Readability (horizontal labels, no occlusion), Topology Profiles (strict enforcement + repairs), Full customization, Robust import/validation, Local persistence, Undo/Redo for all mutations.

---

## 1) Functional requirements

### 1.1 Editing verbs

* `REQ-EDIT-001` **Create node** in ≤1 interaction (double-click canvas OR toolbar “+ Node”).
  **Acceptance:** Double-click empty space → inline text editor focused; on Enter, node appears at click; Undo removes it.

* `REQ-EDIT-002` **Edit node label inline** (single-click or Enter on selected). Supports multiline (Shift+Enter) and escape to cancel.
  **Acceptance:** Label text updates immediately; Undo restores previous value.

* `REQ-EDIT-003` **Create directed relation** via visible **connector handle** on node hover; drag to target.
  **Acceptance:** On drop over target, edge `source→target` created; label editor pops.

* `REQ-EDIT-004` **Edit edge label** inline, always rendered **horizontal** by default.
  **Acceptance:** Edge at arbitrary angle; label remains 0°; halo visible; Undo reverts.

* `REQ-EDIT-005` **Move nodes** by drag; **Pin** toggled automatically when user moves a node (configurable in Settings).
  **Acceptance:** Position saved; running layout keeps pinned nodes fixed.

* `REQ-EDIT-006` **Delete** node/edge via Delete key or toolbar.
  **Acceptance:** Deleting a node deletes incident edges; warning shown if it breaks topology profile; Undo reinstates.

* `REQ-EDIT-007` **Select & Lasso**: click selects; Shift-drag draws lasso rectangle; Shift-click toggles.
  **Acceptance:** Selection shows handles; bulk style/change applies to all.

* `REQ-EDIT-008` **Annotate (notes)**: nodes and edges support a free-text “notes” field (Markdown allowed, rendered in Inspector).
  **Acceptance:** Notes persist in document; export/import preserve them.

* `REQ-EDIT-009` **Group**: create/rename/delete groups; assign selection to groups; group styles cascade to members.
  **Acceptance:** Changing group color updates all members instantly.

* `REQ-EDIT-010` **Hide/Show**: filter by text, group, degree, type; hide non-matching; Clear restores.
  **Acceptance:** Hidden elements excluded from selection and exports unless opted in.

---

### 1.2 Layout intent & engines

* `REQ-LAYOUT-001` **Layout Intent UI** exposes: Structure (`Force | Hierarchy | Concentric | Grid | Preset`), Spread (0–100), Link length (0–100), Avoid overlap (bool), Level spacing (only for Hierarchy/Concentric), Edge routing (`Curved | Straight | Orthogonal`), Stability (0–100), Disconnected handling (`Keep close | Separate`).
  **Acceptance:** Changing any control re-applies layout pipeline on command.

* `REQ-LAYOUT-002` **Engines**: Force = **fcose**; Hierarchy = **elkjs** (fallback: dagre); Concentric/Grid = deterministic geometry; Preset = saved positions.
  **Acceptance:** Selecting Structure switches engine; errors surface in Problems if engine fails.

* `REQ-LAYOUT-003` **Constraints** supported: **Pin** per node; **Rank** (same level / above / below) for Hierarchy; **Edge length hints** (`short|medium|long`) map to engine parameters.
  **Acceptance:** Constraint changes alter resulting layout deterministically with same seed.

* `REQ-LAYOUT-004` **Positions written back** to Document after layout; Preset uses those positions; manual moves update positions immediately.
  **Acceptance:** Reloading the document reproduces the same arrangement.

* `REQ-LAYOUT-005` **LabelPass** (post-layout):
  a) Node label collision nudge (rect–rect repulsion; damping; respect pins).
  b) Edge label placement with **horizontal orientation** (0°) by default; candidate offsets; **leader** fallback; **edge under-label clip/fade** per element.
  c) Penalty for **very long edges**; improve angular resolution at hubs.
  **Acceptance:** On dense cluster, running layout reduces label overlaps (measurable drop); long-edge outliers reduced after pass.

* `REQ-LAYOUT-006` **Multi-edge separation**: edges between the same pair are routed as distinct parallel tracks; labels stagger.
  **Acceptance:** With 3 relations A→B, three visually separate edge tracks exist; no label overlap by default.

* `REQ-LAYOUT-007` **Crossing “bridge glyphs”** (optional toggle): draw “overpass” on the visually top edge at crossings.
  **Acceptance:** When enabled, crossings display bridge on z-top edge.

---

### 1.3 Topology profiles & structural correctness

* `REQ-TOPO-001` Built-in **Topology Profiles**:
  a) Concept Map — **Strict**: directed, **simple** digraph (no parallel edges, no self-loops), **single weakly connected component**. Cycles **warn**; orphans warn.
  b) Concept Map — **Lax**: directed, simple; single component **warn**; cycles allowed (warn).
  c) **Causal DAG**: directed simple digraph, **acyclic (error)**; single component warn.
  d) **Mind-map (Tree)**: undirected **tree** (connected, acyclic); one root recommended.
  e) **General Graph**: constraints off (informational metrics only).
  **Acceptance:** Switching profile recomputes metrics and updates violations immediately.

* `REQ-TOPO-002` **Metrics engine** computes WCCs, SCCs/cycles, parallel edges, reciprocals, self-loops, orphans, degree stats, crossings, edge length distribution, angular resolution.
  **Acceptance:** For a crafted test graph, counts match ground truth.

* `REQ-TOPO-003` **Topology panel** + **status chip**: lists violations grouped by rule with **Select** and **Fix…** actions; on-canvas overlays for components, SCCs, parallel edges.
  **Acceptance:** Clicking a violation zooms/filters to offending elements.

* `REQ-TOPO-004` **Repair wizards** (undoable transactions):
  a) Merge parallel edges (combine labels; or compress into multi-phrase single edge).
  b) Connect components (user selects endpoints; create directed edge; focus label editor).
  c) Break cycles (suggest minimal back-edges; allow reverse/remove/split-via-mediator).
  d) Remove/re-target self-loops.
  e) Fix orphans (delete or connect; suggest targets by label similarity/group proximity).
  **Acceptance:** Running “Fix all” on a crafted graph yields a profile-compliant graph with an apply-time diff preview.

* `REQ-TOPO-005` **Live enforcement** (configurable per rule): block creation of self-loops and duplicate `A→B`; warn on cutting a bridge (component split); warn on creating a cycle in DAG.
  **Acceptance:** Attempt to create second A→B → UI focuses existing edge label instead.

---

### 1.4 Customization & themes

* `REQ-STYLE-001` **Color**: modern color picker (HEX/RGB/HSL/OKLCH) + swatches + history; **contrast lint** for text against fill; palettes per theme.
  **Acceptance:** Picker available in Inspector; contrast warnings appear when below threshold.

* `REQ-STYLE-002` **Node styling**: shape (`rect|roundrect|pill|ellipse|diamond|hex`), size (auto to label or fixed), fill/border, label font/size/weight, halo width/color, optional background box, icon/badge slots.
  **Acceptance:** Changing any property reflects immediately; export preserves it.

* `REQ-STYLE-003` **Edge styling**: routing (`curved|straight|orthogonal`), width, dash (`solid|dashed|dotted`), arrowheads (`none|triangle|vee`), multi-edge separation distance.
  **Acceptance:** Orthogonal routing yields Manhattan paths; labels stay horizontal.

* `REQ-STYLE-004` **Edge label box** properties per edge: orientation (`horizontal` default; `follow-edge` optional), wrapWidth, padding, halo, background (on/color/opacity/radius), placement (policy/`t`/offsetX/offsetY), leader (on/length), overlapPolicy (`none|clip|fade-under`), visibility (`always|hover|zoom-threshold`).
  **Acceptance:** Modifying overlap policy to “clip” visually removes stroke under box.

* `REQ-STYLE-005` **Themes**: tokenized fonts, sizes, palette, default node/edge types; users can save/switch themes; **cascade** is Theme → Group → Element.
  **Acceptance:** Switching theme restyles map without altering Document semantics.

* `REQ-STYLE-006` **Groups**: define style presets; membership explicit or rule-based; “pack/alignment” (basic) keeps members visually closer.
  **Acceptance:** Toggling group color updates all members; removing group reverts to theme defaults.

---

### 1.5 Validation, import, MapScript

* `REQ-VALID-001` **Import pipeline**: parse (line/column on error) → schema validate → lints → **Problems + Quick Fix recipes** → **Diff preview** → **Apply as single command** (undoable).
  **Acceptance:** Malformed JSON reports exact location; current doc unchanged until Apply.

* `REQ-VALID-002` **Granular I/O**: export checkboxes for nodes (ids/labels/positions/styles/groups/notes), edges (ids/endpoints/labels/routing/styles), groups (defs/membership), theme (palettes/fonts/tokens), layout (intent/constraints/pins). Presets: **Skeleton/Styled/Full**.
  **Acceptance:** Exporting “Skeleton” omits positions/styles; re-import produces bare structure.

* `REQ-VALID-003` **Merge policies** on import: **Replace**, **ID-merge** (update existing, add new, optional remove missing), **Semantic assist** for unknowns using slug/label signature; alias map kept.
  **Acceptance:** Import with subset of IDs updates matching elements and adds new ones; diff preview reflects counts.

* `REQ-VALID-004` **Opaque IDs** define identity; slugs/labels are selectors only.
  **Acceptance:** Changing labels does not change identity; merges still match by ID.

* `REQ-VALID-005` **MapScript DSL** (client-side):

  * Create/update/delete nodes/edges by `id|slug|selector`.
  * Style directives for nodes/edges/groups/themes.
  * Patch semantics: compile to commands; **Dry-run** shows Problems & Diff; **Apply** integrates with same validation.
    **Acceptance:** Pasting a script that adds nodes/edges & restyles a group updates the canvas after Apply; Undo reverts all in one step.

---

### 1.6 Persistence, library, multi-page app

* `REQ-PERSIST-001` **IndexedDB** storage for maps, versions, themes, settings.
  **Acceptance:** After browser restart, Library lists previously saved maps.

* `REQ-PERSIST-002` **Autosave** (debounced 1–2s after commands) and **versioning** (keep last N versions per map; N configurable).
  **Acceptance:** Crash/reload restores latest version; Versions panel allows rolling back.

* `REQ-PERSIST-003` **Library page**: list/search/rename/duplicate/delete maps; import/export JSON/ZIP; open in Editor.
  **Acceptance:** Duplicating a map creates a new entry with unique ID.

* `REQ-PERSIST-004` **Multi-page**: Library (`/library.html`), Editor (`/editor.html`), Themes, Settings, Help.
  **Acceptance:** Navigation works as static links; state preserved when returning to Editor via last opened map id.

---

### 1.7 Inspector, view mode, export/print

* `REQ-UX-001` **Inspector** hover card (read-only by default) with Quick Edit toggle for label/color/shape/routing; shows computed styles (after cascade).
  **Acceptance:** Hover shows properties; toggling Quick Edit allows immediate changes.

* `REQ-UX-002` **Zoom-aware label visibility** for edges (threshold editable); hover/focus always shows full label.
  **Acceptance:** At far zoom, edge labels de-emphasize; hovering an edge shows full label box.

* `REQ-IO-001` **Export PNG** (scale, margins, background/transparent).
  **Acceptance:** Exported PNG matches on-screen look (theme, halos, clipping).

* `REQ-IO-002` **Export JSON** with selected granularity; **Import JSON** with diff preview; **Export all** maps as ZIP; **Import ZIP** (batch).
  **Acceptance:** Export+Delete+Import round-trip preserves map identity and positions for Full export.

---

### 1.8 Accessibility & keyboard

* `REQ-ACC-001` **High-contrast theme** bundled; text halos by default; minimum font sizes enforced.
  **Acceptance:** Switching to High-contrast significantly increases WCAG contrast measures.

* `REQ-ACC-002` **Keyboard**: Tab cycles selection; Enter edits label; Esc cancels; Delete deletes; Ctrl/Cmd-Z/Y undo/redo; Shift-drag lasso.
  **Acceptance:** All listed shortcuts operate in Editor even without mouse.

* `REQ-ACC-003` **Touch**: long-press radial menu (Connect|Rename|Color|Delete); pan/zoom gestures; no double-tap dependency.
  **Acceptance:** On touch device, all verbs accessible via radial + toolbar.

---

## 2) Non-functional requirements

### 2.1 Performance

* `REQ-PERF-001` Layout (engine + LabelPass) for **100 nodes / 150–200 edges** completes in **<300 ms** on a mid-range laptop (i5/Ryzen5 2022).
  **Acceptance:** Synthetic benchmark fixture; median over 5 runs below threshold.

* `REQ-PERF-002` UI commands (create node/edge, edit label, move node) yield visible feedback in **<50 ms**.
  **Acceptance:** Instrumented timestamps around render pipeline.

* `REQ-PERF-003` Pan/zoom maintain smoothness (~60 FPS target; no visible stutter) for the same scale graph.
  **Acceptance:** Visual check + frame budget logs show < 16 ms per frame on average while panning.

### 2.2 Reliability & robustness

* `REQ-ROB-001` Invalid or partial imports **MUST NOT** mutate current doc; all changes apply only after explicit **Apply**.
  **Acceptance:** Forced parse error shows Problems; canvas unchanged.

* `REQ-ROB-002` All mutations are **commands** with **undo/redo**; multi-step repairs apply as a **single** transaction.
  **Acceptance:** After Fix-All, single Undo returns to pre-fix state.

* `REQ-ROB-003` Autosave **never blocks** UI; failure (quota) is surfaced with recovery actions (export/cleanup).
  **Acceptance:** Simulate quota exceeded; non-blocking error banner with export option.

### 2.3 Security & privacy

* `REQ-SEC-001` **No telemetry** or network calls post-load; all data remains local unless user exports.
  **Acceptance:** Network panel shows no requests after initial asset load.

* `REQ-SEC-002` Third-party CDNs loaded with **SRI** and **crossorigin** properly set; local fallbacks allowed.
  **Acceptance:** HTML `<script>` tags include integrity hashes; offline test loads local bundles.

### 2.4 Compatibility

* `REQ-COMP-001` Target browsers: Chrome/Edge ≥ 120, Firefox ≥ 120 (best-effort); Safari recent (best-effort).
  **Acceptance:** Smoke tests pass (load Library, open Editor, create/edit/export).

* `REQ-COMP-002` Display scaling/DPI safe: halos and strokes scale consistently.
  **Acceptance:** On 1.0× and 2.0× DPR, visual parity maintained.

### 2.5 Internationalization (minimal, needed for you)

* `REQ-I18N-001` UI strings centralized for future i18n; document content uses Unicode without loss; fonts configurable per theme.
  **Acceptance:** Non-ASCII labels render; JSON export/import preserves codepoints.

---

## 3) Acceptance matrix (examples; full list goes to TEST-PLAN.md)

| ID              | Test method | Steps (summary)                                                            | Expected result                                                 |
| --------------- | ----------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| REQ-LABEL-002   | Manual/E2E  | Create angled edge; type edge label; switch routing to Orthogonal          | Label stays 0°; never occluded; halo visible                    |
| REQ-TOPO-001    | E2E         | Import graph w/ two WCCs, self-loop, duplicate A→B; open Topology; Fix All | After apply: 1 WCC; no loops; merged edges                      |
| REQ-LAYOUT-005  | Bench/E2E   | Dense cluster; run layout twice; compare overlap metrics before/after      | Overlap area/count reduced ≥60%                                 |
| REQ-STYLE-001   | Manual      | Pick low-contrast color; contrast warning; change to compliant color       | Warning appears; disappears after compliant                     |
| REQ-VALID-001   | Unit/E2E    | Import malformed JSON                                                      | Problems show line/col; doc unchanged                           |
| REQ-PERSIST-002 | E2E         | Edit map; force crash; reload                                              | Library shows map; latest autosave restored; Versions available |
| REQ-VALID-005   | E2E         | Paste MapScript that adds/updates elements; Dry-run; Apply; Undo           | Diff preview; Apply changes; single Undo reverts                |

*(Expand into full TEST-PLAN with all REQs.)*

---

## 4) Out-of-scope for this build (tracked for Electron/desktop)

* Local LLM-assisted map generation.
* Multi-user collaboration / cloud sync.
* Server-side persistence.
* Heavy analytics.

*(They remain planned; not included in the static Pages build.)*

---

## 5) Dependencies & technical notes

* **Graph renderer:** Cytoscape.js.
* **Layouts:** fcose; elkjs (or dagre fallback); built-ins for concentric/grid.
* **Storage:** IndexedDB (idb wrapper acceptable).
* **Parser:** MapScript via TS (peggy/nearley or hand-rolled).
* **Editor:** Plain TS or React; Monaco editor for JSON/MapScript panes.
* **Build:** Vite/esbuild; GitHub Pages deploy.

---

## 6) Risks & mitigations (testable)

* **Label collisions in pathological cases** → Provide “Improve readability” button; expose metrics; leader fallback; manual nudge respects pins.
* **Semantic merge ambiguity** → Default to ID; semantic assist is opt-in with preview; aliases recorded.
* **Performance variance on low-end** → Progressive disclosure of heavy effects; skip bridges by default; measure and gate.

---

## 7) Change control

* Any change that weakens: horizontal labels, topology enforcement/repairs, undo/redo, validation safety, granular I/O, or local persistence **requires an ADR** and Product sign-off.

---

**This PRD is binding.** All MUST requirements must ship in the Pages build. SHOULD items are expected unless they threaten deadlines; MAY items can be deferred with explicit ADRs.
