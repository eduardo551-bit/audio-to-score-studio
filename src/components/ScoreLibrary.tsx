import { useEffect, useMemo, useState } from 'react'
import { assetUrl } from '../utils/assets'

type ScoreLibraryArtist = {
  tag: string
  label: string
  count: number
}

type ScoreLibraryEntry = {
  id: string
  order: number
  title: string
  titleSlug: string
  artistTag: string
  artistLabel: string
  collaboratorTags: string[]
  collaboratorLabels: string[]
  arrangement: string | null
  caption: string
  postUrl: string
  pageCount: number
  pages: string[]
  takenAt: number
  takenAtIso: string | null
  searchText: string
}

type ScoreLibraryCatalog = {
  generatedAt: string
  profile: string
  entryCount: number
  pageCount: number
  artists: ScoreLibraryArtist[]
  entries: ScoreLibraryEntry[]
}

function formatTag(tag: string) {
  return `#${tag}`
}

export function ScoreLibrary() {
  const [catalog, setCatalog] = useState<ScoreLibraryCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedArtist, setSelectedArtist] = useState('todos')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(assetUrl('/score-library/catalog.json'))
        if (!response.ok) {
          throw new Error('Não foi possível carregar a biblioteca de partituras.')
        }
        const payload = (await response.json()) as ScoreLibraryCatalog
        if (!cancelled) {
          setCatalog(payload)
        }
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Falha ao carregar a biblioteca.'
        if (!cancelled) {
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadCatalog()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredEntries = useMemo(() => {
    if (!catalog) return []
    const normalizedQuery = query.trim().toLowerCase()

    return catalog.entries.filter((entry) => {
      const matchesArtist = selectedArtist === 'todos' || entry.artistTag === selectedArtist
      const matchesQuery = !normalizedQuery || entry.searchText.includes(normalizedQuery)
      return matchesArtist && matchesQuery
    })
  }, [catalog, query, selectedArtist])

  useEffect(() => {
    if (!filteredEntries.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filteredEntries.some((entry) => entry.id === selectedId)) {
      setSelectedId(filteredEntries[0].id)
    }
  }, [filteredEntries, selectedId])

  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedId) ?? filteredEntries[0] ?? null

  if (loading) {
    return (
      <section className="panel score-library-panel">
        <p className="eyebrow">Biblioteca</p>
        <h3>Carregando partituras...</h3>
      </section>
    )
  }

  if (error || !catalog) {
    return (
      <section className="panel score-library-panel">
        <p className="eyebrow">Biblioteca</p>
        <h3>Partituras do Instagram</h3>
        <p className="muted">{error ?? 'Biblioteca indisponível no momento.'}</p>
      </section>
    )
  }

  return (
    <section className="score-library-wrap">
      <section className="panel score-library-panel">
        <div className="score-library-head">
          <div>
            <p className="eyebrow">Biblioteca</p>
            <h3>Partituras do Instagram</h3>
            <p className="muted">
              {catalog.entryCount} músicas organizadas por cantor ou grupo, com {catalog.pageCount} páginas.
            </p>
          </div>
          <div className="score-library-stats">
            <div>
              <strong>{catalog.artists.length}</strong>
              <span>artistas</span>
            </div>
            <div>
              <strong>{catalog.entryCount}</strong>
              <span>partituras</span>
            </div>
            <div>
              <strong>{catalog.pageCount}</strong>
              <span>páginas</span>
            </div>
          </div>
        </div>

        <div className="score-library-controls">
          <label>
            <span>Buscar música ou artista</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Ex.: "Foca na Gente", "Thiaguinho", "Ferrugem"'
            />
          </label>

          <label>
            <span>Filtrar por cantor ou grupo</span>
            <select value={selectedArtist} onChange={(event) => setSelectedArtist(event.target.value)}>
              <option value="todos">Todos os artistas</option>
              {catalog.artists.map((artist) => (
                <option key={artist.tag} value={artist.tag}>
                  {artist.label} ({artist.count})
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="score-library-layout">
        <aside className="panel score-library-list">
          <div className="score-library-list-head">
            <strong>{filteredEntries.length} resultado(s)</strong>
            <span className="muted">Selecione uma partitura para visualizar.</span>
          </div>

          <div className="score-library-items">
            {filteredEntries.map((entry) => (
              <button
                key={entry.id}
                className={`score-library-item ${selectedEntry?.id === entry.id ? 'score-library-item-active' : ''}`}
                onClick={() => setSelectedId(entry.id)}
              >
                <strong>{entry.title}</strong>
                <span>{entry.artistLabel}</span>
                <small>{formatTag(entry.artistTag)}</small>
                {entry.collaboratorLabels.length > 0 && (
                  <small>Feat. {entry.collaboratorLabels.join(', ')}</small>
                )}
                <small>{entry.pageCount} página(s)</small>
              </button>
            ))}

            {filteredEntries.length === 0 && (
              <article className="score-library-empty">
                <strong>Nenhuma partitura encontrada</strong>
                <span>Tente outro nome de música, cantor ou grupo.</span>
              </article>
            )}
          </div>
        </aside>

        <section className="panel score-library-viewer">
          {selectedEntry ? (
            <>
              <div className="score-viewer-head">
                <div>
                  <p className="eyebrow">Selecionada</p>
                  <h3>{selectedEntry.title}</h3>
                  <p className="muted">
                    {selectedEntry.artistLabel} <span className="score-inline-tag">{formatTag(selectedEntry.artistTag)}</span>
                  </p>
                </div>
                <div className="score-viewer-actions">
                  <a
                    className="secondary-button"
                    href={selectedEntry.postUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir post original
                  </a>
                </div>
              </div>

              <div className="score-chip-row">
                <span>{selectedEntry.pageCount} página(s)</span>
                {selectedEntry.collaboratorLabels.map((label, index) => (
                  <span key={`${label}-${index}`}>Feat. {label}</span>
                ))}
                {selectedEntry.arrangement && <span>Arranjo: {selectedEntry.arrangement}</span>}
              </div>

              <p className="score-caption">{selectedEntry.caption}</p>

              <div className="score-pages">
                {selectedEntry.pages.map((page, index) => (
                  <a
                    key={page}
                    className="score-page-card"
                    href={assetUrl(page)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={assetUrl(page)}
                      alt={`${selectedEntry.title} - página ${index + 1}`}
                      loading="lazy"
                    />
                    <span>Página {index + 1}</span>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <div className="score-library-empty-viewer">
              <p className="eyebrow">Biblioteca</p>
              <h3>Escolha uma partitura</h3>
              <p className="muted">A lista ao lado mostra as músicas organizadas por cantor ou grupo.</p>
            </div>
          )}
        </section>
      </section>
    </section>
  )
}
