import type cytoscape from 'cytoscape'

type Snap = any[] // cytoscape jsons()

export class History {
  private undoStack: Snap[] = []
  private redoStack: Snap[] = []
  private cy?: cytoscape.Core
  private lastHash = ''

  attach(cy: cytoscape.Core) {
    this.cy = cy
    this.capture() // initial
  }

  private hash(): string {
    if (!this.cy) return ''
    // cheap & stable-ish hash of element ids + key data
    const parts: string[] = []
    this.cy.elements().forEach(e => {
      parts.push(
        `${e.id()}|${e.isNode()?'N':'E'}|${JSON.stringify({
          data: e.data(),
          pos: e.isNode() ? e.position() : undefined
        })}`
      )
    })
    return String(parts.join('§').length) // sufficient for change gating
  }

  capture() {
    if (!this.cy) return
    const h = this.hash()
    if (h === this.lastHash) return
    this.lastHash = h
    const snap = this.cy.elements().jsons()
    this.undoStack.push(snap)
    // invalidate redo on new forward action
    this.redoStack = []
  }

  canUndo() { return this.undoStack.length > 1 }
  canRedo() { return this.redoStack.length > 0 }

  undo() {
    if (!this.cy || !this.canUndo()) return
    const current = this.cy.elements().jsons()
    const prev = this.undoStack[this.undoStack.length - 2]
    this.redoStack.push(current)
    this.undoStack.pop()
    this.apply(prev)
  }

  redo() {
    if (!this.cy || !this.canRedo()) return
    const next = this.redoStack.pop()!
    const current = this.cy.elements().jsons()
    this.undoStack.push(current)
    this.apply(next)
  }

  private apply(snap: Snap) {
    if (!this.cy) return
    this.cy.elements().remove()
    this.cy.add(snap)
    this.cy.layout({ name: 'preset', fit: true, nodeDimensionsIncludeLabels: true }).run()
    // rehash after apply
    this.lastHash = this.hash()
  }
}
