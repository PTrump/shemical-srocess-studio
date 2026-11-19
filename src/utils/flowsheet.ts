import type { Connection } from '@xyflow/react'
import {
  EQUIPMENT_DEFINITIONS,
  KIND_META,
} from '../data/equipment'
import type {
  EquipmentKind,
  ProcessEdge,
  ProcessNode,
  StreamRole,
} from '../types/process'
import { createId } from './format'

function nextTag(
  prefix: string,
  existingTags: string[],
): string {
  const used = new Set(existingTags)
  let sequence = 101
  while (used.has(`${prefix}-${sequence}`)) {
    sequence += 1
  }
  return `${prefix}-${sequence}`
}

export function nextStreamTag(existingEdges: ProcessEdge[]): string {
  return nextTag(
    'S',
    existingEdges.map((edge) => edge.data?.tag ?? ''),
  )
}

function streamPrefix(role: StreamRole): string {
  if (role === 'product') {
    return 'PR'
  }
  if (role === 'intermediate') {
    return 'S'
  }
  return 'F'
}

function defaultStreamLabel(count: number): string {
  if (count < 26) {
    return `Feed ${String.fromCharCode(65 + count)}`
  }
  return `Feed ${count + 1}`
}

export function createEquipmentNode(
  kind: EquipmentKind,
  position: { x: number; y: number },
  existingNodes: ProcessNode[],
  role: StreamRole = 'feed',
): ProcessNode {
  const definition = EQUIPMENT_DEFINITIONS[kind]
  const sameKindCount = existingNodes.filter(
    (node) => node.data.kind === kind,
  ).length
  const feedCount = existingNodes.filter(
    (node) => node.data.kind === 'stream' && node.data.role === 'feed',
  ).length
  const prefix = kind === 'stream' ? streamPrefix(role) : definition.tagPrefix

  if (kind === 'stream') {
    const letter = feedCount < 26
      ? String.fromCharCode(65 + feedCount)
      : String(feedCount + 1)

    return {
      id: createId('stream'),
      type: 'stream',
      position,
      data: {
        kind,
        label: defaultStreamLabel(feedCount),
        cnLabel: role === 'product' ? `产品 ${letter}` : `进料 ${letter}`,
        tag: nextTag(
          prefix,
          existingNodes.map((node) => node.data.tag),
        ),
        role,
        params: { ...definition.defaultParams },
      },
    }
  }

  return {
    id: createId(kind),
    type: kind,
    position,
    data: {
      kind,
      label:
        sameKindCount === 0
          ? definition.name
          : `${definition.name} ${sameKindCount + 1}`,
      cnLabel: definition.cnName,
      tag: nextTag(
        prefix,
        existingNodes.map((node) => node.data.tag),
      ),
      params: { ...definition.defaultParams },
    },
  }
}

export function createProcessEdge(
  connection: Connection,
  existingEdges: ProcessEdge[],
  fromLabel: string,
  toLabel: string,
): ProcessEdge {
  return {
    id: createId('edge'),
    type: 'process',
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle ?? null,
    targetHandle: connection.targetHandle ?? null,
    data: {
      tag: nextStreamTag(existingEdges),
      name: `${fromLabel} → ${toLabel}`,
    },
  }
}

export function kindCode(kind: EquipmentKind): string {
  return KIND_META[kind].code
}

export function toPersistableNodes(nodes: ProcessNode[]): ProcessNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: {
      ...node.data,
      params: { ...node.data.params },
    },
    selected: false,
  }))
}

export function toPersistableEdges(edges: ProcessEdge[]): ProcessEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    type: 'process',
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
    data: {
      tag: edge.data?.tag ?? 'S-101',
      name: edge.data?.name ?? 'Process stream',
    },
    selected: false,
  }))
}
