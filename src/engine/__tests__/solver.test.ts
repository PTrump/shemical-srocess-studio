import { describe, expect, it } from 'vitest'
import type { DomainFlowsheet } from '../domain/flowsheet'
import type { MaterialState } from '../domain/stream'
import { createTeachingBinaryMaterialState } from '../properties/teachingBinaryFluid'
import { createPropertyPackage } from '../properties/propertyPackage'
import {
  TEACHING_COMPONENT_A,
  TEACHING_COMPONENT_B,
  TEACHING_BINARY_FLUID,
} from '../properties/teachingBinaryFluid'
import { runSimulation } from '../solver/runSimulation'
import { getComponentMassFlow } from '../domain/stream'
import { barToPascal, celsiusToKelvin } from '../units/convert'
import {
  FEED_A,
  FEED_B,
  MASS_FLOW_12_TPH_KG_S,
  makeFullFlowsheet,
} from './testFixtures'

const RUN_OPTIONS = {
  runId: 'test-run',
  calculatedAt: '2026-11-19T00:00:00.000Z',
}

function expectDiagnostic(
  result: ReturnType<typeof runSimulation>,
  code: string,
): void {
  expect(
    result.diagnostics.some((diagnostic) => diagnostic.code === code),
  ).toBe(true)
}

function makeState(
  massFlowKgS: number,
  temperatureK: number,
  pressurePa: number,
  componentA: number,
  componentB: number,
): MaterialState {
  return {
    massFlowKgS,
    temperatureK,
    pressurePa,
    phase: 'liquid',
    components: [
      { componentId: 'A', massFlowKgS: componentA },
      { componentId: 'B', massFlowKgS: componentB },
    ],
  }
}

function makeFeedToProduct(
  state: MaterialState,
): DomainFlowsheet {
  return {
    nodes: [
      {
        id: 'feed',
        tag: 'F-1',
        kind: 'stream',
        role: 'feed',
        state,
      },
      { id: 'product', tag: 'PR-1', kind: 'stream', role: 'product' },
    ],
    edges: [
      {
        id: 's-1',
        tag: 'S-1',
        sourceNodeId: 'feed',
        targetNodeId: 'product',
      },
    ],
  }
}

function expectFiniteNumbersDeep(
  value: unknown,
  path = 'result',
): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), `${path} must be finite`).toBe(true)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      expectFiniteNumbersDeep(item, `${path}[${index}]`),
    )
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      expectFiniteNumbersDeep(nested, `${path}.${key}`)
    }
  }
}

describe('DAG solver', () => {
  it('solves Feed A + Feed B → Mixer → Heater → Product', () => {
    const result = runSimulation(makeFullFlowsheet(), RUN_OPTIONS)

    expect(result.status).toBe('success')
    expect(result.streams['s-104'].status).toBe('calculated')
    expect(result.equipment['mixer-101'].status).toBe('calculated')
    expect(result.equipment['heater-101'].status).toBe('calculated')
    expect(result.equipment['product-101'].status).toBe('calculated')

    expect(result.streams['s-103'].stream?.temperatureK).toBeCloseTo(
      celsiusToKelvin(45),
      12,
    )
    expect(result.streams['s-103'].stream?.pressurePa).toBeCloseTo(
      barToPascal(2.6),
      6,
    )

    const productStream = result.streams['s-104'].stream
    expect(productStream).not.toBeNull()
    expect(productStream?.massFlowKgS).toBeCloseTo(
      MASS_FLOW_12_TPH_KG_S,
      12,
    )
    expect(productStream?.temperatureK).toBeCloseTo(
      celsiusToKelvin(85),
      12,
    )
    expect(productStream?.pressurePa).toBeCloseTo(barToPascal(2.6), 6)
    expect(getComponentMassFlow(productStream!, 'A')).toBeCloseTo(
      MASS_FLOW_12_TPH_KG_S * 0.55,
      12,
    )
    expect(getComponentMassFlow(productStream!, 'B')).toBeCloseTo(
      MASS_FLOW_12_TPH_KG_S * 0.45,
      12,
    )

    expect(result.balances.status).toBe('calculated')
    expect(result.balances.totalFeedKgS!).toBeCloseTo(
      MASS_FLOW_12_TPH_KG_S,
      12,
    )
    expect(result.balances.totalProductKgS!).toBeCloseTo(
      MASS_FLOW_12_TPH_KG_S,
      12,
    )
    expect(result.balances.closurePercent!).toBeCloseTo(100, 12)
    expect(
      result.balances.components.find(
        (component) => component.componentId === 'A',
      )?.differenceKgS ?? Number.NaN,
    ).toBeCloseTo(0, 12)

    expect(result.equipment['heater-101'].dutyW).toBeCloseTo(
      293333.333333,
      3,
    )
    const mixerTrace = result.equipment['mixer-101'].trace
    expect(mixerTrace.length).toBeGreaterThan(0)
    expect(mixerTrace[0].method).toBe('massBalance')
    expect(
      mixerTrace.find(
        (step) => step.method === 'cpWeightedAdiabaticMixing',
      )?.outputs.outletTemperatureK as number,
    ).toBeCloseTo(celsiusToKelvin(45), 12)
    expect(
      mixerTrace.find(
        (step) => step.method === 'cpWeightedAdiabaticMixing',
      )?.outputs.dutyW as number,
    ).toBe(0)

    const heaterTrace = result.equipment['heater-101'].trace
    expect(heaterTrace[0].method).toBe('constantCpSensibleHeat')
    expect(
      heaterTrace[0].outputs.dutyW as number,
    ).toBeCloseTo(293333.333333, 3)

    expect(result.run.modelVersion).toBe('p2.2.0')
    expect(result.run.propertyPackageId).toBe(TEACHING_BINARY_FLUID.id)
  })

  it('detects a cycle and does not perform a single-pass approximation', () => {
    const flowsheet: DomainFlowsheet = {
      nodes: [
        { id: 'mixer-1', tag: 'MX-1', kind: 'mixer' },
        { id: 'mixer-2', tag: 'MX-2', kind: 'mixer' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'mixer-1',
          targetNodeId: 'mixer-2',
        },
        {
          id: 's-2',
          tag: 'S-2',
          sourceNodeId: 'mixer-2',
          targetNodeId: 'mixer-1',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('failed')
    expectDiagnostic(result, 'E_GRAPH_CYCLE')
    expect(result.streams['s-1'].status).toBe('blocked')
    expect(result.streams['s-2'].status).toBe('blocked')
    expect(result.equipment['mixer-1'].status).toBe('blocked')
  })

  it('reports a missing heater inlet', () => {
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'heater',
          tag: 'HX-1',
          kind: 'heater',
          targetTemperatureK: celsiusToKelvin(85),
        },
        { id: 'product', tag: 'PR-1', kind: 'stream', role: 'product' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'heater',
          targetNodeId: 'product',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('failed')
    expectDiagnostic(result, 'E_MISSING_INLET')
    expect(result.equipment['heater'].status).toBe('failed')
  })

  it('reports a missing mixer outlet', () => {
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed',
          tag: 'F-1',
          kind: 'stream',
          role: 'feed',
          state: FEED_A,
        },
        { id: 'mixer', tag: 'MX-1', kind: 'mixer' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'feed',
          targetNodeId: 'mixer',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('partial')
    expectDiagnostic(result, 'E_MISSING_OUTLET')
    expect(result.equipment['mixer'].status).toBe('failed')
  })

  it('reports multiple outlets', () => {
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed',
          tag: 'F-1',
          kind: 'stream',
          role: 'feed',
          state: FEED_A,
        },
        { id: 'mixer-1', tag: 'MX-1', kind: 'mixer' },
        { id: 'mixer-2', tag: 'MX-2', kind: 'mixer' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'feed',
          targetNodeId: 'mixer-1',
        },
        {
          id: 's-2',
          tag: 'S-2',
          sourceNodeId: 'feed',
          targetNodeId: 'mixer-2',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('failed')
    expectDiagnostic(result, 'E_MULTIPLE_OUTLETS')
    expect(result.streams['s-1'].status).toBe('blocked')
    expect(result.streams['s-2'].status).toBe('blocked')
  })

  it('reports extra heater inlets', () => {
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed-a',
          tag: 'F-1',
          kind: 'stream',
          role: 'feed',
          state: FEED_A,
        },
        {
          id: 'feed-b',
          tag: 'F-2',
          kind: 'stream',
          role: 'feed',
          state: FEED_B,
        },
        {
          id: 'heater',
          tag: 'HX-1',
          kind: 'heater',
          targetTemperatureK: celsiusToKelvin(85),
        },
        { id: 'product', tag: 'PR-1', kind: 'stream', role: 'product' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'feed-a',
          targetNodeId: 'heater',
        },
        {
          id: 's-2',
          tag: 'S-2',
          sourceNodeId: 'feed-b',
          targetNodeId: 'heater',
        },
        {
          id: 's-3',
          tag: 'S-3',
          sourceNodeId: 'heater',
          targetNodeId: 'product',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('partial')
    expectDiagnostic(result, 'E_EXTRA_INLETS')
    expect(result.equipment['heater'].status).toBe('failed')
  })

  it('returns E_UNSUPPORTED_EQUIPMENT for Flash Drum', () => {
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed',
          tag: 'F-1',
          kind: 'stream',
          role: 'feed',
          state: FEED_A,
        },
        { id: 'flash', tag: 'V-1', kind: 'flash' },
        { id: 'product', tag: 'PR-1', kind: 'stream', role: 'product' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'feed',
          targetNodeId: 'flash',
        },
        {
          id: 's-2',
          tag: 'S-2',
          sourceNodeId: 'flash',
          targetNodeId: 'product',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('partial')
    expectDiagnostic(result, 'E_UNSUPPORTED_EQUIPMENT')
    expect(result.equipment['flash'].status).toBe('unsupported')
    expect(result.streams['s-2'].status).toBe('blocked')
  })

  it('reports zero feed flow', () => {
    const zeroFlow = createTeachingBinaryMaterialState({
      massFlowKgS: 0,
      temperatureK: celsiusToKelvin(25),
      pressurePa: barToPascal(2.8),
      massFractionA: 0.5,
    })
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed',
          tag: 'F-1',
          kind: 'stream',
          role: 'feed',
          state: zeroFlow,
        },
        { id: 'product', tag: 'PR-1', kind: 'stream', role: 'product' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'feed',
          targetNodeId: 'product',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('failed')
    expectDiagnostic(result, 'E_ZERO_FLOW')
  })

  it('reports an inconsistent composition', () => {
    const badComposition = {
      massFlowKgS: 1,
      temperatureK: celsiusToKelvin(25),
      pressurePa: barToPascal(2.8),
      phase: 'liquid' as const,
      components: [
        { componentId: 'A', massFlowKgS: 0.4 },
        { componentId: 'B', massFlowKgS: 0.4 },
      ],
    }
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed',
          tag: 'F-1',
          kind: 'stream',
          role: 'feed',
          state: badComposition,
        },
        { id: 'product', tag: 'PR-1', kind: 'stream', role: 'product' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'feed',
          targetNodeId: 'product',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('failed')
    expectDiagnostic(result, 'E_INVALID_COMPOSITION')
  })

  it('rejects negative mass flow, invalid pressure and invalid temperature', () => {
    const cases = [
      {
        code: 'E_NEGATIVE_MASS_FLOW',
        state: createTeachingBinaryMaterialState({
          massFlowKgS: -1,
          temperatureK: celsiusToKelvin(25),
          pressurePa: barToPascal(2.8),
          massFractionA: 0.5,
        }),
      },
      {
        code: 'E_INVALID_PRESSURE',
        state: createTeachingBinaryMaterialState({
          massFlowKgS: 1,
          temperatureK: celsiusToKelvin(25),
          pressurePa: -100,
          massFractionA: 0.5,
        }),
      },
      {
        code: 'E_INVALID_TEMPERATURE',
        state: createTeachingBinaryMaterialState({
          massFlowKgS: 1,
          temperatureK: -10,
          pressurePa: barToPascal(2.8),
          massFractionA: 0.5,
        }),
      },
    ]

    for (const testCase of cases) {
      const flowsheet: DomainFlowsheet = {
        nodes: [
          {
            id: 'feed',
            tag: 'F-1',
            kind: 'stream',
            role: 'feed',
            state: testCase.state,
          },
          { id: 'product', tag: 'PR-1', kind: 'stream', role: 'product' },
        ],
        edges: [
          {
            id: 's-1',
            tag: 'S-1',
            sourceNodeId: 'feed',
            targetNodeId: 'product',
          },
        ],
      }

      const result = runSimulation(flowsheet, RUN_OPTIONS)
      expect(result.status).toBe('failed')
      expectDiagnostic(result, testCase.code)
      expect(result.streams['s-1'].stream).toBeNull()
    }
  })

  it('reports NaN and Infinity without producing a stream', () => {
    for (const badValue of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const state = createTeachingBinaryMaterialState({
        massFlowKgS: badValue,
        temperatureK: celsiusToKelvin(25),
        pressurePa: barToPascal(2.8),
        massFractionA: 0.5,
      })
      const flowsheet: DomainFlowsheet = {
        nodes: [
          {
            id: 'feed',
            tag: 'F-1',
            kind: 'stream',
            role: 'feed',
            state,
          },
          { id: 'product', tag: 'PR-1', kind: 'stream', role: 'product' },
        ],
        edges: [
          {
            id: 's-1',
            tag: 'S-1',
            sourceNodeId: 'feed',
            targetNodeId: 'product',
          },
        ],
      }

      const result = runSimulation(flowsheet, RUN_OPTIONS)
      expect(result.status).toBe('failed')
      expectDiagnostic(result, 'E_NON_FINITE_VALUE')
      expect(result.streams['s-1'].stream).toBeNull()
    }
  })

  it('reports a missing Cp property', () => {
    const packageWithoutCp = createPropertyPackage({
      id: 'missing-cp-test',
      displayName: 'Missing Cp test package',
      version: 'test',
      isTeaching: true,
      disclaimer: 'test only',
      components: [
        { ...TEACHING_COMPONENT_A, cpJPerKgK: Number.NaN },
        TEACHING_COMPONENT_B,
      ],
    })
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed',
          tag: 'F-1',
          kind: 'stream',
          role: 'feed',
          state: FEED_A,
        },
        {
          id: 'heater',
          tag: 'HX-1',
          kind: 'heater',
          targetTemperatureK: celsiusToKelvin(85),
        },
        { id: 'product', tag: 'PR-1', kind: 'stream', role: 'product' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'feed',
          targetNodeId: 'heater',
        },
        {
          id: 's-2',
          tag: 'S-2',
          sourceNodeId: 'heater',
          targetNodeId: 'product',
        },
      ],
    }

    const result = runSimulation(flowsheet, {
      ...RUN_OPTIONS,
      propertyPackage: packageWithoutCp,
    })

    expect(result.status).toBe('partial')
    expectDiagnostic(result, 'E_MISSING_PROPERTY')
    expect(result.equipment['heater'].status).toBe('failed')
  })

  it('passes an intermediate stream through unchanged', () => {
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed',
          tag: 'F-1',
          kind: 'stream',
          role: 'feed',
          state: FEED_A,
        },
        {
          id: 'intermediate',
          tag: 'S-INT',
          kind: 'stream',
          role: 'intermediate',
        },
        { id: 'product', tag: 'PR-1', kind: 'stream', role: 'product' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'feed',
          targetNodeId: 'intermediate',
        },
        {
          id: 's-2',
          tag: 'S-2',
          sourceNodeId: 'intermediate',
          targetNodeId: 'product',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('success')
    expect(result.streams['s-2'].stream?.massFlowKgS).toBeCloseTo(
      FEED_A.massFlowKgS,
      12,
    )
    expect(result.streams['s-2'].stream?.temperatureK).toBeCloseTo(
      FEED_A.temperatureK,
      12,
    )
    expect(result.equipment['intermediate'].status).toBe('calculated')
    expect(result.balances.status).toBe('calculated')
    expect(result.balances.closurePercent!).toBeCloseTo(100, 12)
  })

  it('calculates independent valid branches and keeps unsupported branches blocked', () => {
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed-a',
          tag: 'F-1',
          kind: 'stream',
          role: 'feed',
          state: FEED_A,
        },
        { id: 'mixer', tag: 'MX-1', kind: 'mixer' },
        { id: 'product-a', tag: 'PR-1', kind: 'stream', role: 'product' },
        {
          id: 'feed-b',
          tag: 'F-2',
          kind: 'stream',
          role: 'feed',
          state: FEED_B,
        },
        { id: 'flash', tag: 'V-1', kind: 'flash' },
        { id: 'product-b', tag: 'PR-2', kind: 'stream', role: 'product' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'feed-a',
          targetNodeId: 'mixer',
        },
        {
          id: 's-2',
          tag: 'S-2',
          sourceNodeId: 'mixer',
          targetNodeId: 'product-a',
        },
        {
          id: 's-3',
          tag: 'S-3',
          sourceNodeId: 'feed-b',
          targetNodeId: 'flash',
        },
        {
          id: 's-4',
          tag: 'S-4',
          sourceNodeId: 'flash',
          targetNodeId: 'product-b',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('partial')
    expect(result.streams['s-2'].status).toBe('calculated')
    expect(result.streams['s-4'].status).toBe('blocked')
    expect(result.equipment['flash'].status).toBe('unsupported')
    expect(result.equipment['mixer'].status).toBe('calculated')
  })

  it('rejects the tiny invalid-composition reproduction', () => {
    const invalid = makeState(1e-13, 300, 100000, 5e-13, 0)
    const result = runSimulation(makeFeedToProduct(invalid), RUN_OPTIONS)

    expect(result.status).toBe('failed')
    expectDiagnostic(result, 'E_INVALID_COMPOSITION')
    expect(result.streams['s-1'].stream).toBeNull()
    expect(result.streams['s-1'].status).not.toBe('calculated')
  })

  it('rejects a heater duty overflow and blocks its downstream product', () => {
    const huge = makeState(1e304, 300, 100000, 5e303, 5e303)
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed',
          tag: 'F-HUGE',
          kind: 'stream',
          role: 'feed',
          state: huge,
        },
        {
          id: 'heater',
          tag: 'HX-HUGE',
          kind: 'heater',
          targetTemperatureK: 400,
        },
        {
          id: 'product',
          tag: 'PR-HUGE',
          kind: 'stream',
          role: 'product',
        },
      ],
      edges: [
        {
          id: 's-h1',
          tag: 'S-H1',
          sourceNodeId: 'feed',
          targetNodeId: 'heater',
        },
        {
          id: 's-h2',
          tag: 'S-H2',
          sourceNodeId: 'heater',
          targetNodeId: 'product',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('partial')
    expectDiagnostic(result, 'E_NON_FINITE_RESULT')
    expect(result.equipment['heater'].status).toBe('failed')
    expect(result.equipment['heater'].dutyW).toBeNull()
    expect(result.equipment['heater'].trace).toHaveLength(0)
    expect(result.streams['s-h2'].stream).toBeNull()
    expect(result.streams['s-h2'].status).toBe('blocked')
    expect(result.equipment['product'].status).toBe('blocked')
  })

  it('reports duplicate node ids and does not accept them as extra equipment', () => {
    const validState = makeState(1, 300, 100000, 0.5, 0.5)
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed',
          tag: 'F-1',
          kind: 'stream',
          role: 'feed',
          state: validState,
        },
        {
          id: 'feed',
          tag: 'F-DUPLICATE',
          kind: 'stream',
          role: 'feed',
          state: validState,
        },
        { id: 'product', tag: 'PR-1', kind: 'stream', role: 'product' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'feed',
          targetNodeId: 'product',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expectDiagnostic(result, 'E_DUPLICATE_NODE_ID')
    expect(result.status).not.toBe('success')
  })

  it('reports missing edge endpoints and does not accept them as streams', () => {
    const validState = makeState(1, 300, 100000, 0.5, 0.5)
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed',
          tag: 'F-1',
          kind: 'stream',
          role: 'feed',
          state: validState,
        },
        { id: 'product', tag: 'PR-1', kind: 'stream', role: 'product' },
      ],
      edges: [
        {
          id: 's-1',
          tag: 'S-1',
          sourceNodeId: 'feed',
          targetNodeId: 'product',
        },
        {
          id: 's-bad',
          tag: 'S-BAD',
          sourceNodeId: 'ghost',
          targetNodeId: 'product',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expectDiagnostic(result, 'E_MISSING_ENDPOINT')
    expect(result.status).not.toBe('success')
  })

  it('keeps a valid branch calculated when another branch overflows', () => {
    const valid = makeState(1, 300, 100000, 0.5, 0.5)
    const huge = makeState(1e304, 300, 100000, 5e303, 5e303)
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed-a',
          tag: 'F-A',
          kind: 'stream',
          role: 'feed',
          state: valid,
        },
        { id: 'mixer-a', tag: 'MX-A', kind: 'mixer' },
        {
          id: 'product-a',
          tag: 'PR-A',
          kind: 'stream',
          role: 'product',
        },
        {
          id: 'feed-b',
          tag: 'F-B',
          kind: 'stream',
          role: 'feed',
          state: huge,
        },
        {
          id: 'heater-b',
          tag: 'HX-B',
          kind: 'heater',
          targetTemperatureK: 400,
        },
        {
          id: 'product-b',
          tag: 'PR-B',
          kind: 'stream',
          role: 'product',
        },
      ],
      edges: [
        {
          id: 's-a1',
          tag: 'S-A1',
          sourceNodeId: 'feed-a',
          targetNodeId: 'mixer-a',
        },
        {
          id: 's-a2',
          tag: 'S-A2',
          sourceNodeId: 'mixer-a',
          targetNodeId: 'product-a',
        },
        {
          id: 's-b1',
          tag: 'S-B1',
          sourceNodeId: 'feed-b',
          targetNodeId: 'heater-b',
        },
        {
          id: 's-b2',
          tag: 'S-B2',
          sourceNodeId: 'heater-b',
          targetNodeId: 'product-b',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('partial')
    expect(result.streams['s-a2'].status).toBe('calculated')
    expect(result.equipment['mixer-a'].status).toBe('calculated')
    expect(result.equipment['product-a'].status).toBe('calculated')
    expect(result.streams['s-b2'].status).toBe('blocked')
    expect(result.equipment['heater-b'].status).toBe('failed')
    expect(result.equipment['product-b'].status).toBe('blocked')
    expectDiagnostic(result, 'E_NON_FINITE_RESULT')
  })

  it('keeps every numeric value finite in a successful result', () => {
    const result = runSimulation(makeFullFlowsheet(), RUN_OPTIONS)

    expect(result.status).toBe('success')
    expectFiniteNumbersDeep(result)
  })

  it('marks aggregate balance overflow as unavailable instead of emitting Infinity', () => {
    const huge = makeState(1e308, 300, 100000, 5e307, 5e307)
    const flowsheet: DomainFlowsheet = {
      nodes: [
        {
          id: 'feed-a',
          tag: 'F-A',
          kind: 'stream',
          role: 'feed',
          state: huge,
        },
        { id: 'product-a', tag: 'PR-A', kind: 'stream', role: 'product' },
        {
          id: 'feed-b',
          tag: 'F-B',
          kind: 'stream',
          role: 'feed',
          state: huge,
        },
        { id: 'product-b', tag: 'PR-B', kind: 'stream', role: 'product' },
      ],
      edges: [
        {
          id: 's-a',
          tag: 'S-A',
          sourceNodeId: 'feed-a',
          targetNodeId: 'product-a',
        },
        {
          id: 's-b',
          tag: 'S-B',
          sourceNodeId: 'feed-b',
          targetNodeId: 'product-b',
        },
      ],
    }

    const result = runSimulation(flowsheet, RUN_OPTIONS)

    expect(result.status).toBe('partial')
    expect(result.balances.status).toBe('unavailable')
    expect(result.balances.totalFeedKgS).toBeNull()
    expect(result.balances.totalProductKgS).toBeNull()
    expect(result.balances.closurePercent).toBeNull()
    expect(result.balances.components).toEqual([])
    expectDiagnostic(result, 'E_NON_FINITE_RESULT')
    expectFiniteNumbersDeep(result)
  })

  it('keeps trace values consistent with the final streams and duty', () => {
    const result = runSimulation(makeFullFlowsheet(), RUN_OPTIONS)

    const mixer = result.equipment['mixer-101']
    const heater = result.equipment['heater-101']
    const mixedStream = result.streams['s-103'].stream
    const productStream = result.streams['s-104'].stream
    const massTrace = mixer.trace.find(
      (step) => step.method === 'massBalance',
    )
    const mixingTrace = mixer.trace.find(
      (step) => step.method === 'cpWeightedAdiabaticMixing',
    )
    const heaterTrace = heater.trace.find(
      (step) => step.method === 'constantCpSensibleHeat',
    )

    expect(massTrace?.outputs.outletMassFlowKgS as number).toBeCloseTo(
      mixedStream!.massFlowKgS,
      12,
    )
    expect(mixingTrace?.outputs.outletTemperatureK as number).toBeCloseTo(
      mixedStream!.temperatureK,
      12,
    )
    expect(mixingTrace?.outputs.outletPressurePa as number).toBeCloseTo(
      mixedStream!.pressurePa,
      12,
    )
    expect(heaterTrace?.outputs.outletTemperatureK as number).toBeCloseTo(
      productStream!.temperatureK,
      12,
    )
    expect(heaterTrace?.outputs.dutyW as number).toBeCloseTo(
      heater.dutyW!,
      3,
    )
  })
})
