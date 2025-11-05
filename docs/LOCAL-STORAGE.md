# LOCAL-STORAGE.md — Library, Persistence & Migrations

**Status:** Draft v1 (living)
**Owner:** Levi (Tech Lead)
**Last updated:** 2025-11-04 (America/São_Paulo)
**Scope:** GitHub Pages (browser-only, offline), Electron-ready
**Contract:** Documents, themes, preferences, previews, autosaves and snapshots persist **locally**. No network, no backend. All writes are **atomic** at the logical level; every import/apply/layout is a **single transaction** from the user’s perspective. Data model supports versioning and forward-compatible migrations.

---

## 1) Purpose & constraints

* **Origin-local library**: store multiple maps (GraphDocument), themes, and user prefs.
* **Offline-first**: IndexedDB primary; `localStorage` fallback as read-only warn mode.
* **No accounts / sync** on GitHub Pages. Export/ZIP is the sync/backup mechanism.
* **Undo/redo** lives in-memory; we persist the **current committed doc**, not the entire undo stack (optional snapshot ring, see §8).
* **Deterministic IDs**; **hashes** for dedupe and dirty detection.
* **Quota-aware**: bounded thumbnails and autosave history with GC.

---

## 2) Storage stack

* **Primary**: IndexedDB via **localForage** (or a minimal homegrown wrapper with Promises).
* **Fallback**: `localStorage` only for **manifest** + **most recent doc** (stringified). If IndexedDB unavailable, editor raises a banner: “Reduced persistence; export frequently.”

**DB name**: `netmap:v1` (bump on breaking changes)
**Stores (object stores / keyspaces):**

* `manifest` — library index (single key `manifest`)
* `docs` — each GraphDocument by `doc:<id>`
* `themes` — each ThemeDoc by `theme:<id>`
* `previews` — PNG data URLs `preview:<id>`
* `autosaves` — ring buffer records `autosave:<docId>:<seq>`
* `snapshots` — manual snapshot ring `snapshot:<docId>:<seq>`
* `aliases` — semantic alias map `aliases` (single key)
* `prefs` — UI prefs (split keys)
* `trash` — soft-deleted docs `trash:<id>`

All keys are **strings**; values are JSON blobs (except `previews`, which are data URLs).

---

## 3) Entities & records

### 3.1 Manifest (authoritative index)

```ts
interface Manifest {
  schemaVersion: 1;
  createdAt: ISODate;
  modifiedAt: ISODate;
  // flat index for fast library load:
  docs: Record<ID, {
    id: ID;
    title: string;
    profile: "ConceptStrict"|"ConceptLax"|"CausalDAG"|"MindTree"|"General";
    themeId?: ID;
    hash: string;                 // canonical hash of document@save
    sizeBytes: number;            // JSON size (compressed optional later)
    createdAt: ISODate;
    modifiedAt: ISODate;
    lastOpenedAt?: ISODate;
    tags?: string[];              // user tags (optional)
  }>;
  themes: Record<ID, { id: ID; label: string; createdAt: ISODate; modifiedAt: ISODate }>;
  // global counters:
  counters: { docSeq: number; themeSeq: number };
  // GC telemetry
  storageBytes?: number;
}
```

* Manifest is **the** source for the Library view.
* All doc/theme CRUD must update manifest **atomically** with the object store write (transaction).

### 3.2 GraphDocument & ThemeDoc

As defined in **DATA-SCHEMA.md**. Persist **exactly** the same structure we operate in-memory (after canonicalization).

### 3.3 Previews

```ts
interface PreviewRecord {
  docId: ID;
  updatedAt: ISODate;
  width: number;   // e.g., 384
  height: number;  // scaled
  dataURL: string; // "data:image/png;base64,...."
}
```

* Generated on save & on request (debounced).
* Size target ~50–150 KB per map. Cap total previews budget (e.g., **8 MB**) and GC LRU first.

### 3.4 Autosaves & Snapshots

```ts
interface AutoSave {
  docId: ID;
  seq: number;         // rotating ring: 0..(N-1)
  at: ISODate;
  hash: string;        // of document
  doc: GraphDocument;  // full doc
}
```

* **Autosave ring**: default N=5 per doc, interval: **60s** or when going **background** (visibility change) and on **dirty unload**.
* **Snapshot ring**: user-initiated “Create snapshot” (N=10).
* On open, we offer “Recover from autosave” if autosave hash != manifest hash.

### 3.5 Aliases (semantic ID mapping)

```ts
interface Aliases {
  version: 1;
  node: Record<string /*incomingIdOrSignature*/, ID /*canonical*/>;
  edge: Record<string, ID>;
}
```

* Extends when user approves matches in **Semantic Assist** (IO-SPEC).
* Stored separately and referenced during imports.

### 3.6 Preferences (prefs)

* Window layout, theme preference, grid on/off, last used profile, layout intent defaults, keyboard toggles, etc.
* Keys: `pref:<name>` → simple value JSON.

### 3.7 Trash

* Soft-deleted docs retained for **7 days** (rolling).
* Records: full doc (and preview) in `trash:<id>`, plus manifest entry flagged `deletedAt`.
* Background job purges expired trash.

---

## 4) IDs & hashing

* **Doc IDs**: `map-<yy><mm><dd>-<seq>` (e.g., `map-251104-0012`) or user-provided slug; guaranteed unique via manifest counters.
* **Theme IDs**: `theme-<seq>`.
* **Hashes**: canonical `sha256` over `GraphDocument` (IO-SPEC §6). Used for:

  * Dirty check (avoid redundant writes).
  * Autosave dedupe (skip if hash unchanged).
  * Diff sanity (undo salt optional).

---

## 5) Lifecycle flows (sequences)

### 5.1 Create new map

1. Build minimal `GraphDocument` (`meta.title="Untitled"`, profile default).
2. Compute hash; assign `id` via manifest counter.
3. Transaction: put `docs`, update `manifest.docs[id]`, add blank `preview`.
4. Navigate editor to the new document.

### 5.2 Open map

* Fetch document by `id` from `docs`.
* Check autosave ring for newer hash → offer **Recover**.
* Load preview lazily after canvas loads.

### 5.3 Save (commit after a Command)

1. Compute canonical hash for current in-memory doc.
2. If hash equals `manifest.docs[id].hash`, **skip**; still update `lastOpenedAt`.
3. Transaction: put in `docs`, update manifest (modifiedAt, hash, size), refresh preview (debounced).
4. Enqueue autosave with new hash and advance seq.

### 5.4 Delete (to Trash)

* Transaction: move doc+preview to `trash:<id>`, delete from `docs` and `previews`, remove from `manifest.docs`.
* Trash record includes `deletedAt`.
* Toast: “Moved to Trash (Undo)”.

### 5.5 Restore from Trash

* Inverse of delete: copy back to `docs`/`previews`, update manifest entry.

### 5.6 Import (IO-SPEC)

* On **Apply**, treat as **Save** to either new or existing id depending on policy (Replace/Merge/Assist).
* If creating new: allocate id; if replacing: overwrite doc and update manifest (keep same id).

---

## 6) Autosave, recover & crash resilience

* **Autosave timer**: starts when doc becomes dirty; resets on commit. Default 60 s, min interval 20 s.
* **Visibility**: on `visibilitychange` (to hidden), autosave if dirty > 10 s.
* **Beforeunload**: if dirty and no autosave in last 10 s, persist one.
* **Recovery**: when opening a doc and `latestAutosave.hash !== manifest.hash`, show banner with **Diff** & Apply.

---

## 7) Multi-tab concurrency

* **Locking**: A lightweight **BroadcastChannel** `netmap:v1` announces “active editor for <docId>”.
* If another tab opens same doc, show **read-only** banner with “Take control” button (sends a polite release request; first tab should relinquish or user forces takeover).
* **Localstorage heartbeat** fallback if BroadcastChannel missing (update timestamp every 5 s).
* **Conflict**: last writer wins; we rely on lock to prevent overlapping writes to the same doc.

---

## 8) Undo/redo & persistence

* In-memory **command stack** only (fast).
* Optional **snapshot ring**: menu “Create snapshot” → writes a copy to `snapshots` with label.
* After reload, we restore **only** the last committed doc plus view state (zoom, pan, selected ids) from `prefs`.
* Rationale: serializing the entire command graph is heavy; our architecture guarantees every macro-change is reversible via **MapScript**/imports and snapshots.

---

## 9) Quota & GC

Typical IndexedDB quota ~50–100 MB. We aim to stay **well below**:

* **Previews cap**: 8 MB global; LRU GC.
* **Autosaves**: N=5 per doc (≈5× doc size). Purge on save older than 30 days.
* **Snapshots**: N=10 per doc; user-manageable (UI: “Manage snapshots”).
* **Trash**: items older than **7 days** purged weekly.

**Low-space protocol**:

* If an IndexedDB write throws `QuotaExceededError`:

  1. Drop oldest **previews** until under 90% threshold; retry.
  2. Drop oldest **autosaves** globally; retry.
  3. Offer user to export & purge local library.
* Surface a persistent banner if space remains critically low.

---

## 10) Security & privacy

* **No encryption**: everything stored in browser storage under the site origin.
* **PII caution**: warn users not to store sensitive data.
* **CSP**: no remote loads during I/O; PNG previews are data URLs only.
* **Clear data**: Library → Settings exposes “Export full library” and “Erase all local data”.

---

## 11) Migration strategy

* **Versioned DB**: `netmap:vN`.
* On upgrade (schema bump):

  * Open old DB(s), iterate records, run **pure migrators** `migrate(vOld→vNew)` (document/theme transformations).
  * For each doc: recompute canonical hash after migration.
  * Write into new DB, then delete old DB (after success).
* **Manifest bump**: add fields with defaults; never remove required ones without migration.

**Migrator interface**

```ts
type Migrator = (doc: any) => any; // must be pure and idempotent
const MIGRATIONS: Record<number /*from*/, Migrator> = {
  0: migrate0to1,
  1: migrate1to2,
};
```

---

## 12) Library UI contract

* **Library Page** lists maps (title, tags, modifiedAt, profile icon, preview).
* **Actions**: Open • Rename • Duplicate • Export • Move to Trash.
* **Search** by title/tags; **Sort** by modifiedAt/createdAt/title.
* **Bulk export** produces a `.netmap.zip` bundle (IO-SPEC).
* **Theme Manager** tab lists themes; apply to selection; export/import themes.

---

## 13) Programmatic API

```ts
// boot
await storage.init(); // opens/creates DB, loads manifest

// manifest
const m = await storage.getManifest();
await storage.updateManifest(mutatorFn); // atomic, with retry

// docs
await storage.saveDoc(docId, graphDoc, { updateManifest: true }); // computes hash internally
const doc = await storage.loadDoc(docId);
await storage.deleteDoc(docId, { toTrash: true });

// previews
await storage.savePreview(docId, dataURL, width, height);
const preview = await storage.loadPreview(docId);

// autosaves
await storage.writeAutosave(docId, graphDoc);
const latestAuto = await storage.getLatestAutosave(docId);
await storage.gcAutosaves({ maxPerDoc: 5, maxAgeDays: 30 });

// snapshots
await storage.writeSnapshot(docId, graphDoc, { label?: string });
const snaps = await storage.listSnapshots(docId);
await storage.deleteSnapshot(docId, seq);

// aliases
const aliases = await storage.getAliases();
await storage.mergeAliases(partialAliases);

// prefs
await storage.setPref("editor.zoom", 1.0);
const zoom = await storage.getPref("editor.zoom");

// trash
await storage.restoreFromTrash(docId);
await storage.gcTrash({ maxAgeDays: 7 });
```

**All multi-object mutations** (e.g., doc + manifest + preview) use a **single IndexedDB transaction**.

---

## 14) Error handling & UX messages

* **DBOpenError**: show blocking modal with guidance; fall back to localStorage minimal mode.
* **QuotaExceeded**: run GC, retry; if still failing → banner with “Export library” and “Purge caches” CTAs.
* **Corruption / JSON parse** on load: move offending record to **Trash**, log details, notify user with option to export raw JSON.

---

## 15) Performance targets

* Load Library (manifest + previews metadata) **< 50 ms** (previews lazy).
* Open doc (100 nodes) from IndexedDB **< 20 ms**.
* Save doc (including manifest update) **< 25 ms**; preview generation is **debounced** and runs after save.
* Autosave write **< 35 ms** typical.

---

## 16) Test plan (storage-specific)

1. **Cold boot** creates DB & manifest idempotently.
2. **Create 100 docs** and verify manifest consistency after reload.
3. **Autosave ring** fills and wraps; recovery banner shows when hashes differ.
4. **Quota simulation** triggers GC in the correct order (previews → autosaves).
5. **Trash restore** roundtrip preserves hash and modifiedAt ordering.
6. **Migration** from v0 to v1 transforms docs and recomputes hashes deterministically.
7. **Multi-tab lock** shows read-only banner in second tab; “Take control” works.
8. **Corrupted record** is quarantined to Trash with an export option.

---

## 17) Implementation checklist

* [ ] IndexedDB wrapper with transactions & retries.
* [ ] Manifest read/write with optimistic concurrency (modifiedAt check).
* [ ] Doc save pipeline (canonicalize → hash → write doc + manifest).
* [ ] Preview renderer & saver (debounced, size-capped).
* [ ] Autosave timer & recovery flow.
* [ ] Snapshot manager UI.
* [ ] Trash bin & GC jobs.
* [ ] BroadcastChannel lock + fallback heartbeat.
* [ ] Migration framework & one test migrator.
* [ ] Low-space GC & UX banners.
* [ ] Full error taxonomy surfaced to UI.

---

**This persistence layer is binding.** Any write that leaves the manifest and object stores inconsistent, any “silent” failure to save, or any mutation that is not a single logical transaction from the user’s perspective is **not acceptable**.
