import { useCallback, useRef, useState } from 'react'
import type {
  Connection,
  EdgeChangeset,
  NodeChangeset,
} from '@xyflow/react'
import { createDemoFlowsheet } from '../data/demoFlowsheet'
import type {
  EquipmentKind,
  ProcessEdge,
  ProcessNode,
  ProcessParams,
  StreamRole,
} from '../types/process'
import {
  createEquipmentNode,
  createProcessEdge,
} from '../utils/flowsheet'
import { loadFlowsheet } from '../utils/storage'

interface Snapshot {
  nodes: ProcessNode[]
  edges: ProcessEdge[]
}

interface HistoryState {
  past: Snapshot[]
  future: Snapshot[]
}

const HISTORY_LIMIT = 60
const COALESCE_WINDOW = 900

export interface UseFlowsheetResult {
  nodes: ProcessNode[]
  edges: ProcessEdge[]
  revision: number
  isDirty: boolean
  savedAt: string | null
  wasRestored: boolean
  canUndo: boolean
  canRedo: boolean
  onNodesChange: (changes: NodeChangeset<ProcessNode>) => void
  onEdgesChange: (changes: EdgeChangeset<ProcessEdge>) => void
  onConnect: (connection: Connection) => void
  onNodeDragStop: () => void
  addEquipment: (
    kind: EquipmentKind,
    position: { x: number; y: number },
  ) => void
  deleteNode: (id: string) => void
  deleteEdge: (id: string) => void
  selectNode: (id: string) => void
  selectEdge: (id: string) => void
  clearSelection: () => void
  updateNodeParams: (nodeId: string, patch: ProcessParams) => void
  updateNodeMeta: (
    nodeId: string,
    patch: Partial<Pick<ProcessNode['data'], 'label' | 'cnLabel' | 'tag'>>,
  ) => void
  updateStreamRole: (nodeId: string, role: StreamRole) => void
  updateEdgeData: (
    edgeId: string,
    patch: Partial<{ tag: string; name: string }>,
  ) => void
  undo: () => void
  redo: () => void
  resetToDemo: () => void
  markSaved: (savedAt: string) => void
}

function initialWorkspace(): {
  nodes: ProcessNode[]
  edges: ProcessEdge[]
  savedAt: string | null
  wasRestored: boolean
} {
  const restored = loadFlowsheet()
  if (restored) {
    return {
      nodes: restored.nodes,
      edges: restored.edges,
      savedAt: restored.savedAt,
      wasRestored: true,
    }
  }

  const demo = createDemoFlowsheet()
  return {
    nodes: demo.nodes,
    edges: demo.edges,
    savedAt: null,
    wasRestored: false,
  }
}

export function useFlowsheet(): UseFlowsheetResult {
  const [initial] = useState(initialWorkspace)
  const [nodes, setNodesState] = useState<ProcessNode[]>(initial.nodes)
  const [edges, setEdgesState] = useState<ProcessEdge[]>(initial.edges)
  const [revision, setRevision] = useState(0)
  const [isDirty, setIsDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(initial.savedAt)
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    future: [],
  })

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const historyRef = useRef(history)
  const transactionRef = useRef(false)
  const coalesceRef = useRef<{ key: string; at: number } | null>(null)

  const applyNodes = useCallback(
    (next: ProcessNode[] | ((current: ProcessNode[]) => ProcessNode[])) => {
      const value =
        typeof next === 'function' ? next(nodesRef.current) : next
      nodesRef.current = value
      setNodesState(value)
    },
    [],
  )

  const applyEdges = useCallback(
    (next: ProcessEdge[] | ((current: ProcessEdge[]) => ProcessEdge[])) => {
      const value =
        typeof next === 'function' ? next(edgesRef.current) : next
      edgesRef.current = value
      setEdgesState(value)
    },
    [],
  )

  const commitHistory = useCallback((next: HistoryState) => {
    historyRef.current = next
    setHistory(next)
  }, [])

  const markChanged = useCallback(() => {
    setRevision((value) => value + 1)
    setIsDirty(true)
  }, [])

  const pushSnapshot = useCallback(
    (coalesceKey?: string) => {
      const now = Date.now()
      if (
        coalesceKey &&
        coalesceRef.current?.key === coalesceKey &&
        now - coalesceRef.current.at < COALESCE_WINDOW
      ) {
        coalesceRef.current = { key: coalesceKey, at: now }
        return
      }

      coalesceRef.current = coalesceKey
        ? { key: coalesceKey, at: now }
        : null
      const snapshot: Snapshot = {
        nodes: nodesRef.current,
        edges: edgesRef.current,
      }
      commitHistory({
        past: [...historyRef.current.past, snapshot].slice(-HISTORY_LIMIT),
        future: [],
      })
    },
    [commitHistory],
  )

  const onNodesChange = useCallback(
    (changes: NodeChangeset<ProcessNode>) => {
      const list = changes.toArray()
      const isFlowChange = list.some(
        (change) =>
          change.type !== 'select' && change.type !== 'dimensions',
      )
      const removalIds = changes
        .getByType('remove')
        .map((change) => change.id)
      const positionChanges = changes.getByType('position')

      if (isFlowChange) {
        if (removalIds.length > 0) {
          pushSnapshot()
        } else if (
          positionChanges.length > 0 &&
          !transactionRef.current
        ) {
          pushSnapshot()
          transactionRef.current = positionChanges.some(
            (change) => change.dragging,
          )
        } else if (positionChanges.length === 0) {
          pushSnapshot()
        }
        markChanged()
      }

      applyNodes(changes.applyTo(nodesRef.current))

      if (removalIds.length > 0) {
        const removed = new Set(removalIds)
        applyEdges((current) =>
          current.filter(
            (edge) =>
              !removed.has(edge.source) && !removed.has(edge.target),
          ),
        )
      }
    },
    [applyEdges, applyNodes, markChanged, pushSnapshot],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChangeset<ProcessEdge>) => {
      const existingIds = new Set(
        edgesRef.current.map((edge) => edge.id),
      )
      const isFlowChange = changes
        .toArray()
        .some(
          (change) =>
            change.type !== 'select' && existingIds.has(change.id),
        )

      if (isFlowChange) {
        pushSnapshot()
        markChanged()
      }

      applyEdges(changes.applyTo(edgesRef.current))
    },
    [applyEdges, markChanged, pushSnapshot],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return
      }
      if (connection.source === connection.target) {
        return
      }

      const existing = edgesRef.current.find(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target,
      )
      if (existing) {
        applyEdges((current) =>
          current.map((edge) => ({
            ...edge,
            selected: edge.id === existing.id,
          })),
        )
        applyNodes((current) =>
          current.map((node) => ({ ...node, selected: false })),
        )
        return
      }

      const source = nodesRef.current.find(
        (node) => node.id === connection.source,
      )
      const target = nodesRef.current.find(
        (node) => node.id === connection.target,
      )
      if (!source || !target) {
        return
      }

      pushSnapshot()
      const edge = createProcessEdge(
        connection,
        edgesRef.current,
        source.data.label,
        target.data.label,
      )
      applyEdges([
        ...edgesRef.current.map((item) => ({
          ...item,
          selected: false,
        })),
        { ...edge, selected: true },
      ])
      applyNodes(
        nodesRef.current.map((node) => ({ ...node, selected: false })),
      )
      markChanged()
    },
    [applyEdges, applyNodes, markChanged, pushSnapshot],
  )

  const onNodeDragStop = useCallback(() => {
    transactionRef.current = false
    coalesceRef.current = null
  }, [])

  const addEquipment = useCallback(
    (kind: EquipmentKind, position: { x: number; y: number }) => {
      const node = createEquipmentNode(kind, position, nodesRef.current)
      pushSnapshot()
      applyNodes([
        ...nodesRef.current.map((item) => ({
          ...item,
          selected: false,
        })),
        { ...node, selected: true },
      ])
      applyEdges(
        edgesRef.current.map((edge) => ({ ...edge, selected: false })),
      )
      markChanged()
    },
    [applyEdges, applyNodes, markChanged, pushSnapshot],
  )

  const deleteNode = useCallback(
    (id: string) => {
      if (!nodesRef.current.some((node) => node.id === id)) {
        return
      }
      pushSnapshot()
      applyNodes(nodesRef.current.filter((node) => node.id !== id))
      applyEdges(
        edgesRef.current.filter(
          (edge) => edge.source !== id && edge.target !== id,
        ),
      )
      markChanged()
    },
    [applyEdges, applyNodes, markChanged, pushSnapshot],
  )

  const deleteEdge = useCallback(
    (id: string) => {
      if (!edgesRef.current.some((edge) => edge.id === id)) {
        return
      }
      pushSnapshot()
      applyEdges(edgesRef.current.filter((edge) => edge.id !== id))
      markChanged()
    },
    [applyEdges, markChanged, pushSnapshot],
  )

  const selectNode = useCallback(
    (id: string) => {
      applyNodes((current) =>
        current.map((node) => ({
          ...node,
          selected: node.id === id,
        })),
      )
      applyEdges((current) =>
        current.map((edge) =>
          edge.selected ? { ...edge, selected: false } : edge,
        ),
      )
    },
    [applyEdges, applyNodes],
  )

  const selectEdge = useCallback(
    (id: string) => {
      applyEdges((current) =>
        current.map((edge) => ({
          ...edge,
          selected: edge.id === id,
        })),
      )
      applyNodes((current) =>
        current.map((node) =>
          node.selected ? { ...node, selected: false } : node,
        ),
      )
    },
    [applyEdges, applyNodes],
  )

  const clearSelection = useCallback(() => {
    applyNodes((current) =>
      current.map((node) =>
        node.selected ? { ...node, selected: false } : node,
      ),
    )
    applyEdges((current) =>
      current.map((edge) =>
        edge.selected ? { ...edge, selected: false } : edge,
      ),
    )
  }, [applyEdges, applyNodes])

  const updateNodeParams = useCallback(
    (nodeId: string, patch: ProcessParams) => {
      const entries = Object.entries(patch).filter(
        ([, value]) => Number.isFinite(value),
      )
      if (entries.length === 0) {
        return
      }
      const node = nodesRef.current.find((item) => item.id === nodeId)
      if (!node) {
        return
      }

      pushSnapshot(
        `params:${nodeId}:${entries.map(([key]) => key).join(',')}`,
      )
      applyNodes((current) =>
        current.map((item) =>
          item.id === nodeId
            ? {
                ...item,
                data: {
                  ...item.data,
                  params: {
                    ...item.data.params,
                    ...Object.fromEntries(entries),
                  },
                },
              }
            : item,
        ),
      )
      markChanged()
    },
    [applyNodes, markChanged, pushSnapshot],
  )

  const updateNodeMeta = useCallback(
    (
      nodeId: string,
      patch: Partial<Pick<ProcessNode['data'], 'label' | 'cnLabel' | 'tag'>>,
    ) => {
      if (Object.keys(patch).length === 0) {
        return
      }
      pushSnapshot(`meta:${nodeId}:${Object.keys(patch).join(',')}`)
      applyNodes((current) =>
        current.map((item) =>
          item.id === nodeId
            ? { ...item, data: { ...item.data, ...patch } }
            : item,
        ),
      )
      markChanged()
    },
    [applyNodes, markChanged, pushSnapshot],
  )

  const updateStreamRole = useCallback(
    (nodeId: string, role: StreamRole) => {
      const node = nodesRef.current.find((item) => item.id === nodeId)
      if (!node || node.data.kind !== 'stream' || node.data.role === role) {
        return
      }

      pushSnapshot()
      applyNodes((current) =>
        current.map((item) =>
          item.id === nodeId
            ? { ...item, data: { ...item.data, role } }
            : item,
        ),
      )
      if (role === 'feed') {
        applyEdges((current) =>
          current.filter((edge) => edge.target !== nodeId),
        )
      } else if (role === 'product') {
        applyEdges((current) =>
          current.filter((edge) => edge.source !== nodeId),
        )
      }
      markChanged()
    },
    [applyEdges, applyNodes, markChanged, pushSnapshot],
  )

  const updateEdgeData = useCallback(
    (
      edgeId: string,
      patch: Partial<{ tag: string; name: string }>,
    ) => {
      pushSnapshot(
        `edge:${edgeId}:${Object.keys(patch).join(',')}`,
      )
      applyEdges((current) =>
        current.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                data: {
                  tag: edge.data?.tag ?? 'S-101',
                  name: edge.data?.name ?? 'Process stream',
                  ...patch,
                },
              }
            : edge,
        ),
      )
      markChanged()
    },
    [applyEdges, markChanged, pushSnapshot],
  )

  const undo = useCallback(() => {
    const previous = historyRef.current.past.at(-1)
    if (!previous) {
      return
    }

    const current: Snapshot = {
      nodes: nodesRef.current,
      edges: edgesRef.current,
    }
    commitHistory({
      past: historyRef.current.past.slice(0, -1),
      future: [current, ...historyRef.current.future].slice(0, HISTORY_LIMIT),
    })
    applyNodes(previous.nodes)
    applyEdges(previous.edges)
    transactionRef.current = false
    coalesceRef.current = null
    markChanged()
  }, [applyEdges, applyNodes, commitHistory, markChanged])

  const redo = useCallback(() => {
    const next = historyRef.current.future[0]
    if (!next) {
      return
    }

    const current: Snapshot = {
      nodes: nodesRef.current,
      edges: edgesRef.current,
    }
    commitHistory({
      past: [...historyRef.current.past, current].slice(-HISTORY_LIMIT),
      future: historyRef.current.future.slice(1),
    })
    applyNodes(next.nodes)
    applyEdges(next.edges)
    transactionRef.current = false
    coalesceRef.current = null
    markChanged()
  }, [applyEdges, applyNodes, commitHistory, markChanged])

  const resetToDemo = useCallback(() => {
    pushSnapshot()
    const demo = createDemoFlowsheet()
    applyNodes(demo.nodes)
    applyEdges(demo.edges)
    transactionRef.current = false
    coalesceRef.current = null
    markChanged()
  }, [applyEdges, applyNodes, markChanged, pushSnapshot])

  const markSaved = useCallback((nextSavedAt: string) => {
    setSavedAt(nextSavedAt)
    setIsDirty(false)
  }, [])

  return {
    nodes,
    edges,
    revision,
    isDirty,
    savedAt,
    wasRestored: initial.wasRestored,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
    addEquipment,
    deleteNode,
    deleteEdge,
    selectNode,
    selectEdge,
    clearSelection,
    updateNodeParams,
    updateNodeMeta,
    updateStreamRole,
    updateEdgeData,
    undo,
    redo,
    resetToDemo,
    markSaved,
  }
}
