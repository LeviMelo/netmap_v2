import { create } from 'zustand'
import type cytoscape from 'cytoscape'

export type Routing = 'straight' | 'curved' | 'orth'
export type LayoutKind = 'hierarchy' | 'force' | 'concentric' | 'grid' | 'preset'

export type Problem = {
  id: string
  kind: 'components' | 'parallel' | 'selfloop'
  severity: 'error' | 'warn'
  info: string
}

export type EditTarget = {
  id: string
  kind: 'node' | 'edge'
  value: string
  renderedX: number
  renderedY: number
}

export type HoverInfo = {
  id: string
  kind: 'node' | 'edge'
  renderedX: number
  renderedY: number
  headline: string
  detail?: string
}

type State = {
  cy?: cytoscape.Core
  setCy: (cy?: cytoscape.Core) => void

  routing: Routing
  setRouting: (r: Routing) => void

  layout: LayoutKind
  setLayout: (l: LayoutKind) => void

  problems: Problem[]
  setProblems: (ps: Problem[]) => void

  editing?: EditTarget
  setEditing: (e?: EditTarget) => void

  hover?: HoverInfo
  setHover: (h?: HoverInfo) => void
}

export const useAppStore = create<State>((set) => ({
  cy: undefined,
  setCy: (cy) => set({ cy }),

  routing: 'curved',
  setRouting: (routing) => set({ routing }),

  layout: 'force',
  setLayout: (layout) => set({ layout }),

  problems: [],
  setProblems: (problems) => set({ problems }),

  editing: undefined,
  setEditing: (editing) => set({ editing }),

  hover: undefined,
  setHover: (hover) => set({ hover }),
}))
