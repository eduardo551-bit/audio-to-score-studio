export interface CavacoShape {
  key: string
  suffix: string
  positions: Array<{
    frets: number[]
    fingers: number[]
    barres?: number[]
    baseFret: number
    capo?: boolean
  }>
}

export const CAVAQUINHO_TUNING = ['D4', 'B3', 'G3', 'D3']

export const CAVAQUINHO_SUFFIX_ORDER = [
  'major',
  'minor',
  '7',
  'maj7',
  '6',
  '9',
  'm7',
  'm7/9',
] as const

export const CAVAQUINHO_CHORDS: CavacoShape[] = [
  { key: 'C', suffix: 'major', positions: [{ frets: [2, 0, 1, 2], fingers: [2, 0, 1, 3], baseFret: 1 }] },
  { key: 'D', suffix: 'major', positions: [{ frets: [0, 2, 1, 2], fingers: [0, 2, 1, 3], baseFret: 1 }] },
  { key: 'E', suffix: 'major', positions: [{ frets: [2, 1, 0, 2], fingers: [3, 2, 0, 4], baseFret: 1 }] },
  { key: 'F', suffix: 'major', positions: [{ frets: [3, 1, 2, 3], fingers: [3, 1, 2, 4], baseFret: 1 }] },
  { key: 'G', suffix: 'major', positions: [{ frets: [0, 0, 0, 0], fingers: [0, 0, 0, 0], baseFret: 1 }] },
  { key: 'A', suffix: 'major', positions: [{ frets: [2, 2, 2, 2], fingers: [1, 1, 1, 1], barres: [2], baseFret: 1 }] },
  { key: 'B', suffix: 'major', positions: [{ frets: [4, 4, 4, 4], fingers: [1, 1, 1, 1], barres: [4], baseFret: 1 }] },

  { key: 'C', suffix: 'minor', positions: [{ frets: [1, 1, 0, 1], fingers: [1, 2, 0, 3], baseFret: 1 }] },
  { key: 'D', suffix: 'minor', positions: [{ frets: [2, 3, 2, 2], fingers: [1, 3, 2, 1], barres: [2], baseFret: 1 }] },
  { key: 'E', suffix: 'minor', positions: [{ frets: [2, 0, 0, 2], fingers: [2, 0, 0, 3], baseFret: 1 }] },
  { key: 'F', suffix: 'minor', positions: [{ frets: [3, 3, 2, 3], fingers: [1, 1, 2, 1], barres: [3], baseFret: 1 }] },
  { key: 'G', suffix: 'minor', positions: [{ frets: [1, 1, 0, 1], fingers: [1, 2, 0, 3], baseFret: 3 }] },
  { key: 'A', suffix: 'minor', positions: [{ frets: [2, 2, 1, 2], fingers: [2, 3, 1, 4], baseFret: 1 }] },
  { key: 'B', suffix: 'minor', positions: [{ frets: [4, 4, 3, 4], fingers: [1, 1, 2, 1], barres: [4], baseFret: 1 }] },

  { key: 'C', suffix: '7', positions: [{ frets: [2, 0, 3, 2], fingers: [1, 0, 4, 2], baseFret: 1 }] },
  { key: 'D', suffix: '7', positions: [{ frets: [0, 2, 1, 2], fingers: [0, 2, 1, 3], baseFret: 1 }] },
  { key: 'E', suffix: '7', positions: [{ frets: [0, 1, 0, 2], fingers: [0, 1, 0, 2], baseFret: 1 }] },
  { key: 'F', suffix: '7', positions: [{ frets: [3, 1, 3, 3], fingers: [2, 1, 3, 4], baseFret: 1 }] },
  { key: 'G', suffix: '7', positions: [{ frets: [1, 0, 0, 1], fingers: [1, 0, 0, 2], baseFret: 1 }] },
  { key: 'A', suffix: '7', positions: [{ frets: [2, 0, 2, 2], fingers: [2, 0, 3, 4], baseFret: 1 }] },
  { key: 'B', suffix: '7', positions: [{ frets: [4, 2, 4, 4], fingers: [2, 1, 3, 4], baseFret: 1 }] },

  { key: 'C', suffix: 'maj7', positions: [{ frets: [0, 2, 2, 2], fingers: [0, 1, 2, 3], baseFret: 1 }] },
  { key: 'D', suffix: 'maj7', positions: [{ frets: [2, 2, 2, 4], fingers: [1, 1, 1, 3], barres: [2], baseFret: 1 }] },
  { key: 'E', suffix: 'maj7', positions: [{ frets: [2, 1, 0, 1], fingers: [3, 2, 0, 1], baseFret: 1 }] },
  { key: 'F', suffix: 'maj7', positions: [{ frets: [3, 1, 2, 2], fingers: [3, 1, 2, 2], baseFret: 1 }] },
  { key: 'G', suffix: 'maj7', positions: [{ frets: [0, 0, 0, 2], fingers: [0, 0, 0, 2], baseFret: 1 }] },
  { key: 'A', suffix: 'maj7', positions: [{ frets: [2, 2, 2, 1], fingers: [2, 3, 4, 1], baseFret: 1 }] },
  { key: 'B', suffix: 'maj7', positions: [{ frets: [4, 4, 4, 3], fingers: [2, 3, 4, 1], baseFret: 1 }] },

  { key: 'C', suffix: '6', positions: [{ frets: [5, 5, 5, 7], fingers: [1, 1, 1, 3], barres: [5], baseFret: 5 }] },
  { key: 'D', suffix: '6', positions: [{ frets: [4, 2, 0, 0], fingers: [4, 2, 0, 0], baseFret: 1 }] },
  { key: 'E', suffix: '6', positions: [{ frets: [2, 1, 2, 2], fingers: [2, 1, 3, 4], baseFret: 1 }] },
  { key: 'F', suffix: '6', positions: [{ frets: [3, 1, 2, 0], fingers: [3, 1, 2, 0], baseFret: 1 }] },
  { key: 'G', suffix: '6', positions: [{ frets: [0, 0, 0, 2], fingers: [0, 0, 0, 2], baseFret: 1 }] },
  { key: 'A', suffix: '6', positions: [{ frets: [5, 5, 5, 7], fingers: [1, 1, 1, 3], barres: [5], baseFret: 5 }] },
  { key: 'B', suffix: '6', positions: [{ frets: [4, 4, 4, 6], fingers: [1, 1, 1, 3], barres: [4], baseFret: 4 }] },

  { key: 'C', suffix: '9', positions: [{ frets: [2, 0, 1, 0], fingers: [2, 0, 1, 0], baseFret: 1 }] },
  { key: 'D', suffix: '9', positions: [{ frets: [5, 5, 5, 7], fingers: [1, 1, 1, 3], barres: [5], baseFret: 5 }] },
  { key: 'E', suffix: '9', positions: [{ frets: [2, 1, 0, 4], fingers: [2, 1, 0, 4], baseFret: 1 }] },
  { key: 'F', suffix: '9', positions: [{ frets: [3, 1, 2, 3], fingers: [3, 1, 2, 4], baseFret: 1 }] },
  { key: 'G', suffix: '9', positions: [{ frets: [3, 1, 0, 3], fingers: [3, 1, 0, 4], baseFret: 1 }] },
  { key: 'A', suffix: '9', positions: [{ frets: [5, 5, 5, 7], fingers: [1, 1, 1, 3], barres: [5], baseFret: 5 }] },
  { key: 'B', suffix: '9', positions: [{ frets: [4, 4, 4, 6], fingers: [1, 1, 1, 3], barres: [4], baseFret: 4 }] },

  { key: 'C', suffix: 'm7', positions: [{ frets: [3, 1, 3, 3], fingers: [2, 1, 3, 4], baseFret: 1 }] },
  { key: 'D', suffix: 'm7', positions: [{ frets: [2, 3, 2, 0], fingers: [1, 3, 2, 0], baseFret: 1 }] },
  { key: 'E', suffix: 'm7', positions: [{ frets: [2, 0, 0, 0], fingers: [2, 0, 0, 0], baseFret: 1 }] },
  { key: 'F', suffix: 'm7', positions: [{ frets: [3, 3, 3, 3], fingers: [1, 1, 1, 1], barres: [3], baseFret: 1 }] },
  { key: 'G', suffix: 'm7', positions: [{ frets: [5, 5, 5, 5], fingers: [1, 1, 1, 1], barres: [5], baseFret: 5 }] },
  { key: 'A', suffix: 'm7', positions: [{ frets: [5, 5, 5, 5], fingers: [1, 1, 1, 1], barres: [5], baseFret: 5 }] },
  { key: 'B', suffix: 'm7', positions: [{ frets: [4, 2, 4, 2], fingers: [2, 1, 3, 1], baseFret: 1 }] },

  { key: 'C', suffix: 'm7/9', positions: [{ frets: [3, 3, 3, 5], fingers: [1, 1, 1, 3], barres: [3], baseFret: 3 }] },
  { key: 'D', suffix: 'm7/9', positions: [{ frets: [5, 5, 5, 7], fingers: [1, 1, 1, 3], barres: [5], baseFret: 5 }] },
  { key: 'E', suffix: 'm7/9', positions: [{ frets: [2, 2, 2, 4], fingers: [1, 1, 1, 3], barres: [2], baseFret: 2 }] },
  { key: 'F', suffix: 'm7/9', positions: [{ frets: [3, 3, 3, 5], fingers: [1, 1, 1, 3], barres: [3], baseFret: 3 }] },
  { key: 'G', suffix: 'm7/9', positions: [{ frets: [5, 5, 5, 7], fingers: [1, 1, 1, 3], barres: [5], baseFret: 5 }] },
  { key: 'A', suffix: 'm7/9', positions: [{ frets: [7, 7, 7, 9], fingers: [1, 1, 1, 3], barres: [7], baseFret: 7 }] },
  { key: 'B', suffix: 'm7/9', positions: [{ frets: [9, 9, 9, 11], fingers: [1, 1, 1, 3], barres: [9], baseFret: 9 }] },
]
