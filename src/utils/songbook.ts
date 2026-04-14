import type { AnalyzedChord } from './harmony'

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const NOTE_TO_PC: Record<string, number> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
}

const CHORD_LINE_TOKEN_RE =
  /^(?:[A-G][#b]?(?:maj7|m7\(b5\)|m7|m6|m9|m|sus2|sus4|sus|dim|aug|add9|7M|6\/9|7\/9|7|6|9)?(?:\/[A-G][#b]?)?|\||%|>|\(|\)|\d+|[°º])+$/i

const CHORD_CAPTURE_RE =
  /([A-G](?:#|b)?(?:maj7|m7\(b5\)|m7|m6|m9|m|sus2|sus4|sus|dim|aug|add9|7M|6\/9|7\/9|7|6|9)?(?:\/[A-G](?:#|b)?)?)/g

export type SongbookLinePart =
  | { type: 'text'; value: string }
  | { type: 'chord'; value: string; analysis?: AnalyzedChord | null }

function shouldPreferFlatsFromKey(key: string | null | undefined) {
  if (!key) return false
  return /b/.test(key) || ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Bbm', 'Ebm', 'Abm'].includes(key)
}

function pcToNote(pc: number, preferFlats: boolean) {
  const normalized = ((pc % 12) + 12) % 12
  return preferFlats ? FLAT_NOTES[normalized] : SHARP_NOTES[normalized]
}

export function isChordLine(line: string) {
  const tokens = line.trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return false
  const chordLike = tokens.filter((token) => CHORD_LINE_TOKEN_RE.test(token)).length
  return chordLike / tokens.length >= 0.6
}

export function transposeChordToken(token: string, semitones: number, preferFlats = false) {
  if (!semitones) return token
  return token.replace(/([A-G](?:#|b)?)/g, (match) => {
    const pc = NOTE_TO_PC[match]
    if (pc === undefined) return match
    return pcToNote(pc + semitones, preferFlats)
  })
}

export function transposeChordSheet(text: string, semitones: number, key?: string | null) {
  if (!semitones) return text
  const preferFlats = shouldPreferFlatsFromKey(key)
  return text
    .split('\n')
    .map((line) => {
      if (!isChordLine(line)) return line
      return line.replace(CHORD_CAPTURE_RE, (match) => transposeChordToken(match, semitones, preferFlats))
    })
    .join('\n')
}

export function transposeKeyLabel(key: string | null | undefined, semitones: number) {
  if (!key || key === 'Sem tom') return 'Sem tom'
  const isMinor = /m$/.test(key)
  const tonic = isMinor ? key.slice(0, -1) : key
  const pc = NOTE_TO_PC[tonic]
  if (pc === undefined) return key
  const next = pcToNote(pc + semitones, shouldPreferFlatsFromKey(key))
  return `${next}${isMinor ? 'm' : ''}`
}

export function getOverrideKey(songId: string, version: string) {
  return `${songId}::${version}`
}

export function getSongText(
  songId: string,
  version: string,
  fallbackText: string,
  overrides: Record<string, string>,
) {
  return overrides[getOverrideKey(songId, version)] ?? fallbackText
}

export function splitChordLine(line: string, analyses?: AnalyzedChord[]) {
  const parts: SongbookLinePart[] = []
  let cursor = 0
  let analysisCursor = 0
  for (const match of line.matchAll(CHORD_CAPTURE_RE)) {
    const chord = match[0]
    const index = match.index ?? 0
    if (index > cursor) {
      parts.push({ type: 'text', value: line.slice(cursor, index) })
    }
    parts.push({
      type: 'chord',
      value: chord,
      analysis: analyses?.[analysisCursor] ?? null,
    })
    analysisCursor += 1
    cursor = index + chord.length
  }
  if (cursor < line.length) {
    parts.push({ type: 'text', value: line.slice(cursor) })
  }
  if (!parts.length) {
    parts.push({ type: 'text', value: line })
  }
  return parts
}
