import {
  ChevronDown,
  Loader2,
  Play,
  Redo2,
  Save,
  Undo2,
} from 'lucide-react'
import { PROJECT_CODE, PROJECT_NAME } from '../../data/demoFlowsheet'
import { formatShortDateTime } from '../../utils/format'
import './TopBar.css'

interface TopBarProps {
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
  savedAt: string | null
  isRunning: boolean
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onRun: () => void
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 30 30" fill="none">
        <path
          d="M8 9.5h6.5v6H22v5.5"
          stroke="#5eead4"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 21.5h4.5v-6"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8" cy="9.5" r="2.2" fill="#ffffff" />
        <circle cx="8" cy="21.5" r="1.8" fill="rgba(255,255,255,0.62)" />
        <circle cx="22" cy="21" r="2.2" fill="#5eead4" />
        <rect
          x="12.4"
          y="13.2"
          width="5.2"
          height="4.6"
          rx="1"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  )
}

export function TopBar({
  canUndo,
  canRedo,
  isDirty,
  savedAt,
  isRunning,
  onUndo,
  onRedo,
  onSave,
  onRun,
}: TopBarProps) {
  const saveLabel = isDirty
    ? '有未保存更改'
    : savedAt
      ? `已保存 ${formatShortDateTime(savedAt)}`
      : '尚未保存'

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <BrandMark />
        <div className="brand-copy">
          <span className="brand-name">Chemical Process Studio</span>
          <span className="brand-sub">PROCESS SIMULATION WORKBENCH</span>
        </div>
      </div>

      <div className="topbar__divider" aria-hidden="true" />

      <div className="project-context">
        <span className="project-context__eyebrow">
          当前项目 <span>·</span> {PROJECT_CODE}
        </span>
        <div className="project-context__row">
          <span className="project-dot" aria-hidden="true" />
          <strong>{PROJECT_NAME}</strong>
          <span className="project-context__role">教学流程</span>
        </div>
      </div>

      <div className="topbar__spacer" />

      <span
        className={`save-status${isDirty ? ' is-dirty' : ''}`}
        title={saveLabel}
      >
        <span className="save-status__dot" aria-hidden="true" />
        <span className="save-status__text">{saveLabel}</span>
      </span>

      <div className="topbar__actions">
        <div className="history-group" role="group" aria-label="历史操作">
          <button
            type="button"
            className="icon-button"
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
            aria-label="撤销"
          >
            <Undo2 size={16} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onRedo}
            disabled={!canRedo}
            title="重做 (Ctrl+Shift+Z)"
            aria-label="重做"
          >
            <Redo2 size={16} strokeWidth={1.8} />
          </button>
        </div>

        <button
          type="button"
          className="btn btn--secondary topbar__save"
          onClick={onSave}
          title="保存流程到浏览器本地 (Ctrl+S)"
        >
          <Save size={15} strokeWidth={1.8} />
          <span>保存</span>
          {isDirty && <span className="save-pip" aria-hidden="true" />}
        </button>

        <span
          className="demo-badge"
          title="教学演示环境：结果为简化模型生成的模拟数据"
        >
          <span className="demo-badge__dot" aria-hidden="true" />
          DEMO
        </span>

        <button
          type="button"
          className="btn btn--run"
          onClick={onRun}
          disabled={isRunning}
          title="运行前端演示计算"
        >
          {isRunning ? (
            <Loader2
              size={15}
              strokeWidth={2}
              className="spin"
              aria-hidden="true"
            />
          ) : (
            <Play size={14} strokeWidth={2} fill="currentColor" />
          )}
          <span>{isRunning ? '求解中…' : '运行仿真'}</span>
        </button>

        <div className="topbar__divider topbar__divider--short" aria-hidden="true" />

        <button
          type="button"
          className="user-chip"
          title="教学账户 · DEMO"
          aria-label="账户"
        >
          <span className="user-avatar">ST</span>
          <span className="user-meta">
            <strong>Student</strong>
            <span>本科实验</span>
          </span>
          <ChevronDown
            size={13}
            strokeWidth={1.8}
            className="user-chevron"
            aria-hidden="true"
          />
        </button>
      </div>
    </header>
  )
}
