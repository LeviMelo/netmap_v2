import type { MapModel } from '../../lib/types'

const KEY = 'concept-map:library'

type Library = { maps: { id: string; name: string; updatedAt: number }[] }

function readLib(): Library {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { maps: [] }
    return JSON.parse(raw)
  } catch {
    return { maps: [] }
  }
}

function writeLib(lib: Library) {
  localStorage.setItem(KEY, JSON.stringify(lib))
}

export function listMaps() {
  return readLib().maps.sort((a,b) => b.updatedAt - a.updatedAt)
}

export function upsertMap(meta: { id: string; name: string }) {
  const lib = readLib()
  const idx = lib.maps.findIndex(m => m.id === meta.id)
  const now = Date.now()
  if (idx >= 0) lib.maps[idx] = { ...lib.maps[idx], name: meta.name, updatedAt: now }
  else lib.maps.unshift({ id: meta.id, name: meta.name, updatedAt: now })
  writeLib(lib)
}

export function saveMapPayload(map: MapModel) {
  localStorage.setItem(`concept-map:payload:${map.id}`, JSON.stringify(map))
  upsertMap({ id: map.id, name: map.name })
}

export function loadMapPayload(id: string): MapModel | null {
  try {
    const raw = localStorage.getItem(`concept-map:payload:${id}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
