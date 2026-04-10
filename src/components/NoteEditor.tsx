import type { EditableNote } from '../types'
import { clampMidi, labelToMidi, midiToLabel } from '../utils/music'

interface Props {
  notes: EditableNote[]
  onChange: (notes: EditableNote[]) => void
}

const DURATION_PRESETS = [0.25, 0.5, 1, 1.5, 2, 3, 4]

function updateNote(notes: EditableNote[], id: string, updater: (note: EditableNote) => EditableNote) {
  return notes.map((note) => (note.id === id ? updater(note) : note))
}

export function NoteEditor({ notes, onChange }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Editor</p>
          <h3>Notas detectadas</h3>
        </div>
        <button
          className="secondary-button"
          onClick={() =>
            onChange([
              ...notes,
              {
                id: `manual-${crypto.randomUUID()}`,
                midi: 60,
                startBeat: notes.length ? notes[notes.length - 1].startBeat + 1 : 0,
                durationBeats: 1,
                velocity: 90,
                source: 'midi',
                trackId: notes[0]?.trackId,
                partId: notes[0]?.partId,
                staff: notes[0]?.staff ?? 1,
              },
            ])
          }
        >
          Adicionar nota
        </button>
      </div>

      <div className="note-table">
        <div className="note-row note-head">
          <span>Nota</span>
          <span>Inicio</span>
          <span>Duracao</span>
          <span>Velocidade</span>
          <span>Acoes</span>
        </div>

        {notes.map((note) => (
          <div className="note-row" key={note.id}>
            <input
              value={midiToLabel(note.midi)}
              onChange={(event) => {
                try {
                  const midi = clampMidi(labelToMidi(event.target.value))
                  onChange(updateNote(notes, note.id, (current) => ({ ...current, midi })))
                } catch {
                  // Keep the current pitch until a valid note name is entered.
                }
              }}
            />
            <input
              type="number"
              step="0.25"
              min={0}
              value={note.startBeat}
              onChange={(event) =>
                onChange(
                  updateNote(notes, note.id, (current) => ({
                    ...current,
                    startBeat: Math.max(0, Number(event.target.value) || 0),
                  })),
                )
              }
            />
            <select
              value={note.durationBeats}
              onChange={(event) =>
                onChange(
                  updateNote(notes, note.id, (current) => ({
                    ...current,
                    durationBeats: Number(event.target.value),
                  })),
                )
              }
            >
              {DURATION_PRESETS.map((duration) => (
                <option key={duration} value={duration}>
                  {duration} beat
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={127}
              value={note.velocity}
              onChange={(event) =>
                onChange(
                  updateNote(notes, note.id, (current) => ({
                    ...current,
                    velocity: Math.max(1, Math.min(127, Number(event.target.value) || 90)),
                  })),
                )
              }
            />
            <button
              className="ghost-button"
              onClick={() => onChange(notes.filter((current) => current.id !== note.id))}
            >
              Remover
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
