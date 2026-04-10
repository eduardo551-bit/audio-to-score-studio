// Cavaquinho chord database -- tuning D G B D
// frets: 0=open, 1-4=relative position (neck_fret = baseFret + fret - 1)

export interface CavacoPosition {
  frets: [number, number, number, number]
  fingers: [number, number, number, number]
  baseFret: number
  barres?: number[]
}

export interface CavacoChordEntry {
  key: string
  suffix: string
  positions: CavacoPosition[]
}

export const CAVACO_KEYS = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
]

export const CAVACO_SUFFIXES = [
  'major', 'minor', '7', 'm7', 'maj7', 'dim', 'sus4', 'sus2', '6', 'm6', 'aug', '9',
]

export const FRIENDLY_SUFFIXES: Record<string, string> = {
  major: 'Maior', minor: 'Menor', '7': '7', m7: 'm7', maj7: 'Maj7',
  dim: 'Diminuto', sus4: 'Sus4', sus2: 'Sus2', '6': '6', m6: 'm6',
  aug: 'Aumentado', '9': '9',
}

export const CAVACO_CHORDS: CavacoChordEntry[] = [
  // C
  { key: "C", suffix: "major", positions: [
    { frets: [2,0,1,2], fingers: [2,0,1,2], baseFret: 1, barres: [2] },
    { frets: [4,4,4,4], fingers: [1,1,1,1], baseFret: 2, barres: [4] },
  ]},
  { key: "C", suffix: "minor", positions: [
    { frets: [1,0,1,1], fingers: [1,0,1,1], baseFret: 1, barres: [1] },
    { frets: [4,4,3,4], fingers: [2,2,1,2], baseFret: 2, barres: [4] },
  ]},
  { key: "C", suffix: "7", positions: [
    { frets: [2,3,1,2], fingers: [2,3,1,2], baseFret: 1, barres: [2] },
    { frets: [1,1,1,4], fingers: [1,1,1,2], baseFret: 5, barres: [1] },
  ]},
  { key: "C", suffix: "m7", positions: [
    { frets: [1,3,1,1], fingers: [1,2,1,1], baseFret: 1, barres: [1] },
    { frets: [2,2,2,4], fingers: [1,1,1,2], baseFret: 7, barres: [2] },
  ]},
  { key: "C", suffix: "maj7", positions: [
    { frets: [2,4,1,2], fingers: [2,3,1,2], baseFret: 1, barres: [2] },
    { frets: [1,4,0,4], fingers: [1,2,0,2], baseFret: 2, barres: [4] },
  ]},
  { key: "C", suffix: "dim", positions: [
    { frets: [1,0,1,4], fingers: [1,0,1,2], baseFret: 1, barres: [1] },
    { frets: [3,4,3,3], fingers: [1,2,1,1], baseFret: 2, barres: [3] },
  ]},
  { key: "C", suffix: "sus4", positions: [
    { frets: [3,0,1,3], fingers: [2,0,1,2], baseFret: 1, barres: [3] },
    { frets: [2,4,0,4], fingers: [1,2,0,2], baseFret: 2, barres: [4] },
  ]},
  { key: "C", suffix: "sus2", positions: [
    { frets: [0,0,1,0], fingers: [0,0,1,0], baseFret: 1 },
    { frets: [0,4,2,4], fingers: [0,2,1,2], baseFret: 2, barres: [4] },
  ]},
  { key: "C", suffix: "6", positions: [
    { frets: [2,2,1,2], fingers: [2,2,1,2], baseFret: 1, barres: [2] },
    { frets: [2,2,2,4], fingers: [1,1,1,2], baseFret: 4, barres: [2] },
  ]},
  { key: "C", suffix: "m6", positions: [
    { frets: [1,2,1,1], fingers: [1,2,1,1], baseFret: 1, barres: [1] },
    { frets: [2,2,1,4], fingers: [2,2,1,3], baseFret: 4, barres: [2] },
  ]},
  { key: "C", suffix: "aug", positions: [
    { frets: [2,1,1,2], fingers: [2,1,1,2], baseFret: 1, barres: [1, 2] },
    { frets: [4,3,3,4], fingers: [2,1,1,2], baseFret: 3, barres: [3, 4] },
  ]},
  { key: "C", suffix: "9", positions: [
    { frets: [0,3,1,2], fingers: [0,3,1,2], baseFret: 1 },
    { frets: [0,1,1,4], fingers: [0,1,1,2], baseFret: 5, barres: [1] },
  ]},

  // C#
  { key: "C#", suffix: "major", positions: [
    { frets: [3,1,2,3], fingers: [3,1,2,3], baseFret: 1, barres: [3] },
    { frets: [4,4,4,4], fingers: [1,1,1,1], baseFret: 3, barres: [4] },
  ]},
  { key: "C#", suffix: "minor", positions: [
    { frets: [2,1,2,2], fingers: [2,1,2,2], baseFret: 1, barres: [2] },
    { frets: [4,4,3,4], fingers: [2,2,1,2], baseFret: 3, barres: [4] },
  ]},
  { key: "C#", suffix: "7", positions: [
    { frets: [3,4,2,3], fingers: [2,3,1,2], baseFret: 1, barres: [3] },
    { frets: [2,3,1,2], fingers: [2,3,1,2], baseFret: 2, barres: [2] },
  ]},
  { key: "C#", suffix: "m7", positions: [
    { frets: [2,4,2,2], fingers: [1,2,1,1], baseFret: 1, barres: [2] },
    { frets: [1,3,1,1], fingers: [1,2,1,1], baseFret: 2, barres: [1] },
  ]},
  { key: "C#", suffix: "maj7", positions: [
    { frets: [2,4,1,2], fingers: [2,3,1,2], baseFret: 2, barres: [2] },
    { frets: [3,3,2,4], fingers: [2,2,1,3], baseFret: 8, barres: [3] },
  ]},
  { key: "C#", suffix: "dim", positions: [
    { frets: [2,0,2,2], fingers: [1,0,1,1], baseFret: 1, barres: [2] },
    { frets: [1,0,1,1], fingers: [1,0,1,1], baseFret: 2, barres: [1] },
  ]},
  { key: "C#", suffix: "sus4", positions: [
    { frets: [4,1,2,4], fingers: [3,1,2,3], baseFret: 1, barres: [4] },
    { frets: [2,4,0,4], fingers: [1,2,0,2], baseFret: 3, barres: [4] },
  ]},
  { key: "C#", suffix: "sus2", positions: [
    { frets: [1,1,2,1], fingers: [1,1,2,1], baseFret: 1, barres: [1] },
    { frets: [4,4,2,4], fingers: [2,2,1,2], baseFret: 3, barres: [4] },
  ]},
  { key: "C#", suffix: "6", positions: [
    { frets: [3,3,2,3], fingers: [2,2,1,2], baseFret: 1, barres: [3] },
    { frets: [2,2,1,2], fingers: [2,2,1,2], baseFret: 2, barres: [2] },
  ]},
  { key: "C#", suffix: "m6", positions: [
    { frets: [2,3,2,2], fingers: [1,2,1,1], baseFret: 1, barres: [2] },
    { frets: [1,2,1,1], fingers: [1,2,1,1], baseFret: 2, barres: [1] },
  ]},
  { key: "C#", suffix: "aug", positions: [
    { frets: [3,2,2,3], fingers: [2,1,1,2], baseFret: 1, barres: [2, 3] },
    { frets: [2,1,1,2], fingers: [2,1,1,2], baseFret: 2, barres: [1, 2] },
  ]},
  { key: "C#", suffix: "9", positions: [
    { frets: [1,4,2,3], fingers: [1,4,2,3], baseFret: 1 },
    { frets: [2,1,0,4], fingers: [2,1,0,3], baseFret: 10 },
  ]},

  // D
  { key: "D", suffix: "major", positions: [
    { frets: [0,2,3,4], fingers: [0,1,2,3], baseFret: 1 },
    { frets: [0,1,2,3], fingers: [0,1,2,3], baseFret: 2 },
  ]},
  { key: "D", suffix: "minor", positions: [
    { frets: [0,2,3,3], fingers: [0,1,2,2], baseFret: 1, barres: [3] },
    { frets: [0,1,2,2], fingers: [0,1,2,2], baseFret: 2, barres: [2] },
  ]},
  { key: "D", suffix: "7", positions: [
    { frets: [0,2,1,4], fingers: [0,2,1,3], baseFret: 1 },
    { frets: [0,4,2,3], fingers: [0,3,1,2], baseFret: 2 },
  ]},
  { key: "D", suffix: "m7", positions: [
    { frets: [0,2,1,3], fingers: [0,2,1,3], baseFret: 1 },
    { frets: [0,4,2,2], fingers: [0,2,1,1], baseFret: 2, barres: [2] },
  ]},
  { key: "D", suffix: "maj7", positions: [
    { frets: [0,2,2,4], fingers: [0,1,1,2], baseFret: 1, barres: [2] },
    { frets: [0,1,1,3], fingers: [0,1,1,2], baseFret: 2, barres: [1] },
  ]},
  { key: "D", suffix: "dim", positions: [
    { frets: [0,1,3,3], fingers: [0,1,2,2], baseFret: 1, barres: [3] },
    { frets: [0,0,4,4], fingers: [0,0,1,1], baseFret: 3, barres: [4] },
  ]},
  { key: "D", suffix: "sus4", positions: [
    { frets: [0,1,2,4], fingers: [0,1,2,3], baseFret: 2 },
    { frets: [0,0,0,4], fingers: [0,0,0,1], baseFret: 4 },
  ]},
  { key: "D", suffix: "sus2", positions: [
    { frets: [0,2,3,2], fingers: [0,1,2,1], baseFret: 1, barres: [2] },
    { frets: [0,1,2,1], fingers: [0,1,2,1], baseFret: 2, barres: [1] },
  ]},
  { key: "D", suffix: "6", positions: [
    { frets: [0,4,0,4], fingers: [0,1,0,1], baseFret: 1, barres: [4] },
    { frets: [0,3,0,3], fingers: [0,1,0,1], baseFret: 2, barres: [3] },
  ]},
  { key: "D", suffix: "m6", positions: [
    { frets: [0,2,0,3], fingers: [0,1,0,2], baseFret: 1 },
    { frets: [0,1,0,2], fingers: [0,1,0,2], baseFret: 2 },
  ]},
  { key: "D", suffix: "aug", positions: [
    { frets: [0,3,3,4], fingers: [0,1,1,2], baseFret: 1, barres: [3] },
    { frets: [0,2,2,3], fingers: [0,1,1,2], baseFret: 2, barres: [2] },
  ]},
  { key: "D", suffix: "9", positions: [
    { frets: [0,4,4,3], fingers: [0,2,2,1], baseFret: 2, barres: [4] },
    { frets: [0,3,3,2], fingers: [0,2,2,1], baseFret: 3, barres: [3] },
  ]},

  // Eb
  { key: "Eb", suffix: "major", positions: [
    { frets: [4,2,3,4], fingers: [3,1,2,3], baseFret: 2, barres: [4] },
    { frets: [3,1,2,3], fingers: [3,1,2,3], baseFret: 3, barres: [3] },
  ]},
  { key: "Eb", suffix: "minor", positions: [
    { frets: [4,3,4,4], fingers: [2,1,2,2], baseFret: 1, barres: [4] },
    { frets: [3,2,3,3], fingers: [2,1,2,2], baseFret: 2, barres: [3] },
  ]},
  { key: "Eb", suffix: "7", positions: [
    { frets: [1,0,2,1], fingers: [1,0,2,1], baseFret: 1, barres: [1] },
    { frets: [3,4,2,3], fingers: [2,3,1,2], baseFret: 3, barres: [3] },
  ]},
  { key: "Eb", suffix: "m7", positions: [
    { frets: [1,3,2,4], fingers: [1,3,2,4], baseFret: 1 },
    { frets: [2,4,2,2], fingers: [1,2,1,1], baseFret: 3, barres: [2] },
  ]},
  { key: "Eb", suffix: "maj7", positions: [
    { frets: [0,0,4,0], fingers: [0,0,1,0], baseFret: 1 },
    { frets: [0,0,3,0], fingers: [0,0,1,0], baseFret: 2 },
  ]},
  { key: "Eb", suffix: "dim", positions: [
    { frets: [4,2,4,4], fingers: [2,1,2,2], baseFret: 1, barres: [4] },
    { frets: [3,1,3,3], fingers: [2,1,2,2], baseFret: 2, barres: [3] },
  ]},
  { key: "Eb", suffix: "sus4", positions: [
    { frets: [4,1,2,4], fingers: [3,1,2,3], baseFret: 3, barres: [4] },
    { frets: [2,4,0,4], fingers: [1,2,0,2], baseFret: 5, barres: [4] },
  ]},
  { key: "Eb", suffix: "sus2", positions: [
    { frets: [3,3,4,3], fingers: [1,1,2,1], baseFret: 1, barres: [3] },
    { frets: [2,2,3,2], fingers: [1,1,2,1], baseFret: 2, barres: [2] },
  ]},
  { key: "Eb", suffix: "6", positions: [
    { frets: [1,0,1,1], fingers: [1,0,1,1], baseFret: 1, barres: [1] },
    { frets: [4,4,3,4], fingers: [2,2,1,2], baseFret: 2, barres: [4] },
  ]},
  { key: "Eb", suffix: "m6", positions: [
    { frets: [1,3,1,4], fingers: [1,2,1,3], baseFret: 1, barres: [1] },
    { frets: [3,4,3,3], fingers: [1,2,1,1], baseFret: 2, barres: [3] },
  ]},
  { key: "Eb", suffix: "aug", positions: [
    { frets: [1,0,0,1], fingers: [1,0,0,1], baseFret: 1, barres: [1] },
    { frets: [4,3,3,4], fingers: [2,1,1,2], baseFret: 2, barres: [3, 4] },
  ]},
  { key: "Eb", suffix: "9", positions: [
    { frets: [1,0,2,3], fingers: [1,0,2,3], baseFret: 1 },
    { frets: [1,4,2,3], fingers: [1,4,2,3], baseFret: 3 },
  ]},

  // E
  { key: "E", suffix: "major", positions: [
    { frets: [2,1,0,2], fingers: [2,1,0,2], baseFret: 1, barres: [2] },
    { frets: [4,2,3,4], fingers: [3,1,2,3], baseFret: 3, barres: [4] },
  ]},
  { key: "E", suffix: "minor", positions: [
    { frets: [2,0,0,2], fingers: [1,0,0,1], baseFret: 1, barres: [2] },
    { frets: [1,0,0,1], fingers: [1,0,0,1], baseFret: 2, barres: [1] },
  ]},
  { key: "E", suffix: "7", positions: [
    { frets: [0,1,0,2], fingers: [0,1,0,2], baseFret: 1 },
    { frets: [0,2,3,4], fingers: [0,1,2,3], baseFret: 3 },
  ]},
  { key: "E", suffix: "m7", positions: [
    { frets: [0,0,0,2], fingers: [0,0,0,1], baseFret: 1 },
    { frets: [0,0,0,1], fingers: [0,0,0,1], baseFret: 2 },
  ]},
  { key: "E", suffix: "maj7", positions: [
    { frets: [1,1,0,2], fingers: [1,1,0,2], baseFret: 1, barres: [1] },
    { frets: [2,4,1,2], fingers: [2,3,1,2], baseFret: 5, barres: [2] },
  ]},
  { key: "E", suffix: "dim", positions: [
    { frets: [4,2,4,4], fingers: [2,1,2,2], baseFret: 2, barres: [4] },
    { frets: [3,1,3,3], fingers: [2,1,2,2], baseFret: 3, barres: [3] },
  ]},
  { key: "E", suffix: "sus4", positions: [
    { frets: [2,2,0,2], fingers: [1,1,0,1], baseFret: 1, barres: [2] },
    { frets: [1,1,0,1], fingers: [1,1,0,1], baseFret: 2, barres: [1] },
  ]},
  { key: "E", suffix: "sus2", positions: [
    { frets: [2,4,0,4], fingers: [1,2,0,2], baseFret: 1, barres: [4] },
    { frets: [1,3,0,3], fingers: [1,2,0,2], baseFret: 2, barres: [3] },
  ]},
  { key: "E", suffix: "6", positions: [
    { frets: [2,1,2,2], fingers: [2,1,2,2], baseFret: 1, barres: [2] },
    { frets: [4,4,3,4], fingers: [2,2,1,2], baseFret: 3, barres: [4] },
  ]},
  { key: "E", suffix: "m6", positions: [
    { frets: [2,0,2,2], fingers: [1,0,1,1], baseFret: 1, barres: [2] },
    { frets: [1,0,1,1], fingers: [1,0,1,1], baseFret: 2, barres: [1] },
  ]},
  { key: "E", suffix: "aug", positions: [
    { frets: [2,1,1,2], fingers: [2,1,1,2], baseFret: 1, barres: [1, 2] },
    { frets: [4,3,3,4], fingers: [2,1,1,2], baseFret: 3, barres: [3, 4] },
  ]},
  { key: "E", suffix: "9", positions: [
    { frets: [2,1,3,4], fingers: [2,1,3,4], baseFret: 1 },
    { frets: [1,4,2,3], fingers: [1,4,2,3], baseFret: 4 },
  ]},

  // F
  { key: "F", suffix: "major", positions: [
    { frets: [3,2,1,3], fingers: [3,2,1,3], baseFret: 1, barres: [3] },
    { frets: [4,2,3,4], fingers: [3,1,2,3], baseFret: 4, barres: [4] },
  ]},
  { key: "F", suffix: "minor", positions: [
    { frets: [3,1,1,3], fingers: [2,1,1,2], baseFret: 1, barres: [1, 3] },
    { frets: [4,3,4,4], fingers: [2,1,2,2], baseFret: 3, barres: [4] },
  ]},
  { key: "F", suffix: "7", positions: [
    { frets: [1,2,1,3], fingers: [1,2,1,3], baseFret: 1, barres: [1] },
    { frets: [2,1,3,2], fingers: [2,1,3,2], baseFret: 2, barres: [2] },
  ]},
  { key: "F", suffix: "m7", positions: [
    { frets: [1,1,1,3], fingers: [1,1,1,2], baseFret: 1, barres: [1] },
    { frets: [1,3,2,4], fingers: [1,3,2,4], baseFret: 3 },
  ]},
  { key: "F", suffix: "maj7", positions: [
    { frets: [2,2,1,3], fingers: [2,2,1,3], baseFret: 1, barres: [2] },
    { frets: [1,1,4,2], fingers: [1,1,3,2], baseFret: 2, barres: [1] },
  ]},
  { key: "F", suffix: "dim", positions: [
    { frets: [3,1,0,3], fingers: [2,1,0,2], baseFret: 1, barres: [3] },
    { frets: [4,2,4,4], fingers: [2,1,2,2], baseFret: 3, barres: [4] },
  ]},
  { key: "F", suffix: "sus4", positions: [
    { frets: [3,3,1,3], fingers: [2,2,1,2], baseFret: 1, barres: [3] },
    { frets: [4,1,2,4], fingers: [3,1,2,3], baseFret: 5, barres: [4] },
  ]},
  { key: "F", suffix: "sus2", positions: [
    { frets: [3,0,1,3], fingers: [2,0,1,2], baseFret: 1, barres: [3] },
    { frets: [2,4,0,4], fingers: [1,2,0,2], baseFret: 2, barres: [4] },
  ]},
  { key: "F", suffix: "6", positions: [
    { frets: [0,2,1,3], fingers: [0,2,1,3], baseFret: 1 },
    { frets: [0,1,2,2], fingers: [0,1,2,2], baseFret: 2, barres: [2] },
  ]},
  { key: "F", suffix: "m6", positions: [
    { frets: [0,1,1,3], fingers: [0,1,1,2], baseFret: 1, barres: [1] },
    { frets: [0,3,4,4], fingers: [0,1,2,2], baseFret: 3, barres: [4] },
  ]},
  { key: "F", suffix: "aug", positions: [
    { frets: [3,2,2,3], fingers: [2,1,1,2], baseFret: 1, barres: [2, 3] },
    { frets: [2,1,1,2], fingers: [2,1,1,2], baseFret: 2, barres: [1, 2] },
  ]},
  { key: "F", suffix: "9", positions: [
    { frets: [2,1,3,4], fingers: [2,1,3,4], baseFret: 2 },
    { frets: [1,4,2,3], fingers: [1,4,2,3], baseFret: 5 },
  ]},

  // F#
  { key: "F#", suffix: "major", positions: [
    { frets: [4,3,2,4], fingers: [3,2,1,3], baseFret: 1, barres: [4] },
    { frets: [3,2,1,3], fingers: [3,2,1,3], baseFret: 2, barres: [3] },
  ]},
  { key: "F#", suffix: "minor", positions: [
    { frets: [4,2,2,4], fingers: [2,1,1,2], baseFret: 1, barres: [2, 4] },
    { frets: [3,1,1,3], fingers: [2,1,1,2], baseFret: 2, barres: [1, 3] },
  ]},
  { key: "F#", suffix: "7", positions: [
    { frets: [2,3,2,4], fingers: [1,2,1,3], baseFret: 1, barres: [2] },
    { frets: [1,2,1,3], fingers: [1,2,1,3], baseFret: 2, barres: [1] },
  ]},
  { key: "F#", suffix: "m7", positions: [
    { frets: [2,2,2,4], fingers: [1,1,1,2], baseFret: 1, barres: [2] },
    { frets: [1,1,1,3], fingers: [1,1,1,2], baseFret: 2, barres: [1] },
  ]},
  { key: "F#", suffix: "maj7", positions: [
    { frets: [3,3,2,4], fingers: [2,2,1,3], baseFret: 1, barres: [3] },
    { frets: [2,2,1,3], fingers: [2,2,1,3], baseFret: 2, barres: [2] },
  ]},
  { key: "F#", suffix: "dim", positions: [
    { frets: [4,2,1,4], fingers: [3,2,1,3], baseFret: 1, barres: [4] },
    { frets: [4,2,4,4], fingers: [2,1,2,2], baseFret: 4, barres: [4] },
  ]},
  { key: "F#", suffix: "sus4", positions: [
    { frets: [4,4,2,4], fingers: [2,2,1,2], baseFret: 1, barres: [4] },
    { frets: [3,3,1,3], fingers: [2,2,1,2], baseFret: 2, barres: [3] },
  ]},
  { key: "F#", suffix: "sus2", positions: [
    { frets: [4,1,2,4], fingers: [3,1,2,3], baseFret: 1, barres: [4] },
    { frets: [2,4,0,4], fingers: [1,2,0,2], baseFret: 3, barres: [4] },
  ]},
  { key: "F#", suffix: "6", positions: [
    { frets: [4,3,4,4], fingers: [2,1,2,2], baseFret: 1, barres: [4] },
    { frets: [3,2,3,3], fingers: [2,1,2,2], baseFret: 2, barres: [3] },
  ]},
  { key: "F#", suffix: "m6", positions: [
    { frets: [1,2,2,4], fingers: [1,2,2,3], baseFret: 1, barres: [2] },
    { frets: [3,1,3,3], fingers: [2,1,2,2], baseFret: 2, barres: [3] },
  ]},
  { key: "F#", suffix: "aug", positions: [
    { frets: [0,3,3,4], fingers: [0,1,1,2], baseFret: 1, barres: [3] },
    { frets: [0,2,2,3], fingers: [0,1,1,2], baseFret: 2, barres: [2] },
  ]},
  { key: "F#", suffix: "9", positions: [
    { frets: [2,1,3,4], fingers: [2,1,3,4], baseFret: 3 },
    { frets: [1,4,2,3], fingers: [1,4,2,3], baseFret: 6 },
  ]},

  // G
  { key: "G", suffix: "major", positions: [
    { frets: [0,0,0,0], fingers: [0,0,0,0], baseFret: 1 },
    { frets: [0,0,0,0], fingers: [0,0,0,0], baseFret: 2 },
  ]},
  { key: "G", suffix: "minor", positions: [
    { frets: [0,2,2,4], fingers: [0,1,1,2], baseFret: 2, barres: [2] },
    { frets: [0,1,1,3], fingers: [0,1,1,2], baseFret: 3, barres: [1] },
  ]},
  { key: "G", suffix: "7", positions: [
    { frets: [0,0,0,3], fingers: [0,0,0,1], baseFret: 1 },
    { frets: [0,0,0,2], fingers: [0,0,0,1], baseFret: 2 },
  ]},
  { key: "G", suffix: "m7", positions: [
    { frets: [2,2,2,4], fingers: [1,1,1,2], baseFret: 2, barres: [2] },
    { frets: [1,1,1,3], fingers: [1,1,1,2], baseFret: 3, barres: [1] },
  ]},
  { key: "G", suffix: "maj7", positions: [
    { frets: [0,0,0,4], fingers: [0,0,0,1], baseFret: 1 },
    { frets: [0,0,0,3], fingers: [0,0,0,1], baseFret: 2 },
  ]},
  { key: "G", suffix: "dim", positions: [
    { frets: [4,2,1,4], fingers: [3,2,1,3], baseFret: 2, barres: [4] },
    { frets: [4,2,4,4], fingers: [2,1,2,2], baseFret: 5, barres: [4] },
  ]},
  { key: "G", suffix: "sus4", positions: [
    { frets: [0,0,1,0], fingers: [0,0,1,0], baseFret: 1 },
    { frets: [0,4,2,4], fingers: [0,2,1,2], baseFret: 2, barres: [4] },
  ]},
  { key: "G", suffix: "sus2", positions: [
    { frets: [0,1,2,4], fingers: [0,1,2,3], baseFret: 2 },
    { frets: [0,0,0,4], fingers: [0,0,0,1], baseFret: 4 },
  ]},
  { key: "G", suffix: "6", positions: [
    { frets: [0,0,0,2], fingers: [0,0,0,1], baseFret: 1 },
    { frets: [0,0,0,1], fingers: [0,0,0,1], baseFret: 2 },
  ]},
  { key: "G", suffix: "m6", positions: [
    { frets: [0,2,4,4], fingers: [0,1,2,2], baseFret: 2, barres: [4] },
    { frets: [0,1,3,3], fingers: [0,1,2,2], baseFret: 3, barres: [3] },
  ]},
  { key: "G", suffix: "aug", positions: [
    { frets: [1,0,0,1], fingers: [1,0,0,1], baseFret: 1, barres: [1] },
    { frets: [4,3,3,4], fingers: [2,1,1,2], baseFret: 2, barres: [3, 4] },
  ]},
  { key: "G", suffix: "9", positions: [
    { frets: [2,1,0,4], fingers: [2,1,0,3], baseFret: 2 },
    { frets: [2,1,3,4], fingers: [2,1,3,4], baseFret: 4 },
  ]},

  // Ab
  { key: "Ab", suffix: "major", positions: [
    { frets: [1,1,1,1], fingers: [1,1,1,1], baseFret: 1, barres: [1] },
    { frets: [4,3,2,4], fingers: [3,2,1,3], baseFret: 3, barres: [4] },
  ]},
  { key: "Ab", suffix: "minor", positions: [
    { frets: [1,1,0,1], fingers: [1,1,0,1], baseFret: 1, barres: [1] },
    { frets: [4,2,2,4], fingers: [2,1,1,2], baseFret: 3, barres: [2, 4] },
  ]},
  { key: "Ab", suffix: "7", positions: [
    { frets: [1,1,1,4], fingers: [1,1,1,2], baseFret: 1, barres: [1] },
    { frets: [2,3,2,4], fingers: [1,2,1,3], baseFret: 3, barres: [2] },
  ]},
  { key: "Ab", suffix: "m7", positions: [
    { frets: [1,1,0,4], fingers: [1,1,0,2], baseFret: 1, barres: [1] },
    { frets: [2,2,2,4], fingers: [1,1,1,2], baseFret: 3, barres: [2] },
  ]},
  { key: "Ab", suffix: "maj7", positions: [
    { frets: [3,3,2,4], fingers: [2,2,1,3], baseFret: 3, barres: [3] },
    { frets: [2,2,1,3], fingers: [2,2,1,3], baseFret: 4, barres: [2] },
  ]},
  { key: "Ab", suffix: "dim", positions: [
    { frets: [0,1,0,0], fingers: [0,1,0,0], baseFret: 1 },
    { frets: [0,2,0,4], fingers: [0,1,0,2], baseFret: 3 },
  ]},
  { key: "Ab", suffix: "sus4", positions: [
    { frets: [1,1,2,1], fingers: [1,1,2,1], baseFret: 1, barres: [1] },
    { frets: [4,4,2,4], fingers: [2,2,1,2], baseFret: 3, barres: [4] },
  ]},
  { key: "Ab", suffix: "sus2", positions: [
    { frets: [4,1,2,4], fingers: [3,1,2,3], baseFret: 3, barres: [4] },
    { frets: [2,4,0,4], fingers: [1,2,0,2], baseFret: 5, barres: [4] },
  ]},
  { key: "Ab", suffix: "6", positions: [
    { frets: [1,1,1,3], fingers: [1,1,1,2], baseFret: 1, barres: [1] },
    { frets: [4,3,4,4], fingers: [2,1,2,2], baseFret: 3, barres: [4] },
  ]},
  { key: "Ab", suffix: "m6", positions: [
    { frets: [1,1,0,3], fingers: [1,1,0,2], baseFret: 1, barres: [1] },
    { frets: [1,2,2,4], fingers: [1,2,2,3], baseFret: 3, barres: [2] },
  ]},
  { key: "Ab", suffix: "aug", positions: [
    { frets: [2,1,1,2], fingers: [2,1,1,2], baseFret: 1, barres: [1, 2] },
    { frets: [4,3,3,4], fingers: [2,1,1,2], baseFret: 3, barres: [3, 4] },
  ]},
  { key: "Ab", suffix: "9", positions: [
    { frets: [2,1,3,4], fingers: [2,1,3,4], baseFret: 5 },
    { frets: [1,4,2,3], fingers: [1,4,2,3], baseFret: 8 },
  ]},

  // A
  { key: "A", suffix: "major", positions: [
    { frets: [2,2,2,2], fingers: [1,1,1,1], baseFret: 1, barres: [2] },
    { frets: [1,1,1,1], fingers: [1,1,1,1], baseFret: 2, barres: [1] },
  ]},
  { key: "A", suffix: "minor", positions: [
    { frets: [2,2,1,2], fingers: [2,2,1,2], baseFret: 1, barres: [2] },
    { frets: [4,2,2,4], fingers: [2,1,1,2], baseFret: 4, barres: [2, 4] },
  ]},
  { key: "A", suffix: "7", positions: [
    { frets: [1,1,1,4], fingers: [1,1,1,2], baseFret: 2, barres: [1] },
    { frets: [2,3,2,4], fingers: [1,2,1,3], baseFret: 4, barres: [2] },
  ]},
  { key: "A", suffix: "m7", positions: [
    { frets: [2,2,2,4], fingers: [1,1,1,2], baseFret: 4, barres: [2] },
    { frets: [1,1,1,3], fingers: [1,1,1,2], baseFret: 5, barres: [1] },
  ]},
  { key: "A", suffix: "maj7", positions: [
    { frets: [3,3,2,4], fingers: [2,2,1,3], baseFret: 4, barres: [3] },
    { frets: [2,2,1,3], fingers: [2,2,1,3], baseFret: 5, barres: [2] },
  ]},
  { key: "A", suffix: "dim", positions: [
    { frets: [1,2,1,1], fingers: [1,2,1,1], baseFret: 1, barres: [1] },
    { frets: [4,2,1,4], fingers: [3,2,1,3], baseFret: 4, barres: [4] },
  ]},
  { key: "A", suffix: "sus4", positions: [
    { frets: [0,2,3,2], fingers: [0,1,2,1], baseFret: 1, barres: [2] },
    { frets: [0,1,2,1], fingers: [0,1,2,1], baseFret: 2, barres: [1] },
  ]},
  { key: "A", suffix: "sus2", positions: [
    { frets: [2,2,0,2], fingers: [1,1,0,1], baseFret: 1, barres: [2] },
    { frets: [1,1,0,1], fingers: [1,1,0,1], baseFret: 2, barres: [1] },
  ]},
  { key: "A", suffix: "6", positions: [
    { frets: [2,2,2,4], fingers: [1,1,1,2], baseFret: 1, barres: [2] },
    { frets: [1,1,1,3], fingers: [1,1,1,2], baseFret: 2, barres: [1] },
  ]},
  { key: "A", suffix: "m6", positions: [
    { frets: [2,2,1,4], fingers: [2,2,1,3], baseFret: 1, barres: [2] },
    { frets: [1,2,2,4], fingers: [1,2,2,3], baseFret: 4, barres: [2] },
  ]},
  { key: "A", suffix: "aug", positions: [
    { frets: [3,2,2,3], fingers: [2,1,1,2], baseFret: 1, barres: [2, 3] },
    { frets: [2,1,1,2], fingers: [2,1,1,2], baseFret: 2, barres: [1, 2] },
  ]},
  { key: "A", suffix: "9", positions: [
    { frets: [2,3,0,4], fingers: [1,2,0,3], baseFret: 4 },
    { frets: [1,2,0,3], fingers: [1,2,0,3], baseFret: 5 },
  ]},

  // Bb
  { key: "Bb", suffix: "major", positions: [
    { frets: [0,3,3,3], fingers: [0,1,1,1], baseFret: 1, barres: [3] },
    { frets: [0,2,2,2], fingers: [0,1,1,1], baseFret: 2, barres: [2] },
  ]},
  { key: "Bb", suffix: "minor", positions: [
    { frets: [3,3,2,3], fingers: [2,2,1,2], baseFret: 1, barres: [3] },
    { frets: [2,2,1,2], fingers: [2,2,1,2], baseFret: 2, barres: [2] },
  ]},
  { key: "Bb", suffix: "7", positions: [
    { frets: [0,1,4,4], fingers: [0,1,2,2], baseFret: 3, barres: [4] },
    { frets: [2,3,2,4], fingers: [1,2,1,3], baseFret: 5, barres: [2] },
  ]},
  { key: "Bb", suffix: "m7", positions: [
    { frets: [2,2,2,4], fingers: [1,1,1,2], baseFret: 5, barres: [2] },
    { frets: [1,1,1,3], fingers: [1,1,1,2], baseFret: 6, barres: [1] },
  ]},
  { key: "Bb", suffix: "maj7", positions: [
    { frets: [3,3,2,4], fingers: [2,2,1,3], baseFret: 5, barres: [3] },
    { frets: [2,2,1,3], fingers: [2,2,1,3], baseFret: 6, barres: [2] },
  ]},
  { key: "Bb", suffix: "dim", positions: [
    { frets: [2,3,2,2], fingers: [1,2,1,1], baseFret: 1, barres: [2] },
    { frets: [1,2,1,1], fingers: [1,2,1,1], baseFret: 2, barres: [1] },
  ]},
  { key: "Bb", suffix: "sus4", positions: [
    { frets: [3,3,4,3], fingers: [1,1,2,1], baseFret: 1, barres: [3] },
    { frets: [2,2,3,2], fingers: [1,1,2,1], baseFret: 2, barres: [2] },
  ]},
  { key: "Bb", suffix: "sus2", positions: [
    { frets: [3,3,1,3], fingers: [2,2,1,2], baseFret: 1, barres: [3] },
    { frets: [4,1,2,4], fingers: [3,1,2,3], baseFret: 5, barres: [4] },
  ]},
  { key: "Bb", suffix: "6", positions: [
    { frets: [2,2,2,4], fingers: [1,1,1,2], baseFret: 2, barres: [2] },
    { frets: [1,1,1,3], fingers: [1,1,1,2], baseFret: 3, barres: [1] },
  ]},
  { key: "Bb", suffix: "m6", positions: [
    { frets: [2,2,1,4], fingers: [2,2,1,3], baseFret: 2, barres: [2] },
    { frets: [1,2,2,4], fingers: [1,2,2,3], baseFret: 5, barres: [2] },
  ]},
  { key: "Bb", suffix: "aug", positions: [
    { frets: [0,3,3,4], fingers: [0,1,1,2], baseFret: 1, barres: [3] },
    { frets: [0,2,2,3], fingers: [0,1,1,2], baseFret: 2, barres: [2] },
  ]},
  { key: "Bb", suffix: "9", positions: [
    { frets: [2,1,3,4], fingers: [2,1,3,4], baseFret: 7 },
    { frets: [0,4,2,1], fingers: [0,3,2,1], baseFret: 10 },
  ]},

  // B
  { key: "B", suffix: "major", positions: [
    { frets: [4,4,4,4], fingers: [1,1,1,1], baseFret: 1, barres: [4] },
    { frets: [3,3,3,3], fingers: [1,1,1,1], baseFret: 2, barres: [3] },
  ]},
  { key: "B", suffix: "minor", positions: [
    { frets: [0,4,0,4], fingers: [0,1,0,1], baseFret: 1, barres: [4] },
    { frets: [0,3,0,3], fingers: [0,1,0,1], baseFret: 2, barres: [3] },
  ]},
  { key: "B", suffix: "7", positions: [
    { frets: [1,2,0,1], fingers: [1,2,0,1], baseFret: 1, barres: [1] },
    { frets: [1,1,1,4], fingers: [1,1,1,2], baseFret: 4, barres: [1] },
  ]},
  { key: "B", suffix: "m7", positions: [
    { frets: [0,2,0,0], fingers: [0,1,0,0], baseFret: 1 },
    { frets: [0,1,0,0], fingers: [0,1,0,0], baseFret: 2 },
  ]},
  { key: "B", suffix: "maj7", positions: [
    { frets: [1,3,0,4], fingers: [1,2,0,3], baseFret: 1 },
    { frets: [4,4,0,4], fingers: [1,1,0,1], baseFret: 5, barres: [4] },
  ]},
  { key: "B", suffix: "dim", positions: [
    { frets: [0,4,0,3], fingers: [0,2,0,1], baseFret: 1 },
    { frets: [0,3,0,2], fingers: [0,2,0,1], baseFret: 2 },
  ]},
  { key: "B", suffix: "sus4", positions: [
    { frets: [2,4,0,4], fingers: [1,2,0,2], baseFret: 1, barres: [4] },
    { frets: [1,3,0,3], fingers: [1,2,0,2], baseFret: 2, barres: [3] },
  ]},
  { key: "B", suffix: "sus2", positions: [
    { frets: [4,4,2,4], fingers: [2,2,1,2], baseFret: 1, barres: [4] },
    { frets: [3,3,1,3], fingers: [2,2,1,2], baseFret: 2, barres: [3] },
  ]},
  { key: "B", suffix: "6", positions: [
    { frets: [1,1,0,1], fingers: [1,1,0,1], baseFret: 1, barres: [1] },
    { frets: [2,2,2,4], fingers: [1,1,1,2], baseFret: 3, barres: [2] },
  ]},
  { key: "B", suffix: "m6", positions: [
    { frets: [0,1,0,0], fingers: [0,1,0,0], baseFret: 1 },
    { frets: [0,2,0,4], fingers: [0,1,0,2], baseFret: 3 },
  ]},
  { key: "B", suffix: "aug", positions: [
    { frets: [1,0,0,1], fingers: [1,0,0,1], baseFret: 1, barres: [1] },
    { frets: [4,3,3,4], fingers: [2,1,1,2], baseFret: 2, barres: [3, 4] },
  ]},
  { key: "B", suffix: "9", positions: [
    { frets: [2,1,3,4], fingers: [2,1,3,4], baseFret: 8 },
    { frets: [1,4,0,3], fingers: [1,3,0,2], baseFret: 11 },
  ]},

]

export const CAVACO_CHORD_MAP = new Map<string, CavacoChordEntry>()
for (const entry of CAVACO_CHORDS) {
  CAVACO_CHORD_MAP.set(`${entry.key}__${entry.suffix}`, entry)
}

export function getCavacoChord(key: string, suffix: string): CavacoChordEntry | undefined {
  return CAVACO_CHORD_MAP.get(`${key}__${suffix}`)
}

export function getCavacoSuffixesForKey(key: string): string[] {
  return CAVACO_CHORDS
    .filter(e => e.key === key)
    .map(e => e.suffix)
}
