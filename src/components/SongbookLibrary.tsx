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

type ScoreLibraryEntry = {
  id: string
  title: string
  artistTag: string
  artistLabel: string
  collaboratorTags: string[]
  collaboratorLabels: string[]
  arrangement: string | null
  caption: string
  postUrl: string
  pageCount: number
  pages: string[]
  searchText: string
}

type ScoreLibraryCatalog = {
  entries: ScoreLibraryEntry[]
}

export function SongbookLibrary() {
  const [catalog, setCatalog] = useState<SongbookCatalog | null>(null)
  const [scoreCatalog, setScoreCatalog] = useState<ScoreLibraryCatalog | null>(null)
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
  const [scoreLinkOverrides, setScoreLinkOverrides] = useLocalStorage<Record<string, string>>('songbook-score-link-overrides', {})
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useLocalStorage<SongbookVersion>('songbook-selected-version', 'simplificada')
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [manualScoreId, setManualScoreId] = useState('auto')
  const [scoreReviewFilter, setScoreReviewFilter] = useState<'todas' | 'sem-vinculo' | 'manual' | 'automatico'>('todas')
  const [selectedChord, setSelectedChord] = useState<ChordInspector | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      try {
        setLoading(true)
        setError(null)
        const [songbookResponse, scoreResponse] = await Promise.all([
          fetch(assetUrl('/songbook/catalog.json')),
          fetch(assetUrl('/score-library/catalog.json')),
        ])
        if (!songbookResponse.ok) throw new Error('Nao foi possivel carregar o repertorio.')
        const payload = (await songbookResponse.json()) as SongbookCatalog
        const scorePayload = scoreResponse.ok ? ((await scoreResponse.json()) as ScoreLibraryCatalog) : null
        if (!cancelled) setCatalog(payload)
        if (!cancelled) setScoreCatalog(scorePayload)
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

  useEffect(() => {
    if (!selectedSong) {
      setManualScoreId('auto')
      return
    }
    setManualScoreId(scoreLinkOverrides[selectedSong.id] ?? 'auto')
  }, [scoreLinkOverrides, selectedSong])

  const analysis = useMemo(() => {
    if (!selectedSong || !currentText) return null
    return analyzeHarmony(currentText, selectedSong.key)
  }, [currentText, selectedSong])

  const harmonicField = useMemo(() => {
    if (!analysis) return []
    return buildHarmonicField(analysis.summary.detectedKey, analysis)
  }, [analysis])
  const scoreCandidates = useMemo(() => {
    if (!selectedSong || !scoreCatalog) return []
    return buildScoreCandidates(selectedSong.title, selectedSong.artist, scoreCatalog.entries)
  }, [scoreCatalog, selectedSong])
  const linkedScores = useMemo(() => {
    if (!selectedSong || !scoreCatalog) return []
    const manualId = scoreLinkOverrides[selectedSong.id]
    if (manualId) {
      const manualEntry = scoreCatalog.entries.find((entry) => entry.id === manualId)
      return manualEntry ? [manualEntry] : []
    }
    return scoreCandidates.slice(0, 2).map((item) => item.entry)
  }, [scoreCandidates, scoreCatalog, scoreLinkOverrides, selectedSong])
  const scoreLinkReview = useMemo(() => {
    if (!catalog || !scoreCatalog) {
      return {
        total: 0,
        automatic: 0,
        manual: 0,
        missing: 0,
        items: [] as Array<{
          id: string
          title: string
          artist: string
          status: 'manual' | 'automatico' | 'sem-vinculo'
          linkedLabel: string
          bestCandidateId: string | null
          bestCandidateLabel: string
          bestCandidateScore: number
        }>,
      }
    }

    const items = catalog.entries.map((entry) => {
      const manualId = scoreLinkOverrides[entry.id]
      const manualEntry = manualId ? scoreCatalog.entries.find((score) => score.id === manualId) ?? null : null
      const bestCandidate = buildScoreCandidates(entry.title, entry.artist, scoreCatalog.entries)[0] ?? null
      const automaticEntry = bestCandidate?.entry ?? null
      const linkedEntry = manualEntry ?? automaticEntry
      const status: 'manual' | 'automatico' | 'sem-vinculo' = manualEntry ? 'manual' : automaticEntry ? 'automatico' : 'sem-vinculo'

      return {
        id: entry.id,
        title: entry.title,
        artist: entry.artist || 'Sem artista',
        status,
        linkedLabel: linkedEntry ? `${linkedEntry.title} - ${linkedEntry.artistLabel}` : 'Sem partitura vinculada',
        bestCandidateId: bestCandidate?.entry.id ?? null,
        bestCandidateLabel: bestCandidate ? `${bestCandidate.entry.title} - ${bestCandidate.entry.artistLabel}` : 'Sem sugestao forte',
        bestCandidateScore: bestCandidate?.score ?? 0,
      }
    })

    return {
      total: items.length,
      automatic: items.filter((item) => item.status === 'automatico').length,
      manual: items.filter((item) => item.status === 'manual').length,
      missing: items.filter((item) => item.status === 'sem-vinculo').length,
      items,
    }
  }, [catalog, scoreCatalog, scoreLinkOverrides])
  const visibleReviewItems = useMemo(() => {
    if (scoreReviewFilter === 'todas') return scoreLinkReview.items
    return scoreLinkReview.items.filter((item) => item.status === scoreReviewFilter)
  }, [scoreLinkReview.items, scoreReviewFilter])

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

  function saveScoreLink() {
    if (!selectedSong) return
    if (manualScoreId === 'auto') {
      const next = { ...scoreLinkOverrides }
      delete next[selectedSong.id]
      setScoreLinkOverrides(next)
      return
    }
    setScoreLinkOverrides({
      ...scoreLinkOverrides,
      [selectedSong.id]: manualScoreId,
    })
  }

  function clearScoreLink() {
    if (!selectedSong) return
    const next = { ...scoreLinkOverrides }
    delete next[selectedSong.id]
    setScoreLinkOverrides(next)
    setManualScoreId('auto')
  }

  function applyBulkSuggestedLinks() {
    const next = { ...scoreLinkOverrides }
    for (const item of scoreLinkReview.items) {
      if (item.status === 'sem-vinculo' && item.bestCandidateId && item.bestCandidateScore >= 55) {
        next[item.id] = item.bestCandidateId
      }
    }
    setScoreLinkOverrides(next)
  }

  function applySuggestedLink(songId: string, candidateId: string | null) {
    if (!candidateId) return
    setScoreLinkOverrides({
      ...scoreLinkOverrides,
      [songId]: candidateId,
    })
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

        <div className="songbook-link-review">
          <div className="songbook-link-review-head">
            <div>
              <strong>Revisao de vinculos de partitura</strong>
              <span className="muted">Veja o que ja foi ligado automaticamente, manualmente ou o que ainda falta revisar.</span>
            </div>
            <div className="songbook-link-review-controls">
              <label>
                <span>Filtrar revisao</span>
                <select value={scoreReviewFilter} onChange={(event) => setScoreReviewFilter(event.target.value as 'todas' | 'sem-vinculo' | 'manual' | 'automatico')}>
                  <option value="todas">Todas</option>
                  <option value="sem-vinculo">Sem vinculo</option>
                  <option value="manual">Manuais</option>
                  <option value="automatico">Automaticos</option>
                </select>
              </label>
              <button type="button" className="toggle-chip" onClick={applyBulkSuggestedLinks}>
                Aplicar sugestoes em lote
              </button>
            </div>
          </div>
          <div className="songbook-link-review-stats">
            <span>Total: {scoreLinkReview.total}</span>
            <span>Automaticos: {scoreLinkReview.automatic}</span>
            <span>Manuais: {scoreLinkReview.manual}</span>
            <span>Sem vinculo: {scoreLinkReview.missing}</span>
          </div>
          <div className="songbook-link-review-items">
            {visibleReviewItems.slice(0, 8).map((item) => (
              <article key={item.id} className={`songbook-link-review-item songbook-link-review-item-${item.status}`}>
                <button type="button" className="songbook-link-review-main" onClick={() => setSelectedSongId(item.id)}>
                  <strong>{item.title}</strong>
                  <span>{item.artist}</span>
                  <small>{item.linkedLabel}</small>
                  <small>Sugestao: {item.bestCandidateLabel} ({item.bestCandidateScore}%)</small>
                </button>
                {item.bestCandidateId ? (
                  <button type="button" className="songbook-mini-btn" onClick={() => applySuggestedLink(item.id, item.bestCandidateId)}>
                    Usar sugestao
                  </button>
                ) : null}
              </article>
            ))}
          </div>
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

              <div className="songbook-complete-sheet">
                <div className="songbook-complete-sheet-head">
                  <strong>Ficha completa da musica</strong>
                  <span className="muted">
                    {linkedScores.length ? `${linkedScores.length} partitura(s) vinculada(s)` : 'Sem partitura vinculada automaticamente'}
                  </span>
                </div>
                <div className="songbook-complete-grid">
                  <article className="songbook-complete-card">
                    <small>Repertorio</small>
                    <strong>{selectedSong.title}</strong>
                    <span>{selectedSong.artist || 'Sem artista'}</span>
                    <p>{activeVersion === 'simplificada' ? 'Versao simplificada ativa' : 'Versao completa ativa'}</p>
                  </article>
                  <article className="songbook-complete-card">
                    <small>Tom</small>
                    <strong>{selectedSong.key ?? 'Sem tom'}</strong>
                    <span>{analysis?.summary.detectedKey ?? 'Analise indisponivel'}</span>
                    <p>{analysis ? `Modo ${analysis.summary.mode === 'major' ? 'maior' : 'menor'}` : 'Abra a cifra para analisar'}</p>
                  </article>
                  <article className="songbook-complete-card">
                    <small>Harmonia</small>
                    <strong>{analysis?.summary.cadenceLabels[0] ?? 'Fluxo principal'}</strong>
                    <span>{analysis ? `${analysis.summary.uniqueChordCount} acordes unicos` : 'Sem leitura harmonica'}</span>
                    <p>{analysis?.summary.secondaryDominants.length ? 'Com preparacoes internas' : 'Centro tonal mais estavel'}</p>
                  </article>
                  <article className="songbook-complete-card">
                    <small>Partitura</small>
                    <strong>{linkedScores[0]?.title ?? 'Nao localizada'}</strong>
                    <span>{linkedScores[0]?.artistLabel ?? 'Biblioteca visual'}</span>
                    <p>{linkedScores.length ? `${linkedScores[0].pageCount} pagina(s) prontas para abrir` : 'Tente localizar pela aba Biblioteca'}</p>
                  </article>
                </div>
              </div>

              <div className="songbook-linked-scores">
                <div className="songbook-linked-scores-head">
                  <strong>Partitura vinculada</strong>
                  {linkedScores[0] ? (
                    <a className="secondary-button" href={linkedScores[0].postUrl} target="_blank" rel="noreferrer">
                      Abrir post original
                    </a>
                  ) : null}
                </div>

                <div className="songbook-score-linker">
                  <label>
                    <span>Vinculo manual da partitura</span>
                    <select value={manualScoreId} onChange={(event) => setManualScoreId(event.target.value)}>
                      <option value="auto">Usar correspondencia automatica</option>
                      {scoreCandidates.map((candidate) => (
                        <option key={candidate.entry.id} value={candidate.entry.id}>
                          {candidate.entry.title} - {candidate.entry.artistLabel} ({candidate.score}%)
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="songbook-score-linker-actions">
                    <button className="toggle-chip toggle-chip-active" onClick={saveScoreLink}>Salvar vinculo</button>
                    <button className="toggle-chip" onClick={clearScoreLink}>Limpar</button>
                  </div>
                </div>

                {linkedScores.length ? (
                  linkedScores.map((score) => (
                    <article key={score.id} className="songbook-linked-score-card">
                      <div className="songbook-linked-score-meta">
                        <div>
                          <strong>{score.title}</strong>
                          <span>{score.artistLabel}</span>
                        </div>
                        <div className="songbook-meta-chips">
                          <span>{score.pageCount} pagina(s)</span>
                          {score.arrangement && <span>Arranjo: {score.arrangement}</span>}
                        </div>
                      </div>
                      <p className="muted">{score.caption}</p>
                      <div className="songbook-linked-score-pages">
                        {score.pages.map((page, index) => (
                          <a key={page} className="songbook-linked-score-page" href={assetUrl(page)} target="_blank" rel="noreferrer">
                            <img src={assetUrl(page)} alt={`${score.title} - pagina ${index + 1}`} loading="lazy" />
                            <span>Pagina {index + 1}</span>
                          </a>
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="songbook-empty">
                    <strong>Partitura nao encontrada automaticamente</strong>
                    <span>A correspondencia usa nome da musica e artista. A aba Biblioteca continua disponivel para busca manual.</span>
                  </article>
                )}
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

function buildScoreCandidates(title: string, artist: string, entries: ScoreLibraryEntry[]) {
  const normalizedTitle = normalizeLookup(title)
  const normalizedArtist = normalizeLookup(artist)

  return entries
    .map((entry) => {
      let score = 0
      const entryTitle = normalizeLookup(entry.title)
      const entryArtist = normalizeLookup(entry.artistLabel)

      if (entryTitle === normalizedTitle) {
        score += 70
      } else if (entryTitle.includes(normalizedTitle) || normalizedTitle.includes(entryTitle)) {
        score += 48
      }

      if (normalizedArtist && (entryArtist === normalizedArtist || entry.artistTag === normalizedArtist)) {
        score += 30
      } else if (
        normalizedArtist &&
        (entryArtist.includes(normalizedArtist) ||
          normalizedArtist.includes(entryArtist) ||
          entry.collaboratorLabels.some((label) => normalizeLookup(label) === normalizedArtist))
      ) {
        score += 18
      }

      if (score === 0 && entry.searchText.includes(normalizedTitle)) {
        score += 20
      }

      return { entry, score }
    })
    .filter((item) => item.score >= 25)
    .sort((left, right) => right.score - left.score)
}

function normalizeLookup(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}
