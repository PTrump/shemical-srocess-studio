import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { EquipmentPalette } from './components/equipment/EquipmentPalette'
import { FlowCanvas } from './components/canvas/FlowCanvas'
import type { CanvasApi } from './components/canvas/FlowCanvas'
import { TopBar } from './components/layout/TopBar'
import { PropertiesPanel } from './components/panels/PropertiesPanel'
import { ResultsPanel } from './components/results/ResultsPanel'
import { ToastStack } from './components/common/ToastStack'
import { StudioCanvasContext } from './context/studioCanvas'
import { useFlowsheet } from './hooks/useFlowsheet'
import { useToast } from './hooks/useToast'
import {
  buildRunComparison,
  createPendingSimulationView,
  createRunSession,
  isOutcomeStale,
  recordRunOutcome,
  runEngineSimulation,
  type EngineRunOutcome,
} from './simulation'
import type { EquipmentKind, ProcessEdge, ProcessNode } from './types/process'
import { formatClock, formatShortDateTime } from './utils/format'
import { saveFlowsheet } from './utils/storage'
import './App.css'

interface FlowSnapshot {
  nodes: ProcessNode[]
  edges: ProcessEdge[]
  revision: number
}

function Studio() {
  const flow = useFlowsheet()
  const { toasts, notify, dismiss } = useToast()
  const canvasApiRef = useRef<CanvasApi | null>(null)
  const runTimerRef = useRef<number | null>(null)
  const runTokenRef = useRef(0)
  const runningRef = useRef(false)
  const mountedRef = useRef(true)
  const restoreAnnouncedRef = useRef(false)
  const initialRunRef = useRef(false)
  const pendingResetRunRef = useRef(false)
  const [resultsCollapsed, setResultsCollapsed] = useState(false)
  const [runSession, setRunSession] = useState(createRunSession)
  const [running, setRunning] = useState(false)

  const latestRef = useRef<FlowSnapshot>({
    nodes: flow.nodes,
    edges: flow.edges,
    revision: flow.revision,
  })

  useEffect(() => {
    latestRef.current = {
      nodes: flow.nodes,
      edges: flow.edges,
      revision: flow.revision,
    }
  }, [flow.nodes, flow.edges, flow.revision])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      runTokenRef.current += 1
      if (runTimerRef.current !== null) {
        window.clearTimeout(runTimerRef.current)
        runTimerRef.current = null
      }
    }
  }, [])

  const pendingView = useMemo(
    () => createPendingSimulationView(flow.nodes, flow.edges),
    [flow.nodes, flow.edges],
  )
  const simulation = runSession.current?.view ?? pendingView
  const isStale = isOutcomeStale(runSession.current, flow.revision)
  const lastRunAt = runSession.current?.ranAt ?? null
  const comparison = useMemo(
    () =>
      buildRunComparison(
        runSession.previousCompleted?.view ?? null,
        runSession.lastCompleted?.view ?? null,
      ),
    [runSession.lastCompleted, runSession.previousCompleted],
  )
  const history = runSession.lastCompleted

  const notifyOutcome = useCallback(
    (view: EngineRunOutcome['view']) => {
      const firstError = view.diagnostics.find(
        (diagnostic) => diagnostic.severity === 'error',
      )
      if (view.status === 'failed') {
        notify(
          'error',
          'Engine 计算失败',
          firstError?.message ??
            `${view.summary.streamCount} 条物流未产生有效结果，请检查诊断。`,
        )
        return
      }
      if (view.status === 'partial') {
        notify(
          'info',
          'Engine 计算部分完成',
          `${view.summary.unitCount} 个单元 · ${view.summary.streamCount} 条物流 · ${view.diagnostics.length} 条诊断`,
        )
        return
      }
      notify(
        'success',
        'Engine 计算完成',
        `质量闭合 ${
          view.summary.massClosure === null
            ? '不可用'
            : `${view.summary.massClosure.toFixed(1)}%`
        } · ${view.summary.unitCount} 个单元`,
      )
    },
    [notify],
  )

  const createOutcome = useCallback((snapshot: FlowSnapshot): EngineRunOutcome => {
    const view = runEngineSimulation(snapshot.nodes, snapshot.edges, {
      runId: `engine-${Date.now()}-${runTokenRef.current}`,
      calculatedAt: new Date().toISOString(),
    })
    return {
      view,
      revision: snapshot.revision,
      ranAt: Date.now(),
    }
  }, [])

  const commitOutcome = useCallback(
    (nextOutcome: EngineRunOutcome) => {
      setRunSession((current) =>
        recordRunOutcome(current, nextOutcome),
      )
    },
    [],
  )

  const executeRun = useCallback(
    (snapshot: FlowSnapshot, notifyWhenDone = true) => {
      if (runningRef.current) {
        return
      }
      runningRef.current = true
      const token = ++runTokenRef.current
      setRunning(true)

      if (runTimerRef.current !== null) {
        window.clearTimeout(runTimerRef.current)
      }

      runTimerRef.current = window.setTimeout(() => {
        runTimerRef.current = null
        if (!mountedRef.current || token !== runTokenRef.current) {
          runningRef.current = false
          return
        }

        try {
          const nextOutcome = createOutcome(snapshot)
          commitOutcome(nextOutcome)
          if (notifyWhenDone) {
            notifyOutcome(nextOutcome.view)
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : '未知计算错误'
          notify('error', 'Engine 计算异常', message)
        } finally {
          runningRef.current = false
          setRunning(false)
        }
      }, 60)
    },
    [commitOutcome, createOutcome, notify, notifyOutcome],
  )

  useEffect(() => {
    if (initialRunRef.current) {
      return
    }
    initialRunRef.current = true
    const snapshot = {
      nodes: flow.nodes,
      edges: flow.edges,
      revision: flow.revision,
    }
    try {
      commitOutcome(createOutcome(snapshot))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '初始计算失败'
      notify('error', 'Engine 初始化失败', message)
    }
    // This is the intentional one-time initial calculation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!pendingResetRunRef.current) {
      return
    }
    pendingResetRunRef.current = false
    executeRun({
      nodes: flow.nodes,
      edges: flow.edges,
      revision: flow.revision,
    })
  }, [executeRun, flow.edges, flow.nodes, flow.revision])

  const announceRestored = useCallback(() => {
    if (flow.wasRestored && !restoreAnnouncedRef.current) {
      restoreAnnouncedRef.current = true
      notify(
        'info',
        '已恢复本地保存的流程',
        flow.savedAt
          ? `保存于 ${formatShortDateTime(flow.savedAt)}`
          : '已从浏览器本地存储恢复。',
      )
    }
  }, [flow.savedAt, flow.wasRestored, notify])

  useEffect(() => {
    announceRestored()
  }, [announceRestored])

  const handleSave = useCallback(() => {
    try {
      const saved = saveFlowsheet(flow.nodes, flow.edges)
      flow.markSaved(saved.savedAt)
      notify(
        'success',
        '流程已保存到浏览器本地',
        `保存时间 ${formatClock(saved.savedAt)} · localStorage`,
      )
    } catch {
      notify(
        'error',
        '保存失败',
        '浏览器本地存储不可用或空间不足，请检查站点设置。',
      )
    }
  }, [flow, notify])

  const handleRun = useCallback(() => {
    if (runningRef.current) {
      return
    }
    setResultsCollapsed(false)
    const latest = latestRef.current
    executeRun({
      nodes: latest.nodes,
      edges: latest.edges,
      revision: latest.revision,
    })
  }, [executeRun])

  const handleResetDemo = useCallback(() => {
    pendingResetRunRef.current = true
    flow.resetToDemo()
    notify(
      'info',
      '已重置为教学示例',
      '混合与加热实验流程已恢复，正在重新运行 Engine 计算。',
    )
  }, [flow, notify])

  const handlePaletteAdd = useCallback((kind: EquipmentKind) => {
    canvasApiRef.current?.addAtCenter(kind)
  }, [])

  const selectedNodes = flow.nodes.filter((node) => node.selected)
  const selectedEdges = flow.edges.filter((edge) => edge.selected)
  const selectedNode =
    selectedNodes.length === 1 ? selectedNodes[0] : null
  const selectedEdge =
    !selectedNode && selectedEdges.length === 1
      ? selectedEdges[0]
      : null

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isTyping =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      const modifier = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      if (modifier && key === 's') {
        event.preventDefault()
        handleSave()
        return
      }

      if (isTyping) {
        return
      }

      if (modifier && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          flow.redo()
        } else {
          flow.undo()
        }
        return
      }

      if (modifier && key === 'y') {
        event.preventDefault()
        flow.redo()
        return
      }

      if (event.key === 'Escape') {
        flow.clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flow, handleSave])

  const canvasContext = useMemo(
    () => ({
      simulation,
      running,
      selectedNodeId: selectedNode?.id ?? null,
      deleteNode: flow.deleteNode,
      deleteEdge: flow.deleteEdge,
      selectEdge: flow.selectEdge,
    }),
    [
      simulation,
      running,
      selectedNode,
      flow.deleteNode,
      flow.deleteEdge,
      flow.selectEdge,
    ],
  )

  return (
    <div className="studio-app">
      <TopBar
        canUndo={flow.canUndo}
        canRedo={flow.canRedo}
        isDirty={flow.isDirty}
        savedAt={flow.savedAt}
        isRunning={running}
        onUndo={flow.undo}
        onRedo={flow.redo}
        onSave={handleSave}
        onRun={handleRun}
      />

      <div className="studio-workspace">
        <EquipmentPalette onAdd={handlePaletteAdd} />

        <main className="studio-center" aria-label="化学流程仿真工作台">
          <StudioCanvasContext.Provider value={canvasContext}>
            <FlowCanvas
              nodes={flow.nodes}
              edges={flow.edges}
              running={running}
              isStale={isStale}
              canvasApiRef={canvasApiRef}
              onNodesChange={flow.onNodesChange}
              onEdgesChange={flow.onEdgesChange}
              onConnect={flow.onConnect}
              onNodeDragStop={flow.onNodeDragStop}
              onAddEquipment={flow.addEquipment}
              onResetDemo={handleResetDemo}
              onClearSelection={flow.clearSelection}
            />
          </StudioCanvasContext.Provider>

          <ResultsPanel
            simulation={simulation}
            collapsed={resultsCollapsed}
            running={running}
            isStale={isStale}
            lastRunAt={lastRunAt}
            comparison={comparison}
            history={history}
            onToggleCollapsed={() =>
              setResultsCollapsed((value) => !value)
            }
          />
        </main>

        <PropertiesPanel
          key={selectedNode?.id ?? selectedEdge?.id ?? 'overview'}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          nodes={flow.nodes}
          edges={flow.edges}
          simulation={simulation}
          savedAt={flow.savedAt}
          onSelectNode={flow.selectNode}
          onSelectEdge={flow.selectEdge}
          onDeleteNode={flow.deleteNode}
          onDeleteEdge={flow.deleteEdge}
          onUpdateParams={flow.updateNodeParams}
          onUpdateMeta={flow.updateNodeMeta}
          onUpdateRole={flow.updateStreamRole}
          onUpdateEdgeData={flow.updateEdgeData}
        />
      </div>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Studio />
    </ReactFlowProvider>
  )
}
