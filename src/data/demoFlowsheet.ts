import type { ProcessEdge, ProcessNode } from '../types/process'

export const PROJECT_NAME = '混合与加热实验'
export const PROJECT_CODE = 'PFD-001'

export function createDemoFlowsheet(): {
  nodes: ProcessNode[]
  edges: ProcessEdge[]
} {
  const nodes: ProcessNode[] = [
    {
      id: 'feed-a',
      type: 'stream',
      position: { x: 0, y: 10 },
      data: {
        kind: 'stream',
        label: 'Feed A',
        cnLabel: '进料 A',
        tag: 'F-101',
        role: 'feed',
        params: {
          flow: 6,
          temperature: 25,
          pressure: 2.8,
          compositionA: 95,
        },
      },
    },
    {
      id: 'feed-b',
      type: 'stream',
      position: { x: 0, y: 190 },
      data: {
        kind: 'stream',
        label: 'Feed B',
        cnLabel: '进料 B',
        tag: 'F-102',
        role: 'feed',
        params: {
          flow: 6,
          temperature: 65,
          pressure: 2.6,
          compositionA: 15,
        },
      },
    },
    {
      id: 'mixer-101',
      type: 'mixer',
      position: { x: 260, y: 100 },
      data: {
        kind: 'mixer',
        label: 'Mixer',
        cnLabel: '混合器',
        tag: 'MX-101',
        params: {
          outletTemperature: 45,
          pressure: 2.5,
        },
      },
    },
    {
      id: 'heater-101',
      type: 'heater',
      position: { x: 520, y: 100 },
      data: {
        kind: 'heater',
        label: 'Heater',
        cnLabel: '加热器',
        tag: 'HX-101',
        params: {
          targetTemperature: 85,
          pressure: 2.4,
        },
      },
    },
    {
      id: 'product-101',
      type: 'stream',
      position: { x: 780, y: 100 },
      data: {
        kind: 'stream',
        label: 'Product',
        cnLabel: '产品',
        tag: 'PR-101',
        role: 'product',
        params: {
          flow: 12,
          temperature: 85,
          pressure: 2.4,
          compositionA: 55,
        },
      },
    },
  ]

  const edges: ProcessEdge[] = [
    {
      id: 'edge-feed-a-mixer',
      type: 'process',
      source: 'feed-a',
      target: 'mixer-101',
      data: {
        tag: 'S-101',
        name: 'Feed A → Mixer',
      },
    },
    {
      id: 'edge-feed-b-mixer',
      type: 'process',
      source: 'feed-b',
      target: 'mixer-101',
      data: {
        tag: 'S-102',
        name: 'Feed B → Mixer',
      },
    },
    {
      id: 'edge-mixer-heater',
      type: 'process',
      source: 'mixer-101',
      target: 'heater-101',
      data: {
        tag: 'S-103',
        name: 'Mixed feed',
      },
    },
    {
      id: 'edge-heater-product',
      type: 'process',
      source: 'heater-101',
      target: 'product-101',
      data: {
        tag: 'S-104',
        name: 'Heated product',
      },
    },
  ]

  return { nodes, edges }
}
