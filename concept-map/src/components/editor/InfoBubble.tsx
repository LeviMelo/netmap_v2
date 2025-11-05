import { useAppStore } from '../../lib/store'

export default function InfoBubble() {
  const hover = useAppStore((s) => s.hover)
  if (!hover) return null
  return (
    <div
      className="absolute z-40 text-xs bg-white border shadow rounded px-2 py-1 max-w-[280px] pointer-events-none"
      style={{ left: hover.renderedX + 12, top: hover.renderedY + 12 }}
    >
      <div className="font-semibold">{hover.headline}</div>
      {hover.detail ? <div className="text-gray-600 mt-0.5">{hover.detail}</div> : null}
    </div>
  )
}
