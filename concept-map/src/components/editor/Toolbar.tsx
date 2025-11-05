import { useEffect, useState } from 'react'
import { useAppStore } from '../../lib/store'

const KEY_PREFIX = 'conceptmap:map:'

export default function Toolbar() {
  const cy = useAppStore((s) => s.cy)
  const [names, setNames] = useState<string[]>([])
  const [selected, setSelected] = useState<string>('')

  useEffect(() => {
    refreshNames()
    // hash open: #open=name
    const h = decodeURIComponent((location.hash||'').replace(/^#/, ''))
    if (h.startsWith('open=')) {
      const nm = h.slice(5)
      if (nm) { setSelected(nm); setTimeout(loadLocal, 0) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy])

  const refreshNames = () => {
    const ks = Object.keys(localStorage).filter(k => k.startsWith(KEY_PREFIX))
    const ns = ks.map(k => k.slice(KEY_PREFIX.length)).sort()
    setNames(ns)
    if (ns.length && !ns.includes(selected)) setSelected(ns[0])
  }

  const exportJSON = () => {
    if (!cy) return
    const payload = buildPayload(cy)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'map.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const exportPNG = () => {
    if (!cy) return
    const png = cy.png({ full: true, scale: 2, bg: 'white' })
    const a = document.createElement('a')
    a.href = png
    a.download = 'map.png'
    a.click()
  }

  const exportSVG = () => {
    if (!cy) return
    const svg = (cy as any).svg({ full: true, scale: 1, bg: 'white' })
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'map.svg'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const saveLocal = async () => {
    if (!cy) return
    const name = prompt('Save as (name):', selected || 'untitled')
    if (!name) return
    localStorage.setItem(KEY_PREFIX + name, JSON.stringify(buildPayload(cy)))
    refreshNames()
    setSelected(name)
  }

  const loadLocal = () => {
    if (!cy || !selected) return
    const raw = localStorage.getItem(KEY_PREFIX + selected)
    if (!raw) return
    try {
      const payload = JSON.parse(raw)
      cy.elements().remove()
      if (payload?.elements) cy.add(payload.elements)
      cy.layout({ name: 'cose', fit: true, nodeDimensionsIncludeLabels: true }).run()
    } catch { alert('Invalid saved payload') }
  }

  const deleteLocal = () => {
    if (!selected) return
    if (!confirm(`Delete "${selected}"?`)) return
    localStorage.removeItem(KEY_PREFIX + selected)
    refreshNames()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={saveLocal} className="px-2 py-1 text-xs rounded border">Save</button>
      <select value={selected} onChange={(e) => setSelected(e.target.value)} className="text-xs border rounded px-2 py-1">
        {names.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <button onClick={loadLocal} className="px-2 py-1 text-xs rounded border">Load</button>
      <button onClick={deleteLocal} className="px-2 py-1 text-xs rounded border">Delete</button>

      <span className="mx-2 h-4 w-px bg-gray-300 inline-block" />

      <button onClick={exportJSON} className="px-2 py-1 text-xs rounded border">Export JSON</button>
      <button onClick={exportPNG} className="px-2 py-1 text-xs rounded border">Export PNG</button>
      <button onClick={exportSVG} className="px-2 py-1 text-xs rounded border">Export SVG</button>
    </div>
  )
}

function buildPayload(cy: cytoscape.Core) {
  const eles = cy.elements().jsons()
  return { elements: eles }
}
