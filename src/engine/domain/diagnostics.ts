export type DiagnosticSeverity = 'error' | 'warning' | 'info'

export type DiagnosticCode =
  | 'E_EMPTY_FLOWSHEET'
  | 'E_INVALID_GRAPH'
  | 'E_DUPLICATE_NODE_ID'
  | 'E_DUPLICATE_EDGE_ID'
  | 'E_MISSING_ENDPOINT'
  | 'E_GRAPH_CYCLE'
  | 'E_INVALID_PORT_CARDINALITY'
  | 'E_MISSING_INLET'
  | 'E_MISSING_OUTLET'
  | 'E_EXTRA_INLETS'
  | 'E_MULTIPLE_OUTLETS'
  | 'E_UNSUPPORTED_EQUIPMENT'
  | 'E_MISSING_PARAMETER'
  | 'E_INVALID_PARAMETER'
  | 'E_TARGET_DIRECTION'
  | 'E_NON_FINITE_VALUE'
  | 'E_NON_FINITE_RESULT'
  | 'E_NEGATIVE_MASS_FLOW'
  | 'E_ZERO_FLOW'
  | 'E_INVALID_PRESSURE'
  | 'E_INVALID_TEMPERATURE'
  | 'E_INVALID_COMPOSITION'
  | 'E_UNKNOWN_COMPONENT'
  | 'E_DUPLICATE_COMPONENT'
  | 'E_MISSING_PROPERTY'
  | 'E_UNSUPPORTED_PHASE'
  | 'E_BLOCKED_BY_UPSTREAM'
  | 'E_ADAPTER_INPUT'
  | 'W_PHASE_ASSUMPTION'

export type DiagnosticScope =
  | { type: 'flowsheet' }
  | { type: 'node'; nodeId: string }
  | { type: 'edge'; edgeId: string }
  | { type: 'stream'; streamId: string }
  | { type: 'parameter'; nodeId?: string; key: string }

export interface Diagnostic {
  code: DiagnosticCode
  severity: DiagnosticSeverity
  scope: DiagnosticScope
  message: string
  hint?: string
  details?: Record<string, unknown>
}

export function createDiagnostic(
  code: DiagnosticCode,
  severity: DiagnosticSeverity,
  scope: DiagnosticScope,
  message: string,
  hint?: string,
  details?: Record<string, unknown>,
): Diagnostic {
  return {
    code,
    severity,
    scope,
    message,
    ...(hint ? { hint } : {}),
    ...(details ? { details } : {}),
  }
}

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error')
}
