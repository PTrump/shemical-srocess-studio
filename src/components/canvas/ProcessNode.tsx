import type { MouseEvent } from 'react'
import { X } from 'lucide-react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { useStudioCanvas } from '../../context/studioCanvas'
import {
  KIND_META,
  STREAM_ROLE_LABELS,
} from '../../data/equipment'
import type {
  EquipmentNodeData,
  StreamRole,
} from '../../types/process'
import {
  formatFlow,
  formatTemperature,
} from '../../utils/format'
import { EquipmentGlyph } from '../equipment/EquipmentGlyph'
import './ProcessNode.css'

const STATUS_LABELS: Record<string, string> = {
  calculated: 'CALCULATED',
  blocked: 'BLOCKED',
  failed: 'FAILED',
  unsupported: 'UNSUPPORTED',
  unavailable: '—',
}

function readoutValue(value: number | undefined, digits: 1 | 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—'
  }
  return digits === 2
    ? formatFlow(value)
    : formatTemperature(value)
}

export function ProcessNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as EquipmentNodeData
  const { simulation, deleteNode } = useStudioCanvas()
  const equipment = simulation.equipment[id]
  const state = simulation.nodeOutputs[id]
  const isStream = nodeData.kind === 'stream'
  const role: StreamRole = nodeData.role ?? 'feed'
  const canReceive = !isStream || role !== 'feed'
  const canSend = !isStream || role !== 'product'
  const kindMeta = KIND_META[nodeData.kind]
  const roleMeta = STREAM_ROLE_LABELS[role]
  const glyphRole = isStream ? role : undefined
  const status = equipment?.status ?? 'unavailable'
  const statusLabel =
    simulation.status === 'pending'
      ? 'PENDING'
      : STATUS_LABELS[status] ?? status

  const flow = state?.flowTph
  const temperature = state?.temperatureC

  const stateLabel = isStream
    ? roleMeta.en.toUpperCase()
    : `${nodeData.params.targetTemperature !== undefined ? 'TARGET' : 'UNIT'}`

  const handleDelete = (event: MouseEvent) => {
    event.stopPropagation()
    deleteNode(id)
  }

  return (
    <article
      className={[
        'process-node',
        `process-node--${nodeData.kind}`,
        isStream ? `process-node--${role}` : '',
        selected ? 'is-selected' : '',
        status !== 'calculated' ? `is-status-${status}` : '',
        simulation.status === 'pending' ? 'is-status-pending' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={`${nodeData.tag} · ${nodeData.label} · ${nodeData.cnLabel}\n状态 ${statusLabel}\nF ${readoutValue(flow, 2)} t/h · T ${readoutValue(temperature, 1)} °C`}
    >
      {canReceive && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="node-port node-port--in"
          aria-label={`${nodeData.label} 入口`}
        />
      )}
      {canSend && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="node-port node-port--out"
          aria-label={`${nodeData.label} 出口`}
        />
      )}

      <button
        type="button"
        className="node-delete nodrag nopan"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={handleDelete}
        title="删除节点"
        aria-label={`删除 ${nodeData.label}`}
      >
        <X size={10} strokeWidth={2.2} />
      </button>

      <header className="process-node__top">
        <span className="process-node__tag">{nodeData.tag}</span>
        <span className="process-node__kind">
          {isStream ? `STREAM · ${stateLabel}` : kindMeta.code}
          {status !== 'calculated' || simulation.status === 'pending' ? (
            <em className={`process-node__status is-${status}`}>
              {statusLabel}
            </em>
          ) : null}
        </span>
      </header>

      <div className="process-node__main">
        <span className="process-node__glyph">
          <EquipmentGlyph
            kind={nodeData.kind}
            role={glyphRole}
            selected={selected}
          />
        </span>
        <span className="process-node__identity">
          <strong>{nodeData.label}</strong>
          <span>{isStream ? roleMeta.label : nodeData.cnLabel}</span>
        </span>
      </div>

      <div className="process-node__readout" aria-label="Engine 计算工况">
        <span>
          <em>F</em>
          <b>{readoutValue(flow, 2)}</b>
          <small>t/h</small>
        </span>
        <i aria-hidden="true" />
        <span>
          <em>T</em>
          <b>{readoutValue(temperature, 1)}</b>
          <small>°C</small>
        </span>
      </div>
    </article>
  )
}
