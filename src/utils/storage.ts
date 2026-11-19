import {
  EQUIPMENT_DEFINITIONS,
  isEquipmentKind,
  isStreamRole,
} from '../data/equipment'
import type {
  EquipmentNodeData,
  ProcessEdge,
  ProcessNode,
  ProcessParams,
  SavedFlowsheet,
  StreamRole,
} from '../types/process'
import {
  toPersistableEdges,
  toPersistableNodes,
} from './flowsheet'
import { isFiniteNumber } from './format'

export const SAVE_STORAGE_KEY = 'chemical-process-studio.flowsheet.v1'

export interface RestoredFlowsheet {
  nodes: ProcessNode[]
  edges: ProcessEdge[]
  savedAt: string | null
}

function sanitizeParams(
  kind: EquipmentNodeData['kind'],
  value: unknown,
): ProcessParams {
  const defaults = EQUIPMENT_DEFINITIONS[kind].defaultParams
  const source =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {}

  const params: ProcessParams = { ...defaults }
  for (const [key, fallback] of Object.entries(defaults)) {
    const candidate = source[key]
    if (isFiniteNumber(candidate)) {
      params[key] = candidate
    } else if (isFiniteNumber(fallback)) {
      params[key] = fallback
    }
  }
  return params
}

function sanitizeNode(value: unknown): ProcessNode | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    !candidate.data ||
    typeof candidate.data !== 'object'
  ) {
    return null
  }

  const rawData = candidate.data as Record<string, unknown>
  if (!isEquipmentKind(rawData.kind)) {
    return null
  }

  const kind = rawData.kind
  const definition = EQUIPMENT_DEFINITIONS[kind]
  const position =
    candidate.position && typeof candidate.position === 'object'
      ? (candidate.position as Record<string, unknown>)
      : {}
  const role: StreamRole | undefined =
    kind === 'stream'
      ? isStreamRole(rawData.role)
        ? rawData.role
        : 'feed'
      : undefined

  return {
    id: candidate.id,
    type: kind,
    position: {
      x: isFiniteNumber(position.x) ? position.x : 0,
      y: isFiniteNumber(position.y) ? position.y : 0,
    },
    data: {
      kind,
      label:
        typeof rawData.label === 'string' && rawData.label.trim()
          ? rawData.label
          : definition.name,
      cnLabel:
        typeof rawData.cnLabel === 'string' && rawData.cnLabel.trim()
          ? rawData.cnLabel
          : definition.cnName,
      tag:
        typeof rawData.tag === 'string' && rawData.tag.trim()
          ? rawData.tag
          : `${definition.tagPrefix}-101`,
      role,
      params: sanitizeParams(kind, rawData.params),
    },
    selected: false,
  }
}

function sanitizeEdge(
  value: unknown,
  nodeIds: Set<string>,
): ProcessEdge | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.source !== 'string' ||
    typeof candidate.target !== 'string' ||
    !nodeIds.has(candidate.source) ||
    !nodeIds.has(candidate.target)
  ) {
    return null
  }

  const rawData =
    candidate.data && typeof candidate.data === 'object'
      ? (candidate.data as Record<string, unknown>)
      : {}

  return {
    id: candidate.id,
    type: 'process',
    source: candidate.source,
    target: candidate.target,
    sourceHandle:
      typeof candidate.sourceHandle === 'string'
        ? candidate.sourceHandle
        : null,
    targetHandle:
      typeof candidate.targetHandle === 'string'
        ? candidate.targetHandle
        : null,
    data: {
      tag:
        typeof rawData.tag === 'string' && rawData.tag.trim()
          ? rawData.tag
          : 'S-101',
      name:
        typeof rawData.name === 'string' && rawData.name.trim()
          ? rawData.name
          : 'Process stream',
    },
    selected: false,
  }
}

export function saveFlowsheet(
  nodes: ProcessNode[],
  edges: ProcessEdge[],
): { savedAt: string } {
  const savedAt = new Date().toISOString()
  const payload: SavedFlowsheet = {
    version: 1,
    savedAt,
    project: '混合与加热实验',
    nodes: toPersistableNodes(nodes),
    edges: toPersistableEdges(edges),
  }

  window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload))
  return { savedAt }
}

export function loadFlowsheet(): RestoredFlowsheet | null {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(SAVE_STORAGE_KEY)
  } catch {
    return null
  }

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SavedFlowsheet> | null
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return null
    }

    const nodes = parsed.nodes
      .map((node) => sanitizeNode(node))
      .filter((node): node is ProcessNode => Boolean(node))
    const nodeIds = new Set(nodes.map((node) => node.id))
    const edges = parsed.edges
      .map((edge) => sanitizeEdge(edge, nodeIds))
      .filter((edge): edge is ProcessEdge => Boolean(edge))

    return {
      nodes,
      edges,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
    }
  } catch {
    return null
  }
}

export function clearFlowsheetStorage(): void {
  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY)
  } catch {
    // Storage is optional for this teaching demo.
  }
}
