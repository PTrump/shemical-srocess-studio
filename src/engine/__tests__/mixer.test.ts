import { describe, expect, it } from 'vitest'
import { calculateMixer } from '../operations/mixer'
import {
  deriveMassFractions,
  getComponentMassFlow,
  type MaterialState,
} from '../domain/stream'
import { createPropertyPackage } from '../properties/propertyPackage'
import {
  FEED_A,
  FEED_B,
  MASS_FLOW_12_TPH_KG_S,
  MIXER_CONTEXT,
  PRESSURE_2_6_BAR_PA,
} from './testFixtures'

function state(
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

const DISTINCT_CP_PACKAGE = createPropertyPackage({
  id: 'p222-verification-cp-package',
  displayName: 'P2.2.2 verification Cp package',
  version: 'test',
  isTeaching: true,
  disclaimer: 'Independent verification only.',
  components: [
    {
      id: 'A',
      displayName: 'Component A verification placeholder',
      cpJPerKgK: 2000,
      isTeachingPlaceholder: true,
    },
    {
      id: 'B',
      displayName: 'Component B verification placeholder',
      cpJPerKgK: 3000,
      isTeachingPlaceholder: true,
    },
  ],
})

describe('Mixer', () => {
  it('conserves total and component mass and derives 55/45 mass fractions', () => {
    const result = calculateMixer([FEED_A, FEED_B], MIXER_CONTEXT)

    expect(result.outlet).not.toBeNull()
    const outlet = result.outlet!
    expect(outlet.massFlowKgS).toBeCloseTo(MASS_FLOW_12_TPH_KG_S, 12)
    expect(getComponentMassFlow(outlet, 'A')).toBeCloseTo(
      MASS_FLOW_12_TPH_KG_S * 0.55,
      12,
    )
    expect(getComponentMassFlow(outlet, 'B')).toBeCloseTo(
      MASS_FLOW_12_TPH_KG_S * 0.45,
      12,
    )
    expect(deriveMassFractions(outlet).get('A')).toBeCloseTo(0.55, 12)
    expect(deriveMassFractions(outlet).get('B')).toBeCloseTo(0.45, 12)
  })

  it('calculates 45 °C adiabatic mixing with equal teaching Cp values', () => {
    const result = calculateMixer([FEED_A, FEED_B], MIXER_CONTEXT)

    expect(result.outlet?.temperatureK).toBeCloseTo(318.15, 12)
    expect(result.dutyW).toBe(0)
    expect(result.outlet?.pressurePa).toBeCloseTo(PRESSURE_2_6_BAR_PA, 6)
  })

  it('returns a trace and a diagnostic when no inlet is present', () => {
    const result = calculateMixer([], MIXER_CONTEXT)

    expect(result.outlet).toBeNull()
    expect(result.dutyW).toBeNull()
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'E_MISSING_INLET',
      ),
    ).toBe(true)
    expect(result.trace).toHaveLength(0)
  })

  it('rejects a tiny composition whose components exceed the total flow', () => {
    const invalid = state(1e-13, 300, 100000, 5e-13, 0)
    const result = calculateMixer([invalid], MIXER_CONTEXT)

    expect(result.outlet).toBeNull()
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'E_INVALID_COMPOSITION',
      ),
    ).toBe(true)
    expect(result.trace).toHaveLength(0)
  })

  it('rejects a tiny composition whose components are below the total flow', () => {
    const invalid = state(1e-13, 300, 100000, 2e-14, 2e-14)
    const result = calculateMixer([invalid], MIXER_CONTEXT)

    expect(result.outlet).toBeNull()
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'E_INVALID_COMPOSITION',
      ),
    ).toBe(true)
    expect(result.trace).toHaveLength(0)
  })

  it('accepts a tiny but internally consistent stream', () => {
    const tiny = state(1e-13, 300, 100000, 5e-14, 5e-14)
    const result = calculateMixer([tiny], MIXER_CONTEXT)

    expect(result.outlet).not.toBeNull()
    expect(result.outlet?.massFlowKgS).toBeCloseTo(1e-13, 25)
    expect(getComponentMassFlow(result.outlet!, 'A')).toBeCloseTo(5e-14, 25)
    expect(getComponentMassFlow(result.outlet!, 'B')).toBeCloseTo(5e-14, 25)
    expect(result.outlet?.temperatureK).toBeCloseTo(300, 12)
    expect(result.dutyW).toBe(0)
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'E_INVALID_COMPOSITION',
      ),
    ).toBe(false)
  })

  it('accepts ordinary floating-point rounding in a normal stream', () => {
    const rounded = state(0.3, 300, 100000, 0.1, 0.2)
    const result = calculateMixer([rounded], MIXER_CONTEXT)

    expect(result.outlet).not.toBeNull()
    expect(result.outlet?.massFlowKgS).toBeCloseTo(0.3, 15)
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'E_INVALID_COMPOSITION',
      ),
    ).toBe(false)
  })

  it('rejects a mixer calculation whose intermediate values overflow', () => {
    const huge = state(1e304, 300, 100000, 5e303, 5e303)
    const result = calculateMixer([huge], MIXER_CONTEXT)

    expect(result.outlet).toBeNull()
    expect(result.dutyW).toBeNull()
    expect(result.trace).toHaveLength(0)
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'E_NON_FINITE_RESULT',
      ),
    ).toBe(true)
  })

  it('merges disjoint component sets and uses distinct Cp values', () => {
    const aOnly = state(1, 300, 200000, 1, 0)
    const bOnly = state(2, 400, 150000, 0, 2)

    const result = calculateMixer([aOnly, bOnly], {
      nodeId: 'mixer-distinct-cp',
      tag: 'MX-DISTINCT-CP',
      propertyPackage: DISTINCT_CP_PACKAGE,
    })

    expect(result.outlet).not.toBeNull()
    const outlet = result.outlet!
    expect(outlet.massFlowKgS).toBeCloseTo(3, 12)
    expect(getComponentMassFlow(outlet, 'A')).toBeCloseTo(1, 12)
    expect(getComponentMassFlow(outlet, 'B')).toBeCloseTo(2, 12)
    // Independent hand calculation:
    // cp_mix = (1*2000 + 2*3000) / 3 = 2666.6667 J/(kg·K)
    // T_out = (1*2000*300 + 2*3000*400) / (1*2000 + 2*3000) = 375 K
    expect(outlet.temperatureK).toBeCloseTo(375, 12)
    expect(outlet.pressurePa).toBeCloseTo(150000, 12)
    expect(result.dutyW).toBe(0)
  })
})
