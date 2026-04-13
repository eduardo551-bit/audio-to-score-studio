interface CavacoPosition {
  frets: [number, number, number, number]
  fingers: [number, number, number, number]
  baseFret: number
  barres?: number[]
}

interface Props {
  position: CavacoPosition
  chordName: string
}

const STRINGS = 4
const FRETS = 4
const SX = 26
const FY = 25
const MARGIN_LEFT = 20
const MARGIN_TOP = 26
const DOT_R = 8
const WIDTH = MARGIN_LEFT + SX * (STRINGS - 1) + 28
const HEIGHT = MARGIN_TOP + FY * FRETS + 18

export function CavacoDiagram({ position, chordName }: Props) {
  const { frets, baseFret, barres = [] } = position
  const barreFretSet = new Set(barres)

  const barreFrets = barres.map((fret) => ({
    fret,
    fromStr: frets.findIndex((value) => value === fret),
    toStr: frets.lastIndexOf(fret),
  }))

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="cavaco-svg"
      aria-label={`Diagrama do acorde ${chordName}`}
    >
      <line
        x1={MARGIN_LEFT - 4}
        x2={MARGIN_LEFT}
        y1={MARGIN_TOP - 12}
        y2={MARGIN_TOP}
        stroke="#2a241e"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1={MARGIN_LEFT + SX * (STRINGS - 1)}
        x2={MARGIN_LEFT + SX * (STRINGS - 1) + 4}
        y1={MARGIN_TOP}
        y2={MARGIN_TOP - 12}
        stroke="#2a241e"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {baseFret === 1 ? (
        <line
          x1={MARGIN_LEFT}
          x2={MARGIN_LEFT + SX * (STRINGS - 1)}
          y1={MARGIN_TOP}
          y2={MARGIN_TOP}
          stroke="#2a241e"
          strokeWidth="1.8"
        />
      ) : (
        <text
          x={MARGIN_LEFT - 8}
          y={MARGIN_TOP + FY * 0.6}
          textAnchor="end"
          dominantBaseline="central"
          fontSize="11"
          fontWeight="700"
          fill="#ea9419"
          fontFamily="Georgia, serif"
        >
          {baseFret}a
        </text>
      )}

      {Array.from({ length: FRETS }, (_, index) => (
        <line
          key={`fret-${index}`}
          x1={MARGIN_LEFT}
          x2={MARGIN_LEFT + SX * (STRINGS - 1)}
          y1={MARGIN_TOP + FY * (index + 1)}
          y2={MARGIN_TOP + FY * (index + 1)}
          stroke="#5c5348"
          strokeWidth="1.2"
        />
      ))}

      {Array.from({ length: STRINGS }, (_, stringIndex) => (
        <line
          key={`string-${stringIndex}`}
          x1={MARGIN_LEFT + SX * stringIndex}
          x2={MARGIN_LEFT + SX * stringIndex}
          y1={MARGIN_TOP}
          y2={MARGIN_TOP + FY * FRETS}
          stroke="#5c5348"
          strokeWidth={stringIndex === 0 || stringIndex === STRINGS - 1 ? 1.7 : 1.2}
          strokeLinecap="round"
        />
      ))}

      {barreFrets.map(({ fret, fromStr, toStr }) => {
        if (fromStr < 0 || toStr <= fromStr) return null

        return (
          <line
            key={`barre-${fret}`}
            x1={MARGIN_LEFT + SX * fromStr}
            x2={MARGIN_LEFT + SX * toStr}
            y1={MARGIN_TOP + FY * (fret - 0.5)}
            y2={MARGIN_TOP + FY * (fret - 0.5)}
            stroke="#f39a1d"
            strokeWidth="5"
            strokeLinecap="round"
          />
        )
      })}

      {frets.map((fret, stringIndex) => {
        if (fret <= 0 || barreFretSet.has(fret)) return null

        return (
          <circle
            key={`dot-${stringIndex}`}
            cx={MARGIN_LEFT + SX * stringIndex}
            cy={MARGIN_TOP + FY * (fret - 0.5)}
            r={DOT_R}
            fill="#f39a1d"
          />
        )
      })}
    </svg>
  )
}
