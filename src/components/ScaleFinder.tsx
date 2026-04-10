import { useState, useMemo } from 'react'

const ROOTS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const ROOTS_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const ROOTS_SELECT = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

const SCALES: Record<string, number[]> = {
  'Maior':              [0, 2, 4, 5, 7, 9, 11],
  'Menor Natural':      [0, 2, 3, 5, 7, 8, 10],
  'Menor Harmônica':    [0, 2, 3, 5, 7, 8, 11],
  'Menor Melódica':     [0, 2, 3, 5, 7, 9, 11],
  'Dórica':             [0, 2, 3, 5, 7, 9, 10],
  'Frígia':             [0, 1, 3, 5, 7, 8, 10],
  'Lídia':              [0, 2, 4, 6, 7, 9, 11],
  'Mixolídia':          [0, 2, 4, 5, 7, 9, 10],
  'Lócria':             [0, 1, 3, 5, 6, 8, 10],
  'Pentatônica Maior':  [0, 2, 4, 7, 9],
  'Pentatônica Menor':  [0, 3, 5, 7, 10],
  'Blues':              [0, 3, 5, 6, 7, 10],
}

const INTERVALS: Record<number, string> = {
  0: 'T', 1: '♭2', 2: '2', 3: '♭3', 4: '3', 5: '4',
  6: '♭5', 7: '5', 8: '♭6', 9: '6', 10: '♭7', 11: '7',
}

// open string pitch classes, string 0 = highest
const GUITAR_OPEN_PCS = [4, 11, 7, 2, 9, 4] // E B G D A E
const GUITAR_LABELS   = ['E', 'B', 'G', 'D', 'A', 'E']
const CAVACO_OPEN_PCS = [2, 11, 7, 2] // D B G D
const CAVACO_LABELS   = ['D', 'B', 'G', 'D']

// Harmonization: chord quality per scale degree (7 diatonic scales)
const HARMONIZATION: Record<string, string[]> = {
  'Maior':           ['major','minor','minor','major','major','minor','dim'],
  'Menor Natural':   ['minor','dim','major','minor','minor','major','major'],
  'Menor Harmônica': ['minor','dim','aug','minor','major','major','dim'],
  'Menor Melódica':  ['minor','minor','aug','major','major','dim','dim'],
  'Dórica':          ['minor','minor','major','major','minor','dim','major'],
  'Frígia':          ['minor','major','major','minor','dim','major','minor'],
  'Lídia':           ['major','major','minor','dim','major','minor','minor'],
  'Mixolídia':       ['major','minor','dim','major','minor','minor','major'],
  'Lócria':          ['dim','major','minor','minor','major','major','minor'],
}

const ROMAN_MAJOR = ['I','II','III','IV','V','VI','VII']
const ROMAN_MINOR = ['i','ii','iii','iv','v','vi','vii']

const FRET_COUNT   = 12
const FRET_W       = 32
const STRING_SP    = 22
const MARGIN_LEFT  = 28  // space for open-string column
const MARGIN_TOP   = 16
const MARGIN_BOT   = 18
const DOT_R        = 7
const FRET_MARKER_FRETS = [3, 5, 7, 9, 12]

function noteName(pc: number, useFlat: boolean): string {
  return useFlat ? ROOTS_FLAT[pc] : ROOTS_SHARP[pc]
}

interface FretboardProps {
  openPcs: number[]
  stringLabels: string[]
  scalePcs: Set<number>
  rootPc: number
  useFlat: boolean
}

function Fretboard({ openPcs, stringLabels, scalePcs, rootPc, useFlat }: FretboardProps) {
  const nStrings = openPcs.length
  const svgW = MARGIN_LEFT + FRET_COUNT * FRET_W + 8
  const svgH = MARGIN_TOP + (nStrings - 1) * STRING_SP + MARGIN_BOT

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="fretboard-svg" aria-label="Escala no braço">
      {/* String lines */}
      {openPcs.map((_, si) => {
        const y = MARGIN_TOP + si * STRING_SP
        return (
          <line key={`str-${si}`}
            x1={MARGIN_LEFT} x2={MARGIN_LEFT + FRET_COUNT * FRET_W}
            y1={y} y2={y}
            stroke="#b0a080" strokeWidth={si === nStrings - 1 ? 1.5 : 1}
          />
        )
      })}

      {/* Nut */}
      <line
        x1={MARGIN_LEFT} x2={MARGIN_LEFT}
        y1={MARGIN_TOP} y2={MARGIN_TOP + (nStrings - 1) * STRING_SP}
        stroke="#2a2018" strokeWidth={3}
      />

      {/* Fret lines */}
      {Array.from({ length: FRET_COUNT }, (_, f) => {
        const x = MARGIN_LEFT + (f + 1) * FRET_W
        return (
          <line key={`fret-${f}`}
            x1={x} x2={x}
            y1={MARGIN_TOP} y2={MARGIN_TOP + (nStrings - 1) * STRING_SP}
            stroke="#c8b898" strokeWidth="1"
          />
        )
      })}

      {/* Position markers (dots below fretboard) */}
      {FRET_MARKER_FRETS.map(f => {
        const x = MARGIN_LEFT + (f - 0.5) * FRET_W
        const y = MARGIN_TOP + (nStrings - 1) * STRING_SP + 10
        return (
          <circle key={`pm-${f}`} cx={x} cy={y} r={3}
            fill={f === 12 ? '#8b5e1a' : '#c8b898'} />
        )
      })}

      {/* String name labels (left of nut) */}
      {openPcs.map((_, si) => (
        <text key={`lbl-${si}`}
          x={MARGIN_LEFT - 6}
          y={MARGIN_TOP + si * STRING_SP}
          textAnchor="end"
          dominantBaseline="central"
          fontSize="9"
          fontFamily="'Segoe UI', sans-serif"
          fill="#9a8a72"
        >
          {stringLabels[si]}
        </text>
      ))}

      {/* Scale dots */}
      {openPcs.map((openPc, si) => {
        const y = MARGIN_TOP + si * STRING_SP
        const dots = []

        // Open string (fret 0)
        const openPcNorm = ((openPc % 12) + 12) % 12
        if (scalePcs.has(openPcNorm)) {
          const isRoot = openPcNorm === rootPc
          dots.push(
            <g key={`open-${si}`}>
              <circle cx={MARGIN_LEFT - 14} cy={y} r={DOT_R - 1}
                fill={isRoot ? '#8b5e1a' : '#e8c86e'}
                stroke={isRoot ? '#6a4010' : '#c8a040'}
                strokeWidth="1"
              />
              {isRoot && (
                <text x={MARGIN_LEFT - 14} y={y} textAnchor="middle"
                  dominantBaseline="central" fontSize="7" fontWeight="700"
                  fill="#fff8ed" fontFamily="'Segoe UI', sans-serif"
                  style={{ pointerEvents: 'none' }}>R</text>
              )}
            </g>
          )
        }

        // Frets 1-12
        for (let f = 1; f <= FRET_COUNT; f++) {
          const pc = ((openPc + f) % 12 + 12) % 12
          if (!scalePcs.has(pc)) continue
          const isRoot = pc === rootPc
          const cx = MARGIN_LEFT + (f - 0.5) * FRET_W
          dots.push(
            <g key={`dot-${si}-${f}`}>
              <circle cx={cx} cy={y} r={DOT_R}
                fill={isRoot ? '#8b5e1a' : '#e8c86e'}
                stroke={isRoot ? '#6a4010' : '#c8a040'}
                strokeWidth="1"
              />
              <text x={cx} y={y} textAnchor="middle"
                dominantBaseline="central" fontSize="7.5" fontWeight={isRoot ? '700' : '500'}
                fill={isRoot ? '#fff8ed' : '#5a3c00'}
                fontFamily="'Segoe UI', sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                {noteName(pc, useFlat)}
              </text>
            </g>
          )
        }
        return dots
      })}
    </svg>
  )
}

export function ScaleFinder() {
  const [root, setRoot] = useState('C')
  const [scaleName, setScaleName] = useState('Maior')
  const [instrument, setInstrument] = useState<'violao' | 'cavaco'>('violao')

  const rootPc = ROOTS_SELECT.indexOf(root)
  const intervals = SCALES[scaleName]
  const scalePcs = new Set(intervals.map(i => (rootPc + i) % 12))
  const useFlat = [1, 3, 5, 8, 10].includes(rootPc)

  const noteNames = intervals.map(i => {
    const pc = (rootPc + i) % 12
    return noteName(pc, useFlat)
  })

  const openPcs      = instrument === 'violao' ? GUITAR_OPEN_PCS : CAVACO_OPEN_PCS
  const stringLabels = instrument === 'violao' ? GUITAR_LABELS : CAVACO_LABELS

  const harmonization = useMemo(() => {
    const qualities = HARMONIZATION[scaleName]
    if (!qualities || intervals.length !== qualities.length) return null
    return intervals.map((interval, i) => {
      const pc = (rootPc + interval) % 12
      const name = noteName(pc, useFlat)
      const quality = qualities[i]
      const isMinor = quality === 'minor' || quality === 'dim' || quality === 'm7'
      const roman = isMinor ? ROMAN_MINOR[i].toLowerCase() : ROMAN_MAJOR[i]
      const dim = quality === 'dim' ? '°' : ''
      const aug = quality === 'aug' ? '+' : ''
      return { degree: i + 1, roman: roman + dim + aug, name, quality }
    })
  }, [scaleName, intervals, rootPc, useFlat])

  return (
    <section className="panel chord-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Harmonia</p>
          <h3>Escalas e Modos</h3>
        </div>
        <span className="preview-badge">{noteNames.length} notas</span>
      </div>

      {/* Instrument toggle */}
      <div className="instrument-toggle" style={{ marginBottom: 14 }}>
        <button
          className={`toggle-chip ${instrument === 'violao' ? 'toggle-chip-active' : ''}`}
          onClick={() => setInstrument('violao')}
        >Violão</button>
        <button
          className={`toggle-chip ${instrument === 'cavaco' ? 'toggle-chip-active' : ''}`}
          onClick={() => setInstrument('cavaco')}
        >Cavaquinho</button>
      </div>

      <div className="scale-controls">
        <label className="scale-label">
          <span>Tom</span>
          <select value={root} onChange={e => setRoot(e.target.value)}>
            {ROOTS_SELECT.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="scale-label">
          <span>Escala / Modo</span>
          <select value={scaleName} onChange={e => setScaleName(e.target.value)}>
            {Object.keys(SCALES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {/* Fretboard */}
      <div className="fretboard-wrap">
        <Fretboard
          openPcs={openPcs}
          stringLabels={stringLabels}
          scalePcs={scalePcs}
          rootPc={rootPc}
          useFlat={useFlat}
        />
        <div className="fretboard-legend">
          <span className="fretboard-dot-root" />
          <span>Tônica</span>
          <span className="fretboard-dot-note" style={{ marginLeft: 10 }} />
          <span>Nota da escala</span>
        </div>
      </div>

      {/* Note chips */}
      <div className="scale-notes">
        {noteNames.map((name, i) => (
          <div key={i} className={`scale-note-chip ${i === 0 ? 'scale-note-root' : ''}`}>
            <span className="scale-note-interval">{INTERVALS[intervals[i]]}</span>
            <strong>{name}</strong>
          </div>
        ))}
      </div>

      {/* Harmonization */}
      {harmonization && (
        <div className="harmonization-wrap">
          <p className="eyebrow" style={{ marginBottom: 8 }}>Harmonização</p>
          <div className="harm-grid">
            {harmonization.map(({ degree, roman, name, quality }) => (
              <div key={degree} className={`harm-chip ${degree === 1 ? 'harm-chip-root' : ''} harm-chip-${quality}`}>
                <span className="harm-roman">{roman}</span>
                <strong className="harm-name">{name}</strong>
                <span className="harm-quality">{quality === 'major' ? 'M' : quality === 'minor' ? 'm' : quality === 'dim' ? '°' : quality === 'aug' ? '+' : quality}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
