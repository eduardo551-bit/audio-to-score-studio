import { useMemo, useState } from 'react'
import { assetUrl } from '../utils/assets'
import { useLocalStorage } from '../utils/useLocalStorage'

const NATURAL_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

type NaturalKey = (typeof NATURAL_KEYS)[number]

type ReferenceSuffix =
  | 'major'
  | 'minor'
  | '7'
  | 'maj7'
  | '9'
  | '6'
  | 'm7'
  | 'm7/9'
  | '7/9'
  | 'dim'
  | 'm7(b5)'
  | '(#5)'
  | 'm7M'
  | '6/9'
  | '7M/9'
  | '7/13'
  | '7(b13)'
  | '7/4'

interface CavacoReferenceDictionaryProps {
  onEditChord?: unknown
}

interface ReferenceFamily {
  suffix: ReferenceSuffix
  title: string
  page: number
  row: number
}

const REFERENCE_FAMILIES: ReferenceFamily[] = [
  { suffix: 'major', title: 'Maior', page: 1, row: 0 },
  { suffix: 'minor', title: 'Menor', page: 1, row: 1 },
  { suffix: '7', title: '7', page: 1, row: 2 },
  { suffix: 'maj7', title: '7M', page: 2, row: 0 },
  { suffix: '9', title: '9', page: 2, row: 1 },
  { suffix: '6', title: '6', page: 2, row: 2 },
  { suffix: 'm7', title: 'm7', page: 3, row: 0 },
  { suffix: 'm7/9', title: 'm7/9', page: 3, row: 1 },
  { suffix: '7/9', title: '7/9', page: 3, row: 2 },
  { suffix: 'dim', title: 'Diminuto', page: 4, row: 0 },
  { suffix: 'm7(b5)', title: 'm7(b5)', page: 4, row: 1 },
  { suffix: '(#5)', title: '(#5)', page: 4, row: 2 },
  { suffix: 'm7M', title: 'm7M', page: 5, row: 0 },
  { suffix: '6/9', title: '6/9', page: 5, row: 1 },
  { suffix: '7M/9', title: '7M/9', page: 5, row: 2 },
  { suffix: '7/13', title: '7/13', page: 6, row: 0 },
  { suffix: '7(b13)', title: '7(b13)', page: 6, row: 1 },
  { suffix: '7/4', title: '7/4', page: 6, row: 2 },
]

const REFERENCE_BY_SUFFIX = new Map(REFERENCE_FAMILIES.map((family) => [family.suffix, family]))

const PAGE_WIDTH = 543
const PAGE_HEIGHT = 768
const TILE_X = 18
const TILE_Y = 106
const TILE_GAP_X = 74
const TILE_GAP_Y = 203
const TILE_SCALE = 2.05

function normalizeQuery(query: string): { key: NaturalKey; suffix: ReferenceSuffix } | null {
  const clean = query.trim()
  if (!clean) return null

  const match = clean.match(/^([A-G])([#b]?)(.*)$/i)
  if (!match || match[2]) return null

  const key = match[1].toUpperCase() as NaturalKey
  if (!NATURAL_KEYS.includes(key)) return null

  const remainder = match[3].trim()
  const suffixMap: Array<[RegExp, ReferenceSuffix]> = [
    [/^(maj7|major7|7m)$/i, 'maj7'],
    [/^(m7\/9|min7\/9)$/i, 'm7/9'],
    [/^(m7\(b5\)|m7b5|ø)$/i, 'm7(b5)'],
    [/^(m7m|mmaj7|m7maj7)$/i, 'm7M'],
    [/^(7m\/9|maj7\/9|7maj9)$/i, '7M/9'],
    [/^(7\/13)$/i, '7/13'],
    [/^(7\(b13\)|7b13)$/i, '7(b13)'],
    [/^(7\/4)$/i, '7/4'],
    [/^(7\/9)$/i, '7/9'],
    [/^(6\/9)$/i, '6/9'],
    [/^(m7|min7)$/i, 'm7'],
    [/^(m|min|minor)$/i, 'minor'],
    [/^(dim|°)$/i, 'dim'],
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

function cropForChord(key: NaturalKey, row: number) {
  const column = NATURAL_KEYS.indexOf(key)
  return {
    x: TILE_X + column * TILE_GAP_X,
    y: TILE_Y + row * TILE_GAP_Y,
  }
}

export function CavacoReferenceDictionary(_: CavacoReferenceDictionaryProps = {}) {
  const [query, setQuery] = useState('G')
  const [selectedKey, setSelectedKey] = useLocalStorage<NaturalKey>('cavacodict-key', 'G')
  const [selectedSuffix, setSelectedSuffix] = useLocalStorage<ReferenceSuffix>('cavacodict-suffix', 'major')

  const parsed = useMemo(() => normalizeQuery(query), [query])
  const activeKey = parsed?.key ?? selectedKey
  const activeSuffix = parsed?.suffix ?? selectedSuffix
  const family = REFERENCE_BY_SUFFIX.get(activeSuffix)

  const preview = useMemo(() => {
    if (!family) return null
    return {
      imageSrc: assetUrl(`/cavaco/cavaco-page-${family.page}.png`),
      crop: cropForChord(activeKey, family.row),
    }
  }, [activeKey, family])

  const chordLabel = `${activeKey}${activeSuffix === 'major' ? '' : activeSuffix}`

  return (
    <section className="panel chord-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Dicionario</p>
          <h3>Acordes para Cavaquinho</h3>
        </div>
        <span className="muted">Referencia oficial · afinacao D G B D</span>
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
          <select value={activeKey} onChange={e => setSelectedKey(e.target.value as NaturalKey)}>
            {NATURAL_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
          </select>
        </label>
        <label>
          <span>Qualidade</span>
          <select value={activeSuffix} onChange={e => setSelectedSuffix(e.target.value as ReferenceSuffix)}>
            {REFERENCE_FAMILIES.map((item) => (
              <option key={item.suffix} value={item.suffix}>{item.title}</option>
            ))}
          </select>
        </label>
      </div>

      {parsed === null && query.trim() ? (
        <div className="cavaco-reference-hint">
          <strong>Busca parcial</strong>
          <span>
            A referencia oficial cobre os acordes naturais das paginas. Para sustenidos, bemois ou formas
            personalizadas, use o Builder personalizado.
          </span>
        </div>
      ) : null}

      {preview && family ? (
        <div className="cavaco-reference-card">
          <div className="chord-header">
            <strong>{chordLabel}</strong>
            <span className="muted">Pagina {family.page} · familia {family.title}</span>
          </div>

          <div className="cavaco-reference-frame" aria-label={`Referencia oficial do acorde ${chordLabel}`}>
            <img
              src={preview.imageSrc}
              alt={`Acorde ${chordLabel} na referencia oficial`}
              className="cavaco-reference-image"
              style={{
                width: `${PAGE_WIDTH * TILE_SCALE}px`,
                height: `${PAGE_HEIGHT * TILE_SCALE}px`,
                left: `${-preview.crop.x * TILE_SCALE}px`,
                top: `${-preview.crop.y * TILE_SCALE}px`,
              }}
            />
          </div>

          <p className="cavaco-reference-caption">
            Diagrama recortado diretamente das paginas corretas fornecidas por voce para evitar divergencias do banco manual.
          </p>
        </div>
      ) : (
        <article className="chord-card chord-card-empty">
          <strong>Sem referencia disponivel</strong>
          <span>Selecione um acorde natural suportado ou use o Builder personalizado.</span>
        </article>
      )}
    </section>
  )
}
