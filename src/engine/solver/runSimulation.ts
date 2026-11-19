import type { Diagnostic } from '../domain/diagnostics'
import { createDiagnostic, hasErrors } from '../domain/diagnostics'
import type { DomainFlowsheet } from '../domain/flowsheet'
import type {
  CalculationStatus,
  EngineBalances,
  EngineResult,
  EquipmentRun,
  StreamRun,
} from '../domain/result'
import type { MaterialState } from '../domain/stream'
import { TEACHING_BINARY_FLUID } from '../properties/teachingBinaryFluid'
import type { PropertyPackage } from '../properties/propertyPackage'
import { buildGraph } from './graphBuilder'
import { solveGraph } from './topologicalSolver'

export const ENGINE_MODEL_VERSION = 'p2.2.0'
export const ENGINE_RUN_ID_DEFAULT = 'p2.2-local-run'

export interface RunSimulationOptions {
  propertyPackage?: PropertyPackage
  runId?: string
  calculatedAt?: string
}

function diagnosticKey(diagnostic: Diagnostic): string {
  return JSON.stringify([
    diagnostic.code,
    diagnostic.severity,
    diagnostic.scope,
    diagnostic.message,
  ])
}

function dedupeDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>()
  const unique: Diagnostic[] = []
  for (const diagnostic of diagnostics) {
    const key = diagnosticKey(diagnostic)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(diagnostic)
    }
  }
  return unique
}

function sumComponents(
  states: readonly MaterialState[],
  propertyPackage: PropertyPackage,
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const component of propertyPackage.components) {
    totals.set(component.id, 0)
  }
  for (const state of states) {
    for (const component of state.components) {
      totals.set(
        component.componentId,
        (totals.get(component.componentId) ?? 0) + component.massFlowKgS,
      )
    }
  }
  return totals
}

function calculateBalances(
  graph: ReturnType<typeof buildGraph>,
  equipment: Record<string, EquipmentRun>,
  streams: Record<string, StreamRun>,
  propertyPackage: PropertyPackage,
): EngineBalances {
  const feedStates: MaterialState[] = []
  const productStates: MaterialState[] = []

  for (const node of graph.nodes) {
    if (node.kind !== 'stream') {
      continue
    }
    const run = equipment[node.id]
    if (!run || run.status !== 'calculated') {
      continue
    }

    if (node.role === 'feed') {
      feedStates.push(node.state)
    } else if (node.role === 'product') {
      for (const edge of graph.incoming.get(node.id) ?? []) {
        const streamRun = streams[edge.id]
        if (
          streamRun?.status === 'calculated' &&
          streamRun.stream !== null
        ) {
          productStates.push(streamRun.stream)
        }
      }
    }
  }

  const feedTotals = sumComponents(feedStates, propertyPackage)
  const productTotals = sumComponents(productStates, propertyPackage)
  const totalFeedKgS = feedStates.reduce(
    (total, state) => total + state.massFlowKgS,
    0,
  )
  const totalProductKgS = productStates.reduce(
    (total, state) => total + state.massFlowKgS,
    0,
  )
  const hasProductStream = productStates.length > 0
  const closurePercent =
    totalFeedKgS > 0 && hasProductStream
      ? (totalProductKgS / totalFeedKgS) * 100
      : null

  const components = propertyPackage.components.map((component) => {
    const feedKgS = feedTotals.get(component.id) ?? 0
    const productKgS = productTotals.get(component.id) ?? 0
    return {
      componentId: component.id,
      feedKgS,
      productKgS,
      differenceKgS: feedKgS - productKgS,
    }
  })

  const balances = {
    status: 'calculated' as const,
    totalFeedKgS,
    totalProductKgS,
    closurePercent,
    components,
  }

  const numericValues: number[] = [
    totalFeedKgS,
    totalProductKgS,
    ...(closurePercent === null ? [] : [closurePercent]),
    ...components.flatMap((component) => [
      component.feedKgS,
      component.productKgS,
      component.differenceKgS,
    ]),
  ]

  if (!numericValues.every((value) => Number.isFinite(value))) {
    return {
      status: 'unavailable',
      totalFeedKgS: null,
      totalProductKgS: null,
      closurePercent: null,
      components: [],
    }
  }

  return balances
}

function calculateStatus(
  diagnostics: readonly Diagnostic[],
  streams: Record<string, StreamRun>,
  equipment: Record<string, EquipmentRun>,
): CalculationStatus {
  const hasCalculatedStream = Object.values(streams).some(
    (run) => run.status === 'calculated' && run.stream !== null,
  )
  const hasCalculatedEquipment = Object.values(equipment).some(
    (run) => run.status === 'calculated',
  )
  const hasResult = hasCalculatedStream || hasCalculatedEquipment

  if (hasErrors(diagnostics)) {
    return hasResult ? 'partial' : 'failed'
  }

  return hasResult ? 'success' : 'failed'
}

/**
 * Run the P2.2 engine on a domain flowsheet.
 *
 * This function is independent from React, @xyflow/react, the DOM, browser
 * storage and the legacy demo simulation.
 */
export function runSimulation(
  flowsheet: DomainFlowsheet,
  options: RunSimulationOptions = {},
): EngineResult {
  const propertyPackage =
    options.propertyPackage ?? TEACHING_BINARY_FLUID
  const runId = options.runId ?? ENGINE_RUN_ID_DEFAULT
  const calculatedAt = options.calculatedAt ?? new Date().toISOString()
  const graph = buildGraph(flowsheet)
  const solved = solveGraph(graph, propertyPackage, {
    runId,
    modelVersion: ENGINE_MODEL_VERSION,
  })
  const balances = calculateBalances(
    graph,
    solved.equipment,
    solved.streams,
    propertyPackage,
  )
  const balanceDiagnostics =
    balances.status === 'unavailable'
      ? [
          createDiagnostic(
            'E_NON_FINITE_RESULT',
            'error',
            { type: 'flowsheet' },
            'Aggregate mass balance could not be represented with finite numbers.',
            'The individual streams are finite, but their aggregate totals overflowed. No clamped totals were returned.',
          ),
        ]
      : []

  const allDiagnostics = dedupeDiagnostics([
    ...balanceDiagnostics,
    ...graph.graphDiagnostics,
    ...Array.from(graph.structuralDiagnostics.values()).flat(),
    ...solved.diagnostics,
    ...Object.values(solved.equipment).flatMap(
      (run) => run.diagnostics,
    ),
    ...Object.values(solved.streams).flatMap(
      (run) => run.diagnostics,
    ),
  ])

  return {
    status: calculateStatus(
      allDiagnostics,
      solved.streams,
      solved.equipment,
    ),
    run: {
      runId,
      calculatedAt,
      modelVersion: ENGINE_MODEL_VERSION,
      propertyPackageId: propertyPackage.id,
    },
    streams: solved.streams,
    equipment: solved.equipment,
    diagnostics: allDiagnostics,
    balances,
  }
}
