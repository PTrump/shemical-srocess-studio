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

/**
 * Adiabatic steady-state mixer.
 *
 * Mass and component mass are conserved. Outlet temperature is calculated
 * from a mass/Cp-weighted energy balance. Outlet pressure is the minimum of
 * all inlet pressures. Duty is exactly 0 W by definition.
 */
export function calculateMixer(
  inlets: readonly MaterialState[],
  context: OperationContext,
): UnitCalculationResult {
  const scope = nodeScope(context)
  const diagnostics: Diagnostic[] = []

  if (inlets.length === 0) {
    diagnostics.push(
      createDiagnostic(
        'E_MISSING_INLET',
        'error',
        scope,
        'Mixer requires at least one inlet stream.',
        'Connect at least one feed or upstream stream to the mixer.',
      ),
    )
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  for (const [index, inlet] of inlets.entries()) {
    const inletDiagnostics = validateMaterialState(
      inlet,
      context.propertyPackage,
      scope,
    )
    diagnostics.push(
      ...inletDiagnostics.map((diagnostic) => ({
        ...diagnostic,
        message: `Inlet ${index + 1}: ${diagnostic.message}`,
      })),
    )
  }

  if (hasErrors(diagnostics)) {
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  const componentTotals = new Map<string, number>()
  for (const component of context.propertyPackage.components) {
    componentTotals.set(component.id, 0)
  }

  for (const inlet of inlets) {
    for (const component of inlet.components) {
      componentTotals.set(
        component.componentId,
        (componentTotals.get(component.componentId) ?? 0) +
          component.massFlowKgS,
      )
    }
  }

  const components = Array.from(componentTotals.entries()).map(
    ([componentId, massFlowKgS]) => ({ componentId, massFlowKgS }),
  )
  const massFlowKgS = components.reduce(
    (total, component) => total + component.massFlowKgS,
    0,
  )

  const massFlowDiagnostics = checkFiniteResultNumber(
    massFlowKgS,
    'mixer.outletMassFlowKgS',
    scope,
  )
  if (hasErrors(massFlowDiagnostics)) {
    diagnostics.push(...massFlowDiagnostics)
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  if (massFlowKgS <= 0) {
    diagnostics.push(
      createDiagnostic(
        'E_ZERO_FLOW',
        'error',
        scope,
        'Mixer outlet mass flow is zero.',
      ),
    )
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  let cpNumerator = 0
  let cpDenominator = 0
  let minimumPressurePa = Number.POSITIVE_INFINITY

  for (const inlet of inlets) {
    const cp = getMixtureCp(inlet.components, context.propertyPackage)
    if (cp === null) {
      diagnostics.push(
        createDiagnostic(
          'E_MISSING_PROPERTY',
          'error',
          scope,
          'Cannot calculate mixer energy balance because a valid mixture Cp is unavailable.',
        ),
      )
      continue
    }
    cpNumerator += inlet.massFlowKgS * cp * inlet.temperatureK
    cpDenominator += inlet.massFlowKgS * cp
    minimumPressurePa = Math.min(minimumPressurePa, inlet.pressurePa)
  }

  if (hasErrors(diagnostics)) {
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  const energyDiagnostics = [
    ...checkFiniteResultNumber(
      cpNumerator,
      'mixer.cpWeightedTemperatureNumerator',
      scope,
    ),
    ...checkFiniteResultNumber(
      cpDenominator,
      'mixer.cpWeightedTemperatureDenominator',
      scope,
    ),
  ]
  if (hasErrors(energyDiagnostics)) {
    diagnostics.push(...energyDiagnostics)
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  if (cpDenominator <= 0) {
    diagnostics.push(
      createDiagnostic(
        'E_MISSING_PROPERTY',
        'error',
        scope,
        'Mixer energy balance denominator is not positive.',
      ),
    )
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  const outletTemperatureK = cpNumerator / cpDenominator
  const outletFiniteDiagnostics = [
    ...checkFiniteResultNumber(
      outletTemperatureK,
      'mixer.outletTemperatureK',
      scope,
    ),
    ...checkFiniteResultNumber(
      minimumPressurePa,
      'mixer.outletPressurePa',
      scope,
    ),
  ]
  if (hasErrors(outletFiniteDiagnostics)) {
    diagnostics.push(...outletFiniteDiagnostics)
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  const outlet: MaterialState = {
    massFlowKgS,
    temperatureK: outletTemperatureK,
    pressurePa: minimumPressurePa,
    phase: 'liquid',
    components,
  }

  const materialFiniteDiagnostics = validateFiniteMaterialState(
    outlet,
    scope,
  )
  if (hasErrors(materialFiniteDiagnostics)) {
    diagnostics.push(...materialFiniteDiagnostics)
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

  const outletCp = getMixtureCp(
    outlet.components,
    context.propertyPackage,
  )
  if (outletCp === null) {
    diagnostics.push(
      createDiagnostic(
        'E_MISSING_PROPERTY',
        'error',
        scope,
        'Cannot calculate outlet mixture Cp.',
      ),
    )
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }
  const outletCpDiagnostics = checkFiniteResultNumber(
    outletCp,
    'mixer.outletMixtureCpJPerKgK',
    scope,
  )
  if (hasErrors(outletCpDiagnostics)) {
    diagnostics.push(...outletCpDiagnostics)
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  const trace = [
    createOperationTrace(
      'mixer-mass-balance',
      'massBalance',
      'F_out = Σ F_in;  F_i,out = Σ F_i,in',
      {
        inletCount: inlets.length,
        totalInletMassFlowKgS: massFlowKgS,
      },
      {
        outletMassFlowKgS: massFlowKgS,
        outletComponentsKgS: components
          .map(
            (component) =>
              `${component.componentId}=${component.massFlowKgS}`,
          )
          .join(';'),
      },
      [...SINGLE_PHASE_ASSUMPTIONS, 'adiabatic mixer', 'no heat of mixing'],
    ),
    createOperationTrace(
      'mixer-adiabatic-energy-balance',
      'cpWeightedAdiabaticMixing',
      'T_out = Σ(F_j · cp_j · T_j) / Σ(F_j · cp_j)',
      {
        cpDenominatorKgPerSJPerKgK: cpDenominator,
        inletPressureValuesPa: inlets
          .map((inlet) => inlet.pressurePa)
          .join(','),
      },
      {
        outletTemperatureK: outlet.temperatureK,
        outletPressurePa: outlet.pressurePa,
        outletMixtureCpJPerKgK: outletCp,
        dutyW: 0,
      },
      ['outlet pressure = minimum inlet pressure'],
    ),
  ]

  const traceDiagnostics = validateFiniteTrace(trace, scope)
  if (hasErrors(traceDiagnostics)) {
    diagnostics.push(...traceDiagnostics)
    return { outlet: null, dutyW: null, diagnostics, trace: [] }
  }

  return { outlet, dutyW: 0, diagnostics, trace }
}
