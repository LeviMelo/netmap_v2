import { useEffect, useRef } from 'react'

export default function Canvas() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // TODO: mount Cytoscape or your renderer here
    // For now, show a placeholder grid
  }, [])

  return (
    <div ref={ref} className="h-full w-full bg-[--color-canvas-50] rounded relative">
      <div className="absolute inset-0 grid grid-cols-12 opacity-30 pointer-events-none"
           style={{ backgroundImage: 'linear-gradient(to right, rgba(0,0,0,.05) 1px, transparent 1px)', backgroundSize: '64px 100%' }} />
      <div className="absolute inset-0 grid grid-rows-12 opacity-30 pointer-events-none"
           style={{ backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,.05) 1px, transparent 1px)', backgroundSize: '100% 64px' }} />
      <div className="absolute bottom-2 left-2 text-xs text-gray-600">Canvas (placeholder)</div>
    </div>
  )
}
