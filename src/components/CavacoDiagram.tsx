import type { CavacoPosition } from '../data/cavachoChords'

interface Props {
  position: CavacoPosition
  chordName: string
}

const STRINGS = 4
const FRETS = 4
const SX = 28      // string spacing
const FY = 26      // fret spacing
const MARGIN_LEFT = 28
const MARGIN_TOP = 32
const DOT_R = 8
const WIDTH = MARGIN_LEFT + SX * (STRINGS - 1) + MARGIN_LEFT
const HEIGHT = MARGIN_TOP + FY * FRETS + 20

export function CavacoDiagram({ position, chordName }: Props) {
  const { frets, fingers, baseFret, barres = [] } = position
  const barreFretSet = new Set(barres)

  // Group dots by fret for barre detection
  const barreFrets = barres.map(b => ({
    fret: b,
    fromStr: frets.findIndex(f => f === b),
    toStr: frets.lastIndexOf(b),
  }))

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="cavaco-svg"
      aria-label={`Diagrama do acorde ${chordName}`}
    >
      {/* Nut or position indicator */}
      {baseFret === 1 ? (
        <rect
          x={MARGIN_LEFT - 1}
          y={MARGIN_TOP - 5}
          width={SX * (STRINGS - 1) + 2}
          height={5}
          fill="#1e1b18"
          rx="1"
        />
      ) : (
        <text
          x={MARGIN_LEFT - 10}
          y={MARGIN_TOP + FY * 0.5}
          textAnchor="end"
          dominantBaseline="central"
          fontSize="10"
          fontWeight="700"
          fill="#d57a00"
          fontFamily="'Segoe UI', sans-serif"
        >
          {baseFret}ª
        </text>
      )}

      {/* Fret lines */}
      {Array.from({ length: FRETS + 1 }, (_, i) => (
        <line
          key={`fret-${i}`}
          x1={MARGIN_LEFT}
          x2={MARGIN_LEFT + SX * (STRINGS - 1)}
          y1={MARGIN_TOP + FY * i}
          y2={MARGIN_TOP + FY * i}
          stroke="#c8b898"
          strokeWidth={i === 0 ? 1.5 : 1}
        />
      ))}

      {/* String lines */}
      {Array.from({ length: STRINGS }, (_, s) => (
        <line
          key={`str-${s}`}
          x1={MARGIN_LEFT + SX * s}
          x2={MARGIN_LEFT + SX * s}
          y1={MARGIN_TOP}
          y2={MARGIN_TOP + FY * FRETS}
          stroke="#1e1b18"
          strokeWidth={2}
          strokeLinecap="round"
        />
      ))}

      {/* Barre lines */}
      {barreFrets.map(({ fret, fromStr, toStr }) => {
        if (fromStr < 0 || toStr <= fromStr) return null
        const cy = MARGIN_TOP + FY * (fret - 0.5)
        const x1 = MARGIN_LEFT + SX * fromStr
        const x2 = MARGIN_LEFT + SX * toStr
        return (
          <line
            key={`barre-${fret}`}
            x1={x1} x2={x2} y1={cy} y2={cy}
            stroke="#ff9417"
            strokeWidth={DOT_R * 1.8}
            strokeLinecap="round"
          />
        )
      })}

      {/* Dots */}
      {frets.map((fret, si) => {
        const cx = MARGIN_LEFT + SX * si
        if (fret === -1) {
          // Muted
          return (
            <g key={`dot-${si}`}>
              <line x1={cx - 5} y1={MARGIN_TOP - 16} x2={cx + 5} y2={MARGIN_TOP - 6} stroke="#1e1b18" strokeWidth="1.5" />
              <line x1={cx + 5} y1={MARGIN_TOP - 16} x2={cx - 5} y2={MARGIN_TOP - 6} stroke="#1e1b18" strokeWidth="1.5" />
            </g>
          )
        }
        if (fret === 0) {
          // Open
          return (
            <circle
              key={`dot-${si}`}
              cx={cx} cy={MARGIN_TOP - 11}
              r={5}
              fill="none"
              stroke="#1e1b18"
              strokeWidth="1.5"
            />
          )
        }
        if (barreFretSet.has(fret)) return null // drawn as barre line
        const cy = MARGIN_TOP + FY * (fret - 0.5)
        const finger = fingers[si]
        return (
          <g key={`dot-${si}`}>
            <circle cx={cx} cy={cy} r={DOT_R} fill="#ff9417" />
            {finger > 0 && (
              <text
                x={cx} y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fontWeight="700"
                fill="#1e1b18"
                fontFamily="'Segoe UI', sans-serif"
              >
                {finger}
              </text>
            )}
          </g>
        )
      })}

      {/* Open string circles above barre dots */}
      {barreFrets.map(({ fret, fromStr, toStr }) => {
        const cy = MARGIN_TOP + FY * (fret - 0.5)
        const finger = fingers[fromStr]
        return (
          <g key={`barre-dot-${fret}`}>
            {finger > 0 && (
              <text
                x={MARGIN_LEFT + SX * Math.round((fromStr + toStr) / 2)}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fontWeight="700"
                fill="#1e1b18"
                fontFamily="'Segoe UI', sans-serif"
              >
                {finger}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
