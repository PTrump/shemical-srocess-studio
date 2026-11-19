import type { DomainNode } from './equipment'

export interface DomainEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  tag: string
}

export interface DomainFlowsheet {
  nodes: DomainNode[]
  edges: DomainEdge[]
}
