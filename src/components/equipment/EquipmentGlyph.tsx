import { useId } from 'react'
import type { EquipmentKind, StreamRole } from '../../types/process'

interface EquipmentGlyphProps {
  kind: EquipmentKind
  role?: StreamRole
  className?: string
  selected?: boolean
}

const OUTLINE = 'rgba(19, 39, 52, 0.74)'
const HIGHLIGHT = 'rgba(255, 255, 255, 0.4)'
const BOLT = 'rgba(24, 46, 60, 0.82)'

interface ArtProps {
  uid: string
}

function EquipmentDefs({ uid }: ArtProps) {
  return (
    <defs>
      <linearGradient id={`${uid}-shell-h`} x1="0.12" y1="0" x2="0.88" y2="1">
        <stop offset="0" stopColor="#edf5f9" />
        <stop offset="0.18" stopColor="#cbdde7" />
        <stop offset="0.48" stopColor="#97b1c1" />
        <stop offset="0.76" stopColor="#657f92" />
        <stop offset="1" stopColor="#40596b" />
      </linearGradient>
      <linearGradient id={`${uid}-shell-v`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#3d5669" />
        <stop offset="0.12" stopColor="#7993a5" />
        <stop offset="0.3" stopColor="#d9e7ef" />
        <stop offset="0.5" stopColor="#a9c0cf" />
        <stop offset="0.76" stopColor="#687f92" />
        <stop offset="1" stopColor="#3b5264" />
      </linearGradient>
      <linearGradient id={`${uid}-metal`} x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0" stopColor="#e7eff4" />
        <stop offset="0.24" stopColor="#c1d2dc" />
        <stop offset="0.54" stopColor="#91a9b8" />
        <stop offset="0.82" stopColor="#637c8e" />
        <stop offset="1" stopColor="#3f5668" />
      </linearGradient>
      <linearGradient id={`${uid}-dark-metal`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#71899a" />
        <stop offset="0.5" stopColor="#536d7f" />
        <stop offset="1" stopColor="#314657" />
      </linearGradient>
      <linearGradient id={`${uid}-glass`} x1="0.1" y1="0" x2="0.8" y2="1">
        <stop offset="0" stopColor="#dff6f8" stopOpacity="0.96" />
        <stop offset="0.5" stopColor="#9dd5db" stopOpacity="0.92" />
        <stop offset="1" stopColor="#4b9aa4" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id={`${uid}-liquid`} x1="0.1" y1="0" x2="0.8" y2="1">
        <stop offset="0" stopColor="#38c2b2" />
        <stop offset="0.45" stopColor="#0b9b8e" />
        <stop offset="1" stopColor="#065c55" />
      </linearGradient>
      <linearGradient id={`${uid}-liquid-blue`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#72cbe3" />
        <stop offset="0.5" stopColor="#2d7fa2" />
        <stop offset="1" stopColor="#124a65" />
      </linearGradient>
      <linearGradient id={`${uid}-hot`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#f2c375" />
        <stop offset="0.45" stopColor="#cd7633" />
        <stop offset="1" stopColor="#8b3e18" />
      </linearGradient>
      <linearGradient id={`${uid}-cold`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#c9edf8" />
        <stop offset="0.5" stopColor="#6bb4d2" />
        <stop offset="1" stopColor="#2a6f92" />
      </linearGradient>
      <linearGradient id={`${uid}-copper`} x1="0" y1="0" x2="1" y2="0.8">
        <stop offset="0" stopColor="#e2cba4" />
        <stop offset="0.42" stopColor="#ae8557" />
        <stop offset="1" stopColor="#66492c" />
      </linearGradient>
      <radialGradient id={`${uid}-ground`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#1a3548" stopOpacity="0.22" />
        <stop offset="0.62" stopColor="#1a3548" stopOpacity="0.08" />
        <stop offset="1" stopColor="#1a3548" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

function StreamArt({ uid, role = 'feed' }: ArtProps & { role?: StreamRole }) {
  const arrow =
    role === 'product'
      ? `url(#${uid}-cold)`
      : role === 'intermediate'
        ? `url(#${uid}-dark-metal)`
        : `url(#${uid}-hot)`

  return (
    <g>
      <ellipse cx="32" cy="55" rx="22" ry="3.5" fill={`url(#${uid}-ground)`} />
      <path
        d="M6 32.5h12"
        stroke={`url(#${uid}-metal)`}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect
        x="9"
        y="26"
        width="4"
        height="13"
        rx="1.4"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="13"
        y="29"
        width="29"
        height="7"
        rx="3.5"
        fill={`url(#${uid}-shell-h)`}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <path d="M16 31h22" stroke={HIGHLIGHT} strokeWidth="1.4" />
      <rect
        x="38"
        y="26"
        width="4"
        height="13"
        rx="1.4"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <circle cx="11" cy="29.5" r="0.7" fill={BOLT} />
      <circle cx="11" cy="35.5" r="0.7" fill={BOLT} />
      <circle cx="40" cy="29.5" r="0.7" fill={BOLT} />
      <circle cx="40" cy="35.5" r="0.7" fill={BOLT} />
      <path
        d="M27 29.5v-8"
        stroke={`url(#${uid}-dark-metal)`}
        strokeWidth="2"
      />
      <circle
        cx="27"
        cy="20.5"
        r="3.4"
        fill="none"
        stroke={`url(#${uid}-metal)`}
        strokeWidth="1.5"
      />
      <path
        d="M27 18.7v3.6M25.2 20.5h3.6"
        stroke={OUTLINE}
        strokeWidth="0.8"
      />
      <path
        d="M43 26.5h7v-5.5l9 11-9 11v-5.5h-7Z"
        fill={arrow}
        stroke={OUTLINE}
        strokeWidth="1.05"
      />
      <path d="M45 28.2h5.5" stroke={HIGHLIGHT} strokeWidth="0.9" />
      <path d="M21 39.2h17" stroke={OUTLINE} strokeWidth="0.8" opacity="0.35" />
    </g>
  )
}

function MixerArt({ uid, selected }: ArtProps & { selected?: boolean }) {
  const body =
    'M20 20.5H44V42C44 49.5 39.2 53.5 32 53.5C24.8 53.5 20 49.5 20 42Z'
  const window =
    'M26.2 28.4H37.8V42.4C37.8 45.4 35.4 47.6 32 47.6C28.6 47.6 26.2 45.4 26.2 42.4Z'

  return (
    <g>
      <ellipse cx="32" cy="57" rx="19" ry="3" fill={`url(#${uid}-ground)`} />

      <rect
        x="4"
        y="25.5"
        width="16"
        height="4.4"
        rx="1.6"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="15.2"
        y="23"
        width="3.8"
        height="9.4"
        rx="1.2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="4"
        y="35"
        width="16"
        height="4.4"
        rx="1.6"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="15.2"
        y="32.5"
        width="3.8"
        height="9.4"
        rx="1.2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="44"
        y="43.2"
        width="15"
        height="4.4"
        rx="1.6"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="44"
        y="40.7"
        width="3.8"
        height="9.4"
        rx="1.2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />

      <path
        d={body}
        fill={`url(#${uid}-shell-v)`}
        stroke={OUTLINE}
        strokeWidth="1.1"
      />
      <path
        d="M39.5 23.5c2.5 2.2 3.4 5.2 3.4 9.5v8.5c0 4.5-2.5 7.5-5.7 10"
        fill="none"
        stroke="rgba(29, 55, 73, 0.16)"
        strokeWidth="2.6"
      />
      <path
        d="M22.5 24.5v13.8"
        fill="none"
        stroke={HIGHLIGHT}
        strokeWidth="1.6"
      />

      <ellipse
        cx="32"
        cy="20.5"
        rx="12.1"
        ry="3.7"
        fill={`url(#${uid}-shell-h)`}
        stroke={OUTLINE}
        strokeWidth="1.1"
      />
      <ellipse
        cx="32"
        cy="19.6"
        rx="9.8"
        ry="2.4"
        fill="#d5e5ee"
        opacity="0.8"
      />
      <circle cx="23" cy="19.5" r="0.7" fill={BOLT} />
      <circle cx="41" cy="19.5" r="0.7" fill={BOLT} />
      <circle cx="32" cy="17.3" r="0.7" fill={BOLT} />

      <rect
        x="27"
        y="6.2"
        width="10"
        height="9.7"
        rx="2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <rect
        x="28.6"
        y="4"
        width="6.8"
        height="3"
        rx="1.1"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <path d="M28 8.2h4.2M28 10.2h4.2" stroke={HIGHLIGHT} strokeWidth="0.9" />
      <rect
        x="31"
        y="15"
        width="2.2"
        height="7.2"
        fill={`url(#${uid}-dark-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.7"
      />

      <path
        d={window}
        fill={`url(#${uid}-glass)`}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <defs>
        <clipPath id={`${uid}-mixer-window`}>
          <path d={window} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-mixer-window)`}>
        <rect
          x="26.2"
          y="35.4"
          width="11.6"
          height="13"
          fill={`url(#${uid}-liquid)`}
        />
        <path
          d="M26.2 35.4h11.6"
          stroke="#aef0e6"
          strokeWidth="1"
          opacity="0.85"
        />
        <path
          d="M27.5 39.2c1.6-.8 3.4-.8 4.8 0s3.1.8 4.4 0"
          fill="none"
          stroke="#86e4d8"
          strokeWidth="0.8"
          opacity="0.5"
        />
        <path
          d="M32 29v13M28.3 40.2c1.6-2 5.8-2 7.4 0"
          fill="none"
          stroke="#284a5d"
          strokeWidth="1.5"
          opacity="0.9"
        />
        <circle
          cx="32"
          cy="38.7"
          r="1.1"
          fill="#dff7f5"
          stroke="#284a5d"
          strokeWidth="0.7"
        />
        <path
          d="M27.5 30.6v4.6"
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="1.1"
        />
      </g>
      <path
        d="M20 32.8h2.2M41.8 32.8H44M20 42.8h2.2M41.8 42.8H44"
        stroke={OUTLINE}
        strokeWidth="0.9"
        opacity="0.5"
      />

      {selected && (
        <g className="equipment-artwork__selection">
          <path
            d={window}
            fill="none"
            stroke="#37c9b9"
            strokeWidth="1.15"
            opacity="0.9"
          />
          <path
            d="M32 29.2v13M28.3 40.2c1.6-2 5.8-2 7.4 0"
            fill="none"
            stroke="#8cf1e6"
            strokeWidth="1.1"
            opacity="0.95"
          />
          <circle
            cx="32"
            cy="38.7"
            r="1.9"
            fill="none"
            stroke="#5ee2d4"
            strokeWidth="0.8"
            opacity="0.65"
          />
        </g>
      )}

      <path
        d="M23 53.2h18l2.2 3.8H20.8Z"
        fill={`url(#${uid}-dark-metal)`}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <path d="M22 57h20" stroke={HIGHLIGHT} strokeWidth="0.9" />
      <circle cx="16.8" cy="25.6" r="0.6" fill={BOLT} />
      <circle cx="16.8" cy="30.2" r="0.6" fill={BOLT} />
      <circle cx="45.7" cy="43.4" r="0.6" fill={BOLT} />
      <circle cx="45.7" cy="47.9" r="0.6" fill={BOLT} />
    </g>
  )
}

function HeaterArt({ uid, selected }: ArtProps & { selected?: boolean }) {
  return (
    <g>
      <ellipse cx="32" cy="56.5" rx="22" ry="3" fill={`url(#${uid}-ground)`} />

      <rect
        x="10"
        y="21.5"
        width="5"
        height="24"
        rx="2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <rect
        x="49"
        y="21.5"
        width="5"
        height="24"
        rx="2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <rect
        x="14"
        y="23"
        width="36"
        height="21"
        rx="7"
        fill={`url(#${uid}-shell-h)`}
        stroke={OUTLINE}
        strokeWidth="1.1"
      />
      <path d="M18 25h25" stroke={HIGHLIGHT} strokeWidth="1.4" />
      <rect x="24" y="23.6" width="1.2" height="19.8" fill="#6f899b" opacity="0.48" />
      <rect x="40" y="23.6" width="1.2" height="19.8" fill="#6f899b" opacity="0.4" />
      <path d="M16 38.5c5 2 27 2 32 0" fill="none" stroke="rgba(31,58,75,.14)" strokeWidth="2" />

      <rect
        x="19.5"
        y="27"
        width="25"
        height="12.4"
        rx="3"
        fill="#263f4e"
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <path
        d="M22 30.7h20M22 37.5h20"
        fill="none"
        stroke="#a9c2ce"
        strokeWidth="0.9"
        opacity="0.5"
      />
      <path
        d="M22 34c1.9 0 1.9-4.2 3.8-4.2s1.9 7.4 3.8 7.4 1.9-7.4 3.8-7.4 1.9 7.4 3.8 7.4 1.9-4.2 3.9-4.2"
        fill="none"
        stroke={`url(#${uid}-hot)`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 30.4h2M44 37.6h-2"
        stroke="#f2cf98"
        strokeWidth="0.9"
        opacity="0.7"
      />
      <circle cx="21" cy="31" r="0.9" fill="#e9b36e" opacity="0.8" />
      <circle cx="43" cy="37" r="0.9" fill="#e9b36e" opacity="0.8" />

      <rect
        x="19"
        y="15.6"
        width="8"
        height="7.5"
        rx="2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="17.4"
        y="14.2"
        width="11.2"
        height="2.8"
        rx="1.2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.8"
      />
      <rect
        x="43"
        y="43"
        width="8"
        height="8"
        rx="2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="41.6"
        y="49.2"
        width="10.8"
        height="2.8"
        rx="1.2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.8"
      />

      <path
        d="M42 21.5c2-2.8 2-5.6 0-8.4M46 21.2c2-2.5 2-4.9 0-7.2"
        fill="none"
        stroke={`url(#${uid}-hot)`}
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.82"
      />
      <circle cx="13" cy="24.5" r="0.65" fill={BOLT} />
      <circle cx="13" cy="42.5" r="0.65" fill={BOLT} />
      <circle cx="51" cy="24.5" r="0.65" fill={BOLT} />
      <circle cx="51" cy="42.5" r="0.65" fill={BOLT} />
      <path d="M19 45h6M39 45h6" stroke={OUTLINE} strokeWidth="1.8" />

      {selected && (
        <g className="equipment-artwork__selection">
          <rect
            x="18.8"
            y="26.2"
            width="26.4"
            height="14.2"
            rx="3.5"
            fill="none"
            stroke="#38c8b8"
            strokeWidth="1"
            strokeDasharray="2.5 2"
            opacity="0.9"
          />
          <path
            d="M22 34c1.9 0 1.9-4.2 3.8-4.2s1.9 7.4 3.8 7.4 1.9-7.4 3.8-7.4 1.9 7.4 3.8 7.4 1.9-4.2 3.9-4.2"
            fill="none"
            stroke="#ffb65c"
            strokeWidth="2.7"
            opacity="0.35"
          />
          <circle cx="21" cy="31" r="1.2" fill="none" stroke="#6ce5d7" strokeWidth="0.8" />
          <circle cx="43" cy="37" r="1.2" fill="none" stroke="#6ce5d7" strokeWidth="0.8" />
        </g>
      )}
    </g>
  )
}

function CoolerArt({ uid }: ArtProps) {
  return (
    <g>
      <ellipse cx="32" cy="57" rx="21" ry="3" fill={`url(#${uid}-ground)`} />

      <rect
        x="11"
        y="26"
        width="5"
        height="22"
        rx="2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <rect
        x="48"
        y="26"
        width="5"
        height="22"
        rx="2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <rect
        x="15"
        y="27.5"
        width="34"
        height="19"
        rx="7"
        fill={`url(#${uid}-shell-h)`}
        stroke={OUTLINE}
        strokeWidth="1.1"
      />
      <path d="M18 29.5h22" stroke={HIGHLIGHT} strokeWidth="1.4" />
      <rect x="23" y="28" width="1.1" height="18" fill="#6f899b" opacity="0.4" />
      <rect x="39" y="28" width="1.1" height="18" fill="#6f899b" opacity="0.34" />

      <rect
        x="19"
        y="31"
        width="25"
        height="11"
        rx="3"
        fill="#263f4e"
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <path
        d="M23.2 33.2v7.1M26 32.7v8.1M28.8 32.3v8.8M31.6 32.3v8.8M34.4 32.7v8.1M37.2 33.2v7.1"
        fill="none"
        stroke={`url(#${uid}-cold)`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M21.5 35.2h24M21.5 38.7h24"
        fill="none"
        stroke="#85b9ce"
        strokeWidth="0.8"
        opacity="0.4"
      />

      <rect
        x="25"
        y="11.5"
        width="14"
        height="11.5"
        rx="3"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <circle
        cx="32"
        cy="17.2"
        r="4.7"
        fill="#dcecf4"
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <path
        d="M32 14.4c1.8 1 2.2 2.4 1.4 3.8M34.4 18.7c-.4 2-1.8 2.7-3.3 2.1M29.5 17.3c.5-1.9 1.9-2.6 3.4-2"
        fill="none"
        stroke="#608397"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="17.2" r="1.1" fill={`url(#${uid}-dark-metal)`} />
      <path d="M25 23h14" stroke={OUTLINE} strokeWidth="1.8" />

      <rect
        x="17.5"
        y="46.5"
        width="7"
        height="3"
        rx="1"
        fill={`url(#${uid}-dark-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.8"
      />
      <rect
        x="39.5"
        y="46.5"
        width="7"
        height="3"
        rx="1"
        fill={`url(#${uid}-dark-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.8"
      />
      <path
        d="M45 22.8c1.8-2.5 1.8-5.3 0-7.7"
        fill="none"
        stroke={`url(#${uid}-cold)`}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="14" cy="28.5" r="0.6" fill={BOLT} />
      <circle cx="14" cy="45" r="0.6" fill={BOLT} />
      <circle cx="50" cy="28.5" r="0.6" fill={BOLT} />
      <circle cx="50" cy="45" r="0.6" fill={BOLT} />
    </g>
  )
}

function FlashArt({ uid, selected }: ArtProps & { selected?: boolean }) {
  const body =
    'M21.5 20.5C21.5 16.8 26.2 15 32 15C37.8 15 42.5 16.8 42.5 20.5V46.5C42.5 50.2 37.8 52 32 52C26.2 52 21.5 50.2 21.5 46.5Z'
  return (
    <g>
      <ellipse cx="32" cy="56.8" rx="16" ry="2.8" fill={`url(#${uid}-ground)`} />
      <defs>
        <clipPath id={`${uid}-flash-body`}>
          <path d={body} />
        </clipPath>
      </defs>

      <path
        d={body}
        fill={`url(#${uid}-shell-v)`}
        stroke={OUTLINE}
        strokeWidth="1.1"
      />
      <g clipPath={`url(#${uid}-flash-body)`}>
        <rect
          x="21.5"
          y="36.4"
          width="21"
          height="17"
          fill={`url(#${uid}-liquid)`}
          opacity="0.92"
        />
        <path
          d="M21.5 36.4c3.5 1.4 7 1.4 10.5 0s7-1.4 10.5 0"
          fill="none"
          stroke="#b4f5eb"
          strokeWidth="1.1"
          opacity="0.9"
        />
        <path
          d="M25 41c2.3-.9 4.6-.9 7 0s4.6.9 6.8 0"
          fill="none"
          stroke="#86e6da"
          strokeWidth="0.8"
          opacity="0.55"
        />
        <path
          d="M31.8 22v28.5"
          stroke={HIGHLIGHT}
          strokeWidth="1"
          opacity="0.28"
        />
      </g>

      <path
        d="M22 23.5h20M22 44h20"
        stroke="rgba(41, 69, 87, 0.35)"
        strokeWidth="0.9"
      />
      <path
        d="M24 25.5c1.7-1.5 3.4-1.5 5.1 0M30 25.5c1.7-1.5 3.4-1.5 5.1 0M36 25.5c1.7-1.5 3.4-1.5 5.1 0"
        fill="none"
        stroke="rgba(32, 65, 81, 0.55)"
        strokeWidth="1"
      />

      <rect
        x="29.7"
        y="6"
        width="4.6"
        height="10.5"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="27.6"
        y="5"
        width="8.8"
        height="2.7"
        rx="1.1"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.8"
      />
      <rect
        x="7"
        y="30.2"
        width="14.8"
        height="4.4"
        rx="1.6"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="18.7"
        y="27.7"
        width="3.8"
        height="9.4"
        rx="1.2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="29.7"
        y="51.3"
        width="4.6"
        height="5.4"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="27.6"
        y="54.2"
        width="8.8"
        height="2.7"
        rx="1.1"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.8"
      />

      <rect
        x="40.8"
        y="28.5"
        width="3.5"
        height="15"
        rx="1.8"
        fill={`url(#${uid}-glass)`}
        stroke={OUTLINE}
        strokeWidth="0.8"
      />
      <rect
        x="41.2"
        y="38"
        width="2.7"
        height="5"
        fill={`url(#${uid}-liquid)`}
      />
      <path d="M41 32h3M41 35h3" stroke="rgba(42,93,106,.6)" strokeWidth="0.7" />

      <circle
        cx="49"
        cy="18.5"
        r="4.2"
        fill="#edf7fb"
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <circle cx="49" cy="18.5" r="2.7" fill="#cfe2eb" />
      <path d="M49 16.3v2.7l1.6 1" stroke="#516e7f" strokeWidth="0.9" />
      <path
        d="M49 22.7v3.6"
        stroke={`url(#${uid}-metal)`}
        strokeWidth="1.2"
      />

      <path d="M23.5 21.5v12" stroke={HIGHLIGHT} strokeWidth="1.3" />

      {selected && (
        <g className="equipment-artwork__selection">
          <path
            d="M22 36.4c3.5 1.4 7 1.4 10.5 0s7-1.4 10.5 0"
            fill="none"
            stroke="#66eadc"
            strokeWidth="1.15"
            strokeDasharray="2.5 2"
            opacity="0.95"
          />
          <path
            d="M24.5 36.4v-7M39.5 36.4v-7"
            stroke="#55ddcf"
            strokeWidth="0.8"
            opacity="0.55"
          />
          <path
            d="M29 20.5h6M29 22.3h6"
            stroke="#63e6d8"
            strokeWidth="0.9"
            opacity="0.55"
          />
        </g>
      )}
    </g>
  )
}

function SeparatorArt({ uid }: ArtProps) {
  const body =
    'M17.5 23H46.5C50.4 23 52 25.6 52 29.5V34.5C52 38.4 50.4 41 46.5 41H17.5C13.6 41 12 38.4 12 34.5V29.5C12 25.6 13.6 23 17.5 23Z'
  return (
    <g>
      <ellipse cx="32" cy="56" rx="23" ry="3" fill={`url(#${uid}-ground)`} />
      <defs>
        <clipPath id={`${uid}-separator-body`}>
          <path d={body} />
        </clipPath>
      </defs>

      <rect
        x="5"
        y="29.8"
        width="17"
        height="4.4"
        rx="1.6"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="7.5"
        y="27.2"
        width="3.8"
        height="9.6"
        rx="1.2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <path
        d={body}
        fill={`url(#${uid}-shell-h)`}
        stroke={OUTLINE}
        strokeWidth="1.1"
      />
      <g clipPath={`url(#${uid}-separator-body)`}>
        <rect
          x="12"
          y="33"
          width="40"
          height="10"
          fill={`url(#${uid}-liquid)`}
          opacity="0.74"
        />
        <path
          d="M12 33c4 1.4 8 1.4 12 0s8-1.4 12 0 8 1.4 16 0"
          fill="none"
          stroke="#b4f5eb"
          strokeWidth="0.9"
          opacity="0.75"
        />
        <path
          d="M38.5 26v13"
          stroke="rgba(39, 66, 84, 0.48)"
          strokeWidth="1.2"
        />
      </g>
      <path d="M18 25.5h20" stroke={HIGHLIGHT} strokeWidth="1.4" />
      <ellipse
        cx="17.5"
        cy="32"
        rx="3.2"
        ry="9"
        fill="rgba(36, 62, 80, 0.08)"
      />
      <ellipse
        cx="46.5"
        cy="32"
        rx="3.2"
        ry="9"
        fill="rgba(255, 255, 255, 0.18)"
      />

      <rect
        x="29.8"
        y="12"
        width="4.4"
        height="11"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="27.8"
        y="11"
        width="8.4"
        height="2.6"
        rx="1.1"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.8"
      />
      <path
        d="M25 41h8l-1.2 8h-5.6Z"
        fill={`url(#${uid}-shell-v)`}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <rect
        x="27.9"
        y="48.6"
        width="6.2"
        height="2.6"
        rx="1.1"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.8"
      />
      <path
        d="M30 12v4.5M34 12v4.5"
        stroke={HIGHLIGHT}
        strokeWidth="0.8"
        opacity="0.6"
      />
      <path
        d="M17 43h6l1.2 5h-8.4ZM41 43h6l1.2 5h-8.4Z"
        fill={`url(#${uid}-dark-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <path d="M8 28.2h3v9.8H8Z" fill="rgba(42, 70, 89, 0.45)" />
      <circle cx="16" cy="47.2" r="0.7" fill="#d5e5ee" />
      <circle cx="44" cy="47.2" r="0.7" fill="#d5e5ee" />
      <circle cx="9.4" cy="28.8" r="0.55" fill={BOLT} />
      <circle cx="9.4" cy="35.3" r="0.55" fill={BOLT} />
    </g>
  )
}

function PumpArt({ uid }: ArtProps) {
  return (
    <g>
      <ellipse cx="34" cy="55.5" rx="24" ry="3" fill={`url(#${uid}-ground)`} />
      <rect
        x="8"
        y="48.5"
        width="49"
        height="5.5"
        rx="1.8"
        fill={`url(#${uid}-dark-metal)`}
        stroke={OUTLINE}
        strokeWidth="1"
      />
      <path d="M12 50h41" stroke={HIGHLIGHT} strokeWidth="0.8" opacity="0.55" />

      <path
        d="M35.5 31.5h12.5V45H35.5Z"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="1.1"
      />
      <path
        d="M37.5 33.3v10.5M40 33.3v10.5M42.5 33.3v10.5M45 33.3v10.5"
        stroke="rgba(53, 81, 99, 0.32)"
        strokeWidth="0.9"
      />
      <path
        d="M48 30.5c3 0 4 1.7 4 4v8c0 2.3-1 4-4 4"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="43"
        y="24.8"
        width="7.5"
        height="5.5"
        rx="1.2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.8"
      />
      <path
        d="M32 36.5h4"
        stroke={`url(#${uid}-dark-metal)`}
        strokeWidth="3"
        strokeLinecap="round"
      />

      <circle
        cx="24"
        cy="36.5"
        r="12.3"
        fill={`url(#${uid}-shell-h)`}
        stroke={OUTLINE}
        strokeWidth="1.2"
      />
      <path
        d="M15.5 29.5c-2 2.7-3 5.6-3 8.5"
        fill="none"
        stroke={HIGHLIGHT}
        strokeWidth="1.5"
      />
      <path
        d="M32 24.5c3.8 1.7 6.2 4.3 7.3 8"
        fill="none"
        stroke="rgba(245, 251, 255, 0.38)"
        strokeWidth="2"
      />
      <circle
        cx="24"
        cy="36.5"
        r="6.2"
        fill={`url(#${uid}-glass)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <path
        d="M24 31.8c1.1 2.5 1.1 6.7 0 9.4M19.8 34.3c2.4.8 6.1 3.7 7.4 5.7M28.2 34.3c-2.4.8-6.1 3.7-7.4 5.7"
        fill="none"
        stroke="#316074"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="24" cy="36.5" r="1.3" fill="#dff4f5" stroke="#316074" strokeWidth="0.7" />

      <rect
        x="3.5"
        y="32"
        width="11"
        height="4.4"
        rx="1.6"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="10.5"
        y="29.5"
        width="3.8"
        height="9.4"
        rx="1.2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="20.5"
        y="10.5"
        width="7"
        height="14"
        rx="2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.9"
      />
      <rect
        x="18.6"
        y="9.3"
        width="10.8"
        height="2.8"
        rx="1.2"
        fill={`url(#${uid}-metal)`}
        stroke={OUTLINE}
        strokeWidth="0.8"
      />
      <path
        d="M15 46.2h11M32 46.2h8"
        stroke={`url(#${uid}-dark-metal)`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="51.2" r="0.7" fill="#d5e5ee" />
      <circle cx="53" cy="51.2" r="0.7" fill="#d5e5ee" />
      <path
        d="M20 26.5c1.4-1 3-1.6 4.7-1.8"
        stroke={HIGHLIGHT}
        strokeWidth="1.1"
        opacity="0.6"
        fill="none"
      />
    </g>
  )
}

export function EquipmentGlyph({
  kind,
  role,
  className,
  selected = false,
}: EquipmentGlyphProps) {
  const rawId = useId()
  const uid = `eq-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <svg
      className={
        className ? `equipment-artwork ${className}` : 'equipment-artwork'
      }
      viewBox="0 0 64 64"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <EquipmentDefs uid={uid} />
      {kind === 'stream' && <StreamArt uid={uid} role={role} />}
      {kind === 'mixer' && <MixerArt uid={uid} selected={selected} />}
      {kind === 'heater' && <HeaterArt uid={uid} selected={selected} />}
      {kind === 'cooler' && <CoolerArt uid={uid} />}
      {kind === 'flash' && <FlashArt uid={uid} selected={selected} />}
      {kind === 'separator' && <SeparatorArt uid={uid} />}
      {kind === 'pump' && <PumpArt uid={uid} />}
    </svg>
  )
}
