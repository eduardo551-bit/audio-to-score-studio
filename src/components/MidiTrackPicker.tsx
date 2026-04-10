import type { MidiTrackData } from '../types'

interface Props {
  tracks: MidiTrackData[]
  selectedTrackIds: number[]
  onSelectionChange: (trackIds: number[]) => void
}

export function MidiTrackPicker({ tracks, selectedTrackIds, onSelectionChange }: Props) {
  function toggleTrack(trackId: number) {
    const next = selectedTrackIds.includes(trackId)
      ? selectedTrackIds.filter((id) => id !== trackId)
      : [...selectedTrackIds, trackId]

    onSelectionChange(next.length ? next : [trackId])
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Trilhas MIDI</p>
          <h3>Escolha o que entra na partitura</h3>
        </div>
      </div>

      <div className="track-list">
        {tracks.map((track) => (
          <label className="track-item" key={track.id}>
            <input
              type="checkbox"
              checked={selectedTrackIds.includes(track.id)}
              onChange={() => toggleTrack(track.id)}
            />
            <div>
              <strong>{track.name}</strong>
              <p className="muted">
                {track.instrument} · {track.notes.length} notas
              </p>
            </div>
          </label>
        ))}
      </div>
    </section>
  )
}
