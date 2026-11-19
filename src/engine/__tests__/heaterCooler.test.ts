import { describe, expect, it } from 'vitest'
import { calculateCooler, calculateHeater } from '../operations/heaterCooler'
import {
  COOLER_CONTEXT,
  HEATER_CONTEXT,
  MIXED_45C,
  PRESSURE_2_6_BAR_PA,
} from './testFixtures'
import { createTeachingBinaryMaterialState } from '../properties/teachingBinaryFluid'

const HOT_STATE = createTeachingBinaryMaterialState({
  massFlowKgS: MIXED_45C.massFlowKgS,
  temperatureK: 358.15,
  pressurePa: PRESSURE_2_6_BAR_PA,
  massFractionA: 0.55,
})

const HUGE_STATE = {
  massFlowKgS: 1e304,
  temperatureK: 300,
  pressurePa: 100000,
  phase: 'liquid' as const,
  components: [
    { componentId: 'A', massFlowKgS: 5e303 },
    { componentId: 'B', massFlowKgS: 5e303 },
  ],
}

const HUGE_HOT_STATE = {
  ...HUGE_STATE,
  temperatureK: 400,
}

describe('Heater and Cooler', () => {
  it('calculates heater duty as +293.333 kW', () => {
    const result = calculateHeater(MIXED_45C, 358.15, HEATER_CONTEXT)

    expect(result.outlet).not.toBeNull()
    expect(result.outlet?.temperatureK).toBeCloseTo(358.15, 12)
    expect(result.outlet?.pressurePa).toBeCloseTo(PRESSURE_2_6_BAR_PA, 6)
    expect(result.dutyW).toBeCloseTo(293333.333333, 3)
  })

  it('calculates cooler duty as -293.333 kW', () => {
    const result = calculateCooler(HOT_STATE, 318.15, COOLER_CONTEXT)

    expect(result.outlet).not.toBeNull()
    expect(result.outlet?.temperatureK).toBeCloseTo(318.15, 12)
    expect(result.dutyW).toBeCloseTo(-293333.333333, 3)
  })

  it('rejects a heater target below the inlet temperature', () => {
    const result = calculateHeater(MIXED_45C, 313.15, HEATER_CONTEXT)

    expect(result.outlet).toBeNull()
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'E_TARGET_DIRECTION',
      ),
    ).toBe(true)
  })

  it('rejects a cooler target above the inlet temperature', () => {
    const result = calculateCooler(HOT_STATE, 363.15, COOLER_CONTEXT)

    expect(result.outlet).toBeNull()
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'E_TARGET_DIRECTION',
      ),
    ).toBe(true)
  })

  it('rejects a heater duty overflow instead of returning Infinity', () => {
    const result = calculateHeater(HUGE_STATE, 400, HEATER_CONTEXT)

    expect(result.outlet).toBeNull()
    expect(result.dutyW).toBeNull()
    expect(result.trace).toHaveLength(0)
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'E_NON_FINITE_RESULT',
      ),
    ).toBe(true)
  })

  it('rejects a cooler duty overflow instead of returning -Infinity', () => {
    const result = calculateCooler(HUGE_HOT_STATE, 300, COOLER_CONTEXT)

    expect(result.outlet).toBeNull()
    expect(result.dutyW).toBeNull()
    expect(result.trace).toHaveLength(0)
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === 'E_NON_FINITE_RESULT',
      ),
    ).toBe(true)
  })
})
