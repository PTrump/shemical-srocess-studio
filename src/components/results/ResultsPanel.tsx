import { useMemo, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import {
  AxisPointerComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
} from 'lucide-react'
import { KIND_META } from '../../data/equipment'
import type {
  ComparisonMetric,
  EngineRunOutcome,
  RunComparison,
  UiChartPoint,
  UiEnergyRow,
  UiMaterialRow,
  UiSimulationView,
} from '../../simulation'
import { displayTraceValue } from '../../simulation'
import type { CalculationTrace } from '../../engine'
import {
  formatClock,
  formatDuty,
  formatFlow,
  formatNumber,
  formatPercent,
  formatPressure,
  formatSigned,
  formatTemperature,
} from '../../utils/format'
import './ResultsPanel.css'

echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  CanvasRenderer,
])

type ResultsTab =
  | 'summary'
  | 'material'
  | 'energy'
  | 'charts'
  | 'compare'
  | 'trace'

const TABS: Array<{ id: ResultsTab; label: string; en: string }> = [
  { id: 'summary', label: '概要', en: 'SUMMARY' },
  { id: 'material', label: '物料平衡', en: 'MATERIAL' },
  { id: 'energy', label: '能量平衡', en: 'ENERGY' },
  { id: 'charts', label: '图表', en: 'CHARTS' },
  { id: 'compare', label: '对比', en: 'COMPARE' },
  { id: 'trace', label: '计算详情', en: 'TRACE' },
]

const STATUS_TEXT: Record<string, string> = {
  pending: '等待运行',
  success: '计算成功',
  partial: '部分结果',
  failed: '计算失败',
}

interface ResultsPanelProps {
  simulation: UiSimulationView
  collapsed: boolean
  running: boolean
  isStale: boolean
  lastRunAt: number | null
  comparison: RunComparison | null
  history: EngineRunOutcome | null
  onToggleCollapsed: () => void
}

function nullable(
  value: number | null,
  formatter: (number: number) => string,
): string {
  return value === null || !Number.isFinite(value) ? '—' : formatter(value)
}

function statusLabel(status: string): string {
  return STATUS_TEXT[status] ?? status
}

function DiagnosticsStrip({ simulation }: { simulation: UiSimulationView }) {
  if (simulation.diagnostics.length === 0) {
    return null
  }
  const errors = simulation.diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  )
  const primary = errors[0] ?? simulation.diagnostics[0]
  return (
    <div
      className={`results-diagnostics-strip${errors.length > 0 ? ' is-error' : ''}`}
      title={simulation.diagnostics
        .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
        .join('\n')}
    >
      <AlertTriangle size={11} strokeWidth={1.9} />
      <span>
        {errors.length > 0 ? `${errors.length} 个错误` : '模型提示'} ·{' '}
        {primary.message}
      </span>
      {simulation.diagnostics.length > 1 && (
        <b>+{simulation.diagnostics.length - 1}</b>
      )}
    </div>
  )
}

function HistoryReference({ history }: { history: EngineRunOutcome }) {
  const { summary } = history.view
  return (
    <div className="history-reference">
      <div className="history-reference__head">
        <span>上次成功结果</span>
        <em>
          {history.view.executedAt
            ? formatClock(history.view.executedAt)
            : '历史运行'}
        </em>
      </div>
      <div className="history-reference__values">
        <span>
          进料 <b>{nullable(summary.totalFeedTph, formatFlow)}</b> t/h
        </span>
        <span>
          产品 <b>{nullable(summary.productFlowTph, formatFlow)}</b> t/h
        </span>
        <span>
          出口 <b>{nullable(summary.outletTemperatureC, formatTemperature)}</b> °C
        </span>
        <span>
          净热负荷 <b>{nullable(summary.netDutyKW, formatDuty)}</b> kW
        </span>
        <span>
          闭合{' '}
          <b>
            {nullable(summary.massClosure, formatPercent)} %
          </b>
        </span>
      </div>
      <p>本次运行失败；以上是历史参考，不代表当前流程或本次运行结果。</p>
    </div>
  )
}

function FailureView({
  simulation,
  history,
}: {
  simulation: UiSimulationView
  history: EngineRunOutcome | null
}) {
  const errors = simulation.diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  )
  return (
    <div className="result-state">
      <div className="result-state__head">
        <span className="result-state__glyph is-error">
          <AlertTriangle size={16} strokeWidth={1.8} />
        </span>
        <div>
          <h3>Engine 计算失败</h3>
          <p>
            本次运行未生成成功 KPI。请修正诊断后重新运行；历史结果会保留并明确标注。
          </p>
        </div>
      </div>
      <div className="diagnostic-list">
        {(errors.length > 0 ? errors : simulation.diagnostics).map(
          (diagnostic, index) => (
            <div
              className={`diagnostic-item is-${diagnostic.severity}`}
              key={`${diagnostic.code}-${index}`}
            >
              <span className="diagnostic-item__code">
                {diagnostic.code}
              </span>
              <span className="diagnostic-item__message">
                {diagnostic.message}
              </span>
              {diagnostic.scope.type === 'node' && (
                <span className="diagnostic-item__scope">
                  {diagnostic.scope.nodeId}
                </span>
              )}
              {diagnostic.scope.type === 'edge' && (
                <span className="diagnostic-item__scope">
                  {diagnostic.scope.edgeId}
                </span>
              )}
            </div>
          ),
        )}
      </div>
      {history && <HistoryReference history={history} />}
    </div>
  )
}

function PendingView() {
  return (
    <div className="result-state">
      <div className="result-state__head">
        <span className="result-state__glyph">
          <Info size={16} strokeWidth={1.8} />
        </span>
        <div>
          <h3>等待 Engine 计算</h3>
          <p>编辑流程后点击右上角“运行仿真”，结果只来自本次 Engine 运行。</p>
        </div>
      </div>
    </div>
  )
}

function SummaryView({
  simulation,
  history,
}: {
  simulation: UiSimulationView
  history: EngineRunOutcome | null
}) {
  if (simulation.status === 'pending') {
    return <PendingView />
  }
  if (simulation.status === 'failed') {
    return <FailureView simulation={simulation} history={history} />
  }

  const { summary, balances } = simulation
  const massClosure = summary.massClosure
  const energyTotal =
    (summary.heatingDutyKW ?? 0) + (summary.coolingDutyKW ?? 0)
  const balanceAvailable = balances.status === 'calculated'

  return (
    <div className="summary-view">
      <div className="kpi-grid">
        <article className="kpi-card kpi-card--teal">
          <div className="kpi-card__head">
            <span>总进料流量</span>
            <em>TOTAL FEED</em>
          </div>
          <div className="kpi-card__value">
            <strong>{nullable(summary.totalFeedTph, formatFlow)}</strong>
            <span>t/h</span>
          </div>
          <p>
            {summary.feedCount} 股进料 · 产品{' '}
            {nullable(summary.productFlowTph, formatFlow)} t/h
          </p>
        </article>

        <article className="kpi-card kpi-card--blue">
          <div className="kpi-card__head">
            <span>出口温度</span>
            <em>OUTLET TEMP</em>
          </div>
          <div className="kpi-card__value">
            <strong>
              {nullable(summary.outletTemperatureC, (value) =>
                formatNumber(value, 1, false),
              )}
            </strong>
            <span>°C</span>
          </div>
          <p>
            进料加权温度 {nullable(summary.feedTemperatureC, formatTemperature)} °C
          </p>
        </article>

        <article className="kpi-card kpi-card--amber">
          <div className="kpi-card__head">
            <span>净热负荷</span>
            <em>NET DUTY</em>
          </div>
          <div className="kpi-card__value">
            <strong>
              {nullable(summary.netDutyKW, (value) =>
                formatNumber(value, 1, false),
              )}
            </strong>
            <span>kW</span>
          </div>
          <p>
            加热 {nullable(summary.heatingDutyKW, formatDuty)} · 冷却{' '}
            {nullable(summary.coolingDutyKW, formatDuty)} kW
          </p>
        </article>

        <article className="kpi-card kpi-card--slate">
          <div className="kpi-card__head">
            <span>物料闭合</span>
            <em>MASS CLOSURE</em>
          </div>
          <div className="kpi-card__value">
            <strong>{nullable(massClosure, (value) =>
              formatNumber(value, 1, false),
            )}</strong>
            <span>%</span>
          </div>
          <p>
            {!balanceAvailable
              ? '平衡结果不可用'
              : `${summary.productCount} 股产品 · ${summary.streamCount} 条物流`}
          </p>
        </article>
      </div>

      <div className="summary-details">
        <div className="summary-detail">
          <div className="summary-detail__head">
            <span>质量平衡</span>
            <em>MASS BALANCE</em>
          </div>
          <div className="summary-detail__bar">
            <i
              className="is-mass"
              style={{
                width: `${massClosure === null ? 0 : Math.min(100, Math.max(0, massClosure))}%`,
              }}
            />
          </div>
          <div className="summary-detail__line">
            {balanceAvailable ? (
              <>
                <span>
                  进料 <b>{nullable(summary.totalFeedTph, formatFlow)}</b> t/h
                </span>
                <span>
                  产品 <b>{nullable(summary.productFlowTph, formatFlow)}</b> t/h
                </span>
                <span>
                  闭合 <b>{nullable(massClosure, formatPercent)}</b> %
                </span>
              </>
            ) : (
              <span>平衡结果不可用，不显示零值。</span>
            )}
          </div>
        </div>

        <div className="summary-detail">
          <div className="summary-detail__head">
            <span>能量构成</span>
            <em>ENERGY SPLIT</em>
          </div>
          <div className="summary-detail__bar summary-detail__bar--split">
            <i
              className="is-heating"
              style={{
                width: `${
                  summary.heatingDutyKW === null ||
                  summary.coolingDutyKW === null ||
                  energyTotal <= 0
                    ? 0
                    : (summary.heatingDutyKW / energyTotal) * 100
                }%`,
              }}
            />
            <i
              className="is-cooling"
              style={{
                width: `${
                  summary.heatingDutyKW === null ||
                  summary.coolingDutyKW === null ||
                  energyTotal <= 0
                    ? 0
                    : (summary.coolingDutyKW / energyTotal) * 100
                }%`,
              }}
            />
          </div>
          <div className="summary-detail__line">
            <span>
              加热 <b>{nullable(summary.heatingDutyKW, formatDuty)}</b> kW
            </span>
            <span>
              冷却 <b>{nullable(summary.coolingDutyKW, formatDuty)}</b> kW
            </span>
          </div>
        </div>

        <div className="summary-detail">
          <div className="summary-detail__head">
            <span>计算模型</span>
            <em>MODEL</em>
          </div>
          <div className="summary-detail__chips">
            <span>Cp {simulation.heatCapacityKJPerKgK} kJ/kg·K</span>
            <span>{simulation.propertyPackageName}</span>
            <span>{simulation.modelVersion ?? '—'}</span>
          </div>
          <div className="summary-detail__line">
            <span>假想教学组分 · 稳态 · 单相 · 常数 Cp</span>
          </div>
        </div>
      </div>

      <DiagnosticsStrip simulation={simulation} />

      <div className="summary-note">
        <span className="summary-note__disclaimer">
          <Info size={11} strokeWidth={1.8} />
          BASIC TEACHING MODEL · 假想教学物性与常数 Cp，非工业或真实工艺预测。
        </span>
        <span className="summary-note__engine">
          {simulation.runId ? `RUN ${simulation.runId}` : '未运行'}
        </span>
      </div>
    </div>
  )
}

function statusChip(status: string): string {
  return status === 'calculated' ? 'CALC' : status.toUpperCase()
}

function MaterialView({ simulation }: { simulation: UiSimulationView }) {
  const { materialRows, balances } = simulation

  return (
    <div className="balance-view">
      <div className="balance-toolbar">
        <div className="balance-toolbar__title">
          物料平衡表
          <em>MATERIAL BALANCE</em>
        </div>
        <div className="balance-chips">
          <span>
            进料 <b>{nullable(balances.totalFeedTph, formatFlow)}</b> t/h
          </span>
          <span>
            产品 <b>{nullable(balances.totalProductTph, formatFlow)}</b> t/h
          </span>
          <span>
            闭合 <b>{nullable(balances.closurePercent, formatPercent)}</b> %
          </span>
        </div>
      </div>

      {balances.status === 'unavailable' && (
        <div className="balance-unavailable">
          平衡结果不可用：未完整计算、存在阻塞物流，或聚合结果超出数值范围。
        </div>
      )}

      <div className="data-table-wrap">
        {materialRows.length === 0 ? (
          <div className="results-empty">连接设备后显示物料平衡数据。</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>物流 STREAM</th>
                <th>起点 FROM</th>
                <th>终点 TO</th>
                <th className="is-num">流量 t/h</th>
                <th className="is-num">温度 °C</th>
                <th className="is-num">压力 bar</th>
                <th className="is-num">组成 A / B wt%</th>
              </tr>
            </thead>
            <tbody>
              {materialRows.map((row: UiMaterialRow) => (
                <tr
                  key={row.edgeId}
                  className={row.status === 'calculated' ? '' : 'is-blocked'}
                >
                  <td>
                    <StreamCell row={row} />
                  </td>
                  <td>
                    <span className="unit-ref">{row.fromTag}</span>
                    {row.from}
                  </td>
                  <td>
                    <span className="unit-ref">{row.toTag}</span>
                    {row.to}
                  </td>
                  <td className="is-num is-strong">
                    {row.stream ? formatFlow(row.stream.flowTph) : '—'}
                  </td>
                  <td className="is-num">
                    {row.stream ? formatTemperature(row.stream.temperatureC) : '—'}
                  </td>
                  <td className="is-num">
                    {row.stream ? formatPressure(row.stream.pressureBar) : '—'}
                  </td>
                  <td className="is-num is-muted">
                    {row.stream
                      ? `${formatPercent(row.stream.compositionAWt)} / ${formatPercent(row.stream.compositionBWt)}`
                      : '— / —'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StreamCell({ row }: { row: UiMaterialRow }) {
  return (
    <div className="stream-cell">
      <span className="stream-tag">{row.tag}</span>
      <span className="stream-name">{row.name}</span>
      {row.status !== 'calculated' && (
        <span className={`stream-status is-${row.status}`}>
          {statusChip(row.status)}
        </span>
      )}
    </div>
  )
}

function EnergyView({ simulation }: { simulation: UiSimulationView }) {
  const { energyRows, summary } = simulation

  return (
    <div className="balance-view">
      <div className="balance-toolbar">
        <div className="balance-toolbar__title">
          能量平衡
          <em>ENERGY BALANCE</em>
          <code>Q = ṁ · Cp · ΔT</code>
        </div>
        <div className="balance-chips">
          <span>
            加热 <b>{nullable(summary.heatingDutyKW, formatDuty)}</b> kW
          </span>
          <span>
            冷却 <b>{nullable(summary.coolingDutyKW, formatDuty)}</b> kW
          </span>
          <span>
            净值 <b>{nullable(summary.netDutyKW, formatDuty)}</b> kW
          </span>
        </div>
      </div>

      <div className="data-table-wrap">
        {energyRows.length === 0 ? (
          <div className="results-empty">流程中尚无单元设备。</div>
        ) : (
          <table className="data-table energy-table">
            <thead>
              <tr>
                <th>设备 UNIT</th>
                <th>类型 TYPE</th>
                <th className="is-num">负荷 kW</th>
                <th>占比 SHARE</th>
                <th>备注 NOTE</th>
              </tr>
            </thead>
            <tbody>
              {energyRows.map((row: UiEnergyRow) => (
                <tr
                  key={row.nodeId}
                  className={row.status === 'calculated' ? '' : 'is-blocked'}
                >
                  <td>
                    <div className="stream-cell">
                      <span className="stream-tag">{row.tag}</span>
                      <span className="stream-name">{row.name}</span>
                      {row.status !== 'calculated' && (
                        <span className={`stream-status is-${row.status}`}>
                          {statusChip(row.status)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="type-badge">
                      {KIND_META[row.category].code}
                    </span>
                    {KIND_META[row.category].cnName}
                  </td>
                  <td
                    className={`is-num is-strong ${row.dutyKW !== null && row.dutyKW < 0 ? 'is-cooling' : ''}`}
                  >
                    {row.dutyKW === null ? '—' : formatSigned(row.dutyKW)}
                  </td>
                  <td>
                    {row.share === null ? (
                      '—'
                    ) : (
                      <div className="share-cell">
                        <span className="share-bar">
                          <i style={{ width: `${Math.min(100, row.share)}%` }} />
                        </span>
                        <b>{formatPercent(row.share)}%</b>
                      </div>
                    )}
                  </td>
                  <td className="is-note">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function createTemperatureOption(points: UiChartPoint[]) {
  return {
    animation: false,
    color: ['#0e9384'],
    grid: { left: 38, right: 12, top: 18, bottom: 22 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0b1f33',
      borderWidth: 0,
      padding: [5, 7],
      textStyle: { color: '#ffffff', fontSize: 10 },
      axisPointer: {
        lineStyle: { color: '#b9d4d0', type: 'dashed' },
      },
    },
    xAxis: {
      type: 'category',
      data: points.map((point) => point.label),
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#dfe7ef' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#71869a',
        fontSize: 8,
        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
        margin: 7,
      },
    },
    yAxis: {
      type: 'value',
      name: '°C',
      nameTextStyle: { color: '#95a6b5', fontSize: 8, padding: [0, 0, 0, -20] },
      splitLine: { lineStyle: { color: '#edf2f7' } },
      axisLabel: {
        color: '#8194a7',
        fontSize: 8,
        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      },
    },
    series: [
      {
        type: 'line',
        data: points.map((point) => Number(point.value.toFixed(2))),
        smooth: false,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: 1.8 },
        itemStyle: { borderWidth: 1.5, borderColor: '#ffffff' },
        areaStyle: { color: 'rgba(14, 147, 132, 0.07)' },
      },
    ],
  }
}

function createFlowOption(points: UiChartPoint[]) {
  return {
    animation: false,
    color: ['#3d6f9e'],
    grid: { left: 38, right: 12, top: 18, bottom: 22 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0b1f33',
      borderWidth: 0,
      padding: [5, 7],
      textStyle: { color: '#ffffff', fontSize: 10 },
      axisPointer: {
        lineStyle: { color: '#c5d4e0', type: 'dashed' },
      },
    },
    xAxis: {
      type: 'category',
      data: points.map((point) => point.label),
      axisLine: { lineStyle: { color: '#dfe7ef' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#71869a',
        fontSize: 8,
        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
        margin: 7,
      },
    },
    yAxis: {
      type: 'value',
      name: 't/h',
      nameTextStyle: { color: '#95a6b5', fontSize: 8, padding: [0, 0, 0, -20] },
      splitLine: { lineStyle: { color: '#edf2f7' } },
      axisLabel: {
        color: '#8194a7',
        fontSize: 8,
        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
      },
    },
    series: [
      {
        type: 'bar',
        data: points.map((point) => Number(point.value.toFixed(2))),
        barWidth: 18,
        itemStyle: { borderRadius: [2, 2, 0, 0] },
      },
    ],
  }
}

function ChartsView({
  simulation,
  isStale,
}: {
  simulation: UiSimulationView
  isStale: boolean
}) {
  const temperatureOption = useMemo(
    () => createTemperatureOption(simulation.temperatureProfile),
    [simulation.temperatureProfile],
  )
  const flowOption = useMemo(
    () => createFlowOption(simulation.flowProfile),
    [simulation.flowProfile],
  )

  if (simulation.status === 'pending') {
    return (
      <div className="results-empty">
        等待 Engine 运行后生成图表。不会显示任何 demo 占位曲线。
      </div>
    )
  }

  if (simulation.status === 'failed') {
    return (
      <div className="results-empty">
        本次 Engine 计算失败，不绘制图表。请查看概要页诊断。
      </div>
    )
  }

  const note = isStale
    ? '上次计算结果 · 当前流程已修改，图表不代表当前流程'
    : simulation.status === 'partial'
      ? '部分结果 · 仅显示已计算成功物流的图表数据'
      : null

  return (
    <div className="charts-view">
      {note && <div className="chart-status-note">{note}</div>}
      <div className="charts-grid">
        <article className="chart-card">
          <div className="chart-card__head">
            <span>物流温度分布</span>
            <em>TEMPERATURE PROFILE · °C</em>
          </div>
          <div className="chart-card__body">
            {simulation.temperatureProfile.length > 0 ? (
              <ReactEChartsCore
                echarts={echarts}
                option={temperatureOption}
                notMerge
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div className="results-empty">暂无已计算温度数据。</div>
            )}
          </div>
        </article>

        <article className="chart-card">
          <div className="chart-card__head">
            <span>物流流量分布</span>
            <em>STREAM FLOW · t/h</em>
          </div>
          <div className="chart-card__body">
            {simulation.flowProfile.length > 0 ? (
              <ReactEChartsCore
                echarts={echarts}
                option={flowOption}
                notMerge
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div className="results-empty">暂无已计算流量数据。</div>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}

function TraceValueEntry({
  field,
  value,
}: {
  field: string
  value: string | number | boolean | null
}) {
  const display = displayTraceValue(field, value)
  return (
    <p title={`${field} = ${display.original}`}>
      <em>{field}</em>
      <b>{display.display}</b>
      {display.converted && (
        <small className="trace-step__original">{display.original}</small>
      )}
    </p>
  )
}

function TraceStep({ trace }: { trace: CalculationTrace }) {
  return (
    <div className="trace-step">
      <div className="trace-step__head">
        <span>{trace.step}</span>
        <em>{trace.method}</em>
      </div>
      <code>{trace.formula}</code>
      <div className="trace-step__values">
        <div>
          <span>输入 · 原始字段名</span>
          {Object.entries(trace.inputs).map(([key, value]) => (
            <TraceValueEntry key={key} field={key} value={value} />
          ))}
        </div>
        <div>
          <span>输出 · 原始字段名</span>
          {Object.entries(trace.outputs).map(([key, value]) => (
            <TraceValueEntry key={key} field={key} value={value} />
          ))}
        </div>
      </div>
      <div className="trace-step__assumptions">
        {trace.assumptions.join(' · ')}
      </div>
    </div>
  )
}

function TraceView({ simulation }: { simulation: UiSimulationView }) {
  const entries = Object.entries(simulation.traces)
  if (entries.length === 0) {
    return (
      <div className="results-empty">
        当前运行没有可展示的 Engine 计算 Trace。
      </div>
    )
  }

  return (
    <div className="trace-view">
      {entries.map(([nodeId, traces]) => {
        const equipment = simulation.equipment[nodeId]
        return (
          <article className="trace-card" key={nodeId}>
            <header className="trace-card__head">
              <span className="stream-tag">{equipment?.tag ?? nodeId}</span>
              <strong>{equipment?.kind ?? 'UNIT'}</strong>
              <em>{traces.length} STEPS</em>
            </header>
            <div className="trace-card__body">
              {traces.map((trace, index) => (
                <TraceStep
                  trace={trace}
                  key={`${trace.step}-${index}`}
                />
              ))}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function formatComparisonValue(
  metric: ComparisonMetric,
  value: number | null,
): string {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }
  if (metric.key === 'massClosure') {
    return `${formatPercent(value)} %`
  }
  if (metric.key === 'heaterDuty') {
    return `${formatDuty(value)} ${metric.unit}`
  }
  if (
    metric.key === 'mixerOutletTemperature' ||
    metric.key === 'productTemperature'
  ) {
    return `${formatTemperature(value)} ${metric.unit}`
  }
  return `${formatFlow(value)} ${metric.unit}`
}

function formatComparisonDelta(metric: ComparisonMetric): string {
  if (
    metric.delta === null ||
    metric.direction === 'unavailable'
  ) {
    return '—'
  }
  const digits = metric.key === 'massClosure' ? 1 : 2
  return `${formatSigned(metric.delta, digits)} ${metric.unit}`
}

const DIRECTION_LABELS: Record<
  ComparisonMetric['direction'],
  string
> = {
  up: '↑ 上升',
  down: '↓ 下降',
  same: '— 持平',
  unavailable: '— 不可用',
}

function CompareView({
  simulation,
  comparison,
  isStale,
}: {
  simulation: UiSimulationView
  comparison: RunComparison | null
  isStale: boolean
}) {
  if (simulation.status === 'failed') {
    return (
      <div className="compare-view">
        <div className="compare-head">
          <div>
            <span>运行对比</span>
            <em>RUN COMPARISON</em>
          </div>
        </div>
        <div className="compare-note is-error">
          本次 Engine 运行失败，没有可用于本次对比的新数值。
          {comparison
            ? '下表保留最近两次成功/部分运行，仅作历史参考。'
            : '历史结果仍保留在概要页的失败诊断下方。'}
        </div>
        {comparison && (
          <ComparisonTable comparison={comparison} historical />
        )}
      </div>
    )
  }

  if (!comparison) {
    return (
      <div className="result-state">
        <div className="result-state__head">
          <span className="result-state__glyph">
            <Info size={16} strokeWidth={1.8} />
          </span>
          <div>
            <h3>暂无历史对比</h3>
            <p>
              首次 Engine 计算没有上一次真实运行可比较。再次点击运行仿真后，
              这里会比较两次 Engine 结果。
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="compare-view">
      <div className="compare-head">
        <div>
          <span>运行对比</span>
          <em>RUN COMPARISON</em>
        </div>
        <div className="compare-times">
          <span>
            前一次{' '}
            <b>
              {comparison.previousRunAt
                ? formatClock(comparison.previousRunAt)
                : '—'}
            </b>
          </span>
          <span>
            后一次{' '}
            <b>
              {comparison.currentRunAt
                ? formatClock(comparison.currentRunAt)
                : '—'}
            </b>
          </span>
        </div>
      </div>
      {isStale && (
        <div className="compare-note is-stale">
          当前流程已修改；以下仍是之前两次真实 Engine 运行，不代表当前流程。
        </div>
      )}
      {simulation.status === 'partial' && (
        <div className="compare-note">
          本次运行部分完成；不可用的数值显示为 —，不会按 0 计算。
        </div>
      )}
      <ComparisonTable comparison={comparison} />
      <p className="compare-footnote">
        仅比较真实 Engine 运行；未点击 Run 的流程修改不会生成新对比。
      </p>
    </div>
  )
}

function ComparisonTable({
  comparison,
  historical = false,
}: {
  comparison: RunComparison
  historical?: boolean
}) {
  return (
    <div className="compare-table-wrap">
      <table className="data-table compare-table">
        <thead>
          <tr>
            <th>指标 METRIC</th>
            <th className="is-num">
              {historical ? '前一次成功' : '上次'}
            </th>
            <th className="is-num">
              {historical ? '后一次成功' : '本次'}
            </th>
            <th>变化</th>
          </tr>
        </thead>
        <tbody>
          {comparison.metrics.map((metric) => (
            <tr key={metric.key}>
              <td>
                <span className="compare-metric__label">{metric.label}</span>
                <small>{metric.unit}</small>
              </td>
              <td className="is-num">
                {formatComparisonValue(metric, metric.previousValue)}
              </td>
              <td className="is-num is-strong">
                {formatComparisonValue(metric, metric.currentValue)}
              </td>
              <td>
                <span
                  className={`compare-direction is-${metric.direction}`}
                >
                  {DIRECTION_LABELS[metric.direction]}
                </span>
                <b className="compare-delta">
                  {formatComparisonDelta(metric)}
                </b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ResultsPanel({
  simulation,
  collapsed,
  running,
  isStale,
  lastRunAt,
  comparison,
  history,
  onToggleCollapsed,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<ResultsTab>('summary')
  const failed = simulation.status === 'failed'
  const staleDisplay = isStale && !failed

  const statusClass = running
    ? 'is-running'
    : staleDisplay
      ? 'is-stale'
      : simulation.status === 'success'
        ? 'is-done'
        : simulation.status === 'partial'
          ? 'is-partial'
          : failed
            ? 'is-failed'
            : 'is-preview'

  const statusText = running
    ? 'Engine 求解中…'
    : failed
      ? `计算失败${isStale ? ' · 结果已过期' : ''}${
          lastRunAt === null ? '' : ` · ${formatClock(lastRunAt)}`
        }`
      : isStale
        ? '结果已过期 · 请重新运行'
        : simulation.status === 'pending'
          ? '尚未运行'
          : `${statusLabel(simulation.status)}${
              lastRunAt === null ? '' : ` · ${formatClock(lastRunAt)}`
            }`

  return (
    <section
      className={`results-panel${collapsed ? ' is-collapsed' : ''}`}
      aria-label="仿真结果"
    >
      <header className="results-head">
        <div className="results-head__title">
          <span className="results-head__icon">
            <BarChart3 size={14} strokeWidth={1.8} />
          </span>
          <h2>仿真结果</h2>
          <span className="results-badge results-badge--engine">ENGINE</span>
          {staleDisplay ? (
            <span className="results-badge results-badge--stale">
              STALE · 上次结果
            </span>
          ) : (
            <span className="results-badge results-badge--model">
              BASIC TEACHING MODEL
            </span>
          )}
        </div>

        <nav className="results-tabs" aria-label="仿真结果视图">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`results-tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <em>{tab.en}</em>
            </button>
          ))}
        </nav>

        <div className="results-head__side">
          <span className={`results-status ${statusClass}`}>
            {running ? (
              <Loader2 size={10} strokeWidth={2} className="spin" />
            ) : (
              <i />
            )}
            <span className="results-status__text">{statusText}</span>
          </span>
          <span
            className={`results-badge results-badge--state is-${failed ? 'failed' : staleDisplay ? 'stale' : simulation.status}`}
          >
            {failed
              ? '计算失败'
              : staleDisplay
                ? '上次结果'
                : statusLabel(simulation.status)}
          </span>
          <button
            type="button"
            className="results-collapse"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            title={collapsed ? '展开仿真结果' : '收起仿真结果'}
          >
            {collapsed ? (
              <ChevronUp size={14} strokeWidth={1.9} />
            ) : (
              <ChevronDown size={14} strokeWidth={1.9} />
            )}
            <span>{collapsed ? '展开' : '收起'}</span>
          </button>
        </div>
      </header>

      {!collapsed && (
        <div className="results-body">
          {activeTab === 'summary' && (
            <SummaryView simulation={simulation} history={history} />
          )}
          {activeTab === 'material' && (
            <MaterialView simulation={simulation} />
          )}
          {activeTab === 'energy' && (
            <EnergyView simulation={simulation} />
          )}
          {activeTab === 'charts' && (
            <ChartsView simulation={simulation} isStale={isStale} />
          )}
          {activeTab === 'compare' && (
            <CompareView
              simulation={simulation}
              comparison={comparison}
              isStale={isStale}
            />
          )}
          {activeTab === 'trace' && (
            <TraceView simulation={simulation} />
          )}
        </div>
      )}
    </section>
  )
}
