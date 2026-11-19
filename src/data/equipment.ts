import type {
  EquipmentDefinition,
  EquipmentKind,
  StreamRole,
} from '../types/process'

export const EQUIPMENT_DEFINITIONS: Record<EquipmentKind, EquipmentDefinition> = {
  stream: {
    kind: 'stream',
    name: 'Streams',
    cnName: '物流',
    description: '定义进料或产品物流工况',
    category: 'stream',
    tagPrefix: 'F',
    defaultParams: {
      flow: 6,
      temperature: 25,
      pressure: 2.5,
      compositionA: 80,
    },
  },
  mixer: {
    kind: 'mixer',
    name: 'Mixer',
    cnName: '混合器',
    description: '多股物流汇合与均匀混合',
    category: 'unit',
    tagPrefix: 'MX',
    defaultParams: {
      outletTemperature: 45,
      pressure: 2.5,
    },
  },
  heater: {
    kind: 'heater',
    name: 'Heater',
    cnName: '加热器',
    description: '壳管式换热器，提升物流温度',
    category: 'unit',
    tagPrefix: 'HX',
    defaultParams: {
      targetTemperature: 85,
      pressure: 2.4,
    },
  },
  cooler: {
    kind: 'cooler',
    name: 'Cooler',
    cnName: '冷却器',
    description: '循环水冷却，降低物流温度',
    category: 'unit',
    tagPrefix: 'CL',
    defaultParams: {
      targetTemperature: 40,
      pressure: 2.4,
    },
  },
  flash: {
    kind: 'flash',
    name: 'Flash Drum',
    cnName: '闪蒸罐',
    description: '气液闪蒸与相平衡分离',
    category: 'unit',
    tagPrefix: 'V',
    defaultParams: {
      temperature: 60,
      pressure: 1.2,
      vaporFraction: 18,
    },
  },
  separator: {
    kind: 'separator',
    name: 'Separator',
    cnName: '分离器',
    description: '重力沉降两相分离设备',
    category: 'unit',
    tagPrefix: 'SEP',
    defaultParams: {
      temperature: 50,
      pressure: 1.5,
      splitRatio: 55,
    },
  },
  pump: {
    kind: 'pump',
    name: 'Pump',
    cnName: '离心泵',
    description: '提高物流压力，估算轴功率',
    category: 'unit',
    tagPrefix: 'P',
    defaultParams: {
      outletPressure: 4,
      efficiency: 70,
    },
  },
}

export const PALETTE_EQUIPMENT: EquipmentDefinition[] = [
  EQUIPMENT_DEFINITIONS.stream,
  EQUIPMENT_DEFINITIONS.mixer,
  EQUIPMENT_DEFINITIONS.heater,
  EQUIPMENT_DEFINITIONS.cooler,
  EQUIPMENT_DEFINITIONS.flash,
  EQUIPMENT_DEFINITIONS.separator,
  EQUIPMENT_DEFINITIONS.pump,
]

export const EQUIPMENT_DRAG_MIME =
  'application/x-chemical-process-studio-equipment'

export const EQUIPMENT_KINDS: EquipmentKind[] = [
  'stream',
  'mixer',
  'heater',
  'cooler',
  'flash',
  'separator',
  'pump',
]

export const KIND_META: Record<
  EquipmentKind,
  { name: string; cnName: string; code: string }
> = {
  stream: { name: 'Streams', cnName: '物流', code: 'STR' },
  mixer: { name: 'Mixer', cnName: '混合器', code: 'MIX' },
  heater: { name: 'Heater', cnName: '加热器', code: 'HTR' },
  cooler: { name: 'Cooler', cnName: '冷却器', code: 'CLR' },
  flash: { name: 'Flash Drum', cnName: '闪蒸罐', code: 'FLS' },
  separator: { name: 'Separator', cnName: '分离器', code: 'SEP' },
  pump: { name: 'Pump', cnName: '离心泵', code: 'PMP' },
}

export const STREAM_ROLE_LABELS: Record<
  StreamRole,
  { label: string; en: string }
> = {
  feed: { label: '进料', en: 'Feed' },
  intermediate: { label: '中间物流', en: 'Intermediate' },
  product: { label: '产品', en: 'Product' },
}

export function isEquipmentKind(value: unknown): value is EquipmentKind {
  return (
    typeof value === 'string' &&
    (EQUIPMENT_KINDS as string[]).includes(value)
  )
}

export function isStreamRole(value: unknown): value is StreamRole {
  return value === 'feed' || value === 'product' || value === 'intermediate'
}
