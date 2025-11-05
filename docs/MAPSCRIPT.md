# MAPSCRIPT.md — Text Commands for Maps (DSL)

**Status:** Draft v1 (living)
**Owner:** Levi (Tech Lead)
**Last updated:** 2025-11-04 (America/São_Paulo)
**Scope:** GitHub Pages (browser-only, offline), Electron-ready
**Contract:** MapScript is a **deterministic, sandboxed**, in-editor DSL to create, update, style, and restructure concept maps. Every run is **dry-runnable**, reports **line/column diagnostics**, produces a **Diff Preview**, and applies as a **single undoable transaction**. It **obeys profile rules** (TOPOLOGY-RULES) and never silently mutates the document on parse/validate errors.

---

## 1) Why MapScript exists

* **Power editing**: do in 10 lines what takes 200 clicks (bulk relabel, batch style, connect, fix topology).
* **Deterministic & local**: no server, no LLM required; all in the browser.
* **Coexists with GUI**: text is **optional**. You can mix GUI edits and MapScript; both land in the same undo stack.

---

## 2) Execution model (exact)

```
source (string)
  └─ Parse → (AST or SyntaxErrors[*])
       └─ Static checks (types, arity, unknown ids) → (SemanticErrors[*])
            └─ Plan (pure transform; produce tentative new GraphDocument)
                 └─ Topology validation (profile-aware)
                      └─ Lints (readability, non-blocking)
                           └─ Build Diff vs current
                                └─ Show report (Dry-run) OR Apply
                                     └─ If Apply: push single Command to undo stack
```

* **Dry-run**: default in the console (`Run / Dry-run`).
* **Apply**: only possible if there are **no blocking errors** (parse/schema/topology at “error” severity).
* **Deterministic**: given the same doc + script → same diff.

---

## 3) Mental model

* The graph is a set of **nodes**, **edges**, and **groups** with properties defined in `DATA-SCHEMA.md`.
* MapScript offers:

  * **Selection language** (CSS-ish for graphs).
  * **Commands**: `add`, `set`, `delete`, `group`, `layout`, `constraints`, `fix`…
  * **Expressions & variables**: store and reuse sets.
  * **Transactions**: the entire script is one transaction; `begin … commit` provides manual boundaries when embedding multiple distinct phases inside one file.

---

## 4) Syntax overview

### 4.1 Lexical

* **Case-insensitive keywords**, **case-sensitive ids/strings**.
* **Comments**: `// line`, `/* block */`.
* **Identifiers**: `[A-Za-z_][A-Za-z0-9_-]*` (for vars, groups).
* **Strings**: `"double"` or `'single'`. Use `\"` / `\'` to escape.
* **Numbers**: integer or float.
* **Colors**: `#RRGGBB`, `rgb(r,g,b)`, `hsl(h,s%,l%)`, or `oklch(l c h)` (normalized to HEX on apply).

### 4.2 Commands (top-level)

```
<stmt> :=
    add node ... ;
  | add edge ... ;
  | set <selector> { <prop>: <value>, ... } ;
  | delete <selector> ;
  | group create <id> [label "<str>"] ;
  | group delete <id> ;
  | group add <id> <selector> ;
  | group remove <id> <selector> ;
  | layout intent { ... } ;
  | constraints { ... } ;
  | pin <selector> ;
  | unpin <selector> ;
  | rank same <selector> ;
  | rank above <selectorA> <selectorB> ;
  | rank below <selectorA> <selectorB> ;
  | edgehint <selector> short|medium|long ;
  | let <var> = <selector> ;
  | fix <ruleId> [on <selector>] [with <option>] ;
  | begin ; ... ; commit ;
```

### 4.3 Selectors (set expressions)

```
<selector> :=
    *                                   // everything
  | nodes                               // all nodes
  | edges                               // all edges
  | #id                                 // by id
  | @"slug"                             // by slug (string)
  | label~ /regex/i                     // label regex (JS style)
  | group:ID                            // members of group ID
  | degree(in|out|total) OP number      // degree filters
  | has(style.<field>)                  // property existence
  | has(note)                           // node notes exist
  | type:node | type:edge               // explicit type
  | from(#id|label~ /.../)              // edges whose source matches
  | to(#id|label~ /.../)                // edges whose target matches
  | neighbors(<selector>)               // nodes neighbors of selector
  | successors(<selector>)              // reachable via outgoing edges
  | predecessors(<selector>)            // reachable via incoming edges
  | <selector> & <selector>             // intersection
  | <selector> | <selector>             // union
  | <selector> - <selector>             // difference
  | (<selector>)                        // grouping
```

* `OP` ∈ `{=, !=, <, <=, >, >=}`
* Evaluates to a **set of element IDs** (nodes and/or edges depending on primitives).

### 4.4 Properties (for `set {}`)

**Node properties** (subset; full list from DATA-SCHEMA):

```
label, slug, color, shape, sizeMode, width, height, font.size, font.weight,
labelBox.wrap, labelBox.padding, labelBox.halo, labelBox.background, pinned
```

**Edge properties:**

```
label, color, routing, width, dash, arrowhead, separation,
labelBox.wrap, labelBox.offsetX, labelBox.offsetY, labelBox.background,
labelBox.halo, followEdge (bool) // discouraged; defaults false
```

**Group styleRef**: `groupStyle.color`, `groupStyle.shape`, … (same keys as node/edge style).

---

## 5) Grammar (EBNF)

```
program     ::= stmt* ;

stmt        ::= addNodeStmt | addEdgeStmt | setStmt | deleteStmt
              | groupStmt | layoutStmt | constraintsStmt
              | pinStmt | unpinStmt | rankStmt | edgehintStmt
              | letStmt | fixStmt | txnBegin | txnCommit ;

txnBegin    ::= "begin" ";" ;
txnCommit   ::= "commit" ";" ;

addNodeStmt ::= "add" "node" nodeSpec (";" | ("," nodeSpec)* ";") ;
nodeSpec    ::= [ "id" id ] [ "slug" string ] [ "label" string ]
                [ "at" "(" number "," number ")" ]
                [ "color" color ] [ "shape" id ] [ "group" id ]* ;

addEdgeStmt ::= "add" "edge" edgeSpec (";" | ("," edgeSpec)* ";") ;
edgeSpec    ::= [ "id" id ] "from" ref "to" ref
                [ "label" string ] [ "color" color ]
                [ "routing" id ] [ "arrowhead" id ] ;

setStmt     ::= "set" selector "{" propList "}" ";" ;
propList    ::= prop ("," prop)* ;
prop        ::= propKey ":" value ;
propKey     ::= id ( "." id )* ;
value       ::= string | number | color | boolean ;

deleteStmt  ::= "delete" selector ";" ;

groupStmt   ::= ("group" "create" id [ "label" string ] ";")
              | ("group" "delete" id ";")
              | ("group" "add" id selector ";")
              | ("group" "remove" id selector ";") ;

layoutStmt  ::= "layout" "intent" "{" layoutProps "}" ";" ;
layoutProps ::= ("structure" ":" ("force"|"hierarchy"|"concentric"|"grid"|"preset")
              | "spread" ":" number
              | "linkLength" ":" number
              | "avoidOverlap" ":" boolean
              | "levelSpacing" ":" number
              | "edgeRouting" ":" ("curved"|"straight"|"orthogonal")
              | "stability" ":" number
              | "disconnected" ":" ("keep-close"|"separate")) ("," layoutProps)* ;

constraintsStmt ::= "constraints" "{" cPropList "}" ";" ;
cPropList ::= (pinBlock | rankBlock | hintBlock) ("," cPropList)* ;
pinBlock  ::= "pin" ":" selector ;
rankBlock ::= ("sameLevel" ":" selector)
           | ("above" ":" selector "," selector)
           | ("below" ":" selector "," selector) ;
hintBlock ::= "edgeHint" ":" selector "," ("short"|"medium"|"long") ;

pinStmt    ::= "pin" selector ";" ;
unpinStmt  ::= "unpin" selector ";" ;

rankStmt   ::= ("rank" "same" selector ";")
             | ("rank" "above" selector selector ";")
             | ("rank" "below" selector selector ";") ;

edgehintStmt ::= "edgehint" selector ("short"|"medium"|"long") ";" ;

letStmt    ::= "let" id "=" selector ";" ;

fixStmt    ::= "fix" id [ "on" selector ] [ "with" id ] ";" ;

selector   ::= expr ;
expr       ::= term (("|" | "&" | "-") term)* ;
term       ::= primary | funcall | "(" expr ")" ;
primary    ::= "*" | "nodes" | "edges" | "#" id | "@" string
             | "label~" regex | "group:" id | "type:" ("node"|"edge")
             | degreePred | endpointPred ;
degreePred ::= "degree" "(" ("in"|"out"|"total") ")" op number ;
endpointPred::= ("from" "(" ref ")" | "to" "(" ref ")") ;
ref        ::= "#" id | "@" string | "label~" regex ;

funcall    ::= ident "(" ( expr | string | number )? ("," (expr|string|number))* ")" ;

id         ::= IDENT ;
string     ::= STRING ;
number     ::= NUMBER ;
color      ::= COLOR ;
boolean    ::= "true" | "false" ;
regex      ::= "/" … "/" ["i"] ;
op         ::= "=" | "!=" | "<" | "<=" | ">" | ">=" ;
ident      ::= IDENT ;
```

---

## 6) Determinism & IDs

* **If you don’t provide an `id`** for a new node/edge, MapScript generates a **short, collision-free** ID:

  * Node: `n:<slugified(label)>:<seq>`; Edge: `e:<from>_<to>:<seq>`.
* **Slug** (`slug`) is optional, derived from label by default; used in selectors (`@"slug"`).
* **Never rename IDs** implicitly. Renames happen only via `set #id { id: "newId" }` (discouraged; warns if referenced elsewhere).

---

## 7) Property catalog (commonly used)

### 7.1 Node style keys

```
color: "#3366FF"
shape: "roundrect" | "rect" | "pill" | "ellipse" | "diamond" | "hex"
sizeMode: "auto" | "fixed"
width: 140    // when sizeMode="fixed"
height: 40
font.size: 12..36
font.weight: 300..700
labelBox.wrap: 160
labelBox.padding: 6
labelBox.halo: 2
labelBox.background: { on: true, color: "#000000", opacity: 0.85 }
pinned: true|false
```

### 7.2 Edge style keys

```
routing: "curved" | "straight" | "orthogonal"
width: 2..12
dash: "solid" | "dashed" | "dotted"
arrowhead: "triangle" | "vee" | "none"
separation: 6..30 // for parallel edges (General/Lax)
labelBox.wrap: 160
labelBox.offsetX: 0
labelBox.offsetY: 0
labelBox.halo: 2
labelBox.background: { on: true, color: "#000000", opacity: 0.85 }
followEdge: false // discouraged (readability)
```

### 7.3 Group styling

Same keys as node/edge, under `groupStyle.*`.

---

## 8) Built-in functions (pure)

```
neighbors(<selector>)      // nodes adjacent to selector (undirected)
successors(<selector>)     // nodes reachable via outgoing edges
predecessors(<selector>)   // nodes reachable via incoming edges
match("<regex>", label)    // boolean: label matches regex (case-insensitive default)
slugify("<string>")        // returns slug
degree("in"|"out"|"total", <selector>) // numeric for single element
```

*Note:* `neighbors` et al. also exist as **selector primitives** (preferred).

---

## 9) Examples (canonical)

### 9.1 Create nodes & edges (with ids and styling)

```
// Heart and Stroke nodes, then link with labeled edge
add node id heart label "Heart" color #D7263D shape roundrect at (100,100);
add node id sv label "Stroke Volume" color #3366FF;
add edge id e1 from #heart to #sv label "increases" arrowhead triangle color #3366FF;
```

### 9.2 Batch style using selectors

```
// Make all nodes in group 'Physio' blue with pill shapes
group create Physio label "Physiology";
group add Physio label~ /cardiac|volume|output/i;
set group:Physio { color: #2A6EF4, shape: pill, font.size: 14 };

// Edge routing globally orthogonal; do not rotate labels
set edges { routing: orthogonal, followEdge: false, labelBox.halo: 2 };
```

### 9.3 Constraints & layout intent

```
// Pin key nodes, enforce hierarchy, and run a “more spaced” layout intent
pin #heart | #sv;
layout intent {
  structure: hierarchy,
  levelSpacing: 120,
  spread: 40,
  linkLength: 60,
  edgeRouting: orthogonal,
  avoidOverlap: true,
  stability: 80
};

// Give A→B edges a “short” hint to keep them close
edgehint from(#heart) short;
```

### 9.4 Topology fixes

```
// Merge duplicate edges A→B by concatenating labels
fix parallelDirected on from(@heart) & to(@sv) with mergeConcat;

// Connect components by shortest geometric distance
fix components with connectNearest;
```

### 9.5 Variables and reusable sets

```
// Select cardio-related nodes once; reuse
let cardio = label~ /card(ia|io)/i | group:Physio;
set cardio { labelBox.wrap: 200, font.size: 15 };
```

### 9.6 Sanitize long labels (wrap + notes)

```
// Any node with label > 60 chars -> reduce wrap and move remainder to notes
set nodes & label~ /.{60,}/ {
  labelBox.wrap: 140
};
```

### 9.7 Safe delete (guided)

```
// Delete edges whose label is empty or whitespace only
delete edges & label~ /^\\s*$/ ;
```

---

## 10) Topology-aware **fix** options

Built-in option names (these map to Fix Plans in TOPOLOGY-RULES):

* `mergeConcat` — for `parallelDirected`: concat labels into one survivor.
* `mergeKeepLongest` — keep longest label edge; delete rest.
* `connectNearest` — for `components`: add a link between closest nodes.
* `attachOrphans` — for `orphans`: attach to best candidate (proximity + label).
* `breakCycleWeakest` — remove “weakest” edge in a cycle (heuristic).
* `enforceTree` — re-parent to obtain an arborescence (MindTree).

Usage:

```
fix parallelDirected on from(#A) & to(#B) with mergeKeepLongest;
fix components with connectNearest;
```

If `on <selector>` omitted, applies to **all** offenders in current doc.

---

## 11) Diagnostics & errors

All diagnostics show **line, column, excerpt**, and **code**.

**SyntaxError**

```
(6:12) Expected ';' after statement
  set nodes { color: #ZZZZZZ }
             ^^^^^
```

**SemanticError**

```
(12:5) Unknown property 'arrowheads'
  set edges { arrowheads: triangle }
            ^^^^^^^^^^^
```

**NotFound**

```
(8:20) Unknown id '#ventricle'
  add edge from #heart to #ventricle label "connects";
                     ^^^^^^^^^^^
```

**ProfileBlock (TopologyError)**

```
(15:1) ConceptStrict forbids parallel A→B (duplicate e42)
  add edge from #A to #B label "also causes";
  ^^^
Suggestion: fix parallelDirected on from(#A) & to(#B) with mergeConcat;
```

**Warnings (non-blocking)**

```
(3:22) Color normalized to #33AA77
```

---

## 12) Safety & profile compliance

* On **Strict/DAG/Tree**, commands that would create **self-loops** or **parallel A→B** are **blocked** at plan time.
* **Deletes** that would split components → **Confirm** modal in Apply.
* **followEdge: true** allowed but emits **Readability warning**.

---

## 13) Performance expectations

* Parser & planner: 1000 lines < **20 ms**.
* Selector evaluation on 100 nodes / 200 edges: **< 5 ms** typical.
* Full apply (diff + validate): bound by validation/layout if triggered.

---

## 14) Console UX (in-editor)

* **Monaco editor** with: syntax highlighting, autocomplete for properties, inline diagnostics, and **Examples** dropdown.
* Buttons: `Dry-run`, `Apply`.
* **Problems panel** lists errors/warnings. Click jumps caret.

---

## 15) Transaction boundaries

* Whole script = one transaction by default.
* Use `begin; …; commit;` to **checkpoint**: each `begin…commit` becomes its own atomic diff in the undo stack.

Example:

```
begin;
  // create scaffold
  add node label "A";
  add node label "B";
  add edge from @"a" to @"b" label "leads to";
commit;

begin;
  // style + layout as a separate undoable step
  set nodes { color: #2255FF };
  layout intent { structure: force, spread: 60, linkLength: 50 };
commit;
```

---

## 16) Reserved words & names

Keywords (cannot be used as unquoted ids):
`add, node, edge, set, delete, group, create, remove, layout, intent, constraints, pin, unpin, rank, same, above, below, edgehint, let, fix, begin, commit, nodes, edges, from, to, label, color, routing, shape, width, height, font, labelBox, background, wrap, padding, halo, separation, arrowhead, followEdge, degree, neighbors, successors, predecessors, has, type`

---

## 17) Embedding & API (internal)

```ts
interface MapScriptResult {
  ok: boolean;
  issues: Diagnostic[];     // errors + warnings with line/col
  diff?: Diff;              // if ok
  metrics?: ValidationResult['metrics'];
}

function mapScriptDryRun(source: string, doc: GraphDocument): MapScriptResult;
function mapScriptApply(source: string, doc: GraphDocument): { commandId: string } | Diagnostic[];
```

* **Dry-run** returns issues and a **Diff** if no blocking errors.
* **Apply** pushes a single command; UI shows success toast and updates canvas.

---

## 18) Test acceptance (MapScript)

* Parser catches malformed tokens with correct **line/col**.
* Creating duplicate A→B in **Strict** yields **ProfileBlock** and no diff.
* `set group:Physio { color: #… }` cascades style to existing members immediately after apply.
* `begin/commit` produces **two** undo entries.
* `delete edges & label~ /^$/` removes only edges with empty labels.
* Dry-run on a 400-line script finishes < 50 ms; Apply is one undo step.

---

## 19) Future extensions (non-blocking)

* **Macros**: `macro name(params) { … }` and `use name(args)`.
* **CSV ingest**: `import csv "file.csv" map { source:"A", target:"B", label:"Rel" }`.
* **Semantic selectors** (later, Electron): label embeddings `similarTo("ventricle")`.
* **If/Else** blocks with simple predicates on metrics.
* **Preview layouts**: `layout preview { ... }` (compute & show ghost without committing).

---

**This spec is binding.** Any MapScript behavior that mutates state without Apply, violates profile gates, rotates labels by default, or produces non-deterministic diffs is **not acceptable**.
