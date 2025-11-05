# UI-UX-GUIDE.md — Interaction Design & Page Specs

**Status:** Draft v1 (living)
**Owner:** Levi (Product)
**Last updated:** 2025-11-04 (America/São_Paulo)
**Scope:** GitHub Pages build (static, offline) — Electron-ready
**Non-negotiables enforced here:** horizontal labels; topology profiles + repairs; full customization; robust import/diff/undo; local library; high readability.

---

## 1) Design goals (what every screen must optimize)

1. **Fast authoring** of readable concept maps (20–150 nodes) with **minimal friction**.
2. **Clarity over engine jargon**: users express **intent**; engines comply.
3. **Never lose work**: autosave, versions, undo/redo for every mutation.
4. **Structural correctness**: users see & fix violations **in place**.
5. **Accessibility**: text always legible (horizontal labels, halos, contrast), keyboard parity, touch parity.

---

## 2) Global design tokens (Theme defaults used by UI)

* **Spacing scale (px):** `4, 8, 12, 16, 24, 32`
* **Font family (UI):** `Inter, Segoe UI, system-ui, sans-serif`
* **Font sizes (UI):** `12, 13, 14, 16` (body 14)
* **Border radius:** `6`
* **Shadow (panel):** `0 4px 10px rgba(0,0,0,.08)`
* **Focus ring:** `2px` outline `#4C9AFF` outside border
* **Error color:** `#D14343`; **Warning:** `#B78103`; **Info:** `#1070CA`
* **OKLCH support:** Color picker must accept `HEX/RGB/HSL/OKLCH`

---

## 3) Navigation map (multi-page, static)

* **/library.html** — Library (maps list, search, import/export, open)
* **/editor.html?map=<id>** — Editor (canvas + panels)
* **/themes.html** — Themes (palette, presets)
* **/settings.html** — Settings (autosave cadence, features, keyboard)
* **/help.html** — Help (shortcuts, MapScript, profiles)

**Top Nav (all pages):** App name ▸ Library ▸ Editor (disabled if none open) ▸ Themes ▸ Settings ▸ Help

---

## 4) Library page (maps list & versions)

### 4.1 Layout

* **Header**: “Your maps” + **Search** (placeholder “Search title or id”)
* **Toolbar**: `New Map`, `Import JSON`, `Import ZIP`, `Export All`
* **Grid/List** of cards: Title, updated timestamp, size (nodes/edges), **Open**, **Duplicate**, **Export**, **Delete** (overflow menu)
* **Empty state**: illustration + “Create your first map” + `New Map`

### 4.2 Interactions

* `New Map` → create document (default profile ConceptStrict) → redirect to **Editor**.
* `Export` (card) → choose **Skeleton/Styled/Full** → downloads JSON envelope.
* `Delete` → confirmation dialog, then remove and purge versions.
* **Versions** (link on card) → modal list (timestamp ▸ “Restore as copy” ▸ “Preview diff”).
* Import failures show a **Problems** modal (schema errors with line/column).

**Acceptance:** All actions complete without page reload; hitting back from Editor returns to Library with last scroll position.

---

## 5) Editor page — anatomy

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Top bar: [Back to Library]  [Map Title (editable)]   [Profile chip]     │
│          [Undo][Redo]  [Save Status] [Share Export] [Help ?]             │
├───────────────────────┬──────────────────────────────────────────────────┤
│ Left toolbar          │ Canvas (Cytoscape) + Overlay (labels, bridges)   │
│ ┌───────────────┐     │                                                  │
│ │ Cursor/Select │     │  - connector handles on node hover               │
│ │ + Node        │     │  - lasso (Shift-drag)                            │
│ │ + Edge        │     │  - hover card (Inspector mini)                   │
│ │ Group         │     │                                                  │
│ │ Hand/Pan      │     │                                                  │
│ │ Zoom +/-      │     │                                                  │
│ │ Fit           │     │                                                  │
│ │ Readability   │     │                                                  │
│ │ Fix Topology  │     │                                                  │
│ └───────────────┘     │                                                  │
├───────────────────────┴──────────────────────────────────────────────────┤
│ Right panels (tabs): Layout | Style | Groups | Topology | Inspector | I/O│
└──────────────────────────────────────────────────────────────────────────┘
```

* **Top bar**

  * **Map title** inline editable; Enter to commit; autosave updates.
  * **Profile chip** (e.g., ConceptStrict) — dropdown to switch profiles.
  * **Undo/Redo buttons** (disabled state reflects stack).
  * **Save Status**: “Saved • 2 min ago” | “Saving…” | “Autosave disabled” (error state).
  * **Share Export**: quick access to PNG/JSON.
  * **Help**: opens panel for shortcuts & MapScript cheatsheet.

* **Left toolbar** (tools are also hotkeys; tooltips show)

  * `V` Cursor/Select (default), `N` +Node, `E` +Edge, `G` Group Assign, `H` Hand/Pan, `R` Readability pass, `F` Fix Topology wizard, `Z`/`X` zoom in/out, `0` Fit.

* **Right panels** use tabs; one open at a time (resizable width, min 300 px).

---

## 6) Canvas & selection model

### 6.1 Selection

* **Single click** selects node/edge; shows **handles** (for edges: mid label handle; for nodes: connector handle + resize grips if fixed size).
* **Shift-click** toggles selection; **Shift-drag** draws lasso rectangle.
* **Ctrl/Cmd-A** selects all visible elements.

### 6.2 Creation flows

* **Create node**:

  * Tool `+Node` active → **click** to place → inline label editor focused.
  * Or **double-click** empty space in Select tool.
* **Create edge**:

  * Hover source node → **connector handle** appears (circle at 3 o’clock and 9 o’clock).
  * Click-drag to target node (or empty space to create target node) → edge created → inline label editor opens.
  * If **duplicate A→B** exists under profile rules, instead of adding, **focus existing edge label**.

### 6.3 Move & Pin

* Drag node → it becomes **pinned** (`pinned=true`), unless disabled in Settings.
* **Alt-drag** temporarily ignores pin (nudging a pinned node).
* Pins shown as small anchored glyph (toggle via Inspector).

### 6.4 Delete

* `Delete` key removes selection. If removing a node would violate profile (e.g., isolate a component), show **warning** with “Proceed”/“Cancel”.

### 6.5 Hover card (mini inspector)

* On hover, a small card shows **Type**, **Label**, **Groups**, **Color swatch**, **Routing** (for edges).
* Click **Quick Edit** to open inline inputs (label, color, routing, group).

**Acceptance:** All core verbs are doable with mouse only; keyboard parity for selection/edit/delete; touch parity via radial menu (see §11).

---

## 7) Inline label editing (nodes & edges)

* **Single click** selected label or **Enter** to edit; editor is a rounded input/textarea overlay with:

  * **Monospace measuring** disabled (use same font as label).
  * **Shift+Enter** inserts newline; **Esc** cancels; **Enter** saves.
  * **Character count** (optional) warns when > 80 characters (lint).
  * **Autocomplete palette** (optional future) for common linking phrases.

* Edge labels are **horizontal by default**; editor sits **centered** over the current label box placement.

* **Label box properties** (Inspector):

  * Wrap width (40–600), padding, halo, background (on/color/opacity), placement policy (midpoint/near-source/near-target/absolute `t`), offsets, leader on/length, overlap policy (`clip|fade-under|none`), visibility (`always|hover|zoom-threshold`).

**Acceptance:** Editing never rotates text; on commit, Renderer preserves horizontal orientation; undo reverts label and placement.

---

## 8) Layout panel (Intent-first UI)

**Panel controls** (left→right reading order):

* **Structure**: `Force | Hierarchy | Concentric | Grid | Preset`

* **Spread** (0–100) — slider

* **Link length** (0–100) — slider

* **Avoid overlap** — toggle

* **Level spacing** (only for Hierarchy/Concentric) — slider (10–400)

* **Edge routing**: `Curved | Straight | Orthogonal`

* **Stability** (0–100) — slider (higher = stickier to current positions)

* **Disconnected**: `Keep close | Separate`

* **Constraints**:

  * Pins: button `Pin selection` / `Unpin selection`
  * Ranks: `Same level`, `Above`, `Below` (choose A and B from selection with guidance)
  * Edge hints for selection: `short|medium|long`

* **Run Layout** button (always available)

* **Improve Readability** button (runs LabelPass only)

* **Stats** (collapsed): node label overlaps, edge label overlaps, long edge count (after last run)

**Acceptance:** Changing any control applies layout as a **command**; positions saved; Preset uses saved positions.

---

## 9) Style panel (Customization & color)

### 9.1 Color picker

* Must support **HEX/RGB/HSL/OKLCH**; shows **contrast rating** vs label color or background; warns if WCAG AA for text not met.
* Provide **swatches**: Theme palette + Recent + Group colors.

### 9.2 Node style

* **Shape**: `rect | roundrect | pill | ellipse | diamond | hex`
* **Size**: `auto` to label, or `fixed` (W×H inputs)
* **Fill/border**: color inputs (with alpha), border width
* **Label**: font family, size, weight (300–700), halo width/color, optional background box (rounded)
* **Icon/badge** slots (reserved future; stub UI hidden by default)

### 9.3 Edge style

* **Routing**: `curved | straight | orthogonal`
* **Width** & **dash**: `solid | dashed | dotted`
* **Arrowhead**: `none | triangle | vee`
* **Multi-edge separation**: slider distance (visual spacing)
* **Label box**: see §7 properties (mirrored here)

**Acceptance:** Style changes apply to current selection; Group style changes cascade to all members instantly; contrast lint appears contextually.

---

## 10) Groups panel

* **List** groups with color chip and styleRef; **+ New Group** (name required).
* **Assign**: button applies selected group(s) to current selection.
* **Rule-based** membership (advanced): define `label-regex` or **selector** (MapScript-like) — optional.
* **Pack/Alignment** (basic): toggle “Keep members closer” (adds soft force in Layout).
* **Edit styles**: opens same controls as Style panel but applied at **group level**.

**Acceptance:** Removing a group reverts member elements to Theme defaults; conflicts resolve by cascade (Theme < Group < Element).

---

## 11) Topology panel (Profiles, Problems, Fix)

* **Profile chip** (top bar mirrors).

* **Status badge**: `All good` | `Warnings` | `Errors` (colors).

* **Metrics**: WCCs, SCCs, parallel edges, reciprocals, self-loops, orphans, crossings, degree stats, edge length distribution.

* **Violations list** (grouped by rule):

  * Row: Severity icon, summary, `Select`, `Fix…` (if available).
  * Clicking row focuses offenders, dims others; repeated clicks cycle offenders.

* **Fix All** applies all available quick-fix plans as a **single transaction** (diff preview modal first).

* **Overlays**:

  * Components: color-coded hulls;
  * Cycles: numbered paths;
  * Parallel edges: stacked indicators.

**Acceptance:** Live enforcement blocks self-loops and duplicate A→B under strict profiles; trying to add duplicate focuses existing label editor.

---

## 12) Inspector panel (properties & quick edits)

Shows a property grid for the **current selection** (single selection → all fields; multi-selection → common fields + “apply to all”).

* **Common:** id (read-only), slug (editable), notes (textarea), groups (+/–)
* **Node-specific:** label, shape, size mode, pinned toggle, position (x,y with “snap to int” option)
* **Edge-specific:** from/to (read-only with “Swap” button), label, routing, separation, arrowhead, label box properties

**Hover card** is a compact subset (read-only + quick edit toggle).

**Acceptance:** Edits are instant; invalid values are prevented or show inline errors.

---

## 13) I/O panel (Export & Import)

* **Export**:

  * Presets: `Skeleton | Styled | Full`
  * **Advanced** toggle: checkboxes for nodes/edges/groups/theme/layout as per `DATA-SCHEMA.md` granularity
  * PNG export: scale (1–3), margins, background (transparent toggle)

* **Import**:

  * Text dropzone or file picker
  * **Policy**: `Replace | ID-merge | Semantic assist`
  * **Dry-run** shows: Schema errors (line/col), Topology Problems, **Diff preview** (adds/updates/removes counts)
  * **Apply** button → single command batch (undoable)

**Acceptance:** Invalid JSON never mutates current doc; Diff preview clearly lists changes by category.

---

## 14) MapScript editor (in-editor console)

* **Docked panel** (toggle with `` ` ``) using Monaco: syntax highlight, diagnostics gutter.
* Buttons: `Dry-run` (shows Problems + Diff), `Apply` (single batch), `Examples`.
* **Selectors** assist (tooltip docs).
* **Errors** show line/column; clicking jumps caret.

**Acceptance:** Running a script that adds nodes/edges & restyles a group updates canvas after Apply; Undo reverts in one step.

---

## 15) Readability & routing specifics

* **Hard rule:** **Node & edge labels render horizontal by default** (0°).
* **Orthogonal routing:** Labels prefer **longest horizontal segment**; if none sufficient, place adjacent with **leader**; **edge under label** gets **clip** (default) or **fade-under** per element.
* **Curved/Straight:** Default placement near midpoint with ±offsets to avoid overlaps.
* **Never** draw label beneath any stroke (z-order & overlay mask).
* **Multi-edge separation:** automatic parallel offsets with staggered labels.

**Control surface:** `Improve Readability` button (runs LabelPass only). Show **overlap counters** pre/post.

---

## 16) Touch UX (phone/tablet parity)

* **Pan/zoom**: two-finger pinch/drag; **double-tap** to zoom in.
* **Long-press radial menu** on node/edge: `Connect | Rename | Color | Delete`
* **Connector drag**: touch-drag from handle to target; dropping on empty space creates new node.
* **Label editing**: tap to focus; software keyboard safe area respected.
* **No hidden modifier reliance** (Shift/Ctrl alternatives are visible in radial menu).

**Acceptance:** All verbs achievable on touch without a hardware keyboard.

---

## 17) Keyboard shortcuts (desktop)

| Action              | Shortcut                    |
| ------------------- | --------------------------- |
| Select tool         | `V`                         |
| Add node            | `N`                         |
| Add edge            | `E`                         |
| Hand/Pan            | `H`                         |
| Group assign        | `G`                         |
| Improve readability | `R`                         |
| Fix topology        | `F`                         |
| Zoom in/out         | `Z` / `X`                   |
| Fit to view         | `0`                         |
| Edit label          | `Enter`                     |
| Cancel edit         | `Esc`                       |
| Delete selection    | `Delete`                    |
| Select all          | `Ctrl/Cmd+A`                |
| Undo / Redo         | `Ctrl/Cmd+Z` / `Ctrl/Cmd+Y` |

**Acceptance:** Tooltips show shortcuts; disabled states reflect availability.

---

## 18) Status, errors, and notifications

* **Status bar** (top): Save state; profile status chip.
* **Toasts** (non-blocking): successes, minor warnings.
* **Blocking modals**: Delete confirmation; Import diff preview; Fix-All preview.
* **Problems drawer** (bottom) shows validation/lint messages with **Select** focus action.

**Copy style:** Short, actionable, concrete (“2 edges merge into 1 labeled ‘A; B’ — Undo anytime.”)

---

## 19) Accessibility

* **WCAG AA** for UI; automatic **contrast lint** for canvas elements.
* **Focus order** logical (top bar → toolbar → canvas → panels).
* **Labels** always horizontal; **halos** by default; minimum font size enforced (edge 10px, node 12px).
* **ARIA**: announce selection changes and error counts.
* **Keyboard** parity (see §17).

---

## 20) Performance cues

* Layout pass > 120ms → show **progress bar** (top of canvas).
* Readability pass > 120ms → same bar.
* Autosave indicated non-blockingly; large exports show spinner in I/O panel.

---

## 21) Default settings (initial UX)

* Profile: **ConceptStrict**
* Structure: **Force**, Spread 50, Link 50, Avoid overlap **on**, Stability 50
* Edge routing: **Curved**
* Label box: wrap 160 px; background on (opacity .85); halo 2 px; overlap policy **clip**
* Autosave: **on**, debounce 1.5 s, keep last **10** versions
* Color palette: theme default, contrast lint enabled
* Live enforcement: **block** self-loops and duplicate A→B; **warn** on component splits; **warn** cycles (strict)/**error** (DAG)

---

## 22) Microcopy (canonical strings)

* **Profile chip:** `Concept Map — Strict` / `Concept Map — Lax` / `Causal DAG` / `Mind-map (Tree)` / `General Graph`
* **Problems titles:** `Duplicate edge`, `Self-loop`, `Disconnected component`, `Cycle detected`, `Orphan node`
* **Fix-All CTA:** `Preview & Apply Fixes`
* **Readability CTA:** `Improve Readability` (tooltip: *Resolve label overlaps and long edges*)
* **Import policy:** `Replace`, `Merge by ID`, `Semantic assist`
* **Diff counts:** `+12 added • 8 updated • 0 removed`

---

## 23) Empty states & examples

* **Editor (no nodes)**: central CTA `Double-click to add a node or press N`.
* **Topology clean**: green chip `All good` with `View metrics`.
* **No groups**: CTA `Create a group to batch-style your elements`.

---

## 24) Print & export fidelity

* **Print theme**: white background; black text; thicker strokes; halos preserved.
* **PNG** exactly matches canvas (routing, labels, halos, clip/fade).
* **Scale** input 1–3; **Margins** px; **Transparent** toggle (when off, use canvas background or theme paper color).

---

## 25) Guardrails (UX invariants)

1. **Labels never rotate** unless user sets `follow-edge`.
2. **Labels never hide under strokes** (clip/fade/raise).
3. **Every change is undoable** (import/repairs apply as a single transaction).
4. **No mutation on failed parse/validate**.
5. **Live enforcement** prevents most profile-breaking actions at source.
6. **Keyboard & touch parity** for all core verbs.

---

## 26) QA checklist (UI-focused acceptance)

* Create 30 labeled edges in < 3 minutes using handles and inline editors.
* Switch to Orthogonal; verify labels remain horizontal on horizontal segments or use leaders when necessary.
* Import malformed JSON → Problems with line/col; canvas unchanged.
* Topology Fix-All reduces violations to 0 under ConceptStrict (on test fixture).
* Readability pass reduces **label overlap count** by ≥ 60% on dense fixture.
* Contrast lint fires when choosing poor color; warning disappears after correction.
* Autosave + crash → Library shows latest version; open & continue without data loss.
* Touch: long-press radial menu exposes all verbs; edge creation works with connector handle.

---

**This guide is binding for the Pages build.** If a design shortcut would break readability, topology correctness, robust imports, customization, undo/redo, or offline durability, it is **not acceptable**.
