import { describe, expect, it } from 'vitest'
import {
  barToPascal,
  celsiusToKelvin,
  kilojoulesPerKgKelvinToJoulesPerKgKelvin,
  tonnesPerHourToKgPerSecond,
} from '../units/convert'

describe('unit conversions', () => {
  it('converts 12 t/h to 3.333333333 kg/s', () => {
    expect(tonnesPerHourToKgPerSecond(12)).toBeCloseTo(3.333333333, 9)
  })

  it('converts 25 °C to 298.15 K', () => {
    expect(celsiusToKelvin(25)).toBeCloseTo(298.15, 9)
  })

  it('converts 2.8 bar to 280000 Pa', () => {
    expect(barToPascal(2.8)).toBeCloseTo(280000, 6)
  })

  it('converts 2.2 kJ/(kg·K) to 2200 J/(kg·K)', () => {
    expect(kilojoulesPerKgKelvinToJoulesPerKgKelvin(2.2)).toBeCloseTo(
      2200,
      9,
    )
  })
})
