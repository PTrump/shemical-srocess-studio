import {
  createDiagnostic,
  hasErrors,
  type Diagnostic,
} from '../domain/diagnostics'
import {
  checkFiniteResultNumber,
  validateFiniteMaterialState,
  validateFiniteTrace,
} from '../domain/numeric'
import type { MaterialState } from '../domain/stream'
import { validateMaterialState } from '../domain/stream'
import { getMixtureCp } from '../properties/propertyPackage'
import {
  createOperationTrace,
  nodeScope,
  SINGLE_PHASE_ASSUMPTIONS,
  type OperationContext,
  type UnitCalculationResult,
} from './types'

export type HeatExchangerKind = 'heater' | 'cooler'

interface HeatExchangerCalculation {
  outlet: MaterialState | null
  dutyW: number | null
  diagnostics: Diagnostic[]
  trace: UnitCalculationResult['trace']
}

function calculateHeatExchanger(
  kind: HeatExchangerKind,
  inlet: MaterialState,
  targetTemperatureK: number,
  context: OperationContext,
): HeatExchangerCalculation {
  const scope = nodeScope(context)
  const diagnostics: Diagnostic[] = []

  const inletDiagnostics = validateMaterialState(
    inlet,
    context.propertyPackage,
    scope,
  )
  diagnostics.push(...inletDiagnostics)

  if (!Number.isFinite(targetTemperatureK)) {
    diagnostics.push(
      createDiagnostic(
        'E_NON_FINITE_VALUE',
        'error',
        scope,
        'Target outlet temperature must be finite.',
        undefined,
        { targetTemperatureK: String(targetTemperatureK) },
      ),
    )
  } else if (targetTemperatureK <= 0) {
    diagnostics.push(
      createDiagnostic(
        'E_INVALID_TEMPERATURE',
        'error',
        scope,
        'Target outlet temperature must be an absolute temperature above 0 K.',
        undefined,
        { targetTemperatureK },
      ),
    )
  }

  if (hasErrors(diagnostics)) {
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  if (kind === 'heater' && targetTemperatureK < inlet.temperatureK) {
    diagnostics.push(
      createDiagnostic(
        'E_TARGET_DIRECTION',
        'error',
        scope,
        'Heater target temperature cannot be below the inlet temperature.',
        'Use a Cooler for a temperature decrease.',
        {
          inletTemperatureK: inlet.temperatureK,
          targetTemperatureK,
        },
      ),
    )
  }

  if (kind === 'cooler' && targetTemperatureK > inlet.temperatureK) {
    diagnostics.push(
      createDiagnostic(
        'E_TARGET_DIRECTION',
        'error',
        scope,
        'Cooler target temperature cannot be above the inlet temperature.',
        'Use a Heater for a temperature increase.',
        {
          inletTemperatureK: inlet.temperatureK,
          targetTemperatureK,
        },
      ),
    )
  }

  if (hasErrors(diagnostics)) {
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  const cp = getMixtureCp(inlet.components, context.propertyPackage)
  if (cp === null) {
    diagnostics.push(
      createDiagnostic(
        'E_MISSING_PROPERTY',
        'error',
        scope,
        'Cannot calculate duty because a valid mixture Cp is unavailable.',
      ),
    )
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  const dutyW = inlet.massFlowKgS * cp * (targetTemperatureK - inlet.temperatureK)
  const dutyDiagnostics = checkFiniteResultNumber(
    dutyW,
    `${kind}.dutyW`,
    scope,
  )
  if (hasErrors(dutyDiagnostics)) {
    diagnostics.push(...dutyDiagnostics)
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  const outlet: MaterialState = {
    massFlowKgS: inlet.massFlowKgS,
    temperatureK: targetTemperatureK,
    pressurePa: inlet.pressurePa,
    phase: 'liquid',
    components: inlet.components.map((component) => ({ ...component })),
  }

  const outletFiniteDiagnostics = validateFiniteMaterialState(
    outlet,
    scope,
  )
  if (hasErrors(outletFiniteDiagnostics)) {
    diagnostics.push(...outletFiniteDiagnostics)
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  const outletDiagnostics = validateMaterialState(
    outlet,
    context.propertyPackage,
    scope,
  )
  diagnostics.push(...outletDiagnostics)

  if (hasErrors(diagnostics)) {
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  const normalizedDutyW = Object.is(dutyW, -0) ? 0 : dutyW

  const trace = [
    createOperationTrace(
      `${kind}-energy-balance`,
      'constantCpSensibleHeat',
      'Q = F · Cp_mix · (T_out - T_in)',
      {
        inletMassFlowKgS: inlet.massFlowKgS,
        mixtureCpJPerKgK: cp,
        inletTemperatureK: inlet.temperatureK,
        targetTemperatureK,
        inletPressurePa: inlet.pressurePa,
      },
      {
        dutyW: normalizedDutyW,
        outletTemperatureK: outlet.temperatureK,
        outletPressurePa: outlet.pressurePa,
      },
      [
        ...SINGLE_PHASE_ASSUMPTIONS,
        'no pressure drop',
        'pressure has no effect on liquid sensible enthalpy in this model',
      ],
    ),
  ]

  const traceDiagnostics = validateFiniteTrace(trace, scope)
  if (hasErrors(traceDiagnostics)) {
    diagnostics.push(...traceDiagnostics)
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  return {
    outlet,
    dutyW: normalizedDutyW,
    diagnostics,
    trace,
  }
}

export function calculateHeater(
  inlet: MaterialState,
  targetTemperatureK: number,
  context: OperationContext,
): UnitCalculationResult {
  return calculateHeatExchanger(
    'heater',
    inlet,
    targetTemperatureK,
    context,
  )
}

export function calculateCooler(
  inlet: MaterialState,
  targetTemperatureK: number,
  context: OperationContext,
): UnitCalculationResult {
  return calculateHeatExchanger(
    'cooler',
    inlet,
    targetTemperatureK,
    context,
  )
}
