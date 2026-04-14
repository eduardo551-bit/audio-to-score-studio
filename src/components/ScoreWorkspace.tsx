import { useMemo, useRef, useState } from 'react'
import { FileDropzone } from './FileDropzone'
import { MidiTrackPicker } from './MidiTrackPicker'
import { NoteEditor } from './NoteEditor'
import { ProjectControls } from './ProjectControls'
import { ScorePreview } from './ScorePreview'
import {
  exportProjectMidi,
  exportMusicXml,
  exportScorePdf,
  exportSessionJson,
  generateMusicXml,
} from '../services/exporters'
import {
  buildScorePartsFromSelectedTracks,
  flattenScoreParts,
  parseInputFile,
  rebuildScorePartsFromNotes,
} from '../services/transcription'
import type { EditableNote, ProjectData, ScoreMeta } from '../types'

const EMPTY_META: ScoreMeta = {
  title: 'Nova Partitura',
  composer: 'SR Music Studio',
  bpm: 120,
  timeSignature: '4/4',
}

function sortNotes(notes: EditableNote[]): EditableNote[] {
  return [...notes].sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi)
}

export function ScoreWorkspace() {
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
      return { ...current, meta: nextMeta }
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
        return { ...current, renderMode }
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
    <div className="tab-content">
      <FileDropzone disabled={loading} onFileSelected={handleFile} />

      {error && <section className="error-banner">{error}</section>}

      {project && (
        <>
          <section className="toolbar">
            <button className="secondary-button" onClick={() => exportProjectMidi(project)}>
              Exportar MIDI
            </button>
            <button className="secondary-button" onClick={() => exportMusicXml(project)}>
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
            <button className="secondary-button" onClick={() => exportSessionJson(project)}>
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
    </div>
  )
}
