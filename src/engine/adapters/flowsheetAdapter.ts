import type { Diagnostic } from '../domain/diagnostics'
import { createDiagnostic } from '../domain/diagnostics'
import type { DomainNode } from '../domain/equipment'
import type { DomainEdge, DomainFlowsheet } from '../domain/flowsheet'
import {
  barToPascal,
  celsiusToKelvin,
  tonnesPerHourToKgPerSecond,
  weightPercentToMassFraction,
} from '../units/convert'
import { createTeachingBinaryMaterialState } from '../properties/teachingBinaryFluid'

/**
 * Minimal structural shape of the current React Flow node. The adapter does
 * not import @xyflow/react or React; the real ProcessNode is structurally
 * compatible with this interface.
 */
export interface UiEquipmentNodeLike {
  id: string
  data: {
    kind: string
    tag?: string
    label?: string
    role?: string
    params?: Record<string, unknown>
  }
}

export interface UiProcessEdgeLike {
  id: string
  source: string
  target: string
  data?: {
    tag?: string
    name?: string
  }
}

export interface AdapterResult {
  flowsheet: DomainFlowsheet
  diagnostics: Diagnostic[]
}

function tagOf(node: UiEquipmentNodeLike): string {
  return typeof node.data.tag === 'string' && node.data.tag.trim()
    ? node.data.tag
    : node.id
}

function readParam(
  node: UiEquipmentNodeLike,
  key: string,
  diagnostics: Diagnostic[],
): number | null {
  const value = node.data.params?.[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    diagnostics.push(
      createDiagnostic(
        'E_ADAPTER_INPUT',
        'error',
        { type: 'node', nodeId: node.id },
        `Missing or non-finite UI parameter "${key}".`,
        'The engine adapter will not substitute a silent default.',
        { key },
      ),
    )
    return null
  }
  return value
}

/**
 * Convert the current UI graph (display units) into the engine domain graph
 * (canonical SI units). This adapter is intentionally not connected to the
 * production UI in P2.2.
 */
export function adaptUiFlowsheet(
  nodes: readonly UiEquipmentNodeLike[],
  edges: readonly UiProcessEdgeLike[],
): AdapterResult {
  const diagnostics: Diagnostic[] = []
  const domainNodes: DomainNode[] = []
  const adaptedNodeIds = new Set<string>()

  for (const node of nodes) {
    const tag = tagOf(node)
    const kind = node.data.kind

    if (kind === 'stream') {
      const role = node.data.role
      if (!role) {
        diagnostics.push(
          createDiagnostic(
            'E_ADAPTER_INPUT',
            'error',
            { type: 'node', nodeId: node.id },
            'Stream node is missing its feed/product/intermediate role.',
          ),
        )
        continue
      }
      if (role === 'feed') {
        const flowTph = readParam(node, 'flow', diagnostics)
        const temperatureC = readParam(node, 'temperature', diagnostics)
        const pressureBar = readParam(node, 'pressure', diagnostics)
        const compositionAWt = readParam(node, 'compositionA', diagnostics)

        if (
          flowTph === null ||
          temperatureC === null ||
          pressureBar === null ||
          compositionAWt === null
        ) {
          continue
        }

        domainNodes.push({
          id: node.id,
          tag,
          kind: 'stream',
          role: 'feed',
          state: createTeachingBinaryMaterialState({
            massFlowKgS: tonnesPerHourToKgPerSecond(flowTph),
            temperatureK: celsiusToKelvin(temperatureC),
            pressurePa: barToPascal(pressureBar),
            massFractionA: weightPercentToMassFraction(compositionAWt),
          }),
        })
        adaptedNodeIds.add(node.id)
      } else if (role === 'product') {
        domainNodes.push({
          id: node.id,
          tag,
          kind: 'stream',
          role: 'product',
        })
        adaptedNodeIds.add(node.id)
      } else if (role === 'intermediate') {
        domainNodes.push({
          id: node.id,
          tag,
          kind: 'stream',
          role: 'intermediate',
        })
        adaptedNodeIds.add(node.id)
      } else {
        diagnostics.push(
          createDiagnostic(
            'E_ADAPTER_INPUT',
            'error',
            { type: 'node', nodeId: node.id },
            `Unknown stream role: ${String(role)}.`,
          ),
        )
      }
      continue
    }

    if (kind === 'mixer') {
      domainNodes.push({ id: node.id, tag, kind: 'mixer' })
      adaptedNodeIds.add(node.id)
      continue
    }

    if (kind === 'heater' || kind === 'cooler') {
      const targetTemperatureC = readParam(
        node,
        'targetTemperature',
        diagnostics,
      )
      if (targetTemperatureC === null) {
        continue
      }
      domainNodes.push({
        id: node.id,
        tag,
        kind,
        targetTemperatureK: celsiusToKelvin(targetTemperatureC),
      })
      adaptedNodeIds.add(node.id)
      continue
    }

    if (kind === 'flash' || kind === 'separator' || kind === 'pump') {
      domainNodes.push({ id: node.id, tag, kind })
      adaptedNodeIds.add(node.id)
      continue
    }

    diagnostics.push(
      createDiagnostic(
        'E_ADAPTER_INPUT',
        'error',
        { type: 'node', nodeId: node.id },
        `Unknown equipment kind: ${String(kind)}.`,
      ),
    )
  }

  const domainEdges: DomainEdge[] = []
  for (const edge of edges) {
    if (!adaptedNodeIds.has(edge.source) || !adaptedNodeIds.has(edge.target)) {
      diagnostics.push(
        createDiagnostic(
          'E_ADAPTER_INPUT',
          'error',
          { type: 'edge', edgeId: edge.id },
          'Edge references a node that could not be adapted.',
          undefined,
          { sourceNodeId: edge.source, targetNodeId: edge.target },
        ),
      )
      continue
    }

    domainEdges.push({
      id: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      tag: edge.data?.tag ?? edge.id,
    })
  }

  return {
    flowsheet: { nodes: domainNodes, edges: domainEdges },
    diagnostics,
  }
}
