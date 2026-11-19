import type { Diagnostic, DiagnosticScope } from '../domain/diagnostics'
import type { CalculationTrace } from '../domain/result'
import type { MaterialState } from '../domain/stream'
import type { PropertyPackage } from '../properties/propertyPackage'

export interface OperationContext {
  nodeId: string
  tag: string
  propertyPackage: PropertyPackage
}

export interface UnitCalculationResult {
  outlet: MaterialState | null
  dutyW: number | null
  diagnostics: Diagnostic[]
  trace: CalculationTrace[]
}

export function nodeScope(context: OperationContext): DiagnosticScope {
  return { type: 'node', nodeId: context.nodeId }
}

export function createOperationTrace(
  step: string,
  method: string,
  formula: string,
  inputs: CalculationTrace['inputs'],
  outputs: CalculationTrace['outputs'],
  assumptions: string[] = [],
): CalculationTrace {
  return { step, method, formula, inputs, outputs, assumptions }
}

export const SINGLE_PHASE_ASSUMPTIONS = [
  'steady state',
  'single liquid phase',
  'constant component Cp',
  'no reaction',
  'no phase change',
] as const
