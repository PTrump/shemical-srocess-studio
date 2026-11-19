import { describe, expect, it } from 'vitest'
import { createDemoFlowsheet } from '../../data/demoFlowsheet'
import type { ProcessNode } from '../../types/process'
import { runEngineSimulation } from '../engineSimulation'
import {
  createRunSession,
  isOutcomeStale,
  recordRunOutcome,
} from '../runSession'
import type { EngineRunOutcome } from '../types'

function outcomeForFlow(
  flowTph: number,
  revision: number,
  runId: string,
): EngineRunOutcome {
  const { nodes, edges } = createDemoFlowsheet()
  const adjustedNodes: ProcessNode[] = nodes.map((node) =>
    node.id === 'feed-a'
      ? {
          ...node,
          data: {
            ...node.data,
            params: { ...node.data.params, flow: flowTph },
          },
        }
      : node,
  )
  const view = runEngineSimulation(adjustedNodes, edges, {
    runId,
    calculatedAt: '2026-11-19T00:00:00.000Z',
  })
  return { view, revision, ranAt: Date.parse(view.executedAt ?? '') }
}

describe('run session state', () => {
  it('starts with no current or historical result', () => {
    const session = createRunSession()
    expect(session.current).toBeNull()
    expect(session.lastCompleted).toBeNull()
    expect(session.previousCompleted).toBeNull()
  })

  it('marks a successful run stale when the flow revision changes', () => {
    const session = recordRunOutcome(
      createRunSession(),
      outcomeForFlow(6, 4, 'run-1'),
    )
    expect(isOutcomeStale(session.current, 4)).toBe(false)
    expect(isOutcomeStale(session.current, 5)).toBe(true)
    expect(isOutcomeStale(null, 5)).toBe(false)
  })

  it('keeps two completed runs for comparison and clears stale on a new run', () => {
    let session = createRunSession()
    session = recordRunOutcome(session, outcomeForFlow(6, 1, 'run-1'))
    expect(session.previousCompleted).toBeNull()
    expect(session.lastCompleted?.view.runId).toBe('run-1')

    session = recordRunOutcome(session, outcomeForFlow(8, 2, 'run-2'))
    expect(session.current?.view.runId).toBe('run-2')
    expect(session.lastCompleted?.view.runId).toBe('run-2')
    expect(session.previousCompleted?.view.runId).toBe('run-1')
    expect(isOutcomeStale(session.current, 2)).toBe(false)
    expect(isOutcomeStale(session.current, 3)).toBe(true)
  })

  it('keeps the last completed result when a later run fails', () => {
    let session = createRunSession()
    session = recordRunOutcome(session, outcomeForFlow(6, 1, 'run-1'))
    session = recordRunOutcome(session, outcomeForFlow(8, 2, 'run-2'))

    const failedView = runEngineSimulation(
      createDemoFlowsheet().nodes,
      [],
      {
        runId: 'run-failed',
        calculatedAt: '2026-11-19T00:00:00.000Z',
      },
    )
    const failedOutcome: EngineRunOutcome = {
      view: failedView,
      revision: 2,
      ranAt: Date.parse('2026-11-19T00:00:00.000Z'),
    }

    session = recordRunOutcome(session, failedOutcome)

    expect(session.current?.view.runId).toBe('run-failed')
    expect(session.current?.view.status).toBe('failed')
    expect(session.lastCompleted?.view.runId).toBe('run-2')
    expect(session.previousCompleted?.view.runId).toBe('run-1')
  })

  it('after a failed run, the next success becomes current and shifts history', () => {
    let session = createRunSession()
    session = recordRunOutcome(session, outcomeForFlow(6, 1, 'run-1'))
    session = recordRunOutcome(session, outcomeForFlow(8, 2, 'run-2'))
    session = recordRunOutcome(session, {
      view: runEngineSimulation(createDemoFlowsheet().nodes, [], {
        runId: 'run-failed',
        calculatedAt: '2026-11-19T00:00:00.000Z',
      }),
      revision: 2,
      ranAt: Date.parse('2026-11-19T00:00:00.000Z'),
    })
    session = recordRunOutcome(session, outcomeForFlow(10, 3, 'run-3'))

    expect(session.current?.view.runId).toBe('run-3')
    expect(session.lastCompleted?.view.runId).toBe('run-3')
    expect(session.previousCompleted?.view.runId).toBe('run-2')
    expect(isOutcomeStale(session.current, 3)).toBe(false)
  })
})
