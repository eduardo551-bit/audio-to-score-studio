import { useState } from 'react'
import { useLocalStorage } from '../utils/useLocalStorage'

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const KEY_PC: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4,
  F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9,
  'A#': 10, Bb: 10, B: 11,
}
// flat-preference keys
const FLAT_KEYS = new Set([1, 3, 5, 8, 10])

function transposeRoot(root: string, semitones: number): string {
  const pc = KEY_PC[root]
  if (pc === undefined) return root
  const newPc = ((pc + semitones) % 12 + 12) % 12
  const useFlat = FLAT_KEYS.has(newPc)
  return useFlat ? FLAT[newPc] : SHARP[newPc]
}

function transposeText(text: string, semitones: number): string {
  if (semitones === 0) return text
  // Faz match em tokens de acorde: [A-G][#b]? não precedidos por letra,
  // seguidos de: fim, espaço, número, símbolo, ou sufixo de acorde válido.
  // Evita transpor letras no meio de palavras (ex: "Empire", "Embora").
  return text.replace(
    /(?<![A-Za-z])([A-G][#b]?)(?=$|[^A-Za-z]|m(?:aj7?|in|7|6|9)?(?=[^a-z]|$)|dim|sus[24]?|aug)/g,
    (match) => transposeRoot(match, semitones),
  )
}

const EXAMPLES = [
  'Am  G  F  E7',
  'Dm7  G7  Cmaj7  Am7',
  'C  F  G  Am',
  'Em  Bm  C  G',
]

export function ChordTransposer() {
  const [input, setInput] = useLocalStorage('transposer-input', EXAMPLES[0])
  const [semitones, setSemitones] = useState(0)

  const output = transposeText(input, semitones)
  const intervalLabel = semitones === 0 ? 'Original'
    : semitones > 0 ? `+${semitones} semitons`
    : `${semitones} semitons`

  return (
    <section className="panel chord-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Arranjo</p>
          <h3>Transpositor</h3>
        </div>
        <span className={`preview-badge ${semitones !== 0 ? 'badge-active' : ''}`}>{intervalLabel}</span>
      </div>

      <div className="transpose-grid">
        <label className="scale-label">
          <span>Progressão original</span>
          <textarea
            className="transpose-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={3}
            placeholder="Ex: Am  G  F  E7"
            spellCheck={false}
          />
        </label>

        <div className="transpose-slider-block">
          <span>Transposição</span>
          <div className="transpose-slider-row">
            <button className="ghost-button transpose-step" onClick={() => setSemitones(s => Math.max(-11, s - 1))}>−</button>
            <input
              type="range" min={-11} max={11} value={semitones}
              onChange={e => setSemitones(Number(e.target.value))}
              className="transpose-range"
            />
            <button className="ghost-button transpose-step" onClick={() => setSemitones(s => Math.min(11, s + 1))}>+</button>
          </div>
          <div className="transpose-marks">
            {[-6, -3, 0, 3, 6].map(n => (
              <button key={n} className={`transpose-mark ${semitones === n ? 'transpose-mark-active' : ''}`}
                onClick={() => setSemitones(n)}>
                {n > 0 ? `+${n}` : n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="transpose-output-wrap">
        <span className="transpose-output-label">Resultado</span>
        <div className="transpose-output">{output || '—'}</div>
        <button className="ghost-button transpose-copy"
          onClick={() => navigator.clipboard?.writeText(output)}>
          Copiar
        </button>
      </div>

      <div className="transpose-examples">
        <span>Exemplos:</span>
        {EXAMPLES.map(ex => (
          <button key={ex} className="transpose-example-btn"
            onClick={() => { setInput(ex); setSemitones(0) }}>
            {ex}
          </button>
        ))}
      </div>
    </section>
  )
}
