# DATA-SCHEMA.md — Canonical Formats (v1)

**Status:** Draft v1 (living)
**Owner:** Levi (Product / Tech Lead)
**Last updated:** 2025-11-04 (America/São_Paulo)
**Applies to:** GitHub Pages build (browser-only); Electron-ready
**Contract:** All import/export, validation, MapScript, layout, and rendering conform to this spec. `additionalProperties: false` where declared means **reject unknown keys** at parse/validate time (never mutate current doc on failure).

---

## 0) Versioning & identity

* **Document version**: `GraphDocument.version = 1`. Increments on backward-incompatible schema changes.
* **Opaque IDs** (`ID`): globally unique per document; case-sensitive; format: `^[A-Za-z0-9_-]{6,64}$` (ULID/UUID acceptable, not enforced).
* **Slugs** (`Slug`): optional, human-friendly selectors; format: `^[a-z0-9]+(-[a-z0-9]+)*$`. Non-unique; never identity.
* **Identity invariant**: Node/Edge identity is the **ID** only—not label or topology.
* **Time**: ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`) for `created`, `modified`.

---

## 1) High-level JSON structure

A **Graph Document** is a single JSON object:

```json
{
  "version": 1,
  "meta": { "title": "My Map", "created": "2025-11-04T19:36:00.000Z", "modified": "2025-11-04T19:36:00.000Z", "profile": "ConceptStrict" },
  "nodes": { "n01": { /* NodeDoc */ }, "n02": { /* NodeDoc */ } },
  "edges": { "e01": { /* EdgeDoc */ }, "e02": { /* EdgeDoc */ } },
  "groups": { "g01": { /* GroupDoc */ } },
  "constraints": { /* ConstraintSet */ },
  "layoutIntent": { /* LayoutIntent */ },
  "themeId": "theme-default"  /* optional; refers to a ThemeDoc stored locally */
}
```

---

## 2) JSON Schema (Draft 2020-12) — authoritative

> The schema below is **normative**. Parsers **must** validate against it. Omitted defaults are applied by runtime; exporters **should** include only set fields.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/graph-doc.schema.json",
  "title": "GraphDocument v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["version", "meta", "nodes", "edges", "groups", "constraints", "layoutIntent"],
  "properties": {
    "version": { "const": 1 },
    "meta": {
      "type": "object",
      "additionalProperties": false,
      "required": ["title", "created", "modified", "profile"],
      "properties": {
        "title": { "type": "string", "minLength": 1 },
        "created": { "type": "string", "format": "date-time" },
        "modified": { "type": "string", "format": "date-time" },
        "profile": { "type": "string", "enum": ["ConceptStrict","ConceptLax","CausalDAG","MindTree","General"] },
        "profileOverrides": {
          "type": "object",
          "description": "Optional per-doc rule severity overrides",
          "additionalProperties": { "type": "string", "enum": ["error","warning","info","off"] }
        }
      }
    },
    "nodes": {
      "type": "object",
      "additionalProperties": { "$ref": "#/$defs/NodeDoc" }
    },
    "edges": {
      "type": "object",
      "additionalProperties": { "$ref": "#/$defs/EdgeDoc" }
    },
    "groups": {
      "type": "object",
      "additionalProperties": { "$ref": "#/$defs/GroupDoc" }
    },
    "constraints": { "$ref": "#/$defs/ConstraintSet" },
    "layoutIntent": { "$ref": "#/$defs/LayoutIntent" },
    "themeId": { "$ref": "#/$defs/ID" }
  },
  "$defs": {
    "ID": { "type": "string", "pattern": "^[A-Za-z0-9_-]{6,64}$" },
    "Slug": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
    "LabelStyle": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "orientation": { "type": "string", "enum": ["horizontal", "follow-edge"], "default": "horizontal" },
        "wrapWidth": { "type": "number", "minimum": 40, "maximum": 600, "default": 140 },
        "padding": { "type": "number", "minimum": 0, "maximum": 32, "default": 4 },
        "fontFamily": { "type": "string" },
        "fontSize": { "type": "number", "minimum": 8, "maximum": 64 },
        "fontWeight": { "type": "integer", "enum": [300,400,500,600,700], "default": 400 },
        "haloWidth": { "type": "number", "minimum": 0, "maximum": 8, "default": 2 },
        "haloColor": { "type": "string" },
        "background": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "on": { "type": "boolean", "default": true },
            "color": { "type": "string" },
            "opacity": { "type": "number", "minimum": 0, "maximum": 1, "default": 0.85 },
            "radius": { "type": "number", "minimum": 0, "maximum": 16, "default": 3 }
          }
        },
        "placement": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "policy": { "type": "string", "enum": ["midpoint","near-source","near-target","absolute"], "default": "midpoint" },
            "t": { "type": "number", "minimum": 0, "maximum": 1 },
            "offsetX": { "type": "number" },
            "offsetY": { "type": "number" },
            "leader": { "type": "object", "additionalProperties": false, "properties": { "on": { "type": "boolean", "default": false }, "length": { "type": "number", "minimum": 0, "maximum": 64, "default": 8 } } }
          }
        },
        "edgeOverlapPolicy": { "type": "string", "enum": ["none","clip","fade-under"], "default": "clip" },
        "visibilityPolicy": { "type": "string", "enum": ["always","hover","zoom-threshold"], "default": "always" }
      }
    },
    "NodeDoc": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "label"],
      "properties": {
        "id": { "$ref": "#/$defs/ID" },
        "slug": { "$ref": "#/$defs/Slug" },
        "label": { "type": "string" },
        "color": { "type": "string" },
        "shape": { "type": "string", "enum": ["rect","roundrect","pill","ellipse","diamond","hex"], "default": "roundrect" },
        "size": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "mode": { "type": "string", "enum": ["auto","fixed"], "default": "auto" },
            "w": { "type": "number", "minimum": 8, "maximum": 1000 },
            "h": { "type": "number", "minimum": 8, "maximum": 1000 }
          }
        },
        "position": { "type": "object", "additionalProperties": false, "properties": { "x": { "type": "number" }, "y": { "type": "number" } } },
        "positionSource": { "type": "string", "enum": ["user","layout","import","unknown"], "default": "unknown" },
        "pinned": { "type": "boolean", "default": false },
        "groupIds": { "type": "array", "items": { "$ref": "#/$defs/ID" }, "uniqueItems": true, "default": [] },
        "notes": { "type": "string" }
      }
    },
    "EdgeDoc": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "from", "to"],
      "properties": {
        "id": { "$ref": "#/$defs/ID" },
        "slug": { "$ref": "#/$defs/Slug" },
        "from": { "$ref": "#/$defs/ID" },
        "to": { "$ref": "#/$defs/ID" },
        "label": { "type": "string", "default": "" },
        "color": { "type": "string" },
        "width": { "type": "number", "minimum": 0.5, "maximum": 20, "default": 2 },
        "dash": { "type": "string", "enum": ["solid","dashed","dotted"], "default": "solid" },
        "arrow": { "type": "string", "enum": ["none","triangle","vee"], "default": "triangle" },
        "routing": { "type": "string", "enum": ["curved","straight","orthogonal"], "default": "curved" },
        "labelStyle": { "$ref": "#/$defs/LabelStyle" },
        "labelGeom": {
          "type": "object",
          "description": "Computed placement from LabelPass; exporters MAY include; importers MAY ignore.",
          "additionalProperties": false,
          "properties": {
            "t": { "type": "number", "minimum": 0, "maximum": 1 },
            "offsetX": { "type": "number" },
            "offsetY": { "type": "number" },
            "leader": { "type": "number", "minimum": 0, "maximum": 64 },
            "orientation": { "type": "string", "enum": ["horizontal","follow-edge"] }
          }
        },
        "notes": { "type": "string" }
      }
    },
    "GroupDoc": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "label"],
      "properties": {
        "id": { "$ref": "#/$defs/ID" },
        "label": { "type": "string" },
        "styleRef": { "type": "string" },
        "rule": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "kind": { "type": "string", "enum": ["label-regex","selector"] },
            "expr": { "type": "string" }
          }
        }
      }
    },
    "ConstraintSet": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "pins": {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "additionalProperties": false,
            "properties": { "x": { "type": "number" }, "y": { "type": "number" } },
            "required": ["x","y"]
          },
          "default": {}
        },
        "ranks": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "type": { "type": "string", "enum": ["same-level","above","below"] },
              "a": { "$ref": "#/$defs/ID" },
              "b": { "$ref": "#/$defs/ID" }
            },
            "required": ["type","a","b"]
          },
          "default": []
        },
        "edgeHints": {
          "type": "object",
          "additionalProperties": { "type": "string", "enum": ["short","medium","long"] },
          "default": {}
        }
      }
    },
    "LayoutIntent": {
      "type": "object",
      "additionalProperties": false,
      "required": ["structure","spread","linkLength","avoidOverlap","edgeRouting","stability","disconnected"],
      "properties": {
        "structure": { "type": "string", "enum": ["force","hierarchy","concentric","grid","preset"] },
        "spread": { "type": "number", "minimum": 0, "maximum": 100, "default": 50 },
        "linkLength": { "type": "number", "minimum": 0, "maximum": 100, "default": 50 },
        "avoidOverlap": { "type": "boolean", "default": true },
        "levelSpacing": { "type": "number", "minimum": 10, "maximum": 400, "default": 80 },
        "edgeRouting": { "type": "string", "enum": ["curved","straight","orthogonal"], "default": "curved" },
        "stability": { "type": "number", "minimum": 0, "maximum": 100, "default": 50 },
        "disconnected": { "type": "string", "enum": ["keep-close","separate"], "default": "separate" }
      }
    }
  }
}
```

---

## 3) Theme schema (stored separately; referenced by `themeId`)

Themes define **tokens** and **presets**. A document **renders** using: Theme → Group → Element cascade.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/theme-doc.schema.json",
  "title": "ThemeDoc v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["id","label","tokens","presets"],
  "properties": {
    "id": { "type": "string" },
    "label": { "type": "string" },
    "tokens": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "palette": {
          "type": "object",
          "additionalProperties": { "type": "string" },
          "description": "Named colors (HEX or CSS color)."
        },
        "fontFamily": { "type": "string" },
        "node": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "fontSize": { "type": "number", "default": 12 },
            "haloWidth": { "type": "number", "default": 2 }
          }
        },
        "edge": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "fontSize": { "type": "number", "default": 10 },
            "haloWidth": { "type": "number", "default": 1 }
          }
        }
      }
    },
    "presets": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "nodeTypes": {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "shape": { "type": "string" },
              "fill": { "type": "string" },
              "border": { "type": "string" },
              "fontSize": { "type": "number" }
            }
          }
        },
        "edgeTypes": {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "routing": { "type": "string", "enum": ["curved","straight","orthogonal"] },
              "width": { "type": "number" },
              "dash": { "type": "string" },
              "arrow": { "type": "string" },
              "labelStyle": { "$ref": "https://example.com/graph-doc.schema.json#/$defs/LabelStyle" }
            }
          }
        }
      }
    }
  }
}
```

---

## 4) Export packages & granularity

### 4.1 Export envelope (JSON)

Exporters **should** wrap the `GraphDocument` in an envelope to carry options & theme when selected.

```json
{
  "packageVersion": 1,
  "kind": "GraphExport",
  "exportedAt": "2025-11-04T19:36:00.000Z",
  "granularity": {
    "nodes": { "ids": true, "labels": true, "positions": false, "styles": false, "groups": true, "notes": true },
    "edges": { "ids": true, "endpoints": true, "labels": true, "routing": false, "styles": false },
    "groups": { "defs": true, "membership": true },
    "theme": false,
    "layout": { "intent": false, "constraints": false, "pins": false }
  },
  "document": { /* GraphDocument v1 (possibly pruned per granularity) */ },
  "theme": { /* ThemeDoc v1, optional if granularity.theme=true */ }
}
```

**Presets** (UI convenience; all are reducible to the bitmask above):

* **Skeleton**: nodes.ids+labels, edges.ids+endpoints+labels, groups.defs+membership; no styles, no positions, no theme, no constraints.
* **Styled**: Skeleton + element styles (colors/shapes/routing/labelStyle); **no positions**.
* **Full**: everything, including positions, pins, layoutIntent, constraints, and theme.

### 4.2 ZIP bundles

For multi-map export: a ZIP with entries:

* `maps/<mapId>.json` (each as the **envelope** above),
* `themes/<themeId>.json` (if included),
* `manifest.json` with list and versions.

---

## 5) Merge semantics (import)

* **Replace**: incoming document replaces the current one entirely (new IDs).
* **ID-merge**:

  * If incoming node/edge `id` exists → **update** fields present in import (others left unchanged unless `removeMissing=true`).
  * If `id` missing in current → **add**.
  * If `removeMissing=true` → elements absent in import are **removed**.
* **Semantic assist** (IDs absent or mismatched):

  * Try match by `slug`; else by `(normalized label, degree signature)`; present candidates for user confirmation; record **alias map**.
  * Once accepted, subsequent imports can reuse the alias.

**Conflict policy**

* `id` collision with different types (node vs edge) → **error**.
* Invalid references (`edge.from` or `edge.to` not found) → **error** (repair suggestion: create missing node(s) or map by slug).
* Parallel edges created under **ConceptStrict** → allowed to import but surfaced as **error** until fixed.

---

## 6) Validation notes (schema + topology + lints)

* **Schema**: fully enforced by JSON Schema above; unknown keys rejected (`additionalProperties: false`).
* **Topology**: check **after** schema parse (WCC, SCC/cycles, parallel edges, self-loops, orphans, etc.).
* **Lints**: contrast, label length (warn if > N chars), very long edges (warn), low angular resolution (warn).
* **Compute-only fields**: `EdgeDoc.labelGeom` is **advisory** (computed). Importers **may** ignore or recompute.

---

## 7) Examples

### 7.1 Minimal valid document

```json
{
  "version": 1,
  "meta": {
    "title": "Minimal",
    "created": "2025-11-04T19:36:00.000Z",
    "modified": "2025-11-04T19:36:00.000Z",
    "profile": "ConceptStrict"
  },
  "nodes": {
    "nA1b2c3": { "id": "nA1b2c3", "label": "A" },
    "nD4e5f6": { "id": "nD4e5f6", "label": "B" }
  },
  "edges": {
    "eGh7i8j": { "id": "eGh7i8j", "from": "nA1b2c3", "to": "nD4e5f6", "label": "causes" }
  },
  "groups": {},
  "constraints": { "pins": {}, "ranks": [], "edgeHints": {} },
  "layoutIntent": { "structure": "force", "spread": 50, "linkLength": 50, "avoidOverlap": true, "edgeRouting": "curved", "stability": 50, "disconnected": "separate", "levelSpacing": 80 }
}
```

### 7.2 Styled “full” document (excerpt)

```json
{
  "version": 1,
  "meta": { "title": "Cardio", "created": "2025-11-04T19:36:00.000Z", "modified": "2025-11-04T20:10:00.000Z", "profile": "ConceptStrict" },
  "nodes": {
    "n1": { "id": "n1", "slug": "preload", "label": "Preload", "color": "#2a7", "shape": "pill", "position": {"x": 120,"y": 200}, "positionSource": "layout", "pinned": false, "groupIds": ["g-hemo"] },
    "n2": { "id": "n2", "label": "Stroke Volume", "color": "#37b", "shape": "roundrect", "position": {"x": 420,"y": 200}, "pinned": true }
  },
  "edges": {
    "e1": {
      "id": "e1", "from": "n1", "to": "n2",
      "label": "increases",
      "routing": "orthogonal", "dash": "solid", "arrow": "vee",
      "labelStyle": {
        "orientation": "horizontal",
        "wrapWidth": 160, "padding": 4,
        "background": {"on": true, "color": "#fff", "opacity": 0.85, "radius": 3},
        "edgeOverlapPolicy": "clip",
        "placement": {"policy": "midpoint", "t": 0.5, "offsetX": 0, "offsetY": 8, "leader": {"on": false}}
      },
      "labelGeom": { "t": 0.52, "offsetX": 2, "offsetY": 10, "leader": 0, "orientation": "horizontal" }
    }
  },
  "groups": {
    "g-hemo": { "id": "g-hemo", "label": "Hemodynamics", "styleRef": "group-accent" }
  },
  "constraints": {
    "pins": { "n2": {"x": 420,"y": 200} },
    "ranks": [ { "type": "same-level", "a": "n1", "b": "n2" } ],
    "edgeHints": { "e1": "short" }
  },
  "layoutIntent": { "structure": "hierarchy", "spread": 40, "linkLength": 40, "avoidOverlap": true, "levelSpacing": 120, "edgeRouting": "orthogonal", "stability": 70, "disconnected": "keep-close" },
  "themeId": "theme-default"
}
```

### 7.3 Invalid example (should fail schema)

```json
{
  "version": 1,
  "meta": { "title": "Bad", "created": "2025-11-04T19:36:00.000Z", "modified": "2025-11-04T19:36:00.000Z", "profile": "ConceptStrict" },
  "nodes": {
    "n1": { "id": "n1", "label": "A", "unknownKey": true }   // <- additionalProperties: false
  },
  "edges": {
    "e1": { "id": "e1", "from": "n1", "to": "n999", "label": "?" } // <- 'to' references missing node
  },
  "groups": {},
  "constraints": {},
  "layoutIntent": { "structure": "force", "spread": 50, "linkLength": 50, "avoidOverlap": true, "edgeRouting": "curved", "stability": 50, "disconnected": "separate", "levelSpacing": 80 }
}
```

Expected: **Schema error** on `nodes.n1.unknownKey`; **Topology error** on `edge e1.to` referencing unknown node.

---

## 8) Label & routing invariants (data-level)

* If `EdgeDoc.labelStyle.orientation` is **absent** or `"horizontal"`, render engine **must** draw label at **0°** irrespective of edge geometry; `labelGeom.orientation` is advisory and **must** be `"horizontal"` or omitted.
* `"follow-edge"` is **opt-in** per edge; UI MUST warn this may harm readability.
* For `routing:"orthogonal"`, `LabelPass` **should** prefer the **longest horizontal segment**; if absent, place nearby with **leader**.

---

## 9) Reserved & future fields (do not use unless spec updated)

* `nodes.*.data`, `edges.*.data` — reserved for future arbitrary metadata.
* `meta.tags` — reserved (string array).
* `layoutIntent.seed` — reserved (deterministic layout seed).
* `constraints.gridSnaps` — reserved.

---

## 10) Serialization, normalization, and defaults

* Exporters **should** omit `null`/`undefined` fields and may omit properties equal to defaults.
* Importers **must** reject unknown keys (strict mode) and **must not** mutate current doc on any parse/validate error.
* Normalizations:

  * Trim labels at both ends; preserve internal whitespace.
  * Normalize color strings to 7-char HEX (e.g., `#RRGGBB`) on write; accept CSS colors on read.
  * Fill in omitted `layoutIntent.levelSpacing` with default `80`.

---

**This schema is binding.** Validator implementations must treat mismatches as **blocking** for import/patch apply, surfacing precise diagnostics. Rendering and layout must rely only on fields defined here; any additional runtime state must be recomputable from the document.
