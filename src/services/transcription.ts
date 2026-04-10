import { Midi } from '@tonejs/midi'
import {
  BasicPitch,
  addPitchBendsToNoteEvents,
  noteFramesToTime,
  outputToNotesPoly,
} from '@spotify/basic-pitch'
import type {
  EditableNote,
  ChordSymbol,
  MidiTrackData,
  ProjectData,
  RenderMode,
  ScoreMeta,
  ScorePart,
  TimeSignatureChange,
  TrackNote,
} from '../types'
import { assetUrl } from '../utils/assets'

const MODEL_URL = assetUrl('/basic-pitch-model/model.json')
const DEFAULT_META: ScoreMeta = {
  title: 'Nova Partitura',
  composer: 'Audio to Score Studio',
  bpm: 120,
  timeSignature: '4/4',
}

let basicPitchModel: BasicPitch | null = null

function getModel(): BasicPitch {
  if (!basicPitchModel) {
    basicPitchModel = new BasicPitch(MODEL_URL)
  }
  return basicPitchModel
}

function fileBaseName(file: File): string {
  return file.name.replace(/\.[^.]+$/, '')
}

function toEditableNote(note: TrackNote, ppq: number): EditableNote {
  return {
    id: note.id,
    midi: note.midi,
    startBeat: note.ticks / ppq,
    durationBeats: Math.max(0.25, note.durationTicks / ppq),
    velocity: note.velocity,
    source: note.source,
    trackId: note.trackId,
    partId: note.partId,
    staff: note.staff,
  }
}

function buildTrackNotes(midi: Midi, trackIndex: number): TrackNote[] {
  return midi.tracks[trackIndex].notes
    .map((note, index) => ({
      id: `track-${trackIndex}-note-${index}-${note.ticks}`,
      midi: note.midi,
      ticks: note.ticks,
      durationTicks: Math.max(1, note.durationTicks),
      velocity: Math.round(note.velocity * 127),
      source: 'midi' as const,
      trackId: trackIndex,
    }))
    .sort((a, b) => a.ticks - b.ticks || a.midi - b.midi)
}

function midiTracksToProjectTracks(midi: Midi): MidiTrackData[] {
  return midi.tracks
    .map((track, index) => {
      const rawNotes = buildTrackNotes(midi, index)
      const notes = rawNotes.map((note) => toEditableNote(note, midi.header.ppq))
      const averageMidi = notes.length
        ? notes.reduce((sum, note) => sum + note.midi, 0) / notes.length
        : 0

      return {
        id: index,
        name: track.name || track.instrument.name || `Trilha ${index + 1}`,
        instrument: track.instrument.name || 'Instrumento desconhecido',
        notes,
        averageMidi,
      }
    })
    .filter((track) => track.notes.length > 0)
}

function chooseDefaultMidiTracks(tracks: MidiTrackData[]): number[] {
  const notationTracks = tracks.filter((track) => {
    const monophonicish = track.notes.length / Math.max(1, new Set(track.notes.map((note) => note.startBeat)).size) < 1.8
    const denseHarmonyBed = track.notes.length > 96 && track.averageMidi < 62
    return monophonicish || !denseHarmonyBed
  })

  const leadFirst = (notationTracks.length ? notationTracks : tracks).slice().sort((a, b) => {
    const aLead = /flute|voice|vocal|lead|melody|violin|sax|clarinet/i.test(`${a.name} ${a.instrument}`)
    const bLead = /flute|voice|vocal|lead|melody|violin|sax|clarinet/i.test(`${b.name} ${b.instrument}`)
    if (aLead !== bLead) return aLead ? -1 : 1
    return a.id - b.id
  })

  return leadFirst.map((track) => track.id)
}

function isGrandStaffTrack(track: MidiTrackData): boolean {
  const lowNotes = track.notes.filter((note) => note.midi < 60).length
  const highNotes = track.notes.filter((note) => note.midi >= 60).length
  const wideRange = lowNotes > 0 && highNotes > 0
  const dense = track.notes.length > 48
  const pianoLike = /piano|keyboard|grand/i.test(track.instrument)
  return pianoLike && wideRange && dense
}

function assignStaff(midi: number): number {
  return midi < 60 ? 2 : 1
}

function displayPartName(track: MidiTrackData): string {
  const source = `${track.name} ${track.instrument}`.toLowerCase()
  if (source.includes('flute') || source.includes('flauta')) return 'Flauta'
  if (source.includes('piano') || source.includes('keyboard') || source.includes('grand')) return 'Piano'
  return track.name
}

function looksLikeLeadTrack(track: MidiTrackData): boolean {
  const source = `${track.name} ${track.instrument}`.toLowerCase()
  if (/flute|flauta|voice|vocal|lead|melody|violin|sax|clarinet|solo/.test(source)) return true
  const starts = new Set(track.notes.map((note) => note.startBeat)).size
  const averageSimultaneous = track.notes.length / Math.max(1, starts)
  return averageSimultaneous < 1.4 && track.averageMidi >= 64
}

function looksLikeHarmonyTrack(track: MidiTrackData): boolean {
  const starts = new Set(track.notes.map((note) => note.startBeat)).size
  const averageSimultaneous = track.notes.length / Math.max(1, starts)
  return averageSimultaneous >= 2.2 || (track.notes.length > 96 && track.averageMidi < 64)
}

function resolveRenderMode(
  sourceType: 'midi' | 'audio',
  tracks: MidiTrackData[] | undefined,
  requestedMode: RenderMode | undefined,
): RenderMode {
  if (requestedMode && requestedMode !== 'auto') return requestedMode
  if (sourceType !== 'midi' || !tracks?.length) return 'lead-sheet'
  const hasLead = tracks.some(looksLikeLeadTrack)
  const hasHarmony = tracks.some(looksLikeHarmonyTrack)
  return hasLead && hasHarmony ? 'lead-sheet' : 'full'
}

function pickTracksForLeadSheet(tracks: MidiTrackData[], selectedTrackIds: number[]): MidiTrackData[] {
  const selected = tracks.filter((track) => selectedTrackIds.includes(track.id))
  const melodic = selected.filter((track) => !looksLikeHarmonyTrack(track))
  const leads = melodic.filter(looksLikeLeadTrack)
  const ordered = (leads.length ? leads : melodic).slice().sort((a, b) => a.id - b.id)
  return ordered.slice(0, 2)
}

export function buildScorePartsFromSelectedTracks(
  tracks: MidiTrackData[],
  selectedTrackIds: number[],
  ppq: number,
  renderMode: RenderMode = 'auto',
): ScorePart[] {
  const effectiveMode = resolveRenderMode('midi', tracks, renderMode)
  const sourceTracks =
    effectiveMode === 'lead-sheet'
      ? pickTracksForLeadSheet(tracks, selectedTrackIds)
      : tracks.filter((track) => selectedTrackIds.includes(track.id))
  const selected = new Set(sourceTracks.map((track) => track.id))

  return tracks
    .filter((track) => selected.has(track.id))
    .flatMap<ScorePart>((track) => {
      const rawNotes = track.notes.map((note) => ({
        id: note.id,
        midi: note.midi,
        ticks: Math.round(note.startBeat * ppq),
        durationTicks: Math.max(1, Math.round(note.durationBeats * ppq)),
        velocity: note.velocity,
        source: note.source,
        trackId: track.id,
      }))

      if (isGrandStaffTrack(track)) {
        const grandStaffNotes = rawNotes
          .map((note) => ({
            ...note,
            partId: `track-${track.id}`,
            staff: assignStaff(note.midi) as 1 | 2,
          }))
          .sort((a, b) => a.ticks - b.ticks || a.midi - b.midi)

        return [
          {
            id: `track-${track.id}`,
            name: displayPartName(track),
            instrument: track.instrument,
            clef: 'grand' as const,
            staves: 2,
            trackIds: [track.id],
            notes: grandStaffNotes,
          },
        ].filter((part) => part.notes.length > 0) as ScorePart[]
      }

      return [
        {
          id: `track-${track.id}`,
          name: displayPartName(track),
          instrument: track.instrument,
          clef: track.averageMidi < 56 ? 'bass' : 'treble',
          trackIds: [track.id],
          notes: rawNotes.map((note) => ({ ...note, partId: `track-${track.id}`, staff: 1 as const })),
        },
      ] as ScorePart[]
    })
}

export function mergeMidiTrackNotes(tracks: MidiTrackData[], selectedTrackIds: number[]): EditableNote[] {
  const selected = new Set(selectedTrackIds)
  return tracks
    .filter((track) => selected.has(track.id))
    .flatMap((track) => track.notes)
    .sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi)
}

function detectHarmonyTracks(tracks: MidiTrackData[], selectedTrackIds: number[]): MidiTrackData[] {
  const selected = new Set(selectedTrackIds)
  return tracks.filter((track) => {
    return !selected.has(track.id) && looksLikeHarmonyTrack(track)
  })
}

function pcName(pc: number): string {
  return ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][((pc % 12) + 12) % 12]
}

function detectChordLabel(midis: number[]): string {
  const pitchClasses = [...new Set(midis.map((midi) => ((midi % 12) + 12) % 12))]
  const bass = ((Math.min(...midis) % 12) + 12) % 12
  const templates = [
    { suffix: 'maj7', intervals: [0, 4, 7, 11] },
    { suffix: 'm7', intervals: [0, 3, 7, 10] },
    { suffix: '7', intervals: [0, 4, 7, 10] },
    { suffix: 'm', intervals: [0, 3, 7] },
    { suffix: '', intervals: [0, 4, 7] },
    { suffix: 'dim', intervals: [0, 3, 6] },
    { suffix: 'sus4', intervals: [0, 5, 7] },
  ]

  const candidates = pitchClasses.map((root) => {
    const normalized = pitchClasses.map((pc) => (pc - root + 12) % 12)
    let bestScore = -1
    let bestSuffix = ''

    for (const template of templates) {
      const matches = template.intervals.filter((interval) => normalized.includes(interval)).length
      const extras = normalized.length - matches
      const score = matches * 3 - extras
      if (score > bestScore) {
        bestScore = score
        bestSuffix = template.suffix
      }
    }

    return {
      root,
      score: bestScore + (root === bass ? 0.25 : 0),
      suffix: bestSuffix,
    }
  })

  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]
  const rootName = pcName(best.root)
  const bassName = pcName(bass)
  return `${rootName}${best.suffix}${best.root !== bass ? `/${bassName}` : ''}`
}

function buildChordSymbols(
  harmonyTracks: MidiTrackData[],
  timeSignatures: TimeSignatureChange[],
  ppq: number,
): ChordSymbol[] {
  if (!harmonyTracks.length) return []

  const allNotes = harmonyTracks.flatMap((track) => track.notes)
  const totalTicks = Math.max(...allNotes.map((note) => Math.round((note.startBeat + note.durationBeats) * ppq)), ppq * 4)
  const measures = buildMeasureTicks(totalTicks, timeSignatures, ppq)
  const symbols: ChordSymbol[] = []

  for (const measure of measures) {
    const notesInMeasure = allNotes.filter((note) => {
      const tick = Math.round(note.startBeat * ppq)
      return tick >= measure.startTick && tick < measure.endTick
    })

    if (!notesInMeasure.length) continue

    const groups = new Map<number, number[]>()
    for (const note of notesInMeasure) {
      const tick = Math.round(note.startBeat * ppq)
      const list = groups.get(tick) ?? []
      list.push(note.midi)
      groups.set(tick, list)
    }

    const firstRichGroup = [...groups.entries()].find(([, midis]) => midis.length >= 3)
    if (!firstRichGroup) continue

    symbols.push({
      tick: firstRichGroup[0],
      text: detectChordLabel(firstRichGroup[1]),
    })
  }

  return symbols
}

function buildMeasureTicks(totalTicks: number, timeSignatures: TimeSignatureChange[], ppq: number) {
  const signatures = timeSignatures.length
    ? [...timeSignatures].sort((a, b) => a.ticks - b.ticks)
    : [{ ticks: 0, numerator: 4, denominator: 4 }]
  const measures: Array<{ startTick: number; endTick: number }> = []

  for (let index = 0; index < signatures.length; index += 1) {
    const current = signatures[index]
    const nextTick = signatures[index + 1]?.ticks ?? totalTicks
    const measureLength = (ppq * 4 * current.numerator) / current.denominator
    let start = current.ticks

    while (start < nextTick) {
      const end = Math.min(start + measureLength, nextTick)
      measures.push({ startTick: start, endTick: end })
      start = end
    }
  }

  return measures
}

export function flattenScoreParts(parts: ScorePart[], ppq: number): EditableNote[] {
  return parts
    .flatMap((part) =>
      part.notes.map((note) => ({
        ...toEditableNote(note, ppq),
        partId: part.id,
      })),
    )
    .sort((a, b) => a.startBeat - b.startBeat || a.midi - b.midi)
}

export function rebuildScorePartsFromNotes(
  parts: ScorePart[],
  notes: EditableNote[],
  ppq: number,
): ScorePart[] {
  const notesByPart = new Map<string, TrackNote[]>()

  for (const note of notes) {
    const partId = note.partId
    if (!partId) continue
    const list = notesByPart.get(partId) ?? []
    list.push({
      id: note.id,
      midi: note.midi,
      ticks: Math.round(note.startBeat * ppq),
      durationTicks: Math.max(1, Math.round(note.durationBeats * ppq)),
      velocity: note.velocity,
      source: note.source,
      trackId: note.trackId,
      partId,
      staff: note.staff,
    })
    notesByPart.set(partId, list)
  }

  return parts.map((part) => ({
    ...part,
    notes: (notesByPart.get(part.id) ?? [])
      .slice()
      .sort((a, b) => a.ticks - b.ticks || a.midi - b.midi),
  }))
}

function midiTimeSignatures(midi: Midi): TimeSignatureChange[] {
  if (!midi.header.timeSignatures.length) {
    return [{ ticks: 0, numerator: 4, denominator: 4 }]
  }

  return midi.header.timeSignatures.map((change) => ({
    ticks: change.ticks,
    numerator: change.timeSignature[0],
    denominator: change.timeSignature[1],
  }))
}

async function decodeAudio(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer()
  const context = new AudioContext()
  try {
    return await context.decodeAudioData(arrayBuffer)
  } finally {
    await context.close()
  }
}

async function resampleAudioBuffer(audioBuffer: AudioBuffer, sampleRate: number): Promise<Float32Array> {
  const length = Math.ceil(audioBuffer.duration * sampleRate)
  const offline = new OfflineAudioContext(1, length, sampleRate)
  const source = offline.createBufferSource()
  const mono = offline.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate)

  if (audioBuffer.numberOfChannels === 1) {
    mono.copyToChannel(audioBuffer.getChannelData(0), 0)
  } else {
    const mixed = new Float32Array(audioBuffer.length)
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
      const data = audioBuffer.getChannelData(channel)
      for (let i = 0; i < data.length; i += 1) {
        mixed[i] += data[i] / audioBuffer.numberOfChannels
      }
    }
    mono.copyToChannel(mixed, 0)
  }

  source.buffer = mono
  source.connect(offline.destination)
  source.start(0)
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}

function estimateTempo(onsetSeconds: number[]): number {
  if (onsetSeconds.length < 2) return 120
  const sorted = [...onsetSeconds].sort((a, b) => a - b)
  const deltas = sorted
    .slice(1)
    .map((t, i) => t - sorted[i])
    .filter((d) => d > 0.05 && d < 2.5)

  if (!deltas.length) return 120

  const avg = deltas.reduce((sum, d) => sum + d, 0) / deltas.length
  const rawBpm = 60 / avg
  const commonBpms = [60, 70, 80, 90, 96, 100, 108, 110, 120, 126, 130, 140, 150, 160]
  const candidates = [rawBpm, rawBpm * 2, rawBpm / 2]
    .filter((b) => b >= 60 && b <= 180)
    .map((b) => ({ bpm: b, dist: Math.min(...commonBpms.map((x) => Math.abs(b - x))) }))
    .sort((a, b) => a.dist - b.dist)

  return candidates.length ? Math.round(candidates[0].bpm) : Math.max(60, Math.min(180, Math.round(rawBpm)))
}

function snapTicks(value: number, grid: number): number {
  return Math.round(value / grid) * grid
}

function sanitizeAudioMidiTrackNotes(trackNotes: TrackNote[], ppq: number): TrackNote[] {
  const grid = ppq / 4

  return trackNotes
    .map((note) => {
      const snappedTicks = Math.max(0, snapTicks(note.ticks, grid))
      const snappedDuration = Math.max(grid, snapTicks(note.durationTicks, grid))
      return {
        ...note,
        ticks: snappedTicks,
        durationTicks: snappedDuration,
      }
    })
    .filter((note, index, notes) => {
      const previous = notes[index - 1]
      if (!previous) return true

      // Drop near-duplicate detections from compressed audio.
      const veryCloseInTime = Math.abs(note.ticks - previous.ticks) <= grid / 2
      const samePitch = note.midi === previous.midi
      return !(veryCloseInTime && samePitch)
    })
    .sort((a, b) => a.ticks - b.ticks || a.midi - b.midi)
}

function projectFromMidi(
  midi: Midi,
  sourceName: string,
  preferredRenderMode: RenderMode = 'lead-sheet',
): ProjectData {
  const ppq = midi.header.ppq
  const midiTracks = midiTracksToProjectTracks(midi)
  const selectedTrackIds = chooseDefaultMidiTracks(midiTracks)
  const timeSignatures = midiTimeSignatures(midi)
  const renderMode = resolveRenderMode('midi', midiTracks, preferredRenderMode)
  const scoreParts = buildScorePartsFromSelectedTracks(midiTracks, selectedTrackIds, ppq, renderMode)
  const scorePartTrackIds = [...new Set(scoreParts.flatMap((part) => part.trackIds))]
  const harmonyTracks = detectHarmonyTracks(midiTracks, scorePartTrackIds)
  const notes = flattenScoreParts(scoreParts, ppq)
  const tempo = midi.header.tempos[0]?.bpm ? Math.round(midi.header.tempos[0].bpm) : 120
  const timeSignature = midi.header.timeSignatures[0]
    ? `${midi.header.timeSignatures[0].timeSignature[0]}/${midi.header.timeSignatures[0].timeSignature[1]}`
    : '4/4'

  return {
    notes,
    sourceName,
    sourceType: 'midi',
    renderMode,
    measuresPerSystem: timeSignature.startsWith('2/') ? 8 : 6,
    midiTracks,
    selectedTrackIds,
    scoreParts,
    timeSignatures,
    ppq,
    chordSymbols: buildChordSymbols(harmonyTracks, timeSignatures, ppq),
    meta: {
      ...DEFAULT_META,
      title: fileBaseName({ name: sourceName } as File),
      bpm: tempo,
      timeSignature,
    },
  }
}

async function audioToProject(file: File): Promise<ProjectData> {
  const decoded = await decodeAudio(file)
  const resampled = await resampleAudioBuffer(decoded, 22050)
  const model = getModel()
  const frames: number[][] = []
  const onsets: number[][] = []
  const contours: number[][] = []

  await model.evaluateModel(
    resampled,
    (frameValues, onsetValues, contourValues) => {
      frames.push(...frameValues)
      onsets.push(...onsetValues)
      contours.push(...contourValues)
    },
    () => {},
  )

  const rawNotes = outputToNotesPoly(frames, onsets, 0.35, 0.25, 5, true, null, null, true)
  const noteEvents = noteFramesToTime(addPitchBendsToNoteEvents(contours, rawNotes))

  if (!noteEvents.length) {
    throw new Error(
      'Nenhuma nota foi detectada neste áudio. Verifique se o arquivo contém melodia clara e tente novamente.',
    )
  }

  const ppq = 480
  const bpm = estimateTempo(
    noteEvents
      .filter((note) => note.durationSeconds >= 0.05)
      .map((note) => note.startTimeSeconds),
  )
  const ticksPerSecond = (bpm / 60) * ppq

  const trackNotes = sanitizeAudioMidiTrackNotes(
    noteEvents
      .filter((note) => note.durationSeconds >= 0.06)
      .map((note, index) => ({
        id: `audio-note-${index}`,
        midi: note.pitchMidi,
        ticks: Math.max(0, Math.round(note.startTimeSeconds * ticksPerSecond)),
        durationTicks: Math.max(ppq / 4, Math.round(note.durationSeconds * ticksPerSecond)),
        velocity: Math.round(Math.max(40, Math.min(127, note.amplitude * 127))),
        source: 'audio' as const,
        trackId: 0,
      })),
    ppq,
  )

  const midi = new Midi()
  midi.header.tempos = [{ bpm, ticks: 0 }]
  midi.header.timeSignatures = [{ ticks: 0, measures: 0, timeSignature: [4, 4] }]
  const track = midi.addTrack()
  track.name = 'Melodia transcrita'
  track.instrument.name = 'voice'

  for (const note of trackNotes) {
    track.addNote({
      midi: note.midi,
      ticks: note.ticks,
      durationTicks: Math.max(1, note.durationTicks),
      velocity: Math.max(0, Math.min(1, note.velocity / 127)),
    })
  }

  const project = projectFromMidi(midi, file.name, 'lead-sheet')

  return {
    ...project,
    sourceType: 'audio',
    meta: {
      ...project.meta,
      composer: 'SR Music Studio',
    },
    notes: project.notes.map((note) => ({ ...note, source: 'audio' })),
    scoreParts: project.scoreParts?.map((part) => ({
      ...part,
      notes: part.notes.map((note) => ({ ...note, source: 'audio' })),
    })),
    midiTracks: project.midiTracks?.map((trackData) => ({
      ...trackData,
      notes: trackData.notes.map((note) => ({ ...note, source: 'audio' })),
    })),
  }
}

async function midiToProject(file: File): Promise<ProjectData> {
  const data = await file.arrayBuffer()
  const midi = new Midi(data)
  return projectFromMidi(midi, file.name, 'lead-sheet')
}

export async function parseInputFile(file: File): Promise<ProjectData> {
  if (file.name.toLowerCase().endsWith('.mid') || file.name.toLowerCase().endsWith('.midi')) {
    return midiToProject(file)
  }

  return audioToProject(file)
}
