import type { EngineRunOutcome } from './types'

export interface RunSession {
  current: EngineRunOutcome | null
  lastCompleted: EngineRunOutcome | null
  previousCompleted: EngineRunOutcome | null
}

export function createRunSession(): RunSession {
  return {
    current: null,
    lastCompleted: null,
    previousCompleted: null,
  }
}

/**
 * Record one completed Engine run.
 *
 * Failed runs remain the current run (so the UI can show the failure), but
 * they do not replace the last completed successful/partial run. This keeps
 * historical results available without presenting them as the current run.
 */
export function recordRunOutcome(
  session: RunSession,
  outcome: EngineRunOutcome,
): RunSession {
  if (outcome.view.status === 'failed') {
    return {
      ...session,
      current: outcome,
    }
  }

  return {
    current: outcome,
    previousCompleted: session.lastCompleted,
    lastCompleted: outcome,
  }
}

export function isOutcomeStale(
  outcome: EngineRunOutcome | null,
  currentRevision: number,
): boolean {
  return outcome !== null && outcome.revision !== currentRevision
}
