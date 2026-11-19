import { describe, expect, it } from 'vitest'
import { createDemoFlowsheet } from '../../data/demoFlowsheet'
import type { ProcessNode } from '../../types/process'
import type { EngineResult } from '../../engine'
import {
  buildEngineSimulationView,
  createPendingSimulationView,
  runEngineSimulation,
} from '../engineSimulation'

const RUN_OPTIONS = {
  runId: 'ui-integration-test',
  calculatedAt: '2026-11-19T00:00:00.000Z',
}

function defaultFlow() {
  return createDemoFlowsheet()
}

describe('engine simulation view model', () => {
  it('maps the default teaching flow into ENGINE UI values', () => {
    const { nodes, edges } = defaultFlow()
    const view = runEngineSimulation(nodes, edges, RUN_OPTIONS)

    expect(view.mode).toBe('engine')
    expect(view.status).toBe('success')
    expect(view.runId).toBe('ui-integration-test')
    expect(view.modelVersion).toBe('p2.2.0')
    expect(view.propertyPackageId).toBe('teaching-binary-fluid-v1')
    expect(view.summary.totalFeedTph).toBeCloseTo(12, 10)
    expect(view.summary.productFlowTph).toBeCloseTo(12, 10)
    expect(view.summary.feedTemperatureC).toBeCloseTo(45, 10)
    expect(view.summary.outletTemperatureC).toBeCloseTo(85, 10)
    expect(view.summary.netDutyKW).toBeCloseTo(293.333333, 5)
    expect(view.summary.heatingDutyKW).toBeCloseTo(293.333333, 5)
    expect(view.summary.coolingDutyKW).toBeCloseTo(0, 10)
    expect(view.summary.massClosure).toBeCloseTo(100, 10)
    expect(view.diagnostics).toEqual([])

    expect(view.streams['edge-mixer-heater'].status).toBe('calculated')
    expect(view.streams['edge-mixer-heater'].state?.flowTph).toBeCloseTo(
      12,
      10,
    )
    expect(
      view.streams['edge-mixer-heater'].state?.temperatureC,
    ).toBeCloseTo(45, 10)
    expect(
      view.streams['edge-mixer-heater'].state?.pressureBar,
    ).toBeCloseTo(2.6, 10)
    expect(
      view.streams['edge-heater-product'].state?.temperatureC,
    ).toBeCloseTo(85, 10)
    expect(
      view.streams['edge-heater-product'].state?.compositionAWt,
    ).toBeCloseTo(55, 10)
    expect(
      view.streams['edge-heater-product'].state?.compositionBWt,
    ).toBeCloseTo(45, 10)

    expect(view.equipment['mixer-101'].status).toBe('calculated')
    expect(view.equipment['heater-101'].status).toBe('calculated')
    expect(view.equipment['heater-101'].dutyKW).toBeCloseTo(
      293.333333,
      5,
    )
    expect(view.nodeOutputs['mixer-101'].temperatureC).toBeCloseTo(45, 10)
    expect(view.nodeOutputs['mixer-101'].flowTph).toBeCloseTo(12, 10)
    expect(view.traces['mixer-101']?.length).toBeGreaterThan(0)
    expect(view.traces['heater-101']?.length).toBeGreaterThan(0)

    expect(view.materialRows).toHaveLength(4)
    expect(view.energyRows).toHaveLength(2)
    expect(view.edgeStreams['edge-feed-a-mixer'].flowTph).toBeCloseTo(
      6,
      10,
    )
  })

  it('keeps the pending view free of fabricated numbers', () => {
    const { nodes, edges } = defaultFlow()
    const view = createPendingSimulationView(nodes, edges)

    expect(view.status).toBe('pending')
    expect(view.summary.totalFeedTph).toBeNull()
    expect(view.summary.productFlowTph).toBeNull()
    expect(view.summary.netDutyKW).toBeNull()
    expect(view.balances.status).toBe('unavailable')
    expect(view.materialRows.every((row) => row.stream === null)).toBe(true)
    expect(view.streams['edge-mixer-heater'].state).toBeNull()
  })

  it('maps an unsupported unit to partial and blocks its downstream stream', () => {
    const { nodes, edges } = defaultFlow()
    const flashingNodes: ProcessNode[] = nodes.map((node) =>
      node.id === 'heater-101'
        ? {
            ...node,
            type: 'flash',
            data: {
              ...node.data,
              kind: 'flash',
              label: 'Flash Drum',
              cnLabel: '闪蒸罐',
            },
          }
        : node,
    )
    const view = runEngineSimulation(flashingNodes, edges, RUN_OPTIONS)

    expect(view.status).toBe('partial')
    expect(view.equipment['heater-101'].status).toBe('unsupported')
    expect(view.equipment['heater-101'].dutyKW).toBeNull()
    expect(view.streams['edge-heater-product'].status).toBe('blocked')
    expect(view.streams['edge-heater-product'].state).toBeNull()
    expect(view.balances.status).toBe('unavailable')
    expect(view.summary.totalFeedTph).toBeNull()
    expect(view.summary.productFlowTph).toBeNull()
    expect(
      view.materialRows.find(
        (row) => row.edgeId === 'edge-heater-product',
      )?.stream,
    ).toBeNull()
  })

  it('maps a failed graph to failed without demo fallback values', () => {
    const { nodes } = defaultFlow()
    const view = runEngineSimulation(nodes, [], RUN_OPTIONS)

    expect(view.status).toBe('failed')
    expect(view.summary.totalFeedTph).toBeNull()
    expect(view.summary.massClosure).toBeNull()
    expect(view.balances.status).toBe('unavailable')
    expect(view.materialRows).toHaveLength(0)
    expect(view.diagnostics.length).toBeGreaterThan(0)
    expect(
      view.diagnostics.some((diagnostic) =>
        diagnostic.severity === 'error',
      ),
    ).toBe(true)
  })

  it('preserves adapter unit conversion and node/edge id mapping', () => {
    const { nodes, edges } = defaultFlow()
    const view = runEngineSimulation(nodes, edges, RUN_OPTIONS)

    expect(Object.keys(view.streams).sort()).toEqual(
      edges.map((edge) => edge.id).sort(),
    )
    expect(Object.keys(view.equipment).sort()).toEqual(
      nodes.map((node) => node.id).sort(),
    )
    expect(view.streams['edge-feed-a-mixer'].state?.flowTph).toBeCloseTo(
      6,
      10,
    )
    expect(view.streams['edge-feed-a-mixer'].state?.temperatureC).toBeCloseTo(
      25,
      10,
    )
    expect(view.streams['edge-feed-a-mixer'].state?.pressureBar).toBeCloseTo(
      2.8,
      10,
    )
    expect(
      view.streams['edge-feed-a-mixer'].state?.compositionAWt,
    ).toBeCloseTo(95, 10)
  })

  it('maps unavailable EngineBalances to null UI values', () => {
    const { nodes, edges } = defaultFlow()
    const base = runEngineSimulation(nodes, edges, RUN_OPTIONS)
    const syntheticResult: EngineResult = {
      status: 'partial',
      run: {
        runId: 'synthetic-unavailable',
        calculatedAt: '2026-11-19T00:00:00.000Z',
        modelVersion: 'p2.2.0',
        propertyPackageId: 'teaching-binary-fluid-v1',
      },
      streams: {},
      equipment: {},
      diagnostics: [],
      balances: {
        status: 'unavailable',
        totalFeedKgS: null,
        totalProductKgS: null,
        closurePercent: null,
        components: [],
      },
    }
    const view = buildEngineSimulationView({
      nodes,
      edges,
      result: syntheticResult,
      adapterDiagnostics: [],
    })

    expect(base.balances.status).toBe('calculated')
    expect(view.status).toBe('partial')
    expect(view.balances.status).toBe('unavailable')
    expect(view.balances.totalFeedTph).toBeNull()
    expect(view.balances.totalProductTph).toBeNull()
    expect(view.summary.totalFeedTph).toBeNull()
    expect(view.summary.productFlowTph).toBeNull()
    expect(view.summary.massClosure).toBeNull()
  })

  it('builds chart data only from calculated streams', () => {
    const { nodes, edges } = defaultFlow()
    const success = runEngineSimulation(nodes, edges, RUN_OPTIONS)
    expect(success.temperatureProfile).toHaveLength(4)
    expect(success.flowProfile).toHaveLength(4)
    expect(
      success.temperatureProfile.every((point) =>
        Number.isFinite(point.value),
      ),
    ).toBe(true)

    const flashingNodes: ProcessNode[] = nodes.map((node) =>
      node.id === 'heater-101'
        ? {
            ...node,
            type: 'flash',
            data: {
              ...node.data,
              kind: 'flash',
              label: 'Flash Drum',
              cnLabel: '闪蒸罐',
            },
          }
        : node,
    )
    const partial = runEngineSimulation(flashingNodes, edges, RUN_OPTIONS)
    expect(partial.status).toBe('partial')
    expect(
      partial.temperatureProfile.some(
        (point) => point.label === 'S-104',
      ),
    ).toBe(false)
    expect(
      partial.flowProfile.some((point) => point.label === 'S-104'),
    ).toBe(false)
    expect(partial.temperatureProfile.length).toBeGreaterThan(0)

    const synthetic = buildEngineSimulationView({
      nodes,
      edges,
      result: {
        status: 'partial',
        run: {
          runId: 'no-chart-data',
          calculatedAt: '2026-11-19T00:00:00.000Z',
          modelVersion: 'p2.2.0',
          propertyPackageId: 'teaching-binary-fluid-v1',
        },
        streams: {},
        equipment: {},
        diagnostics: [],
        balances: {
          status: 'unavailable',
          totalFeedKgS: null,
          totalProductKgS: null,
          closurePercent: null,
          components: [],
        },
      },
      adapterDiagnostics: [],
    })
    expect(synthetic.temperatureProfile).toEqual([])
    expect(synthetic.flowProfile).toEqual([])
  })

  it('surfaces adapter diagnostics without inventing a result', () => {
    const { nodes, edges } = defaultFlow()
    const invalidNodes: ProcessNode[] = nodes.map((node) =>
      node.id === 'feed-a'
        ? {
            ...node,
            data: {
              ...node.data,
              params: {
                ...node.data.params,
                compositionA: Number.NaN,
              },
            },
          }
        : node,
    )
    const view = runEngineSimulation(invalidNodes, edges, RUN_OPTIONS)

    expect(view.status).not.toBe('success')
    expect(
      view.diagnostics.some(
        (diagnostic) => diagnostic.code === 'E_ADAPTER_INPUT',
      ),
    ).toBe(true)
    expect(view.summary.totalFeedTph).toBeNull()
  })
})
