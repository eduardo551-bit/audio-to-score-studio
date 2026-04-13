import { useState } from 'react'
import { useLocalStorage } from '../utils/useLocalStorage'

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const KEY_PC: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4,
  F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9,
  'A#': 10, Bb: 10, B: 11,
}
const FLAT_KEYS = new Set([1, 3, 5, 8, 10])

// Regex que identifica tokens de acorde válidos
const CHORD_TOKEN_RE = /^[A-G][#b]?(m(?:aj7?|in|7|6|9)?|dim|sus[24]?|aug|7|6|9|M7|\+|°|add9|m6|m9|5)?([/][A-G][#b]?)?$/

function transposeRoot(root: string, semitones: number): string {
  const pc = KEY_PC[root]
  if (pc === undefined) return root
  const newPc = ((pc + semitones) % 12 + 12) % 12
  return FLAT_KEYS.has(newPc) ? FLAT[newPc] : SHARP[newPc]
}

function transposeToken(token: string, semitones: number): string {
  return token.replace(
    /(?<![A-Za-z])([A-G][#b]?)(?=$|[^A-Za-z]|m(?:aj7?|in|7|6|9)?(?=[^a-z]|$)|dim|sus[24]?|aug)/g,
    (match) => transposeRoot(match, semitones),
  )
}

// Uma linha é considerada "linha de acordes" se ≥ 60% dos tokens são acordes válidos
function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return false
  const chordCount = tokens.filter(t => CHORD_TOKEN_RE.test(t)).length
  return chordCount / tokens.length >= 0.6
}

function transposeText(text: string, semitones: number): string {
  if (semitones === 0) return text
  return text.replace(
    /(?<![A-Za-z])([A-G][#b]?)(?=$|[^A-Za-z]|m(?:aj7?|in|7|6|9)?(?=[^a-z]|$)|dim|sus[24]?|aug)/g,
    (match) => transposeRoot(match, semitones),
  )
}

function transposeChordSheet(text: string, semitones: number): string {
  if (semitones === 0) return text
  return text
    .split('\n')
    .map(line => (isChordLine(line) ? transposeToken(line, semitones) : line))
    .join('\n')
}

const EXAMPLES = [
  'Am  G  F  E7',
  'Dm7  G7  Cmaj7  Am7',
  'C  F  G  Am',
  'Em  Bm  C  G',
]

const CIFRA_EXAMPLE = `Am        G         F        E7
Quando a saudade aperta o coração
Dm7       G7        Cmaj7
E a noite cobre tudo de silêncio`

export function ChordTransposer() {
  const [input, setInput] = useLocalStorage('transposer-input', EXAMPLES[0])
  const [semitones, setSemitones] = useState(0)
  const [mode, setMode] = useLocalStorage<'livre' | 'cifra'>('transposer-mode', 'livre')

  const output = mode === 'cifra'
    ? transposeChordSheet(input, semitones)
    : transposeText(input, semitones)

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

      <div className="instrument-toggle" style={{ marginBottom: 8 }}>
        <button
          className={`toggle-chip ${mode === 'livre' ? 'toggle-chip-active' : ''}`}
          onClick={() => setMode('livre')}
        >
          Modo livre
        </button>
        <button
          className={`toggle-chip ${mode === 'cifra' ? 'toggle-chip-active' : ''}`}
          onClick={() => setMode('cifra')}
        >
          Cifra com letra
        </button>
      </div>

      {mode === 'cifra' && (
        <p className="transpose-mode-hint">
          Linhas de acordes são detectadas automaticamente e transpostas. Linhas de letra são preservadas.
        </p>
      )}

      <div className="transpose-grid">
        <label className="scale-label">
          <span>Progressão original</span>
          <textarea
            className="transpose-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={mode === 'cifra' ? 6 : 3}
            placeholder={mode === 'cifra' ? 'Cole a cifra completa aqui (acordes + letra)' : 'Ex: Am  G  F  E7'}
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
        <div className={`transpose-output${mode === 'cifra' ? ' transpose-output-cifra' : ''}`}>
          {output || '—'}
        </div>
        <button className="ghost-button transpose-copy"
          onClick={() => navigator.clipboard?.writeText(output)}>
          Copiar
        </button>
      </div>

      <div className="transpose-examples">
        <span>Exemplos:</span>
        {EXAMPLES.map(ex => (
          <button key={ex} className="transpose-example-btn"
            onClick={() => { setInput(ex); setSemitones(0); setMode('livre') }}>
            {ex}
          </button>
        ))}
        <button className="transpose-example-btn"
          onClick={() => { setInput(CIFRA_EXAMPLE); setSemitones(0); setMode('cifra') }}>
          Cifra com letra
        </button>
      </div>
    </section>
  )
}
