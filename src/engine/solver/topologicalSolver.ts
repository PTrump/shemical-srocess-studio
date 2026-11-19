import {
  createDiagnostic,
  hasErrors,
  type Diagnostic,
  type DiagnosticScope,
} from '../domain/diagnostics'
import type { DomainNode } from '../domain/equipment'
import type { DomainEdge } from '../domain/flowsheet'
import {
  checkFiniteResultNumber,
  validateFiniteMaterialState,
  validateFiniteTrace,
} from '../domain/numeric'
import type {
  EquipmentRun,
  NodeRunStatus,
  StreamRun,
} from '../domain/result'
import type { MaterialState, Stream } from '../domain/stream'
import {
  createStream,
  validateMaterialState,
} from '../domain/stream'
import type { PropertyPackage } from '../properties/propertyPackage'
import { calculateMixer } from '../operations/mixer'
import { calculateCooler, calculateHeater } from '../operations/heaterCooler'
import {
  createOperationTrace,
  type OperationContext,
} from '../operations/types'
import { getNodeStructuralDiagnostics, type GraphIndex } from './graphBuilder'

interface SolveMetadata {
  runId: string
  modelVersion: string
}

export interface SolveGraphOutput {
  streams: Record<string, StreamRun>
  equipment: Record<string, EquipmentRun>
  diagnostics: Diagnostic[]
}

function edgeScope(edgeId: string): DiagnosticScope {
  return { type: 'edge', edgeId }
}

function nodeScope(nodeId: string): DiagnosticScope {
  return { type: 'node', nodeId }
}

function blockedStream(
  edgeId: string,
  message: string,
  details?: Record<string, unknown>,
): StreamRun {
  return {
    edgeId,
    status: 'blocked',
    stream: null,
    diagnostics: [
      createDiagnostic(
        'E_BLOCKED_BY_UPSTREAM',
        'error',
        edgeScope(edgeId),
        message,
        'The downstream node cannot run until this connection is valid.',
        details,
      ),
    ],
  }
}

function createCalculatedStream(
  edge: DomainEdge,
  sourceNode: DomainNode,
  state: MaterialState,
  metadata: SolveMetadata,
  propertyPackage: PropertyPackage,
  diagnostics: Diagnostic[],
): Stream {
  return createStream(
    state,
    {
      id: edge.id,
      edgeId: edge.id,
      tag: edge.tag,
      sourceNodeId: sourceNode.id,
      targetNodeId: edge.targetNodeId,
      runId: metadata.runId,
      calculatedByNodeId: sourceNode.id,
      propertyPackageId: propertyPackage.id,
      modelVersion: metadata.modelVersion,
    },
    diagnostics,
  )
}

/**
 * Solve a validated DAG. This function never fills a blocked stream with zero
 * values and never calls the legacy demo simulation.
 */
export function solveGraph(
  index: GraphIndex,
  propertyPackage: PropertyPackage,
  metadata: SolveMetadata,
): SolveGraphOutput {
  const streams: Record<string, StreamRun> = {}
  const equipment: Record<string, EquipmentRun> = {}
  const indegree = new Map<string, number>()
  const queue: string[] = []
  const processed = new Set<string>()

  for (const node of index.nodes) {
    const count = index.incoming.get(node.id)?.length ?? 0
    indegree.set(node.id, count)
    if (count === 0) {
      queue.push(node.id)
    }
  }

  const completeOutgoing = (
    node: DomainNode,
    makeRun: (edge: DomainEdge) => StreamRun,
  ): void => {
    for (const edge of index.outgoing.get(node.id) ?? []) {
      streams[edge.id] = makeRun(edge)
      const targetIndegree = indegree.get(edge.targetNodeId)
      if (targetIndegree !== undefined) {
        const next = targetIndegree - 1
        indegree.set(edge.targetNodeId, next)
        if (next === 0) {
          queue.push(edge.targetNodeId)
        }
      }
    }
  }

  const blockOutgoing = (
    node: DomainNode,
    message: string,
    details?: Record<string, unknown>,
  ): void => {
    completeOutgoing(node, (edge) =>
      blockedStream(edge.id, `${node.tag}: ${message}`, details),
    )
  }

  const makeEquipmentRun = (
    node: DomainNode,
    status: NodeRunStatus,
    inletEdgeIds: string[],
    outletEdgeIds: string[],
    dutyW: number | null,
    diagnostics: Diagnostic[],
    trace: EquipmentRun['trace'],
  ): EquipmentRun => ({
    nodeId: node.id,
    tag: node.tag,
    kind: node.kind,
    status,
    inletEdgeIds,
    outletEdgeIds,
    dutyW,
    diagnostics,
    trace,
  })

  const processNode = (node: DomainNode): void => {
    const inletEdges = index.incoming.get(node.id) ?? []
    const outletEdges = index.outgoing.get(node.id) ?? []
    const inletEdgeIds = inletEdges.map((edge) => edge.id)
    const outletEdgeIds = outletEdges.map((edge) => edge.id)
    const structuralDiagnostics = getNodeStructuralDiagnostics(index, node.id)

    const inletStreams = inletEdges.map((edge) => streams[edge.id])
    const hasBlockedInlet = inletStreams.some(
      (run) => !run || run.status !== 'calculated' || !run.stream,
    )

    if (structuralDiagnostics.length > 0 && hasErrors(structuralDiagnostics)) {
      const status: NodeRunStatus =
        node.kind === 'flash' ||
        node.kind === 'separator' ||
        node.kind === 'pump'
          ? 'unsupported'
          : 'failed'
      equipment[node.id] = makeEquipmentRun(
        node,
        status,
        inletEdgeIds,
        outletEdgeIds,
        null,
        structuralDiagnostics,
        [],
      )
      blockOutgoing(
        node,
        'node failed structural/port/capability validation',
        {
          codes: structuralDiagnostics.map(
            (diagnostic) => diagnostic.code,
          ),
        },
      )
      return
    }

    if (hasBlockedInlet) {
      const blockedEdges = inletEdges
        .filter((edge) => {
          const run = streams[edge.id]
          return !run || run.status !== 'calculated' || !run.stream
        })
        .map((edge) => edge.id)
      const diagnostics: Diagnostic[] = [
        createDiagnostic(
          'E_BLOCKED_BY_UPSTREAM',
          'error',
          nodeScope(node.id),
          'Node is blocked because at least one upstream stream is not calculated.',
          undefined,
          { blockedEdgeIds: blockedEdges.join(',') },
        ),
      ]
      equipment[node.id] = makeEquipmentRun(
        node,
        'blocked',
        inletEdgeIds,
        outletEdgeIds,
        null,
        diagnostics,
        [],
      )
      blockOutgoing(node, 'upstream stream is blocked', {
        blockedEdgeIds: blockedEdges.join(','),
      })
      return
    }

    const calculatedInlets = inletStreams
      .map((run) => run?.stream)
      .filter((stream): stream is Stream => Boolean(stream))

    if (node.kind === 'stream') {
      if (node.role === 'feed') {
        const diagnostics = validateMaterialState(
          node.state,
          propertyPackage,
          nodeScope(node.id),
        )
        if (hasErrors(diagnostics)) {
          equipment[node.id] = makeEquipmentRun(
            node,
            'failed',
            inletEdgeIds,
            outletEdgeIds,
            null,
            diagnostics,
            [],
          )
          blockOutgoing(node, 'feed state is invalid')
          return
        }

        completeOutgoing(node, (edge) => ({
          edgeId: edge.id,
          status: 'calculated',
          stream: createCalculatedStream(
            edge,
            node,
            node.state,
            metadata,
            propertyPackage,
            [],
          ),
          diagnostics: [],
        }))
        equipment[node.id] = makeEquipmentRun(
          node,
          'calculated',
          inletEdgeIds,
          outletEdgeIds,
          null,
          [],
          [],
        )
        return
      }

      if (node.role === 'product') {
        equipment[node.id] = makeEquipmentRun(
          node,
          'calculated',
          inletEdgeIds,
          outletEdgeIds,
          null,
          [],
          [],
        )
        return
      }

      const inlet = calculatedInlets[0]
      const outletState: MaterialState = {
        massFlowKgS: inlet.massFlowKgS,
        temperatureK: inlet.temperatureK,
        pressurePa: inlet.pressurePa,
        phase: 'liquid',
        components: inlet.components.map((component) => ({ ...component })),
      }
      completeOutgoing(node, (edge) => ({
        edgeId: edge.id,
        status: 'calculated',
        stream: createCalculatedStream(
          edge,
          node,
          outletState,
          metadata,
          propertyPackage,
          [],
        ),
        diagnostics: [],
      }))
      equipment[node.id] = makeEquipmentRun(
        node,
        'calculated',
        inletEdgeIds,
        outletEdgeIds,
        0,
        [],
        [
          createOperationTrace(
            'intermediate-pass-through',
            'passThrough',
            'F_out = F_in; T_out = T_in; P_out = P_in; composition_out = composition_in',
            { inletMassFlowKgS: inlet.massFlowKgS },
            {
              outletMassFlowKgS: outletState.massFlowKgS,
              outletTemperatureK: outletState.temperatureK,
              outletPressurePa: outletState.pressurePa,
            },
            ['intermediate boundary has no property change'],
          ),
        ],
      )
      return
    }

    const operationContext: OperationContext = {
      nodeId: node.id,
      tag: node.tag,
      propertyPackage,
    }

    let result: {
      outlet: MaterialState | null
      dutyW: number | null
      diagnostics: Diagnostic[]
      trace: EquipmentRun['trace']
    }

    if (node.kind === 'mixer') {
      result = calculateMixer(calculatedInlets, operationContext)
    } else if (node.kind === 'heater') {
      result = calculateHeater(
        calculatedInlets[0],
        node.targetTemperatureK,
        operationContext,
      )
    } else if (node.kind === 'cooler') {
      result = calculateCooler(
        calculatedInlets[0],
        node.targetTemperatureK,
        operationContext,
      )
    } else {
      result = {
        outlet: null,
        dutyW: null,
        diagnostics: [
          createDiagnostic(
            'E_UNSUPPORTED_EQUIPMENT',
            'error',
            nodeScope(node.id),
            `P2.2 does not support ${node.kind}.`,
          ),
        ],
        trace: [],
      }
    }

    const resultFiniteDiagnostics = result.outlet
      ? [
          ...validateFiniteMaterialState(
            result.outlet,
            nodeScope(node.id),
          ),
          ...(result.dutyW === null
            ? []
            : checkFiniteResultNumber(
                result.dutyW,
                `${node.kind}.dutyW`,
                nodeScope(node.id),
              )),
          ...validateFiniteTrace(result.trace, nodeScope(node.id)),
        ]
      : []
    const resultDiagnostics = [
      ...result.diagnostics,
      ...resultFiniteDiagnostics,
    ]
    const safeDutyW =
      result.dutyW !== null && Number.isFinite(result.dutyW)
        ? result.dutyW
        : null

    if (!result.outlet || hasErrors(resultDiagnostics)) {
      equipment[node.id] = makeEquipmentRun(
        node,
        'failed',
        inletEdgeIds,
        outletEdgeIds,
        safeDutyW,
        resultDiagnostics,
        [],
      )
      blockOutgoing(node, 'equipment calculation failed')
      return
    }

    const outlet = result.outlet
    const warnings = result.diagnostics.filter(
      (diagnostic) => diagnostic.severity !== 'error',
    )
    completeOutgoing(node, (edge) => ({
      edgeId: edge.id,
      status: 'calculated',
      stream: createCalculatedStream(
        edge,
        node,
        outlet,
        metadata,
        propertyPackage,
        warnings,
      ),
      diagnostics: warnings,
    }))
    equipment[node.id] = makeEquipmentRun(
      node,
      'calculated',
      inletEdgeIds,
      outletEdgeIds,
      safeDutyW,
      resultDiagnostics,
      result.trace,
    )
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()
    if (!nodeId || processed.has(nodeId)) {
      continue
    }
    const node = index.nodeById.get(nodeId)
    if (!node) {
      continue
    }
    processed.add(nodeId)
    processNode(node)
  }

  const solverDiagnostics: Diagnostic[] = []
  const unprocessed = index.nodes.filter((node) => !processed.has(node.id))
  if (unprocessed.length > 0) {
    const cycleDiagnostic = createDiagnostic(
      'E_GRAPH_CYCLE',
      'error',
      { type: 'flowsheet' },
      'The flowsheet contains a cycle or an unresolved dependency; P2.2 does not support recycle loops.',
      'Remove the recycle connection or wait for a later recycle-solver phase.',
      { nodeIds: unprocessed.map((node) => node.id).join(',') },
    )
    solverDiagnostics.push(cycleDiagnostic)

    for (const node of unprocessed) {
      const inletEdgeIds = (index.incoming.get(node.id) ?? []).map(
        (edge) => edge.id,
      )
      const outletEdgeIds = (index.outgoing.get(node.id) ?? []).map(
        (edge) => edge.id,
      )
      equipment[node.id] = {
        nodeId: node.id,
        tag: node.tag,
        kind: node.kind,
        status: 'blocked',
        inletEdgeIds,
        outletEdgeIds,
        dutyW: null,
        diagnostics: [cycleDiagnostic],
        trace: [],
      }
      for (const edge of index.outgoing.get(node.id) ?? []) {
        if (!streams[edge.id]) {
          streams[edge.id] = blockedStream(
            edge.id,
            'stream is blocked by an unresolved cycle',
          )
        }
      }
    }
  }

  return { streams, equipment, diagnostics: solverDiagnostics }
}
