# VISION.md

**Status:** Draft v1 (living)
**Owner:** Levi (Product)
**Last updated:** 2025-11-04 (America/São_Paulo)
**Applies to:** Concept-map editor (GitHub Pages build, Electron-ready)

---

## 1) One-paragraph pitch

We are building a **concept-map editor** that lets authors sketch, clean, and export readable maps **fast**, directly in the browser, **offline**, and without servers. Unlike general diagrammers, our tool treats **layout** and **topology** as first-class citizens: it exposes **human layout intents** (Force/Hierarchy/Concentric/Grid/Preset), enforces **Topology Profiles** (e.g., Concept-Map Strict), and runs a **label-aware polishing pass** that keeps **all labels horizontal, legible, and unobscured**. Everything is **customizable** (colors, shapes, dashes, fonts, halos), **validates safely** (schema + lints + quick fixes), supports **textual editing** via a mini-DSL (MapScript), persists to a **local library** (IndexedDB, autosave, versions), and exports/imports with **granular profiles and diff/merge**. Hosted as a **static site** (GitHub Pages), designed to wrap in **Electron** later (for file dialogs and optional local LLMs).

---

## 2) The problem

* Making concept maps is **time-consuming** and **fragile**: auto-layouts rarely respect **readability** (overlapping labels, edge spaghetti); manual tweaks are tedious and get lost.
* Tools rarely **enforce structure**: authors unknowingly create **parallel edges**, **self-loops**, **disconnected islands**, or **cycles** where a **DAG** is intended.
* UI often hides or exposes the wrong knobs: engines leak jargon while the real needs are **“Spread”, “Link length”, “Keep my labels readable”**.
* Local, private workflows need **offline**, **no-login**, **no-telemetry**, and **durable persistence**.

---

## 3) Target users & contexts

* **Primary:** single author (e.g., medical student/researcher) producing **20–150 node** concept maps, locally, often under time pressure.
* **Secondary:** same author using the tool for **taxonomies**, **flow-like causal diagrams**, or **mind-map trees**.
* **Environment:** laptop browser, **no backend**, GitHub Pages hosting. Must run well on mid-range hardware.

> We will scale beyond 150 nodes, but the UX is tuned for maps where **edge labels (linking phrases)** are core semantics and must remain legible.

---

## 4) Product principles (non-negotiable)

1. **Readability first.** Edge and node labels are **horizontal by default**, never occluded, with **halos/backgrounds** to ensure contrast.
2. **Layout is a dialogue.** The user states **intent**; engines compute a draft; we run a **LabelPass** (collision/placement) and preserve user pins.
3. **Topology is explicit.** Users pick a **Topology Profile**; the app continuously checks rules and offers **one-click repairs**.
4. **Everything is customizable.** Colors (picker + palettes), shapes, dashes, arrowheads, fonts, halos, label box behavior.
5. **Textual & visual parity.** The **MapScript** DSL edits the **same model** as the canvas; both go through validation and the command stack.
6. **Robust by default.** Invalid input never mutates the current map; all changes are **undoable**; imports show **diff + quick fixes**.
7. **Local & private.** No servers. Persistence via **IndexedDB** with autosave and versions.
8. **Static-site first; Electron-ready.** The browser build stands alone; the same modules will work in Electron (native file dialogs; future local LLMs).
9. **Testable promises.** Every requirement is observable with simple acceptance checks.

---

## 5) What the app **is**

A **multi-page static web app**:

* **Library**: list/search maps stored locally; duplicate; delete; export/import; open.
* **Editor**: canvas + toolbar + panels (**Layout**, **Style**, **Groups**, **Topology/Problems**, **Inspector**, **Export**).
* **Themes**: manage palettes, fonts, and style presets.
* **Settings**: lint defaults, autosave cadence, data management, keyboard map.
* **Help**: shortcuts, MapScript syntax, topology concepts.

Under the hood:

* **DocumentStore** (graph document, versions), **CommandStack** (do/undo/redo), **Validator** (schema + topology + lints + quick fixes), **LayoutAdapter** (intent→engine), **LabelPass** (overlap/placement), **Renderer** (Cytoscape-based), **MapStore** (IndexedDB).

---

## 6) Non-negotiable capabilities (all are **MUST-have** in this build)

### 6.1 Editing verbs

* Create node ▸ Create directed relation ▸ Label relation ▸ Move/Pin ▸ Group/Style ▸ Annotate (notes) ▸ Search/Select ▸ Hide/Show subsets ▸ Export.

### 6.2 Layout system

* **Layout Intent UI**: Structure (`Force | Hierarchy | Concentric | Grid | Preset`), **Spread**, **Link length**, **Avoid overlap**, **Level spacing**, **Edge routing** (`Curved | Straight | Orthogonal`), **Stability**, **Disconnected handling**.
* **Engines**: fcose (Force), elk/dagre (Hierarchy), built-ins for Concentric/Grid, Preset (saved positions).
* **Constraints**: pins (absolute), ranks (Hierarchy: same level/above/below), per-edge length hints (`short|medium|long`).
* **LabelPass**:

  * **Node label collision nudge** (rect-rect repulsion with damping; respect pins).
  * **Edge label placement**: always **horizontal by default**; candidate offsets; **leader** fallback; **clip/fade** edge under label box.
  * Penalize **very long edges** (keeps labels readable); improve **angular resolution** at hubs.
* **Multi-edge separation** (parallel channels) and optional crossing **bridge glyphs**.

### 6.3 Topology Profiles & repairs

* Built-in profiles: **Concept Map — Strict**, **Concept Map — Lax**, **Causal DAG**, **Mind-map (Tree)**, **General Graph**.
* Metrics: WCCs/SCCs, parallel edges, reciprocals, self-loops, orphans, cycles, crossings, degrees, edge length distribution, angular resolution.
* **Topology panel** with status chip; violations list; **on-canvas overlays**; **repair wizards** (merge parallel edges, connect components, break cycles, fix orphans).
* **Live enforcement**: block self-loops/duplicate directed edges; warn on component splits and cycle creation (for DAG).

### 6.4 Customization & themes

* **Color**: modern picker (HEX/RGB/HSL/OKLCH) + palette swatches; contrast lint; “recent” colors.
* **Node**: shape (rect/round-rect/pill/ellipse/diamond/hex), size (auto/fixed), color/fill, icon/badge, label font/size/halo/background box.
* **Edge**: routing (curved/straight/orthogonal), width, dash, arrowheads, multi-edge separation; **edge label box** (wrap width, padding, offsets, leader, overlap policy, visibility policy, optional “follow-edge” orientation).
* **Groups**: style buckets with **cascade** (Theme → Group → Element); rule-based or explicit membership; group packing/alignment (basic).

### 6.5 Validation, parsing, and **textual edits**

* **Import/Apply** pipeline: parse → schema validate → lints → **Problems + Quick Fixes** → **Diff preview** → **Apply as one command** (undoable).
* **MapScript** DSL (client-side): create/update/delete nodes/edges by **ID/slug/selector**; style directives; group ops; patch semantics (works against the current map). Dry-run + diagnostics; Apply integrates with validation.

### 6.6 I/O & persistence

* **Export**: PNG (scale/margins/transparent), JSON with **granular toggles** (nodes/edges/groups/theme/positions/constraints/layout intent), with presets (**Skeleton/Styled/Full**).
* **Import**: merge policies (**Replace**, **ID-merge**, **Semantic assist**), diff preview; semantic fallback by slug/label signature; alias tracking.
* **Library**: IndexedDB, autosave (debounced), simple versions (keep N entries), bulk export/import (ZIP).
* **No data loss on invalid input.** The current document is never mutated by a failing import.

### 6.7 Inspector & View mode

* Hover card with properties (type, label, group(s), color, shape, font, routing, notes); **quick edit**.
* Zoom-aware label visibility (edge labels can de-emphasize at far zoom; always legible on hover/focus).

### 6.8 Accessibility & printability

* High-contrast theme, text halos, minimum font sizes, keyboard affordances (Tab, Enter, Delete, Ctrl/Cmd-Z/Y), print theme (white background, thicker strokes).

### 6.9 Performance budgets (informational but expected)

* 100 nodes / 150–200 edges: **<300 ms** for layout+LabelPass on mid-range laptop.
* All interactive edits **<50 ms** to visual feedback.
* Rendering at 60 FPS during panning/zooming (best-effort).

### 6.10 Privacy & security

* **No telemetry**, no network dependencies post-load (CDNs allowed at load; provide integrity).
* All data remains local unless user explicitly exports.

---

## 7) What the app **is not** (for this Pages build)

* Multi-user collaboration or accounts.
* Cloud sync or auth.
* Local LLMs driving map generation (kept for Electron track).
* Heavy analytics or server compute.

> These are **not dropped** features; they are **out-of-scope for the static build** and planned for the Electron/desktop track.

---

## 8) Differentiators

* **Label-aware layout**: we fix collisions and place edge labels **horizontally** with box/leader logic.
* **Topology-first UX**: profiles, live enforcement, and repair wizards keep maps structurally correct.
* **Full customization** without engine jargon; **themes & palettes** with contrast lint.
* **Textual patches (MapScript)** that compile to the same command stack as the canvas.
* **Granular I/O** with merge semantics and diff previews.
* **Local library** with autosave and versions, all offline.

---

## 9) Success metrics (measurable)

* **Authoring speed:** create a 40-node concept map with labeled edges in **<10 minutes** (expert) / **<20 minutes** (new user).
* **Readability:** ≥ **90%** of edge labels free of overlaps at 100% zoom without manual nudging after a layout run.
* **Topology compliance:** **0 blocking errors** under chosen profile after “Fix all” flow; ≤ **3 clicks** to resolve typical violations.
* **Robustness:** **0 crashes** on malformed imports; invalid inputs never mutate the current doc.
* **Persistence:** **0 data loss** with autosave + versions across sessions.

---

## 10) Risks & mitigations

* **Overlap/placement complexity:** edge cases may persist in dense clusters.
  **Mitigation:** multiple candidate placements, leader fallback, long-edge penalties, and a visible “Improve readability” pass.

* **User overwhelm (customization):** too many knobs can confuse.
  **Mitigation:** **presets first**, advanced toggles collapsed; consistent tokens; inspector quick edits.

* **Static hosting limitations:** large bundles, CORS for fonts/CDNs.
  **Mitigation:** build with Vite/esbuild; SRI + local fallbacks; test offline behavior.

* **Semantic merge ambiguity:** labels/slugs not unique.
  **Mitigation:** **opaque IDs** for identity; semantic assist only for unknowns with user confirmation; alias map recorded.

---

## 11) Design invariants (hard rules)

* **Edge and node labels render horizontal by default** (0°), never vertical unless user explicitly opts to “follow-edge”.
* **Labels are never hidden beneath strokes** (z-stack + halos/background or “clip under label”).
* **Opaque, stable IDs** define identity (not labels or topology).
* **Every user action is a command** (undo/redo); imports/patches apply as a single transaction.
* **Invalid input never mutates current state**; all changes pass through validation.
* **Profiles, themes, and engines are replaceable data/plugins**—the UX and document model remain stable.

---

## 12) Golden scenarios (must be silky)

1. **Rapid sketch:** Add 25 nodes + 30 edges with inline labels; run Force layout; one click “Improve readability”; export PNG.
2. **Topology fix:** Import messy map; panel shows duplicate edges, self-loop, two components; run “Fix all”; connect components; compliant under Concept-Map Strict.
3. **Style refinement:** Select “Histology” nodes; assign group; change palette color and node shape; save as theme preset.
4. **Orthogonal clarity:** Switch Structure→Hierarchy; edges orthogonal; labels stay horizontal with occasional leaders; export print theme.
5. **Textual patch:** Open MapScript; add nodes/edges and restyle a group; dry-run shows a warning; Apply; canvas updates.
6. **Granular export:** Export Skeleton for sharing; later import Full to continue work with positions and theme.
7. **Merge by ID:** Import a newer JSON; diff preview shows 8 updates, 2 additions; Apply merges; autosave version created.
8. **Live enforcement:** Attempt to add A→B when one exists; tool focuses the existing edge label instead of duplicating.
9. **Readability assist:** Dense cluster; run Readability pass; label overlaps drop visibly; long edges shortened.
10. **Persistence:** Browser crashes; reopen Library; last autosave + previous versions available; no data loss.

---

## 13) Future tracks (after Pages MVP)

* **Electron wrapper:** native open/save dialogs, local filesystem projects, richer export (SVG, PDF), optional local LLM flows (draft map, rewrite phrases).
* **Collaboration:** multi-user concurrency, comments, cloud sync (requires backend).
* **Advanced layout:** additional engines (e.g., ELK variants), constraint solving, auto-rank by semantics.

---

## 14) Glossary (short)

* **LabelPass**: post-layout step that resolves label collisions and places edge labels (horizontal) with offsets/leader lines.
* **Topology Profile**: rule set defining allowed/forbidden structures (e.g., directed simple digraph, single component).
* **MapScript**: textual mini-language to create/update/delete/style graph elements via IDs/slugs/selectors, compiled to commands.
* **Layout Intent**: user-level controls (Spread, Link length, etc.) mapped to engine parameters via an adapter.
* **Group**: style bucket; styles cascade Theme → Group → Element.

---

**This vision is binding.** Every design, API, and implementation choice must uphold these promises. If a trade-off seems to violate them (e.g., an engine forces rotated labels), we choose a different approach or extend the LabelPass—**we do not compromise readability, topology correctness, customization, validation safety, or offline durability.**
