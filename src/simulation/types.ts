import type {
  CalculationStatus,
  CalculationTrace,
  Diagnostic,
  NodeRunStatus,
  StreamRunStatus,
} from '../engine'
import type { EquipmentKind } from '../types/process'

export type SimulationMode = 'engine'
export type SimulationViewStatus = 'pending' | CalculationStatus
export type UiEquipmentStatus = NodeRunStatus | 'unavailable'
export type UiStreamStatus = StreamRunStatus | 'unavailable'

/** Engine stream values converted back to the units used by the workbench UI. */
export interface UiStreamState {
  flowTph: number
  temperatureC: number
  pressureBar: number
  compositionAWt: number
  compositionBWt: number
}

export interface UiStreamResult {
  edgeId: string
  tag: string
  name: string
  status: UiStreamStatus
  state: UiStreamState | null
  diagnostics: Diagnostic[]
}

export interface UiEquipmentResult {
  nodeId: string
  tag: string
  kind: EquipmentKind
  status: UiEquipmentStatus
  dutyKW: number | null
  diagnostics: Diagnostic[]
  trace: CalculationTrace[]
}

export interface UiBalanceComponent {
  componentId: string
  feedTph: number | null
  productTph: number | null
  differenceTph: number | null
}

export interface UiBalances {
  status: 'calculated' | 'unavailable'
  totalFeedTph: number | null
  totalProductTph: number | null
  closurePercent: number | null
  components: UiBalanceComponent[]
}

export interface UiSimulationSummary {
  totalFeedTph: number | null
  productFlowTph: number | null
  outletTemperatureC: number | null
  feedTemperatureC: number | null
  netDutyKW: number | null
  heatingDutyKW: number | null
  coolingDutyKW: number | null
  massClosure: number | null
  unitCount: number
  streamCount: number
  feedCount: number
  productCount: number
}

export interface UiMaterialRow {
  edgeId: string
  tag: string
  name: string
  from: string
  to: string
  fromTag: string
  toTag: string
  status: UiStreamStatus
  stream: UiStreamState | null
}

export interface UiEnergyRow {
  nodeId: string
  tag: string
  name: string
  category: EquipmentKind
  status: UiEquipmentStatus
  dutyKW: number | null
  share: number | null
  note: string
}

export interface UiChartPoint {
  label: string
  value: number
}

export interface UiSimulationView {
  mode: SimulationMode
  status: SimulationViewStatus
  runId: string | null
  executedAt: string | null
  modelVersion: string | null
  propertyPackageId: string | null
  propertyPackageName: string
  propertyPackageDisclaimer: string
  heatCapacityKJPerKgK: number
  diagnostics: Diagnostic[]
  equipment: Record<string, UiEquipmentResult>
  streams: Record<string, UiStreamResult>
  /** Aggregated incoming state, only present when all incoming streams calculated. */
  nodeInputs: Record<string, UiStreamState>
  /** Calculated outgoing/boundary state, only present for a valid result. */
  nodeOutputs: Record<string, UiStreamState>
  edgeStreams: Record<string, UiStreamState>
  summary: UiSimulationSummary
  materialRows: UiMaterialRow[]
  energyRows: UiEnergyRow[]
  balances: UiBalances
  traces: Record<string, CalculationTrace[]>
  temperatureProfile: UiChartPoint[]
  flowProfile: UiChartPoint[]
}

export interface EngineRunOutcome {
  view: UiSimulationView
  revision: number
  ranAt: number
}
