export type NodeId = string
export type EdgeId = string

export type NodeModel = {
  id: NodeId
  label: string
  style?: Record<string, unknown>
}

export type EdgeModel = {
  id: EdgeId
  from: NodeId
  to: NodeId
  label?: string
  style?: Record<string, unknown>
}

export type MapModel = {
  id: string
  name: string
  nodes: NodeModel[]
  edges: EdgeModel[]
  // layout intent, groups, constraints, positions will be added incrementally
}
