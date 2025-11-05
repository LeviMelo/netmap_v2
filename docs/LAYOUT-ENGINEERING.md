# LAYOUT-ENGINEERING.md — Layout, Routing & Label Placement

**Status:** Draft v1 (living)
**Owner:** Levi (Tech Lead)
**Last updated:** 2025-11-04 (America/São_Paulo)
**Scope:** GitHub Pages build (browser-only), Electron-ready
**Non-negotiables enforced here:** **horizontal labels by default**, readable concept maps first (not general graph explorer), **intent-driven** layout (not engine-driven), constraints & topology profiles observed, deterministic & undoable application, fast enough for ~100 nodes / 150–200 edges.

---

## 1) Purpose & success criteria

We translate **human layout intent** + **constraints** + **current geometry** into concrete node positions, edge routes, and label placements that maximize **readability** (zero vertical labels; minimal overlaps; short, understandable links), while staying interactive.

**Done when**

* A typical 100-node ConceptStrict map lays out in ≤ 300 ms on a mid laptop; “Improve Readability” reduces label collisions by ≥60% on a dense fixture; orthogonal routing keeps edge labels horizontal without manual nudging in ≥90% of cases; every step is undoable.

---

## 2) Pipeline overview

```
Document (nodes, edges, intent, constraints)
    └─▶ LayoutAdapter.run()
          ├─▶ Seed (use current positions; respect pinned)
          ├─▶ Engine call (fcose / elk / concentric / grid / preset)
          └─▶ positions (x,y) + routing skeletons
    └─▶ LabelPass.execute()
          ├─▶ Node-label nudge (horizontal boxes)
          ├─▶ Edge routing finalization (curved/straight/orth)
          ├─▶ Edge-label placement (horizontal invariant)
          └─▶ Stats (overlaps, long edges)
    └─▶ ApplyLayout (Command)
          └─▶ write positions & label geometry to GraphDocument
```

**All geometry is computed in a pure, side-effect-free function**. Applying it is a single `ApplyLayout` command (undoable).

---

## 3) Engines we wrap

* **Force** → `fcose` (Cytoscape extension). Good defaults; respects pins by fixing positions; works well for 20–150 nodes.
* **Hierarchy** → `elkjs` (layered, “elk-layered” algorithm). Deterministic layering, good orthogonal baseline.

  * Fallback: `dagre` (only if ELK fails to load; less precise).
* **Concentric/Grid** → our own deterministic coordinates.
* **Preset** → use saved `position` on nodes; no movement.

> Engine-specific names are **hidden** in the UI; users set **intent** knobs only.

---

## 4) Mapping Intent → Engine parameters

### 4.1 Inputs (from `layoutIntent`)

```ts
structure: "force" | "hierarchy" | "concentric" | "grid" | "preset"
spread: 0..100          // global repulsion / extent
linkLength: 0..100      // ideal edge length
avoidOverlap: boolean
levelSpacing: px (hierarchy/concentric)
edgeRouting: "curved"|"straight"|"orthogonal"
stability: 0..100       // stickiness to current positions
disconnected: "keep-close"|"separate"
```

### 4.2 Engine mappings (normalized → concrete)

**Force (fcose)**

| Intent       | fcose param                                                        |
| ------------ | ------------------------------------------------------------------ |
| spread       | `nodeRepulsion = k1 * (10 + spread)^2`                             |
| linkLength   | `idealEdgeLength = k2 * (10 + linkLength)`                         |
| avoidOverlap | `nodeSeparation = 10 + spread/2`                                   |
| stability    | `quality = "proof" if >70 else "default"`; fewer iterations if low |
| disconnected | `componentSpacing = 80 (keep-close) / 200 (separate)`              |
| seed         | initial positions from current doc (`n.position`)                  |

`k1, k2` chosen empirically (defaults: `k1=0.4`, `k2=3`).

**Hierarchy (elkjs)**

| Intent       | ELK option                                                              |
| ------------ | ----------------------------------------------------------------------- |
| levelSpacing | `layerSpacing = levelSpacing`                                           |
| linkLength   | `edgeNodeSpacing = 20 + linkLength/2`                                   |
| spread       | `nodeNodeSpacing = 10 + spread/3`                                       |
| avoidOverlap | `nodeNodeSpacing` already accounts; `elk.direction="RIGHT"` (default)   |
| edgeRouting  | `elk.edgeRouting = "ORTHOGONAL"` if orthogonal else `"POLYLINE"`        |
| stability    | seed with current positions via `org.eclipse.elk.initialPosition` hints |

**Concentric/Grid** — purely geometric, see §7.

**Preset** — NOP.

---

## 5) Constraints handling (pins, ranks, edge hints)

* **Pins**: nodes listed in `constraints.pins` are **hard constraints**.

  * Force: mark fixed.
  * Hierarchy: set fixed coordinate hints; allow only minimal local nudge in LabelPass (≤4 px) unless `Alt`-drag.
* **Ranks**:

  * Hierarchy: `same-level` → same layer; `above/below` → relative layer constraints.
  * Force: convert to soft springs: if `a above b`, add vertical spring targeting `y_a = y_b - L`, `L = levelSpacing`.
* **Edge hints**:

  * Map `short|medium|long` → per-edge ideal length multipliers: `0.7, 1.0, 1.3` respectively (force) or segment length penalty (hierarchy).

---

## 6) Seeding & stability

**Seed** = current `node.position` if available; else a jittered grid. **Stability** scales:

* Force: iteration budget & gravity → fewer changes for high stability.
* Hierarchy: reuse last layer assignments where possible; ELK “consider model order” option on.

> **Never randomize** when stability ≥ 60. Determinism matters for undo/redo and user trust.

---

## 7) Deterministic layouts (Concentric, Grid)

**Concentric**

* Order nodes by `degree()` descending; compute rings with radius step = `levelSpacing`.
* Position angle for ring `r`: `θ_i = 2π * i / N_r`.
* Apply **pin override**: pinned nodes keep their `x,y`; neighbors on ring get angle adjusted to reduce crossings.

**Grid**

* Compute columns `C` from `sqrt(n)`; cell size from median label box; place row-wise; respect pins by allocating their cells first.

---

## 8) Edge routing (finalization layer)

### 8.1 Curved / Straight

* **Straight**: draw single segment from `(x_from, y_from)` to `(x_to, y_to)`; apply **parallel offset** per multi-edge separation (see §10).
* **Curved**: cubic Bezier with control points:

  * Base vector `v = to - from`; normal `n = perp(v)/|v|`.
  * Offset magnitude `m = separation * (k + index)`, where `index` ranks the parallel edges; sign alternates.
  * Control points `p1 = from + v/3 + n*m`, `p2 = to - v/3 + n*m`.

### 8.2 Orthogonal (Manhattan)

We use a **2-bend preferred** polyline, with an **obstacle-aware** fallback.

**Step A — Preferred 2-bend candidates**

* Candidate bends at `(x_from, y_to)` and `(x_to, y_from)` yielding “L” / “┘” shapes.
* If either segment would intersect the **inflated node rectangles** (node bbox + margin), discard that candidate.

**Step B — Obstacle-aware fallback**

* Build a coarse **grid graph** around involved nodes (grid step = median label font size × 2).
* Mark cells occupied by inflated rectangles as blocked.
* Run **A*** from a perimeter point near source to perimeter near target with **Manhattan metric**.
* Post-process to **shorten colinear runs** and limit bends (prefer ≤ 3).

**Step C — Multi-edge separation**

* For parallel A→B edges, add **orthogonal lane offsets**:

  * If the first horizontal segment is used, offset vertically by `±d, ±2d…`.
  * If the first vertical segment is used, offset horizontally.
  * Labels will attempt to sit on the **longest horizontal span** (see §9).

> All routing honors `edgeOverlapPolicy` at label placement: we don’t break the edge for the label; we **mask** or **fade-under**.

---

## 9) LabelPass — horizontal labels, collisions & placement

**Invariant:** unless a user explicitly sets `follow-edge`, **labels are rendered horizontal**.

### 9.1 Node label nudge (prevent node–node label overlap)

Approximate node label boxes as rectangles sized by text metrics (wrap width, padding).

**Algorithm**

1. Build list `R` of rectangles (unpinned can move; pinned cannot).
2. For `iter = 1..K` (K=3..5):

   * For each overlapping pair `(i,j)`, compute minimal separating vector `Δ_ij`.
   * Accumulate displacement per rectangle `d_i += w_ij * Δ_ij` (weights diminish with pin status & iteration).
   * Apply `d_i` with damping; clamp move ≤ 3 px per iter; **never move pinned**.
3. Write adjusted positions back as **nudges** (not pins).

### 9.2 Edge-label placement

We compute candidate placements along the route polyline.

* **Candidates**: for each edge, collect:

  * Midpoint `t=0.5` ± offsets `(0, ±k)` with `k ∈ {4,8,12,…}`.
  * **Orthogonal routing**: for each horizontal segment with length ≥ `wrapWidth + 2*padding`, propose centered label on that segment.
  * If no horizontal segment exists or too short, propose **adjacent** placement with **leader** pointing to nearest point on route.

* **Scoring** (minimize):

  ```
  cost = α * overlapPenalty
       + β * |offset|              // prefer small offsets
       + γ * crossingPenalty       // if box crosses edges (besides this edge) 
       + δ * leaderPenalty         // if using leader, small but non-zero
       + ε * longEdgePenalty       // nudge labels closer if edge is too long
  ```

  with defaults `α=1.0, β=0.1, γ=0.5, δ=0.2, ε=0.1`.

* Choose min-cost candidate; set `labelGeom = {t, offsetX, offsetY, leader?}`.

### 9.3 Overlap detection

* Use **AABB** overlap for label boxes; **segment-box** intersection for crossing checks (fast).

**Outputs**

* `positions` (possibly nudged nodes)
* `edgeLabelPlacements`
* `stats`: `{ nodeLabelOverlaps, edgeLabelOverlaps, longEdgeCount }`

---

## 10) Parallel edges (multi-edge separation)

For N edges between A and B in the **same direction**:

* Order them by creation or ID.
* Compute offset series: `0, +d, -d, +2d, -2d, ...` (symmetrical).
* **Straight**: draw each with perpendicular offset to the main line.
* **Curved**: feed offset magnitude into control point normal (`n*m`).
* **Orthogonal**: shift the first segment lane as in §8.2.
* Label placements stagger along distinct horizontal spans or with slight vertical offsets.

> Under **ConceptStrict**, adding a true parallel A→B is **blocked**; this logic applies for `ConceptLax/General` or when temporarily allowed during import before a merge fix.

---

## 11) Readability heuristics & lints influencing geometry

* **Long edge**: if `length > p95(lengths) * 1.25`, add a weak attraction between endpoints during LabelPass; propose a **Fix** (“promote intermediate concept” or “re-anchor routes”).
* **Angular resolution**: penalize edges with angles within ≤ 10° of each other at a node; LabelPass prefers placements that diversify angles; Lint encourages re-layout (or hierarchy).
* **Contrast**: label halo and background defaults (halo 2px, bg 0.85 opacity) to guarantee legibility over strokes.

---

## 12) Performance strategy

* **Spatial index**: grid or R-tree of label boxes for O(log n) neighborhood queries.
* **Short iteration**: 3–5 passes for nudge; constant-time scoring per candidate set.
* **Workers (optional)**: ELK + heavy validation in a Web Worker when available; fallback synchronous if worker init fails.
* **Determinism**: fixed seeds, ordered iteration, no Math.random once seeded.

Target budgets:

* Force or Hierarchy on 100 nodes: **≤ 200 ms** engine + **≤ 80 ms** LabelPass.
* Concentric/Grid: **≤ 30 ms** total.

---

## 13) API contracts

```ts
// LayoutAdapter
interface LayoutResult {
  positions: Record<ID, { x: number; y: number; source: "layout"|"preset" }>;
  routes?: Record<ID, Polyline>; // optional: array of points for orth/curved (for reference)
  stats: { nodeLabelOverlaps: number; edgeLabelOverlaps: number; longEdgeCount: number };
}

interface LayoutAdapter {
  run(doc: GraphDocument): Promise<LayoutResult>; // pure; no mutation
}

// LabelPass
interface EdgeLabelPlacement { t: number; offsetX: number; offsetY: number; leader?: number; }
interface LabelPass {
  execute(doc: GraphDocument, positions: Record<ID,{x:number;y:number}>): {
    positions: Record<ID, {x:number;y:number}>,
    edgeLabelPlacements: Record<ID, EdgeLabelPlacement>,
    stats: { nodeLabelOverlaps: number; edgeLabelOverlaps: number; longEdgeCount: number }
  }
}
```

> **Renderer** consumes `positions` and `edgeLabelPlacements`; **ApplyLayout** writes them into the document.

---

## 14) Edge cases & guardrails

* **Pinned collisions**: if a pinned node’s label overlaps others, LabelPass may move **others**; pinned node stays fixed. If overlap persists, surface a **Problem** (“Pinned label overlap”) with suggestions (reduce wrap width; change placement).
* **Impossible orthogonal route** (tight obstacles): fall back to polyline with 1–2 bends that minimally intrudes inflated boxes; flag a **warning**.
* **Hierarchy cycles**: ELK will break cycles internally; we still surface the **Topology** problem and keep the routing; Fix planner suggests breaking an edge or reversing one.
* **Disconnected policy**: `separate` draws components with ≥ 200 px spacing; `keep-close` uses ≤ 80 px.

---

## 15) Determinism & undo model

* Layout results are fully determined by: `(doc.hash(), intent, constraints, seed positions)`.
* Applying a layout is a **single** `ApplyLayout` command containing:

  * New positions (diff only)
  * New `EdgeDoc.labelGeom` for changed edges
* Undo reverts both positions and label placements; Redo reapplies.

---

## 16) Validation hooks (pre/post)

* **Pre**: if profile forbids duplicates/self-loops, block attempts **before** engine run; if orphans exist, layout proceeds but Topology panel stays in **error**.
* **Post**: compute `stats` and send to UI; optionally auto-open **Readability** meters.

---

## 17) Test fixtures & acceptance metrics

* **Fixture F1 (Force)**: 80 nodes, avg degree 2.5, mixed lengths → `LabelPass` reduces node label overlaps ≥60%.
* **Fixture F2 (Hierarchy)**: DAG 50 nodes → no crossings on orthogonal routing for straight layering; labels all horizontal on horizontal segments or offset with leader.
* **Fixture F3 (Parallel edges)**: A→B (N=5) → distinct lanes, staggered labels; overlap count 0.
* **Fixture F4 (Pins)**: 10 pins; run layout → pinned coordinates unchanged (bit-wise).
* **Fixture F5 (Concentric)**: 3 rings → ring spacing = `levelSpacing`; label overlaps ≤ 5% of pairs.

Timing thresholds met on mid-tier laptop (Chromium).

---

## 18) Future upgrades (non-blocking)

* **True obstacle-avoiding orth router** (multi-source, channel routing).
* **Port constraints / anchor sides** (force edge exits at N/E/S/W).
* **Raphaël-style “magnet” guides** for manual alignment.
* **Edge bundling** (optional) with label de-conflicts.
* **GPU accelerated LabelPass** via WebGL compute (experimental).

---

## 19) Pseudocode snippets (reference)

### 19.1 Two-bend orthogonal candidate

```ts
function twoBendCandidates(src: Pt, dst: Pt, obstacles: Rect[]): Polyline[] {
  const c1 = [src, {x: src.x, y: dst.y}, dst];
  const c2 = [src, {x: dst.x, y: src.y}, dst];
  return [c1, c2].filter(poly => !intersectsAny(poly, inflateAll(obstacles, MARGIN)));
}
```

### 19.2 Label candidate scoring (horizontal invariant)

```ts
function bestLabelPlacement(route: Polyline, box: Size, others: Rect[], opts: Opts): Placement {
  const candidates = generateCandidates(route, box, opts);
  let best = null, bestCost = +Infinity;
  for (const c of candidates) {
    const rect = rectAt(route, c); // compute axis-aligned rect at placement
    const overlap = sumOverlap(rect, others);
    const crossings = countSegmentIntersections(rect, otherEdges);
    const cost = A*overlap + B*norm(c.offset) + C*crossings + D*(c.leader?1:0);
    if (cost < bestCost) { bestCost = cost; best = c; }
  }
  return best;
}
```

---

## 20) Implementation checklist (must-haves)

* [ ] fcose adapter honoring pins & stability; deterministic seeds.
* [ ] elk adapter with layerSpacing, orthogonal routing option; worker path ready.
* [ ] Concentric/Grid deterministic layouts.
* [ ] Orthogonal router (2-bend preferred + grid A* fallback).
* [ ] Multi-edge separation for all modes.
* [ ] LabelPass with node-label nudge + edge-label placement & scoring.
* [ ] `edgeOverlapPolicy`: clip/fade-under implemented in Overlay.
* [ ] Metrics collection (overlaps, long edges) returned with results.
* [ ] Full undo/redo via `ApplyLayout`.
* [ ] Deterministic runs (stable order; fixed seeds).
* [ ] Unit tests for routing/placement; fixture timings met.

---

**This document is binding for layout & routing.** If an engine quirk or shortcut would rotate labels, hide text under strokes, break pins/ranks, or make results non-deterministic/undoable, it is **not acceptable**.
