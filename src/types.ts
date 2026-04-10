export interface EditableNote {
  id: string
  midi: number
  startBeat: number
  durationBeats: number
  velocity: number
  source: 'midi' | 'audio'
  trackId?: number
  partId?: string
  staff?: number
}

export interface TrackNote {
  id: string
  midi: number
  ticks: number
  durationTicks: number
  velocity: number
  source: 'midi' | 'audio'
  trackId?: number
  partId?: string
  staff?: number
}

export interface MidiTrackData {
  id: number
  name: string
  instrument: string
  notes: EditableNote[]
  averageMidi: number
}

export interface TimeSignatureChange {
  ticks: number
  numerator: number
  denominator: number
}

export interface ChordSymbol {
  tick: number
  text: string
}

export type RenderMode = 'auto' | 'lead-sheet' | 'full'

export interface ScorePart {
  id: string
  name: string
  instrument: string
  clef: 'treble' | 'bass' | 'grand'
  staves?: number
  trackIds: number[]
  notes: TrackNote[]
}

export interface ScoreMeta {
  title: string
  composer: string
  bpm: number
  timeSignature: string
}

export interface ProjectData {
  notes: EditableNote[]
  meta: ScoreMeta
  sourceName: string
  sourceType: 'midi' | 'audio'
  renderMode?: RenderMode
  measuresPerSystem?: number
  midiTracks?: MidiTrackData[]
  selectedTrackIds?: number[]
  scoreParts?: ScorePart[]
  timeSignatures?: TimeSignatureChange[]
  ppq?: number
  chordSymbols?: ChordSymbol[]
}

export interface ScoreMeasure {
  number: number
  notes: EditableNote[]
}
