import type {
  ChartPoint,
  EnergyBalanceRow,
  EquipmentKind,
  MaterialBalanceRow,
  ProcessEdge,
  ProcessNode,
  SimulationResult,
  StreamState,
} from '../types/process'
import { clamp } from '../utils/format'

const CP = 2.2
const DENSITY = 800
const DEFAULT_PUMP_EFFICIENCY = 0.7
const ZERO_STATE: StreamState = {
  flow: 0,
  temperature: 25,
  pressure: 0,
  compositionA: 0,
  compositionB: 100,
}

interface GraphMaps {
  incoming: Map<string, ProcessEdge[]>
  outgoing: Map<string, ProcessEdge[]>
}

function round(value: number, digits = 3): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function param(
  node: ProcessNode,
  key: string,
  fallback: number,
): number {
  const value = node.data.params[key]
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback
}

function sanitizeState(state: StreamState): StreamState {
  const compositionA = clamp(state.compositionA, 0, 100)
  return {
    flow: round(Math.max(0, state.flow), 3),
    temperature: round(state.temperature, 3),
    pressure: round(Math.max(0, state.pressure), 3),
    compositionA: round(compositionA, 2),
    compositionB: round(100 - compositionA, 2),
  }
}

function feedState(node: ProcessNode): StreamState {
  return sanitizeState({
    flow: param(node, 'flow', 0),
    temperature: param(node, 'temperature', 25),
    pressure: param(node, 'pressure', 1),
    compositionA: param(node, 'compositionA', 0),
    compositionB: 0,
  })
}

function mergeStreams(states: StreamState[]): StreamState {
  const active = states.filter((state) => state.flow > 0)
  const flow = active.reduce((total, state) => total + state.flow, 0)

  if (flow <= 0) {
    return { ...ZERO_STATE }
  }

  const weighted = (key: 'temperature' | 'pressure' | 'compositionA') =>
    active.reduce((total, state) => total + state[key] * state.flow, 0) /
    flow

  return sanitizeState({
    flow,
    temperature: weighted('temperature'),
    pressure: weighted('pressure'),
    compositionA: weighted('compositionA'),
    compositionB: 0,
  })
}

function buildGraphMaps(
  nodes: ProcessNode[],
  edges: ProcessEdge[],
): GraphMaps {
  const nodeIds = new Set(nodes.map((node) => node.id))
  const incoming = new Map<string, ProcessEdge[]>()
  const outgoing = new Map<string, ProcessEdge[]>()

  for (const node of nodes) {
    incoming.set(node.id, [])
    outgoing.set(node.id, [])
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue
    }
    outgoing.get(edge.source)?.push(edge)
    incoming.get(edge.target)?.push(edge)
  }

  return { incoming, outgoing }
}

function computeNodeOutput(
  node: ProcessNode,
  incoming: StreamState[],
): StreamState {
  const data = node.data
  const merged = mergeStreams(incoming)

  switch (data.kind) {
    case 'stream': {
      if (data.role === 'feed') {
        return feedState(node)
      }
      return sanitizeState(merged)
    }
    case 'mixer': {
      return sanitizeState({
        flow: merged.flow,
        temperature: param(node, 'outletTemperature', merged.temperature),
        pressure: param(node, 'pressure', merged.pressure || 1),
        compositionA: merged.compositionA,
        compositionB: merged.compositionB,
      })
    }
    case 'heater':
    case 'cooler': {
      return sanitizeState({
        flow: merged.flow,
        temperature: param(node, 'targetTemperature', merged.temperature),
        pressure: param(node, 'pressure', merged.pressure || 1),
        compositionA: merged.compositionA,
        compositionB: merged.compositionB,
      })
    }
    case 'flash':
    case 'separator': {
      return sanitizeState({
        flow: merged.flow,
        temperature: param(node, 'temperature', merged.temperature),
        pressure: param(node, 'pressure', merged.pressure || 1),
        compositionA: merged.compositionA,
        compositionB: merged.compositionB,
      })
    }
    case 'pump': {
      return sanitizeState({
        flow: merged.flow,
        temperature: merged.temperature,
        pressure: param(node, 'outletPressure', merged.pressure || 1),
        compositionA: merged.compositionA,
        compositionB: merged.compositionB,
      })
    }
    default: {
      return merged
    }
  }
}

function computeUnitDuty(
  node: ProcessNode,
  inlet: StreamState,
): { duty: number; note: string } {
  const outlet = computeNodeOutput(node, [inlet])
  const massFlow = (outlet.flow * 1000) / 3600
  const duty = massFlow * CP * (outlet.temperature - inlet.temperature)
  const target = param(
    node,
    node.data.kind === 'heater' || node.data.kind === 'cooler'
      ? 'targetTemperature'
      : 'outletTemperature',
    outlet.temperature,
  )

  switch (node.data.kind) {
    case 'mixer':
      return {
        duty: round(duty, 3),
        note:
          Math.abs(duty) < 0.5
            ? '绝热混合'
            : `入口 ${round(inlet.temperature, 1)} °C · 出口 ${round(outlet.temperature, 1)} °C`,
      }
    case 'heater':
      return {
        duty: round(duty, 3),
        note: `入口 ${round(inlet.temperature, 1)} °C · 目标 ${round(target, 1)} °C`,
      }
    case 'cooler':
      return {
        duty: round(duty, 3),
        note: `入口 ${round(inlet.temperature, 1)} °C · 目标 ${round(target, 1)} °C`,
      }
    case 'pump': {
      const efficiency = clamp(
        param(node, 'efficiency', DEFAULT_PUMP_EFFICIENCY * 100) / 100,
        0.1,
        1,
      )
      const pressureGain = Math.max(0, outlet.pressure - inlet.pressure)
      const volumeFlow = (outlet.flow * 1000) / 3600 / DENSITY
      const pumpPower = (volumeFlow * pressureGain * 100) / efficiency
      return {
        duty: round(pumpPower, 3),
        note: `ΔP ${round(pressureGain, 2)} bar · η ${round(efficiency * 100, 0)}%`,
      }
    }
    case 'flash':
      return {
        duty: 0,
        note: `汽化率 ${round(param(node, 'vaporFraction', 0), 0)}% · 绝热近似`,
      }
    case 'separator':
      return {
        duty: 0,
        note: `液相分率 ${round(param(node, 'splitRatio', 0), 0)}% · 机械分离`,
      }
    default:
      return { duty: 0, note: '未计入能量平衡' }
  }
}

function weightedAverage(
  nodes: ProcessNode[],
  outputs: Record<string, StreamState>,
  key: 'temperature' | 'flow',
): number {
  const totalFlow = nodes.reduce(
    (total, node) => total + (outputs[node.id]?.flow ?? 0),
    0,
  )
  if (totalFlow <= 0) {
    return 0
  }
  return (
    nodes.reduce(
      (total, node) =>
        total + (outputs[node.id]?.[key] ?? 0) * (outputs[node.id]?.flow ?? 0),
      0,
    ) / totalFlow
  )
}

export function simulateProcess(
  nodes: ProcessNode[],
  edges: ProcessEdge[],
): SimulationResult {
  const graph = buildGraphMaps(nodes, edges)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const warnings: string[] = []
  const nodeOutputs: Record<string, StreamState> = {}
  const edgeStreams: Record<string, StreamState> = {}

  const indegree = new Map<string, number>()
  for (const node of nodes) {
    indegree.set(node.id, graph.incoming.get(node.id)?.length ?? 0)
  }

  const queue = nodes
    .filter(
      (node) =>
        (indegree.get(node.id) ?? 0) === 0 ||
        (node.data.kind === 'stream' && node.data.role === 'feed'),
    )
    .map((node) => node.id)

  const processed = new Set<string>()

  while (queue.length > 0) {
    const nodeId = queue.shift()
    if (!nodeId || processed.has(nodeId)) {
      continue
    }

    const node = nodeById.get(nodeId)
    if (!node) {
      continue
    }

    const incoming = (graph.incoming.get(nodeId) ?? [])
      .map((edge) => edgeStreams[edge.id])
      .filter((state): state is StreamState => Boolean(state))
    const output = computeNodeOutput(node, incoming)
    nodeOutputs[nodeId] = output
    processed.add(nodeId)

    for (const edge of graph.outgoing.get(nodeId) ?? []) {
      edgeStreams[edge.id] = output
      const nextIndegree = (indegree.get(edge.target) ?? 1) - 1
      indegree.set(edge.target, nextIndegree)
      if (nextIndegree <= 0 && !processed.has(edge.target)) {
        queue.push(edge.target)
      }
    }
  }

  const unresolved = nodes.filter((node) => !processed.has(node.id))
  if (unresolved.length > 0) {
    warnings.push('检测到循环或未求解物流，演示模型按单次通过近似计算。')
    for (const node of unresolved) {
      const incoming = (graph.incoming.get(node.id) ?? [])
        .map((edge) => edgeStreams[edge.id])
        .filter((state): state is StreamState => Boolean(state))
      const output = computeNodeOutput(node, incoming)
      nodeOutputs[node.id] = output
      for (const edge of graph.outgoing.get(node.id) ?? []) {
        edgeStreams[edge.id] = output
      }
    }
  }

  const feedNodes = nodes.filter(
    (node) => node.data.kind === 'stream' && node.data.role === 'feed',
  )
  const productNodes = nodes.filter(
    (node) => node.data.kind === 'stream' && node.data.role === 'product',
  )
  const unitNodes = nodes.filter((node) => node.data.kind !== 'stream')

  const totalFeed = feedNodes.reduce(
    (total, node) => total + (nodeOutputs[node.id]?.flow ?? 0),
    0,
  )
  const productFlow = productNodes.reduce(
    (total, node) => total + (nodeOutputs[node.id]?.flow ?? 0),
    0,
  )
  const massClosure =
    totalFeed > 0 ? clamp((productFlow / totalFeed) * 100, 0, 200) : 0

  const materialBalance: MaterialBalanceRow[] = edges.map((edge) => {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)
    const stream = edgeStreams[edge.id] ?? { ...ZERO_STATE }

    return {
      edgeId: edge.id,
      tag: edge.data?.tag ?? 'S-???',
      name: edge.data?.name ?? 'Process stream',
      from: source?.data.label ?? 'Unresolved',
      to: target?.data.label ?? 'Unresolved',
      fromTag: source?.data.tag ?? '—',
      toTag: target?.data.tag ?? '—',
      stream,
    }
  })

  const energyBalance: EnergyBalanceRow[] = unitNodes.map((node) => {
    const incoming = (graph.incoming.get(node.id) ?? [])
      .map((edge) => edgeStreams[edge.id])
      .filter((state): state is StreamState => Boolean(state))
    const inlet = mergeStreams(incoming)
    const { duty, note } = computeUnitDuty(node, inlet)
    return {
      nodeId: node.id,
      tag: node.data.tag,
      name: node.data.label,
      category: node.data.kind as EquipmentKind,
      duty,
      share: 0,
      note,
    }
  })

  const absoluteDuty = energyBalance.reduce(
    (total, row) => total + Math.abs(row.duty),
    0,
  )
  for (const row of energyBalance) {
    row.share =
      absoluteDuty > 0 ? round((Math.abs(row.duty) / absoluteDuty) * 100, 1) : 0
  }

  const heatingDuty = energyBalance
    .filter((row) => row.duty > 0)
    .reduce((total, row) => total + row.duty, 0)
  const coolingDuty = Math.abs(
    energyBalance
      .filter((row) => row.duty < 0)
      .reduce((total, row) => total + row.duty, 0),
  )
  const netDuty = round(heatingDuty - coolingDuty, 3)

  const temperatureProfile: ChartPoint[] = materialBalance.map((row) => ({
    label: row.tag,
    value: row.stream.temperature,
  }))
  const flowProfile: ChartPoint[] = materialBalance.map((row) => ({
    label: row.tag,
    value: row.stream.flow,
  }))

  const productTemperature =
    productNodes.length > 0
      ? weightedAverage(productNodes, nodeOutputs, 'temperature')
      : 0
  const feedTemperature =
    feedNodes.length > 0
      ? weightedAverage(feedNodes, nodeOutputs, 'temperature')
      : 0
  const fallbackTemperature =
    materialBalance.length > 0
      ? materialBalance[materialBalance.length - 1].stream.temperature
      : 0

  if (feedNodes.length === 0) {
    warnings.push('流程中没有进料物流，计算结果为零流量。')
  }
  if (productNodes.length === 0) {
    warnings.push('流程中没有产品物流，无法完成物料平衡。')
  }
  if (feedNodes.length > 0 && productNodes.length > 0 && massClosure < 99.5) {
    warnings.push(
      `物料平衡闭合率 ${round(massClosure, 1)}%，部分进料未进入产品物流。`,
    )
  }

  for (const node of nodes) {
    const incomingCount = graph.incoming.get(node.id)?.length ?? 0
    const outgoingCount = graph.outgoing.get(node.id)?.length ?? 0

    if (
      node.data.kind === 'stream' &&
      node.data.role === 'feed' &&
      outgoingCount === 0
    ) {
      warnings.push(`${node.data.tag} 进料未连接下游物流。`)
    } else if (
      node.data.kind === 'stream' &&
      node.data.role !== 'feed' &&
      incomingCount === 0
    ) {
      warnings.push(`${node.data.tag} 未连接上游物流。`)
    } else if (
      node.data.kind !== 'stream' &&
      incomingCount === 0 &&
      outgoingCount === 0
    ) {
      warnings.push(`${node.data.tag} 尚未参与流程。`)
    } else if (node.data.kind !== 'stream' && outgoingCount === 0) {
      warnings.push(`${node.data.tag} 缺少下游物流。`)
    }

    if (
      node.data.kind === 'heater' &&
      (nodeOutputs[node.id]?.flow ?? 0) > 0
    ) {
      const inlet = mergeStreams(
        (graph.incoming.get(node.id) ?? [])
          .map((edge) => edgeStreams[edge.id])
          .filter((state): state is StreamState => Boolean(state)),
      )
      if (inlet.temperature > param(node, 'targetTemperature', inlet.temperature)) {
        warnings.push(`${node.data.tag} 出口目标温度低于入口温度，请检查参数。`)
      }
    }
    if (
      node.data.kind === 'cooler' &&
      (nodeOutputs[node.id]?.flow ?? 0) > 0
    ) {
      const inlet = mergeStreams(
        (graph.incoming.get(node.id) ?? [])
          .map((edge) => edgeStreams[edge.id])
          .filter((state): state is StreamState => Boolean(state)),
      )
      if (inlet.temperature < param(node, 'targetTemperature', inlet.temperature)) {
        warnings.push(`${node.data.tag} 出口目标温度高于入口温度，请检查参数。`)
      }
    }
  }

  return {
    summary: {
      totalFeed: round(totalFeed, 3),
      productFlow: round(productFlow, 3),
      outletTemperature: round(productTemperature || fallbackTemperature, 3),
      feedTemperature: round(feedTemperature, 3),
      netDuty,
      heatingDuty: round(heatingDuty, 3),
      coolingDuty: round(coolingDuty, 3),
      massClosure: round(massClosure, 2),
      unitCount: unitNodes.length,
      streamCount: edges.length,
      feedCount: feedNodes.length,
      productCount: productNodes.length,
    },
    materialBalance,
    energyBalance,
    temperatureProfile,
    flowProfile,
    nodeOutputs,
    edgeStreams,
    warnings: warnings.slice(0, 7),
    model: {
      cp: CP,
      density: DENSITY,
      pumpEfficiency: DEFAULT_PUMP_EFFICIENCY,
    },
  }
}
