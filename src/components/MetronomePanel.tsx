import { useEffect, useRef, useState } from 'react'

export function MetronomePanel() {
  const [bpm, setBpm] = useState(78)
  const [playing, setPlaying] = useState(false)
  const [accentEvery, setAccentEvery] = useState(4)
  const [subdivision, setSubdivision] = useState(1)
  const audioContextRef = useRef<AudioContext | null>(null)
  const schedulerRef = useRef<number | null>(null)
  const nextNoteTimeRef = useRef(0)
  const currentStepRef = useRef(0)
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

  return (
    <section className="panel utility-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Metronomo</p>
          <h3>SR Pulse</h3>
        </div>
        <button className={playing ? 'ghost-button' : 'secondary-button'} onClick={playing ? stop : start}>
          {playing ? 'Parar' : 'Iniciar'}
        </button>
      </div>

      <div className="metronome-bpm">{bpm} BPM</div>
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
        <span>Subdivisao</span>
        <select value={subdivision} onChange={(event) => setSubdivision(Number(event.target.value))}>
          <option value={1}>Sem subdivisao</option>
          <option value={2}>Colcheias</option>
          <option value={4}>Semicolcheias</option>
        </select>
      </label>
    </section>
  )
}
