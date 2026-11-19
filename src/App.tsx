import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { simulateProcess } from './data/demoSimulation'
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
import type { EquipmentKind } from './types/process'
import { formatClock, formatShortDateTime } from './utils/format'
import { saveFlowsheet } from './utils/storage'
import './App.css'

function Studio() {
  const flow = useFlowsheet()
  const { toasts, notify, dismiss } = useToast()
  const canvasApiRef = useRef<CanvasApi | null>(null)
  const runTimerRef = useRef<number | null>(null)
  const restoreAnnouncedRef = useRef(false)
  const [resultsCollapsed, setResultsCollapsed] = useState(false)
  const [running, setRunning] = useState(false)
  const [lastRunAt, setLastRunAt] = useState<number | null>(null)
  const [lastRunRevision, setLastRunRevision] = useState<number | null>(null)

  const latestRef = useRef({
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

  const simulation = useMemo(
    () => simulateProcess(flow.nodes, flow.edges),
    [flow.nodes, flow.edges],
  )

  const selectedNodes = flow.nodes.filter((node) => node.selected)
  const selectedEdges = flow.edges.filter((edge) => edge.selected)
  const selectedNode =
    selectedNodes.length === 1 ? selectedNodes[0] : null
  const selectedEdge =
    !selectedNode && selectedEdges.length === 1
      ? selectedEdges[0]
      : null

  const isStale =
    lastRunAt !== null && lastRunRevision !== flow.revision

  const announceRestored = useCallback(() => {
    if (
      flow.wasRestored &&
      !restoreAnnouncedRef.current
    ) {
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

  useEffect(() => {
    return () => {
      if (runTimerRef.current !== null) {
        window.clearTimeout(runTimerRef.current)
      }
    }
  }, [])

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
    if (running) {
      return
    }

    setRunning(true)
    setResultsCollapsed(false)

    if (runTimerRef.current !== null) {
      window.clearTimeout(runTimerRef.current)
    }

    runTimerRef.current = window.setTimeout(() => {
      runTimerRef.current = null
      const latest = latestRef.current
      const result = simulateProcess(latest.nodes, latest.edges)
      setLastRunAt(Date.now())
      setLastRunRevision(latest.revision)
      setRunning(false)

      if (result.warnings.length > 0) {
        notify(
          'info',
          '演示计算完成',
          `${result.summary.unitCount} 个单元 · ${result.summary.streamCount} 条物流 · ${result.warnings.length} 条模型提示`,
        )
      } else {
        notify(
          'success',
          '演示计算完成',
          `${result.summary.unitCount} 个单元 · ${result.summary.streamCount} 条物流 · 质量闭合 ${result.summary.massClosure.toFixed(1)}%`,
        )
      }
    }, 820)
  }, [notify, running])

  const handleResetDemo = useCallback(() => {
    flow.resetToDemo()
    notify(
      'info',
      '已重置为教学示例',
      '混合与加热实验流程已恢复，可使用撤销找回此前内容。',
    )
  }, [flow, notify])

  const handlePaletteAdd = useCallback((kind: EquipmentKind) => {
    canvasApiRef.current?.addAtCenter(kind)
  }, [])

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
            onToggleCollapsed={() =>
              setResultsCollapsed((value) => !value)
            }
          />
        </main>

        <PropertiesPanel
          key={
            selectedNode?.id ?? selectedEdge?.id ?? 'overview'
          }
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
