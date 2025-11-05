import { useAppStore } from '../../lib/store'
import { useMemo } from 'react'

const nodeShapes = ['round-rectangle','rectangle','ellipse','diamond','hexagon','octagon'] as const
const lineStyles = ['solid','dashed','dotted'] as const

export default function StylePanel() {
  const cy = useAppStore((s) => s.cy)
  const routing = useAppStore((s) => s.routing)
  const setRouting = useAppStore((s) => s.setRouting)
  const layout = useAppStore((s) => s.layout)
  const setLayout = useAppStore((s) => s.setLayout)

  const sels = useMemo(() => {
    if (!cy) return { nodes: 0, edges: 0 }
    const sel = cy.$(':selected')
    return { nodes: sel.nodes().length, edges: sel.edges().length }
  }, [cy, cy?.scratch('_selTick')]) // cheap recompute hook if needed

  const applyToSelection = (fn: (eles: cytoscape.CollectionReturnValue) => void) => {
    if (!cy) return
    const sel = cy.$(':selected')
    if (sel.empty()) return
    fn(sel)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold">Appearance & Layout</h2>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-gray-700">Edge routing</legend>
        <div className="flex gap-2 text-sm">
          <button onClick={() => setRouting('straight')}
                  className={`px-2 py-1 rounded border ${routing==='straight'?'bg-gray-900 text-white':'bg-white'}`}>
            Straight
          </button>
          <button onClick={() => setRouting('curved')}
                  className={`px-2 py-1 rounded border ${routing==='curved'?'bg-gray-900 text-white':'bg-white'}`}>
            Curved
          </button>
          <button onClick={() => setRouting('orth')}
                  className={`px-2 py-1 rounded border ${routing==='orth'?'bg-gray-900 text-white':'bg-white'}`}
                  title="Uses ELK + orthogonal routing">
            Orthogonal
          </button>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-gray-700">Layout intent</legend>
        <div className="flex flex-wrap gap-2 text-sm">
          {(['force','hierarchy','concentric','grid','preset'] as const).map(k => (
            <button key={k}
              onClick={() => setLayout(k)}
              className={`px-2 py-1 rounded border capitalize ${layout===k?'bg-gray-900 text-white':'bg-white'}`}
            >{k}</button>
          ))}
        </div>
      </fieldset>

      <div className="h-px bg-gray-200" />

      <div>
        <h3 className="text-sm font-semibold">Selection styling</h3>
        <p className="text-[11px] text-gray-500 mb-2">
          Selected: {sels.nodes} nodes, {sels.edges} edges
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs w-28">Node fill</label>
            <input type="color" onChange={(e) => applyToSelection(sel => sel.nodes().data('bg', e.target.value))} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs w-28">Node text</label>
            <input type="color" onChange={(e) => applyToSelection(sel => sel.nodes().data('textColor', e.target.value))} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs w-28">Node shape</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              onChange={(e) => applyToSelection(sel => sel.nodes().data('shape', e.target.value))}
            >
              {nodeShapes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="h-px bg-gray-200" />

          <div className="flex items-center gap-2">
            <label className="text-xs w-28">Edge color</label>
            <input type="color" onChange={(e) => applyToSelection(sel => sel.edges().data('lineColor', e.target.value))} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs w-28">Edge style</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              onChange={(e) => applyToSelection(sel => sel.edges().data('lineStyle', e.target.value))}
            >
              {lineStyles.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
