import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import elk from 'cytoscape-elk'
import edgehandles from 'cytoscape-edgehandles'
import svg from 'cytoscape-svg'
import { useAppStore, type LayoutKind, type Routing } from '../../lib/store'
import { computeProblems } from '../../modules/validate/problems'
import LabelEditor from './LabelEditor'
import InfoBubble from './InfoBubble'

elk(cytoscape)
edgehandles(cytoscape)
svg(cytoscape)

export default function Canvas() {
  const ref = useRef<HTMLDivElement>(null)
  const routing = useAppStore((s) => s.routing)
  const layoutKind = useAppStore((s) => s.layout)
  const setCy = useAppStore((s) => s.setCy)
  const setProblems = useAppStore((s) => s.setProblems)
  const setEditing = useAppStore((s) => s.setEditing)
  const setHover = useAppStore((s) => s.setHover)

  useEffect(() => {
    if (!ref.current) return

    const cy = cytoscape({
      container: ref.current,
      elements: seedElements(),
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(bg)',
            'shape': 'data(shape)',
            'label': 'data(label)',
            'text-wrap': 'wrap',
            'text-max-width': 'data(nLabelMax)',
            'font-size': 'data(nFont)',
            'color': 'data(textColor)',
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
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'width': 2,
            'line-color': 'data(lineColor)',
            'target-arrow-color': 'data(lineColor)',
            'line-style': 'data(lineStyle)',
            'control-point-distance': 'data(cpd)',
            'control-point-weight': 0.5,

            // Labels: horizontal w/ offsets
            'label': 'data(label)',
            'text-rotation': 'none',
            'text-wrap': 'wrap',
            'text-max-width': 'data(eLabelMax)',
            'text-margin-x': 'data(labelOffsetX)',
            'text-margin-y': 'data(labelOffsetY)',
            'font-size': 'data(eFont)',
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
      edgeParams: () => ({ data: { label: '', lineColor: '#334155', lineStyle: 'solid', eFont: 11, eLabelMax: 200, labelOffsetX: 0, labelOffsetY: 0, cpd: 0 } }),
    })

    // Inline label editing (dbl)
    cy.on('dbltap', 'node, edge', (ev) => {
      const ele = ev.target
      const kind = ele.isNode() ? 'node' : 'edge'
      const val = ele.data('label') ?? ''
      const pos = kind === 'node' ? ele.renderedPosition() : toRendered(cy, ele.midpoint())
      useAppStore.getState().setEditing({
        id: ele.id(), kind, value: val, renderedX: pos.x, renderedY: pos.y,
      })
    })

    // Hover info bubble
    cy.on('mouseover', 'node, edge', (ev) => {
      const ele = ev.target
      const kind = ele.isNode() ? 'node' : 'edge'
      const pos = kind === 'node' ? ele.renderedPosition() : toRendered(cy, ele.midpoint())
      if (kind === 'node') {
        setHover({
          id: ele.id(), kind,
          renderedX: pos.x, renderedY: pos.y,
          headline: ele.data('label') || ele.id(),
          detail: `shape=${ele.data('shape')}, fill=${ele.data('bg')}, text=${ele.data('textColor')}`
        })
      } else {
        const s = ele.source().data('label') || ele.source().id()
        const t = ele.target().data('label') || ele.target().id()
        setHover({
          id: ele.id(), kind,
          renderedX: pos.x, renderedY: pos.y,
          headline: ele.data('label') || '(unlabeled)',
          detail: `${s} → ${t} | color=${ele.data('lineColor')} style=${ele.data('lineStyle')}`
        })
      }
    })
    cy.on('mouseout', 'node, edge', () => setHover(undefined))

    // Problems + parallel separation
    const refreshAll = () => {
      recomputeParallelStyles(cy)
      setProblems(computeProblems(cy))
    }
    cy.on('add remove data position', refreshAll)
    refreshAll()

    setCy(cy)
    runLayout(cy, layoutKind, routing)

    return () => {
      setCy(undefined)
      setHover(undefined)
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
      <LabelEditor />
      <InfoBubble />
    </div>
  )
}

function runLayout(cy: cytoscape.Core, kind: LayoutKind, routing: Routing) {
  const curve =
    routing === 'straight' ? 'straight' :
    routing === 'curved' ? 'bezier' :
    'bezier'
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

function seedElements() {
  return [
    { data: { id: 'A', label: 'Node A', bg: '#2563eb', shape: 'round-rectangle', textColor: '#ffffff', nFont: 12, nLabelMax: 160 } },
    { data: { id: 'B', label: 'Node B', bg: '#10b981', shape: 'round-rectangle', textColor: '#ffffff', nFont: 12, nLabelMax: 160 } },
    { data: { id: 'C', label: 'Node C', bg: '#ef4444', shape: 'round-rectangle', textColor: '#ffffff', nFont: 12, nLabelMax: 160 } },
    { data: { id: 'e1', source: 'A', target: 'B', label: 'leads to', lineColor: '#334155', lineStyle: 'solid', eFont: 11, eLabelMax: 200, labelOffsetX: 0, labelOffsetY: 0, cpd: 0 } },
    { data: { id: 'e2', source: 'A', target: 'B', label: 'also relates to', lineColor: '#334155', lineStyle: 'dashed', eFont: 11, eLabelMax: 200, labelOffsetX: 0, labelOffsetY: 0, cpd: 0 } },
    { data: { id: 'e3', source: 'B', target: 'C', label: 'causes',   lineColor: '#334155', lineStyle: 'solid', eFont: 11, eLabelMax: 200, labelOffsetX: 0, labelOffsetY: 0, cpd: 0 } },
  ]
}

function toRendered(cy: any, model: { x: number; y: number }) {
  const z = cy.zoom()
  const p = cy.pan()
  return { x: model.x * z + p.x, y: model.y * z + p.y }
}

/** Assign symmetric control-point distances to parallel edges for visual separation. */
function recomputeParallelStyles(cy: cytoscape.Core) {
  const buckets: Record<string, cytoscape.CollectionReturnValue> = {}
  cy.edges().forEach((e) => {
    const k = `${e.source().id()}->${e.target().id()}`
    ;(buckets[k] ??= cy.collection()).merge(e)
  })
  const step = 24 // px offset step
  Object.values(buckets).forEach((col) => {
    const n = col.length
    if (n <= 1) {
      col[0]?.data('cpd', 0)
      return
    }
    // symmetric sequence: for n=2 => [-12, +12]; n=3 => [-24, 0, +24]; n=4 => [-36, -12, +12, +36], etc.
    const offsets: number[] = []
    const center = (n % 2 === 1) ? 0 : null
    const half = Math.floor(n / 2)
    for (let i = 1; i <= half; i++) offsets.push(-((half - i + 1) * step))
    if (center === 0) offsets.push(0)
    for (let i = 1; i <= half; i++) offsets.push((i) * step)
    // assign in stable order
    col.forEach((e, idx) => e.data('cpd', offsets[idx] ?? 0))
  })
}
