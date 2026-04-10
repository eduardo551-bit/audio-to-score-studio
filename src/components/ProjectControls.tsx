import type { RenderMode, ScoreMeta } from '../types'

interface Props {
  meta: ScoreMeta
  sourceName: string
  sourceType: 'midi' | 'audio'
  renderMode?: RenderMode
  measuresPerSystem?: number
  loading: boolean
  onMetaChange: (meta: ScoreMeta) => void
  onRenderModeChange: (mode: RenderMode) => void
  onMeasuresPerSystemChange: (value: number) => void
}

export function ProjectControls({
  meta,
  sourceName,
  sourceType,
  renderMode = 'lead-sheet',
  measuresPerSystem = 6,
  loading,
  onMetaChange,
  onRenderModeChange,
  onMeasuresPerSystemChange,
}: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Projeto</p>
          <h3>{meta.title || 'Partitura sem titulo'}</h3>
        </div>
        <span className={`source-badge source-${sourceType}`}>
          {sourceType === 'midi' ? 'MIDI' : 'Audio'}
        </span>
      </div>

      <p className="muted">{loading ? 'Processando arquivo...' : `Origem carregada: ${sourceName}`}</p>

      <div className="meta-grid">
        <label>
          <span>Titulo</span>
          <input value={meta.title} onChange={(event) => onMetaChange({ ...meta, title: event.target.value })} />
        </label>
        <label>
          <span>Compositor</span>
          <input value={meta.composer} onChange={(event) => onMetaChange({ ...meta, composer: event.target.value })} />
        </label>
        <label>
          <span>BPM</span>
          <input
            type="number"
            min={40}
            max={240}
            value={meta.bpm}
            onChange={(event) => onMetaChange({ ...meta, bpm: Number(event.target.value) || 120 })}
          />
        </label>
        <label>
          <span>Compasso</span>
          <input
            value={meta.timeSignature}
            onChange={(event) => onMetaChange({ ...meta, timeSignature: event.target.value || '4/4' })}
          />
        </label>
        <label>
          <span>Escrita</span>
          <select value={renderMode} onChange={(event) => onRenderModeChange(event.target.value as RenderMode)}>
            <option value="auto">Auto</option>
            <option value="lead-sheet">Lead Sheet</option>
            <option value="full">Completa</option>
          </select>
        </label>
        <label>
          <span>Compassos por linha</span>
          <input
            type="number"
            min={2}
            max={12}
            value={measuresPerSystem}
            onChange={(event) => onMeasuresPerSystemChange(Math.max(2, Math.min(12, Number(event.target.value) || 6)))}
          />
        </label>
      </div>
    </section>
  )
}
