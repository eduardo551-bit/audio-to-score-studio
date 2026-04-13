import { useState } from 'react'
import { useLocalStorage } from '../utils/useLocalStorage'

const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

// Chromatic pitch classes
const KEY_PC: Record<string, number> = {
  C:0,'C#':1,D:2,Eb:3,E:4,F:5,'F#':6,G:7,Ab:8,A:9,Bb:10,B:11
}

// Diatonic scale (major) intervals
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]
// Chord quality per degree in major key
const MAJOR_QUALITIES = ['major','minor','minor','major','major','minor','dim']
// Chord quality per degree in minor key (natural)
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]
const MINOR_QUALITIES = ['minor','dim','major','minor','minor','major','major']

const NOTE_NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const NOTE_NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
const USE_FLAT_PCS = new Set([1, 3, 5, 8, 10])

function noteName(pc: number, rootPc: number): string {
  return USE_FLAT_PCS.has(rootPc) ? NOTE_NAMES_FLAT[pc] : NOTE_NAMES_SHARP[pc]
}

const QUALITY_LABEL: Record<string, string> = {
  major: '', minor: 'm', dim: '°', aug: '+',
  '7': '7', 'm7': 'm7', 'maj7': 'M7',
}

interface Progression {
  name: string
  description: string
  degrees: number[] // 0-indexed
  genre: string
}

const PROGRESSIONS: Progression[] = [
  { name: 'I – IV – V – I',         description: 'Base do blues, rock e pop',        degrees: [0,3,4,0], genre: 'Blues / Pop' },
  { name: 'I – V – vi – IV',        description: 'A mais popular do pop moderno',     degrees: [0,4,5,3], genre: 'Pop' },
  { name: 'I – IV – V',             description: 'Clássico do blues e country',       degrees: [0,3,4],   genre: 'Blues' },
  { name: 'ii – V – I',             description: 'Progressão do jazz',                degrees: [1,4,0],   genre: 'Jazz' },
  { name: 'I – vi – IV – V',        description: 'Anos 50, doo-wop',                  degrees: [0,5,3,4], genre: 'Doo-wop' },
  { name: 'I – vi – ii – V',        description: 'Jazz e bossa nova',                 degrees: [0,5,1,4], genre: 'Bossa Nova' },
  { name: 'vi – IV – I – V',        description: 'Rock e pop contemporâneo',          degrees: [5,3,0,4], genre: 'Rock' },
  { name: 'I – III – IV – iv',      description: 'Movimento cromatico no IV',         degrees: [0,2,3,3], genre: 'Pop / Soul' },
  { name: 'I – IV – I – V',        description: 'Folk e música caipira',              degrees: [0,3,0,4], genre: 'Folk' },
  { name: 'i – VII – VI – VII',     description: 'Progressão eólica / modal',         degrees: [0,6,5,6], genre: 'Modal' },
  { name: 'i – iv – VII – III',     description: 'Flamenco e musica latina',          degrees: [0,3,6,2], genre: 'Latino' },
  { name: 'I – II – IV – I',        description: 'Mistura de graus maiores',          degrees: [0,1,3,0], genre: 'Samba / MPB' },
]

function buildChords(rootPc: number, mode: 'major' | 'minor') {
  const scale = mode === 'major' ? MAJOR_SCALE : MINOR_SCALE
  const qualities = mode === 'major' ? MAJOR_QUALITIES : MINOR_QUALITIES
  return scale.map((interval, i) => {
    const pc = (rootPc + interval) % 12
    const name = noteName(pc, rootPc)
    const quality = qualities[i]
    return { name: name + (QUALITY_LABEL[quality] ?? quality), quality, pc }
  })
}

export function ChordProgressions() {
  const [root, setRoot] = useLocalStorage('prog-root', 'C')
  const [mode, setMode] = useLocalStorage<'major' | 'minor'>('prog-mode', 'major')
  const [selected, setSelected] = useState(0)

  const rootPc = KEY_PC[root]
  const chords = buildChords(rootPc, mode)
  const prog = PROGRESSIONS[selected]

  // Adjust degree index for minor: degree vi in major = degree i in minor
  const degreeChords = prog.degrees.map(d => chords[d % chords.length])

  return (
    <section className="panel chord-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Harmonia</p>
          <h3>Progressões de Acordes</h3>
        </div>
        <span className="preview-badge">{prog.genre}</span>
      </div>

      <div className="scale-controls">
        <label className="scale-label">
          <span>Tom</span>
          <select value={root} onChange={e => setRoot(e.target.value)}>
            {ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="scale-label">
          <span>Modo</span>
          <select value={mode} onChange={e => setMode(e.target.value as 'major' | 'minor')}>
            <option value="major">Maior</option>
            <option value="minor">Menor</option>
          </select>
        </label>
      </div>

      <div className="prog-list">
        {PROGRESSIONS.map((p, i) => (
          <button
            key={i}
            className={`prog-item ${selected === i ? 'prog-item-active' : ''}`}
            onClick={() => setSelected(i)}
          >
            <span className="prog-name">{p.name}</span>
            <span className="prog-genre">{p.genre}</span>
          </button>
        ))}
      </div>

      <div className="prog-result">
        <p className="prog-description">{prog.description}</p>
        <div className="prog-chords">
          {degreeChords.map((chord, i) => (
            <div key={i} className="prog-chord-chip">
              <span className="prog-degree">{['I','II','III','IV','V','VI','VII'][prog.degrees[i] % 7]}</span>
              <strong>{chord.name}</strong>
            </div>
          ))}
        </div>

        <div className="prog-diatonic">
          <p className="eyebrow" style={{ marginBottom: 6 }}>Todos os acordes do tom</p>
          <div className="diatonic-row">
            {chords.map((chord, i) => (
              <div key={i} className={`diatonic-chip ${prog.degrees.includes(i) ? 'diatonic-chip-used' : ''}`}>
                <span>{['I','II','III','IV','V','VI','VII'][i]}</span>
                <strong>{chord.name}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
