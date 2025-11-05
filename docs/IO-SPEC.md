# IO-SPEC.md — Imports, Exports, Diffing & Error Handling

**Status:** Draft v1 (living)
**Owner:** Levi (Tech Lead)
**Last updated:** 2025-11-04 (America/São_Paulo)
**Scope:** GitHub Pages (browser-only, offline), Electron-ready
**Contract:** All I/O (JSON/ZIP/PNG/Markdown/OPML) MUST obey this spec. Imports NEVER mutate the open document until the user confirms an apply. All applies are single, undoable transactions.

---

## 0) File types, extensions & MIME

| Kind                         | Extension        | MIME               | Notes                                                                                  |
| ---------------------------- | ---------------- | ------------------ | -------------------------------------------------------------------------------------- |
| **Graph export (envelope)**  | `.netmap.json`   | `application/json` | Contains a pruned/complete `GraphDocument v1` plus options (see §2).                   |
| **Graph bundle (multi-map)** | `.netmap.zip`    | `application/zip`  | ZIP with `maps/*.netmap.json`, optional `themes/*.nettheme.json`, and `manifest.json`. |
| **Theme**                    | `.nettheme.json` | `application/json` | A `ThemeDoc v1` (see DATA-SCHEMA).                                                     |
| **PNG snapshot**             | `.png`           | `image/png`        | Raster of current canvas; exact visual match.                                          |
| **Markdown outline**         | `.md`            | `text/markdown`    | Linearized outline; see §7.                                                            |
| **OPML**                     | `.opml`          | `text/xml`         | Tree outline when possible; see §7.                                                    |

**Security:** We treat input as pure data. No scripts, no URLs are executed. On Pages, **no network calls** during import/export.

---

## 1) Import surfaces (UI & programmatic)

### 1.1 Where users import

* **Library page**: “Import JSON/ZIP” buttons (adds new map(s) to local library).
* **Editor → I/O panel**: Import into current map with policy selection (Replace / Merge by ID / Semantic assist).

### 1.2 Accepted inputs

* Drag-and-drop file(s) onto page or choose via file picker.
* Paste into **MapScript** console is NOT I/O; it’s a scripting path (see MAPSCRIPT.md).

---

## 2) Export Envelope (authoritative JSON)

This is the ONLY on-disk JSON format we produce/consume. (Internal `GraphDocument` is embedded.)

```json
{
  "packageVersion": 1,
  "kind": "GraphExport",
  "exportedAt": "2025-11-04T20:00:00.000Z",
  "granularity": {
    "nodes": { "ids": true, "labels": true, "positions": false, "styles": false, "groups": true, "notes": true },
    "edges": { "ids": true, "endpoints": true, "labels": true, "routing": false, "styles": false },
    "groups": { "defs": true, "membership": true },
    "theme": false,
    "layout": { "intent": false, "constraints": false, "pins": false }
  },
  "options": {
    "removeMissingOnMerge": false,
    "normalizeColors": true,
    "pretty": true
  },
  "document": { /* GraphDocument v1, possibly pruned per granularity */ },
  "theme": { /* ThemeDoc v1 if granularity.theme=true; else omitted */ },
  "hash": "sha256:8c9d...e1"  /* hash of canonicalized 'document' field only */
}
```

* `granularity` controls pruning (see DATA-SCHEMA §4).
* `hash` is deterministic over **canonical JSON** (see §6.3).

**Granularity presets (UI shortcuts):**

* **Skeleton** → minimal structure only.
* **Styled** → structure + styles (no positions).
* **Full** → everything (positions, layoutIntent, constraints, theme).

---

## 3) Import Policies (Editor)

When importing into an open map:

1. **Replace**

   * Close current doc; load incoming `document` wholesale (new ID space).
   * Versions: current doc saved in history; new doc becomes active.
   * **Validation** must succeed before activation.

2. **Merge by ID**

   * For each incoming node/edge/group ID:

     * If it **exists** → **update** the listed fields (others unchanged).
     * If it **doesn’t** → **add**.
   * If `options.removeMissingOnMerge = true` in envelope or user toggled “Remove missing” → any existing element not present in import is **deleted**.
   * Document-level fields update:

     * `meta`: `title` updates if provided; `profile` updates if provided; timestamps overwritten by runtime.
     * `constraints`, `layoutIntent`: deep-merge; scalar values overwrite; absent keys preserved.
     * `themeId`: overwrite if provided and present in library (or include theme payload).
   * **No mutation** takes effect until **Diff Preview** is confirmed.

3. **Semantic assist**

   * Applies **Merge by ID**, **but** before the diff is finalized we attempt to match **missing IDs**:

     * **By slug** (`slug` string match).
     * **By signature**: `(normalized label, degree signature)`; degree signature = `(in,out)` if endpoints are resolvable.
     * **By alias map** stored in local library from previous user confirmations.
   * UI presents candidate matches for user approval; accepted matches extend the alias map and are reused later.

**Hard blocks:** If profile-effective severity is `error` for any violation introduced by import (e.g., self-loops in Strict), Apply is **disabled** until “Fix plan” is selected (see TOPOLOGY-RULES).

---

## 4) Validation Pipeline (import path)

```
Raw bytes / text
  └─ JSON parse (UTF-8) → on failure → ParseError
      └─ JSON Schema validate (GraphExport envelope v1)
          └─ JSON Schema validate (GraphDocument v1, if present)
              └─ Normalize (colors → HEX; strings trimmed; positions rounded to .01)
                  └─ Topology checks (profiles; TOPOLOGY-RULES)
                      └─ Readability lints (non-blocking)
                          └─ Diff build (vs current doc if merging)
                              └─ Diff Preview UI
                                  └─ Apply (single transaction) OR Cancel (no mutation)
```

### 4.1 Parse Errors (blocking)

* **Error object (UI & console):**

  ```json
  {
    "type": "ParseError",
    "message": "Unexpected token } in JSON at position 312",
    "offset": 312,
    "line": 12,
    "column": 9,
    "snippet": "...\"to\":\"n2\"}}\n}\n   ^\n"
  }
  ```

### 4.2 Schema Errors (blocking)

* Envelope or document violations (we use `$id` from DATA-SCHEMA).
* Each error reported with **JSON Pointer** to offending path:

  ```json
  {
    "type": "SchemaError",
    "message": "additionalProperties not allowed",
    "pointer": "/document/nodes/n1/unknownKey",
    "path": ["document","nodes","n1","unknownKey"]
  }
  ```

### 4.3 Topology Problems

* Constructed as **Problems** per TOPOLOGY-RULES; severities applied.
* Import UI shows counts and provides **Fix plans** (F2/F3/F4/…); user may:

  * **Apply fixes** then apply import, **or**
  * **Apply import** if no **error** severity remains (warnings okay), **or**
  * **Cancel**.

---

## 5) Diff model (what we show & apply)

### 5.1 Diff structure (programmatic)

```ts
type Diff =
 | { kind: "replace"; beforeHash: string | null; afterHash: string }
 | {
     kind: "patch";
     adds:   { nodes: ID[]; edges: ID[]; groups: ID[] };
     updates:{ nodes: ID[]; edges: ID[]; groups: ID[]; document: string[] /* keys */ };
     removes:{ nodes: ID[]; edges: ID[]; groups: ID[] };
     detail: {
       nodes: Record<ID, { before?: NodeDoc; after?: NodeDoc }>;
       edges: Record<ID, { before?: EdgeDoc; after?: EdgeDoc }>;
       groups: Record<ID, { before?: GroupDoc; after?: GroupDoc }>;
       document: { before: Partial<GraphDocument>; after: Partial<GraphDocument> };
     }
   }
```

* **Replace** is used for “Replace” policy.
* **Patch** lists IDs and provides **before/after** snapshots (pruned to changed fields).

### 5.2 Diff Preview (UI)

* Header: `+12 added • ~8 updated • –0 removed`
* Tabs: **Summary** | **Nodes** | **Edges** | **Groups** | **Document**
* In **Nodes/Edges**, clicking an item highlights it; for updates, show property diff (left vs right).
* “Apply” commits as a single undoable command; “Cancel” closes with no mutation.

---

## 6) Serialization rules & normalization

### 6.1 Canonical JSON (for hashing & diffs)

* **Sorted keys** alphabetically at each object level.
* No whitespace beyond minimal (`JSON.stringify(value)` with stable key order).
* Floats rounded to **2 decimal places** for positions in serialization.
* Colors normalized to **uppercase HEX** (`#RRGGBB`). Accept input as CSS color names/HSL/RGB/OKLCH; exporter writes HEX.

### 6.2 Label normalization

* Trim leading/trailing spaces; preserve inner whitespace and newlines.
* Replace newline `\r\n` → `\n`.

### 6.3 Hash

* `hash = "sha256:" + hex(SHA-256(canonical(document)))`.
* Used for integrity in bundles and for versioning (LOCAL-STORAGE).

---

## 7) Textual exports (Markdown & OPML)

Concept maps are not trees, but users want outlines. We implement **best-effort** linearizations.

### 7.1 Markdown (`.md`)

* Header = document title.
* Optional **Profile** line.
* Approximate **root** as node with highest `(out-degree - in-degree)` or user-selected root if set.
* Perform a DFS spanning tree from the root; for non-tree edges, append “See also: …” lines.

**Format:**

```md
# {title}

- {Node A}
  - {link label}: {Node B}
    - ...
- {Node C}
  - See also: {Node A} ({edge label})
```

* Node repeats are avoided where possible; if a cycle would repeat, insert “(revisited)”.

### 7.2 OPML (`.opml`)

* Only offered if **MindTree** profile OR user confirms a **root** and we can produce a **spanning arborescence** (no in-degree>1).
* Nodes become `<outline text="...">`; edge labels appended as `— {edge label}` in the child’s text or stored as `_edge` attribute.

**Limitations disclosed**: if graph is not a tree, we show a modal explaining which nodes violate in-degree 1; offer to **generate a tree projection** by choosing parents.

---

## 8) PNG export

* **Exact canvas render** including halos, label boxes, masking (clip/fade-under), and routing.

* Options:

  * **Scale**: 1–3 (defaults to 2 for crisp text on slides).
  * **Margin**: 0–200 px (default 24).
  * **Background**: `transparent | theme.paper`.
  * **Crop**: to tight bbox of visible elements + margin.

* **HiDPI** handled by scale factor; text drawn in device pixels to avoid blur.

* **Deterministic** for the same doc, layout, and zoom (we export from a **fit-to-content** off-screen buffer).

---

## 9) ZIP bundle format

```
/
  manifest.json
  maps/
    <mapId>.netmap.json
    <mapId2>.netmap.json
  themes/
    <themeId>.nettheme.json
```

### 9.1 Manifest

```json
{
  "bundleVersion": 1,
  "exportedAt": "2025-11-04T20:05:00.000Z",
  "maps": [
    { "id": "cardio-01", "title": "Cardio", "hash": "sha256:...", "file": "maps/cardio-01.netmap.json" }
  ],
  "themes": [
    { "id": "theme-default", "label": "Default", "file": "themes/theme-default.nettheme.json" }
  ]
}
```

* On import, we read manifest first; then validate each file.
* Maps referencing `themeId` must have that theme either bundled or already present in local library; else we prompt to map themes.

---

## 10) Error & warning taxonomy (UI + programmatic)

```ts
type IOIssue =
 | { kind: "ParseError"; message: string; line?: number; column?: number; offset?: number; snippet?: string }
 | { kind: "SchemaError"; message: string; pointer: string; path: string[] }
 | { kind: "TopologyError"; ruleId: ProblemID; message: string; elementIds: string[] }
 | { kind: "Warning"; code: "ColorNormalized" | "TruncatedLabel" | "UnsupportedFieldIgnored"; pointer?: string }
 | { kind: "BundleError"; code: "MissingFile" | "InvalidManifest" | "ThemeNotFound"; detail?: string };
```

* **Problems drawer** shows all issues.
* **Blocking** kinds prevent Apply: `ParseError`, `SchemaError`, `TopologyError` with **error** severity.
* Warnings are informational and kept in the import report.

---

## 11) Merge semantics (deep details)

### 11.1 Elements

* **Node/Edge/Group** merges are **field-wise overwrites** (keys present in import replace current). Missing keys **unchanged**.
* If an imported field exists but is `null` → ignored (we don’t support nulling a field; use explicit values or delete element).
* **Deletions** occur only if `removeMissingOnMerge = true`.

### 11.2 Document-level

* `constraints`: object-wise merge; `pins` merges per-node (coordinates overwrite).
* `layoutIntent`: scalar overwrite where provided.
* `themeId`: if new themeId not found, we keep the old themeId and warn.

### 11.3 Groups & membership

* If a group ID exists: its `label/styleRef/rule` overwrite if provided.
* **Membership** is stored on nodes (`groupIds`). Import updates node membership per node’s `groupIds`.
* If `removeMissingOnMerge = true`, groups not referenced by any node and with no style effect may be pruned (prompt).

---

## 12) Interactive repair on import

* The **Fix plans** listed in TOPOLOGY-RULES can be applied **before** the import apply (to the **incoming** doc), after which the diff recomputes.
* We always compute fixes on a **copy**; current canvas remains unchanged until Apply.

---

## 13) Programmatic API (internal)

```ts
// Parse + validate an Envelope (no mutation)
function parseEnvelope(bytes: Uint8Array | string): {
  ok: true; envelope: GraphExportEnvelope; issues: IOIssue[];
} | {
  ok: false; issues: IOIssue[]; // Parse/Schema failures only
};

// Build diff vs current doc given policy (no mutation)
function buildDiff(current: GraphDocument, incoming: GraphDocument, policy: "replace"|"merge"|"assist", opts: { removeMissing?: boolean }): Diff;

// Apply diff (UNDOABLE)
function applyDiff(diff: Diff): void;

// Export envelope (possibly pruned)
function exportEnvelope(doc: GraphDocument, theme?: ThemeDoc, granularity: Granularity, opts?: { pretty?: boolean; normalizeColors?: boolean }): { envelope: any; bytes: Uint8Array };
```

---

## 14) Performance expectations

* **Parse + schema validate** (100-node Full): < 20 ms.
* **Topology checks**: < 10 ms incremental; < 25 ms full.
* **Diff build** (100 nodes, 150 edges): < 10 ms.
* **Export (Full)**: < 15 ms; **ZIP** (single map): < 25 ms.

All on a mid laptop in Chromium.

---

## 15) UX acceptance criteria (I/O)

* Importing malformed JSON shows **line+column** and never mutates the canvas.
* Importing a file that would create duplicate A→B in **ConceptStrict** blocks Apply and offers **Merge edges**.
* Merge by ID updates only the fields present; untouched fields remain intact.
* “Remove missing” deletes only elements absent from import and lists them in the Diff Preview.
* Export **Styled** omits positions; re-importing it preserves current positions (no jitter).
* PNG export matches canvas exactly (routing, halos, masks).
* ZIP bundle with manifest missing a referenced theme prompts to map to an existing theme or import the theme file.

---

## 16) Examples

### 16.1 Minimal Skeleton export

```json
{
  "packageVersion": 1,
  "kind": "GraphExport",
  "exportedAt": "2025-11-04T20:10:00.000Z",
  "granularity": {
    "nodes": { "ids": true, "labels": true, "positions": false, "styles": false, "groups": true, "notes": true },
    "edges": { "ids": true, "endpoints": true, "labels": true, "routing": false, "styles": false },
    "groups": { "defs": true, "membership": true },
    "theme": false,
    "layout": { "intent": false, "constraints": false, "pins": false }
  },
  "options": { "pretty": true, "normalizeColors": true },
  "document": {
    "version": 1,
    "meta": { "title": "Minimal", "created": "2025-11-04T20:09:00.000Z", "modified": "2025-11-04T20:09:00.000Z", "profile": "ConceptStrict" },
    "nodes": { "n1": { "id": "n1", "label": "A" }, "n2": { "id": "n2", "label": "B" } },
    "edges": { "e1": { "id": "e1", "from": "n1", "to": "n2", "label": "relates to" } },
    "groups": {},
    "constraints": { "pins": {}, "ranks": [], "edgeHints": {} },
    "layoutIntent": { "structure": "force", "spread": 50, "linkLength": 50, "avoidOverlap": true, "edgeRouting": "curved", "stability": 50, "disconnected": "separate", "levelSpacing": 80 }
  },
  "hash": "sha256:3b6e..."
}
```

### 16.2 Diff snippet (updates only)

```json
{
  "kind": "patch",
  "adds": { "nodes": [], "edges": [], "groups": [] },
  "updates": { "nodes": ["n2"], "edges": ["e1"], "groups": [], "document": ["meta.title"] },
  "removes": { "nodes": [], "edges": [], "groups": [] },
  "detail": {
    "nodes": { "n2": { "before": { "id": "n2", "label": "B" }, "after": { "id": "n2", "label": "Stroke Volume" } } },
    "edges": { "e1": { "before": { "id": "e1", "from": "n1", "to": "n2", "label": "relates to" }, "after": { "id": "e1", "from": "n1", "to": "n2", "label": "increases" } } },
    "groups": {},
    "document": { "before": { "meta": { "title": "Minimal" } }, "after": { "meta": { "title": "Cardio" } } }
  }
}
```

---

## 17) Edge cases & guardrails

* **Unknown keys**: rejected by schema (blocking).
* **Label too long**: allowed; readability lint warns; export preserves raw text.
* **Unsupported colors**: normalized to nearest representable HEX; original value not persisted.
* **Dangling edges**: blocking schema/topology error on import.
* **Import with rotated labels**: if an edge sets `labelStyle.orientation="follow-edge"`, allowed but a **Warning** appears (“May hurt readability”).
* **Bundle with duplicate map IDs**: second is ignored and a **BundleError** listed.

---

## 18) Implementation checklist

* [ ] Envelope schema validator (envelope + document).
* [ ] Canonicalizer (sorted keys, HEX colors, number rounding).
* [ ] Hashing (SHA-256) over canonical doc.
* [ ] Policy engine (Replace/Merge/Assist).
* [ ] Diff builder & Preview UI.
* [ ] Topology gate integration (block on error).
* [ ] PNG rasterizer with scale/margins/bg.
* [ ] ZIP reader/writer with manifest.
* [ ] Markdown & OPML exporters with tree projection helper.
* [ ] IOIssue rendering (Problems drawer + modals).
* [ ] All apply paths are single undo commands.

---

**This spec is binding.** Any import that mutates state before user confirmation, any export that deviates from canonicalization (breaking diffs), or any failure to gate on topology **error** severities is **not acceptable**.
