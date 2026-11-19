export type ComponentId = string

/**
 * Minimal teaching property record. No molecular weight, boiling point or
 * other real-fluid properties are invented in P2.2.
 */
export interface ComponentProperty {
  id: ComponentId
  displayName: string
  /** Constant liquid heat capacity, J/(kg·K). */
  cpJPerKgK: number
  /** True for the fictional teaching components. */
  isTeachingPlaceholder: boolean
  description?: string
}
