# TOPOLOGY-RULES.md — Profiles, Validation, Repairs

**Status:** Draft v1 (living)
**Owner:** Levi (Product/Tech)
**Last updated:** 2025-11-04 (America/São_Paulo)
**Scope:** GitHub Pages build (browser-only), Electron-ready
**Contract:** These rules define what a “valid” concept map (and related profiles) are, how we detect violations, and how we guide/repair them. Enforcement is live where possible; everything is undoable.

---

## 1) Why this exists

Concept maps are not arbitrary graphs. They have **readability** and **pedagogical** constraints: single cluster, directed relations, no self-loops, and (usually) **no parallel A→B edges**. This module turns those expectations into **profiles**, validates them **continuously**, and provides **one-click repairs**.

---

## 2) Profiles (strictness presets)

Profiles are chosen per-document (`meta.profile` in `GraphDocument`). You can fine-tune severities via `meta.profileOverrides`.

| Profile                     | Intent / Domain              | Key invariants (default severity)                                                                                                                                                                                                   |
| --------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ConceptStrict** (default) | Classroom-grade concept maps | No self-loops (**error**); No parallel A→B (**error**); Reciprocals A↔B discouraged (**warning**); Single connected component (**warning**); Orphans (**warning**); Multi-edges with same endpoints blocked live; Cycles (**info**) |
| **ConceptLax**              | Exploratory concept maps     | Self-loop (**warning**); Parallel A→B (**warning** with merge suggestion); Reciprocals (**info**); Orphans (**warning**); Components (**info**); Cycles (**info**)                                                                  |
| **CausalDAG**               | Cause→effect diagrams        | DAG only (**error** on any cycle); No self-loops (**error**); Parallel A→B (**warning**); Single component (**warning**); Orphans (**warning**)                                                                                     |
| **MindTree**                | Mind maps (tree-ish)         | **Tree**: exactly one root, no cycles (**error**), no parallel edges (**error**), components (**error** if >1), in-degree>1 (**warning**)                                                                                           |
| **General**                 | Anything goes                | Only schema validity; all topology rules are **info** (for metrics), none block live creation                                                                                                                                       |

**Live enforcement (hard blocks) per profile:**

* **ConceptStrict, CausalDAG, MindTree**: block **self-loops** and **duplicate A→B** at edge-creation/import apply; **MindTree** also blocks extra components on “Fix All”.
* **ConceptLax**: no hard blocks; show warnings; “Fix All” offers merges.

---

## 3) Rule catalog (canonical)

Each rule has an **ID**, **summary**, **severity** per profile, **detection**, and **repairs**.

### R1 — Self-loop

* **ID:** `selfLoop`
* **Detect:** any edge with `from === to`.
* **Severity:** Strict/Error; Lax/Warning; DAG/Error; Tree/Error; General/Info.
* **Repair options:** Delete edge; retarget source or target to a different node (selector), convert to note (edge label moved to node note).

### R2 — Duplicate directed pair (parallel edges A→B)

* **ID:** `parallelDirected`
* **Detect:** two or more edges with same `(from,to)`.
* **Severity:** Strict/Error; Lax/Warning; DAG/Warning; Tree/Error; General/Info.
* **Repair options:** **Merge edges** (concatenate labels with `; ` or choose one), **keep one** (delete others), **flip some** to B→A (if semantically intended), or **insert intermediate concept** (split long linking phrase into node).

> **Live enforcement in Strict/Tree/DAG:** prevent creation; focus existing edge’s label editor instead.

### R3 — Reciprocal pair (A→B and B→A both present)

* **ID:** `reciprocal`
* **Detect:** both directions between same pair.
* **Severity:** Strict/Warning; Lax/Info; DAG/**Error** (if both are causal); Tree/Error (violates tree direction); General/Info.
* **Repairs:** **Choose direction** (keep one), or convert to **bidirectional explanation** (single edge + “is associated with”), or **create mediator** (A↔C↔B).

### R4 — Disconnected components (>1 weakly connected component)

* **ID:** `components`
* **Detect:** WCC count >1.
* **Severity:** Strict/Warning; Lax/Info; DAG/Warning; Tree/**Error**; General/Info.
* **Repairs:** **Connect components** (add edge between suggested pair of “closest” concepts), **extract submap** (move component to a new document), or **demote to notes** (convert a single orphan component to notes on a chosen node).

### R5 — Orphan nodes (degree 0)

* **ID:** `orphan`
* **Detect:** node with in-degree = 0 and out-degree = 0.
* **Severity:** Strict/Warning; Lax/Warning; DAG/Warning; Tree/Error (every node must attach); General/Info.
* **Repairs:** **Connect** (suggest top-3 candidate edges based on label similarity / spatial proximity), **delete** (if intentional), or **mark-as-note** (convert node label to note on selected parent).

### R6 — Parallel undirected pair (A—B multiple regardless of direction)

* **ID:** `parallelUndirected`
* **Detect:** multiple edges connecting the same unordered pair `{A,B}` (includes reciprocal and parallel).
* **Severity:** Strict/Warning; Lax/Info; DAG/Warning; Tree/Error; General/Info.
* **Repairs:** as in R2/R3.

### R7 — Cycles (for DAG/Tree)

* **ID:** `cycle`
* **Detect:** SCC size > 1 (Tarjan/Kosaraju) or DFS back-edges.
* **Severity:** DAG/Error; Tree/Error; Strict/Info; Lax/Info; General/Info.
* **Repairs:** **Break cycle** (choose edge to remove/flip), **insert mediator** node to linearize causes, or **create hierarchy** (re-parent edges under a new umbrella concept).

### R8 — In-degree/out-degree constraints (Tree profile)

* **ID:** `degreeConstraint`
* **Detect:** Tree requires exactly one root (in-degree 0) and others with in-degree 1; out-degree unconstrained.
* **Severity:** Tree/Error; others/Info.
* **Repairs:** propose **re-parent** operations or **merge nodes**.

### R9 — Dangling references (schema-level)

* **ID:** `danglingRef`
* **Detect:** edge references non-existent node.
* **Severity:** All/Error (schema/parse).
* **Repairs:** **Create missing node**, **map to existing** (Semantic assist), or **drop edge**.

### R10 — Label readability lints (not topology, but attached here for Fix workflows)

* **ID:** `readability`
* **Detect:** edge label length > 80 chars, low contrast, vertical label (should not occur unless `follow-edge`), label-box overlaps > threshold.
* **Severity:** Strict/Warning; others/Info.
* **Repairs:** **Wrap** (increase wrapWidth), **shorten** (move phrase to node note), **re-route** (orthogonal), **run Readability**.

---

## 4) Detection algorithms (complexity)

Let `n = |V|`, `m = |E|`.

* **Self-loops:** O(m).
* **Parallel directed:** hash map keyed by `(from,to)` → O(m).
* **Reciprocal pairs:** check `(from,to)` and `(to,from)` in hash → O(m).
* **WCCs:** BFS/DFS over undirected view → O(n + m).
* **Orphans:** degree array tally → O(n + m).
* **Cycles (DAG):** SCC (Tarjan) → O(n + m).
* **Tree constraints:** count roots, verify in-degree=1 for others → O(n + m).
* **Dangling references:** verify endpoints exist during edge iteration → O(m).
* **Readability lints:** computed in LabelPass; overlap via spatial index.

We run a **fast incremental pass** on each mutation (add/remove edge/node). Full recompute on import/layout apply.

---

## 5) Live enforcement hooks

* **Before adding an edge**:

  * Block if self-loop (R1) in Strict/DAG/Tree.
  * Block if duplicate A→B (R2) in Strict/Tree/DAG. Instead, **focus** existing edge’s label editor.
* **Before deleting a node**:

  * If Strict/Tree and deletion would create extra components or many orphans, show **Confirm** with impact list.
* **MapScript/Import**: dry-run validation; if errors at **error** severity exist, apply is disabled until user approves repairs.

All blocks surface **specific rule IDs** and quick-fix CTAs.

---

## 6) Problems panel & overlay semantics

Every violation becomes a **Problem** entry:

```
[Error] Duplicate directed pair (A → B) — 3 edges
   • e12 "increases"; e47 "promotes"; e99 "facilitates"
   [Select] [Merge…] [Keep e12] [Delete others]
```

Clicking **Select** highlights the offenders and darkens the rest. Overlays used:

* **Components**: colored hulls with counts.
* **Cycles**: numbered edge path.
* **Parallel edges**: stacked tick marks near mid-segment.

---

## 7) Fix plans (transactional, undoable)

Each plan is a **pure function** mapping `(doc, offenders) → proposed patch`. Applying emits **one command** (atomic; undoable).

### F2 — Merge parallel A→B

* **Preconditions:** ≥ 2 edges `(from,to)` identical.
* **Options:**

  * **Concatenate labels** (`"A; B; C"`) into the **lowest-ID** edge; delete others.
  * **Pick one** (by selection or longest label).
  * **Promote phrase to node**: create node `X` with label = union of phrases; replace edges by `(A→X)` and `(X→B)`.
* **Side effects:** keep style of survivor edge; others’ styles discarded.

### F3 — Resolve reciprocal

* Convert to **single edge** with combined label “is associated with” (or chosen phrasing), or keep causal direction and delete the other; offer **split concepts** suggestion.

### F4 — Connect components

* Compute candidate pair `(u in C1, v in C2)` minimizing Euclidean distance or maximizing label similarity; propose `u→v` with label “relates to” (editable inline before apply).

### F5 — Attach orphans

* Suggest top-3 candidates by proximity + label similarity; create chosen edge.

### F7 — Break cycle (DAG/Tree)

* Propose removing the **weakest** edge (shortest label / lowest weight), or **flip** direction where allowed; preview path.

### F8 — Tree re-parent

* For nodes with in-degree≠1, propose reassignments to enforce single parent; maintain order via hierarchy intent.

> All fixes show a **Diff Preview**: `+ added • – removed • ~ updated`.

---

## 8) Severity overrides (per document)

`meta.profileOverrides` lets you change severities:

```json
"meta": {
  "profile": "ConceptStrict",
  "profileOverrides": {
    "components": "error",
    "reciprocal": "off"
  }
}
```

* Allowed: `"error" | "warning" | "info" | "off"`.
* Live blocks follow **effective severity** (if you turn `parallelDirected` to `warning`, creation no longer blocks).

---

## 9) API surfaces

```ts
type Severity = "error" | "warning" | "info";
type ProblemID =
  | "selfLoop" | "parallelDirected" | "reciprocal" | "components"
  | "orphan" | "parallelUndirected" | "cycle" | "degreeConstraint"
  | "danglingRef" | "readability";

interface Problem {
  id: ProblemID;
  severity: Severity;
  summary: string;
  elementIds: string[]; // nodes and/or edges
  data?: Record<string, unknown>;
}

interface ValidationResult {
  problems: Problem[];
  metrics: {
    components: number;
    orphans: number;
    sccCount: number;
    parallelPairs: number;
  };
}

interface FixPlan {
  id: string; // e.g., "mergeParallel", "connectComponents"
  title: string;
  apply(doc: GraphDocument, targets: string[]): GraphDocument; // pure; returns new doc
}
```

* `validate(doc): ValidationResult` runs after every mutation (debounced).
* `planFix(doc, problem): FixPlan[]` returns applicable plans.

---

## 10) Metrics (shown in Topology panel)

* `components`: count & sizes
* `orphans`: count & list
* `cycles`: SCC count, sample cycles
* `parallelDirected`: pairs & multiplicity
* `avgDegree`, `maxDegree`
* `edgeLengthDistribution`: p50, p95, outliers
* `labelOverlapCounts`: from LabelPass

---

## 11) Performance & incremental validation

* Maintain degree arrays and `(from,to)` maps incrementally for O(1) edge add/remove updates.
* Maintain a **union-find** (disjoint set) for WCCs; refresh fully on imports only.
* SCC (cycles) recalculated on demand (when profile requires DAG) or when edges touching an SCC change.

---

## 12) UX invariants

1. Users can **always** see what’s wrong and **how to fix it** in 1–2 clicks.
2. Strict profiles **block** at creation time for rules that would obviously violate the profile (self-loop, parallel A→B, extra components in Tree).
3. **No mutation** occurs when parse/validate fails on import/MapScript until user accepts a fix plan.
4. Every fix is a **single undo step**.

---

## 13) Test acceptance (topology)

* Adding A→A in Strict is blocked with a clear message.
* Creating a second A→B focuses the existing edge label instead of adding a duplicate.
* Importing a file with 3 components in **MindTree** surfaces an **Error** and the **Connect components** Fix plan.
* **CausalDAG**: importing a cycle produces **Error** + **Break cycle** plan with valid edge options.
* **Fix All** on a mixed-violations fixture reduces problems to 0 without breaking pins.

---

## 14) Future enhancements (non-blocking)

* **Semantic duplicate detection** (labels “causes” vs “increases”) using on-device embeddings (later, Electron).
* **Constraint presets** per academic discipline (e.g., “Concept Map (Novak)” vs “Argument Map”).
* **Edge cardinality rules** (limit edges per node for clarity) with adaptive UI hints.

---

**This document is binding.** If a shortcut would allow invalid topology to slip through unnoticed in Strict/DAG/Tree, or would apply non-undoable fixes, it is **not acceptable**.
