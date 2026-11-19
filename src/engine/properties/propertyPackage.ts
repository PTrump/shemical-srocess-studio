import type { ComponentId, ComponentProperty } from './component'
import type { ComponentMassFlow } from '../domain/stream'

export interface PropertyPackage {
  id: string
  displayName: string
  version: string
  isTeaching: boolean
  disclaimer: string
  components: readonly ComponentProperty[]
  getComponent: (componentId: ComponentId) => ComponentProperty | undefined
}

export interface CreatePropertyPackageInput {
  id: string
  displayName: string
  version: string
  isTeaching: boolean
  disclaimer: string
  components: readonly ComponentProperty[]
}

export function createPropertyPackage(
  input: CreatePropertyPackageInput,
): PropertyPackage {
  const byId = new Map<ComponentId, ComponentProperty>()
  for (const component of input.components) {
    if (byId.has(component.id)) {
      throw new Error(`Duplicate component id in property package: ${component.id}`)
    }
    byId.set(component.id, component)
  }

  return {
    ...input,
    components: input.components.slice(),
    getComponent: (componentId) => byId.get(componentId),
  }
}

/**
 * Mass-weighted mixture Cp for constant-Cp components.
 *
 * Returns null when a component is unknown or has an invalid Cp; callers must
 * turn that into a diagnostic rather than silently substituting a default.
 */
export function getMixtureCp(
  components: readonly ComponentMassFlow[],
  propertyPackage: PropertyPackage,
): number | null {
  let totalMassFlow = 0
  let cpMassFlow = 0

  for (const component of components) {
    const property = propertyPackage.getComponent(component.componentId)
    if (!property) {
      return null
    }
    if (
      !Number.isFinite(property.cpJPerKgK) ||
      property.cpJPerKgK <= 0
    ) {
      return null
    }
    if (!Number.isFinite(component.massFlowKgS) || component.massFlowKgS < 0) {
      return null
    }

    totalMassFlow += component.massFlowKgS
    cpMassFlow += component.massFlowKgS * property.cpJPerKgK
  }

  if (totalMassFlow <= 0 || !Number.isFinite(cpMassFlow)) {
    return null
  }

  return cpMassFlow / totalMassFlow
}
