import type { HarmonyAnalysis } from '../utils/harmony'
import { isChordLine, splitChordLine, type SongbookLinePart } from '../utils/songbook'

type ChordSheetViewerProps = {
  text: string
  analysis?: HarmonyAnalysis | null
  className?: string
  lineClassName?: string
  chordLineClassName?: string
  lyricLineClassName?: string
  emptyLineClassName?: string
  chordButtonClassName?: string
  activeChord?: string | null
  onChordClick?: (payload: { chord: string; analysisLabel?: string; explanation?: string; harmonicFunction?: string }) => void
}

export function ChordSheetViewer({
  text,
  analysis,
  className,
  lineClassName = 'songbook-line',
  chordLineClassName = 'songbook-line-chords',
  lyricLineClassName = 'songbook-line-lyrics',
  emptyLineClassName,
  chordButtonClassName = 'inline-chord-button',
  activeChord,
  onChordClick,
}: ChordSheetViewerProps) {
  const analyzedChordLines = analysis?.lines.filter((line) => line.type === 'chords') ?? []
  let analyzedLineIndex = 0

  return (
    <div className={className}>
      {text.split('\n').map((line, index) => {
        if (!line) {
          return (
            <div key={`${index}-empty`} className={emptyLineClassName ?? lineClassName}>
              {'\u00A0'}
            </div>
          )
        }

        if (!isChordLine(line)) {
          return (
            <div key={`${index}-${line}`} className={`${lineClassName} ${lyricLineClassName}`.trim()}>
              {line}
            </div>
          )
        }

        const parts = splitChordLine(line, analyzedChordLines[analyzedLineIndex]?.chords)
        analyzedLineIndex += 1

        return (
          <div key={`${index}-${line}`} className={`${lineClassName} ${chordLineClassName}`.trim()}>
            {parts.map((part, partIndex) => renderPart(part, partIndex, chordButtonClassName, activeChord, onChordClick))}
          </div>
        )
      })}
    </div>
  )
}

function renderPart(
  part: SongbookLinePart,
  index: number,
  chordButtonClassName: string,
  activeChord: string | null | undefined,
  onChordClick?: (payload: { chord: string; analysisLabel?: string; explanation?: string; harmonicFunction?: string }) => void,
) {
  if (part.type === 'text') {
    return <span key={`text-${index}`}>{part.value || '\u00A0'}</span>
  }

  const isActive = activeChord === part.value
  return (
    <button
      key={`chord-${index}-${part.value}`}
      type="button"
      className={`${chordButtonClassName} ${isActive ? `${chordButtonClassName}-active` : ''}`.trim()}
      onClick={() =>
        onChordClick?.({
          chord: part.value,
          analysisLabel: part.analysis?.analysisLabel,
          explanation: part.analysis?.explanation,
          harmonicFunction: part.analysis?.harmonicFunction,
        })
      }
    >
      {part.value}
    </button>
  )
}
