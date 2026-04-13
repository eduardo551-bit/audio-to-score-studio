import { useEffect, useRef, useState } from 'react'
import { useLocalStorage } from '../utils/useLocalStorage'

export function MetronomePanel() {
  const [bpm, setBpm] = useLocalStorage('metro-bpm', 78)
  const [playing, setPlaying] = useState(false)
  const [accentEvery, setAccentEvery] = useLocalStorage<number>('metro-accent', 4)
  const [subdivision, setSubdivision] = useLocalStorage<number>('metro-subdivision', 1)
  const [beatCount, setBeatCount] = useState(0)
  const [isAccentBeat, setIsAccentBeat] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const schedulerRef = useRef<number | null>(null)
  const nextNoteTimeRef = useRef(0)
  const currentStepRef = useRef(0)
  const tapTimesRef = useRef<number[]>([])
  const lookaheadMs = 25
  const scheduleAheadTime = 0.12

  useEffect(() => {
    return () => {
      if (schedulerRef.current) window.clearTimeout(schedulerRef.current)
      audioContextRef.current?.close()
    }
  }, [])

  useEffect(() => {
    if (!playing) return

    if (schedulerRef.current) {
      window.clearTimeout(schedulerRef.current)
      schedulerRef.current = null
    }

    const context = audioContextRef.current ?? new AudioContext()
    audioContextRef.current = context
    nextNoteTimeRef.current = context.currentTime + 0.05
    currentStepRef.current = 0
    scheduleStep()
  }, [playing, bpm, accentEvery, subdivision])

  function click(time: number, accent: boolean, subdivisionTick: boolean) {
    const context = audioContextRef.current ?? new AudioContext()
    audioContextRef.current = context
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = subdivisionTick ? 'sine' : 'triangle'
    oscillator.frequency.value = accent ? 1480 : subdivisionTick ? 760 : 1040
    gain.gain.setValueAtTime(accent ? 0.24 : subdivisionTick ? 0.08 : 0.14, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(time)
    oscillator.stop(time + 0.05)

    if (!subdivisionTick) {
      const delay = Math.max(0, (time - context.currentTime) * 1000)
      window.setTimeout(() => {
        setIsAccentBeat(accent)
        setBeatCount((c) => c + 1)
      }, delay)
    }
  }

  function scheduleStep() {
    const context = audioContextRef.current
    if (!context) return

    const secondsPerBeat = 60 / bpm
    const stepDuration = secondsPerBeat / subdivision

    while (nextNoteTimeRef.current < context.currentTime + scheduleAheadTime) {
      const step = currentStepRef.current
      const accent = step % (accentEvery * subdivision) === 0
      const subdivisionTick = subdivision > 1 && step % subdivision !== 0
      click(nextNoteTimeRef.current, accent, subdivisionTick)
      nextNoteTimeRef.current += stepDuration
      currentStepRef.current += 1
    }

    schedulerRef.current = window.setTimeout(scheduleStep, lookaheadMs)
  }

  function stop() {
    if (schedulerRef.current) {
      window.clearTimeout(schedulerRef.current)
      schedulerRef.current = null
    }
    currentStepRef.current = 0
    setPlaying(false)
  }

  function start() {
    stop()
    const context = audioContextRef.current ?? new AudioContext()
    audioContextRef.current = context
    nextNoteTimeRef.current = context.currentTime + 0.05
    currentStepRef.current = 0
    setPlaying(true)
    scheduleStep()
  }

  function tap() {
    const now = performance.now()
    if (tapTimesRef.current.length > 0 && now - tapTimesRef.current[tapTimesRef.current.length - 1] > 2000) {
      tapTimesRef.current = []
    }
    tapTimesRef.current = [...tapTimesRef.current, now].slice(-8)
    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1])
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
      setBpm(Math.max(40, Math.min(220, Math.round(60000 / avg))))
    }
  }

  return (
    <section className="panel utility-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Metrônomo</p>
          <h3>SR Pulse</h3>
        </div>
        <button className={playing ? 'ghost-button' : 'secondary-button'} onClick={playing ? stop : start}>
          {playing ? 'Parar' : 'Iniciar'}
        </button>
      </div>

      <div className="metronome-bpm-row">
        <div className="metronome-bpm">{bpm} BPM</div>
        <button className="secondary-button tap-button" onClick={tap} title="Toque no ritmo para detectar o BPM">
          TAP
        </button>
      </div>

      <div
        key={beatCount}
        className={`metronome-pulse${playing ? (isAccentBeat ? ' pulse-accent' : ' pulse-beat') : ''}`}
      />

      <input
        type="range"
        min={40}
        max={220}
        value={bpm}
        onChange={(event) => setBpm(Number(event.target.value))}
      />
      <label className="utility-label">
        <span>Acento</span>
        <select value={accentEvery} onChange={(event) => setAccentEvery(Number(event.target.value))}>
          <option value={2}>2 tempos</option>
          <option value={3}>3 tempos</option>
          <option value={4}>4 tempos</option>
          <option value={6}>6 tempos</option>
        </select>
      </label>
      <label className="utility-label">
        <span>Subdivisão</span>
        <select value={subdivision} onChange={(event) => setSubdivision(Number(event.target.value))}>
          <option value={1}>Sem subdivisão</option>
          <option value={2}>Colcheias</option>
          <option value={4}>Semicolcheias</option>
        </select>
      </label>
    </section>
  )
}
