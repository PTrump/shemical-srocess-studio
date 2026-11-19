import type { Diagnostic } from './diagnostics'
import type { DomainEquipmentKind } from './equipment'
import type { Stream } from './stream'

export type CalculationStatus = 'success' | 'partial' | 'failed'
export type StreamRunStatus = 'calculated' | 'blocked' | 'invalid'
export type NodeRunStatus =
  | 'calculated'
  | 'blocked'
  | 'failed'
  | 'unsupported'

export interface StreamRun {
  edgeId: string
  status: StreamRunStatus
  stream: Stream | null
  diagnostics: Diagnostic[]
}

export type TraceValue = string | number | boolean | null

export interface CalculationTrace {
  step: string
  method: string
  formula: string
  inputs: Record<string, TraceValue>
  outputs: Record<string, TraceValue>
  assumptions: string[]
}

export interface EquipmentRun {
  nodeId: string
  tag: string
  kind: DomainEquipmentKind
  status: NodeRunStatus
  inletEdgeIds: string[]
  outletEdgeIds: string[]
  dutyW: number | null
  diagnostics: Diagnostic[]
  trace: CalculationTrace[]
}

export interface ComponentBalance {
  componentId: string
  feedKgS: number | null
  productKgS: number | null
  differenceKgS: number | null
}

export interface EngineBalances {
  status: 'calculated' | 'unavailable'
  totalFeedKgS: number | null
  totalProductKgS: number | null
  closurePercent: number | null
  components: ComponentBalance[]
}

export interface EngineRunMetadata {
  runId: string
  calculatedAt: string
  modelVersion: string
  propertyPackageId: string
}

export interface EngineResult {
  status: CalculationStatus
  run: EngineRunMetadata
  streams: Record<string, StreamRun>
  equipment: Record<string, EquipmentRun>
  diagnostics: Diagnostic[]
  balances: EngineBalances
}
