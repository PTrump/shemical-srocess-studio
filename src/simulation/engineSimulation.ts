import {
  TEACHING_BINARY_FLUID,
  TEACHING_COMPONENT_A,
  TEACHING_COMPONENT_A_ID,
  TEACHING_COMPONENT_B_ID,
  adaptUiFlowsheet,
  kgPerSecondToTonnesPerHour,
  kelvinToCelsius,
  pascalToBar,
  runSimulation,
  wattsToKilowatts,
  type Diagnostic,
  type EngineResult,
  type Stream,
} from '../engine'
import type { EquipmentKind, ProcessEdge, ProcessNode } from '../types/process'
import type {
  UiBalances,
  UiChartPoint,
  UiEnergyRow,
  UiEquipmentResult,
  UiMaterialRow,
  UiSimulationSummary,
  UiSimulationView,
  UiStreamResult,
  UiStreamState,
} from './types'

export interface BuildSimulationViewInput {
  nodes: readonly ProcessNode[]
  edges: readonly ProcessEdge[]
  result: EngineResult
  adapterDiagnostics: readonly Diagnostic[]
}

export interface RunEngineSimulationOptions {
  runId?: string
  calculatedAt?: string
}

const STATUS_LABELS: Record<string, string> = {
  calculated: '已计算',
  blocked: '上游阻塞',
  failed: '计算失败',
  unsupported: '尚未支持',
  unavailable: '不可用',
  pending: '待运行',
  success: '计算成功',
  partial: '部分结果',
}

export function simulationStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

function isErrorDiagnostic(diagnostic: Diagnostic): boolean {
  return diagnostic.severity === 'error'
}

function dedupeDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>()
  const result: Diagnostic[] = []
  for (const diagnostic of diagnostics) {
    const key = JSON.stringify([
      diagnostic.code,
      diagnostic.severity,
      diagnostic.scope,
      diagnostic.message,
    ])
    if (!seen.has(key)) {
      seen.add(key)
      result.push(diagnostic)
    }
  }
  return result
}

function componentMass(stream: Stream, componentId: string): number {
  return (
    stream.components.find(
      (component) => component.componentId === componentId,
    )?.massFlowKgS ?? 0
  )
}

export function toUiStreamState(stream: Stream): UiStreamState {
  const total = stream.massFlowKgS
  const a = componentMass(stream, TEACHING_COMPONENT_A_ID)
  const b = componentMass(stream, TEACHING_COMPONENT_B_ID)
  return {
    flowTph: kgPerSecondToTonnesPerHour(total),
    temperatureC: kelvinToCelsius(stream.temperatureK),
    pressureBar: pascalToBar(stream.pressurePa),
    compositionAWt: total > 0 ? (a / total) * 100 : 0,
    compositionBWt: total > 0 ? (b / total) * 100 : 0,
  }
}

function toUiBalances(result: EngineResult): UiBalances {
  if (result.balances.status !== 'calculated') {
    return {
      status: 'unavailable',
      totalFeedTph: null,
      totalProductTph: null,
      closurePercent: null,
      components: [],
    }
  }

  const hasFiniteTotals =
    result.balances.totalFeedKgS !== null &&
    Number.isFinite(result.balances.totalFeedKgS) &&
    result.balances.totalProductKgS !== null &&
    Number.isFinite(result.balances.totalProductKgS)

  if (!hasFiniteTotals) {
    return {
      status: 'unavailable',
      totalFeedTph: null,
      totalProductTph: null,
      closurePercent: null,
      components: [],
    }
  }

  return {
    status: 'calculated',
    totalFeedTph: kgPerSecondToTonnesPerHour(
      result.balances.totalFeedKgS!,
    ),
    totalProductTph: kgPerSecondToTonnesPerHour(
      result.balances.totalProductKgS!,
    ),
    closurePercent: result.balances.closurePercent,
    components: result.balances.components.map((component) => ({
      componentId: component.componentId,
      feedTph:
        component.feedKgS === null
          ? null
          : kgPerSecondToTonnesPerHour(component.feedKgS),
      productTph:
        component.productKgS === null
          ? null
          : kgPerSecondToTonnesPerHour(component.productKgS),
      differenceTph:
        component.differenceKgS === null
          ? null
          : kgPerSecondToTonnesPerHour(component.differenceKgS),
    })),
  }
}

function weightedState(
  states: readonly UiStreamState[],
): UiStreamState | null {
  if (states.length === 0) {
    return null
  }
  const totalFlow = states.reduce((total, state) => total + state.flowTph, 0)
  if (!Number.isFinite(totalFlow) || totalFlow <= 0) {
    return null
  }
  const weighted = (key: keyof UiStreamState) =>
    states.reduce(
      (total, state) => total + state[key] * state.flowTph,
      0,
    ) / totalFlow
  return {
    flowTph: totalFlow,
    temperatureC: weighted('temperatureC'),
    pressureBar: weighted('pressureBar'),
    compositionAWt: weighted('compositionAWt'),
    compositionBWt: weighted('compositionBWt'),
  }
}

function diagnosticForNode(
  diagnostics: readonly Diagnostic[],
  nodeId: string,
): Diagnostic[] {
  return diagnostics.filter(
    (diagnostic) =>
      diagnostic.scope.type === 'node' && diagnostic.scope.nodeId === nodeId,
  )
}

function diagnosticForEdge(
  diagnostics: readonly Diagnostic[],
  edgeId: string,
): Diagnostic[] {
  return diagnostics.filter(
    (diagnostic) =>
      diagnostic.scope.type === 'edge' && diagnostic.scope.edgeId === edgeId,
  )
}

function noteForStatus(
  status: UiEquipmentResult['status'],
  diagnostics: readonly Diagnostic[],
): string {
  const firstError = diagnostics.find(isErrorDiagnostic)
  if (firstError) {
    return firstError.message
  }
  const first = diagnostics[0]
  if (first) {
    return first.message
  }
  return simulationStatusLabel(status)
}

function buildPendingView(
  nodes: readonly ProcessNode[],
  edges: readonly ProcessEdge[],
): UiSimulationView {
  const equipment: Record<string, UiEquipmentResult> = {}
  for (const node of nodes) {
    equipment[node.id] = {
      nodeId: node.id,
      tag: node.data.tag,
      kind: node.data.kind,
      status: 'unavailable',
      dutyKW: null,
      diagnostics: [],
      trace: [],
    }
  }

  const streams: Record<string, UiStreamResult> = {}
  const materialRows: UiMaterialRow[] = []
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  for (const edge of edges) {
    streams[edge.id] = {
      edgeId: edge.id,
      tag: edge.data?.tag ?? edge.id,
      name: edge.data?.name ?? 'Process stream',
      status: 'unavailable',
      state: null,
      diagnostics: [],
    }
    const from = nodeById.get(edge.source)
    const to = nodeById.get(edge.target)
    materialRows.push({
      edgeId: edge.id,
      tag: edge.data?.tag ?? edge.id,
      name: edge.data?.name ?? 'Process stream',
      from: from?.data.label ?? 'Unknown',
      to: to?.data.label ?? 'Unknown',
      fromTag: from?.data.tag ?? '—',
      toTag: to?.data.tag ?? '—',
      status: 'unavailable',
      stream: null,
    })
  }

  const energyRows: UiEnergyRow[] = nodes
    .filter((node) => node.data.kind !== 'stream')
    .map((node) => ({
      nodeId: node.id,
      tag: node.data.tag,
      name: node.data.label,
      category: node.data.kind,
      status: 'unavailable',
      dutyKW: null,
      share: null,
      note: '等待运行 Engine',
    }))

  return {
    mode: 'engine',
    status: 'pending',
    runId: null,
    executedAt: null,
    modelVersion: null,
    propertyPackageId: null,
    propertyPackageName: TEACHING_BINARY_FLUID.displayName,
    propertyPackageDisclaimer: TEACHING_BINARY_FLUID.disclaimer,
    heatCapacityKJPerKgK: TEACHING_COMPONENT_A.cpJPerKgK / 1000,
    diagnostics: [],
    equipment,
    streams,
    nodeInputs: {},
    nodeOutputs: {},
    edgeStreams: {},
    summary: {
      totalFeedTph: null,
      productFlowTph: null,
      outletTemperatureC: null,
      feedTemperatureC: null,
      netDutyKW: null,
      heatingDutyKW: null,
      coolingDutyKW: null,
      massClosure: null,
      unitCount: nodes.filter((node) => node.data.kind !== 'stream').length,
      streamCount: edges.length,
      feedCount: nodes.filter(
        (node) => node.data.kind === 'stream' && node.data.role === 'feed',
      ).length,
      productCount: nodes.filter(
        (node) => node.data.kind === 'stream' && node.data.role === 'product',
      ).length,
    },
    materialRows,
    energyRows,
    balances: {
      status: 'unavailable',
      totalFeedTph: null,
      totalProductTph: null,
      closurePercent: null,
      components: [],
    },
    traces: {},
    temperatureProfile: [],
    flowProfile: [],
  }
}

export function createPendingSimulationView(
  nodes: readonly ProcessNode[],
  edges: readonly ProcessEdge[],
): UiSimulationView {
  return buildPendingView(nodes, edges)
}

export function buildEngineSimulationView(
  input: BuildSimulationViewInput,
): UiSimulationView {
  const { nodes, edges, result, adapterDiagnostics } = input
  const diagnostics = dedupeDiagnostics([
    ...adapterDiagnostics,
    ...result.diagnostics,
  ])
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const incomingEdges = new Map<string, ProcessEdge[]>()
  const outgoingEdges = new Map<string, ProcessEdge[]>()

  for (const node of nodes) {
    incomingEdges.set(node.id, [])
    outgoingEdges.set(node.id, [])
  }
  for (const edge of edges) {
    incomingEdges.get(edge.target)?.push(edge)
    outgoingEdges.get(edge.source)?.push(edge)
  }

  const streams: Record<string, UiStreamResult> = {}
  const edgeStreams: Record<string, UiStreamState> = {}
  const materialRows: UiMaterialRow[] = []
  const temperatureProfile: UiChartPoint[] = []
  const flowProfile: UiChartPoint[] = []

  for (const edge of edges) {
    const run = result.streams[edge.id]
    const tag = edge.data?.tag ?? edge.id
    const name = edge.data?.name ?? 'Process stream'
    const state =
      run?.status === 'calculated' && run.stream
        ? toUiStreamState(run.stream)
        : null
    const status = run?.status ?? 'unavailable'
    streams[edge.id] = {
      edgeId: edge.id,
      tag,
      name,
      status,
      state,
      diagnostics: [
        ...(run?.diagnostics ?? []),
        ...diagnosticForEdge(adapterDiagnostics, edge.id),
      ],
    }
    if (state) {
      edgeStreams[edge.id] = state
      temperatureProfile.push({ label: tag, value: state.temperatureC })
      flowProfile.push({ label: tag, value: state.flowTph })
    }

    const from = nodeById.get(edge.source)
    const to = nodeById.get(edge.target)
    materialRows.push({
      edgeId: edge.id,
      tag,
      name,
      from: from?.data.label ?? 'Unknown',
      to: to?.data.label ?? 'Unknown',
      fromTag: from?.data.tag ?? '—',
      toTag: to?.data.tag ?? '—',
      status,
      stream: state,
    })
  }

  const equipment: Record<string, UiEquipmentResult> = {}
  for (const node of nodes) {
    const run = result.equipment[node.id]
    if (run) {
      equipment[node.id] = {
        nodeId: node.id,
        tag: node.data.tag,
        kind: node.data.kind,
        status: run.status,
        dutyKW:
          run.dutyW === null || !Number.isFinite(run.dutyW)
            ? null
            : wattsToKilowatts(run.dutyW),
        diagnostics: [
          ...run.diagnostics,
          ...diagnosticForNode(adapterDiagnostics, node.id),
        ],
        trace: run.trace,
      }
    } else {
      equipment[node.id] = {
        nodeId: node.id,
        tag: node.data.tag,
        kind: node.data.kind,
        status: 'unavailable',
        dutyKW: null,
        diagnostics: diagnosticForNode(adapterDiagnostics, node.id),
        trace: [],
      }
    }
  }

  const nodeInputs: Record<string, UiStreamState> = {}
  for (const node of nodes) {
    const incoming = incomingEdges.get(node.id) ?? []
    if (incoming.length === 0) {
      continue
    }
    const states = incoming
      .map((edge) => streams[edge.id]?.state)
      .filter((state): state is UiStreamState => Boolean(state))
    if (states.length !== incoming.length) {
      continue
    }
    const aggregated = weightedState(states)
    if (aggregated) {
      nodeInputs[node.id] = aggregated
    }
  }

  const nodeOutputs: Record<string, UiStreamState> = {}
  for (const node of nodes) {
    if (node.data.kind === 'stream' && node.data.role === 'product') {
      const incoming = incomingEdges.get(node.id) ?? []
      if (incoming.length === 1) {
        const state = edgeStreams[incoming[0].id]
        if (state) {
          nodeOutputs[node.id] = state
        }
      }
      continue
    }

    const outgoing = outgoingEdges.get(node.id) ?? []
    if (outgoing.length !== 1) {
      continue
    }
    const state = edgeStreams[outgoing[0].id]
    if (state) {
      nodeOutputs[node.id] = state
    }
  }

  const rawBalances = toUiBalances(result)
  const feeds = nodes.filter(
    (node) => node.data.kind === 'stream' && node.data.role === 'feed',
  )
  const products = nodes.filter(
    (node) => node.data.kind === 'stream' && node.data.role === 'product',
  )
  const units = nodes.filter((node) => node.data.kind !== 'stream')
  const feedStates = feeds
    .map((node) => nodeOutputs[node.id])
    .filter((state): state is UiStreamState => Boolean(state))
  const productStates = products
    .map((node) => nodeOutputs[node.id])
    .filter((state): state is UiStreamState => Boolean(state))
  const completeBoundaries =
    feeds.length > 0 &&
    products.length > 0 &&
    feedStates.length === feeds.length &&
    productStates.length === products.length
  const balances = completeBoundaries
    ? rawBalances
    : {
        status: 'unavailable' as const,
        totalFeedTph: null,
        totalProductTph: null,
        closurePercent: null,
        components: [],
      }
  const feedTemperatureC =
    feeds.length > 0 && feedStates.length === feeds.length
      ? weightedState(feedStates)?.temperatureC ?? null
      : null
  const outletTemperatureC =
    products.length > 0 && productStates.length === products.length
      ? weightedState(productStates)?.temperatureC ?? null
      : null

  const thermalKinds = new Set<EquipmentKind>(['mixer', 'heater', 'cooler'])
  const thermalNodes = units.filter((node) =>
    thermalKinds.has(node.data.kind),
  )
  const calculatedThermal = thermalNodes
    .map((node) => equipment[node.id])
    .filter(
      (run): run is UiEquipmentResult =>
        Boolean(run) && run.status === 'calculated' && run.dutyKW !== null,
    )

  let heatingDutyKW: number | null = null
  let coolingDutyKW: number | null = null
  let netDutyKW: number | null = null
  if (thermalNodes.length === 0) {
    heatingDutyKW = 0
    coolingDutyKW = 0
    netDutyKW = 0
  } else if (calculatedThermal.length > 0) {
    heatingDutyKW = calculatedThermal.reduce(
      (total, run) => total + Math.max(0, run.dutyKW ?? 0),
      0,
    )
    coolingDutyKW = calculatedThermal.reduce(
      (total, run) => total + Math.max(0, -(run.dutyKW ?? 0)),
      0,
    )
    netDutyKW = calculatedThermal.reduce(
      (total, run) => total + (run.dutyKW ?? 0),
      0,
    )
  }

  const summary: UiSimulationSummary = {
    totalFeedTph: balances.totalFeedTph,
    productFlowTph: balances.totalProductTph,
    outletTemperatureC,
    feedTemperatureC,
    netDutyKW,
    heatingDutyKW,
    coolingDutyKW,
    massClosure: balances.closurePercent,
    unitCount: units.length,
    streamCount: edges.length,
    feedCount: feeds.length,
    productCount: products.length,
  }

  const dutyTotal = calculatedThermal.reduce(
    (total, run) => total + Math.abs(run.dutyKW ?? 0),
    0,
  )
  const energyRows: UiEnergyRow[] = units.map((node) => {
    const run = equipment[node.id]
    const dutyKW = run?.dutyKW ?? null
    return {
      nodeId: node.id,
      tag: node.data.tag,
      name: node.data.label,
      category: node.data.kind,
      status: run?.status ?? 'unavailable',
      dutyKW,
      share:
        dutyKW === null || dutyTotal <= 0
          ? null
          : (Math.abs(dutyKW) / dutyTotal) * 100,
      note: run
        ? noteForStatus(run.status, run.diagnostics)
        : '等待运行 Engine',
    }
  })

  const traces: Record<string, UiSimulationView['traces'][string]> = {}
  for (const [nodeId, run] of Object.entries(equipment)) {
    if (run.trace.length > 0) {
      traces[nodeId] = run.trace
    }
  }

  const adapterHasErrors = adapterDiagnostics.some(isErrorDiagnostic)
  const status =
    adapterHasErrors && result.status === 'success'
      ? 'partial'
      : result.status

  return {
    mode: 'engine',
    status,
    runId: result.run.runId,
    executedAt: result.run.calculatedAt,
    modelVersion: result.run.modelVersion,
    propertyPackageId: result.run.propertyPackageId,
    propertyPackageName: TEACHING_BINARY_FLUID.displayName,
    propertyPackageDisclaimer: TEACHING_BINARY_FLUID.disclaimer,
    heatCapacityKJPerKgK: TEACHING_COMPONENT_A.cpJPerKgK / 1000,
    diagnostics,
    equipment,
    streams,
    nodeInputs,
    nodeOutputs,
    edgeStreams,
    summary,
    materialRows,
    energyRows,
    balances,
    traces,
    temperatureProfile,
    flowProfile,
  }
}

export function runEngineSimulation(
  nodes: readonly ProcessNode[],
  edges: readonly ProcessEdge[],
  options: RunEngineSimulationOptions = {},
): UiSimulationView {
  const adapted = adaptUiFlowsheet(nodes, edges)
  const result = runSimulation(adapted.flowsheet, {
    runId: options.runId ?? `engine-${Date.now()}`,
    calculatedAt: options.calculatedAt,
  })
  return buildEngineSimulationView({
    nodes,
    edges,
    result,
    adapterDiagnostics: adapted.diagnostics,
  })
}
