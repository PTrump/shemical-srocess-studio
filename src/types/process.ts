import type { Edge, Node } from '@xyflow/react'

export type EquipmentKind =
  | 'stream'
  | 'mixer'
  | 'heater'
  | 'cooler'
  | 'flash'
  | 'separator'
  | 'pump'

export type StreamRole = 'feed' | 'product' | 'intermediate'

export type PaletteCategory = 'stream' | 'unit'

/** All editable operating values are stored as finite numbers in SI-friendly teaching units. */
export type ProcessParams = Record<string, number>

export interface EquipmentNodeData extends Record<string, unknown> {
  kind: EquipmentKind
  label: string
  cnLabel: string
  tag: string
  role?: StreamRole
  params: ProcessParams
}

export type ProcessNode = Node<EquipmentNodeData, EquipmentKind>

export interface StreamEdgeData extends Record<string, unknown> {
  tag: string
  name: string
}

export type ProcessEdge = Edge<StreamEdgeData, 'process'>

export interface EquipmentDefinition {
  kind: EquipmentKind
  name: string
  cnName: string
  description: string
  category: PaletteCategory
  tagPrefix: string
  defaultParams: ProcessParams
}

export interface StreamState {
  flow: number
  temperature: number
  pressure: number
  compositionA: number
  compositionB: number
}

export interface MaterialBalanceRow {
  edgeId: string
  tag: string
  name: string
  from: string
  to: string
  fromTag: string
  toTag: string
  stream: StreamState
}

export interface EnergyBalanceRow {
  nodeId: string
  tag: string
  name: string
  category: EquipmentKind
  duty: number
  share: number
  note: string
}

export interface ChartPoint {
  label: string
  value: number
}

export interface SimulationSummary {
  totalFeed: number
  productFlow: number
  outletTemperature: number
  feedTemperature: number
  netDuty: number
  heatingDuty: number
  coolingDuty: number
  massClosure: number
  unitCount: number
  streamCount: number
  feedCount: number
  productCount: number
}

export interface SimulationModelInfo {
  cp: number
  density: number
  pumpEfficiency: number
}

export interface SimulationResult {
  summary: SimulationSummary
  materialBalance: MaterialBalanceRow[]
  energyBalance: EnergyBalanceRow[]
  temperatureProfile: ChartPoint[]
  flowProfile: ChartPoint[]
  nodeOutputs: Record<string, StreamState>
  edgeStreams: Record<string, StreamState>
  warnings: string[]
  model: SimulationModelInfo
}

export interface SavedFlowsheet {
  version: 1
  savedAt: string
  project: string
  nodes: ProcessNode[]
  edges: ProcessEdge[]
}
