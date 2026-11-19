import type { MaterialState } from './stream'

export type DomainEquipmentKind =
  | 'stream'
  | 'mixer'
  | 'heater'
  | 'cooler'
  | 'flash'
  | 'separator'
  | 'pump'

export type StreamRole = 'feed' | 'product' | 'intermediate'

export interface DomainNodeBase {
  id: string
  tag: string
}

export interface FeedStreamNode extends DomainNodeBase {
  kind: 'stream'
  role: 'feed'
  /** Initial boundary state, expressed in engine units. */
  state: MaterialState
}

export interface ProductStreamNode extends DomainNodeBase {
  kind: 'stream'
  role: 'product'
}

export interface IntermediateStreamNode extends DomainNodeBase {
  kind: 'stream'
  role: 'intermediate'
}

export interface MixerNode extends DomainNodeBase {
  kind: 'mixer'
}

export interface HeaterNode extends DomainNodeBase {
  kind: 'heater'
  /** Target outlet temperature in K. */
  targetTemperatureK: number
}

export interface CoolerNode extends DomainNodeBase {
  kind: 'cooler'
  /** Target outlet temperature in K. */
  targetTemperatureK: number
}

export interface UnsupportedEquipmentNode extends DomainNodeBase {
  kind: 'flash' | 'separator' | 'pump'
}

export type DomainNode =
  | FeedStreamNode
  | ProductStreamNode
  | IntermediateStreamNode
  | MixerNode
  | HeaterNode
  | CoolerNode
  | UnsupportedEquipmentNode

export function isUnsupportedEquipmentKind(
  kind: DomainEquipmentKind,
): kind is 'flash' | 'separator' | 'pump' {
  return kind === 'flash' || kind === 'separator' || kind === 'pump'
}

export function getNodeKind(node: DomainNode): DomainEquipmentKind {
  return node.kind
}
