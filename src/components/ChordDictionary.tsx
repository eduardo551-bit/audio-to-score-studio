import { useMemo, useState } from 'react'
import Chord from '@techies23/react-chords'
import guitarDb from '@tombatossals/chords-db/lib/guitar.json'
import { CavacoDiagram } from './CavacoDiagram'
import { CavacoReferenceDictionary } from './CavacoReferenceDictionary'
import { useLocalStorage } from '../utils/useLocalStorage'

// ── Guitar DB types ──────────────────────────────────────────────────────────
type GuitarDb = {
  tunings: { standard: string[] }
  main: { strings: number; fretsOnChord: number }
  keys: string[]
  suffixes: string[]
  chords: Record<string, Array<{ key: string; suffix: string; positions: Array<{
    frets: number[]; fingers: number[]; barres?: number[]; capo?: boolean; baseFret: number
  }> }>>
}

const db = guitarDb as GuitarDb

const GUITAR_INSTRUMENT = {
  strings: db.main.strings,
  fretsOnChord: db.main.fretsOnChord,
  tunings: { standard: db.tunings.standard },
}

const GUITAR_FRIENDLY: Record<string, string> = {
  major:   'Maior',
  minor:   'Menor',
  maj7:    'Maj7',
  m7:      'm7',
  '7':     '7',
  sus4:    'Sus4',
  sus2:    'Sus2',
  dim:     'Diminuto',
  aug:     'Aumentado',
  add9:    'Add9',
  '6':     '6',
  '9':     '9',
  m6:      'm6',
  m9:      'm9',
  'm7/9':  'm7/9',
  '5':     '5 (power)',
}

const PREFERRED_ORDER = [
  'major', 'minor', '7', 'm7', 'maj7', 'dim', 'aug', 'sus4', 'sus2',
  '6', 'm6', '9', 'm9', 'add9', '5', 'm7/9',
]

function parseQuery(query: string): { key: string; suffix: string } | null {
  const clean = query.trim()
  if (!clean) return null
  const m = clean.match(/^([A-G])([#b]?)(.*)$/i)
  if (!m) return null
  let key = `${m[1].toUpperCase()}${m[2] || ''}`
  if (key === 'Gb') key = 'F#'
  if (key === 'Db') key = 'C#'
  if (key === 'D#') key = 'Eb'
  if (key === 'A#') key = 'Bb'
  if (key === 'G#') key = 'Ab'

  const rem = m[3].trim().toLowerCase()
  const map: Array<[RegExp, string]> = [
    [/^(maj7|major7|maj\s*7)$/, 'maj7'],
    [/^(m7|min7|menor\s*7)$/, 'm7'],
    [/^(m|min|menor|menorzinho)$/, 'minor'],
    [/^(7)$/, '7'],
    [/^(sus4|sus\s*4|suspenso\s*4)$/, 'sus4'],
    [/^(sus2|sus\s*2|suspenso\s*2)$/, 'sus2'],
    [/^(dim|diminuto|diminu)$/, 'dim'],
    [/^(aug|aumentado|aum)$/, 'aug'],
    [/^(6)$/, '6'],
    [/^(9)$/, '9'],
    [/^(m6)$/, 'm6'],
    [/^(add9)$/, 'add9'],
    [/^$/, 'major'],
  ]
  for (const [pat, suf] of map) {
    if (pat.test(rem)) return { key, suffix: suf }
  }
  return { key, suffix: rem || 'major' }
}

// ── Utilitário: exportar SVG do card ────────────────────────────────────────

function downloadCardSvg(cardEl: HTMLElement | null, filename: string) {
  if (!cardEl) return
  const svg = cardEl.querySelector('svg')
  if (!svg) return
  const cloned = svg.cloneNode(true) as SVGElement
  if (!cloned.getAttribute('xmlns')) cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const serializer = new XMLSerializer()
  const svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(cloned)
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Cavaquinho manual builder ─────────────────────────────────────────────────

const CAVACO_STORAGE_KEY = 'cavaco-manual-chords'

interface SavedCavacoChord {
  id: string
  name: string
  frets: [number, number, number, number]
  baseFret: number
}

function loadSavedChords(): SavedCavacoChord[] {
  try { return JSON.parse(localStorage.getItem(CAVACO_STORAGE_KEY) ?? '[]') }
  catch { return [] }
}

function persistChords(chords: SavedCavacoChord[]) {
  localStorage.setItem(CAVACO_STORAGE_KEY, JSON.stringify(chords))
}

function makePosition(frets: [number, number, number, number], baseFret: number) {
  const nonZero = frets.filter(f => f > 0)
  const minFret = nonZero.length > 0 ? Math.min(...nonZero) : 0
  const barres = nonZero.filter(f => f === minFret).length >= 2 ? [minFret] : []
  return { frets, fingers: [0, 0, 0, 0] as [number,number,number,number], baseFret, barres }
}

// Builder SVG dimensions (match CavacoDiagram)
const BS = 4, BF = 4, SX = 28, FY = 26, ML = 28, MT = 32, DOT_R = 8
const SVG_W = ML + SX * (BS - 1) + ML
const SVG_H = MT + FY * BF + 20

function BuilderSvg({
  frets, baseFret, onFret, onHead,
}: {
  frets: [number, number, number, number]
  baseFret: number
  onFret: (si: number, f: number) => void
  onHead: (si: number) => void
}) {
  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="cavaco-svg cavaco-builder-svg">
      {baseFret === 1 ? (
        <rect x={ML - 1} y={MT - 5} width={SX * (BS - 1) + 2} height={5} fill="#1e1b18" rx="1" />
      ) : (
        <text x={ML - 10} y={MT + FY * 0.5} textAnchor="end" dominantBaseline="central"
          fontSize="10" fontWeight="700" fill="#d57a00" fontFamily="'Segoe UI', sans-serif">
          {baseFret}ª
        </text>
      )}

      {Array.from({ length: BF + 1 }, (_, i) => (
        <line key={i}
          x1={ML} x2={ML + SX * (BS - 1)}
          y1={MT + FY * i} y2={MT + FY * i}
          stroke="#c8b898" strokeWidth={i === 0 ? 1.5 : 1}
        />
      ))}

      {Array.from({ length: BS }, (_, s) => (
        <line key={s}
          x1={ML + SX * s} x2={ML + SX * s}
          y1={MT} y2={MT + FY * BF}
          stroke="#1e1b18" strokeWidth={2} strokeLinecap="round"
        />
      ))}

      {/* Fret hit areas */}
      {Array.from({ length: BF }, (_, fi) =>
        Array.from({ length: BS }, (_, si) => (
          <rect key={`${si}-${fi}`}
            x={ML + SX * si - SX / 2} y={MT + FY * fi}
            width={SX} height={FY}
            fill="transparent" style={{ cursor: 'pointer' }}
            onClick={() => onFret(si, fi + 1)}
          />
        ))
      )}

      {/* Above-nut hit areas */}
      {Array.from({ length: BS }, (_, si) => (
        <rect key={`head-${si}`}
          x={ML + SX * si - SX / 2} y={6}
          width={SX} height={MT - 6}
          fill="transparent" style={{ cursor: 'pointer' }}
          onClick={() => onHead(si)}
        />
      ))}

      {/* Open / muted indicators */}
      {frets.map((f, si) => {
        const cx = ML + SX * si
        if (f === 0) return (
          <circle key={si} cx={cx} cy={MT - 11} r={5}
            fill="none" stroke="#1e1b18" strokeWidth="1.5"
            style={{ pointerEvents: 'none' }} />
        )
        if (f === -1) return (
          <g key={si} style={{ pointerEvents: 'none' }}>
            <line x1={cx - 5} y1={MT - 20} x2={cx + 5} y2={MT - 10} stroke="#1e1b18" strokeWidth="1.5" />
            <line x1={cx + 5} y1={MT - 20} x2={cx - 5} y2={MT - 10} stroke="#1e1b18" strokeWidth="1.5" />
          </g>
        )
        return null
      })}

      {/* Dots */}
      {frets.map((f, si) => {
        if (f <= 0) return null
        return (
          <circle key={si}
            cx={ML + SX * si} cy={MT + FY * (f - 0.5)}
            r={DOT_R} fill="#ff9417"
            style={{ pointerEvents: 'none' }} />
        )
      })}
    </svg>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export function ChordDictionary() {
  const [instrument, setInstrument] = useLocalStorage<'violao' | 'cavaco'>('dict-instrument', 'violao')
  const [cavacoView, setCavacoView] = useLocalStorage<'dicionario' | 'builder'>('dict-cavaco-view', 'dicionario')

  // ── Violão state ──
  const [query, setQuery] = useState('G')
  const [selectedKey, setSelectedKey] = useLocalStorage('dict-guitar-key', 'G')
  const [selectedSuffix, setSelectedSuffix] = useLocalStorage('dict-guitar-suffix', 'major')

  const parsed = useMemo(() => parseQuery(query), [query])

  const guitarKeys = db.keys
  const activeGuitarKey = useMemo(() => {
    if (parsed?.key && db.chords[parsed.key]) return parsed.key
    return selectedKey
  }, [parsed, selectedKey])

  const guitarSuffixes = useMemo(() => {
    const raw = (db.chords[activeGuitarKey] ?? []).map(e => e.suffix)
    const ordered = PREFERRED_ORDER.filter(s => raw.includes(s))
    const rest = raw.filter(s => !PREFERRED_ORDER.includes(s))
    return [...ordered, ...rest]
  }, [activeGuitarKey])

  const activeGuitarSuffix = useMemo(() => {
    if (parsed?.suffix && guitarSuffixes.includes(parsed.suffix)) return parsed.suffix
    return guitarSuffixes.includes(selectedSuffix) ? selectedSuffix : (guitarSuffixes[0] ?? 'major')
  }, [parsed, guitarSuffixes, selectedSuffix])

  const guitarPositions = useMemo(() => {
    return (db.chords[activeGuitarKey] ?? [])
      .find(e => e.suffix === activeGuitarSuffix)
      ?.positions.slice(0, 5) ?? []
  }, [activeGuitarKey, activeGuitarSuffix])

  const guitarChordLabel = `${activeGuitarKey} ${GUITAR_FRIENDLY[activeGuitarSuffix] ?? activeGuitarSuffix}`

  // ── Cavaquinho manual builder state ──
  const [savedChords, setSavedChords] = useState<SavedCavacoChord[]>(loadSavedChords)
  const [builderFrets, setBuilderFrets] = useState<[number, number, number, number]>([0, 0, 0, 0])
  const [builderBase, setBuilderBase] = useState(1)
  const [builderName, setBuilderName] = useState('')

  function toggleFret(si: number, fret: number) {
    setBuilderFrets(prev => {
      const next = [...prev] as [number, number, number, number]
      next[si] = next[si] === fret ? 0 : fret
      return next
    })
  }

  function cycleHead(si: number) {
    setBuilderFrets(prev => {
      const next = [...prev] as [number, number, number, number]
      if (next[si] > 0) next[si] = 0
      else if (next[si] === 0) next[si] = -1
      else next[si] = 0
      return next
    })
  }

  function saveChord() {
    if (!builderName.trim()) return
    const chord: SavedCavacoChord = {
      id: String(Date.now()),
      name: builderName.trim(),
      frets: [...builderFrets] as [number, number, number, number],
      baseFret: builderBase,
    }
    const next = [...savedChords, chord]
    setSavedChords(next)
    persistChords(next)
    setBuilderName('')
    setBuilderFrets([0, 0, 0, 0])
    setBuilderBase(1)
  }

  function removeChord(id: string) {
    const next = savedChords.filter(c => c.id !== id)
    setSavedChords(next)
    persistChords(next)
  }

  function loadIntoBuilder(chord: SavedCavacoChord) {
    setBuilderFrets([...chord.frets] as [number, number, number, number])
    setBuilderBase(chord.baseFret)
    setBuilderName(chord.name)
    setCavacoView('builder')
  }

  return (
    <section className="panel chord-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Dicionário de Acordes</p>
          <h3>{instrument === 'violao' ? guitarChordLabel : 'Cavaquinho'}</h3>
        </div>
        <div className="instrument-toggle">
          <button
            className={`toggle-chip ${instrument === 'violao' ? 'toggle-chip-active' : ''}`}
            onClick={() => setInstrument('violao')}
          >Violão</button>
          <button
            className={`toggle-chip ${instrument === 'cavaco' ? 'toggle-chip-active' : ''}`}
            onClick={() => setInstrument('cavaco')}
          >Cavaquinho</button>
        </div>
      </div>

      {instrument === 'violao' && (
        <>
          <div className="chord-controls">
            <label>
              <span>Buscar</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ex.: G, Dm7, Cmaj7, A dim"
              />
            </label>
            <label>
              <span>Tonalidade</span>
              <select value={activeGuitarKey} onChange={e => {
                setSelectedKey(e.target.value)
                setQuery(e.target.value)
              }}>
                {guitarKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label>
              <span>Qualidade</span>
              <select value={activeGuitarSuffix} onChange={e => setSelectedSuffix(e.target.value)}>
                {guitarSuffixes.map(s => (
                  <option key={s} value={s}>{GUITAR_FRIENDLY[s] ?? s}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="chord-header">
            <strong>{guitarChordLabel}</strong>
            <span className="muted">{guitarPositions.length} posição(ões) — E A D G B E</span>
          </div>

          <div className="chord-grid">
            {guitarPositions.length > 0 ? (
              guitarPositions.map((pos, i) => (
                <article className="chord-card" key={`g-${activeGuitarKey}-${activeGuitarSuffix}-${i}`}>
                  <Chord chord={pos} instrument={GUITAR_INSTRUMENT} lite={false} />
                  <div className="chord-card-meta">
                    <strong>Posição {i + 1}</strong>
                    <span>Casa {pos.baseFret}</span>
                  </div>
                  <div className="chord-card-actions">
                    <button
                      className="chord-action-btn"
                      onClick={e => {
                        const card = (e.target as HTMLElement).closest<HTMLElement>('.chord-card')
                        downloadCardSvg(card, `${guitarChordLabel}-pos-${i + 1}`)
                      }}
                    >
                      Baixar SVG
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <article className="chord-card chord-card-empty">
                <strong>Sem diagrama</strong>
                <span>Tente outra qualidade ou tonalidade.</span>
              </article>
            )}
          </div>
        </>
      )}

      {instrument === 'cavaco' && (
        <>
          <div className="cavaco-view-toggle">
            <button
              className={`toggle-chip ${cavacoView === 'dicionario' ? 'toggle-chip-active' : ''}`}
              onClick={() => setCavacoView('dicionario')}
            >Dicionário</button>
            <button
              className={`toggle-chip ${cavacoView === 'builder' ? 'toggle-chip-active' : ''}`}
              onClick={() => setCavacoView('builder')}
            >Builder personalizado</button>
          </div>

          {cavacoView === 'dicionario' && (
            <CavacoReferenceDictionary />
          )}

          {cavacoView === 'builder' && (
            <>
              <div className="cavaco-builder">
                <div className="cavaco-builder-left">
                  <BuilderSvg
                    frets={builderFrets}
                    baseFret={builderBase}
                    onFret={toggleFret}
                    onHead={cycleHead}
                  />
                  <p className="cavaco-builder-hint">
                    Clique nas casas para colocar / remover notas.<br />
                    Clique acima da corda para alternar aberta (o) / muda (x).
                  </p>
                </div>

                <div className="cavaco-builder-right">
                  <label className="scale-label">
                    <span>Casa base</span>
                    <select value={builderBase} onChange={e => setBuilderBase(Number(e.target.value))}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n}ª casa</option>
                      ))}
                    </select>
                  </label>

                  <label className="scale-label">
                    <span>Nome do acorde</span>
                    <input
                      value={builderName}
                      onChange={e => setBuilderName(e.target.value)}
                      placeholder="Ex.: G, Dm7, C#7..."
                      onKeyDown={e => e.key === 'Enter' && saveChord()}
                    />
                  </label>

                  <div className="cavaco-builder-actions">
                    <button
                      className="primary-button"
                      onClick={saveChord}
                      disabled={!builderName.trim()}
                    >
                      Salvar acorde
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => { setBuilderFrets([0, 0, 0, 0]); setBuilderBase(1); setBuilderName('') }}
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>

              {savedChords.length > 0 && (
                <div className="cavaco-saved-section">
                  <p className="eyebrow" style={{ marginBottom: 12 }}>
                    Acordes salvos ({savedChords.length})
                  </p>
                  <div className="chord-grid">
                    {savedChords.map(chord => (
                      <article key={chord.id} className="chord-card cavaco-diagram-card">
                        <CavacoDiagram
                          position={makePosition(chord.frets, chord.baseFret)}
                          chordName={chord.name}
                        />
                        <div className="chord-card-meta">
                          <strong>{chord.name}</strong>
                          <span>Casa {chord.baseFret}</span>
                        </div>
                        <div className="chord-card-actions">
                          <button className="chord-action-btn" onClick={() => loadIntoBuilder(chord)}>
                            Editar
                          </button>
                          <button
                            className="chord-action-btn"
                            onClick={e => {
                              const card = (e.target as HTMLElement).closest<HTMLElement>('.chord-card')
                              downloadCardSvg(card, chord.name)
                            }}
                          >
                            SVG
                          </button>
                          <button className="chord-action-btn chord-action-delete" onClick={() => removeChord(chord.id)}>
                            Remover
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {savedChords.length === 0 && (
                <p className="cavaco-empty-msg">Nenhum acorde salvo ainda. Crie o primeiro acima.</p>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
