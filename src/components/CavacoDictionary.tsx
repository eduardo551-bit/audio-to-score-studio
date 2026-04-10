import { useMemo, useState } from 'react'
import { CavacoDiagram } from './CavacoDiagram'
import {
  CAVACO_KEYS,
  CAVACO_SUFFIXES,
  FRIENDLY_SUFFIXES,
  getCavacoChord,
  getCavacoSuffixesForKey,
} from '../data/cavachoChords'

function normalizeQuery(query: string): { key: string; suffix: string } | null {
  const clean = query.trim()
  if (!clean) return null
  const m = clean.match(/^([A-G])([#b]?)(.*)$/i)
  if (!m) return null
  const key = `${m[1].toUpperCase()}${m[2] || ''}`
    .replace('Db', 'C#').replace('Gb', 'F#').replace('Ab', 'Ab')
    .replace('Eb', 'Eb').replace('Bb', 'Bb')
  const remainder = m[3].trim()
  const suffixMap: Array<[RegExp, string]> = [
    [/^(maj7|major7)$/i, 'maj7'],
    [/^(m7|min7)$/i, 'm7'],
    [/^(m|min|minor)$/i, 'minor'],
    [/^(7)$/, '7'],
    [/^(sus4)$/i, 'sus4'],
    [/^(sus2)$/i, 'sus2'],
    [/^(dim)$/i, 'dim'],
    [/^(aug)$/i, 'aug'],
    [/^(6)$/, '6'],
    [/^(m6)$/i, 'm6'],
    [/^(9)$/, '9'],
    [/^$/, 'major'],
  ]
  for (const [pat, suf] of suffixMap) {
    if (pat.test(remainder)) return { key, suffix: suf }
  }
  return { key, suffix: remainder || 'major' }
}

export function CavacoDictionary() {
  const [query, setQuery] = useState('G')
  const [selectedKey, setSelectedKey] = useState('G')
  const [selectedSuffix, setSelectedSuffix] = useState('major')

  const parsed = useMemo(() => normalizeQuery(query), [query])

  const activeKey = useMemo(() => {
    if (parsed?.key && CAVACO_KEYS.includes(parsed.key)) return parsed.key
    return selectedKey
  }, [parsed, selectedKey])

  const availableSuffixes = useMemo(() => getCavacoSuffixesForKey(activeKey), [activeKey])

  const activeSuffix = useMemo(() => {
    if (parsed?.suffix && availableSuffixes.includes(parsed.suffix)) return parsed.suffix
    return availableSuffixes.includes(selectedSuffix) ? selectedSuffix : (availableSuffixes[0] ?? 'major')
  }, [parsed, availableSuffixes, selectedSuffix])

  const positions = useMemo(() => {
    return getCavacoChord(activeKey, activeSuffix)?.positions ?? []
  }, [activeKey, activeSuffix])

  const chordLabel = `${activeKey} ${FRIENDLY_SUFFIXES[activeSuffix] ?? activeSuffix}`

  return (
    <section className="panel chord-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Dicionário</p>
          <h3>Acordes para Cavaquinho</h3>
        </div>
        <span className="muted">Afinação D G B D</span>
      </div>

      <div className="chord-controls">
        <label>
          <span>Buscar cifra</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ex.: G, Dm7, Cmaj7, F#7"
          />
        </label>
        <label>
          <span>Tonalidade</span>
          <select value={activeKey} onChange={e => setSelectedKey(e.target.value)}>
            {CAVACO_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label>
          <span>Qualidade</span>
          <select value={activeSuffix} onChange={e => setSelectedSuffix(e.target.value)}>
            {CAVACO_SUFFIXES.filter(s => availableSuffixes.includes(s)).map(s => (
              <option key={s} value={s}>{FRIENDLY_SUFFIXES[s] ?? s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="chord-header">
        <strong>{chordLabel}</strong>
        <span className="muted">{positions.length} posição(ões) disponível(is)</span>
      </div>

      <div className="chord-grid">
        {positions.length > 0 ? (
          positions.map((pos, i) => (
            <article className="chord-card cavaco-diagram-card" key={`${activeKey}-${activeSuffix}-${i}`}>
              <CavacoDiagram position={pos} chordName={chordLabel} />
              <div className="chord-card-meta">
                <strong>Posição {i + 1}</strong>
                <span>Casa {pos.baseFret}</span>
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
    </section>
  )
}
