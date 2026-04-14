import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ChordSheetViewer } from './ChordSheetViewer'
import { assetUrl } from '../utils/assets'
import { analyzeHarmony, buildHarmonicField, type HarmonyAnalysis as HarmonyAnalysisResult } from '../utils/harmony'
import { getSongText } from '../utils/songbook'
import { useLocalStorage } from '../utils/useLocalStorage'
import type { SongbookCatalog, SongbookVersion } from '../types/songbook'

type HarmonicSearchMode =
  | 'todas'
  | 'ii-v-i'
  | 'v-i'
  | 'turnaround'
  | 'emprestimos'
  | 'secundarios'
  | 'fora-do-campo'
  | 'modulacoes'

type ChordInspector = {
  chord: string
  analysisLabel?: string
  explanation?: string
  harmonicFunction?: string
}

type LearningStep = {
  title: string
  summary: string
  focus: string
  level: 'base' | 'intermediario' | 'avancado'
}

type TensionMoment = {
  id: string
  label: string
  score: number
  band: 'repouso' | 'movimento' | 'tensao' | 'climax'
  summary: string
}

type PatternStudyCard = {
  mode: HarmonicSearchMode
  title: string
  description: string
  count: number
  sampleSong: string | null
}

type SongDnaMetric = {
  label: string
  value: string
  tone?: 'neutral' | 'warm' | 'cool' | 'accent'
}

type SongDnaProfile = {
  complexity: 'essencial' | 'intermediaria' | 'avancada'
  tension: 'baixa' | 'media' | 'alta' | 'dramatic'
  color: 'diatonica' | 'direcional' | 'modal' | 'expandida' | 'colorida'
  stageUse: 'abertura' | 'crescimento' | 'pico' | 'intimista'
}

type SongMapPoint = {
  id: string
  title: string
  artist: string
  left: number
  top: number
  cluster: SongDnaProfile['stageUse']
}

type RelatedSong = {
  id: string
  title: string
  artist: string
  score: number
  reasons: string[]
}

type MapConnection = {
  from: SongMapPoint
  to: SongMapPoint
}

function labelForVersion(version: SongbookVersion) {
  return version === 'simplificada' ? 'Simplificada' : 'Completa'
}

export function HarmonyAnalysis() {
  const [catalog, setCatalog] = useState<SongbookCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [artistFilter, setArtistFilter] = useState('todos')
  const [harmonicSearch, setHarmonicSearch] = useState<HarmonicSearchMode>('todas')
  const [dnaComplexityFilter, setDnaComplexityFilter] = useState<'todas' | SongDnaProfile['complexity']>('todas')
  const [dnaTensionFilter, setDnaTensionFilter] = useState<'todas' | SongDnaProfile['tension']>('todas')
  const [dnaColorFilter, setDnaColorFilter] = useState<'todas' | SongDnaProfile['color']>('todas')
  const [dnaStageFilter, setDnaStageFilter] = useState<'todas' | SongDnaProfile['stageUse']>('todas')
  const [mapZoom, setMapZoom] = useState(100)
  const [mapClusterFilter, setMapClusterFilter] = useState<'todas' | SongDnaProfile['stageUse']>('todas')
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 })
  const [isDraggingMap, setIsDraggingMap] = useState(false)
  const [hoveredMapSongId, setHoveredMapSongId] = useState<string | null>(null)
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)
  const [compareSongId, setCompareSongId] = useState<string>('nenhuma')
  const [selectedChord, setSelectedChord] = useState<ChordInspector | null>(null)
  const [songOverrides] = useLocalStorage<Record<string, string>>('songbook-text-overrides', {})
  const [selectedVersion, setSelectedVersion] = useLocalStorage<SongbookVersion>('harmony-selected-version', 'simplificada')
  const mapDragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(assetUrl('/songbook/catalog.json'))
        if (!response.ok) throw new Error('Nao foi possivel carregar o repertorio para analise.')
        const payload = (await response.json()) as SongbookCatalog
        if (!cancelled) setCatalog(payload)
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Falha ao carregar a analise harmonica.'
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

  const analysesByEntry = useMemo(() => {
    if (!catalog) return new Map<string, HarmonyAnalysisResult>()
    return new Map(
      catalog.entries.map((entry) => {
        const version = entry.versions[selectedVersion] ? selectedVersion : entry.availableVersions[0]
        const text = getSongText(entry.id, version, entry.versions[version]?.text ?? '', songOverrides)
        return [entry.id, analyzeHarmony(text, entry.key)]
      }),
    )
  }, [catalog, selectedVersion, songOverrides])

  const patternCards = useMemo(() => buildPatternStudyCards(catalog?.entries ?? [], analysesByEntry), [analysesByEntry, catalog?.entries])
  const dnaProfilesByEntry = useMemo(() => {
    return new Map(
      [...analysesByEntry.entries()].map(([entryId, entryAnalysis]) => [entryId, buildSongDnaProfile(entryAnalysis)]),
    )
  }, [analysesByEntry])

  const filteredEntries = useMemo(() => {
    if (!catalog) return []
    const normalizedQuery = query.trim().toLowerCase()
    return catalog.entries.filter((entry) => {
      const matchesQuery = !normalizedQuery || entry.searchText.includes(normalizedQuery)
      const matchesArtist = artistFilter === 'todos' || entry.artist === artistFilter
      const analysis = analysesByEntry.get(entry.id)
      const matchesHarmony = matchHarmonicFilter(analysis, harmonicSearch)
      const dna = dnaProfilesByEntry.get(entry.id)
      const matchesComplexity = dnaComplexityFilter === 'todas' || dna?.complexity === dnaComplexityFilter
      const matchesTension = dnaTensionFilter === 'todas' || dna?.tension === dnaTensionFilter
      const matchesColor = dnaColorFilter === 'todas' || dna?.color === dnaColorFilter
      const matchesStage = dnaStageFilter === 'todas' || dna?.stageUse === dnaStageFilter
      return matchesQuery && matchesArtist && matchesHarmony && matchesComplexity && matchesTension && matchesColor && matchesStage
    })
  }, [analysesByEntry, artistFilter, catalog, dnaColorFilter, dnaComplexityFilter, dnaProfilesByEntry, dnaStageFilter, dnaTensionFilter, harmonicSearch, query])
  const repertoryMap = useMemo(
    () => buildRepertoryMapPoints(filteredEntries, dnaProfilesByEntry),
    [dnaProfilesByEntry, filteredEntries],
  )

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
  const compareCandidates = filteredEntries.filter((entry) => entry.id !== selectedSong?.id)
  const compareSong = compareSongId !== 'nenhuma' ? compareCandidates.find((entry) => entry.id === compareSongId) ?? null : null

  useEffect(() => {
    if (!selectedSong) return
    if (!selectedSong.availableVersions.includes(selectedVersion)) setSelectedVersion(selectedSong.availableVersions[0])
  }, [selectedSong, selectedVersion, setSelectedVersion])

  useEffect(() => {
    if (!compareSong && compareSongId !== 'nenhuma') {
      setCompareSongId('nenhuma')
    }
  }, [compareSong, compareSongId])

  const activeVersion = selectedSong?.versions[selectedVersion] ? selectedVersion : selectedSong?.availableVersions[0] ?? 'simplificada'
  const activeText = selectedSong?.versions[activeVersion] ? getSongText(selectedSong.id, activeVersion, selectedSong.versions[activeVersion]?.text ?? '', songOverrides) : ''
  const analysis = useMemo<HarmonyAnalysisResult | null>(() => {
    if (!selectedSong || !activeText) return null
    return analyzeHarmony(activeText, selectedSong.key)
  }, [activeText, selectedSong])
  const harmonicField = useMemo(() => (analysis ? buildHarmonicField(analysis.summary.detectedKey, analysis) : []), [analysis])
  const learningPath = useMemo(() => (analysis ? buildLearningPath(analysis, selectedSong?.title ?? 'essa musica') : []), [analysis, selectedSong?.title])
  const tensionMap = useMemo(() => (analysis ? buildTensionMap(analysis) : []), [analysis])
  const songDna = useMemo(() => (analysis ? buildSongDna(analysis) : []), [analysis])
  const compareAnalysis = useMemo(() => {
    if (!compareSong) return null
    return analysesByEntry.get(compareSong.id) ?? null
  }, [analysesByEntry, compareSong])
  const compareSongDna = useMemo(() => (compareAnalysis ? buildSongDna(compareAnalysis) : []), [compareAnalysis])
  const dnaComparison = useMemo(() => (analysis && compareAnalysis ? buildDnaComparison(analysis, compareAnalysis, selectedSong?.title ?? 'Musica A', compareSong?.title ?? 'Musica B') : []), [analysis, compareAnalysis, compareSong?.title, selectedSong?.title])
  const relatedSongs = useMemo(() => {
    if (!selectedSong || !analysis) return []
    return buildRelatedSongs(selectedSong.id, analysis, filteredEntries, analysesByEntry, dnaProfilesByEntry)
  }, [analysis, analysesByEntry, dnaProfilesByEntry, filteredEntries, selectedSong])
  const relatedSongIds = useMemo(() => new Set(relatedSongs.map((item) => item.id)), [relatedSongs])
  const visibleMapPoints = useMemo(
    () => repertoryMap.filter((point) => mapClusterFilter === 'todas' || point.cluster === mapClusterFilter),
    [mapClusterFilter, repertoryMap],
  )
  const selectedMapPoint = useMemo(
    () => repertoryMap.find((point) => point.id === selectedSong?.id) ?? null,
    [repertoryMap, selectedSong?.id],
  )
  const mapConnections = useMemo<MapConnection[]>(() => {
    if (!selectedMapPoint) return []
    return repertoryMap
      .filter((point) => relatedSongIds.has(point.id) && (mapClusterFilter === 'todas' || point.cluster === mapClusterFilter))
      .map((point) => ({ from: selectedMapPoint, to: point }))
  }, [mapClusterFilter, relatedSongIds, repertoryMap, selectedMapPoint])
  const studyPath = useMemo(() => {
    if (!selectedMapPoint) return []
    const pathPoints = relatedSongs
      .map((item) => repertoryMap.find((point) => point.id === item.id) ?? null)
      .filter((point): point is SongMapPoint => Boolean(point))
      .filter((point) => mapClusterFilter === 'todas' || point.cluster === mapClusterFilter)
      .slice(0, 3)
    return [selectedMapPoint, ...pathPoints]
  }, [mapClusterFilter, relatedSongs, repertoryMap, selectedMapPoint])
  const hoveredPoint = useMemo(
    () => visibleMapPoints.find((point) => point.id === hoveredMapSongId) ?? null,
    [hoveredMapSongId, visibleMapPoints],
  )
  const hoveredPointProfile = useMemo(
    () => (hoveredPoint ? dnaProfilesByEntry.get(hoveredPoint.id) ?? null : null),
    [dnaProfilesByEntry, hoveredPoint],
  )
  const hoveredPointAnalysis = useMemo(
    () => (hoveredPoint ? analysesByEntry.get(hoveredPoint.id) ?? null : null),
    [analysesByEntry, hoveredPoint],
  )

  function handleMapPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (target.closest('.harmony-map-point')) return
    mapDragStart.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: mapOffset.x,
      offsetY: mapOffset.y,
    }
    setIsDraggingMap(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleMapPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!mapDragStart.current) return
    const deltaX = event.clientX - mapDragStart.current.x
    const deltaY = event.clientY - mapDragStart.current.y
    setMapOffset({
      x: clamp(mapDragStart.current.offsetX + deltaX, -180, 180),
      y: clamp(mapDragStart.current.offsetY + deltaY, -180, 180),
    })
  }

  function handleMapPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    mapDragStart.current = null
    setIsDraggingMap(false)
  }

  if (loading) return <section className="panel harmony-panel"><p className="eyebrow">Analise</p><h3>Carregando analise harmonica...</h3></section>
  if (error || !catalog) return <section className="panel harmony-panel"><p className="eyebrow">Analise</p><h3>Analise harmonica</h3><p className="muted">{error ?? 'Analise indisponivel.'}</p></section>

  return (
    <section className="harmony-wrap">
      <section className="panel harmony-panel">
        <div className="harmony-head">
          <div>
            <p className="eyebrow">Analise</p>
            <h3>Analise Harmonica</h3>
            <p className="muted">Busca harmonica, trilha de estudo, mapa de tensao e leitura por acorde.</p>
          </div>
        </div>

        <div className="harmony-filters harmony-filters-extended">
          <label>
            <span>Buscar musica</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Ex.: "Conselho" ou "Pique Novo"' />
          </label>

          <label>
            <span>Artista</span>
            <select value={artistFilter} onChange={(event) => setArtistFilter(event.target.value)}>
              <option value="todos">Todos</option>
              {catalog.artists.map((artist) => <option key={artist} value={artist}>{artist}</option>)}
            </select>
          </label>

          <label>
            <span>Busca harmonica</span>
            <select value={harmonicSearch} onChange={(event) => setHarmonicSearch(event.target.value as HarmonicSearchMode)}>
              <option value="todas">Todas</option>
              <option value="ii-v-i">Com II-V-I</option>
              <option value="v-i">Com V-I</option>
              <option value="turnaround">Com turnaround</option>
              <option value="emprestimos">Com emprestimos</option>
              <option value="secundarios">Com dominantes secundarios</option>
              <option value="fora-do-campo">Com acordes fora do campo</option>
              <option value="modulacoes">Com modulacoes</option>
            </select>
          </label>
        </div>

        <div className="harmony-dna-filters">
          <label>
            <span>DNA complexidade</span>
            <select value={dnaComplexityFilter} onChange={(event) => setDnaComplexityFilter(event.target.value as 'todas' | SongDnaProfile['complexity'])}>
              <option value="todas">Todas</option>
              <option value="essencial">Essencial</option>
              <option value="intermediaria">Intermediaria</option>
              <option value="avancada">Avancada</option>
            </select>
          </label>
          <label>
            <span>DNA tensao</span>
            <select value={dnaTensionFilter} onChange={(event) => setDnaTensionFilter(event.target.value as 'todas' | SongDnaProfile['tension'])}>
              <option value="todas">Todas</option>
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="dramatic">Dramatica</option>
            </select>
          </label>
          <label>
            <span>DNA cor</span>
            <select value={dnaColorFilter} onChange={(event) => setDnaColorFilter(event.target.value as 'todas' | SongDnaProfile['color'])}>
              <option value="todas">Todas</option>
              <option value="diatonica">Diatonica</option>
              <option value="direcional">Direcional</option>
              <option value="modal">Modal</option>
              <option value="expandida">Expandida</option>
              <option value="colorida">Colorida</option>
            </select>
          </label>
          <label>
            <span>DNA palco</span>
            <select value={dnaStageFilter} onChange={(event) => setDnaStageFilter(event.target.value as 'todas' | SongDnaProfile['stageUse'])}>
              <option value="todas">Todas</option>
              <option value="abertura">Abertura</option>
              <option value="crescimento">Crescimento</option>
              <option value="pico">Pico</option>
              <option value="intimista">Intimista</option>
            </select>
          </label>
        </div>

        <div className="harmony-pattern-grid">
          {patternCards.map((pattern) => (
            <button
              key={pattern.mode}
              type="button"
              className={`harmony-pattern-card ${harmonicSearch === pattern.mode ? 'harmony-pattern-card-active' : ''}`}
              onClick={() => setHarmonicSearch(pattern.mode)}
            >
              <strong>{pattern.title}</strong>
              <span>{pattern.description}</span>
              <small>{pattern.count} musica(s)</small>
              <small>{pattern.sampleSong ? `Ex.: ${pattern.sampleSong}` : 'Sem exemplo no filtro atual'}</small>
            </button>
          ))}
        </div>

        <div className="harmony-section-box">
          <strong>Mapa visual do repertorio</strong>
          <div className="harmony-map-caption">
            <span>Pontos ligados mostram vizinhanca harmonica da musica atual.</span>
            <span>Horizontal: mais repousada → mais intensa</span>
            <span>Vertical: mais essencial → mais sofisticada</span>
          </div>
          <div className="harmony-map-toolbar">
            <label>
              <span>Zoom</span>
              <input type="range" min="85" max="150" step="5" value={mapZoom} onChange={(event) => setMapZoom(Number(event.target.value))} />
              <small>{mapZoom}%</small>
            </label>
            <label>
              <span>Cluster de palco</span>
              <select value={mapClusterFilter} onChange={(event) => setMapClusterFilter(event.target.value as 'todas' | SongDnaProfile['stageUse'])}>
                <option value="todas">Todos</option>
                <option value="abertura">Abertura</option>
                <option value="crescimento">Crescimento</option>
                <option value="pico">Pico</option>
                <option value="intimista">Intimista</option>
              </select>
            </label>
            <button type="button" className="secondary-button harmony-map-reset" onClick={() => { setMapOffset({ x: 0, y: 0 }); setMapZoom(100) }}>
              Centralizar mapa
            </button>
          </div>
          <div className="harmony-map-shell">
            <div className="harmony-map-legend">
              <span><i className="harmony-dot harmony-dot-abertura" /> Abertura</span>
              <span><i className="harmony-dot harmony-dot-crescimento" /> Crescimento</span>
              <span><i className="harmony-dot harmony-dot-pico" /> Pico</span>
              <span><i className="harmony-dot harmony-dot-intimista" /> Intimista</span>
            </div>
            {selectedSong && selectedMapPoint ? (
              <div className="harmony-map-insight">
                <strong>{selectedSong.title}</strong>
                <span>{selectedSong.artist || 'Sem artista'}</span>
                <small>
                  {relatedSongs.length
                    ? `${relatedSongs.length} musica(s) destacadas por afinidade harmonica`
                    : 'Sem conexoes fortes dentro do filtro atual'}
                </small>
                <small>
                  {studyPath.length > 1
                    ? `Trilha sugerida: ${studyPath.map((point) => point.title).join(' -> ')}`
                    : 'A trilha aparece quando houver vizinhas harmonicas suficientes.'}
                </small>
              </div>
            ) : null}
            <div
              className={`harmony-map-frame ${isDraggingMap ? 'harmony-map-frame-dragging' : ''}`}
              onPointerDown={handleMapPointerDown}
              onPointerMove={handleMapPointerMove}
              onPointerUp={handleMapPointerUp}
              onPointerCancel={handleMapPointerUp}
              onPointerLeave={handleMapPointerUp}
            >
              <div className="harmony-map" style={{ transform: `translate(${mapOffset.x}px, ${mapOffset.y}px) scale(${mapZoom / 100})` }}>
                <div className="harmony-map-axis harmony-map-axis-x" />
                <div className="harmony-map-axis harmony-map-axis-y" />
                <span className="harmony-map-label harmony-map-label-left">Repouso</span>
                <span className="harmony-map-label harmony-map-label-right">Intensidade</span>
                <span className="harmony-map-label harmony-map-label-top">Sofisticacao</span>
                <span className="harmony-map-label harmony-map-label-bottom">Essencial</span>
                <svg className="harmony-map-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {mapConnections.map((connection) => (
                <line
                  key={`${connection.from.id}-${connection.to.id}`}
                  x1={connection.from.left}
                  y1={connection.from.top}
                      x2={connection.to.left}
                      y2={connection.to.top}
                    />
                  ))}
                  {studyPath.length > 1 ? (
                    <polyline points={studyPath.map((point) => `${point.left},${point.top}`).join(' ')} />
                  ) : null}
                </svg>
                {visibleMapPoints.map((point) => {
                  const isActive = selectedSong?.id === point.id
                  const isRelated = relatedSongIds.has(point.id)

                  return (
                    <button
                      key={point.id}
                      type="button"
                      className={`harmony-map-point harmony-map-point-${point.cluster} ${isActive ? 'harmony-map-point-active' : ''} ${isRelated ? 'harmony-map-point-related' : ''}`}
                      style={{ left: `${point.left}%`, top: `${point.top}%` }}
                      onClick={() => setSelectedSongId(point.id)}
                      onMouseEnter={() => setHoveredMapSongId(point.id)}
                      onMouseLeave={() => setHoveredMapSongId((current) => (current === point.id ? null : current))}
                      onFocus={() => setHoveredMapSongId(point.id)}
                      onBlur={() => setHoveredMapSongId((current) => (current === point.id ? null : current))}
                      title={`${point.title} - ${point.artist || 'Sem artista'}`}
                    >
                      <span>{point.title}</span>
                    </button>
                  )
                })}
                {hoveredPoint && hoveredPointProfile && hoveredPointAnalysis ? (
                  <article className="harmony-map-tooltip" style={{ left: `${hoveredPoint.left}%`, top: `${hoveredPoint.top}%` }}>
                    <strong>{hoveredPoint.title}</strong>
                    <span>{hoveredPoint.artist || 'Sem artista'}</span>
                    <small>
                      {translateComplexity(hoveredPointProfile.complexity)} | {translateTension(hoveredPointProfile.tension)} | {translateColor(hoveredPointProfile.color)}
                    </small>
                    <p>{hoveredPointAnalysis.summary.cadenceLabels[0] ?? 'Fluxo diatonico principal'}</p>
                  </article>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="harmony-layout">
        <aside className="panel harmony-list">
          <div className="harmony-list-head">
            <strong>{filteredEntries.length} musica(s)</strong>
            <span className="muted">A busca agora tambem filtra pelas caracteristicas harmonicas.</span>
          </div>
          <div className="harmony-items">
            {filteredEntries.map((entry) => {
              const entryAnalysis = analysesByEntry.get(entry.id)
              return (
                <button key={entry.id} className={`harmony-item ${selectedSong?.id === entry.id ? 'harmony-item-active' : ''}`} onClick={() => setSelectedSongId(entry.id)}>
                  <strong>{entry.title}</strong>
                  <span>{entry.artist || 'Sem artista'}</span>
                  <small>Tom: {entry.key ?? 'Sem tom'}</small>
                  <small>{entry.availableVersions.map(labelForVersion).join(' + ')}</small>
                  <small>{entryAnalysis?.summary.cadenceLabels[0] ?? 'Sem cadencia forte'}</small>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="harmony-main">
          <section className="panel harmony-summary">
            {selectedSong && analysis ? (
              <>
                <div className="harmony-song-head">
                  <div>
                    <p className="eyebrow">Musica</p>
                    <h3>{selectedSong.title}</h3>
                    <p className="muted">{selectedSong.artist || 'Sem artista'}</p>
                  </div>
                  <div className="harmony-version-toggle">
                    {selectedSong.availableVersions.map((version) => (
                      <button key={version} className={`toggle-chip ${activeVersion === version ? 'toggle-chip-active' : ''}`} onClick={() => setSelectedVersion(version)}>
                        {labelForVersion(version)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="harmony-summary-grid">
                  <article><strong>Tom detectado</strong><span>{analysis.summary.detectedKey}</span></article>
                  <article><strong>Modo</strong><span>{analysis.summary.mode === 'major' ? 'Maior' : 'Menor'}</span></article>
                  <article><strong>Acordes unicos</strong><span>{analysis.summary.uniqueChordCount}</span></article>
                  <article><strong>Eventos harmonicos</strong><span>{analysis.summary.totalChordEvents}</span></article>
                </div>

                <div className="harmony-section-box">
                  <strong>DNA da Musica</strong>
                  <div className="song-dna-grid">
                    {songDna.map((item) => (
                      <article key={item.label} className={`song-dna-card ${item.tone ? `song-dna-card-${item.tone}` : ''}`}>
                        <small>{item.label}</small>
                        <strong>{item.value}</strong>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="harmony-section-box">
                  <strong>Comparador de DNA</strong>
                  <div className="harmony-compare-picker">
                    <label>
                      <span>Comparar com</span>
                      <select value={compareSongId} onChange={(event) => setCompareSongId(event.target.value)}>
                        <option value="nenhuma">Nenhuma</option>
                        {compareCandidates.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.title} {entry.artist ? `- ${entry.artist}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {compareSong && compareAnalysis ? (
                    <div className="harmony-compare-layout">
                      <div className="song-dna-grid">
                        {songDna.map((item) => (
                          <article key={`current-${item.label}`} className={`song-dna-card ${item.tone ? `song-dna-card-${item.tone}` : ''}`}>
                            <small>{selectedSong?.title}</small>
                            <strong>{item.value}</strong>
                            <span>{item.label}</span>
                          </article>
                        ))}
                      </div>
                      <div className="song-dna-grid">
                        {compareSongDna.map((item) => (
                          <article key={`compare-${item.label}`} className={`song-dna-card ${item.tone ? `song-dna-card-${item.tone}` : ''}`}>
                            <small>{compareSong.title}</small>
                            <strong>{item.value}</strong>
                            <span>{item.label}</span>
                          </article>
                        ))}
                      </div>
                      <div className="harmony-compare-notes">
                        {dnaComparison.map((item) => (
                          <article key={item.title} className="harmony-compare-note">
                            <strong>{item.title}</strong>
                            <span>{item.summary}</span>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="muted">Escolha outra musica para comparar os perfis musicais lado a lado.</p>
                  )}
                </div>

                <div className="harmony-section-box">
                  <strong>Musicas parecidas no repertorio</strong>
                  {relatedSongs.length ? (
                    <div className="harmony-related-grid">
                      {relatedSongs.map((item) => (
                        <button key={item.id} type="button" className="harmony-related-card" onClick={() => setSelectedSongId(item.id)}>
                          <div className="harmony-related-head">
                            <strong>{item.title}</strong>
                            <span>{item.score}% de afinidade</span>
                          </div>
                          <small>{item.artist || 'Sem artista'}</small>
                          <p>{item.reasons.join(' | ')}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">Nao ha outra musica proxima o suficiente dentro do filtro atual.</p>
                  )}
                </div>

                <div className="harmony-section-box">
                  <strong>Trilha de aprendizado por musica</strong>
                  <div className="harmony-learning-path">
                    {learningPath.map((step, index) => (
                      <article key={`${step.title}-${index}`} className={`harmony-learning-card harmony-learning-card-${step.level}`}>
                        <small>Etapa {index + 1}</small>
                        <strong>{step.title}</strong>
                        <span>{step.summary}</span>
                        <p>Foco: {step.focus}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="harmony-pill-groups">
                  <div><strong>Acordes mais usados</strong><div className="harmony-pills">{analysis.summary.topChords.map((item) => <span key={item.chord}>{item.chord} x {item.count}</span>)}</div></div>
                  <div><strong>Cadencias</strong><div className="harmony-pills">{analysis.summary.cadenceLabels.length ? analysis.summary.cadenceLabels.map((label) => <span key={label}>{label}</span>) : <span>Sem cadencia forte detectada</span>}</div></div>
                  <div><strong>Dominantes secundarios</strong><div className="harmony-pills">{analysis.summary.secondaryDominants.length ? analysis.summary.secondaryDominants.map((item) => <span key={item}>{item}</span>) : <span>Nenhum dominante secundario claro</span>}</div></div>
                  <div><strong>Emprestimos modais</strong><div className="harmony-pills">{analysis.summary.borrowedChords.length ? analysis.summary.borrowedChords.map((item) => <span key={item}>{item}</span>) : <span>Nenhum emprestimo modal claro</span>}</div></div>
                </div>

                <div className="harmony-section-box">
                  <strong>Campo harmonico interativo</strong>
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

                <div className="harmony-section-box">
                  <strong>Mapa de tensao e repouso</strong>
                  <div className="harmony-tension-map">
                    {tensionMap.map((moment) => (
                      <article key={moment.id} className="harmony-tension-card">
                        <div className="harmony-tension-head">
                          <strong>{moment.label}</strong>
                          <span className={`harmony-tension-pill harmony-tension-pill-${moment.band}`}>{moment.band}</span>
                        </div>
                        <div className="harmony-tension-bar">
                          <div className={`harmony-tension-fill harmony-tension-fill-${moment.band}`} style={{ width: `${Math.max(10, Math.min(100, (moment.score / 5) * 100))}%` }} />
                        </div>
                        <small>{moment.summary}</small>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="harmony-section-box">
                  <strong>Blocos harmonicos</strong>
                  <div className="harmony-section-list">
                    {analysis.sections.map((section) => (
                      <article key={section.id} className="harmony-section-card">
                        <strong>{section.id.replace('-', ' ')}</strong>
                        <span>Centro local: {section.localKey}</span>
                        <span>{section.summary}</span>
                        <small>{section.chordCount} acorde(s) no trecho</small>
                        <small>{section.cadenceLabels.length ? section.cadenceLabels.join(' | ') : 'Sem cadencia marcante no trecho'}</small>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="harmony-section-box">
                  <strong>Modulacoes locais</strong>
                  <div className="harmony-pills">
                    {analysis.localModulations.length ? analysis.localModulations.map((item) => <span key={`${item.sectionId}-${item.toKey}`}>{item.sectionId}: {item.fromKey} {'->'} {item.toKey}</span>) : <span>Nenhuma modulacao local forte detectada</span>}
                  </div>
                </div>
              </>
            ) : (
              <div className="harmony-empty-viewer"><p className="eyebrow">Analise</p><h3>Escolha uma musica</h3><p className="muted">A leitura harmonica aparecera aqui.</p></div>
            )}
          </section>

          <section className="panel harmony-lines">
            {analysis ? (
              <>
                <ChordSheetViewer
                  text={activeText}
                  analysis={analysis}
                  className="harmony-chord-sheet"
                  lineClassName="harmony-sheet-line"
                  chordLineClassName="harmony-sheet-line-chords"
                  lyricLineClassName="harmony-sheet-line-lyrics"
                  chordButtonClassName="inline-chord-button"
                  activeChord={selectedChord?.chord ?? null}
                  onChordClick={setSelectedChord}
                />

                {selectedChord && (
                  <div className="chord-inspector">
                    <div>
                      <p className="eyebrow">Acorde clicado</p>
                      <h4>{selectedChord.chord}</h4>
                    </div>
                    <div className="chord-inspector-copy">
                      <span>{selectedChord.analysisLabel ?? 'Sem rotulo analitico'}</span>
                      <small>{selectedChord.harmonicFunction ?? 'Funcao nao definida'}</small>
                      <p>{selectedChord.explanation ?? 'Clique em outro acorde para ver o contexto.'}</p>
                    </div>
                  </div>
                )}

                {analysis.lines.filter((line) => line.type === 'chords').map((line, lineIndex) => (
                  <div key={`cards-${lineIndex}`} className="harmony-chord-line">
                    {line.chords.map((chord, chordIndex) => (
                      <article key={`${lineIndex}-${chordIndex}-${chord.raw}`} className="harmony-chord-card">
                        <strong>{chord.raw}</strong>
                        <span>{chord.analysisLabel}</span>
                        <small>{chord.harmonicFunction}</small>
                        <small>{chord.explanation}</small>
                      </article>
                    ))}
                  </div>
                ))}
              </>
            ) : (
              <div className="harmony-empty-viewer"><p className="muted">Sem linhas para analisar.</p></div>
            )}
          </section>
        </section>
      </section>
    </section>
  )
}

function matchHarmonicFilter(analysis: HarmonyAnalysisResult | undefined, mode: HarmonicSearchMode) {
  if (!analysis) return mode === 'todas'
  if (mode === 'todas') return true
  if (mode === 'ii-v-i') return analysis.summary.cadenceLabels.some((label) => label.includes('II-V-I'))
  if (mode === 'v-i') return analysis.summary.cadenceLabels.some((label) => label.includes('V-I'))
  if (mode === 'turnaround') return analysis.summary.cadenceLabels.some((label) => label.includes('Turnaround'))
  if (mode === 'emprestimos') return analysis.summary.borrowedChords.length > 0
  if (mode === 'secundarios') return analysis.summary.secondaryDominants.length > 0
  if (mode === 'fora-do-campo') return analysis.summary.nonDiatonicChords.length > 0
  if (mode === 'modulacoes') return analysis.localModulations.length > 0
  return true
}

function buildLearningPath(analysis: HarmonyAnalysisResult, songTitle: string): LearningStep[] {
  const steps: LearningStep[] = [
    {
      title: 'Base tonal',
      summary: `${songTitle} firma o centro em ${analysis.summary.detectedKey} e alterna entre tônica, subdominante e dominante.`,
      focus: 'Cantar os graus I, IV e V antes de pensar nos nomes dos acordes.',
      level: 'base',
    },
  ]

  if (analysis.summary.cadenceLabels.some((label) => label.includes('II-V-I'))) {
    steps.push({
      title: 'Cadencia principal',
      summary: 'A musica traz II-V-I, um dos caminhos mais importantes para ouvir preparacao e resolucao.',
      focus: 'Tocar devagar percebendo como o ii prepara, o V tensiona e o I resolve.',
      level: 'base',
    })
  } else if (analysis.summary.cadenceLabels.some((label) => label.includes('V-I'))) {
    steps.push({
      title: 'Resolucao dominante',
      summary: 'O eixo V-I aparece como referencia de tensao e chegada.',
      focus: 'Ouvir o acorde dominante como pergunta e a tonica como resposta.',
      level: 'base',
    })
  }

  if (analysis.summary.secondaryDominants.length > 0) {
    steps.push({
      title: 'Preparacoes internas',
      summary: 'Ha dominantes secundarios, entao a musica prepara acordes diatonicos como se fossem mini-centros tonais.',
      focus: 'Estudar cada V/x e ouvir para onde ele aponta.',
      level: 'intermediario',
    })
  }

  if (analysis.summary.borrowedChords.length > 0 || analysis.summary.nonDiatonicChords.length > 0) {
    steps.push({
      title: 'Cor harmonicamente expandida',
      summary: 'A musica sai do campo principal em alguns pontos para ganhar mais cor emocional.',
      focus: 'Comparar o trecho diatonico com o trecho colorido e sentir a mudanca de clima.',
      level: 'intermediario',
    })
  }

  if (analysis.localModulations.length > 0) {
    steps.push({
      title: 'Mudanca de centro tonal',
      summary: 'Existem indicios de modulacao local, o que torna a escuta mais avancada.',
      focus: 'Marcar o ponto em que o repouso deixa de ser o tom inicial e passa a soar em outro centro.',
      level: 'avancado',
    })
  }

  if (steps.length < 3) {
    steps.push({
      title: 'Conducao e repeticao',
      summary: 'Mesmo sem muitos cromatismos, a musica ensina a estabilizar o ouvido dentro do campo harmonico.',
      focus: 'Repetir os blocos harmonicos e cantar os graus por cima da cifra.',
      level: 'intermediario',
    })
  }

  return steps.slice(0, 4)
}

function buildTensionMap(analysis: HarmonyAnalysisResult): TensionMoment[] {
  const functionWeights: Record<string, number> = {
    tonica: 1,
    subdominante: 2.4,
    dominante: 4,
    'dominante-secundario': 4.6,
    emprestimo: 3.3,
    cromatico: 3.8,
  }

  return analysis.sections.map((section) => {
    const sectionChords = analysis.lines
      .slice(section.startLine, section.endLine + 1)
      .flatMap((line) => line.chords)

    const averageScore =
      sectionChords.reduce((total, chord) => {
        const base = functionWeights[chord.harmonicFunction] ?? 2.5
        return total + (chord.resolvesToNext ? Math.max(1, base - 0.5) : base)
      }, 0) / Math.max(1, sectionChords.length)

    const band =
      averageScore < 1.8
        ? 'repouso'
        : averageScore < 2.8
          ? 'movimento'
          : averageScore < 4.1
            ? 'tensao'
            : 'climax'

    const summary =
      band === 'repouso'
        ? 'Trecho de descanso tonal e estabilidade.'
        : band === 'movimento'
          ? 'Trecho que coloca a harmonia em marcha sem estourar a tensao.'
          : band === 'tensao'
            ? 'Trecho que pede resolucao e deixa a musica mais acesa.'
            : 'Trecho com pico de tensao, preparacoes fortes ou cor cromatica.'

    return {
      id: section.id,
      label: section.id.replace('-', ' '),
      score: Number(averageScore.toFixed(2)),
      band,
      summary,
    }
  })
}

function buildPatternStudyCards(
  entries: SongbookCatalog['entries'],
  analysesByEntry: Map<string, HarmonyAnalysisResult>,
): PatternStudyCard[] {
  const definitions: Array<Pick<PatternStudyCard, 'mode' | 'title' | 'description'>> = [
    { mode: 'ii-v-i', title: 'II-V-I', description: 'O melhor padrao para ouvir preparacao, tensao e resolucao.' },
    { mode: 'v-i', title: 'V-I', description: 'Entrada rapida para estudar dominante e tonica.' },
    { mode: 'turnaround', title: 'Turnaround', description: 'Ciclos que fazem a harmonia girar e voltar ao inicio.' },
    { mode: 'secundarios', title: 'Dominantes secundarios', description: 'Mini preparacoes internas dentro da musica.' },
    { mode: 'emprestimos', title: 'Emprestimos', description: 'Cor modal e contraste emocional fora do campo base.' },
    { mode: 'modulacoes', title: 'Modulacoes', description: 'Trechos em que o centro tonal parece mudar.' },
  ]

  return definitions.map((definition) => {
    const matchingEntries = entries.filter((entry) => matchHarmonicFilter(analysesByEntry.get(entry.id), definition.mode))
    return {
      ...definition,
      count: matchingEntries.length,
      sampleSong: matchingEntries[0]?.title ?? null,
    }
  })
}

function buildSongDna(analysis: HarmonyAnalysisResult): SongDnaMetric[] {
  const averageTension =
    analysis.sections.reduce((total, section) => total + buildSectionTensionScore(analysis, section.startLine, section.endLine), 0) /
    Math.max(1, analysis.sections.length)

  const complexity =
    analysis.localModulations.length > 0 || analysis.summary.nonDiatonicChords.length >= 5
      ? 'Avancada'
      : analysis.summary.secondaryDominants.length > 0 || analysis.summary.borrowedChords.length > 0 || analysis.summary.uniqueChordCount >= 10
        ? 'Intermediaria'
        : 'Essencial'

  const harmonicColor =
    analysis.summary.borrowedChords.length > 0 && analysis.summary.secondaryDominants.length > 0
      ? 'Expandida e emocional'
      : analysis.summary.borrowedChords.length > 0
        ? 'Modal e contrastante'
        : analysis.summary.secondaryDominants.length > 0
          ? 'Direcional e sofisticada'
          : analysis.summary.nonDiatonicChords.length > 0
            ? 'Colorida'
            : 'Diatonica e clara'

  const studyVocation =
    analysis.localModulations.length > 0
      ? 'Treino avancado de centros tonais'
      : analysis.summary.secondaryDominants.length > 0
        ? 'Otima para estudar preparacoes'
        : analysis.summary.cadenceLabels.some((label) => label.includes('II-V-I'))
          ? 'Otima para treinar II-V-I'
          : analysis.summary.cadenceLabels.some((label) => label.includes('V-I'))
            ? 'Boa para ouvir resolucao dominante'
            : 'Boa para fixar campo harmonico'

  const stageUse =
    averageTension >= 3.9
      ? 'Pico de energia no show'
      : averageTension >= 2.8
        ? 'Meio de set com crescimento'
        : analysis.summary.mode === 'minor'
          ? 'Momento emotivo ou intimista'
          : 'Boa para abrir ou estabilizar o set'

  const cadenceSignature = analysis.summary.cadenceLabels[0] ?? 'Fluxo diatonico principal'

  return [
    { label: 'Assinatura tonal', value: `${analysis.summary.detectedKey} ${analysis.summary.mode === 'major' ? 'maior' : 'menor'}`, tone: 'cool' },
    { label: 'Complexidade', value: complexity, tone: complexity === 'Avancada' ? 'accent' : complexity === 'Intermediaria' ? 'warm' : 'neutral' },
    { label: 'Cadencia dominante', value: cadenceSignature, tone: 'warm' },
    { label: 'Nivel de tensao', value: describeAverageTension(averageTension), tone: averageTension >= 3.5 ? 'accent' : averageTension >= 2.4 ? 'warm' : 'cool' },
    { label: 'Cor harmonica', value: harmonicColor, tone: 'neutral' },
    { label: 'Mobilidade tonal', value: analysis.localModulations.length > 0 ? `${analysis.localModulations.length} mudanca(s) local(is)` : 'Centro bem estavel', tone: analysis.localModulations.length > 0 ? 'accent' : 'cool' },
    { label: 'Vocacao de estudo', value: studyVocation, tone: 'neutral' },
    { label: 'Uso de palco', value: stageUse, tone: 'warm' },
  ]
}

function buildSongDnaProfile(analysis: HarmonyAnalysisResult): SongDnaProfile {
  const averageTension =
    analysis.sections.reduce((total, section) => total + buildSectionTensionScore(analysis, section.startLine, section.endLine), 0) /
    Math.max(1, analysis.sections.length)

  const complexity =
    analysis.localModulations.length > 0 || analysis.summary.nonDiatonicChords.length >= 5
      ? 'avancada'
      : analysis.summary.secondaryDominants.length > 0 || analysis.summary.borrowedChords.length > 0 || analysis.summary.uniqueChordCount >= 10
        ? 'intermediaria'
        : 'essencial'

  const tension =
    averageTension < 1.8
      ? 'baixa'
      : averageTension < 2.8
        ? 'media'
        : averageTension < 4.1
          ? 'alta'
          : 'dramatic'

  const color =
    analysis.summary.borrowedChords.length > 0 && analysis.summary.secondaryDominants.length > 0
      ? 'expandida'
      : analysis.summary.borrowedChords.length > 0
        ? 'modal'
        : analysis.summary.secondaryDominants.length > 0
          ? 'direcional'
          : analysis.summary.nonDiatonicChords.length > 0
            ? 'colorida'
            : 'diatonica'

  const stageUse =
    averageTension >= 3.9
      ? 'pico'
      : averageTension >= 2.8
        ? 'crescimento'
        : analysis.summary.mode === 'minor'
          ? 'intimista'
          : 'abertura'

  return { complexity, tension, color, stageUse }
}

function buildSectionTensionScore(analysis: HarmonyAnalysisResult, startLine: number, endLine: number) {
  const functionWeights: Record<string, number> = {
    tonica: 1,
    subdominante: 2.4,
    dominante: 4,
    'dominante-secundario': 4.6,
    emprestimo: 3.3,
    cromatico: 3.8,
  }

  const chords = analysis.lines.slice(startLine, endLine + 1).flatMap((line) => line.chords)
  return (
    chords.reduce((total, chord) => {
      const base = functionWeights[chord.harmonicFunction] ?? 2.5
      return total + (chord.resolvesToNext ? Math.max(1, base - 0.5) : base)
    }, 0) / Math.max(1, chords.length)
  )
}

function describeAverageTension(score: number) {
  if (score < 1.8) return 'Baixa e repousada'
  if (score < 2.8) return 'Media com movimento'
  if (score < 4.1) return 'Alta e direcional'
  return 'Muito alta e dramatica'
}

function buildRepertoryMapPoints(
  entries: SongbookCatalog['entries'],
  dnaProfilesByEntry: Map<string, SongDnaProfile>,
): SongMapPoint[] {
  return entries.map((entry, index) => {
    const dna = dnaProfilesByEntry.get(entry.id)
    const tension = dna ? tensionToX(dna.tension) : 40
    const complexity = dna ? complexityToY(dna.complexity) : 55
    const colorOffset = dna ? colorToOffset(dna.color) : 0
    const jitterX = ((index % 5) - 2) * 1.8
    const jitterY = ((index % 7) - 3) * 1.2

    return {
      id: entry.id,
      title: entry.title,
      artist: entry.artist,
      left: clamp(tension + colorOffset + jitterX, 6, 94),
      top: clamp(complexity + jitterY, 8, 92),
      cluster: dna?.stageUse ?? 'abertura',
    }
  })
}

function tensionToX(value: SongDnaProfile['tension']) {
  if (value === 'baixa') return 18
  if (value === 'media') return 42
  if (value === 'alta') return 68
  return 86
}

function complexityToY(value: SongDnaProfile['complexity']) {
  if (value === 'essencial') return 78
  if (value === 'intermediaria') return 50
  return 22
}

function colorToOffset(value: SongDnaProfile['color']) {
  if (value === 'diatonica') return -5
  if (value === 'direcional') return 2
  if (value === 'modal') return -1
  if (value === 'expandida') return 6
  return 3
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function buildDnaComparison(
  left: HarmonyAnalysisResult,
  right: HarmonyAnalysisResult,
  leftTitle: string,
  rightTitle: string,
) {
  const leftProfile = buildSongDnaProfile(left)
  const rightProfile = buildSongDnaProfile(right)

  return [
    {
      title: 'Complexidade',
      summary:
        leftProfile.complexity === rightProfile.complexity
          ? `${leftTitle} e ${rightTitle} estao no mesmo nivel de complexidade.`
          : `${leftTitle} soa ${translateComplexity(leftProfile.complexity)} enquanto ${rightTitle} vai para ${translateComplexity(rightProfile.complexity)}.`,
    },
    {
      title: 'Tensao',
      summary:
        leftProfile.tension === rightProfile.tension
          ? `As duas mantem um nivel de tensao parecido.`
          : `${leftTitle} trabalha uma tensao ${translateTension(leftProfile.tension)} e ${rightTitle} puxa para ${translateTension(rightProfile.tension)}.`,
    },
    {
      title: 'Cor harmonica',
      summary:
        leftProfile.color === rightProfile.color
          ? `As duas compartilham uma cor harmonica semelhante.`
          : `${leftTitle} tem uma cor ${translateColor(leftProfile.color)} e ${rightTitle} segue uma linha ${translateColor(rightProfile.color)}.`,
    },
    {
      title: 'Uso de palco',
      summary:
        leftProfile.stageUse === rightProfile.stageUse
          ? `As duas funcionam no mesmo ponto do set.`
          : `${leftTitle} combina mais com ${translateStageUse(leftProfile.stageUse)}; ${rightTitle} encaixa melhor em ${translateStageUse(rightProfile.stageUse)}.`,
    },
  ]
}

function buildRelatedSongs(
  selectedSongId: string,
  selectedAnalysis: HarmonyAnalysisResult,
  entries: SongbookCatalog['entries'],
  analysesByEntry: Map<string, HarmonyAnalysisResult>,
  dnaProfilesByEntry: Map<string, SongDnaProfile>,
): RelatedSong[] {
  const selectedProfile = dnaProfilesByEntry.get(selectedSongId) ?? buildSongDnaProfile(selectedAnalysis)
  const selectedCadences = new Set(selectedAnalysis.summary.cadenceLabels)
  const selectedTopChords = new Set(selectedAnalysis.summary.topChords.slice(0, 4).map((item) => item.chord))

  return entries
    .filter((entry) => entry.id !== selectedSongId)
    .map((entry) => {
      const analysis = analysesByEntry.get(entry.id)
      if (!analysis) return null
      const profile = dnaProfilesByEntry.get(entry.id) ?? buildSongDnaProfile(analysis)
      const reasons: string[] = []
      let score = 32

      if (profile.complexity === selectedProfile.complexity) {
        score += 18
        reasons.push(`complexidade ${translateComplexity(profile.complexity).replace('mais ', '')}`)
      }

      if (profile.tension === selectedProfile.tension) {
        score += 20
        reasons.push(`tensao ${translateTension(profile.tension)}`)
      }

      if (profile.color === selectedProfile.color) {
        score += 14
        reasons.push(`cor ${translateColor(profile.color)}`)
      }

      if (profile.stageUse === selectedProfile.stageUse) {
        score += 10
        reasons.push(`encaixe de palco em ${translateStageUse(profile.stageUse)}`)
      }

      const cadenceOverlap = analysis.summary.cadenceLabels.filter((label) => selectedCadences.has(label))
      if (cadenceOverlap.length > 0) {
        score += Math.min(18, cadenceOverlap.length * 9)
        reasons.push(`cadencia parecida: ${cadenceOverlap[0]}`)
      }

      const chordOverlap = analysis.summary.topChords.filter((item) => selectedTopChords.has(item.chord))
      if (chordOverlap.length > 0) {
        score += Math.min(10, chordOverlap.length * 4)
        reasons.push(`acordes em comum: ${chordOverlap.map((item) => item.chord).slice(0, 2).join(', ')}`)
      }

      if (analysis.summary.mode === selectedAnalysis.summary.mode) {
        score += 6
      }

      if (!reasons.length) {
        reasons.push('perfil geral proximo no mapa harmonico')
      }

      return {
        id: entry.id,
        title: entry.title,
        artist: entry.artist,
        score: clamp(Math.round(score), 0, 99),
        reasons: reasons.slice(0, 3),
      }
    })
    .filter((item): item is RelatedSong => Boolean(item))
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
}

function translateComplexity(value: SongDnaProfile['complexity']) {
  if (value === 'essencial') return 'mais essencial'
  if (value === 'intermediaria') return 'um meio termo'
  return 'um territorio mais avancado'
}

function translateTension(value: SongDnaProfile['tension']) {
  if (value === 'baixa') return 'baixa'
  if (value === 'media') return 'media'
  if (value === 'alta') return 'alta'
  return 'dramatica'
}

function translateColor(value: SongDnaProfile['color']) {
  if (value === 'diatonica') return 'mais diatonica'
  if (value === 'direcional') return 'direcional'
  if (value === 'modal') return 'modal'
  if (value === 'expandida') return 'expandida'
  return 'colorida'
}

function translateStageUse(value: SongDnaProfile['stageUse']) {
  if (value === 'abertura') return 'abertura'
  if (value === 'crescimento') return 'crescimento de set'
  if (value === 'pico') return 'pico de energia'
  return 'momento intimista'
}
