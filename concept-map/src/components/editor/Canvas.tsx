import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import elk from 'cytoscape-elk'
import edgehandles from 'cytoscape-edgehandles'
import { useAppStore, type LayoutKind, type Routing } from '../../lib/store'
import { computeProblems } from '../../modules/validate/problems'

// register plugins (once per module load)
elk(cytoscape)
edgehandles(cytoscape)

export default function Canvas() {
  const ref = useRef<HTMLDivElement>(null)
  const routing = useAppStore((s) => s.routing)
  const layoutKind = useAppStore((s) => s.layout)
  const setCy = useAppStore((s) => s.setCy)
  const setProblems = useAppStore((s) => s.setProblems)

  useEffect(() => {
    if (!ref.current) return

    const cy = cytoscape({
      container: ref.current,
      elements: [
        // demo seed
        { data: { id: 'A', label: 'Node A' } },
        { data: { id: 'B', label: 'Node B' } },
        { data: { id: 'C', label: 'Node C' } },
        { data: { id: 'e1', source: 'A', target: 'B', label: 'leads to' } },
        { data: { id: 'e2', source: 'B', target: 'C', label: 'causes' } },
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#2563eb',
            'shape': 'round-rectangle',
            'label': 'data(label)',
            'text-wrap': 'wrap',
            'text-max-width': 140,
            'font-size': 12,
            'color': '#fff',
            'text-outline-width': 2,
            'text-outline-color': '#1f2937',
            'text-halign': 'center',
            'text-valign': 'center',
            'padding': '8px',
            'width': 'label',
            'height': 'label',
          },
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier', // default; may switch dynamically
            'target-arrow-shape': 'triangle',
            'width': 2,
            'line-color': '#334155',
            'target-arrow-color': '#334155',

            // Labels: strictly horizontal
            'label': 'data(label)',
            'text-rotation': 'none',
            'text-wrap': 'wrap',
            'text-max-width': 160,
            'font-size': 11,
            'color': '#ffffff',
            'text-background-opacity': 0.85,
            'text-background-color': '#0f172a',
            'text-background-shape': 'round-rectangle',
            'text-outline-width': 2,
            'text-outline-color': '#0f172a',
          },
        },
        {
          selector: ':selected',
          style: {
            'overlay-color': '#60a5fa',
            'overlay-opacity': 0.15,
            'border-width': 2,
            'border-color': '#60a5fa',
          },
        },
      ],
      wheelSensitivity: 0.25,
      pixelRatio: 1,
      minZoom: 0.2,
      maxZoom: 3,
      layout: { name: 'cose', nodeDimensionsIncludeLabels: true },
    })

    const eh = (cy as any).edgehandles({
      handleNodes: 'node',
      handleColor: '#2563eb',
      handleSize: 10,
      loopAllowed: () => false,
      edgeParams: () => ({ data: { label: '' } }),
    })

    const updateProblems = () => setProblems(computeProblems(cy))
    cy.on('add remove data position', updateProblems)
    updateProblems()

    setCy(cy)
    runLayout(cy, layoutKind, routing)

    return () => {
      setCy(undefined)
      try { eh.destroy() } catch {}
      cy.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // React to routing/layout changes
  useEffect(() => {
    const cy = useAppStore.getState().cy
    if (!cy) return
    runLayout(cy, layoutKind, routing)
  }, [routing, layoutKind])

  return (
    <div ref={ref} className="h-full w-full bg-[--color-canvas-50] rounded relative">
      <div className="absolute bottom-2 left-2 text-xs text-gray-600 px-1.5 py-0.5 bg-white/70 rounded">
        Canvas
      </div>
    </div>
  )
}

function runLayout(cy: cytoscape.Core, kind: LayoutKind, routing: Routing) {
  // Edge routing (style)
  const curve =
    routing === 'straight' ? 'straight' :
    routing === 'curved' ? 'bezier' :
    'bezier' // orth uses ELK below
  cy.style().selector('edge').style('curve-style', curve).update()

  if (routing === 'orth') {
    cy.layout({
      name: 'elk',
      nodeDimensionsIncludeLabels: true,
      fit: true,
      elk: {
        'elk.algorithm': 'layered',
        'elk.direction': kind === 'hierarchy' ? 'RIGHT' : 'RIGHT',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.layered.spacing.nodeNodeBetweenLayers': 80,
      } as any,
    }).run()
    return
  }

  if (kind === 'hierarchy') {
    cy.layout({
      name: 'breadthfirst',
      directed: true,
      avoidOverlap: true,
      nodeDimensionsIncludeLabels: true,
      spacingFactor: 1.2,
      fit: true,
    }).run()
  } else if (kind === 'concentric') {
    cy.layout({
      name: 'concentric',
      nodeDimensionsIncludeLabels: true,
      minNodeSpacing: 40,
      concentric: (n) => n.degree(),
      levelWidth: () => 2,
      fit: true,
    }).run()
  } else if (kind === 'grid') {
    cy.layout({
      name: 'grid',
      nodeDimensionsIncludeLabels: true,
      fit: true,
      avoidOverlap: true,
    }).run()
  } else if (kind === 'preset') {
    cy.layout({ name: 'preset', fit: true }).run()
  } else {
    cy.layout({
      name: 'cose',
      nodeDimensionsIncludeLabels: true,
      fit: true,
      animate: 'end',
    }).run()
  }
}
