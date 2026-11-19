import { useState } from 'react'
import type { DragEvent } from 'react'
import { GripVertical, Plus, Search, SearchX } from 'lucide-react'
import {
  EQUIPMENT_DRAG_MIME,
  PALETTE_EQUIPMENT,
} from '../../data/equipment'
import type { EquipmentDefinition, EquipmentKind } from '../../types/process'
import { EquipmentGlyph } from './EquipmentGlyph'
import './EquipmentPalette.css'

interface EquipmentPaletteProps {
  onAdd: (kind: EquipmentKind) => void
}

function PaletteItem({
  definition,
  onAdd,
}: {
  definition: EquipmentDefinition
  onAdd: (kind: EquipmentKind) => void
}) {
  const unsupported = definition.calculationSupport === 'unsupported'
  const supportLabel = unsupported ? '未支持 · 仅占位' : 'Engine 已支持'

  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData(EQUIPMENT_DRAG_MIME, definition.kind)
    event.dataTransfer.setData('text/plain', definition.kind)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <button
      type="button"
      className={`palette-item${unsupported ? ' is-unsupported' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onClick={() => onAdd(definition.kind)}
      title={`${definition.name} · ${supportLabel} · ${definition.description}`}
      aria-label={`${definition.name}，${supportLabel}，${definition.description}`}
    >
      <span className="palette-item__glyph">
        <EquipmentGlyph kind={definition.kind} />
      </span>
      <span className="palette-item__copy">
        <span className="palette-item__name">
          {definition.name}
          <span>{definition.cnName}</span>
          {unsupported && (
            <em className="palette-item__status">未支持</em>
          )}
        </span>
        <span className="palette-item__desc">{definition.description}</span>
      </span>
      <span className="palette-item__add" aria-hidden="true">
        <Plus size={12} strokeWidth={2.2} />
      </span>
    </button>
  )
}

export function EquipmentPalette({ onAdd }: EquipmentPaletteProps) {
  const [query, setQuery] = useState('')

  const normalized = query.trim().toLowerCase()
  const visibleDefinitions = normalized
    ? PALETTE_EQUIPMENT.filter((definition) =>
        [
          definition.name,
          definition.cnName,
          definition.description,
          definition.tagPrefix,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      )
    : PALETTE_EQUIPMENT

  const streamDefinitions = visibleDefinitions.filter(
    (definition) => definition.category === 'stream',
  )
  const unitDefinitions = visibleDefinitions.filter(
    (definition) => definition.category === 'unit',
  )

  return (
    <aside className="equipment-palette" aria-label="设备库">
      <div className="palette-head">
        <div>
          <h2>设备库</h2>
          <p>EQUIPMENT PALETTE</p>
        </div>
        <span className="palette-head__count">
          {String(PALETTE_EQUIPMENT.length).padStart(2, '0')}
        </span>
      </div>

      <label className="palette-search">
        <Search size={14} strokeWidth={1.8} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索设备 / 位号"
          aria-label="搜索设备"
        />
        {query && (
          <button
            type="button"
            className="palette-search__clear"
            onClick={() => setQuery('')}
            aria-label="清除搜索"
          >
            ×
          </button>
        )}
      </label>

      <div className="palette-scroll">
        {visibleDefinitions.length === 0 && (
          <div className="palette-empty">
            <SearchX size={20} strokeWidth={1.5} aria-hidden="true" />
            <span>未找到匹配设备</span>
            <small>尝试搜索 Mixer、泵 或 HX</small>
          </div>
        )}

        {streamDefinitions.length > 0 && (
          <section className="palette-group">
            <div className="palette-group__title">
              <span>物流</span>
              <span className="palette-group__en">STREAMS</span>
              <span className="palette-group__rule" />
            </div>
            {streamDefinitions.map((definition) => (
              <PaletteItem
                key={definition.kind}
                definition={definition}
                onAdd={onAdd}
              />
            ))}
          </section>
        )}

        {unitDefinitions.length > 0 && (
          <section className="palette-group">
            <div className="palette-group__title">
              <span>单元操作</span>
              <span className="palette-group__en">UNIT OPERATIONS</span>
              <span className="palette-group__rule" />
            </div>
            {unitDefinitions.map((definition) => (
              <PaletteItem
                key={definition.kind}
                definition={definition}
                onAdd={onAdd}
              />
            ))}
          </section>
        )}
      </div>

      <div className="palette-foot">
        <GripVertical size={13} strokeWidth={1.7} aria-hidden="true" />
        <span>
          拖拽设备至画布
          <em>未支持设备仅作占位</em>
        </span>
      </div>
    </aside>
  )
}
