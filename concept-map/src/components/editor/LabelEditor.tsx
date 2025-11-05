import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../lib/store'

export default function LabelEditor() {
  const editing = useAppStore((s) => s.editing)
  const setEditing = useAppStore((s) => s.setEditing)
  const cy = useAppStore((s) => s.cy)
  const [val, setVal] = useState(editing?.value ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setVal(editing?.value ?? '')
    if (editing) {
      // autofocus when opening
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [editing])

  useEffect(() => {
    if (!editing || !cy) return
    const updatePos = () => {
      const e = cy.$id(editing.id)
      if (e.nonempty()) {
        const p = editing.kind === 'node'
          ? (e as any).renderedPosition()
          : toRendered(cy, (e as any).midpoint())
        useAppStore.getState().setEditing({
          ...editing,
          renderedX: p.x,
          renderedY: p.y,
        })
      }
    }
    cy.on('pan zoom position', updatePos)
    return () => { cy.removeListener('pan zoom position', updatePos as any) }
  }, [editing, cy])

  if (!editing) return null

  const commit = () => {
    if (!cy) return
    const e = cy.$id(editing.id)
    if (e.nonempty()) {
      e.data('label', val)
    }
    setEditing(undefined)
  }
  const cancel = () => setEditing(undefined)

  return (
    <div
      className="absolute z-50"
      style={{
        left: editing.renderedX - 150,
        top: editing.renderedY - 18,
        width: 300,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); cancel() }
        }}
        onBlur={commit}
        className="w-full px-2 py-1 text-sm bg-white border rounded shadow"
        placeholder="Edit label…"
      />
    </div>
  )
}

function toRendered(cy: any, model: { x: number; y: number }) {
  const z = cy.zoom()
  const p = cy.pan()
  return { x: model.x * z + p.x, y: model.y * z + p.y }
}
