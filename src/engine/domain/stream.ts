import {
  createDiagnostic,
  type Diagnostic,
  type DiagnosticScope,
} from './diagnostics'
import type { ComponentId } from '../properties/component'
import type { PropertyPackage } from '../properties/propertyPackage'
import { hasErrors } from './diagnostics'
import { massFlowConsistencyTolerance } from '../units/units'

export type CompositionBasis = 'mass'
export type Phase = 'liquid'

export interface ComponentMassFlow {
  componentId: ComponentId
  /** Component mass flow, kg/s. This is the authoritative composition data. */
  massFlowKgS: number
}

export interface MaterialState {
  /** Total mass flow, kg/s. Must equal the sum of component mass flows. */
  massFlowKgS: number
  /** Absolute temperature, K. */
  temperatureK: number
  /** Absolute pressure, Pa. */
  pressurePa: number
  /** P2.2 supports single-phase liquid only. */
  phase: Phase
  components: ComponentMassFlow[]
}

export interface StreamValidity {
  status: 'valid' | 'warning' | 'error'
  diagnostics: Diagnostic[]
}

export interface StreamProvenance {
  runId: string
  calculatedByNodeId: string | null
  propertyPackageId: string
  modelVersion: string
}

export interface Stream extends MaterialState {
  id: string
  edgeId: string
  tag: string
  sourceNodeId: string
  targetNodeId: string
  compositionBasis: CompositionBasis
  validity: StreamValidity
  provenance: StreamProvenance
}

export interface CreateStreamMetadata {
  id: string
  edgeId: string
  tag: string
  sourceNodeId: string
  targetNodeId: string
  runId: string
  calculatedByNodeId: string | null
  propertyPackageId: string
  modelVersion: string
}

export function validateMaterialState(
  state: MaterialState,
  propertyPackage: PropertyPackage,
  scope: DiagnosticScope = { type: 'flowsheet' },
): Diagnostic[] {
  const diagnostics: Diagnostic[] = []

  const checkFinite = (value: number, key: string): boolean => {
    if (!Number.isFinite(value)) {
      diagnostics.push(
        createDiagnostic(
          'E_NON_FINITE_VALUE',
          'error',
          scope,
          `${key} must be a finite number.`,
          undefined,
          { key, value: String(value) },
        ),
      )
      return false
    }
    return true
  }

  const massFlowFinite = checkFinite(state.massFlowKgS, 'massFlowKgS')
  const temperatureFinite = checkFinite(state.temperatureK, 'temperatureK')
  const pressureFinite = checkFinite(state.pressurePa, 'pressurePa')

  if (massFlowFinite) {
    if (state.massFlowKgS < 0) {
      diagnostics.push(
        createDiagnostic(
          'E_NEGATIVE_MASS_FLOW',
          'error',
          scope,
          'Total mass flow cannot be negative.',
          undefined,
          { massFlowKgS: state.massFlowKgS },
        ),
      )
    } else if (state.massFlowKgS === 0) {
      diagnostics.push(
        createDiagnostic(
          'E_ZERO_FLOW',
          'error',
          scope,
          'Total mass flow must be greater than zero for a calculated stream.',
          undefined,
          { massFlowKgS: state.massFlowKgS },
        ),
      )
    }
  }

  if (temperatureFinite && state.temperatureK <= 0) {
    diagnostics.push(
      createDiagnostic(
        'E_INVALID_TEMPERATURE',
        'error',
        scope,
        'Temperature must be an absolute temperature above 0 K.',
        undefined,
        { temperatureK: state.temperatureK },
      ),
    )
  }

  if (pressureFinite && state.pressurePa <= 0) {
    diagnostics.push(
      createDiagnostic(
        'E_INVALID_PRESSURE',
        'error',
        scope,
        'Pressure must be greater than zero.',
        undefined,
        { pressurePa: state.pressurePa },
      ),
    )
  }

  if (state.phase !== 'liquid') {
    diagnostics.push(
      createDiagnostic(
        'E_UNSUPPORTED_PHASE',
        'error',
        scope,
        'P2.2 only supports single-phase liquid streams.',
        undefined,
        { phase: String(state.phase) },
      ),
    )
  }

  if (!Array.isArray(state.components) || state.components.length === 0) {
    diagnostics.push(
      createDiagnostic(
        'E_INVALID_COMPOSITION',
        'error',
        scope,
        'A stream must contain at least one component.',
        'Every component mass flow is required.',
      ),
    )
    return diagnostics
  }

  const seen = new Set<ComponentId>()
  let componentSum = 0
  let componentsNumeric = true
  let hasPositiveComponent = false

  for (const component of state.components) {
    if (!component || typeof component.componentId !== 'string') {
      diagnostics.push(
        createDiagnostic(
          'E_INVALID_COMPOSITION',
          'error',
          scope,
          'Each component must have a string componentId.',
        ),
      )
      componentsNumeric = false
      continue
    }

    if (seen.has(component.componentId)) {
      diagnostics.push(
        createDiagnostic(
          'E_DUPLICATE_COMPONENT',
          'error',
          scope,
          `Component ${component.componentId} appears more than once.`,
        ),
      )
    }
    seen.add(component.componentId)

    if (!Number.isFinite(component.massFlowKgS)) {
      diagnostics.push(
        createDiagnostic(
          'E_NON_FINITE_VALUE',
          'error',
          scope,
          `Mass flow for component ${component.componentId} must be finite.`,
          undefined,
          { componentId: component.componentId, value: String(component.massFlowKgS) },
        ),
      )
      componentsNumeric = false
    } else if (component.massFlowKgS < 0) {
      diagnostics.push(
        createDiagnostic(
          'E_NEGATIVE_MASS_FLOW',
          'error',
          scope,
          `Mass flow for component ${component.componentId} cannot be negative.`,
          undefined,
          { componentId: component.componentId, massFlowKgS: component.massFlowKgS },
        ),
      )
    } else {
      componentSum += component.massFlowKgS
      if (component.massFlowKgS > 0) {
        hasPositiveComponent = true
      }
    }

    const property = propertyPackage.getComponent(component.componentId)
    if (!property) {
      diagnostics.push(
        createDiagnostic(
          'E_UNKNOWN_COMPONENT',
          'error',
          scope,
          `Component ${component.componentId} is not present in property package ${propertyPackage.id}.`,
        ),
      )
    }
    // Heat-capacity availability is checked by energy operations, not by the
    // material-state validator: a stream can be valid for mass-only transport
    // even if a later energy balance cannot use it.
  }

  if (massFlowFinite && componentsNumeric) {
    if (!Number.isFinite(componentSum)) {
      diagnostics.push(
        createDiagnostic(
          'E_INVALID_COMPOSITION',
          'error',
          scope,
          'Component mass-flow sum is not finite.',
          'Check the component mass flows; no silent correction was applied.',
          {
            totalMassFlowKgS: state.massFlowKgS,
            componentMassFlowSumKgS: String(componentSum),
          },
        ),
      )
    } else {
      const tolerance = massFlowConsistencyTolerance(
        state.massFlowKgS,
        componentSum,
      )
      if (Math.abs(componentSum - state.massFlowKgS) > tolerance) {
        diagnostics.push(
          createDiagnostic(
            'E_INVALID_COMPOSITION',
            'error',
            scope,
            'Component mass flows do not add up to the total mass flow.',
            'Check the mass-flow and composition inputs; no silent correction was applied.',
            {
              totalMassFlowKgS: state.massFlowKgS,
              componentMassFlowSumKgS: componentSum,
              toleranceKgS: tolerance,
            },
          ),
        )
      }
    }
  }

  if (state.massFlowKgS > 0 && !hasPositiveComponent) {
    diagnostics.push(
      createDiagnostic(
        'E_INVALID_COMPOSITION',
        'error',
        scope,
        'A positive total mass flow must contain at least one positive component mass flow.',
      ),
    )
  }

  return diagnostics
}

export function deriveMassFractions(
  state: Pick<MaterialState, 'massFlowKgS' | 'components'>,
): Map<ComponentId, number> {
  const fractions = new Map<ComponentId, number>()
  if (!Number.isFinite(state.massFlowKgS) || state.massFlowKgS <= 0) {
    return fractions
  }

  for (const component of state.components) {
    fractions.set(
      component.componentId,
      component.massFlowKgS / state.massFlowKgS,
    )
  }
  return fractions
}

export function getComponentMassFlow(
  state: Pick<MaterialState, 'components'>,
  componentId: ComponentId,
): number | null {
  const component = state.components.find(
    (item) => item.componentId === componentId,
  )
  return component ? component.massFlowKgS : null
}

export function createStream(
  state: MaterialState,
  metadata: CreateStreamMetadata,
  diagnostics: Diagnostic[] = [],
): Stream {
  const validityStatus = hasErrors(diagnostics)
    ? 'error'
    : diagnostics.length > 0
      ? 'warning'
      : 'valid'

  return {
    ...state,
    components: state.components.map((component) => ({ ...component })),
    id: metadata.id,
    edgeId: metadata.edgeId,
    tag: metadata.tag,
    sourceNodeId: metadata.sourceNodeId,
    targetNodeId: metadata.targetNodeId,
    compositionBasis: 'mass',
    validity: {
      status: validityStatus,
      diagnostics,
    },
    provenance: {
      runId: metadata.runId,
      calculatedByNodeId: metadata.calculatedByNodeId,
      propertyPackageId: metadata.propertyPackageId,
      modelVersion: metadata.modelVersion,
    },
  }
}
