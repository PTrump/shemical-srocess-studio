import type { DomainEdge, DomainFlowsheet } from '../domain/flowsheet'
import type { DomainNode } from '../domain/equipment'
import { isUnsupportedEquipmentKind } from '../domain/equipment'
import {
  createDiagnostic,
  hasErrors,
  type Diagnostic,
} from '../domain/diagnostics'

export interface GraphIndex {
  nodes: DomainNode[]
  edges: DomainEdge[]
  nodeById: Map<string, DomainNode>
  edgeById: Map<string, DomainEdge>
  incoming: Map<string, DomainEdge[]>
  outgoing: Map<string, DomainEdge[]>
  graphDiagnostics: Diagnostic[]
  structuralDiagnostics: Map<string, Diagnostic[]>
}

export function buildGraph(flowsheet: DomainFlowsheet): GraphIndex {
  const graphDiagnostics: Diagnostic[] = []
  const structuralDiagnostics = new Map<string, Diagnostic[]>()

  if (flowsheet.nodes.length === 0) {
    graphDiagnostics.push(
      createDiagnostic(
        'E_EMPTY_FLOWSHEET',
        'error',
        { type: 'flowsheet' },
        'The flowsheet contains no equipment nodes.',
      ),
    )
  }

  const nodes: DomainNode[] = []
  const nodeById = new Map<string, DomainNode>()

  for (const node of flowsheet.nodes) {
    if (!node.id) {
      graphDiagnostics.push(
        createDiagnostic(
          'E_INVALID_GRAPH',
          'error',
          { type: 'flowsheet' },
          'A node is missing a non-empty id.',
        ),
      )
      continue
    }

    if (nodeById.has(node.id)) {
      graphDiagnostics.push(
        createDiagnostic(
          'E_DUPLICATE_NODE_ID',
          'error',
          { type: 'node', nodeId: node.id },
          `Duplicate node id: ${node.id}.`,
        ),
      )
      continue
    }

    nodeById.set(node.id, node)
    nodes.push(node)
    structuralDiagnostics.set(node.id, [])
  }

  const edges: DomainEdge[] = []
  const edgeById = new Map<string, DomainEdge>()
  const incoming = new Map<string, DomainEdge[]>()
  const outgoing = new Map<string, DomainEdge[]>()

  for (const node of nodes) {
    incoming.set(node.id, [])
    outgoing.set(node.id, [])
  }

  for (const edge of flowsheet.edges) {
    if (!edge.id) {
      graphDiagnostics.push(
        createDiagnostic(
          'E_INVALID_GRAPH',
          'error',
          { type: 'flowsheet' },
          'An edge is missing a non-empty id.',
        ),
      )
      continue
    }

    if (edgeById.has(edge.id)) {
      graphDiagnostics.push(
        createDiagnostic(
          'E_DUPLICATE_EDGE_ID',
          'error',
          { type: 'edge', edgeId: edge.id },
          `Duplicate edge id: ${edge.id}.`,
        ),
      )
      continue
    }

    if (
      !nodeById.has(edge.sourceNodeId) ||
      !nodeById.has(edge.targetNodeId)
    ) {
      graphDiagnostics.push(
        createDiagnostic(
          'E_MISSING_ENDPOINT',
          'error',
          { type: 'edge', edgeId: edge.id },
          'An edge references a node that is not present in the flowsheet.',
          undefined,
          {
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
          },
        ),
      )
      continue
    }

    edgeById.set(edge.id, edge)
    edges.push(edge)
    outgoing.get(edge.sourceNodeId)?.push(edge)
    incoming.get(edge.targetNodeId)?.push(edge)
  }

  for (const node of nodes) {
    const diagnosticList = structuralDiagnostics.get(node.id)
    if (!diagnosticList) {
      continue
    }
    const inCount = incoming.get(node.id)?.length ?? 0
    const outCount = outgoing.get(node.id)?.length ?? 0

    if (node.kind === 'stream') {
      if (node.role === 'feed') {
        if (inCount > 0) {
          diagnosticList.push(
            createDiagnostic(
              'E_EXTRA_INLETS',
              'error',
              { type: 'node', nodeId: node.id },
              'Feed stream must not have an inlet connection.',
              undefined,
              { inletCount: inCount },
            ),
          )
        }
        validateSingleOutlet(node, outCount, diagnosticList)
      } else if (node.role === 'product') {
        if (inCount === 0) {
          diagnosticList.push(
            createDiagnostic(
              'E_MISSING_INLET',
              'error',
              { type: 'node', nodeId: node.id },
              'Product stream must have exactly one inlet connection.',
              undefined,
              { inletCount: inCount },
            ),
          )
        } else if (inCount > 1) {
          diagnosticList.push(
            createDiagnostic(
              'E_EXTRA_INLETS',
              'error',
              { type: 'node', nodeId: node.id },
              'Product stream accepts exactly one inlet connection.',
              undefined,
              { inletCount: inCount },
            ),
          )
        }
        if (outCount > 0) {
          diagnosticList.push(
            createDiagnostic(
              'E_INVALID_PORT_CARDINALITY',
              'error',
              { type: 'node', nodeId: node.id },
              'Product stream must not have an outlet connection.',
              undefined,
              { outletCount: outCount },
            ),
          )
        }
      } else {
        if (inCount === 0) {
          diagnosticList.push(
            createDiagnostic(
              'E_MISSING_INLET',
              'error',
              { type: 'node', nodeId: node.id },
              'Intermediate stream must have exactly one inlet connection.',
              undefined,
              { inletCount: inCount },
            ),
          )
        } else if (inCount > 1) {
          diagnosticList.push(
            createDiagnostic(
              'E_EXTRA_INLETS',
              'error',
              { type: 'node', nodeId: node.id },
              'Intermediate stream accepts exactly one inlet connection.',
              undefined,
              { inletCount: inCount },
            ),
          )
        }
        validateSingleOutlet(node, outCount, diagnosticList)
      }
      continue
    }

    if (isUnsupportedEquipmentKind(node.kind)) {
      diagnosticList.push(
        createDiagnostic(
          'E_UNSUPPORTED_EQUIPMENT',
          'error',
          { type: 'node', nodeId: node.id },
          `P2.2 does not support real calculation for ${node.kind}.`,
          'This node must remain a DEMO/visual placeholder until a later phase.',
          { kind: node.kind },
        ),
      )
      continue
    }

    if (node.kind === 'mixer') {
      if (inCount < 1) {
        diagnosticList.push(
          createDiagnostic(
            'E_MISSING_INLET',
            'error',
            { type: 'node', nodeId: node.id },
            'Mixer requires at least one inlet connection.',
            undefined,
            { inletCount: inCount },
          ),
        )
      }
      validateSingleOutlet(node, outCount, diagnosticList)
      continue
    }

    if (node.kind === 'heater' || node.kind === 'cooler') {
      if (inCount === 0) {
        diagnosticList.push(
          createDiagnostic(
            'E_MISSING_INLET',
            'error',
            { type: 'node', nodeId: node.id },
            `${node.kind} requires exactly one inlet connection.`,
            undefined,
            { inletCount: inCount },
          ),
        )
      } else if (inCount > 1) {
        diagnosticList.push(
          createDiagnostic(
            'E_EXTRA_INLETS',
            'error',
            { type: 'node', nodeId: node.id },
            `${node.kind} accepts exactly one inlet connection.`,
            undefined,
            { inletCount: inCount },
          ),
        )
      }
      validateSingleOutlet(node, outCount, diagnosticList)
    }
  }

  const index: GraphIndex = {
    nodes,
    edges,
    nodeById,
    edgeById,
    incoming,
    outgoing,
    graphDiagnostics,
    structuralDiagnostics,
  }

  return index
}

function validateSingleOutlet(
  node: DomainNode,
  outCount: number,
  diagnostics: Diagnostic[],
): void {
  if (outCount === 0) {
    diagnostics.push(
      createDiagnostic(
        'E_MISSING_OUTLET',
        'error',
        { type: 'node', nodeId: node.id },
        'This node must have exactly one outlet connection.',
        undefined,
        { outletCount: outCount },
      ),
    )
  } else if (outCount > 1) {
    diagnostics.push(
      createDiagnostic(
        'E_MULTIPLE_OUTLETS',
        'error',
        { type: 'node', nodeId: node.id },
        'Multiple outlet streams are not supported in P2.2.',
        'Connect exactly one downstream edge; a splitter is not available yet.',
        { outletCount: outCount },
      ),
    )
  }
}

export function getNodeStructuralDiagnostics(
  index: GraphIndex,
  nodeId: string,
): Diagnostic[] {
  return index.structuralDiagnostics.get(nodeId) ?? []
}

export function getGraphDiagnosticsWithStructure(
  index: GraphIndex,
): Diagnostic[] {
  const diagnostics = [...index.graphDiagnostics]
  for (const list of index.structuralDiagnostics.values()) {
    diagnostics.push(...list)
  }
  return diagnostics
}

export function hasGraphErrors(index: GraphIndex): boolean {
  return hasErrors(getGraphDiagnosticsWithStructure(index))
}
