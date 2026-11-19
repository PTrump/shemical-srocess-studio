import { describe, expect, it } from 'vitest'
import {
  adaptUiFlowsheet,
  type UiEquipmentNodeLike,
  type UiProcessEdgeLike,
} from '../adapters/flowsheetAdapter'
import { runSimulation } from '../solver/runSimulation'
import { getComponentMassFlow } from '../domain/stream'
import { celsiusToKelvin } from '../units/convert'
import { MASS_FLOW_12_TPH_KG_S } from './testFixtures'

const NODES: UiEquipmentNodeLike[] = [
  {
    id: 'feed-a',
    data: {
      kind: 'stream',
      tag: 'F-101',
      role: 'feed',
      params: { flow: 6, temperature: 25, pressure: 2.8, compositionA: 95 },
    },
  },
  {
    id: 'feed-b',
    data: {
      kind: 'stream',
      tag: 'F-102',
      role: 'feed',
      params: { flow: 6, temperature: 65, pressure: 2.6, compositionA: 15 },
    },
  },
  {
    id: 'mixer-101',
    data: { kind: 'mixer', tag: 'MX-101', params: {} },
  },
  {
    id: 'heater-101',
    data: {
      kind: 'heater',
      tag: 'HX-101',
      params: { targetTemperature: 85, pressure: 2.4 },
    },
  },
  {
    id: 'product-101',
    data: { kind: 'stream', tag: 'PR-101', role: 'product', params: {} },
  },
]

const EDGES: UiProcessEdgeLike[] = [
  {
    id: 's-101',
    source: 'feed-a',
    target: 'mixer-101',
    data: { tag: 'S-101' },
  },
  {
    id: 's-102',
    source: 'feed-b',
    target: 'mixer-101',
    data: { tag: 'S-102' },
  },
  {
    id: 's-103',
    source: 'mixer-101',
    target: 'heater-101',
    data: { tag: 'S-103' },
  },
  {
    id: 's-104',
    source: 'heater-101',
    target: 'product-101',
    data: { tag: 'S-104' },
  },
]

describe('UI → engine adapter', () => {
  it('converts display units and solves the default teaching flowsheet', () => {
    const adapted = adaptUiFlowsheet(NODES, EDGES)
    expect(adapted.diagnostics).toHaveLength(0)
    expect(adapted.flowsheet.nodes).toHaveLength(5)
    expect(adapted.flowsheet.edges).toHaveLength(4)

    const feedA = adapted.flowsheet.nodes.find((node) => node.id === 'feed-a')
    expect(feedA?.kind).toBe('stream')
    if (feedA?.kind === 'stream' && feedA.role === 'feed') {
      expect(feedA.state.massFlowKgS).toBeCloseTo(
        MASS_FLOW_12_TPH_KG_S / 2,
        12,
      )
      expect(feedA.state.temperatureK).toBeCloseTo(
        celsiusToKelvin(25),
        12,
      )
    }

    const result = runSimulation(adapted.flowsheet, {
      runId: 'adapter-test',
      calculatedAt: '2026-11-19T00:00:00.000Z',
    })
    expect(result.status).toBe('success')
    const product = result.streams['s-104'].stream
    expect(product).not.toBeNull()
    expect(product?.temperatureK).toBeCloseTo(celsiusToKelvin(85), 12)
    expect(getComponentMassFlow(product!, 'A')).toBeCloseTo(
      MASS_FLOW_12_TPH_KG_S * 0.55,
      12,
    )
  })

  it('does not silently default missing UI parameters', () => {
    const adapted = adaptUiFlowsheet(
      [
        {
          id: 'feed-a',
          data: {
            kind: 'stream',
            role: 'feed',
            params: { flow: 6, temperature: 25, pressure: 2.8 },
          },
        },
      ],
      [],
    )

    expect(adapted.flowsheet.nodes).toHaveLength(0)
    expect(
      adapted.diagnostics.some(
        (diagnostic) => diagnostic.code === 'E_ADAPTER_INPUT',
      ),
    ).toBe(true)
  })
})
