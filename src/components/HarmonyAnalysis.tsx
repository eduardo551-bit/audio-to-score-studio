import { useEffect, useMemo, useState } from 'react'
import { ChordSheetViewer } from './ChordSheetViewer'
import { assetUrl } from '../utils/assets'
import { analyzeHarmony, buildHarmonicField, type HarmonyAnalysis as HarmonyAnalysisResult } from '../utils/harmony'
import { getSongText } from '../utils/songbook'
import { useLocalStorage } from '../utils/useLocalStorage'
import type { SongbookCatalog, SongbookVersion } from '../types/songbook'

type HarmonicSearchMode = 'todas' | 'ii-v-i' | 'v-i' | 'emprestimos' | 'secundarios' | 'fora-do-campo'

type ChordInspector = {
  chord: string
  analysisLabel?: string
  explanation?: string
  harmonicFunction?: string
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
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)
  const [selectedChord, setSelectedChord] = useState<ChordInspector | null>(null)
  const [songOverrides] = useLocalStorage<Record<string, string>>('songbook-text-overrides', {})
  const [selectedVersion, setSelectedVersion] = useLocalStorage<SongbookVersion>('harmony-selected-version', 'simplificada')

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

  const filteredEntries = useMemo(() => {
    if (!catalog) return []
    const normalizedQuery = query.trim().toLowerCase()
    return catalog.entries.filter((entry) => {
      const matchesQuery = !normalizedQuery || entry.searchText.includes(normalizedQuery)
      const matchesArtist = artistFilter === 'todos' || entry.artist === artistFilter
      const analysis = analysesByEntry.get(entry.id)
      const matchesHarmony = matchHarmonicFilter(analysis, harmonicSearch)
      return matchesQuery && matchesArtist && matchesHarmony
    })
  }, [analysesByEntry, artistFilter, catalog, harmonicSearch, query])

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
    if (!selectedSong.availableVersions.includes(selectedVersion)) setSelectedVersion(selectedSong.availableVersions[0])
  }, [selectedSong, selectedVersion, setSelectedVersion])

  const activeVersion = selectedSong?.versions[selectedVersion] ? selectedVersion : selectedSong?.availableVersions[0] ?? 'simplificada'
  const activeText = selectedSong?.versions[activeVersion] ? getSongText(selectedSong.id, activeVersion, selectedSong.versions[activeVersion]?.text ?? '', songOverrides) : ''
  const analysis = useMemo<HarmonyAnalysisResult | null>(() => {
    if (!selectedSong || !activeText) return null
    return analyzeHarmony(activeText, selectedSong.key)
  }, [activeText, selectedSong])
  const harmonicField = useMemo(() => (analysis ? buildHarmonicField(analysis.summary.detectedKey, analysis) : []), [analysis])

  if (loading) return <section className="panel harmony-panel"><p className="eyebrow">Analise</p><h3>Carregando analise harmonica...</h3></section>
  if (error || !catalog) return <section className="panel harmony-panel"><p className="eyebrow">Analise</p><h3>Analise harmonica</h3><p className="muted">{error ?? 'Analise indisponivel.'}</p></section>

  return (
    <section className="harmony-wrap">
      <section className="panel harmony-panel">
        <div className="harmony-head">
          <div>
            <p className="eyebrow">Analise</p>
            <h3>Analise Harmonica</h3>
            <p className="muted">Busca harmonica, campo interativo e leitura por acorde.</p>
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
              <option value="emprestimos">Com emprestimos</option>
              <option value="secundarios">Com dominantes secundarios</option>
              <option value="fora-do-campo">Com acordes fora do campo</option>
            </select>
          </label>
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
  if (mode === 'emprestimos') return analysis.summary.borrowedChords.length > 0
  if (mode === 'secundarios') return analysis.summary.secondaryDominants.length > 0
  if (mode === 'fora-do-campo') return analysis.summary.nonDiatonicChords.length > 0
  return true
}
