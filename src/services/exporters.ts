import { jsPDF } from 'jspdf'
import { Midi } from '@tonejs/midi'
import type { ChordSymbol, ProjectData, ScorePart, TimeSignatureChange, TrackNote } from '../types'
import { downloadBlob, midiToLabel } from '../utils/music'

const DIVISIONS = 120

interface MeasureInfo {
  number: number
  startTick: number
  endTick: number
  numerator: number
  denominator: number
}

interface NoteChunk extends TrackNote {
  startTickInMeasure: number
  durationTicksInMeasure: number
  tieStart: boolean
  tieStop: boolean
}

// Krumhansl-Kessler pitch-class profiles
const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
// pitch-class root → MusicXML fifths value for major keys
const MAJOR_PC_TO_FIFTHS = [0, 7, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5]
// pitch-class root → MusicXML fifths value for minor keys (via relative major)
const MINOR_PC_TO_FIFTHS = [-3, 4, -1, 6, 1, -4, 3, -2, 5, 0, 7, 2]

function detectKeyFifths(notes: TrackNote[]): number {
  if (!notes.length) return 0
  const weights = new Array(12).fill(0)
  for (const note of notes) {
    const pc = ((note.midi % 12) + 12) % 12
    weights[pc] += note.durationTicks
  }
  const total = weights.reduce((s, w) => s + w, 0) || 1
  const norm = weights.map((w) => w / total)
  let bestScore = -Infinity
  let bestFifths = 0
  for (let root = 0; root < 12; root++) {
    const majorScore = KK_MAJOR.reduce((s, v, i) => s + v * norm[(i + root) % 12], 0)
    if (majorScore > bestScore) { bestScore = majorScore; bestFifths = MAJOR_PC_TO_FIFTHS[root] }
    const minorScore = KK_MINOR.reduce((s, v, i) => s + v * norm[(i + root) % 12], 0)
    if (minorScore > bestScore) { bestScore = minorScore; bestFifths = MINOR_PC_TO_FIFTHS[root] }
  }
  return bestFifths
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function xmlPitch(midi: number, fifths = 0): { step: string; alter?: number; octave: number } {
  const pc = ((midi % 12) + 12) % 12
  const useFlats = fifths < 0
  const step = useFlats
    ? ['C', 'D', 'D', 'E', 'E', 'F', 'G', 'G', 'A', 'A', 'B', 'B'][pc]
    : ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'][pc]
  const alter = useFlats
    ? [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0][pc]
    : [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0][pc]
  return {
    step,
    alter: alter || undefined,
    octave: Math.floor(midi / 12) - 1,
  }
}

function chordSymbolToHarmonyXml(symbol: ChordSymbol): string {
  const [main, bass] = symbol.text.split('/')
  const rootMatch = main.match(/^([A-G])([#b]?)(.*)$/)
  if (!rootMatch) return ''

  const [, rootStep, accidental, remainder] = rootMatch
  const rootAlter = accidental === '#' ? '<root-alter>1</root-alter>' : accidental === 'b' ? '<root-alter>-1</root-alter>' : ''
  const bassMatch = bass?.match(/^([A-G])([#b]?)$/)
  const bassXml = bassMatch
    ? `<bass><bass-step>${bassMatch[1]}</bass-step>${bassMatch[2] === '#'
        ? '<bass-alter>1</bass-alter>'
        : bassMatch[2] === 'b'
          ? '<bass-alter>-1</bass-alter>'
          : ''}</bass>`
    : ''
  const kindValue =
    /maj7/i.test(remainder) ? 'major-seventh'
      : /m7/i.test(remainder) ? 'minor-seventh'
        : /^m/i.test(remainder) ? 'minor'
          : /^7/.test(remainder) ? 'dominant'
            : /dim/i.test(remainder) ? 'diminished'
              : /sus/i.test(remainder) ? 'suspended-fourth'
                : 'major'

  return `<harmony print-frame="no">
        <root><root-step>${rootStep}</root-step>${rootAlter}</root>
        <kind text="${escapeXml(symbol.text)}">${kindValue}</kind>
        ${bassXml}
      </harmony>`
}

function noteTypeForDuration(duration: number): { type: string; dots: number } {
  const map = new Map<number, { type: string; dots: number }>([
    [480, { type: 'whole', dots: 0 }],
    [360, { type: 'half', dots: 1 }],
    [240, { type: 'half', dots: 0 }],
    [180, { type: 'quarter', dots: 1 }],
    [120, { type: 'quarter', dots: 0 }],
    [90, { type: 'eighth', dots: 1 }],
    [60, { type: 'eighth', dots: 0 }],
    [30, { type: '16th', dots: 0 }],
    [15, { type: '32nd', dots: 0 }],
  ])

  if (map.has(duration)) {
    return map.get(duration)!
  }

  const candidates = [...map.entries()]
  candidates.sort((a, b) => Math.abs(a[0] - duration) - Math.abs(b[0] - duration))
  return candidates[0][1]
}

function ticksToDivisions(ticks: number, ppq: number): number {
  return Math.max(1, Math.round((ticks / ppq) * DIVISIONS))
}

function buildMeasures(totalTicks: number, timeSignatures: TimeSignatureChange[], ppq: number): MeasureInfo[] {
  const signatures = timeSignatures.length
    ? [...timeSignatures].sort((a, b) => a.ticks - b.ticks)
    : [{ ticks: 0, numerator: 4, denominator: 4 }]

  const measures: MeasureInfo[] = []
  let measureNumber = 1

  for (let index = 0; index < signatures.length; index += 1) {
    const current = signatures[index]
    const nextTick = signatures[index + 1]?.ticks ?? totalTicks
    const measureLength = (ppq * 4 * current.numerator) / current.denominator
    let start = current.ticks

    while (start < nextTick) {
      const end = Math.min(start + measureLength, nextTick)
      measures.push({
        number: measureNumber,
        startTick: start,
        endTick: end,
        numerator: current.numerator,
        denominator: current.denominator,
      })
      measureNumber += 1
      start = end
    }
  }

  if (!measures.length) {
    measures.push({
      number: 1,
      startTick: 0,
      endTick: ppq * 4,
      numerator: 4,
      denominator: 4,
    })
  }

  return measures
}

function systemBreakMeasureNumbers(
  measures: MeasureInfo[],
  measuresPerSystem: number,
): Set<number> {
  const breaks = new Set<number>()
  if (measuresPerSystem <= 0) return breaks

  for (let index = measuresPerSystem; index < measures.length; index += measuresPerSystem) {
    breaks.add(measures[index].number)
  }

  return breaks
}

function splitNotesAcrossMeasures(notes: TrackNote[], measures: MeasureInfo[]): Map<number, NoteChunk[]> {
  const map = new Map<number, NoteChunk[]>()

  for (const measure of measures) {
    map.set(measure.number, [])
  }

  for (const note of notes) {
    const noteStart = note.ticks
    const noteEnd = note.ticks + note.durationTicks
    let firstChunk = true

    for (const measure of measures) {
      if (noteEnd <= measure.startTick || noteStart >= measure.endTick) {
        continue
      }

      const chunkStart = Math.max(noteStart, measure.startTick)
      const chunkEnd = Math.min(noteEnd, measure.endTick)
      map.get(measure.number)?.push({
        ...note,
        startTickInMeasure: chunkStart - measure.startTick,
        durationTicksInMeasure: chunkEnd - chunkStart,
        tieStart: !firstChunk,
        tieStop: chunkEnd < noteEnd,
      })
      firstChunk = false
    }
  }

  return map
}

function buildRestXml(restTicks: number, ppq: number, staff?: number): string {
  const duration = ticksToDivisions(restTicks, ppq)
  const noteType = noteTypeForDuration(duration)
  const dots = Array.from({ length: noteType.dots }, () => '<dot/>').join('')
  const staffXml = staff ? `<staff>${staff}</staff>` : ''
  return `<note><rest/>${staffXml}<duration>${duration}</duration><type>${noteType.type}</type>${dots}</note>`
}

function buildNoteXml(chunk: NoteChunk, ppq: number, isChordTone: boolean, fifths = 0): string {
  const pitch = xmlPitch(chunk.midi, fifths)
  const alter = pitch.alter ? `<alter>${pitch.alter}</alter>` : ''
  const duration = ticksToDivisions(chunk.durationTicksInMeasure, ppq)
  const noteType = noteTypeForDuration(duration)
  const dots = Array.from({ length: noteType.dots }, () => '<dot/>').join('')
  const ties = `${chunk.tieStart ? '<tie type="stop"/>' : ''}${chunk.tieStop ? '<tie type="start"/>' : ''}`
  const notationChildren = `${chunk.tieStart ? '<tied type="stop"/>' : ''}${chunk.tieStop ? '<tied type="start"/>' : ''}`
  const tied = notationChildren ? `<notations>${notationChildren}</notations>` : ''
  const staff = chunk.staff ? `<staff>${chunk.staff}</staff>` : ''

  return `<note>${isChordTone ? '<chord/>' : ''}${ties}
    <pitch><step>${pitch.step}</step>${alter}<octave>${pitch.octave}</octave></pitch>
    <duration>${duration}</duration>
    <voice>1</voice>
    ${staff}
    <type>${noteType.type}</type>
    ${dots}
    ${tied}
  </note>`
}

function buildStaffSequence(
  chunks: NoteChunk[],
  measureLength: number,
  ppq: number,
  staff?: number,
  fifths = 0,
): string[] {
  const contents: string[] = []
  let cursor = 0
  let i = 0

  while (i < chunks.length) {
    const current = chunks[i]
    if (current.startTickInMeasure > cursor) {
      contents.push(buildRestXml(current.startTickInMeasure - cursor, ppq, staff))
      cursor = current.startTickInMeasure
    }

    const chordGroup = [current]
    i += 1
    while (
      i < chunks.length &&
      chunks[i].startTickInMeasure === current.startTickInMeasure &&
      chunks[i].durationTicksInMeasure === current.durationTicksInMeasure
    ) {
      chordGroup.push(chunks[i])
      i += 1
    }

    chordGroup.forEach((chunk, chordIndex) => {
      contents.push(buildNoteXml(chunk, ppq, chordIndex > 0, fifths))
    })
    cursor = Math.max(cursor, current.startTickInMeasure + current.durationTicksInMeasure)
  }

  if (cursor < measureLength) {
    contents.push(buildRestXml(measureLength - cursor, ppq, staff))
  }

  return contents
}

function measureXmlForPart(
  part: ScorePart,
  measures: MeasureInfo[],
  ppq: number,
  bpm: number,
  timeSignatures: TimeSignatureChange[],
  chordSymbols: ChordSymbol[],
  systemBreaks: Set<number>,
  fifths = 0,
): string {
  const chunksByMeasure = splitNotesAcrossMeasures(part.notes, measures)

  return measures
    .map((measure, index) => {
      const chunks = (chunksByMeasure.get(measure.number) ?? []).slice()
      chunks.sort((a, b) => a.startTickInMeasure - b.startTickInMeasure || (a.staff ?? 1) - (b.staff ?? 1) || a.midi - b.midi)
      const measureLength = measure.endTick - measure.startTick
      const contents: string[] =
        part.clef === 'grand'
          ? (() => {
              const upper = buildStaffSequence(chunks.filter((chunk) => (chunk.staff ?? 1) === 1), measureLength, ppq, 1, fifths)
              const lower = buildStaffSequence(chunks.filter((chunk) => (chunk.staff ?? 1) === 2), measureLength, ppq, 2, fifths)
              return [
                ...upper,
                `<backup><duration>${ticksToDivisions(measureLength, ppq)}</duration></backup>`,
                ...lower,
              ]
            })()
          : buildStaffSequence(chunks, measureLength, ppq, undefined, fifths)

      const signatureChanged =
        index === 0 ||
        timeSignatures.some(
          (change) =>
            change.ticks === measure.startTick &&
            !(index === 0 && change.ticks === 0),
        )

      const clef =
        part.clef === 'bass'
          ? '<clef><sign>F</sign><line>4</line></clef>'
          : part.clef === 'grand'
            ? '<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef>'
            : '<clef><sign>G</sign><line>2</line></clef>'

      const attributes =
        signatureChanged
          ? `<attributes>
        <divisions>${DIVISIONS}</divisions>
        <key><fifths>${fifths}</fifths></key>
        <time><beats>${measure.numerator}</beats><beat-type>${measure.denominator}</beat-type></time>
        ${clef}
      </attributes>`
          : ''

      const tempo =
        index === 0
          ? `<direction placement="above">
        <direction-type>
          <metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome>
        </direction-type>
      </direction>`
          : ''

      const harmony = chordSymbols
        .filter((symbol) => symbol.tick >= measure.startTick && symbol.tick < measure.endTick)
        .map(chordSymbolToHarmonyXml)
        .join('\n')

      const print = systemBreaks.has(measure.number)
        ? '<print new-system="yes"><system-layout><system-margins><left-margin>0</left-margin><right-margin>0</right-margin></system-margins><system-distance>90</system-distance></system-layout></print>'
        : ''

      return `<measure number="${measure.number}">
      ${print}
      ${attributes}
      ${tempo}
      ${harmony}
      ${contents.join('\n      ')}
    </measure>`
    })
    .join('\n')
}

export function generateMusicXml(project: ProjectData): string {
  const ppq = project.ppq ?? 480
  const parts = project.scoreParts?.length
    ? project.scoreParts
    : [
        {
          id: 'P1',
          name: project.meta.title,
          instrument: 'Part',
          clef: 'treble' as const,
          trackIds: [0],
          notes: project.notes.map((note) => ({
            id: note.id,
            midi: note.midi,
            ticks: Math.round(note.startBeat * ppq),
            durationTicks: Math.round(note.durationBeats * ppq),
            velocity: note.velocity,
            source: note.source,
            partId: 'P1',
            staff: 1,
          })),
        },
      ]

  const timeSignatures = project.timeSignatures?.length
    ? project.timeSignatures
    : [{ ticks: 0, numerator: 4, denominator: 4 }]

  const totalTicks = Math.max(
    ...parts.flatMap((part) => part.notes.map((note) => note.ticks + note.durationTicks)),
    ppq * 4,
  )
  const measures = buildMeasures(totalTicks, timeSignatures, ppq)
  const systemBreaks = systemBreakMeasureNumbers(measures, project.measuresPerSystem ?? 6)
  const fifths = detectKeyFifths(parts.flatMap((p) => p.notes))

  const partList = parts
    .map(
      (part, index) => `<score-part id="P${index + 1}">
      <part-name>${escapeXml(part.name)}</part-name>
      <part-abbreviation>${escapeXml(part.name)}</part-abbreviation>
      <score-instrument id="P${index + 1}-I1"><instrument-name>${escapeXml(part.instrument)}</instrument-name></score-instrument>
    </score-part>`,
    )
    .join('\n')

  const partXml = parts
    .map(
      (part, index) => `<part id="P${index + 1}">
    ${measureXmlForPart(
      part,
      measures,
      ppq,
      project.meta.bpm,
      timeSignatures,
      index === 0 ? project.chordSymbols ?? [] : [],
      systemBreaks,
      fifths,
    )}
  </part>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <defaults>
    <scaling><millimeters>7.05</millimeters><tenths>40</tenths></scaling>
    <page-layout>
      <page-height>1683.36</page-height>
      <page-width>1190.88</page-width>
      <page-margins type="both">
        <left-margin>70</left-margin>
        <right-margin>70</right-margin>
        <top-margin>80</top-margin>
        <bottom-margin>70</bottom-margin>
      </page-margins>
    </page-layout>
    <system-layout>
      <system-margins><left-margin>0</left-margin><right-margin>0</right-margin></system-margins>
      <system-distance>110</system-distance>
      <top-system-distance>70</top-system-distance>
    </system-layout>
    <staff-layout><staff-distance>80</staff-distance></staff-layout>
    <appearance>
      <line-width type="staff">1.25</line-width>
      <line-width type="barline">1.5</line-width>
      <line-width type="beam">5</line-width>
      <line-width type="stem">1.25</line-width>
      <note-size type="grace">60</note-size>
    </appearance>
    <music-font font-family="Bravura" font-size="20"/>
    <word-font font-family="Arial" font-size="10"/>
  </defaults>
  <credit page="1">
    <credit-type>title</credit-type>
    <credit-words default-x="595" default-y="1600" justify="center" valign="top"
      font-size="22" font-weight="bold">${escapeXml(project.meta.title)}</credit-words>
  </credit>
  <credit page="1">
    <credit-type>composer</credit-type>
    <credit-words default-x="1120" default-y="1540" justify="right" valign="top"
      font-size="11">${escapeXml(project.meta.composer)}</credit-words>
  </credit>
  <work><work-title>${escapeXml(project.meta.title)}</work-title></work>
  <identification>
    <creator type="composer">${escapeXml(project.meta.composer)}</creator>
    <encoding>
      <software>SR Music Studio</software>
      <encoding-date>${new Date().toISOString().slice(0, 10)}</encoding-date>
    </encoding>
  </identification>
  <part-list>
    ${partList}
  </part-list>
  ${partXml}
</score-partwise>`
}

export function exportMusicXml(project: ProjectData): void {
  const xml = generateMusicXml(project)
  downloadBlob(
    `${project.meta.title || 'partitura'}.musicxml`,
    new Blob([xml], { type: 'application/xml' }),
  )
}

async function svgElementToDataUrl(svg: SVGSVGElement, scale: number): Promise<{ url: string; width: number; height: number }> {
  const vb = svg.viewBox.baseVal
  const bbox = svg.getBoundingClientRect()
  const srcWidth  = vb.width  || bbox.width  || 960
  const srcHeight = vb.height || bbox.height || 400

  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svg)
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url  = URL.createObjectURL(blob)

  const canvas = document.createElement('canvas')
  canvas.width  = Math.ceil(srcWidth  * scale)
  canvas.height = Math.ceil(srcHeight * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve()
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')) }
    img.src = url
  })

  return { url: canvas.toDataURL('image/png'), width: srcWidth, height: srcHeight }
}

export async function exportScoreSvg(scoreElement: HTMLElement, filename: string): Promise<void> {
  const svgs = Array.from(scoreElement.querySelectorAll<SVGSVGElement>('svg'))
  if (!svgs.length) return

  const serializer = new XMLSerializer()
  const parts = svgs.map(s => serializer.serializeToString(s)).join('\n')
  downloadBlob(filename.replace(/\.pdf$/i, '.svg'), new Blob([parts], { type: 'image/svg+xml' }))
}

export async function exportScorePdf(scoreElement: HTMLElement, filename: string): Promise<void> {
  const svgs = Array.from(scoreElement.querySelectorAll<SVGSVGElement>('svg'))

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth  = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 18
  const printWidth = pageWidth - margin * 2

  if (svgs.length > 0) {
    // SVG path: render each OSMD SVG at 4× scale for sharp output
    const scale = 4
    let cursorY = margin

    for (let i = 0; i < svgs.length; i++) {
      const { url, width, height } = await svgElementToDataUrl(svgs[i], scale)
      const renderHeight = (height * printWidth) / width

      if (i > 0 && cursorY + renderHeight > pageHeight - margin) {
        pdf.addPage()
        cursorY = margin
      }

      pdf.addImage(url, 'PNG', margin, cursorY, printWidth, renderHeight)
      cursorY += renderHeight + 8
    }
  } else {
    // Fallback: plain canvas capture for non-SVG content
    const { default: html2canvas } = await import('html2canvas')
    const prev = { width: scoreElement.style.width, overflow: scoreElement.style.overflow }
    scoreElement.style.width = '960px'
    scoreElement.style.overflow = 'visible'

    const canvas = await html2canvas(scoreElement, { backgroundColor: '#ffffff', scale: 2, useCORS: true })
    const image = canvas.toDataURL('image/png')
    const renderHeight = (canvas.height * printWidth) / canvas.width
    let remaining = renderHeight
    let posY = margin

    pdf.addImage(image, 'PNG', margin, posY, printWidth, renderHeight)
    remaining -= pageHeight - margin * 2
    while (remaining > 0) {
      posY = remaining - renderHeight + margin
      pdf.addPage()
      pdf.addImage(image, 'PNG', margin, posY, printWidth, renderHeight)
      remaining -= pageHeight - margin * 2
    }

    scoreElement.style.width = prev.width
    scoreElement.style.overflow = prev.overflow
  }

  pdf.save(filename)
}

export function exportSessionJson(project: ProjectData): void {
  const payload = {
    ...project,
    notes: project.notes.map((note) => ({ ...note, label: midiToLabel(note.midi) })),
  }

  downloadBlob(
    `${project.meta.title || 'partitura'}.json`,
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  )
}

export function exportProjectMidi(project: ProjectData): void {
  const midi = new Midi()
  const ppq = project.ppq ?? 480

  midi.header.tempos = [{ bpm: project.meta.bpm, ticks: 0 }]

  const timeSignature = project.meta.timeSignature.match(/^(\d+)\/(\d+)$/)
  if (timeSignature) {
    midi.header.timeSignatures = [{
      ticks: 0,
      measures: 0,
      timeSignature: [Number(timeSignature[1]), Number(timeSignature[2])],
    }]
  }

  const parts = project.scoreParts?.length
    ? project.scoreParts
    : [{
        id: 'P1',
        name: project.meta.title,
        instrument: 'Part',
        clef: 'treble' as const,
        trackIds: [0],
        notes: project.notes.map((note) => ({
          id: note.id,
          midi: note.midi,
          ticks: Math.round(note.startBeat * ppq),
          durationTicks: Math.max(1, Math.round(note.durationBeats * ppq)),
          velocity: note.velocity,
          source: note.source,
          trackId: note.trackId ?? 0,
          partId: note.partId ?? 'P1',
          staff: note.staff ?? 1,
        })),
      }]

  for (const part of parts) {
    const track = midi.addTrack()
    track.name = part.name

    for (const note of part.notes) {
      track.addNote({
        midi: note.midi,
        ticks: note.ticks,
        durationTicks: Math.max(1, note.durationTicks),
        velocity: Math.max(0, Math.min(1, note.velocity / 127)),
      })
    }
  }

  const midiBytes = midi.toArray()
  const midiBuffer = new Uint8Array(midiBytes.byteLength)
  midiBuffer.set(midiBytes)

  downloadBlob(
    `${project.meta.title || 'partitura'}.mid`,
    new Blob([midiBuffer], { type: 'audio/midi' }),
  )
}
