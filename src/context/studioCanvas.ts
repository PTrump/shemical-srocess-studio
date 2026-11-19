import { createContext, useContext } from 'react'
import type { SimulationResult } from '../types/process'

export interface StudioCanvasContextValue {
  simulation: SimulationResult
  running: boolean
  selectedNodeId: string | null
  deleteNode: (id: string) => void
  deleteEdge: (id: string) => void
  selectEdge: (id: string) => void
}

export const StudioCanvasContext =
  createContext<StudioCanvasContextValue | null>(null)

export function useStudioCanvas(): StudioCanvasContextValue {
  const value = useContext(StudioCanvasContext)
  if (!value) {
    throw new Error('StudioCanvasContext is missing')
  }
  return value
}
