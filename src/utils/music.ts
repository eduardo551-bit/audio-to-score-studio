import type { EditableNote, ScoreMeasure } from '../types'

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const DURATION_OPTIONS = [
  { beats: 4, label: 'whole', vex: 'w' },
  { beats: 3, label: 'half.', vex: 'hd' },
  { beats: 2, label: 'half', vex: 'h' },
  { beats: 1.5, label: 'quarter.', vex: 'qd' },
  { beats: 1, label: 'quarter', vex: 'q' },
  { beats: 0.5, label: 'eighth', vex: '8' },
  { beats: 0.25, label: '16th', vex: '16' },
] as const

export function midiToLabel(midi: number): string {
  const note = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${note}${octave}`
}

export function labelToMidi(label: string): number {
  const match = label.trim().toUpperCase().match(/^([A-G])([#B]?)(-?\d)$/)
  if (!match) {
    throw new Error('Use notas como C4, F#3 ou Bb5.')
  }

  const [, letter, accidental, octaveRaw] = match
  const noteMap: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  }

  let midi = noteMap[letter] + (Number(octaveRaw) + 1) * 12
  if (accidental === '#') midi += 1
  if (accidental === 'B') midi -= 1
  return midi
}

export function clampMidi(midi: number): number {
  return Math.min(108, Math.max(24, Math.round(midi)))
}

export function snapDuration(durationBeats: number): (typeof DURATION_OPTIONS)[number] {
  return DURATION_OPTIONS.reduce((best, option) => {
    return Math.abs(option.beats - durationBeats) < Math.abs(best.beats - durationBeats)
      ? option
      : best
  }, DURATION_OPTIONS[0])
}

export function groupIntoMeasures(notes: EditableNote[], timeSignature: string): ScoreMeasure[] {
  const beatsPerMeasure = Number(timeSignature.split('/')[0] ?? 4)
  const ordered = [...notes].sort((a, b) => a.startBeat - b.startBeat)
  const lastBeat = ordered.reduce(
    (max, note) => Math.max(max, note.startBeat + note.durationBeats),
    beatsPerMeasure,
  )
  const measureCount = Math.max(1, Math.ceil(lastBeat / beatsPerMeasure))

  return Array.from({ length: measureCount }, (_, index) => {
    const start = index * beatsPerMeasure
    const end = start + beatsPerMeasure
    return {
      number: index + 1,
      notes: ordered.filter((note) => note.startBeat >= start && note.startBeat < end),
    }
  })
}

export function beatsToMusicXmlDuration(durationBeats: number, divisions = 4): number {
  return Math.max(1, Math.round(durationBeats * divisions))
}

export function noteToVexKey(midi: number): string {
  const label = midiToLabel(midi).toLowerCase().replace('b', '@')
  const match = label.match(/^([a-g])([#@]?)(-?\d)$/)
  if (!match) return 'c/4'
  const [, note, accidental, octave] = match
  const normalizedAccidental = accidental === '@' ? 'b' : accidental
  return `${note}${normalizedAccidental}/${octave}`
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
