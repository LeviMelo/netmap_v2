import { useRef } from 'react'
import { useAppStore } from '../../lib/store'

export default function Toolbar() {
  const cy = useAppStore((s) => s.cy)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportJSON = () => {
    if (!cy) return
    const doc = cy.json().elements
    const blob = new Blob([JSON.stringify({ elements: doc }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'map.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJSON = async (file: File) => {
    const text = await file.text()
    let data: any
    try { data = JSON.parse(text) } catch { alert('Invalid JSON'); return }
    if (!data?.elements) { alert('Expected { "elements": ... }'); return }
    if (!cy) return
    cy.elements().remove()
    cy.add(data.elements)
    cy.layout({ name: 'cose', fit: true, nodeDimensionsIncludeLabels: true }).run()
  }

  return (
    <div className="flex gap-2">
      <button onClick={exportJSON} className="px-2 py-1 text-xs rounded border">Export JSON</button>
      <button onClick={() => fileRef.current?.click()} className="px-2 py-1 text-xs rounded border">Import JSON</button>
      <input ref={fileRef} type="file" accept="application/json" className="hidden"
             onChange={(e) => { const f=e.target.files?.[0]; if (f) importJSON(f); e.currentTarget.value='' }} />
    </div>
  )
}
