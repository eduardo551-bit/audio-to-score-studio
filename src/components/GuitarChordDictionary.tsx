import { useMemo, useState } from 'react'
import Chord from '@techies23/react-chords'
import guitarDb from '@tombatossals/chords-db/lib/guitar.json'

type GuitarDb = {
  tunings: { standard: string[] }
  main: { strings: number; fretsOnChord: number }
  keys: string[]
  suffixes: string[]
  chords: Record<string, Array<{ key: string; suffix: string; positions: Array<{
    frets: number[]
    fingers: number[]
    barres?: number[]
    capo?: boolean
    baseFret: number
  }> }>>
}

const db = guitarDb as GuitarDb

const INSTRUMENT = {
  strings: db.main.strings,
  fretsOnChord: db.main.fretsOnChord,
  tunings: {
    standard: db.tunings.standard,
  },
}

const FRIENDLY_SUFFIXES: Record<string, string> = {
  major: 'Maior',
  minor: 'Menor',
  maj7: 'Maj7',
  m7: 'm7',
  '7': '7',
  sus4: 'Sus4',
  sus2: 'Sus2',
  dim: 'Diminuto',
  add9: 'Add9',
  '6': '6',
  '9': '9',
  m6: 'm6',
  m9: 'm9',
  aug: 'Aumentado',
  'm7/9': 'm7/9',
}

function normalizeQuery(query: string): { key: string; suffix: string } | null {
  const clean = query.trim()
  if (!clean) return null

  const match = clean.match(/^([A-G])([#b]?)(.*)$/i)
  if (!match) return null

  const key = `${match[1].toUpperCase()}${match[2] || ''}`
  const remainder = match[3].trim()
  const suffixMap: Array<[RegExp, string]> = [
    [/^(m7\/9|min7\/9)$/i, 'm7/9'],
    [/^(maj7|major7)$/i, 'maj7'],
    [/^(7m|m7\+|7maj)$/i, 'maj7'],
    [/^(m7|min7)$/i, 'm7'],
    [/^(m|min|minor)$/i, 'minor'],
    [/^(7)$/i, '7'],
    [/^(sus4)$/i, 'sus4'],
    [/^(sus2)$/i, 'sus2'],
    [/^(dim)$/i, 'dim'],
    [/^(add9)$/i, 'add9'],
    [/^(6)$/i, '6'],
    [/^(9)$/i, '9'],
    [/^$/i, 'major'],
  ]

  for (const [pattern, suffix] of suffixMap) {
    if (pattern.test(remainder)) return { key, suffix }
  }

  return { key, suffix: remainder || 'major' }
}

export function GuitarChordDictionary() {
  const [query, setQuery] = useState('G')
  const [selectedKey, setSelectedKey] = useState('G')
  const [selectedSuffix, setSelectedSuffix] = useState('major')

  const parsed = useMemo(() => normalizeQuery(query), [query])
  const activeKey = parsed?.key && db.chords[parsed.key] ? parsed.key : selectedKey

  const availableSuffixes = useMemo(() => {
    return (db.chords[activeKey] ?? []).map((entry) => entry.suffix)
  }, [activeKey])

  const activeSuffix = useMemo(() => {
    if (parsed?.suffix && availableSuffixes.includes(parsed.suffix)) {
      return parsed.suffix
    }

    return availableSuffixes.includes(selectedSuffix) ? selectedSuffix : (availableSuffixes[0] ?? 'major')
  }, [availableSuffixes, parsed?.suffix, selectedSuffix])

  const positions = useMemo(() => {
    const chordEntry = (db.chords[activeKey] ?? []).find((entry) => entry.suffix === activeSuffix)
    return chordEntry?.positions.slice(0, 6) ?? []
  }, [activeKey, activeSuffix])

  const instrumentKeys = db.keys
  const instrumentLabel = 'violao'
  const instrumentBadge = 'Base aberta de diagramas'
  const instrumentConfig = INSTRUMENT
  const suffixOptions = availableSuffixes

  return (
    <section className="panel chord-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Dicionario</p>
          <h3>Acordes para violao</h3>
        </div>
        <span className="muted">{instrumentBadge}</span>
      </div>

      <div className="chord-controls">
        <label>
          <span>Buscar cifra</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: G, Dm7, Cmaj7, F#7"
          />
        </label>
        <label>
          <span>Tonalidade</span>
          <select value={activeKey} onChange={(event) => setSelectedKey(event.target.value)}>
            {instrumentKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Qualidade</span>
          <select value={activeSuffix} onChange={(event) => setSelectedSuffix(event.target.value)}>
            {suffixOptions.map((suffix) => (
              <option key={suffix} value={suffix}>
                {FRIENDLY_SUFFIXES[suffix] ?? suffix}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chord-header">
        <strong>
          {activeKey} {FRIENDLY_SUFFIXES[activeSuffix] ?? activeSuffix}
        </strong>
        <span className="muted">
          {positions.length} desenho(s) sugerido(s) para {instrumentLabel}
        </span>
      </div>

      <div className="chord-grid">
        {positions.length > 0 ? (
          positions.map((position, index) => (
            <article className="chord-card" key={`${activeKey}-${activeSuffix}-${position.baseFret}-${index}`}>
              <Chord chord={position} instrument={instrumentConfig} lite={false} />
              <div className="chord-card-meta">
                <strong>Posicao {index + 1}</strong>
                <span>Casa base {position.baseFret}</span>
              </div>
            </article>
          ))
        ) : (
          <article className="chord-card chord-card-empty">
            <strong>Sem desenho disponivel</strong>
            <span>
              Essa combinacao ainda nao entrou no dicionario de {instrumentLabel}. Teste outra
              qualidade ou tonalidade.
            </span>
          </article>
        )}
      </div>
    </section>
  )
}
