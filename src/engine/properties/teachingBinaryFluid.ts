import { createPropertyPackage } from './propertyPackage'
import type { ComponentProperty } from './component'
import type { MaterialState } from '../domain/stream'

/**
 * Teaching Binary Fluid v1
 *
 * IMPORTANT: Component A and Component B are fictional teaching components.
 * The Cp values below are teaching parameters, not data for any real chemical
 * substance. No molecular weight, boiling point, vapour pressure or other
 * real-fluid property is defined in this package.
 */
export const TEACHING_BINARY_FLUID_ID = 'teaching-binary-fluid-v1'
export const TEACHING_COMPONENT_A_ID = 'A'
export const TEACHING_COMPONENT_B_ID = 'B'

export const TEACHING_COMPONENT_A: ComponentProperty = {
  id: TEACHING_COMPONENT_A_ID,
  displayName: 'Component A (fictional teaching component)',
  cpJPerKgK: 2200,
  isTeachingPlaceholder: true,
  description:
    'Fictional teaching component. Cp = 2.2 kJ/(kg·K) is a teaching parameter only.',
}

export const TEACHING_COMPONENT_B: ComponentProperty = {
  id: TEACHING_COMPONENT_B_ID,
  displayName: 'Component B (fictional teaching component)',
  cpJPerKgK: 2200,
  isTeachingPlaceholder: true,
  description:
    'Fictional teaching component. Cp = 2.2 kJ/(kg·K) is a teaching parameter only.',
}

export const TEACHING_BINARY_FLUID = createPropertyPackage({
  id: TEACHING_BINARY_FLUID_ID,
  displayName: 'Teaching Binary Fluid v1',
  version: '1.0.0',
  isTeaching: true,
  disclaimer:
    'Fictional teaching components only. Values are simplified teaching parameters and must not be interpreted as real chemical or thermodynamic data.',
  components: [TEACHING_COMPONENT_A, TEACHING_COMPONENT_B],
})

export interface TeachingBinaryStateInput {
  massFlowKgS: number
  temperatureK: number
  pressurePa: number
  massFractionA: number
}

/**
 * Construct a binary teaching stream state.
 *
 * The helper intentionally does not clamp invalid inputs. Validation belongs
 * to `validateMaterialState` so callers receive explicit diagnostics instead
 * of silently corrected numbers.
 */
export function createTeachingBinaryMaterialState(
  input: TeachingBinaryStateInput,
): MaterialState {
  const massFractionA = input.massFractionA
  const massFractionB = 1 - massFractionA

  return {
    massFlowKgS: input.massFlowKgS,
    temperatureK: input.temperatureK,
    pressurePa: input.pressurePa,
    phase: 'liquid',
    components: [
      {
        componentId: TEACHING_COMPONENT_A_ID,
        massFlowKgS: input.massFlowKgS * massFractionA,
      },
      {
        componentId: TEACHING_COMPONENT_B_ID,
        massFlowKgS: input.massFlowKgS * massFractionB,
      },
    ],
  }
}
