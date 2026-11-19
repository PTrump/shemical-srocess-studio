import { describe, expect, it } from 'vitest'
import type { CalculationTrace } from '../../engine'
import { displayTraceValue } from '../traceDisplay'

describe('trace display conversion', () => {
  it('converts mass flow kg/s to t/h', () => {
    const result = displayTraceValue(
      'outletMassFlowKgS',
      3.3333333333333335,
    )
    expect(result.display).toBe('12 t/h')
    expect(result.original).toContain('kg/s')
    expect(result.converted).toBe(true)
  })

  it('converts temperature K to °C', () => {
    const result = displayTraceValue('outletTemperatureK', 318.15)
    expect(result.display).toBe('45 °C')
    expect(result.original).toBe('318.15 K')
  })

  it('converts pressure Pa to bar', () => {
    const result = displayTraceValue('outletPressurePa', 260000)
    expect(result.display).toBe('2.6 bar')
    expect(result.original).toBe('260000 Pa')
  })

  it('converts heat capacity J/(kg·K) to kJ/(kg·K)', () => {
    const result = displayTraceValue('outletMixtureCpJPerKgK', 2200)
    expect(result.display).toBe('2.2 kJ/(kg·K)')
    expect(result.original).toBe('2200 J/(kg·K)')
  })

  it('converts duty W to kW', () => {
    const result = displayTraceValue('dutyW', 293333.3333333334)
    expect(result.display).toBe('293.3333 kW')
    expect(result.original).toContain('W')
  })

  it('converts pressure lists and component flow lists without mutating raw values', () => {
    const trace: CalculationTrace = {
      step: 'test',
      method: 'test',
      formula: 'test',
      inputs: {
        inletPressureValuesPa: '280000,260000',
        outletComponentsKgS: 'A=1.8333333333333333;B=1.5',
      },
      outputs: {},
      assumptions: [],
    }
    const rawBefore = JSON.stringify(trace)

    expect(
      displayTraceValue(
        'inletPressureValuesPa',
        trace.inputs.inletPressureValuesPa,
      ).display,
    ).toBe('2.8 / 2.6 bar')
    expect(
      displayTraceValue(
        'outletComponentsKgS',
        trace.inputs.outletComponentsKgS,
      ).display,
    ).toBe('A=6.6;B=5.4 t/h')
    expect(JSON.stringify(trace)).toBe(rawBefore)
  })

  it('keeps unrecognized values and fields unchanged', () => {
    const count = displayTraceValue('inletCount', 2)
    expect(count.display).toBe('2')
    expect(count.converted).toBe(false)
    expect(count.original).toBe('2')

    const unknown = displayTraceValue('customField', 'abc')
    expect(unknown.display).toBe('abc')
    expect(unknown.original).toBe('abc')
    expect(unknown.converted).toBe(false)
  })
})
