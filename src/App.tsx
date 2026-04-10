import { useMemo, useRef, useState } from 'react'
import { ChordDictionary } from './components/ChordDictionary'
import { CavacoProgressions } from './components/CavacoProgressions'
import { ChordProgressions } from './components/ChordProgressions'
import { ChordTransposer } from './components/ChordTransposer'
import { CircleOfFifths } from './components/CircleOfFifths'
import { FileDropzone } from './components/FileDropzone'
import { MetronomePanel } from './components/MetronomePanel'
import { MidiTrackPicker } from './components/MidiTrackPicker'
import { NoteEditor } from './components/NoteEditor'
import { ProjectControls } from './components/ProjectControls'
import { ScaleFinder } from './components/ScaleFinder'
import { ScorePreview } from './components/ScorePreview'
import { TunerPanel } from './components/TunerPanel'
import {
  exportProjectMidi,
  exportMusicXml,
  exportScorePdf,
  exportSessionJson,
  generateMusicXml,
} from './services/exporters'
import {
  buildScorePartsFromSelectedTracks,
  flattenScoreParts,
  parseInputFile,
  rebuildScorePartsFromNotes,
} from './services/transcription'
import type { EditableNote, ProjectData, ScoreMeta } from './types'

const EMPTY_META: ScoreMeta = {
  title: 'Nova Partitura',
  composer: 'SR Music Studio',
  bpm: 120,
  timeSignature: '4/4',
}

function sortNotes(notes: EditableNote[]): EditableNote[] {
  return [...notes].sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi)
}

export default function App() {
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scoreRef = useRef<HTMLDivElement>(null)

  const notes = useMemo(() => sortNotes(project?.notes ?? []), [project?.notes])
  const meta = project?.meta ?? EMPTY_META
  const musicXml = useMemo(() => (project ? generateMusicXml(project) : ''), [project])

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)

    try {
      const parsed = await parseInputFile(file)
      setProject(parsed)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Falha ao processar o arquivo.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function updateNotes(nextNotes: EditableNote[]) {
    setProject((current) => {
      if (!current) return current
      const normalized = sortNotes(nextNotes)
      return {
        ...current,
        notes: normalized,
        scoreParts: current.scoreParts
          ? rebuildScorePartsFromNotes(current.scoreParts, normalized, current.ppq ?? 480)
          : current.scoreParts,
      }
    })
  }

  function updateMeta(nextMeta: ScoreMeta) {
    setProject((current) => {
      if (!current) {
        return {
          meta: nextMeta,
          notes: [],
          sourceName: 'manual',
          sourceType: 'midi',
        }
      }

      return {
        ...current,
        meta: nextMeta,
      }
    })
  }

  function updateSelectedMidiTracks(trackIds: number[]) {
    setProject((current) => {
      if (!current?.midiTracks) return current
      const scoreParts = buildScorePartsFromSelectedTracks(
        current.midiTracks,
        trackIds,
        current.ppq ?? 480,
        current.renderMode,
      )

      return {
        ...current,
        selectedTrackIds: trackIds,
        scoreParts,
        notes: flattenScoreParts(scoreParts, current.ppq ?? 480),
      }
    })
  }

  function updateRenderMode(renderMode: ProjectData['renderMode']) {
    setProject((current) => {
      if (!current) return current
      if (current.sourceType !== 'midi' || !current.midiTracks) {
        return {
          ...current,
          renderMode,
        }
      }

      const selectedTrackIds = current.selectedTrackIds ?? current.midiTracks.map((track) => track.id)
      const scoreParts = buildScorePartsFromSelectedTracks(
        current.midiTracks,
        selectedTrackIds,
        current.ppq ?? 480,
        renderMode,
      )

      return {
        ...current,
        renderMode,
        scoreParts,
        notes: flattenScoreParts(scoreParts, current.ppq ?? 480),
      }
    })
  }

  function updateMeasuresPerSystem(measuresPerSystem: number) {
    setProject((current) => (current ? { ...current, measuresPerSystem } : current))
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span>SR</span></div>
          <div>
            <span className="brand-name">SR Music Studio</span>
            <span className="brand-sep" aria-hidden="true">·</span>
            <span className="brand-tagline">Ferramentas para músicos</span>
          </div>
        </div>
        <div className="header-pills">
          <span>Offline</span>
          <span>PDF &amp; MusicXML</span>
          <span>Afinador &amp; Metrônomo</span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Transcrição automática</p>
          <h1>Do áudio<br />à <em>partitura</em></h1>
          <p className="hero-lead">
            Importe MIDI, WAV ou MP3 e gere lead sheets em segundos.
            Edição manual, afinador e metrônomo incluídos — tudo offline.
          </p>
          <div className="hero-steps">
            <div className="hero-step"><strong>01</strong><span>Importe o arquivo</span></div>
            <div className="hero-step-divider" aria-hidden="true" />
            <div className="hero-step"><strong>02</strong><span>Refine a partitura</span></div>
            <div className="hero-step-divider" aria-hidden="true" />
            <div className="hero-step"><strong>03</strong><span>Exporte em PDF</span></div>
          </div>
        </div>

        <div className="hero-card hero-portrait-card">
          <a
            className="portrait-wrap portrait-link"
            href="https://www.instagram.com/sergio_roberto_music/"
            target="_blank"
            rel="noreferrer"
          >
            <img src="/sr-sergio-roberto.jpg" alt="Sergio Roberto tocando violão" className="hero-portrait" />
            <div className="portrait-badge">
              <span>SR</span>
              <strong>sergio_roberto_music</strong>
            </div>
          </a>
          <div className="hero-card-head">
            <p className="eyebrow">Criado por</p>
            <strong>Sergio Roberto</strong>
            <p className="muted">Músico e compositor. Siga no Instagram.</p>
          </div>
        </div>
      </section>

      <section className="utility-grid">
        <TunerPanel />
        <MetronomePanel />
        <section className="panel utility-panel utility-feature">
          <p className="eyebrow">Como funciona</p>
          <h3>Três passos para a partitura</h3>
          <div className="feature-grid">
            <article>
              <span>01</span>
              <h4>Importe</h4>
              <p>MIDI, WAV, MP3, OGG ou FLAC.</p>
            </article>
            <article>
              <span>02</span>
              <h4>Refine</h4>
              <p>Ajuste notas, compasso e layout.</p>
            </article>
            <article>
              <span>03</span>
              <h4>Exporte</h4>
              <p>PDF, MusicXML ou MIDI.</p>
            </article>
          </div>
        </section>
      </section>

      <section className="dictionary-wrap">
        <ChordDictionary />
      </section>

      <section className="tools-grid">
        <CircleOfFifths />
        <ScaleFinder />
        <ChordTransposer />
      </section>

      <section className="progressions-grid">
        <ChordProgressions />
        <CavacoProgressions />
      </section>

      <FileDropzone disabled={loading} onFileSelected={handleFile} />

      {error && <section className="error-banner">{error}</section>}

      {project && (
        <>
          <section className="toolbar">
            <button className="secondary-button" onClick={() => project && exportProjectMidi(project)}>
              Exportar MIDI
            </button>
            <button className="secondary-button" onClick={() => project && exportMusicXml(project)}>
              Exportar MusicXML
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                scoreRef.current && exportScorePdf(scoreRef.current, `${meta.title || 'partitura'}.pdf`)
              }
            >
              Exportar PDF
            </button>
            <button className="secondary-button" onClick={() => project && exportSessionJson(project)}>
              Exportar projeto JSON
            </button>
          </section>

          <section className="workspace-grid">
            <div className="left-column">
              <ProjectControls
                meta={meta}
                sourceName={project.sourceName}
                sourceType={project.sourceType}
                renderMode={project.renderMode}
                measuresPerSystem={project.measuresPerSystem}
                loading={loading}
                onMetaChange={updateMeta}
                onRenderModeChange={updateRenderMode}
                onMeasuresPerSystemChange={updateMeasuresPerSystem}
              />
              {project.sourceType === 'midi' && project.midiTracks && project.selectedTrackIds && (
                <MidiTrackPicker
                  tracks={project.midiTracks}
                  selectedTrackIds={project.selectedTrackIds}
                  onSelectionChange={updateSelectedMidiTracks}
                />
              )}
            </div>

            <div className="right-column">
              <NoteEditor notes={notes} onChange={updateNotes} />
            </div>
          </section>

          <section className="preview-wrap">
            <ScorePreview
              xml={musicXml}
              title={meta.title}
              measuresPerSystem={project.measuresPerSystem}
              scoreRef={scoreRef}
            />
          </section>
        </>
      )}
    </main>
  )
}
