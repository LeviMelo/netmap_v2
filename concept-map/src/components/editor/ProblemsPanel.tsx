import { useAppStore } from '../../lib/store'
import { computeProblems } from '../../modules/validate/problems'
import type cytoscape from 'cytoscape'

export default function ProblemsPanel() {
  const problems = useAppStore((s) => s.problems)
  const cy = useAppStore((s) => s.cy)

  const fixParallels = () => {
    if (!cy) return
    const keyed: Record<string, cytoscape.CollectionReturnValue> = {}
    cy.edges().forEach((e) => {
      const k = `${e.source().id()}->${e.target().id()}`
      ;(keyed[k] ??= cy.collection()).merge(e)
    })
    Object.values(keyed).forEach((col) => {
      if (col.length > 1) {
        // Keep first; merge labels; remove others
        const keep = col[0]
        const labels = col.map((e) => e.data('label')).filter(Boolean)
        keep.data('label', Array.from(new Set(labels)).join(' | '))
        col.slice(1).remove()
      }
    })
    refresh(cy)
  }

  const connectComponents = () => {
    if (!cy) return
    const comps = cy.elements().components()
    if (comps.length < 2) return
    // naive: connect first node of comp[i] to first of comp[0]
    const base = comps[0].nodes()[0]
    for (let i = 1; i < comps.length; i++) {
      const other = comps[i].nodes()[0]
      cy.add({ data: { source: base.id(), target: other.id(), label: '' } })
    }
    refresh(cy)
  }

  const dropSelfLoops = () => {
    if (!cy) return
    cy.edges().forEach((e) => {
      if (e.source().id() === e.target().id()) e.remove()
    })
    refresh(cy)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Problems</h2>
        <div className="flex gap-2">
          <button onClick={fixParallels} className="px-2 py-1 text-xs rounded border">Fix parallels</button>
          <button onClick={connectComponents} className="px-2 py-1 text-xs rounded border">Connect components</button>
          <button onClick={dropSelfLoops} className="px-2 py-1 text-xs rounded border">Drop self-loops</button>
        </div>
      </div>
      {problems.length === 0 ? (
        <p className="text-xs text-gray-600">No blocking issues detected.</p>
      ) : (
        <ul className="text-xs text-gray-800 space-y-1">
          {problems.map((p) => (
            <li key={p.id} className="flex items-start gap-2">
              <span className={`inline-flex h-4 w-4 rounded-full mt-0.5 ${p.severity==='error'?'bg-red-500':'bg-yellow-400'}`} />
              <span><b>{p.kind}</b> — {p.info}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function refresh(cy: cytoscape.Core) {
  const { setProblems, layout, routing } = useAppStore.getState()
  // light-touch re-layout for clarity (match current routing/layout)
  if (routing === 'orth') {
    cy.layout({
      name: 'elk',
      nodeDimensionsIncludeLabels: true,
      fit: true,
      elk: { 'elk.algorithm': 'layered', 'elk.edgeRouting': 'ORTHOGONAL' } as any,
    }).run()
  } else if (layout === 'force') {
    cy.layout({ name: 'cose', fit: true, nodeDimensionsIncludeLabels: true }).run()
  } else if (layout === 'hierarchy') {
    cy.layout({ name: 'breadthfirst', fit: true, nodeDimensionsIncludeLabels: true, directed: true }).run()
  } else if (layout === 'concentric') {
    cy.layout({ name: 'concentric', fit: true, nodeDimensionsIncludeLabels: true, minNodeSpacing: 40 }).run()
  } else if (layout === 'grid') {
    cy.layout({ name: 'grid', fit: true, nodeDimensionsIncludeLabels: true, avoidOverlap: true }).run()
  }
  setProblems(computeProblems(cy))
}
