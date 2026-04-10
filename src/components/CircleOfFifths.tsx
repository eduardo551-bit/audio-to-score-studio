import { useState } from 'react'

const MAJOR = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']
const MINOR_DISPLAY = ['La m', 'Mi m', 'Si m', 'F# m', 'C# m', 'G# m', 'D# m', 'Sib m', 'Fa m', 'Do m', 'Sol m', 'Re m']
const SIGS = [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1]

const CX = 190
const CY = 190
const R_OUTER = 178
const R_MID   = 122
const R_INNER = 74

function rad(deg: number) { return (deg * Math.PI) / 180 }
function px(r: number, deg: number) { return CX + r * Math.cos(rad(deg)) }
function py(r: number, deg: number) { return CY + r * Math.sin(rad(deg)) }

function wedge(r1: number, r2: number, startDeg: number, endDeg: number, gap = 1.5): string {
  const s = startDeg + gap / 2
  const e = endDeg - gap / 2
  return [
    `M ${px(r1, s).toFixed(2)} ${py(r1, s).toFixed(2)}`,
    `A ${r1} ${r1} 0 0 1 ${px(r1, e).toFixed(2)} ${py(r1, e).toFixed(2)}`,
    `L ${px(r2, e).toFixed(2)} ${py(r2, e).toFixed(2)}`,
    `A ${r2} ${r2} 0 0 0 ${px(r2, s).toFixed(2)} ${py(r2, s).toFixed(2)}`,
    'Z',
  ].join(' ')
}

function sigLabel(n: number): string {
  if (n === 0) return 'Sem acidentes'
  return n > 0 ? `${n} sustenido${n > 1 ? 's' : ''}` : `${Math.abs(n)} bemol${Math.abs(n) > 1 ? 'is' : ''}`
}

export function CircleOfFifths() {
  const [active, setActive] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section className="panel chord-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Teoria musical</p>
          <h3>Círculo das Quintas</h3>
        </div>
        {active !== null && (
          <span className="cof-key-badge">{MAJOR[active]} / {MINOR_DISPLAY[active]}</span>
        )}
      </div>

      <p className="cof-hint">Clique numa fatia para ver informações do tom</p>

      <div className="cof-wrap">
        <svg viewBox="0 0 380 380" className="cof-svg" aria-label="Círculo das Quintas">
          {MAJOR.map((_, i) => {
            const startDeg = i * 30 - 90
            const endDeg   = startDeg + 30
            const midDeg   = startDeg + 15
            const isActive  = active === i
            const isHovered = hovered === i && !isActive

            const outerFill = isActive ? '#8b5e1a'
              : isHovered ? '#d4b87a'
              : '#e8dcc8'

            const innerFill = isActive ? 'rgba(139,94,26,0.28)'
              : isHovered ? 'rgba(212,184,122,0.4)'
              : 'rgba(232,220,200,0.5)'

            return (
              <g
                key={i}
                onClick={() => setActive(active === i ? null : i)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
                role="button"
                aria-label={`Tom ${MAJOR[i]}`}
              >
                {/* Outer wedge — major */}
                <path
                  d={wedge(R_OUTER, R_MID, startDeg, endDeg)}
                  fill={outerFill}
                  stroke="#f4edd8"
                  strokeWidth="2"
                  style={{ transition: 'fill 120ms ease' }}
                />
                <text
                  x={px((R_OUTER + R_MID) / 2, midDeg).toFixed(1)}
                  y={py((R_OUTER + R_MID) / 2, midDeg).toFixed(1)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="14"
                  fontWeight="700"
                  fontFamily="Georgia, serif"
                  fill={isActive ? '#fff8ed' : '#2f2418'}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {MAJOR[i]}
                </text>

                {/* Inner wedge — relative minor */}
                <path
                  d={wedge(R_MID, R_INNER, startDeg, endDeg)}
                  fill={innerFill}
                  stroke="#f4edd8"
                  strokeWidth="2"
                  style={{ transition: 'fill 120ms ease' }}
                />
                <text
                  x={px((R_MID + R_INNER) / 2, midDeg).toFixed(1)}
                  y={py((R_MID + R_INNER) / 2, midDeg).toFixed(1)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="9.5"
                  fontFamily="'Segoe UI', sans-serif"
                  fill={isActive ? '#7a4e10' : '#6a5e4e'}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {MINOR_DISPLAY[i]}
                </text>
              </g>
            )
          })}

          {/* Center circle */}
          <circle cx={CX} cy={CY} r={R_INNER - 3} fill="#fffbf3" stroke="#e2d5bc" strokeWidth="1.5" />

          {active !== null ? (
            <g style={{ pointerEvents: 'none' }}>
              <text x={CX} y={CY - 20} textAnchor="middle" fontSize="24" fontWeight="700"
                fontFamily="Georgia, serif" fill="#8b5e1a">{MAJOR[active]}</text>
              <text x={CX} y={CY + 2} textAnchor="middle" fontSize="11"
                fontFamily="'Segoe UI', sans-serif" fill="#6a5e4e">maior</text>
              <text x={CX} y={CY + 18} textAnchor="middle" fontSize="12" fontWeight="600"
                fontFamily="'Segoe UI', sans-serif" fill="#3d2f1a">{MINOR_DISPLAY[active]}</text>
            </g>
          ) : (
            <text x={CX} y={CY + 4} textAnchor="middle" fontSize="11"
              fontFamily="'Segoe UI', sans-serif" fill="#b0a090"
              style={{ pointerEvents: 'none' }}>toque uma fatia</text>
          )}
        </svg>

        <div className="cof-legend">
          <div className="cof-legend-row">
            <span className="cof-legend-dot cof-major" />
            <span className="cof-legend-label">Tom maior <em>(anel externo)</em></span>
          </div>
          <div className="cof-legend-row">
            <span className="cof-legend-dot cof-minor" />
            <span className="cof-legend-label">Relativo menor <em>(anel interno)</em></span>
          </div>

          {active !== null ? (
            <div className="cof-info">
              <div className="cof-info-row">
                <span>Tom</span>
                <strong>{MAJOR[active]} maior</strong>
              </div>
              <div className="cof-info-row">
                <span>Relativo</span>
                <strong>{MINOR_DISPLAY[active]}</strong>
              </div>
              <div className="cof-info-row">
                <span>Dominante</span>
                <strong>{MAJOR[(active + 1) % 12]}</strong>
              </div>
              <div className="cof-info-row">
                <span>Subdominante</span>
                <strong>{MAJOR[(active + 11) % 12]}</strong>
              </div>
              <div className="cof-info-row">
                <span>Armadura</span>
                <strong>{sigLabel(SIGS[active])}</strong>
              </div>
            </div>
          ) : (
            <p className="cof-empty-hint">Selecione um tom para ver dominante, subdominante e armadura de clave.</p>
          )}
        </div>
      </div>
    </section>
  )
}
