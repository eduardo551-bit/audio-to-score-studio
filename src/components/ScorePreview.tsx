import { useEffect, useRef, useState } from 'react'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'

interface Props {
  xml: string
  title: string
  measuresPerSystem?: number
  scoreRef: React.RefObject<HTMLDivElement>
}

export function ScorePreview({ xml, title, measuresPerSystem = 6, scoreRef }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !xml) return

    canvasRef.current.innerHTML = ''
    setError(null)
    setRendering(true)

    const osmd = new OpenSheetMusicDisplay(canvasRef.current, {
      autoResize: false,
      backend: 'svg',
      drawingParameters: 'leadsheet',
      drawTitle: true,
      drawPartNames: true,
      pageFormat: 'Endless',
    })

    osmd
      .load(xml)
      .then(() => {
        osmd.EngravingRules.RenderXMeasuresPerLineAkaSystem = measuresPerSystem
        osmd.EngravingRules.StretchLastSystemLine = true
        osmd.EngravingRules.PageLeftMargin = 10
        osmd.EngravingRules.PageRightMargin = 10
        osmd.EngravingRules.PageTopMargin = 8
        osmd.EngravingRules.PageBottomMargin = 12
        osmd.EngravingRules.SystemLeftMargin = 0
        osmd.EngravingRules.SystemRightMargin = 0
        osmd.EngravingRules.ChordSymbolYOffset = 2.0
        osmd.EngravingRules.ChordSymbolYPadding = 0.8
        osmd.Zoom = 1.05
        osmd.render()
        setRendering(false)
      })
      .catch((caughtError: unknown) => {
        const message =
          caughtError instanceof Error ? caughtError.message : 'Falha ao renderizar MusicXML.'
        setError(message)
        setRendering(false)
      })
  }, [xml, measuresPerSystem])

  return (
    <section className="panel preview-panel">
      <div className="preview-header">
        <div>
          <p className="eyebrow">Partitura</p>
          <h3 className="preview-title">{title}</h3>
        </div>
        <span className="preview-badge">Lead Sheet</span>
      </div>

      <div className="score-viewer">
        <div className="score-paper" ref={scoreRef}>
          {rendering && (
            <div className="score-loading">
              <span className="score-loading-dot" />
              <span className="score-loading-dot" />
              <span className="score-loading-dot" />
            </div>
          )}
          <div ref={canvasRef} />
        </div>
      </div>

      {error && <p className="error-inline">{error}</p>}
    </section>
  )
}
