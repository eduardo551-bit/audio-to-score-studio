import { useEffect, useMemo, useState } from 'react'
import { ChordSheetViewer } from './ChordSheetViewer'
import { assetUrl } from '../utils/assets'
import { analyzeHarmony, buildHarmonicField } from '../utils/harmony'
import { getOverrideKey, getSongText } from '../utils/songbook'
import { useLocalStorage } from '../utils/useLocalStorage'
import type { SongbookCatalog, SongbookVersion } from '../types/songbook'

type ChordInspector = {
  chord: string
  analysisLabel?: string
  explanation?: string
  harmonicFunction?: string
}

export function SongbookLibrary() {
  const [catalog, setCatalog] = useState<SongbookCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [artistFilter, setArtistFilter] = useState('todos')
  const [keyFilter, setKeyFilter] = useState('todos')
  const [versionFilter, setVersionFilter] = useLocalStorage<'todas' | SongbookVersion>('songbook-version-filter', 'todas')
  const [favoritesOnly, setFavoritesOnly] = useLocalStorage('songbook-favorites-only', false)
  const [favoriteSongIds, setFavoriteSongIds] = useLocalStorage<string[]>('songbook-favorite-ids', [])
  const [setlistSongIds, setSetlistSongIds] = useLocalStorage<string[]>('songbook-setlist-ids', [])
  const [songOverrides, setSongOverrides] = useLocalStorage<Record<string, string>>('songbook-text-overrides', {})
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useLocalStorage<SongbookVersion>('songbook-selected-version', 'simplificada')
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [selectedChord, setSelectedChord] = useState<ChordInspector | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(assetUrl('/songbook/catalog.json'))
        if (!response.ok) throw new Error('Nao foi possivel carregar o repertorio.')
        const payload = (await response.json()) as SongbookCatalog
        if (!cancelled) setCatalog(payload)
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Falha ao carregar o repertorio.'
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

  const filteredEntries = useMemo(() => {
    if (!catalog) return []
    const normalizedQuery = query.trim().toLowerCase()
    return catalog.entries.filter((entry) => {
      const matchesQuery = !normalizedQuery || entry.searchText.includes(normalizedQuery)
      const matchesArtist = artistFilter === 'todos' || entry.artist === artistFilter
      const matchesKey = keyFilter === 'todos' || (entry.key ?? 'Sem tom') === keyFilter
      const matchesVersion = versionFilter === 'todas' || entry.availableVersions.includes(versionFilter)
      const matchesFavorite = !favoritesOnly || favoriteSongIds.includes(entry.id)
      return matchesQuery && matchesArtist && matchesKey && matchesVersion && matchesFavorite
    })
  }, [artistFilter, catalog, favoriteSongIds, favoritesOnly, keyFilter, query, versionFilter])

  useEffect(() => {
    if (!filteredEntries.length) {
      setSelectedSongId(null)
      return
    }
    if (!selectedSongId || !filteredEntries.some((entry) => entry.id === selectedSongId)) {
      setSelectedSongId(filteredEntries[0].id)
    }
  }, [filteredEntries, selectedSongId])

  const selectedSong = filteredEntries.find((entry) => entry.id === selectedSongId) ?? filteredEntries[0] ?? null

  useEffect(() => {
    if (!selectedSong) return
    if (!selectedSong.availableVersions.includes(selectedVersion)) {
      setSelectedVersion(selectedSong.availableVersions[0])
    }
  }, [selectedSong, selectedVersion, setSelectedVersion])

  const activeVersion = selectedSong?.versions[selectedVersion] ? selectedVersion : selectedSong?.availableVersions[0] ?? 'simplificada'
  const baseVersionData = selectedSong?.versions[activeVersion]
  const currentText = selectedSong && baseVersionData
    ? getSongText(selectedSong.id, activeVersion, baseVersionData.text, songOverrides)
    : ''

  useEffect(() => {
    setDraftText(currentText)
  }, [currentText, selectedSongId, activeVersion])

  const analysis = useMemo(() => {
    if (!selectedSong || !currentText) return null
    return analyzeHarmony(currentText, selectedSong.key)
  }, [currentText, selectedSong])

  const harmonicField = useMemo(() => {
    if (!analysis) return []
    return buildHarmonicField(analysis.summary.detectedKey, analysis)
  }, [analysis])

  function toggleFavorite(songId: string) {
    setFavoriteSongIds(
      favoriteSongIds.includes(songId)
        ? favoriteSongIds.filter((id) => id !== songId)
        : [...favoriteSongIds, songId],
    )
  }

  function addToSetlist(songId: string) {
    if (!setlistSongIds.includes(songId)) {
      setSetlistSongIds([...setlistSongIds, songId])
    }
  }

  function saveEdit() {
    if (!selectedSong) return
    const key = getOverrideKey(selectedSong.id, activeVersion)
    setSongOverrides({ ...songOverrides, [key]: draftText })
    setEditing(false)
  }

  function resetEdit() {
    if (!selectedSong || !baseVersionData) return
    const key = getOverrideKey(selectedSong.id, activeVersion)
    const nextOverrides = { ...songOverrides }
    delete nextOverrides[key]
    setSongOverrides(nextOverrides)
    setDraftText(baseVersionData.text)
    setEditing(false)
  }

  if (loading) {
    return <section className="panel songbook-panel"><p className="eyebrow">Repertorio</p><h3>Carregando repertorio...</h3></section>
  }

  if (error || !catalog) {
    return <section className="panel songbook-panel"><p className="eyebrow">Repertorio</p><h3>Repertorio</h3><p className="muted">{error ?? 'Repertorio indisponivel.'}</p></section>
  }

  return (
    <section className="songbook-wrap songbook-wrap-mobile">
      <section className="panel songbook-panel">
        <div className="songbook-head">
          <div>
            <p className="eyebrow">Repertorio</p>
            <h3>Repertorio pra Churrasco</h3>
            <p className="muted">{catalog.songCount} musicas prontas para estudo e palco.</p>
          </div>
          <div className="songbook-stats">
            <div><strong>{catalog.songCount}</strong><span>musicas</span></div>
            <div><strong>{favoriteSongIds.length}</strong><span>favoritas</span></div>
            <div><strong>{setlistSongIds.length}</strong><span>setlist</span></div>
          </div>
        </div>

        <div className="songbook-filters songbook-filters-extended">
          <label>
            <span>Buscar por nome</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Ex.: "Conselho" ou "Thiaguinho"' />
          </label>

          <label>
            <span>Artista</span>
            <select value={artistFilter} onChange={(event) => setArtistFilter(event.target.value)}>
              <option value="todos">Todos</option>
              {catalog.artists.map((artist) => <option key={artist} value={artist}>{artist}</option>)}
            </select>
          </label>

          <label>
            <span>Tom</span>
            <select value={keyFilter} onChange={(event) => setKeyFilter(event.target.value)}>
              <option value="todos">Todos</option>
              {catalog.keys.map((key) => <option key={key} value={key}>{key}</option>)}
            </select>
          </label>

          <label>
            <span>Versao</span>
            <select value={versionFilter} onChange={(event) => setVersionFilter(event.target.value as 'todas' | SongbookVersion)}>
              <option value="todas">Todas</option>
              <option value="simplificada">Simplificada</option>
              <option value="completa">Completa</option>
            </select>
          </label>

          <label className="songbook-checkbox">
            <span>Favoritos</span>
            <button type="button" className={`toggle-chip ${favoritesOnly ? 'toggle-chip-active' : ''}`} onClick={() => setFavoritesOnly(!favoritesOnly)}>
              {favoritesOnly ? 'Somente favoritas' : 'Mostrar todas'}
            </button>
          </label>
        </div>
      </section>

      <section className="songbook-layout">
        <aside className="panel songbook-list">
          <div className="songbook-list-head">
            <strong>{filteredEntries.length} resultado(s)</strong>
            <span className="muted">Busca por nome, artista, tom e favoritas.</span>
          </div>

          <div className="songbook-items">
            {filteredEntries.map((entry) => (
              <article key={entry.id} className={`songbook-item ${selectedSong?.id === entry.id ? 'songbook-item-active' : ''}`}>
                <button className="songbook-item-main" onClick={() => setSelectedSongId(entry.id)}>
                  <strong>{entry.title}</strong>
                  <span>{entry.artist || 'Sem artista'}</span>
                  <small>{entry.block}</small>
                  <small>Tom: {entry.key ?? 'Sem tom'}</small>
                </button>
                <div className="songbook-item-actions">
                  <button className={`songbook-mini-btn ${favoriteSongIds.includes(entry.id) ? 'songbook-mini-btn-active' : ''}`} onClick={() => toggleFavorite(entry.id)}>
                    {favoriteSongIds.includes(entry.id) ? 'Fav' : '☆'}
                  </button>
                  <button className="songbook-mini-btn" onClick={() => addToSetlist(entry.id)}>+</button>
                </div>
              </article>
            ))}

            {filteredEntries.length === 0 && <article className="songbook-empty"><strong>Nenhuma musica encontrada</strong><span>Tente outro filtro.</span></article>}
          </div>
        </aside>

        <section className="panel songbook-viewer">
          {selectedSong && baseVersionData ? (
            <>
              <div className="songbook-viewer-head">
                <div>
                  <p className="eyebrow">Selecionada</p>
                  <h3>{selectedSong.title}</h3>
                  <p className="muted">{selectedSong.artist || 'Sem artista'} <span className="songbook-inline-sep">·</span> {selectedSong.block}</p>
                </div>
                <div className="songbook-meta-chips">
                  <span>Tom: {selectedSong.key ?? 'Sem tom'}</span>
                  <span>Pag. {baseVersionData.pageStart}-{baseVersionData.pageEnd}</span>
                  {songOverrides[getOverrideKey(selectedSong.id, activeVersion)] && <span>Editada</span>}
                </div>
              </div>

              <div className="songbook-version-toggle songbook-toolbar-wrap">
                {selectedSong.availableVersions.map((version) => (
                  <button key={version} className={`toggle-chip ${activeVersion === version ? 'toggle-chip-active' : ''}`} onClick={() => setSelectedVersion(version)}>
                    {version === 'simplificada' ? 'Simplificada' : 'Completa'}
                  </button>
                ))}
                <button className={`toggle-chip ${favoriteSongIds.includes(selectedSong.id) ? 'toggle-chip-active' : ''}`} onClick={() => toggleFavorite(selectedSong.id)}>
                  {favoriteSongIds.includes(selectedSong.id) ? 'Favorita' : 'Favoritar'}
                </button>
                <button className="toggle-chip" onClick={() => addToSetlist(selectedSong.id)}>Adicionar a setlist</button>
                <button className={`toggle-chip ${editing ? 'toggle-chip-active' : ''}`} onClick={() => setEditing(!editing)}>{editing ? 'Fechar editor' : 'Editar cifra'}</button>
                {songOverrides[getOverrideKey(selectedSong.id, activeVersion)] && <button className="toggle-chip" onClick={resetEdit}>Restaurar original</button>}
              </div>

              {analysis && (
                <div className="songbook-harmonic-field">
                  <div className="songbook-harmonic-field-head">
                    <strong>Campo harmonico interativo</strong>
                    <span className="muted">Tom detectado: {analysis.summary.detectedKey}</span>
                  </div>
                  <div className="songbook-field-grid">
                    {harmonicField.map((degree) => (
                      <button key={`${degree.roman}-${degree.chord}`} type="button" className={`songbook-field-card ${degree.inSong ? 'songbook-field-card-active' : ''}`} onClick={() => setQuery(degree.chord.replace('dim', '').replace('m', '').toLowerCase())}>
                        <strong>{degree.roman}</strong>
                        <span>{degree.chord}</span>
                        <small>{degree.inSong ? `${degree.occurrences} uso(s)` : 'Nao aparece'}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {editing ? (
                <div className="songbook-editor">
                  <div className="songbook-editor-head">
                    <strong>Editor manual de cifras</strong>
                    <span className="muted">As alteracoes ficam salvas localmente e entram no Palco e na Analise.</span>
                  </div>
                  <textarea value={draftText} onChange={(event) => setDraftText(event.target.value)} rows={20} spellCheck={false} />
                  <div className="songbook-editor-actions">
                    <button className="toggle-chip toggle-chip-active" onClick={saveEdit}>Salvar edicao</button>
                    <button className="toggle-chip" onClick={() => { setDraftText(currentText); setEditing(false) }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="songbook-text" role="textbox" aria-label="Cifra da musica">
                  <ChordSheetViewer
                    text={currentText}
                    analysis={analysis}
                    className="songbook-chord-sheet"
                    activeChord={selectedChord?.chord ?? null}
                    onChordClick={setSelectedChord}
                  />
                </div>
              )}

              {selectedChord && (
                <div className="chord-inspector">
                  <div>
                    <p className="eyebrow">Acorde</p>
                    <h4>{selectedChord.chord}</h4>
                  </div>
                  <div className="chord-inspector-copy">
                    <span>{selectedChord.analysisLabel ?? 'Sem rotulo analitico'}</span>
                    <small>{selectedChord.harmonicFunction ?? 'Funcao nao definida'}</small>
                    <p>{selectedChord.explanation ?? 'Clique em outros acordes para ver a leitura harmonica.'}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="songbook-empty-viewer"><p className="eyebrow">Repertorio</p><h3>Escolha uma musica</h3><p className="muted">A cifra aparecera aqui.</p></div>
          )}
        </section>
      </section>
    </section>
  )
}