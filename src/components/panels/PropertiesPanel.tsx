import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type { ChangeEvent } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Info,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import {
  KIND_META,
  STREAM_ROLE_LABELS,
} from '../../data/equipment'
import type {
  EquipmentNodeData,
  ProcessEdge,
  ProcessNode,
  StreamRole,
} from '../../types/process'
import type {
  UiSimulationView,
  UiStreamState,
} from '../../simulation'
import {
  formatFlow,
  formatPercent,
  formatPressure,
  formatShortDateTime,
  formatTemperature,
} from '../../utils/format'
import { EquipmentGlyph } from '../equipment/EquipmentGlyph'
import './PropertiesPanel.css'

interface NumberFieldProps {
  label: string
  value: number
  unit: string
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  digits?: number
}

function formatEditable(value: number): string {
  if (!Number.isFinite(value)) {
    return ''
  }
  return String(Number(value.toFixed(4)))
}

function NumberField({
  label,
  value,
  unit,
  onChange,
  min,
  max,
  step = 1,
  digits = 2,
}: NumberFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState(formatEditable(value))
  const focusedRef = useRef(false)

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(formatEditable(value))
    }
  }, [value])

  if (!onChange) {
    return (
      <div className="inspector-field is-readonly">
        <label htmlFor={id}>{label}</label>
        <div className="field-control">
          <span className="field-value">{value.toFixed(digits)}</span>
          <span className="field-unit">{unit}</span>
        </div>
      </div>
    )
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    setDraft(raw)
    if (raw.trim() === '') {
      return
    }
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) {
      onChange(parsed)
    }
  }

  const handleBlur = () => {
    focusedRef.current = false
    const raw = draft.trim()
    if (raw === '') {
      setDraft(formatEditable(value))
      return
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
      setDraft(formatEditable(value))
      return
    }
    let next = parsed
    if (min !== undefined) {
      next = Math.max(min, next)
    }
    if (max !== undefined) {
      next = Math.min(max, next)
    }
    if (next !== parsed) {
      onChange(next)
    }
    setDraft(formatEditable(next))
  }

  return (
    <div className="inspector-field">
      <label htmlFor={id}>{label}</label>
      <div className="field-control">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          step={step}
          onFocus={() => {
            focusedRef.current = true
          }}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <span className="field-unit">{unit}</span>
      </div>
    </div>
  )
}

function ReadonlyField({
  label,
  value,
  unit,
  digits = 2,
}: {
  label: string
  value: number | null
  unit: string
  digits?: number
}) {
  const text =
    value === null || !Number.isFinite(value)
      ? '—'
      : value.toFixed(digits)
  return (
    <div className="inspector-field is-readonly">
      <label>{label}</label>
      <div className="field-control">
        <span className="field-value">{text}</span>
        <span className="field-unit">{unit}</span>
      </div>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  mono = false,
  maxLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  mono?: boolean
  maxLength?: number
}) {
  const id = useId()
  return (
    <div className="inspector-field">
      <label htmlFor={id}>{label}</label>
      <div className="field-control">
        <input
          id={id}
          type="text"
          className={mono ? 'is-mono' : undefined}
          value={value}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  const id = useId()
  return (
    <div className="inspector-field inspector-field--full">
      <label htmlFor={id}>{label}</label>
      <div className="field-control">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function SectionTitle({
  index,
  title,
  en,
}: {
  index: string
  title: string
  en: string
}) {
  return (
    <div className="inspector-section-title">
      <span className="inspector-section-title__index">{index}</span>
      <span className="inspector-section-title__label">
        {title}
        <em>{en}</em>
      </span>
      <span className="inspector-section-title__rule" />
    </div>
  )
}

function CompositionBar({
  compositionA,
  compositionB,
}: {
  compositionA: number
  compositionB: number
}) {
  return (
    <div className="composition">
      <div className="composition__bar" aria-hidden="true">
        <span style={{ width: `${compositionA}%` }} />
        <span style={{ width: `${compositionB}%` }} />
      </div>
      <div className="composition__legend">
        <span>
          <i className="is-a" />A 组分
          <b>{formatPercent(compositionA)} wt%</b>
        </span>
        <span>
          <i className="is-b" />B 组分
          <b>{formatPercent(compositionB)} wt%</b>
        </span>
      </div>
    </div>
  )
}

function ComputedReadout({ state }: { state: UiStreamState }) {
  return (
    <div className="computed-readout">
      <div>
        <span>流量 F</span>
        <strong>{formatFlow(state.flowTph)}</strong>
        <small>t/h</small>
      </div>
      <div>
        <span>温度 T</span>
        <strong>{formatTemperature(state.temperatureC)}</strong>
        <small>°C</small>
      </div>
      <div>
        <span>压力 P</span>
        <strong>{formatPressure(state.pressureBar)}</strong>
        <small>bar</small>
      </div>
    </div>
  )
}

function NodeParameters({
  node,
  simulation,
  onParams,
  onRole,
}: {
  node: ProcessNode
  simulation: UiSimulationView
  onParams: (patch: Record<string, number>) => void
  onRole: (role: StreamRole) => void
}) {
  const data = node.data
  const inlet = simulation.nodeInputs[node.id] ?? null
  const outlet = simulation.nodeOutputs[node.id] ?? null
  const equipment = simulation.equipment[node.id]
  const dutyKW = equipment?.dutyKW ?? null
  const isStream = data.kind === 'stream'
  const role = data.role ?? 'feed'

  if (isStream) {
    return (
      <>
        <SelectField
          label="物流角色"
          value={role}
          onChange={(value) => onRole(value as StreamRole)}
          options={[
            {
              value: 'feed',
              label: `${STREAM_ROLE_LABELS.feed.label} · Feed`,
            },
            {
              value: 'intermediate',
              label: `${STREAM_ROLE_LABELS.intermediate.label} · Intermediate`,
            },
            {
              value: 'product',
              label: `${STREAM_ROLE_LABELS.product.label} · Product`,
            },
          ]}
        />
        {role === 'feed' ? (
          <>
            <NumberField
              label="进料流量"
              value={data.params.flow ?? 0}
              unit="t/h"
              min={0}
              step={0.1}
              onChange={(value) => onParams({ flow: value })}
            />
            <NumberField
              label="进料温度"
              value={data.params.temperature ?? 25}
              unit="°C"
              step={1}
              onChange={(value) => onParams({ temperature: value })}
            />
            <NumberField
              label="操作压力"
              value={data.params.pressure ?? 1}
              unit="bar"
              min={0}
              step={0.1}
              onChange={(value) => onParams({ pressure: value })}
            />
            <NumberField
              label="A 组分"
              value={data.params.compositionA ?? 0}
              unit="wt%"
              min={0}
              max={100}
              step={1}
              onChange={(value) => onParams({ compositionA: value })}
            />
            <div className="stream-note inspector-field--full">
              <Info size={11} strokeWidth={1.8} />
              进料边界条件，Engine 将由此向下游传播。
            </div>
          </>
        ) : (
          <>
            <div className="field-ro-grid inspector-field--full">
              <ReadonlyField
                label="计算流量"
                value={outlet?.flowTph ?? null}
                unit="t/h"
              />
              <ReadonlyField
                label="计算温度"
                value={outlet?.temperatureC ?? null}
                unit="°C"
                digits={1}
              />
              <ReadonlyField
                label="计算压力"
                value={outlet?.pressureBar ?? null}
                unit="bar"
              />
              <ReadonlyField
                label="A 组分"
                value={outlet?.compositionAWt ?? null}
                unit="wt%"
                digits={1}
              />
            </div>
            <div className="stream-note inspector-field--full">
              <Info size={11} strokeWidth={1.8} />
              {outlet
                ? '工况由 Engine 计算，修改上游参数后需重新运行。'
                : '该物流尚无有效 Engine 结果，不显示替代数值。'}
            </div>
          </>
        )}
      </>
    )
  }

  switch (data.kind) {
    case 'mixer':
      return (
        <>
          <div className="field-ro-grid inspector-field--full">
            <ReadonlyField
              label="入口流量"
              value={inlet?.flowTph ?? null}
              unit="t/h"
            />
            <ReadonlyField
              label="入口温度"
              value={inlet?.temperatureC ?? null}
              unit="°C"
              digits={1}
            />
            <ReadonlyField
              label="出口温度"
              value={outlet?.temperatureC ?? null}
              unit="°C"
              digits={1}
            />
            <ReadonlyField
              label="出口压力"
              value={outlet?.pressureBar ?? null}
              unit="bar"
            />
          </div>
          <ReadonlyField
            label="热负荷"
            value={dutyKW}
            unit="kW"
            digits={1}
          />
          <div className="stream-note inspector-field--full">
            <Info size={11} strokeWidth={1.8} />
            绝热混合：出口温度由 Engine 根据入口 Cp 计算，热负荷为 0；
            出口压力取所有入口压力的最小值。
          </div>
        </>
      )
    case 'heater':
    case 'cooler':
      return (
        <>
          <ReadonlyField
            label="入口温度"
            value={inlet?.temperatureC ?? null}
            unit="°C"
            digits={1}
          />
          <NumberField
            label="出口目标温度"
            value={data.params.targetTemperature ?? 85}
            unit="°C"
            step={1}
            onChange={(value) =>
              onParams({ targetTemperature: value })
            }
          />
          <ReadonlyField
            label="出口压力"
            value={outlet?.pressureBar ?? null}
            unit="bar"
          />
          <ReadonlyField
            label={
              data.kind === 'heater' ? '计算热负荷' : '计算冷负荷'
            }
            value={dutyKW}
            unit="kW"
            digits={1}
          />
          <div className="stream-note inspector-field--full">
            <Info size={11} strokeWidth={1.8} />
            目标温度模式；Engine 按常数 Cp 计算热负荷，出口压力按入口压力处理。
          </div>
        </>
      )
    case 'flash':
      return (
        <>
          <ReadonlyField
            label="操作温度"
            value={data.params.temperature ?? null}
            unit="°C"
            digits={1}
          />
          <ReadonlyField
            label="操作压力"
            value={data.params.pressure ?? null}
            unit="bar"
          />
          <ReadonlyField
            label="汽化率"
            value={data.params.vaporFraction ?? null}
            unit="%"
            digits={1}
          />
          <ReadonlyField
            label="进料流量"
            value={inlet?.flowTph ?? null}
            unit="t/h"
          />
          <div className="stream-note inspector-field--full">
            <Info size={11} strokeWidth={1.8} />
            P2.3 Engine 尚未支持闪蒸相平衡；运行结果会明确标记为
            unsupported，参数不会产生伪造结果。
          </div>
        </>
      )
    case 'separator':
      return (
        <>
          <ReadonlyField
            label="操作温度"
            value={data.params.temperature ?? null}
            unit="°C"
            digits={1}
          />
          <ReadonlyField
            label="操作压力"
            value={data.params.pressure ?? null}
            unit="bar"
          />
          <ReadonlyField
            label="液相分率"
            value={data.params.splitRatio ?? null}
            unit="%"
            digits={1}
          />
          <ReadonlyField
            label="进料流量"
            value={inlet?.flowTph ?? null}
            unit="t/h"
          />
          <div className="stream-note inspector-field--full">
            <Info size={11} strokeWidth={1.8} />
            P2.3 Engine 尚未支持分离计算；运行结果会明确标记为
            unsupported，不显示虚构出口。
          </div>
        </>
      )
    case 'pump':
      return (
        <>
          <ReadonlyField
            label="入口压力"
            value={inlet?.pressureBar ?? null}
            unit="bar"
          />
          <ReadonlyField
            label="目标出口压力"
            value={data.params.outletPressure ?? null}
            unit="bar"
          />
          <ReadonlyField
            label="泵效率"
            value={data.params.efficiency ?? null}
            unit="%"
            digits={1}
          />
          <ReadonlyField
            label="轴功率"
            value={dutyKW}
            unit="kW"
            digits={2}
          />
          <div className="stream-note inspector-field--full">
            <Info size={11} strokeWidth={1.8} />
            P2.3 Engine 尚未支持泵计算；运行结果会明确标记为
            unsupported，参数不会产生伪造结果。
          </div>
        </>
      )
    default:
      return null
  }
}

function FlowSheetOverview({
  nodes,
  simulation,
  savedAt,
  onSelectNode,
}: {
  nodes: ProcessNode[]
  simulation: UiSimulationView
  savedAt: string | null
  onSelectNode: (id: string) => void
}) {
  return (
    <div className="inspector-overview">
      <div className="project-card">
        <span className="project-card__eyebrow">PROJECT · PFD-001</span>
        <h2>混合与加热实验</h2>
        <p>两股进料混合后经加热器升温至产品温度</p>
        <div className="project-card__stats">
          <div>
            <span>单元</span>
            <strong>{simulation.summary.unitCount}</strong>
          </div>
          <div>
            <span>物流</span>
            <strong>{simulation.summary.streamCount}</strong>
          </div>
          <div>
            <span>状态</span>
            <strong>{simulation.status.toUpperCase()}</strong>
          </div>
        </div>
      </div>

      <SectionTitle index="01" title="流程导航" en="NAVIGATION" />
      <div className="node-list">
        {nodes.length === 0 && (
          <div className="node-list__empty">
            暂无设备，请从左侧设备库添加。
          </div>
        )}
        {nodes.map((node) => {
          const meta = KIND_META[node.data.kind]
          return (
            <button
              key={node.id}
              type="button"
              className="node-list__item"
              onClick={() => onSelectNode(node.id)}
            >
              <span className="node-list__glyph">
                <EquipmentGlyph
                  kind={node.data.kind}
                  role={node.data.role}
                />
              </span>
              <span className="node-list__copy">
                <strong>{node.data.label}</strong>
                <span>
                  {node.data.tag} · {meta.cnName}
                </span>
              </span>
              <ChevronRight size={13} strokeWidth={1.7} />
            </button>
          )
        })}
      </div>

      <SectionTitle index="02" title="教学说明" en="TEACHING NOTE" />
      <div className="teaching-note">
        <Info size={13} strokeWidth={1.8} />
        <p>
          本工作台使用 Engine 执行稳态质量与常数 Cp 能量衡算。
          <strong>Teaching Binary Fluid 为假想教学物性，不代表真实化学物质或工程结果</strong>。
        </p>
      </div>

      <div className="overview-foot">
        <span>本地保存</span>
        <strong>{formatShortDateTime(savedAt)}</strong>
      </div>
    </div>
  )
}

function ConnectionList({
  nodeId,
  nodes,
  edges,
  simulation,
  onSelectEdge,
}: {
  nodeId: string
  nodes: ProcessNode[]
  edges: ProcessEdge[]
  simulation: UiSimulationView
  onSelectEdge: (id: string) => void
}) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const incoming = edges.filter((edge) => edge.target === nodeId)
  const outgoing = edges.filter((edge) => edge.source === nodeId)

  const renderEdge = (edge: ProcessEdge, direction: 'in' | 'out') => {
    const otherId = direction === 'in' ? edge.source : edge.target
    const other = nodeById.get(otherId)
    const stream = simulation.edgeStreams[edge.id]
    const streamStatus =
      simulation.streams[edge.id]?.status ?? 'unavailable'
    return (
      <button
        key={edge.id}
        type="button"
        className="connection-item"
        onClick={() => onSelectEdge(edge.id)}
        title={`选择物流 ${edge.data?.tag ?? ''}`}
      >
        <span className={`connection-item__dir is-${direction}`}>
          <ArrowRight size={10} strokeWidth={2} />
        </span>
        <span className="connection-item__main">
          <span className="connection-item__tag">
            {edge.data?.tag ?? 'S-???'}
          </span>
          <span className="connection-item__name">
            {other?.data.label ?? 'Unknown'}
          </span>
        </span>
        <span className="connection-item__value">
          {stream ? (
            <>
              {formatFlow(stream.flowTph)} <small>t/h</small>
            </>
          ) : (
            <small className={`connection-item__state is-${streamStatus}`}>
              {streamStatus.toUpperCase()}
            </small>
          )}
        </span>
        <ChevronRight size={11} strokeWidth={1.7} />
      </button>
    )
  }

  return (
    <div className="connection-groups">
      <div className="connection-group">
        <div className="connection-group__label">
          入口 IN
          <b>{incoming.length}</b>
        </div>
        {incoming.length > 0 ? (
          incoming.map((edge) => renderEdge(edge, 'in'))
        ) : (
          <div className="connection-empty">无上游物流</div>
        )}
      </div>
      <div className="connection-group">
        <div className="connection-group__label">
          出口 OUT
          <b>{outgoing.length}</b>
        </div>
        {outgoing.length > 0 ? (
          outgoing.map((edge) => renderEdge(edge, 'out'))
        ) : (
          <div className="connection-empty">无下游物流</div>
        )}
      </div>
    </div>
  )
}

interface PropertiesPanelProps {
  selectedNode: ProcessNode | null
  selectedEdge: ProcessEdge | null
  nodes: ProcessNode[]
  edges: ProcessEdge[]
  simulation: UiSimulationView
  savedAt: string | null
  onSelectNode: (id: string) => void
  onSelectEdge: (id: string) => void
  onDeleteNode: (id: string) => void
  onDeleteEdge: (id: string) => void
  onUpdateParams: (
    nodeId: string,
    patch: Record<string, number>,
  ) => void
  onUpdateMeta: (
    nodeId: string,
    patch: Partial<Pick<EquipmentNodeData, 'label' | 'tag'>>,
  ) => void
  onUpdateRole: (nodeId: string, role: StreamRole) => void
  onUpdateEdgeData: (
    edgeId: string,
    patch: Partial<{ tag: string; name: string }>,
  ) => void
}

export function PropertiesPanel({
  selectedNode,
  selectedEdge,
  nodes,
  edges,
  simulation,
  savedAt,
  onSelectNode,
  onSelectEdge,
  onDeleteNode,
  onDeleteEdge,
  onUpdateParams,
  onUpdateMeta,
  onUpdateRole,
  onUpdateEdgeData,
}: PropertiesPanelProps) {
  const scope = selectedNode
    ? 'EQUIPMENT'
    : selectedEdge
      ? 'STREAM'
      : 'FLOWSHEET'

  const nodeWarnings = selectedNode
    ? simulation.diagnostics.filter(
        (diagnostic) =>
          diagnostic.scope.type === 'node' &&
          diagnostic.scope.nodeId === selectedNode.id,
      )
    : []
  const selectedEquipment = selectedNode
    ? simulation.equipment[selectedNode.id]
    : undefined
  const selectedEdgeResult = selectedEdge
    ? simulation.streams[selectedEdge.id]
    : undefined
  const selectedEdgeStream = selectedEdge
    ? simulation.edgeStreams[selectedEdge.id]
    : undefined

  return (
    <aside className="properties-panel" aria-label="属性面板">
      <header className="inspector-head">
        <div className="inspector-head__title">
          <span className="inspector-head__eyebrow">INSPECTOR</span>
          <h2>属性检查器</h2>
        </div>
        <span className="inspector-head__scope">{scope}</span>
      </header>

      <div className="inspector-scroll">
        {!selectedNode && !selectedEdge && (
          <FlowSheetOverview
            nodes={nodes}
            simulation={simulation}
            savedAt={savedAt}
            onSelectNode={onSelectNode}
          />
        )}

        {selectedNode && (
          <div className="inspector-node">
            <div className="object-head">
              <span className="object-head__glyph">
                <EquipmentGlyph
                  kind={selectedNode.data.kind}
                  role={selectedNode.data.role}
                  selected
                />
              </span>
              <div className="object-head__copy">
                <span className="object-head__eyebrow">
                  {KIND_META[selectedNode.data.kind].code} ·{' '}
                  {KIND_META[selectedNode.data.kind].cnName}
                </span>
                <h2>{selectedNode.data.label}</h2>
                <span className="object-head__tag">
                  {selectedNode.data.tag}
                </span>
              </div>
            </div>

            <div className="inspector-identity">
              <TextField
                label="名称"
                value={selectedNode.data.label}
                onChange={(value) =>
                  onUpdateMeta(selectedNode.id, { label: value })
                }
                maxLength={28}
              />
              <TextField
                label="位号"
                value={selectedNode.data.tag}
                onChange={(value) =>
                  onUpdateMeta(selectedNode.id, { tag: value })
                }
                mono
                maxLength={18}
              />
            </div>

            {selectedEquipment &&
              selectedEquipment.status !== 'calculated' && (
                <div className="inspector-warning">
                  <AlertTriangle size={12} strokeWidth={1.9} />
                  <span>
                    Engine 状态：{selectedEquipment.status.toUpperCase()}
                    {nodeWarnings[0]
                      ? ` · ${nodeWarnings[0].message}`
                      : ''}
                  </span>
                </div>
              )}

            {!selectedEquipment && nodeWarnings.length > 0 && (
              <div className="inspector-warning">
                <AlertTriangle size={12} strokeWidth={1.9} />
                <span>{nodeWarnings[0].message}</span>
              </div>
            )}

            <SectionTitle
              index="01"
              title="操作参数"
              en="OPERATING PARAMETERS"
            />
            <div className="inspector-fields">
              <NodeParameters
                node={selectedNode}
                simulation={simulation}
                onParams={(patch) =>
                  onUpdateParams(selectedNode.id, patch)
                }
                onRole={(role) =>
                  onUpdateRole(selectedNode.id, role)
                }
              />
            </div>

            {simulation.nodeOutputs[selectedNode.id] && (
              <>
                <SectionTitle
                  index="02"
                  title="计算工况"
                  en="ENGINE OUTLET"
                />
                <ComputedReadout
                  state={simulation.nodeOutputs[selectedNode.id]}
                />
                {selectedNode.data.kind === 'stream' && (
                  <CompositionBar
                    compositionA={
                      simulation.nodeOutputs[selectedNode.id].compositionAWt
                    }
                    compositionB={
                      simulation.nodeOutputs[selectedNode.id].compositionBWt
                    }
                  />
                )}
              </>
            )}

            <SectionTitle
              index="03"
              title="连接关系"
              en="CONNECTIONS"
            />
            <ConnectionList
              nodeId={selectedNode.id}
              nodes={nodes}
              edges={edges}
              simulation={simulation}
              onSelectEdge={onSelectEdge}
            />

            <div className="inspector-actions">
              <button
                type="button"
                className="danger-button"
                onClick={() => onDeleteNode(selectedNode.id)}
              >
                <Trash2 size={13} strokeWidth={1.8} />
                删除设备
              </button>
            </div>
          </div>
        )}

        {!selectedNode && selectedEdge && (
          <div className="inspector-edge">
            <div className="object-head">
              <span className="object-head__glyph">
                <EquipmentGlyph kind="stream" role="intermediate" />
              </span>
              <div className="object-head__copy">
                <span className="object-head__eyebrow">
                  STREAM · 物流
                </span>
                <h2>{selectedEdge.data?.tag ?? 'Stream'}</h2>
                <span className="object-head__tag">
                  {selectedEdge.data?.name ?? 'Process stream'}
                </span>
              </div>
            </div>

            <div className="inspector-identity">
              <TextField
                label="物流名称"
                value={selectedEdge.data?.name ?? ''}
                onChange={(value) =>
                  onUpdateEdgeData(selectedEdge.id, { name: value })
                }
                maxLength={36}
              />
              <TextField
                label="物流位号"
                value={selectedEdge.data?.tag ?? ''}
                onChange={(value) =>
                  onUpdateEdgeData(selectedEdge.id, { tag: value })
                }
                mono
                maxLength={18}
              />
            </div>

            <SectionTitle index="01" title="连接关系" en="ROUTE" />
            <div className="route-card">
              {(() => {
                const source = nodes.find(
                  (node) => node.id === selectedEdge.source,
                )
                const target = nodes.find(
                  (node) => node.id === selectedEdge.target,
                )
                return (
                  <>
                    <div>
                      <span>{source?.data.tag ?? '—'}</span>
                      <strong>{source?.data.label ?? 'Unknown'}</strong>
                    </div>
                    <ArrowRight size={15} strokeWidth={1.7} />
                    <div>
                      <span>{target?.data.tag ?? '—'}</span>
                      <strong>{target?.data.label ?? 'Unknown'}</strong>
                    </div>
                  </>
                )
              })()}
            </div>

            <SectionTitle
              index="02"
              title="计算工况"
              en="SIMULATED CONDITIONS"
            />
            {selectedEdgeStream ? (
              <>
                <ComputedReadout state={selectedEdgeStream} />
                <CompositionBar
                  compositionA={selectedEdgeStream.compositionAWt}
                  compositionB={selectedEdgeStream.compositionBWt}
                />
              </>
            ) : (
              <div className="stream-note">
                <Info size={11} strokeWidth={1.8} />
                该物流没有有效 Engine 结果
                {selectedEdgeResult
                  ? `（${selectedEdgeResult.status.toUpperCase()}）`
                  : ''}
                ，不显示替代数值。
              </div>
            )}

            <div className="stream-note stream-note--muted">
              <SlidersHorizontal size={11} strokeWidth={1.8} />
              物流工况由 Engine 计算，修改上游参数后需重新运行。
            </div>

            <div className="inspector-actions">
              <button
                type="button"
                className="danger-button"
                onClick={() => onDeleteEdge(selectedEdge.id)}
              >
                <Trash2 size={13} strokeWidth={1.8} />
                删除物流
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="inspector-foot">
        <span className="inspector-foot__dot" />
        BASIC TEACHING MODEL · ENGINE {simulation.modelVersion ?? ''}
      </footer>
    </aside>
  )
}
