import type { DragEvent, RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ReactFlow,
  useReactFlow,
  useViewport,
} from '@xyflow/react'
import type {
  EdgeTypes,
  NodeTypes,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from '@xyflow/react'
import {
  Loader2,
  Maximize2,
  MousePointer2,
  Plus,
  RotateCcw,
  Workflow,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  EQUIPMENT_DRAG_MIME,
  isEquipmentKind,
} from '../../data/equipment'
import type {
  EquipmentKind,
  ProcessEdge,
  ProcessNode,
} from '../../types/process'
import { ProcessEdge as ProcessEdgeComponent } from './ProcessEdge'
import { ProcessNode as ProcessNodeComponent } from './ProcessNode'
import './FlowCanvas.css'

const nodeTypes = {
  stream: ProcessNodeComponent,
  mixer: ProcessNodeComponent,
  heater: ProcessNodeComponent,
  cooler: ProcessNodeComponent,
  flash: ProcessNodeComponent,
  separator: ProcessNodeComponent,
  pump: ProcessNodeComponent,
} satisfies NodeTypes

const edgeTypes = {
  process: ProcessEdgeComponent,
} satisfies EdgeTypes

const DEFAULT_NODE_WIDTH = 176
const DEFAULT_NODE_HEIGHT = 96

export interface CanvasApi {
  addAtCenter: (kind: EquipmentKind) => void
  fitView: () => void
}

interface FlowCanvasProps {
  nodes: ProcessNode[]
  edges: ProcessEdge[]
  running: boolean
  canvasApiRef: RefObject<CanvasApi | null>
  onNodesChange: OnNodesChange<ProcessNode>
  onEdgesChange: OnEdgesChange<ProcessEdge>
  onConnect: OnConnect
  onNodeDragStop: () => void
  onAddEquipment: (
    kind: EquipmentKind,
    position: { x: number; y: number },
  ) => void
  onResetDemo: () => void
  onClearSelection: () => void
}

export function FlowCanvas({
  nodes,
  edges,
  running,
  canvasApiRef,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDragStop,
  onAddEquipment,
  onResetDemo,
  onClearSelection,
}: FlowCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const cascadeRef = useRef(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const { screenToFlowPosition, fitView, zoomIn, zoomOut } =
    useReactFlow<ProcessNode, ProcessEdge>()
  const { zoom } = useViewport()

  const fitCanvas = useCallback(() => {
    void fitView({
      padding: {
        left: '4%',
        right: '4%',
        top: '8%',
        bottom: '8%',
      },
      duration: 420,
      maxZoom: 1.2,
    })
  }, [fitView])

  useEffect(() => {
    if (!canvasApiRef) {
      return
    }

    canvasApiRef.current = {
      addAtCenter: (kind) => {
        const bounds = viewportRef.current?.getBoundingClientRect()
        if (!bounds) {
          return
        }
        const center = screenToFlowPosition({
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        })
        const cascade = cascadeRef.current % 5
        cascadeRef.current += 1
        onAddEquipment(kind, {
          x: center.x - DEFAULT_NODE_WIDTH / 2 + cascade * 26,
          y: center.y - DEFAULT_NODE_HEIGHT / 2 + cascade * 22,
        })
      },
      fitView: fitCanvas,
    }

    return () => {
      canvasApiRef.current = null
    }
  }, [
    canvasApiRef,
    fitCanvas,
    onAddEquipment,
    screenToFlowPosition,
  ])

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!isDragOver) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const related = event.relatedTarget
    if (related instanceof Node && event.currentTarget.contains(related)) {
      return
    }
    setIsDragOver(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    const kind = event.dataTransfer.getData(EQUIPMENT_DRAG_MIME)
    if (!isEquipmentKind(kind)) {
      return
    }
    const point = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })
    onAddEquipment(kind, {
      x: point.x - DEFAULT_NODE_WIDTH / 2,
      y: point.y - DEFAULT_NODE_HEIGHT / 2,
    })
  }

  const handleReset = () => {
    onResetDemo()
    window.setTimeout(fitCanvas, 80)
  }

  return (
    <section
      className={`flow-canvas${running ? ' is-running' : ''}`}
      aria-label="工艺流程图"
    >
      <header className="flow-canvas__header">
        <div className="flow-canvas__heading">
          <span className="flow-canvas__icon">
            <Workflow size={15} strokeWidth={1.8} />
          </span>
          <div>
            <h2>
              工艺流程图
              <span>PROCESS FLOW DIAGRAM</span>
            </h2>
            <p>混合与加热实验 · PFD-001</p>
          </div>
        </div>

        <div className="flow-canvas__meta">
          <span className="canvas-model-tag">
            <span />
            DEMO MODEL
          </span>
          <span className="canvas-count">
            <b>{nodes.length}</b> 个节点
          </span>
          <span className="canvas-count-sep">/</span>
          <span className="canvas-count">
            <b>{edges.length}</b> 条物流
          </span>
          {running && (
            <span className="canvas-solving">
              <Loader2 size={11} strokeWidth={2} className="spin" />
              求解中
            </span>
          )}
        </div>

        <div className="flow-canvas__actions">
          <button
            type="button"
            className="canvas-action"
            onClick={fitCanvas}
            title="适应画布"
          >
            <Maximize2 size={13} strokeWidth={1.8} />
            <span>适应画布</span>
          </button>
          <button
            type="button"
            className="canvas-action"
            onClick={handleReset}
            title="重新载入教学示例流程"
          >
            <RotateCcw size={13} strokeWidth={1.8} />
            <span>重置示例</span>
          </button>
        </div>
      </header>

      <div
        ref={viewportRef}
        className={`flow-canvas__viewport${isDragOver ? ' is-drop-target' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <ReactFlow<ProcessNode, ProcessEdge>
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onClearSelection}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'process' }}
          fitView
          fitViewOptions={{
            padding: {
              left: '4%',
              right: '4%',
              top: '8%',
              bottom: '8%',
            },
            maxZoom: 1.2,
          }}
          minZoom={0.32}
          maxZoom={1.8}
          snapToGrid
          snapGrid={[8, 8]}
          panOnScroll={false}
          zoomOnDoubleClick={false}
          deleteKeyCode={['Backspace', 'Delete']}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{
            stroke: '#0e9384',
            strokeWidth: 2,
            strokeDasharray: '5 4',
          }}
          isValidConnection={(connection) =>
            connection.source !== connection.target
          }
          aria-label="Chemical Process Studio 流程画布"
        >
          <Background
            id="major-grid"
            variant={BackgroundVariant.Lines}
            gap={100}
            lineWidth={1}
            color="#e3ecf4"
          />
          <Background
            id="minor-grid"
            variant={BackgroundVariant.Lines}
            gap={20}
            lineWidth={0.6}
            color="#eef3f8"
          />
        </ReactFlow>

        <svg className="edge-marker-defs" aria-hidden="true">
          <defs>
            <marker
              id="cps-arrow"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 Z" fill="#5b7185" />
            </marker>
            <marker
              id="cps-arrow-active"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 Z" fill="#0e9384" />
            </marker>
          </defs>
        </svg>

        {nodes.length === 0 && (
          <div className="canvas-empty">
            <span className="canvas-empty__icon">
              <MousePointer2 size={21} strokeWidth={1.6} />
            </span>
            <h3>流程画布为空</h3>
            <p>从左侧设备库拖入设备，或单击设备快速添加。</p>
            <button type="button" onClick={handleReset}>
              <RotateCcw size={12} strokeWidth={2} />
              载入教学示例
            </button>
          </div>
        )}

        {isDragOver && (
          <div className="canvas-drop-overlay" aria-hidden="true">
            <span>
              <Plus size={17} strokeWidth={2} />
              释放以添加设备
            </span>
          </div>
        )}

        <div className="canvas-controls" aria-label="画布缩放控制">
          <button
            type="button"
            onClick={() => void zoomOut({ duration: 160 })}
            title="缩小"
            aria-label="缩小"
          >
            <ZoomOut size={13} strokeWidth={1.9} />
          </button>
          <span className="canvas-controls__zoom">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => void zoomIn({ duration: 160 })}
            title="放大"
            aria-label="放大"
          >
            <ZoomIn size={13} strokeWidth={1.9} />
          </button>
          <span className="canvas-controls__divider" aria-hidden="true" />
          <button
            type="button"
            onClick={fitCanvas}
            title="适应画布"
            aria-label="适应画布"
          >
            <Maximize2 size={13} strokeWidth={1.9} />
          </button>
        </div>

        <div className="canvas-hint">
          <span>拖动空白平移</span>
          <i />
          <span>滚轮缩放</span>
          <i />
          <span>Delete 删除</span>
        </div>
      </div>
    </section>
  )
}
