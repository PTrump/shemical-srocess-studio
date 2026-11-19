import {
  JOULES_PER_KILOJOULE,
  KELVIN_OFFSET,
  KILOGRAMS_PER_TONNE,
  PASCALS_PER_BAR,
  SECONDS_PER_HOUR,
  WATTS_PER_KILOWATT,
} from './units'

/** 12 t/h → 3.333333333... kg/s. */
export function tonnesPerHourToKgPerSecond(value: number): number {
  return (value * KILOGRAMS_PER_TONNE) / SECONDS_PER_HOUR
}

export function kgPerSecondToTonnesPerHour(value: number): number {
  return (value * SECONDS_PER_HOUR) / KILOGRAMS_PER_TONNE
}

/** Absolute temperature conversion. Never use this for temperature differences. */
export function celsiusToKelvin(value: number): number {
  return value + KELVIN_OFFSET
}

export function kelvinToCelsius(value: number): number {
  return value - KELVIN_OFFSET
}

/** Temperature differences are identical in K and °C. */
export function temperatureDifferenceCelsiusToKelvin(value: number): number {
  return value
}

export function barToPascal(value: number): number {
  return value * PASCALS_PER_BAR
}

export function pascalToBar(value: number): number {
  return value / PASCALS_PER_BAR
}

export function kilojoulesPerKgKelvinToJoulesPerKgKelvin(
  value: number,
): number {
  return value * JOULES_PER_KILOJOULE
}

export function joulesPerKgKelvinToKilojoulesPerKgKelvin(
  value: number,
): number {
  return value / JOULES_PER_KILOJOULE
}

export function kilowattsToWatts(value: number): number {
  return value * WATTS_PER_KILOWATT
}

export function wattsToKilowatts(value: number): number {
  return value / WATTS_PER_KILOWATT
}

/** UI weight percent (0–100) → engine mass fraction (0–1). */
export function weightPercentToMassFraction(value: number): number {
  return value / 100
}

export function massFractionToWeightPercent(value: number): number {
  return value * 100
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
