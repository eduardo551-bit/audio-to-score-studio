import { useEffect, useMemo, useRef, useState } from 'react'
import { ChordSheetViewer } from './ChordSheetViewer'
import { assetUrl } from '../utils/assets'
import { analyzeHarmony } from '../utils/harmony'
import { getSongText, transposeChordSheet, transposeKeyLabel } from '../utils/songbook'
import { useLocalStorage } from '../utils/useLocalStorage'
import type { SongbookCatalog, SongbookEntry, SongbookVersion } from '../types/songbook'

type ChordInspector = {
  chord: string
  analysisLabel?: string
  explanation?: string
  harmonicFunction?: string
}

export function StageMode() {
  const [catalog, setCatalog] = useState<SongbookCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useLocalStorage('stage-favorites-only', true)
  const [favoriteSongIds, setFavoriteSongIds] = useLocalStorage<string[]>('songbook-favorite-ids', [])
  const [setlistSongIds, setSetlistSongIds] = useLocalStorage<string[]>('songbook-setlist-ids', [])
  const [playedSongIds, setPlayedSongIds] = useLocalStorage<string[]>('stage-played-song-ids', [])
  const [songOverrides] = useLocalStorage<Record<string, string>>('songbook-text-overrides', {})
  const [selectedSongId, setSelectedSongId] = useLocalStorage<string | null>('stage-selected-song-id', null)
  const [selectedVersion, setSelectedVersion] = useLocalStorage<SongbookVersion>('stage-selected-version', 'simplificada')
  const [fontScale, setFontScale] = useLocalStorage<number>('stage-font-scale', 1.35)
  const [autoScrollEnabled, setAutoScrollEnabled] = useLocalStorage('stage-auto-scroll-enabled', false)
  const [autoScrollSpeed, setAutoScrollSpeed] = useLocalStorage<number>('stage-auto-scroll-speed', 18)
  const [transposeSteps, setTransposeSteps] = useLocalStorage<number>('stage-transpose-steps', 0)
  const [showQueue, setShowQueue] = useState(false)
  const [selectedChord, setSelectedChord] = useState<ChordInspector | null>(null)
  const stageTextRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(assetUrl('/songbook/catalog.json'))
        if (!response.ok) throw new Error('Nao foi possivel carregar o modo palco.')
        const payload = (await response.json()) as SongbookCatalog
        if (!cancelled) setCatalog(payload)
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Falha ao carregar o modo palco.'
        if (!cancelled) setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCatalog()
    return () => {
      cancelled = true
    }
  }, [])

  const entriesById = useMemo(() => new Map((catalog?.entries ?? []).map((entry) => [entry.id, entry])), [catalog])
  const setlistEntries = useMemo(() => setlistSongIds.map((id) => entriesById.get(id)).filter(Boolean) as SongbookEntry[], [entriesById, setlistSongIds])
  const availableEntries = useMemo(() => {
    const allEntries = catalog?.entries ?? []
    const normalizedQuery = query.trim().toLowerCase()
    return allEntries.filter((entry) => {
      const matchesQuery = !normalizedQuery || entry.searchText.includes(normalizedQuery)
      const matchesFavorite = !favoritesOnly || favoriteSongIds.includes(entry.id)
      return matchesQuery && matchesFavorite && !setlistSongIds.includes(entry.id)
    })
  }, [catalog, favoriteSongIds, favoritesOnly, query, setlistSongIds])

  const selectedSong = (selectedSongId ? entriesById.get(selectedSongId) : null) ?? setlistEntries[0] ?? null

  useEffect(() => {
    if (!selectedSong && setlistEntries.length > 0) setSelectedSongId(setlistEntries[0].id)
  }, [selectedSong, setSelectedSongId, setlistEntries])

  useEffect(() => {
    if (!selectedSong) return
    if (!selectedSong.availableVersions.includes(selectedVersion)) setSelectedVersion(selectedSong.availableVersions[0])
  }, [selectedSong, selectedVersion, setSelectedVersion])

  const stageVersion = selectedSong?.versions[selectedVersion] ? selectedVersion : selectedSong?.availableVersions[0] ?? 'simplificada'
  const baseStageData = selectedSong?.versions[stageVersion]
  const baseText = selectedSong && baseStageData ? getSongText(selectedSong.id, stageVersion, baseStageData.text, songOverrides) : ''
  const transposedText = useMemo(() => transposeChordSheet(baseText, transposeSteps, selectedSong?.key), [baseText, selectedSong?.key, transposeSteps])
  const analysis = useMemo(() => {
    if (!selectedSong || !transposedText) return null
    return analyzeHarmony(transposedText, transposeKeyLabel(selectedSong.key, transposeSteps))
  }, [selectedSong, transposedText, transposeSteps])

  useEffect(() => {
    const node = stageTextRef.current
    if (!node) return
    node.scrollTo({ top: 0, behavior: 'smooth' })
  }, [selectedSongId, stageVersion, transposeSteps])

  useEffect(() => {
    if (!autoScrollEnabled) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
      lastFrameRef.current = null
      return
    }

    const node = stageTextRef.current
    if (!node) return

    const step = (timestamp: number) => {
      if (lastFrameRef.current == null) lastFrameRef.current = timestamp
      const delta = timestamp - lastFrameRef.current
      lastFrameRef.current = timestamp
      const maxTop = node.scrollHeight - node.clientHeight
      if (node.scrollTop >= maxTop - 2) {
        setAutoScrollEnabled(false)
        return
      }
      node.scrollTop = Math.min(maxTop, node.scrollTop + delta * (autoScrollSpeed / 1800))
      animationFrameRef.current = requestAnimationFrame(step)
    }

    animationFrameRef.current = requestAnimationFrame(step)
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
      lastFrameRef.current = null
    }
  }, [autoScrollEnabled, autoScrollSpeed, setAutoScrollEnabled])

  function addToSetlist(songId: string) {
    if (!setlistSongIds.includes(songId)) {
      setSetlistSongIds([...setlistSongIds, songId])
      setSelectedSongId(songId)
    }
    setShowQueue(false)
  }

  function removeFromSetlist(songId: string) {
    const next = setlistSongIds.filter((id) => id !== songId)
    setSetlistSongIds(next)
    if (selectedSongId === songId) setSelectedSongId(next[0] ?? null)
  }

  function moveSong(songId: string, direction: -1 | 1) {
    const index = setlistSongIds.indexOf(songId)
    const nextIndex = index + direction
    if (index === -1 || nextIndex < 0 || nextIndex >= setlistSongIds.length) return
    const next = [...setlistSongIds]
    ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
    setSetlistSongIds(next)
  }

  function toggleFavorite(songId: string) {
    setFavoriteSongIds(favoriteSongIds.includes(songId) ? favoriteSongIds.filter((id) => id !== songId) : [...favoriteSongIds, songId])
  }

  function togglePlayed(songId: string) {
    setPlayedSongIds(playedSongIds.includes(songId) ? playedSongIds.filter((id) => id !== songId) : [...playedSongIds, songId])
  }

  function jumpScroll(direction: -1 | 1) {
    const node = stageTextRef.current
    if (!node) return
    node.scrollBy({ top: direction * node.clientHeight * 0.8, behavior: 'smooth' })
  }

  function resetScroll() {
    const node = stageTextRef.current
    if (!node) return
    node.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectedIndex = selectedSong ? setlistEntries.findIndex((entry) => entry.id === selectedSong.id) : -1
  const canGoPrev = selectedIndex > 0
  const canGoNext = selectedIndex !== -1 && selectedIndex < setlistEntries.length - 1

  if (loading) return <section className="panel stage-shell"><h3>Carregando modo palco...</h3></section>
  if (error || !catalog) return <section className="panel stage-shell"><h3>Modo palco</h3><p className="muted">{error ?? 'Modo palco indisponivel.'}</p></section>

  return (
    <section className="stage-wrap stage-wrap-mobile">
      <aside className={`panel stage-sidebar ${showQueue ? 'stage-sidebar-open' : ''}`}>
        <div className="stage-sidebar-head">
          <div>
            <p className="eyebrow">Palco</p>
            <h3>Setlist</h3>
          </div>
          <span className="muted">{setlistEntries.length} musica(s)</span>
        </div>

        <div className="stage-controls">
          <label>
            <span>Buscar musica</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Adicionar a setlist" />
          </label>
          <button className={`toggle-chip ${favoritesOnly ? 'toggle-chip-active' : ''}`} onClick={() => setFavoritesOnly(!favoritesOnly)}>
            {favoritesOnly ? 'Somente favoritas' : 'Todas disponiveis'}
          </button>
        </div>

        <div className="stage-add-list">
          {availableEntries.slice(0, 12).map((entry) => (
            <article key={entry.id} className="stage-add-item">
              <div>
                <strong>{entry.title}</strong>
                <span>{entry.artist || 'Sem artista'}</span>
              </div>
              <div className="stage-add-actions">
                <button className={`songbook-mini-btn ${favoriteSongIds.includes(entry.id) ? 'songbook-mini-btn-active' : ''}`} onClick={() => toggleFavorite(entry.id)}>
                  {favoriteSongIds.includes(entry.id) ? 'Fav' : '☆'}
                </button>
                <button className="songbook-mini-btn" onClick={() => addToSetlist(entry.id)}>Add</button>
              </div>
            </article>
          ))}
        </div>

        <div className="stage-setlist">
          {setlistEntries.map((entry, index) => (
            <article key={entry.id} className={`stage-setlist-item ${selectedSong?.id === entry.id ? 'stage-setlist-item-active' : ''} ${playedSongIds.includes(entry.id) ? 'stage-setlist-item-played' : ''}`}>
              <button className="stage-setlist-main" onClick={() => { setSelectedSongId(entry.id); setShowQueue(false) }}>
                <strong>{index + 1}. {entry.title}</strong>
                <span>{entry.artist || 'Sem artista'}</span>
                <small>{transposeKeyLabel(entry.key, transposeSteps)}</small>
              </button>
              <div className="stage-setlist-actions">
                <button className={`songbook-mini-btn ${playedSongIds.includes(entry.id) ? 'songbook-mini-btn-active' : ''}`} onClick={() => togglePlayed(entry.id)}>{playedSongIds.includes(entry.id) ? 'OK' : 'Play'}</button>
                <button className="songbook-mini-btn" onClick={() => moveSong(entry.id, -1)}>Up</button>
                <button className="songbook-mini-btn" onClick={() => moveSong(entry.id, 1)}>Down</button>
                <button className="songbook-mini-btn" onClick={() => removeFromSetlist(entry.id)}>×</button>
              </div>
            </article>
          ))}
          {setlistEntries.length === 0 && <p className="muted">Adicione musicas a setlist para tocar no modo palco.</p>}
        </div>
      </aside>

      <section className="panel stage-main">
        {selectedSong && baseStageData ? (
          <>
            <div className="stage-header">
              <div>
                <p className="eyebrow">Tocando agora</p>
                <h2>{selectedSong.title}</h2>
                <p className="muted">{selectedSong.artist || 'Sem artista'} · Tom {transposeKeyLabel(selectedSong.key, transposeSteps)}</p>
              </div>
              <div className="stage-toolbar stage-toolbar-wrap">
                <button className="toggle-chip stage-mobile-only" onClick={() => setShowQueue(!showQueue)}>{showQueue ? 'Fechar setlist' : 'Abrir setlist'}</button>
                <button className="toggle-chip" onClick={() => canGoPrev && setSelectedSongId(setlistEntries[selectedIndex - 1].id)} disabled={!canGoPrev}>Anterior</button>
                <button className="toggle-chip" onClick={() => canGoNext && setSelectedSongId(setlistEntries[selectedIndex + 1].id)} disabled={!canGoNext}>Proxima</button>
                {selectedSong.availableVersions.map((version) => (
                  <button key={version} className={`toggle-chip ${stageVersion === version ? 'toggle-chip-active' : ''}`} onClick={() => setSelectedVersion(version)}>
                    {version === 'simplificada' ? 'Simplificada' : 'Completa'}
                  </button>
                ))}
                <button className={`toggle-chip ${autoScrollEnabled ? 'toggle-chip-active' : ''}`} onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}>
                  {autoScrollEnabled ? 'Pausar scroll' : 'Auto-scroll'}
                </button>
                <button className={`toggle-chip ${playedSongIds.includes(selectedSong.id) ? 'toggle-chip-active' : ''}`} onClick={() => togglePlayed(selectedSong.id)}>
                  {playedSongIds.includes(selectedSong.id) ? 'Tocada' : 'Marcar tocada'}
                </button>
              </div>
            </div>

            <div className="stage-font-row">
              <span>Tamanho</span>
              <input type="range" min="1" max="2.2" step="0.05" value={fontScale} onChange={(event) => setFontScale(Number(event.target.value))} />
              <strong>{fontScale.toFixed(2)}x</strong>
            </div>

            <div className="stage-font-row">
              <span>Velocidade</span>
              <input type="range" min="6" max="44" step="1" value={autoScrollSpeed} onChange={(event) => setAutoScrollSpeed(Number(event.target.value))} />
              <strong>{autoScrollSpeed}</strong>
            </div>

            <div className="stage-font-row">
              <span>Transposicao</span>
              <button className="songbook-mini-btn" onClick={() => setTransposeSteps(Math.max(-11, transposeSteps - 1))}>-</button>
              <input type="range" min="-11" max="11" step="1" value={transposeSteps} onChange={(event) => setTransposeSteps(Number(event.target.value))} />
              <button className="songbook-mini-btn" onClick={() => setTransposeSteps(Math.min(11, transposeSteps + 1))}>+</button>
              <strong>{transposeSteps > 0 ? `+${transposeSteps}` : transposeSteps}</strong>
            </div>

            <div className="stage-secondary-toolbar">
              <button className="toggle-chip" onClick={resetScroll}>Topo</button>
              <button className="toggle-chip" onClick={() => jumpScroll(-1)}>Pagina -</button>
              <button className="toggle-chip" onClick={() => jumpScroll(1)}>Pagina +</button>
              <button className="toggle-chip" onClick={() => setTransposeSteps(0)}>Tom original</button>
            </div>

            <div className="stage-text" ref={stageTextRef} style={{ fontSize: `${fontScale}rem` }} onPointerDown={() => autoScrollEnabled && setAutoScrollEnabled(false)}>
              <ChordSheetViewer
                text={transposedText}
                analysis={analysis}
                className="stage-chord-sheet"
                lineClassName="stage-line"
                chordLineClassName="stage-line-chords"
                lyricLineClassName="stage-line-lyrics"
                chordButtonClassName="inline-chord-button inline-chord-button-stage"
                activeChord={selectedChord?.chord ?? null}
                onChordClick={setSelectedChord}
              />
            </div>

            {selectedChord && (
              <div className="chord-inspector chord-inspector-stage">
                <div>
                  <p className="eyebrow">Acorde clicado</p>
                  <h4>{selectedChord.chord}</h4>
                </div>
                <div className="chord-inspector-copy">
                  <span>{selectedChord.analysisLabel ?? 'Sem rotulo analitico'}</span>
                  <small>{selectedChord.harmonicFunction ?? 'Funcao nao definida'}</small>
                  <p>{selectedChord.explanation ?? 'Clique em outro acorde para ver a leitura harmonica.'}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="stage-empty"><p className="eyebrow">Palco</p><h3>Monte sua setlist</h3><p className="muted">Adicione musicas favoritas e toque com fonte grande, transposicao, auto-scroll e navegacao rapida.</p></div>
        )}
      </section>
    </section>
  )
}