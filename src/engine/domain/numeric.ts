import {
  createDiagnostic,
  type Diagnostic,
  type DiagnosticScope,
} from './diagnostics'
import type { CalculationTrace } from './result'
import type { MaterialState } from './stream'

/**
 * Validate a computed numeric result after the calculation has run.
 *
 * Input validation rejects non-finite input values with E_NON_FINITE_VALUE.
 * This helper is for values produced by the engine itself (duty, outlet state,
 * trace values) and uses E_NON_FINITE_RESULT so callers can distinguish an
 * invalid input from a calculation overflow.
 */
export function checkFiniteResultNumber(
  value: number,
  label: string,
  scope: DiagnosticScope,
): Diagnostic[] {
  if (Number.isFinite(value)) {
    return []
  }

  return [
    createDiagnostic(
      'E_NON_FINITE_RESULT',
      'error',
      scope,
      `Calculated ${label} is not finite.`,
      'The input values were finite, but the calculation produced NaN or Infinity.',
      { label, value: String(value) },
    ),
  ]
}

export function validateFiniteMaterialState(
  state: MaterialState,
  scope: DiagnosticScope,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = []

  diagnostics.push(
    ...checkFiniteResultNumber(state.massFlowKgS, 'massFlowKgS', scope),
    ...checkFiniteResultNumber(state.temperatureK, 'temperatureK', scope),
    ...checkFiniteResultNumber(state.pressurePa, 'pressurePa', scope),
  )

  for (const component of state.components) {
    diagnostics.push(
      ...checkFiniteResultNumber(
        component.massFlowKgS,
        `component ${component.componentId} massFlowKgS`,
        scope,
      ),
    )
  }

  return diagnostics
}

export function validateFiniteTrace(
  trace: readonly CalculationTrace[],
  scope: DiagnosticScope,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = []

  for (const step of trace) {
    for (const [key, value] of Object.entries(step.inputs)) {
      if (typeof value === 'number') {
        diagnostics.push(
          ...checkFiniteResultNumber(
            value,
            `trace ${step.step} input ${key}`,
            scope,
          ),
        )
      }
    }
    for (const [key, value] of Object.entries(step.outputs)) {
      if (typeof value === 'number') {
        diagnostics.push(
          ...checkFiniteResultNumber(
            value,
            `trace ${step.step} output ${key}`,
            scope,
          ),
        )
      }
    }
  }

  return diagnostics
}
