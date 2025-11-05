import type cytoscape from 'cytoscape'
import type { Problem } from '../../lib/store'

export function computeProblems(cy: cytoscape.Core): Problem[] {
  const probs: Problem[] = []

  // Self-loops
  cy.edges().forEach((e) => {
    const s = e.source().id()
    const t = e.target().id()
    if (s === t) {
      probs.push({
        id: e.id(),
        kind: 'selfloop',
        severity: 'error',
        info: `Self-loop on ${s}`,
      })
    }
  })

  // Parallel A->B duplicates
  const keyed: Record<string, string[]> = {}
  cy.edges().forEach((e) => {
    const k = `${e.source().id()}->${e.target().id()}`
    ;(keyed[k] ??= []).push(e.id())
  })
  Object.entries(keyed).forEach(([k, ids]) => {
    if (ids.length > 1) {
      probs.push({
        id: `parallel:${k}`,
        kind: 'parallel',
        severity: 'error',
        info: `Parallel edges ${k} (${ids.length})`,
      })
    }
  })

  // Components
  const comps = cy.elements().components()
  if (comps.length > 1) {
    probs.push({
      id: `components:${comps.length}`,
      kind: 'components',
      severity: 'error',
      info: `Graph split into ${comps.length} components`,
    })
  }

  return probs
}
