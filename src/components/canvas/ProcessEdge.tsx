import type { MouseEvent } from 'react'
import { X } from 'lucide-react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import { useStudioCanvas } from '../../context/studioCanvas'
import {
  formatFlow,
  formatPressure,
  formatTemperature,
} from '../../utils/format'
import './ProcessEdge.css'

export function ProcessEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const { simulation, selectedNodeId, deleteEdge, selectEdge } =
    useStudioCanvas()
  const edgeData = simulation.materialBalance.find(
    (row) => row.edgeId === id,
  )
  const stream = simulation.edgeStreams[id]
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 6,
    offset: 16,
  })

  const tag = edgeData?.tag ?? 'S-???'
  const name = edgeData?.name ?? 'Process stream'
  const isRelated =
    !selected &&
    selectedNodeId !== null &&
    (source === selectedNodeId || target === selectedNodeId)
  const stroke = selected
    ? '#0e9384'
    : isRelated
      ? '#397f7a'
      : '#5b7185'
  const labelTop = labelY - 8

  const handleSelect = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    selectEdge(id)
  }

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    deleteEdge(id)
  }

  return (
    <>
      {isRelated && (
        <path
          d={path}
          className="process-edge-related-halo"
          aria-hidden="true"
        />
      )}
      <path d={path} className="process-edge-casing" aria-hidden="true" />
      <BaseEdge
        id={id}
        path={path}
        className={`process-edge-line${selected ? ' is-selected' : ''}${isRelated ? ' is-related' : ''}`}
        markerEnd={`url(#${selected || isRelated ? 'cps-arrow-active' : 'cps-arrow'})`}
        interactionWidth={22}
        style={{
          stroke,
          strokeWidth: selected ? 2.4 : isRelated ? 2.1 : 1.9,
          filter: selected
            ? 'drop-shadow(0 0 3px rgba(14, 147, 132, 0.24))'
            : isRelated
              ? 'drop-shadow(0 0 2px rgba(14, 147, 132, 0.15))'
              : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`process-edge-label nodrag nopan${selected ? ' is-selected' : ''}${isRelated ? ' is-related' : ''}`}
          style={{
            transform: `translate(-50%, -100%) translate(${labelX}px, ${labelTop}px)`,
          }}
          onClick={handleSelect}
          onPointerDown={(event) => event.stopPropagation()}
          title={`${tag} · ${name}\n${formatFlow(stream?.flow ?? 0)} t/h · ${formatTemperature(stream?.temperature ?? 0)} °C · ${formatPressure(stream?.pressure ?? 0)} bar`}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              selectEdge(id)
            }
          }}
        >
          <span className="process-edge-label__tag">{tag}</span>
          <span className="process-edge-label__value">
            <b>{formatFlow(stream?.flow ?? 0)}</b>
            <small>t/h</small>
          </span>
          <span className="process-edge-label__value">
            <b>{formatTemperature(stream?.temperature ?? 0)}</b>
            <small>°C</small>
          </span>
          {selected && (
            <button
              type="button"
              className="process-edge-label__remove"
              onClick={handleDelete}
              title="删除物流"
              aria-label={`删除物流 ${tag}`}
            >
              <X size={9} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
