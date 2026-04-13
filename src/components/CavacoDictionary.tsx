import { useMemo, useState } from 'react'
import { CavacoDiagram } from './CavacoDiagram'
import { useLocalStorage } from '../utils/useLocalStorage'

interface CavacoPosition {
  frets: [number, number, number, number]
  fingers: [number, number, number, number]
  baseFret: number
  barres?: number[]
}

interface CavacoChordEntry {
  key: string
  suffix: string
  positions: CavacoPosition[]
}

const CAVACO_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const CAVACO_SUFFIX_ORDER = [
  'major',
  'minor',
  '7',
  '7M',
  '9',
  '6',
  'm7',
  'm7/9',
  '7/9',
  'dim',
  'm7(b5)',
  '(#5)',
  'm7M',
  '6/9',
  '7M/9',
  '7/13',
  '7(b13)',
  '7/4',
] as const

const FINGERS: [number, number, number, number] = [0, 0, 0, 0]

function pos(
  frets: [number, number, number, number],
  baseFret = 1,
  barres?: number[],
): CavacoPosition {
  return { frets, fingers: FINGERS, baseFret, barres }
}

const CHORDS: CavacoChordEntry[] = [
  { key: 'C', suffix: 'major', positions: [pos([2, 0, 1, 2])] },
  { key: 'D', suffix: 'major', positions: [pos([4, 2, 3, 4])] },
  { key: 'E', suffix: 'major', positions: [pos([2, 1, 0, 2])] },
  { key: 'F', suffix: 'major', positions: [pos([3, 2, 1, 3])] },
  { key: 'G', suffix: 'major', positions: [pos([4, 3, 2, 4])] },
  { key: 'A', suffix: 'major', positions: [pos([2, 2, 2, 2], 1, [2])] },
  { key: 'B', suffix: 'major', positions: [pos([4, 4, 4, 4], 1, [4])] },

  { key: 'C', suffix: 'minor', positions: [pos([4, 4, 3, 4])] },
  { key: 'D', suffix: 'minor', positions: [pos([3, 2, 3, 3])] },
  { key: 'E', suffix: 'minor', positions: [pos([2, 0, 0, 2])] },
  { key: 'F', suffix: 'minor', positions: [pos([3, 1, 1, 3])] },
  { key: 'G', suffix: 'minor', positions: [pos([4, 3, 3, 4])] },
  { key: 'A', suffix: 'minor', positions: [pos([2, 2, 1, 2])] },
  { key: 'B', suffix: 'minor', positions: [pos([4, 4, 3, 4])] },

  { key: 'C', suffix: '7', positions: [pos([2, 3, 1, 2])] },
  { key: 'D', suffix: '7', positions: [pos([4, 2, 1, 4])] },
  { key: 'E', suffix: '7', positions: [pos([2, 1, 3, 2])] },
  { key: 'F', suffix: '7', positions: [pos([1, 2, 1, 3])] },
  { key: 'G', suffix: '7', positions: [pos([2, 3, 2, 4])] },
  { key: 'A', suffix: '7', positions: [pos([2, 0, 2, 2])] },
  { key: 'B', suffix: '7', positions: [pos([4, 2, 4, 4])] },

  { key: 'C', suffix: '7M', positions: [pos([1, 2, 1, 1])] },
  { key: 'D', suffix: '7M', positions: [pos([2, 2, 2, 4], 1, [2])] },
  { key: 'E', suffix: '7M', positions: [pos([2, 1, 0, 1])] },
  { key: 'F', suffix: '7M', positions: [pos([3, 2, 1, 2])] },
  { key: 'G', suffix: '7M', positions: [pos([4, 3, 2, 3])] },
  { key: 'A', suffix: '7M', positions: [pos([3, 2, 1, 2], 5)] },
  { key: 'B', suffix: '7M', positions: [pos([1, 1, 1, 4], 4, [1])] },

  { key: 'C', suffix: '9', positions: [pos([2, 1, 3, 0])] },
  { key: 'D', suffix: '9', positions: [pos([4, 2, 3, 2], 1, [2])] },
  { key: 'E', suffix: '9', positions: [pos([2, 1, 2, 4])] },
  { key: 'F', suffix: '9', positions: [pos([3, 2, 1, 0])] },
  { key: 'G', suffix: '9', positions: [pos([3, 2, 1, 4], 3)] },
  { key: 'A', suffix: '9', positions: [pos([2, 2, 2, 3], 1, [2])] },
  { key: 'B', suffix: '9', positions: [pos([1, 1, 1, 3], 4, [1])] },

  { key: 'C', suffix: '6', positions: [pos([1, 1, 1, 4], 5, [1])] },
  { key: 'D', suffix: '6', positions: [pos([4, 2, 0, 0])] },
  { key: 'E', suffix: '6', positions: [pos([2, 1, 2, 2])] },
  { key: 'F', suffix: '6', positions: [pos([3, 2, 1, 0])] },
  { key: 'G', suffix: '6', positions: [pos([4, 3, 2, 4])] },
  { key: 'A', suffix: '6', positions: [pos([2, 2, 2, 2], 1, [2])] },
  { key: 'B', suffix: '6', positions: [pos([1, 1, 1, 4], 4, [1])] },

  { key: 'C', suffix: 'm7', positions: [pos([4, 3, 2, 4])] },
  { key: 'D', suffix: 'm7', positions: [pos([3, 2, 1, 0])] },
  { key: 'E', suffix: 'm7', positions: [pos([2, 0, 0, 0])] },
  { key: 'F', suffix: 'm7', positions: [pos([1, 1, 1, 1], 1, [1])] },
  { key: 'G', suffix: 'm7', positions: [pos([2, 2, 2, 2], 5, [2])] },
  { key: 'A', suffix: 'm7', positions: [pos([2, 2, 2, 2], 5, [2])] },
  { key: 'B', suffix: 'm7', positions: [pos([3, 1, 2, 0])] },

  { key: 'C', suffix: 'm7/9', positions: [pos([1, 3, 1, 0])] },
  { key: 'D', suffix: 'm7/9', positions: [pos([2, 4, 2, 1])] },
  { key: 'E', suffix: 'm7/9', positions: [pos([2, 0, 3, 4])] },
  { key: 'F', suffix: 'm7/9', positions: [pos([2, 1, 3, 4], 3)] },
  { key: 'G', suffix: 'm7/9', positions: [pos([2, 1, 3, 4], 3)] },
  { key: 'A', suffix: 'm7/9', positions: [pos([2, 1, 3, 4], 5)] },
  { key: 'B', suffix: 'm7/9', positions: [pos([2, 1, 3, 4], 7)] },

  { key: 'C', suffix: '7/9', positions: [pos([2, 3, 3, 4])] },
  { key: 'D', suffix: '7/9', positions: [pos([1, 2, 2, 4], 4)] },
  { key: 'E', suffix: '7/9', positions: [pos([2, 1, 3, 4])] },
  { key: 'F', suffix: '7/9', positions: [pos([3, 2, 4, 0])] },
  { key: 'G', suffix: '7/9', positions: [pos([2, 1, 3, 4], 4)] },
  { key: 'A', suffix: '7/9', positions: [pos([2, 1, 3, 4], 6)] },
  { key: 'B', suffix: '7/9', positions: [pos([1, 2, 2, 4])] },

  { key: 'C', suffix: 'dim', positions: [pos([3, 2, 1, 0], 2)] },
  { key: 'D', suffix: 'dim', positions: [pos([2, 1, 0, 0])] },
  { key: 'E', suffix: 'dim', positions: [pos([4, 3, 2, 1])] },
  { key: 'F', suffix: 'dim', positions: [pos([2, 1, 0, 0])] },
  { key: 'G', suffix: 'dim', positions: [pos([4, 3, 2, 1])] },
  { key: 'A', suffix: 'dim', positions: [pos([3, 2, 1, 0], 2)] },
  { key: 'B', suffix: 'dim', positions: [pos([2, 1, 0, 0])] },

  { key: 'C', suffix: 'm7(b5)', positions: [pos([4, 3, 2, 1], 2)] },
  { key: 'D', suffix: 'm7(b5)', positions: [pos([4, 3, 2, 1], 3)] },
  { key: 'E', suffix: 'm7(b5)', positions: [pos([2, 3, 3, 4])] },
  { key: 'F', suffix: 'm7(b5)', positions: [pos([1, 2, 2, 4], 3)] },
  { key: 'G', suffix: 'm7(b5)', positions: [pos([4, 3, 2, 4])] },
  { key: 'A', suffix: 'm7(b5)', positions: [pos([4, 3, 2, 4], 4)] },
  { key: 'B', suffix: 'm7(b5)', positions: [pos([3, 2, 1, 0])] },

  { key: 'C', suffix: '(#5)', positions: [pos([2, 1, 1, 2])] },
  { key: 'D', suffix: '(#5)', positions: [pos([4, 3, 3, 4])] },
  { key: 'E', suffix: '(#5)', positions: [pos([2, 1, 1, 2])] },
  { key: 'F', suffix: '(#5)', positions: [pos([4, 2, 2, 4])] },
  { key: 'G', suffix: '(#5)', positions: [pos([4, 3, 3, 4])] },
  { key: 'A', suffix: '(#5)', positions: [pos([4, 2, 2, 4])] },
  { key: 'B', suffix: '(#5)', positions: [pos([4, 3, 3, 4])] },

  { key: 'C', suffix: 'm7M', positions: [pos([4, 3, 3, 4])] },
  { key: 'D', suffix: 'm7M', positions: [pos([2, 1, 1, 2])] },
  { key: 'E', suffix: 'm7M', positions: [pos([2, 1, 0, 1])] },
  { key: 'F', suffix: 'm7M', positions: [pos([1, 1, 1, 2], 3, [1])] },
  { key: 'G', suffix: 'm7M', positions: [pos([4, 3, 2, 1])] },
  { key: 'A', suffix: 'm7M', positions: [pos([3, 2, 1, 2], 5, [1])] },
  { key: 'B', suffix: 'm7M', positions: [pos([3, 2, 2, 3])] },

  { key: 'C', suffix: '6/9', positions: [pos([1, 1, 2, 4], 2, [1])] },
  { key: 'D', suffix: '6/9', positions: [pos([1, 2, 3, 4], 4, [1])] },
  { key: 'E', suffix: '6/9', positions: [pos([2, 1, 2, 4])] },
  { key: 'F', suffix: '6/9', positions: [pos([3, 2, 3, 4])] },
  { key: 'G', suffix: '6/9', positions: [pos([2, 1, 2, 4], 4)] },
  { key: 'A', suffix: '6/9', positions: [pos([2, 1, 2, 4], 6)] },
  { key: 'B', suffix: '6/9', positions: [pos([1, 1, 2, 4], 4, [1])] },

  { key: 'C', suffix: '7M/9', positions: [pos([2, 3, 4, 0])] },
  { key: 'D', suffix: '7M/9', positions: [pos([1, 2, 3, 4], 4)] },
  { key: 'E', suffix: '7M/9', positions: [pos([2, 3, 4, 0], 6)] },
  { key: 'F', suffix: '7M/9', positions: [pos([3, 2, 4, 4])] },
  { key: 'G', suffix: '7M/9', positions: [pos([2, 3, 4, 4], 4)] },
  { key: 'A', suffix: '7M/9', positions: [pos([2, 3, 4, 4], 6)] },
  { key: 'B', suffix: '7M/9', positions: [pos([1, 2, 3, 0])] },

  { key: 'C', suffix: '7/13', positions: [pos([1, 3, 3, 4], 3)] },
  { key: 'D', suffix: '7/13', positions: [pos([1, 3, 3, 4], 5)] },
  { key: 'E', suffix: '7/13', positions: [pos([1, 2, 2, 2])] },
  { key: 'F', suffix: '7/13', positions: [pos([1, 2, 3, 3])] },
  { key: 'G', suffix: '7/13', positions: [pos([2, 3, 4, 4])] },
  { key: 'A', suffix: '7/13', positions: [pos([1, 2, 3, 3], 5)] },
  { key: 'B', suffix: '7/13', positions: [pos([1, 3, 3, 4], 2)] },

  { key: 'C', suffix: '7(b13)', positions: [pos([1, 3, 3, 4], 3)] },
  { key: 'D', suffix: '7(b13)', positions: [pos([1, 3, 3, 4], 5)] },
  { key: 'E', suffix: '7(b13)', positions: [pos([1, 1, 2, 2])] },
  { key: 'F', suffix: '7(b13)', positions: [pos([1, 2, 2, 3])] },
  { key: 'G', suffix: '7(b13)', positions: [pos([2, 3, 3, 4])] },
  { key: 'A', suffix: '7(b13)', positions: [pos([1, 2, 2, 3], 5)] },
  { key: 'B', suffix: '7(b13)', positions: [pos([2, 1, 3, 4])] },

  { key: 'C', suffix: '7/4', positions: [pos([1, 3, 3, 4], 3)] },
  { key: 'D', suffix: '7/4', positions: [pos([2, 1, 3, 4], 5)] },
  { key: 'E', suffix: '7/4', positions: [pos([2, 1, 1, 2])] },
  { key: 'F', suffix: '7/4', positions: [pos([1, 3, 3, 4])] },
  { key: 'G', suffix: '7/4', positions: [pos([2, 3, 4, 4])] },
  { key: 'A', suffix: '7/4', positions: [pos([1, 2, 3, 3], 5)] },
  { key: 'B', suffix: '7/4', positions: [pos([3, 2, 3, 4])] },
]

const FRIENDLY_SUFFIXES: Record<string, string> = {
  major: 'Maior',
  minor: 'Menor',
  '7': '7',
  '7M': '7M',
  '9': '9',
  '6': '6',
  m7: 'm7',
  'm7/9': 'm7/9',
  '7/9': '7/9',
  dim: 'Diminuto',
  'm7(b5)': 'm7(b5)',
  '(#5)': '(#5)',
  m7M: 'm7M',
  '6/9': '6/9',
  '7M/9': '7M/9',
  '7/13': '7/13',
  '7(b13)': '7(b13)',
  '7/4': '7/4',
}

function getCavacoChord(key: string, suffix: string): CavacoChordEntry | undefined {
  return CHORDS.find((entry) => entry.key === key && entry.suffix === suffix)
}

function getCavacoSuffixesForKey(key: string): string[] {
  return CHORDS.filter((entry) => entry.key === key).map((entry) => entry.suffix)
}

function normalizeQuery(query: string): { key: string; suffix: string } | null {
  const clean = query.trim()
  if (!clean) return null
  const match = clean.match(/^([A-G])([#b]?)(.*)$/i)
  if (!match || match[2]) return null

  const key = match[1].toUpperCase()
  const remainder = match[3].trim()
  const suffixMap: Array<[RegExp, string]> = [
    [/^(m7\(b5\)|m7b5)$/i, 'm7(b5)'],
    [/^(m7\/9|min7\/9)$/i, 'm7/9'],
    [/^(7m\/9|7maj9|7m9)$/i, '7M/9'],
    [/^(7\(b13\)|7b13)$/i, '7(b13)'],
    [/^(7\/13)$/i, '7/13'],
    [/^(7\/9)$/i, '7/9'],
    [/^(7\/4)$/i, '7/4'],
    [/^(6\/9)$/i, '6/9'],
    [/^(m7m|mmaj7|m7maj7)$/i, 'm7M'],
    [/^(7m|maj7|major7)$/i, '7M'],
    [/^(m7|min7)$/i, 'm7'],
    [/^(m|min|minor)$/i, 'minor'],
    [/^(dim|diminuto|°)$/i, 'dim'],
    [/^(\(#5\)|#5|aug)$/i, '(#5)'],
    [/^(9)$/i, '9'],
    [/^(6)$/i, '6'],
    [/^(7)$/i, '7'],
    [/^$/, 'major'],
  ]

  for (const [pattern, suffix] of suffixMap) {
    if (pattern.test(remainder)) return { key, suffix }
  }

  return null
}

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
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filename}.svg`
  anchor.click()
  URL.revokeObjectURL(url)
}

interface CavacoDictionaryProps {
  onEditChord?: (pos: CavacoPosition, name: string) => void
}

export function CavacoDictionary({ onEditChord }: CavacoDictionaryProps = {}) {
  const [query, setQuery] = useState('G')
  const [selectedKey, setSelectedKey] = useLocalStorage('cavacodict-key', 'G')
  const [selectedSuffix, setSelectedSuffix] = useLocalStorage('cavacodict-suffix', 'major')

  const parsed = useMemo(() => normalizeQuery(query), [query])

  const activeKey = useMemo(() => {
    if (parsed?.key && CAVACO_KEYS.includes(parsed.key)) return parsed.key
    return selectedKey
  }, [parsed, selectedKey])

  const availableSuffixes = useMemo(() => getCavacoSuffixesForKey(activeKey), [activeKey])

  const activeSuffix = useMemo(() => {
    if (parsed?.suffix && availableSuffixes.includes(parsed.suffix)) return parsed.suffix
    return availableSuffixes.includes(selectedSuffix) ? selectedSuffix : 'major'
  }, [parsed, availableSuffixes, selectedSuffix])

  const positions = useMemo(() => getCavacoChord(activeKey, activeSuffix)?.positions ?? [], [activeKey, activeSuffix])
  const chordLabel = `${activeKey} ${FRIENDLY_SUFFIXES[activeSuffix] ?? activeSuffix}`

  return (
    <section className="panel chord-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Dicionario</p>
          <h3>Acordes para Cavaquinho</h3>
        </div>
        <span className="muted">Reconstrucao por paginas · afinacao D G B D</span>
      </div>

      <div className="chord-controls">
        <label>
          <span>Buscar cifra</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ex.: G, Dm7, C7/9, Fm7(b5)"
          />
        </label>
        <label>
          <span>Tonalidade</span>
          <select value={activeKey} onChange={e => setSelectedKey(e.target.value)}>
            {CAVACO_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
          </select>
        </label>
        <label>
          <span>Qualidade</span>
          <select value={activeSuffix} onChange={e => setSelectedSuffix(e.target.value)}>
            {CAVACO_SUFFIX_ORDER.filter((suffix) => availableSuffixes.includes(suffix)).map((suffix) => (
              <option key={suffix} value={suffix}>{FRIENDLY_SUFFIXES[suffix] ?? suffix}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="chord-header">
        <strong>{chordLabel}</strong>
        <span className="muted">Pagina 1 validada · paginas 2 a 6 reconstruidas localmente</span>
      </div>

      <div className="chord-grid">
        {positions.length > 0 ? (
          positions.map((position, index) => (
            <article className="chord-card cavaco-diagram-card" key={`${activeKey}-${activeSuffix}-${index}`}>
              <CavacoDiagram position={position} chordName={chordLabel} />
              <div className="chord-card-meta">
                <strong>Posicao {index + 1}</strong>
                <span>
                  {position.baseFret > 1 ? `${position.baseFret}a casa base` : 'Primeira posicao'}
                </span>
              </div>
              <div className="chord-card-actions">
                {onEditChord && (
                  <button className="chord-action-btn" onClick={() => onEditChord(position, activeKey)}>
                    Editar
                  </button>
                )}
                <button
                  className="chord-action-btn"
                  onClick={(event) => {
                    const card = (event.target as HTMLElement).closest<HTMLElement>('.chord-card')
                    downloadCardSvg(card, `${activeKey}-${activeSuffix}`)
                  }}
                >
                  SVG
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="chord-card chord-card-empty">
            <strong>Sem diagrama</strong>
            <span>Essa combinacao ainda nao foi mapeada nesta reconstrucao.</span>
          </article>
        )}
      </div>
    </section>
  )
}
