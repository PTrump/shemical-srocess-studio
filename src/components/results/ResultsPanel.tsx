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
  ChartPoint,
  MaterialBalanceRow,
  SimulationResult,
} from '../../types/process'
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

type ResultsTab = 'summary' | 'material' | 'energy' | 'charts'

const TABS: Array<{ id: ResultsTab; label: string; en: string }> = [
  { id: 'summary', label: '概要', en: 'SUMMARY' },
  { id: 'material', label: '物料平衡', en: 'MATERIAL' },
  { id: 'energy', label: '能量平衡', en: 'ENERGY' },
  { id: 'charts', label: '图表', en: 'CHARTS' },
]

interface ResultsPanelProps {
  simulation: SimulationResult
  collapsed: boolean
  running: boolean
  isStale: boolean
  lastRunAt: number | null
  onToggleCollapsed: () => void
}

function SummaryView({ simulation }: { simulation: SimulationResult }) {
  const { summary, warnings, model } = simulation
  const warningTitle = warnings.join('\n')

  return (
    <div className="summary-view">
      <div className="kpi-grid">
        <article className="kpi-card kpi-card--teal">
          <div className="kpi-card__head">
            <span>总进料流量</span>
            <em>TOTAL FEED</em>
          </div>
          <div className="kpi-card__value">
            <strong>{formatNumber(summary.totalFeed, 2, false)}</strong>
            <span>t/h</span>
          </div>
          <p>
            {summary.feedCount} 股进料 · 产品 {formatFlow(summary.productFlow)} t/h
          </p>
        </article>

        <article className="kpi-card kpi-card--blue">
          <div className="kpi-card__head">
            <span>出口温度</span>
            <em>OUTLET TEMP</em>
          </div>
          <div className="kpi-card__value">
            <strong>
              {formatNumber(summary.outletTemperature, 1, false)}
            </strong>
            <span>°C</span>
          </div>
          <p>进料加权温度 {formatTemperature(summary.feedTemperature)} °C</p>
        </article>

        <article className="kpi-card kpi-card--amber">
          <div className="kpi-card__head">
            <span>净热负荷</span>
            <em>NET DUTY</em>
          </div>
          <div className="kpi-card__value">
            <strong>{formatNumber(summary.netDuty, 1, false)}</strong>
            <span>kW</span>
          </div>
          <p>
            加热 {formatDuty(summary.heatingDuty)} · 冷却{' '}
            {formatDuty(summary.coolingDuty)} kW
          </p>
        </article>

        <article className="kpi-card kpi-card--slate">
          <div className="kpi-card__head">
            <span>物料闭合</span>
            <em>MASS CLOSURE</em>
          </div>
          <div className="kpi-card__value">
            <strong>
              {formatNumber(summary.massClosure, 1, false)}
            </strong>
            <span>%</span>
          </div>
          <p>
            {summary.productCount} 股产品 · {summary.streamCount} 条物流
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
              style={{ width: `${Math.min(100, summary.massClosure)}%` }}
            />
          </div>
          <div className="summary-detail__line">
            <span>
              进料 <b>{formatFlow(summary.totalFeed)}</b> t/h
            </span>
            <span>
              产品 <b>{formatFlow(summary.productFlow)}</b> t/h
            </span>
            <span>
              闭合 <b>{formatPercent(summary.massClosure)}</b> %
            </span>
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
                width: `${summary.heatingDuty + summary.coolingDuty > 0 ? (summary.heatingDuty / (summary.heatingDuty + summary.coolingDuty)) * 100 : 0}%`,
              }}
            />
            <i
              className="is-cooling"
              style={{
                width: `${summary.heatingDuty + summary.coolingDuty > 0 ? (summary.coolingDuty / (summary.heatingDuty + summary.coolingDuty)) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="summary-detail__line">
            <span>
              加热 <b>{formatDuty(summary.heatingDuty)}</b> kW
            </span>
            <span>
              冷却 <b>{formatDuty(summary.coolingDuty)}</b> kW
            </span>
          </div>
        </div>

        <div className="summary-detail">
          <div className="summary-detail__head">
            <span>模型常数</span>
            <em>MODEL CONSTANTS</em>
          </div>
          <div className="summary-detail__chips">
            <span>Cp {model.cp} kJ/kg·K</span>
            <span>ρ {model.density} kg/m³</span>
            <span>η {formatPercent(model.pumpEfficiency * 100)}%</span>
          </div>
          <div className="summary-detail__line">
            <span>简化为稳态、绝热单元与单次通过模型</span>
          </div>
        </div>
      </div>

      <div className="summary-note">
        <span className="summary-note__disclaimer">
          <Info size={11} strokeWidth={1.8} />
          教学演示数据，由简化模型生成（Cp={model.cp} kJ/(kg·K)），非真实热力学计算。
        </span>
        {warnings.length > 0 && (
          <span className="summary-note__warning" title={warningTitle}>
            <AlertTriangle size={11} strokeWidth={1.9} />
            {warnings.length} 条模型提示
          </span>
        )}
      </div>
    </div>
  )
}

function StreamCell({ row }: { row: MaterialBalanceRow }) {
  return (
    <div className="stream-cell">
      <span className="stream-tag">{row.tag}</span>
      <span className="stream-name">{row.name}</span>
    </div>
  )
}

function MaterialView({ simulation }: { simulation: SimulationResult }) {
  const { materialBalance, summary } = simulation

  return (
    <div className="balance-view">
      <div className="balance-toolbar">
        <div className="balance-toolbar__title">
          物料平衡表
          <em>MATERIAL BALANCE</em>
        </div>
        <div className="balance-chips">
          <span>
            进料 <b>{formatFlow(summary.totalFeed)}</b> t/h
          </span>
          <span>
            产品 <b>{formatFlow(summary.productFlow)}</b> t/h
          </span>
          <span>
            闭合 <b>{formatPercent(summary.massClosure)}</b> %
          </span>
        </div>
      </div>

      <div className="data-table-wrap">
        {materialBalance.length === 0 ? (
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
              {materialBalance.map((row) => (
                <tr key={row.edgeId}>
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
                    {formatFlow(row.stream.flow)}
                  </td>
                  <td className="is-num">
                    {formatTemperature(row.stream.temperature)}
                  </td>
                  <td className="is-num">
                    {formatPressure(row.stream.pressure)}
                  </td>
                  <td className="is-num is-muted">
                    {formatPercent(row.stream.compositionA)} /{' '}
                    {formatPercent(row.stream.compositionB)}
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

function EnergyView({ simulation }: { simulation: SimulationResult }) {
  const { energyBalance, summary } = simulation

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
            加热 <b>{formatDuty(summary.heatingDuty)}</b> kW
          </span>
          <span>
            冷却 <b>{formatDuty(summary.coolingDuty)}</b> kW
          </span>
          <span>
            净值 <b>{formatDuty(summary.netDuty)}</b> kW
          </span>
        </div>
      </div>

      <div className="data-table-wrap">
        {energyBalance.length === 0 ? (
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
              {energyBalance.map((row) => (
                <tr key={row.nodeId}>
                  <td>
                    <div className="stream-cell">
                      <span className="stream-tag">{row.tag}</span>
                      <span className="stream-name">{row.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="type-badge">
                      {KIND_META[row.category].code}
                    </span>
                    {KIND_META[row.category].cnName}
                  </td>
                  <td
                    className={`is-num is-strong ${row.duty < 0 ? 'is-cooling' : ''}`}
                  >
                    {formatSigned(row.duty)}
                  </td>
                  <td>
                    <div className="share-cell">
                      <span className="share-bar">
                        <i style={{ width: `${Math.min(100, row.share)}%` }} />
                      </span>
                      <b>{formatPercent(row.share)}%</b>
                    </div>
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

function createTemperatureOption(points: ChartPoint[]) {
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

function createFlowOption(points: ChartPoint[]) {
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

function ChartsView({ simulation }: { simulation: SimulationResult }) {
  const temperatureOption = useMemo(
    () => createTemperatureOption(simulation.temperatureProfile),
    [simulation.temperatureProfile],
  )
  const flowOption = useMemo(
    () => createFlowOption(simulation.flowProfile),
    [simulation.flowProfile],
  )

  return (
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
            <div className="results-empty">暂无温度数据。</div>
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
            <div className="results-empty">暂无流量数据。</div>
          )}
        </div>
      </article>
    </div>
  )
}

export function ResultsPanel({
  simulation,
  collapsed,
  running,
  isStale,
  lastRunAt,
  onToggleCollapsed,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<ResultsTab>('summary')

  const statusClass = running
    ? 'is-running'
    : isStale
      ? 'is-stale'
      : lastRunAt
        ? 'is-done'
        : 'is-preview'

  const statusText = running
    ? '求解中…'
    : isStale
      ? '参数已更新 · 待重新运行'
      : lastRunAt
        ? `已运行 ${formatClock(lastRunAt)}`
        : '演示预览 · 尚未运行'

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
          <span className="results-badge results-badge--demo">DEMO</span>
          <span className="results-badge results-badge--sim">
            SIMULATED DATA
          </span>
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
            <SummaryView simulation={simulation} />
          )}
          {activeTab === 'material' && (
            <MaterialView simulation={simulation} />
          )}
          {activeTab === 'energy' && (
            <EnergyView simulation={simulation} />
          )}
          {activeTab === 'charts' && (
            <ChartsView simulation={simulation} />
          )}
        </div>
      )}
    </section>
  )
}
