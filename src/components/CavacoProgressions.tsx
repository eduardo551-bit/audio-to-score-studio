import { useState } from 'react'
import { useLocalStorage } from '../utils/useLocalStorage'

const NOTE_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const NOTE_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
const USE_FLAT   = new Set([1, 3, 5, 8, 10])

const KEY_PC: Record<string, number> = {
  C:0,'C#':1,D:2,Eb:3,E:4,F:5,'F#':6,G:7,Ab:8,A:9,Bb:10,B:11
}
const KEYS = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']

const SUFFIX_LABEL: Record<string, string> = {
  major:'', minor:'m', '7':'7', m7:'m7', maj7:'Maj7',
  dim:'°', aug:'+', sus4:'sus4', sus2:'sus2', '6':'6', m6:'m6', '9':'9',
}

function noteName(pc: number, keyPc: number) {
  return USE_FLAT.has(keyPc) ? NOTE_FLAT[pc] : NOTE_SHARP[pc]
}

function chordLabel(interval: number, suffix: string, keyPc: number) {
  const pc = (keyPc + interval) % 12
  return noteName(pc, keyPc) + (SUFFIX_LABEL[suffix] ?? suffix)
}

interface ProgChord {
  interval: number
  suffix: string
  degree: string
}

interface Progression {
  name: string
  style: string
  description: string
  chords: ProgChord[]
  loopBack?: string
}

const PROGRESSIONS: Progression[] = [
  {
    name: 'Quadrado de Samba',
    style: 'Samba / Pagode',
    description: 'I – VI7 – IIm – V7 · A base harmônica do samba brasileiro. O quadrado clássico, funciona em qualquer tonalidade.',
    chords: [
      { interval: 0,  suffix: 'major',  degree: 'I'   },
      { interval: 9,  suffix: '7',      degree: 'VI7' },
      { interval: 2,  suffix: 'minor',  degree: 'IIm' },
      { interval: 7,  suffix: '7',      degree: 'V7'  },
    ],
  },
  {
    name: 'Quadrado Estendido',
    style: 'Samba / Pagode',
    description: 'I – VI7 – IIm – V7 – I – I7 – IV – IVm – IIIm · Extensão com modulação para IV e IVm, retorna ao VI7.',
    chords: [
      { interval: 0,  suffix: 'major',  degree: 'I'    },
      { interval: 9,  suffix: '7',      degree: 'VI7'  },
      { interval: 2,  suffix: 'minor',  degree: 'IIm'  },
      { interval: 7,  suffix: '7',      degree: 'V7'   },
      { interval: 0,  suffix: 'major',  degree: 'I'    },
      { interval: 0,  suffix: '7',      degree: 'I7'   },
      { interval: 5,  suffix: 'major',  degree: 'IV'   },
      { interval: 5,  suffix: 'minor',  degree: 'IVm'  },
      { interval: 4,  suffix: 'minor',  degree: 'IIIm' },
    ],
    loopBack: 'VI7',
  },
  {
    name: 'Ciclo com II7',
    style: 'Pagode',
    description: 'I – VI7 – II7 – V7 · II7 substitui IIm. Sonoridade mais tensa, muito usada em pagode.',
    chords: [
      { interval: 0,  suffix: 'major',  degree: 'I'   },
      { interval: 9,  suffix: '7',      degree: 'VI7' },
      { interval: 2,  suffix: '7',      degree: 'II7' },
      { interval: 7,  suffix: '7',      degree: 'V7'  },
    ],
  },
  {
    name: 'Turnaround',
    style: 'Samba / Choro',
    description: 'I – I7 – IV – V7 · Transição clássica da tônica para subdominante. Muito usada em sambas-canção e choros.',
    chords: [
      { interval: 0,  suffix: 'major',  degree: 'I'  },
      { interval: 0,  suffix: '7',      degree: 'I7' },
      { interval: 5,  suffix: 'major',  degree: 'IV' },
      { interval: 7,  suffix: '7',      degree: 'V7' },
    ],
  },
  {
    name: 'Choro Parte A',
    style: 'Choro',
    description: 'I – V7 – I – IV · Cadência básica da parte A do choro. Simples, clara e funcional.',
    chords: [
      { interval: 0,  suffix: 'major',  degree: 'I'  },
      { interval: 7,  suffix: '7',      degree: 'V7' },
      { interval: 0,  suffix: 'major',  degree: 'I'  },
      { interval: 5,  suffix: 'major',  degree: 'IV' },
    ],
  },
  {
    name: 'Choro Parte B',
    style: 'Choro',
    description: 'VIm – VII° – V7 – VIm · Parte B no relativo menor. O VII° é o acorde diminuto de passagem.',
    chords: [
      { interval: 9,  suffix: 'minor',  degree: 'VIm'  },
      { interval: 11, suffix: 'dim',    degree: 'VII°'  },
      { interval: 7,  suffix: '7',      degree: 'V7'    },
      { interval: 9,  suffix: 'minor',  degree: 'VIm'   },
    ],
  },
  {
    name: 'Bossa Nova',
    style: 'Bossa Nova',
    description: 'IIm7 – V7 – Imaj7 – IVmaj7 · Ciclo jazzístico da bossa nova com acordes de sétima maior.',
    chords: [
      { interval: 2,  suffix: 'm7',    degree: 'IIm7'   },
      { interval: 7,  suffix: '7',     degree: 'V7'     },
      { interval: 0,  suffix: 'maj7',  degree: 'Imaj7'  },
      { interval: 5,  suffix: 'maj7',  degree: 'IVmaj7' },
    ],
  },
  {
    name: 'Samba em Menor',
    style: 'Samba / Bolero',
    description: 'Im – IVm – V7 – Im · Progressão em modo menor. Base do bolero e sambas lentos.',
    chords: [
      { interval: 0,  suffix: 'minor',  degree: 'Im'  },
      { interval: 5,  suffix: 'minor',  degree: 'IVm' },
      { interval: 7,  suffix: '7',      degree: 'V7'  },
      { interval: 0,  suffix: 'minor',  degree: 'Im'  },
    ],
  },
  {
    name: 'Blues 12 Compassos',
    style: 'Samba-Rock',
    description: 'Forma blues completa com I7 – IV7 – V7. Variação com sabor brasileiro no cavaco.',
    chords: [
      { interval: 0,  suffix: '7',  degree: 'I7'  },
      { interval: 0,  suffix: '7',  degree: 'I7'  },
      { interval: 5,  suffix: '7',  degree: 'IV7' },
      { interval: 5,  suffix: '7',  degree: 'IV7' },
      { interval: 0,  suffix: '7',  degree: 'I7'  },
      { interval: 0,  suffix: '7',  degree: 'I7'  },
      { interval: 7,  suffix: '7',  degree: 'V7'  },
      { interval: 5,  suffix: '7',  degree: 'IV7' },
      { interval: 0,  suffix: '7',  degree: 'I7'  },
      { interval: 7,  suffix: '7',  degree: 'V7'  },
    ],
  },
]

export function CavacoProgressions() {
  const [selectedKey, setSelectedKey] = useLocalStorage('cavaco-prog-key', 'C')
  const [selectedProg, setSelectedProg] = useState(0)

  const prog = PROGRESSIONS[selectedProg]
  const keyPc = KEY_PC[selectedKey]

  return (
    <section className="panel cavaco-prog-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Cavaquinho</p>
          <h3>Progressões de Acordes</h3>
        </div>
        <span className="preview-badge">{prog.style}</span>
      </div>

      <div className="cavaco-key-selector">
        {KEYS.map(k => (
          <button
            key={k}
            className={`cavaco-key-btn ${k === selectedKey ? 'cavaco-key-btn-active' : ''}`}
            onClick={() => setSelectedKey(k)}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="cavaco-prog-layout">
        <div className="cavaco-prog-list">
          {PROGRESSIONS.map((p, i) => (
            <button
              key={i}
              className={`cavaco-prog-item ${selectedProg === i ? 'cavaco-prog-item-active' : ''}`}
              onClick={() => setSelectedProg(i)}
            >
              <span className="cavaco-prog-name">{p.name}</span>
              <span className="cavaco-prog-style">{p.style}</span>
            </button>
          ))}
        </div>

        <div className="cavaco-prog-detail">
          <p className="cavaco-prog-desc">{prog.description}</p>

          <div className="cavaco-chord-row">
            {prog.chords.map((chord, i) => (
              <div key={i} className="cavaco-chord-chip">
                <span className="cavaco-chord-degree">{chord.degree}</span>
                <strong className="cavaco-chord-name">
                  {chordLabel(chord.interval, chord.suffix, keyPc)}
                </strong>
              </div>
            ))}
            {prog.loopBack && (
              <div className="cavaco-loop-badge">&#8594; {prog.loopBack}</div>
            )}
          </div>

          <div className="cavaco-all-keys">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Todas as tonalidades</p>
            <div className="cavaco-keys-table">
              {KEYS.map(k => {
                const kPc = KEY_PC[k]
                return (
                  <div
                    key={k}
                    className={`cavaco-key-row ${k === selectedKey ? 'cavaco-key-row-active' : ''}`}
                    onClick={() => setSelectedKey(k)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelectedKey(k)}
                  >
                    <span className="cavaco-key-label">{k}</span>
                    <span className="cavaco-key-chords">
                      {prog.chords.map((chord, i) => (
                        <span key={i} className="cavaco-key-chord-name">
                          {chordLabel(chord.interval, chord.suffix, kPc)}
                        </span>
                      ))}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
