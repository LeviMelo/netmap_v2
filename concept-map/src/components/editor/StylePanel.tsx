import { useAppStore } from '../../lib/store'

export default function StylePanel() {
  const routing = useAppStore((s) => s.routing)
  const setRouting = useAppStore((s) => s.setRouting)
  const layout = useAppStore((s) => s.layout)
  const setLayout = useAppStore((s) => s.setLayout)

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">Appearance & Layout</h2>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-gray-700">Edge routing</legend>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setRouting('straight')}
            className={`px-2 py-1 rounded border ${routing==='straight'?'bg-gray-900 text-white':'bg-white'}`}
          >Straight</button>
          <button
            onClick={() => setRouting('curved')}
            className={`px-2 py-1 rounded border ${routing==='curved'?'bg-gray-900 text-white':'bg-white'}`}
          >Curved</button>
          <button
            onClick={() => setRouting('orth')}
            className={`px-2 py-1 rounded border ${routing==='orth'?'bg-gray-900 text-white':'bg-white'}`}
            title="Uses ELK with orthogonal routing"
          >Orthogonal</button>
        </div>
        <p className="text-[11px] text-gray-500">Labels stay horizontal; orthogonal uses ELK layout for 90° segments.</p>
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
    </div>
  )
}
