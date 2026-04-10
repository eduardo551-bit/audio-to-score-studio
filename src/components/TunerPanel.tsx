import { useEffect, useRef, useState } from 'react'
import { YIN } from 'pitchfinder'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const HISTORY_SIZE = 5

function rmsLevel(buffer: Float32Array): number {
  let rms = 0
  for (let i = 0; i < buffer.length; i += 1) {
    rms += buffer[i] * buffer[i]
  }
  return Math.sqrt(rms / buffer.length)
}

function median(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle]
}

function frequencyToNote(frequency: number) {
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440))
  const noteIndex = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const idealFrequency = 440 * Math.pow(2, (midi - 69) / 12)
  const cents = Math.round(1200 * Math.log2(frequency / idealFrequency))
  return {
    label: `${NOTE_NAMES[noteIndex]}${octave}`,
    cents,
    frequency: frequency.toFixed(1),
  }
}

export function TunerPanel() {
  const [active, setActive] = useState(false)
  const [note, setNote] = useState<string>('—')
  const [frequency, setFrequency] = useState<string>('0.0')
  const [cents, setCents] = useState<number>(0)
  const [signal, setSignal] = useState<'idle' | 'listening' | 'weak'>('idle')
  const [error, setError] = useState<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const historyRef = useRef<number[]>([])
  const lastStableNoteRef = useRef<string>('—')
  const detectorRef = useRef(
    YIN({
      threshold: 0.12,
      probabilityThreshold: 0.92,
      sampleRate: 44100,
    }),
  )

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      audioContextRef.current?.close()
    }
  }, [])

  async function startTuner() {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 4096
      detectorRef.current = YIN({
        threshold: 0.12,
        probabilityThreshold: 0.92,
        sampleRate: audioContext.sampleRate,
      })
      source.connect(analyser)

      streamRef.current = stream
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      setActive(true)

      const data = new Float32Array(analyser.fftSize)
      const readPitch = () => {
        analyser.getFloatTimeDomainData(data)
        const level = rmsLevel(data)

        if (level < 0.012) {
          setSignal('weak')
          historyRef.current = []
          frameRef.current = requestAnimationFrame(readPitch)
          return
        }

        const detected = detectorRef.current(data)
        if (detected && detected > 55 && detected < 1400) {
          historyRef.current.push(detected)
          if (historyRef.current.length > HISTORY_SIZE) historyRef.current.shift()
        }

        if (historyRef.current.length >= 3) {
          setSignal('listening')
          const smoothed = median(historyRef.current)
          const result = frequencyToNote(smoothed)
          const noteChanged = result.label !== lastStableNoteRef.current
          const stableEnough = !noteChanged || Math.abs(result.cents) < 35
          if (stableEnough) {
            lastStableNoteRef.current = result.label
          }
          setNote(result.label)
          setFrequency(result.frequency)
          setCents(result.cents)
        }

        frameRef.current = requestAnimationFrame(readPitch)
      }

      readPitch()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Nao foi possivel acessar o microfone.')
    }
  }

  function stopTuner() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
    analyserRef.current = null
    setActive(false)
    setSignal('idle')
    historyRef.current = []
  }

  return (
    <section className="panel utility-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Afinador</p>
          <h3>SR Tuner</h3>
        </div>
        <button className={active ? 'ghost-button' : 'secondary-button'} onClick={active ? stopTuner : startTuner}>
          {active ? 'Parar' : 'Ativar microfone'}
        </button>
      </div>

      <div className="tuner-readout">
        <strong>{note}</strong>
        <span>{frequency} Hz</span>
      </div>
      <div className="utility-status">
        <span className={`status-dot status-${signal}`} />
        <span>{signal === 'weak' ? 'Sinal fraco' : signal === 'listening' ? 'Captura estabilizada' : 'Aguardando'}</span>
      </div>
      <div className="tuner-meter">
        <div className="tuner-meter-track" />
        <div
          className={`tuner-meter-needle ${Math.abs(cents) <= 8 ? 'needle-good' : ''}`}
          style={{ left: `${Math.max(0, Math.min(100, 50 + cents * 1.25))}%` }}
        />
      </div>
      <p className="muted">
        {Math.abs(cents) <= 8 ? 'Afinacao centralizada.' : `${cents > 0 ? '+' : ''}${cents} cents`}
      </p>
      {error && <p className="error-inline">{error}</p>}
    </section>
  )
}
