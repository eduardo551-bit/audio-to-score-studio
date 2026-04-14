export type HarmonyMode = 'major' | 'minor'

export type ParsedChord = {
  raw: string
  root: string
  bass: string | null
  quality: 'major' | 'minor' | 'dominant' | 'diminished' | 'half-diminished' | 'augmented' | 'suspended' | 'power' | 'unknown'
  suffix: string
}

export type AnalyzedChord = ParsedChord & {
  roman: string
  harmonicFunction: 'tonica' | 'subdominante' | 'dominante' | 'dominante-secundario' | 'emprestimo' | 'cromatico'
  diatonic: boolean
  analysisLabel: string
  targetRoman: string | null
  explanation: string
  resolvesToNext: boolean
}

export type AnalyzedLine = {
  raw: string
  type: 'chords' | 'lyrics' | 'empty'
  chords: AnalyzedChord[]
}

export type HarmonySummary = {
  detectedKey: string
  mode: HarmonyMode
  totalChordEvents: number
  uniqueChordCount: number
  topChords: Array<{ chord: string; count: number }>
  nonDiatonicChords: string[]
  secondaryDominants: string[]
  borrowedChords: string[]
  resolvedSecondaryDominants: string[]
  cadenceLabels: string[]
}

export type HarmonicSection = {
  id: string
  startLine: number
  endLine: number
  localKey: string
  summary: string
  cadenceLabels: string[]
  chordCount: number
}

export type LocalModulation = {
  sectionId: string
  fromKey: string
  toKey: string
  summary: string
}

export type HarmonyAnalysis = {
  lines: AnalyzedLine[]
  summary: HarmonySummary
  sections: HarmonicSection[]
  localModulations: LocalModulation[]
}

export type HarmonicFieldDegree = {
  roman: string
  chord: string
  quality: string
  inSong: boolean
  occurrences: number
}

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const NOTE_TO_PC: Record<string, number> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
}

const CHORD_TOKEN_RE =
  /\b([A-G](?:#|b)?(?:maj7|m7\(b5\)|m7|m6|m9|m|sus2|sus4|sus|dim|aug|add9|7M|6\/9|7\/9|7|6|9)?(?:\/[A-G](?:#|b)?)?)\b/g

const CHORD_LINE_TOKEN_RE = /^(?:[A-G][#b]?(?:maj7|m7\(b5\)|m7|m6|m9|m|sus2|sus4|sus|dim|aug|add9|7M|6\/9|7\/9|7|6|9)?(?:\/[A-G][#b]?)?|\||%|>|\(|\)|\d+|[°º])+$/i

function toPc(note: string): number | null {
  return NOTE_TO_PC[note] ?? null
}

function preferFlatName(pc: number): string {
  return FLAT_NOTES[((pc % 12) + 12) % 12]
}

function preferSharpName(pc: number): string {
  return SHARP_NOTES[((pc % 12) + 12) % 12]
}

function shouldPreferFlats(key: string) {
  return /b/.test(key) || ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Bbm', 'Ebm', 'Abm'].includes(key)
}

function pcToNote(pc: number, key: string) {
  return shouldPreferFlats(key) ? preferFlatName(pc) : preferSharpName(pc)
}

export function isChordLine(line: string) {
  const tokens = line.trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return false
  const chordLike = tokens.filter((token) => CHORD_LINE_TOKEN_RE.test(token)).length
  return chordLike / tokens.length >= 0.6
}

export function parseChordToken(token: string): ParsedChord | null {
  const clean = token.trim()
  const match = clean.match(/^([A-G](?:#|b)?)([^/\s]*?)(?:\/([A-G](?:#|b)?))?$/)
  if (!match) return null

  const [, root, suffixRaw = '', bass = null] = match
  const suffix = suffixRaw || ''
  const lower = suffix.toLowerCase()

  let quality: ParsedChord['quality'] = 'major'
  if (lower.includes('m7(b5)')) quality = 'half-diminished'
  else if (lower.includes('dim') || lower.includes('°') || lower.includes('º')) quality = 'diminished'
  else if (lower.includes('aug') || lower.includes('+')) quality = 'augmented'
  else if (lower.startsWith('m') && !lower.startsWith('maj')) quality = 'minor'
  else if (lower.includes('sus')) quality = 'suspended'
  else if (lower === '5') quality = 'power'
  else if (/[0-9]/.test(lower)) quality = 'dominant'
  else if (lower.length > 0 && lower !== 'maj') quality = 'unknown'

  return { raw: clean, root, bass, quality, suffix }
}

function parseKey(key: string): { tonicPc: number; mode: HarmonyMode; normalized: string } {
  const normalized = key.trim() || 'C'
  const mode: HarmonyMode = /m$/.test(normalized) ? 'minor' : 'major'
  const tonicName = mode === 'minor' ? normalized.slice(0, -1) : normalized
  const tonicPc = toPc(tonicName) ?? 0
  return { tonicPc, mode, normalized }
}

function buildScalePcs(key: string) {
  const { tonicPc, mode } = parseKey(key)
  const intervals = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10]
  return intervals.map((interval) => (tonicPc + interval) % 12)
}

function intervalToRoman(interval: number) {
  const normalized = ((interval % 12) + 12) % 12
  switch (normalized) {
    case 0: return 'I'
    case 1: return 'bII'
    case 2: return 'II'
    case 3: return 'bIII'
    case 4: return 'III'
    case 5: return 'IV'
    case 6: return '#IV'
    case 7: return 'V'
    case 8: return 'bVI'
    case 9: return 'VI'
    case 10: return 'bVII'
    case 11: return 'VII'
    default: return '?'
  }
}

function classifyFunction(interval: number, mode: HarmonyMode, diatonic: boolean): AnalyzedChord['harmonicFunction'] {
  const normalized = ((interval % 12) + 12) % 12
  if (!diatonic) {
    if ([1, 3, 6, 8, 10].includes(normalized)) return 'emprestimo'
    return 'cromatico'
  }

  if (mode === 'major') {
    if ([0, 4, 9].includes(normalized)) return 'tonica'
    if ([2, 5].includes(normalized)) return 'subdominante'
    if ([7, 11].includes(normalized)) return 'dominante'
  } else {
    if ([0, 3, 8].includes(normalized)) return 'tonica'
    if ([2, 5].includes(normalized)) return 'subdominante'
    if ([7, 10, 11].includes(normalized)) return 'dominante'
  }
  return diatonic ? 'subdominante' : 'cromatico'
}

function buildTriadQualityMap(mode: HarmonyMode) {
  return mode === 'major'
    ? ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished']
    : ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major']
}

function buildRomanScale(mode: HarmonyMode) {
  return mode === 'major'
    ? ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
    : ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']
}

function getScaleDegreeInfo(key: string) {
  const { tonicPc, mode } = parseKey(key)
  const scalePcs = buildScalePcs(key)
  const qualities = buildTriadQualityMap(mode)
  const romans = buildRomanScale(mode)
  return scalePcs.map((pc, index) => ({
    pc,
    quality: qualities[index],
    roman: romans[index],
    dominantPc: (pc + 7) % 12,
    leadingPc: (pc + 11) % 12,
    tonicPc,
    mode,
  }))
}

function detectSecondaryDominant(chord: ParsedChord, key: string) {
  if (chord.quality !== 'dominant') return null
  const rootPc = toPc(chord.root)
  if (rootPc === null) return null

  const degrees = getScaleDegreeInfo(key)
  for (const degree of degrees) {
    if (degree.roman === 'I' || degree.roman === 'i') continue
    if (degree.roman.includes('°')) continue
    if (rootPc === degree.dominantPc) {
      return {
        label: `V/${degree.roman}`,
        targetRoman: degree.roman,
        explanation: `Dominante secundário preparando ${degree.roman}.`,
      }
    }
  }
  return null
}

function isExpectedResolution(nextChord: ParsedChord | null, targetRoman: string | null, key: string) {
  if (!nextChord || !targetRoman) return false
  const { tonicPc } = parseKey(key)
  const nextPc = toPc(nextChord.root)
  if (nextPc === null) return false

  const targetInfo = getScaleDegreeInfo(key).find((degree) => degree.roman === targetRoman)
  if (!targetInfo) return false
  if (nextPc === targetInfo.pc) return true

  const nextInterval = (nextPc - tonicPc + 12) % 12
  const nextRoman = intervalToRoman(nextInterval)
  return nextRoman === targetRoman.replace(/[°ø]/g, '')
}

function detectModalBorrowing(interval: number, mode: HarmonyMode, quality: ParsedChord['quality']) {
  const normalized = ((interval % 12) + 12) % 12
  if (mode === 'major') {
    if (normalized === 3 && quality === 'major') return { label: 'bIII emprestado', explanation: 'Acorde emprestado do modo menor paralelo.' }
    if (normalized === 8 && quality === 'major') return { label: 'bVI emprestado', explanation: 'Acorde emprestado do modo menor paralelo.' }
    if (normalized === 10 && (quality === 'major' || quality === 'dominant')) {
      return { label: 'bVII emprestado', explanation: 'Acorde emprestado com cor mixolídia ou modal.' }
    }
    if (normalized === 5 && quality === 'minor') return { label: 'iv emprestado', explanation: 'Subdominante menor emprestado do modo paralelo.' }
  } else {
    if (normalized === 4 && quality === 'major') return { label: 'III maior', explanation: 'Acorde comum no menor com função modal.' }
    if (normalized === 9 && quality === 'diminished') return { label: 'vi° cromático', explanation: 'Coloração cromática fora do campo menor natural.' }
  }
  return null
}

function qualityToRomanCase(roman: string, quality: ParsedChord['quality']) {
  if (quality === 'minor' || quality === 'half-diminished' || quality === 'diminished') {
    const lower = roman.replace(/[IV]+/, (value) => value.toLowerCase())
    if (quality === 'diminished') return `${lower}°`
    if (quality === 'half-diminished') return `${lower}ø`
    return lower
  }
  if (quality === 'dominant') return `${roman}7`
  if (quality === 'augmented') return `${roman}+`
  return roman
}

function analyzeChord(chord: ParsedChord, key: string, nextChord: ParsedChord | null): AnalyzedChord {
  const { tonicPc, mode } = parseKey(key)
  const rootPc = toPc(chord.root) ?? tonicPc
  const interval = (rootPc - tonicPc + 12) % 12
  const diatonic = buildScalePcs(key).includes(rootPc)
  const romanBase = intervalToRoman(interval)
  const roman = qualityToRomanCase(romanBase, chord.quality)
  const secondaryDominant = detectSecondaryDominant(chord, key)
  const modalBorrowing = detectModalBorrowing(interval, mode, chord.quality)
  const harmonicFunction = secondaryDominant
    ? 'dominante-secundario'
    : diatonic
      ? classifyFunction(interval, mode, diatonic)
      : modalBorrowing
        ? 'emprestimo'
        : classifyFunction(interval, mode, diatonic)

  const resolvesToNext = secondaryDominant
    ? isExpectedResolution(nextChord, secondaryDominant.targetRoman, key)
    : false

  const analysisLabel = secondaryDominant?.label ?? modalBorrowing?.label ?? roman
  const targetRoman = secondaryDominant?.targetRoman ?? null
  const explanation =
    (secondaryDominant?.explanation
      ? resolvesToNext
        ? `${secondaryDominant.explanation} Resolve no acorde seguinte.`
        : `${secondaryDominant.explanation} Resolução não confirmada imediatamente.`
      : modalBorrowing?.explanation)
    ?? (
      harmonicFunction === 'tonica'
        ? 'Acorde de repouso e estabilidade tonal.'
        : harmonicFunction === 'subdominante'
          ? 'Acorde de preparação ou expansão harmônica.'
          : harmonicFunction === 'dominante'
            ? 'Acorde de tensão pedindo resolução.'
            : harmonicFunction === 'emprestimo'
              ? 'Acorde emprestado de outro modo próximo.'
              : 'Acorde cromático fora do campo principal.'
    )

  return {
    ...chord,
    roman,
    harmonicFunction,
    diatonic,
    analysisLabel,
    targetRoman,
    explanation,
    resolvesToNext,
  }
}

function scoreKeyCandidates(text: string) {
  const chords = Array.from(text.matchAll(CHORD_TOKEN_RE)).map((match) => parseChordToken(match[1])).filter(Boolean) as ParsedChord[]
  const counts = new Map<string, number>()
  const candidates = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Am', 'Em', 'Bm', 'Dm', 'Gm', 'Cm', 'Fm']

  for (const candidate of candidates) {
    const scale = new Set(buildScalePcs(candidate))
    let score = 0
    for (const chord of chords) {
      const pc = toPc(chord.root)
      if (pc === null) continue
      if (scale.has(pc)) score += 2
      const roman = intervalToRoman((pc - parseKey(candidate).tonicPc + 12) % 12)
      if (roman === 'I' || roman === 'V') score += 1
      if (chord.quality === 'dominant' && roman === 'V') score += 2
    }
    counts.set(candidate, score)
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

function normalizeKeyFromText(text: string) {
  return scoreKeyCandidates(text)[0]?.[0] ?? 'C'
}

function summarizeSectionFunctions(chords: AnalyzedChord[]) {
  const counts = new Map<AnalyzedChord['harmonicFunction'], number>()
  for (const chord of chords) {
    counts.set(chord.harmonicFunction, (counts.get(chord.harmonicFunction) ?? 0) + 1)
  }
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const dominant = ordered[0]?.[0]
  if (dominant === 'dominante' || dominant === 'dominante-secundario') {
    return 'Trecho com alta tensão dominante.'
  }
  if (dominant === 'subdominante') {
    return 'Trecho de preparação e movimento harmônico.'
  }
  if (dominant === 'tonica') {
    return 'Trecho de repouso tonal e estabilização.'
  }
  if (dominant === 'emprestimo') {
    return 'Trecho com coloração modal emprestada.'
  }
  return 'Trecho com movimento cromático ou misto.'
}

function buildSections(lines: AnalyzedLine[], globalKey: string): { sections: HarmonicSection[]; localModulations: LocalModulation[] } {
  const sections: HarmonicSection[] = []
  const localModulations: LocalModulation[] = []
  let currentStart = -1

  function flushSection(endIndexExclusive: number) {
    if (currentStart === -1) return
    const slice = lines.slice(currentStart, endIndexExclusive)
    const chordLines = slice.filter((line) => line.type === 'chords')
    const chords = chordLines.flatMap((line) => line.chords)
    if (!chords.length) {
      currentStart = -1
      return
    }
    const text = chordLines.map((line) => line.raw).join('\n')
    const rankedKeys = scoreKeyCandidates(text)
    const localKey = rankedKeys[0]?.[0] ?? globalKey
    const localScore = rankedKeys[0]?.[1] ?? 0
    const globalScore = rankedKeys.find(([key]) => key === globalKey)?.[1] ?? 0
    const cadenceLabels = detectCadences(chords)
    const sectionId = `secao-${sections.length + 1}`
    const summary = summarizeSectionFunctions(chords)

    sections.push({
      id: sectionId,
      startLine: currentStart,
      endLine: endIndexExclusive - 1,
      localKey,
      summary,
      cadenceLabels,
      chordCount: chords.length,
    })

    if (localKey !== globalKey && localScore >= globalScore + 2) {
      localModulations.push({
        sectionId,
        fromKey: globalKey,
        toKey: localKey,
        summary: `Centro tonal local sugerido em ${localKey}.`,
      })
    }

    currentStart = -1
  }

  lines.forEach((line, index) => {
    if (line.type !== 'empty' && currentStart === -1) {
      currentStart = index
    }
    if (line.type === 'empty' && currentStart !== -1) {
      flushSection(index)
    }
  })

  flushSection(lines.length)
  return { sections, localModulations }
}

function detectCadences(chords: AnalyzedChord[]) {
  const labels = new Set<string>()
  const romans = chords.map((chord) => chord.roman.replace(/[7+ø°]/g, ''))

  for (let index = 0; index < romans.length - 1; index += 1) {
    const pair = `${romans[index]}-${romans[index + 1]}`
    if (pair === 'V-I' || pair === 'V-i') labels.add('Cadência autêntica (V-I)')
    if (pair === 'IV-I' || pair === 'iv-i') labels.add('Cadência plagal (IV-I)')
  }

  for (let index = 0; index < romans.length - 2; index += 1) {
    const triad = `${romans[index]}-${romans[index + 1]}-${romans[index + 2]}`
    if (triad === 'II-V-I' || triad === 'ii-V-I' || triad === 'ii-v-i') {
      labels.add('Progressão II-V-I')
    }
    if (triad === 'I-VI-II-V' || triad === 'I-vi-II-V') {
      labels.add('Turnaround I-vi-ii-V')
    }
  }

  return [...labels]
}

export function analyzeHarmony(text: string, providedKey?: string | null): HarmonyAnalysis {
  const detectedKey = providedKey && providedKey !== 'Sem tom' ? providedKey : normalizeKeyFromText(text)
  const mode = parseKey(detectedKey).mode
  const parsedChordSequence = text
    .split('\n')
    .filter((rawLine) => isChordLine(rawLine))
    .flatMap((rawLine) =>
      Array.from(rawLine.matchAll(CHORD_TOKEN_RE))
        .map((match) => parseChordToken(match[1]))
        .filter(Boolean) as ParsedChord[],
    )

  let chordCursor = 0
  const lines = text.split('\n').map<AnalyzedLine>((rawLine) => {
    if (!rawLine.trim()) return { raw: rawLine, type: 'empty', chords: [] }
    if (!isChordLine(rawLine)) return { raw: rawLine, type: 'lyrics', chords: [] }

    const parsedLineChords = Array.from(rawLine.matchAll(CHORD_TOKEN_RE))
      .map((match) => parseChordToken(match[1]))
      .filter(Boolean) as ParsedChord[]

    const chords = parsedLineChords.map((chord) => {
      const nextChord = parsedChordSequence[chordCursor + 1] ?? null
      const analyzed = analyzeChord(chord, detectedKey, nextChord)
      chordCursor += 1
      return analyzed
    })

    return { raw: rawLine, type: 'chords', chords }
  })

  const allChords = lines.flatMap((line) => line.chords)
  const chordCounts = new Map<string, number>()
  for (const chord of allChords) {
    chordCounts.set(chord.raw, (chordCounts.get(chord.raw) ?? 0) + 1)
  }

  const topChords = [...chordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([chord, count]) => ({ chord, count }))

  const nonDiatonicChords = [...new Set(allChords.filter((chord) => !chord.diatonic).map((chord) => chord.raw))]
  const secondaryDominants = [...new Set(allChords
    .filter((chord) => chord.harmonicFunction === 'dominante-secundario')
    .map((chord) => `${chord.raw} (${chord.analysisLabel})`))]
  const resolvedSecondaryDominants = [...new Set(allChords
    .filter((chord) => chord.harmonicFunction === 'dominante-secundario' && chord.resolvesToNext)
    .map((chord) => `${chord.raw} -> ${chord.targetRoman}`))]
  const borrowedChords = [...new Set(allChords
    .filter((chord) => chord.harmonicFunction === 'emprestimo')
    .map((chord) => `${chord.raw} (${chord.analysisLabel})`))]
  const { sections, localModulations } = buildSections(lines, detectedKey)

  return {
    lines,
    summary: {
      detectedKey,
      mode,
      totalChordEvents: allChords.length,
      uniqueChordCount: chordCounts.size,
      topChords,
      nonDiatonicChords,
      secondaryDominants,
      borrowedChords,
      resolvedSecondaryDominants,
      cadenceLabels: detectCadences(allChords),
    },
    sections,
    localModulations,
  }
}

export function transposeKeyDisplay(key: string | null | undefined) {
  if (!key || key === 'Sem tom') return 'Sem tom'
  const parsed = parseKey(key)
  return `${pcToNote(parsed.tonicPc, key)}${parsed.mode === 'minor' ? 'm' : ''}`
}

export function buildHarmonicField(key: string, analysis?: HarmonyAnalysis | null): HarmonicFieldDegree[] {
  const degrees = getScaleDegreeInfo(key)
  const chordCounts = new Map<string, number>()

  for (const chord of analysis?.lines.flatMap((line) => line.chords) ?? []) {
    chordCounts.set(chord.analysisLabel, (chordCounts.get(chord.analysisLabel) ?? 0) + 1)
    chordCounts.set(chord.roman, (chordCounts.get(chord.roman) ?? 0) + 1)
  }

  return degrees.map((degree) => {
    const tonicName = pcToNote(degree.pc, key)
    const chord =
      degree.quality === 'minor'
        ? `${tonicName}m`
        : degree.quality === 'diminished'
          ? `${tonicName}dim`
          : tonicName
    const occurrences = chordCounts.get(degree.roman) ?? 0
    return {
      roman: degree.roman,
      chord,
      quality: degree.quality,
      inSong: occurrences > 0,
      occurrences,
    }
  })
}
