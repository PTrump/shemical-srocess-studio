import { describe, expect, it } from 'vitest'
import { createDemoFlowsheet } from '../../data/demoFlowsheet'
import type { ProcessNode } from '../../types/process'
import { buildRunComparison } from '../comparison'
import { runEngineSimulation } from '../engineSimulation'

function viewForFlow(flowTph: number) {
  const { nodes, edges } = createDemoFlowsheet()
  const adjustedNodes: ProcessNode[] = nodes.map((node) =>
    node.id === 'feed-a'
      ? {
          ...node,
          data: {
            ...node.data,
            params: { ...node.data.params, flow: flowTph },
          },
        }
      : node,
  )
  return runEngineSimulation(adjustedNodes, edges, {
    runId: `compare-${flowTph}`,
    calculatedAt: '2026-11-19T00:00:00.000Z',
  })
}

describe('run comparison', () => {
  it('returns no comparison for a first run', () => {
    expect(buildRunComparison(null, viewForFlow(6))).toBeNull()
    expect(buildRunComparison(viewForFlow(6), null)).toBeNull()
  })

  it('compares two real Engine runs with direction and delta', () => {
    const comparison = buildRunComparison(
      viewForFlow(6),
      viewForFlow(8),
    )

    expect(comparison).not.toBeNull()
    const byKey = new Map(
      comparison!.metrics.map((metric) => [metric.key, metric]),
    )

    expect(byKey.get('totalFeed')?.previousValue).toBeCloseTo(12, 10)
    expect(byKey.get('totalFeed')?.currentValue).toBeCloseTo(14, 10)
    expect(byKey.get('totalFeed')?.delta).toBeCloseTo(2, 10)
    expect(byKey.get('totalFeed')?.direction).toBe('up')

    expect(
      byKey.get('mixerOutletTemperature')?.previousValue,
    ).toBeCloseTo(45, 10)
    expect(
      byKey.get('mixerOutletTemperature')?.currentValue,
    ).toBeCloseTo(42.142857, 5)
    expect(byKey.get('mixerOutletTemperature')?.direction).toBe('down')

    expect(byKey.get('heaterDuty')?.previousValue).toBeCloseTo(
      293.333333,
      5,
    )
    expect(byKey.get('heaterDuty')?.currentValue).toBeCloseTo(
      366.666667,
      5,
    )
    expect(byKey.get('heaterDuty')?.direction).toBe('up')

    expect(byKey.get('productFlow')?.previousValue).toBeCloseTo(12, 10)
    expect(byKey.get('productFlow')?.currentValue).toBeCloseTo(14, 10)
    expect(byKey.get('productTemperature')?.direction).toBe('same')
    expect(byKey.get('massClosure')?.direction).toBe('same')
  })

  it('does not compare a failed current run', () => {
    const failed = runEngineSimulation(
      createDemoFlowsheet().nodes,
      [],
      {
        runId: 'failed',
        calculatedAt: '2026-11-19T00:00:00.000Z',
      },
    )
    expect(buildRunComparison(viewForFlow(6), failed)).toBeNull()
  })
})
