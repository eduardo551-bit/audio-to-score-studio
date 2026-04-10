import { useRef, useState } from 'react'

interface Props {
  disabled: boolean
  onFileSelected: (file: File) => void | Promise<void>
}

export function FileDropzone({ disabled, onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function pickFile(fileList: FileList | null) {
    const file = fileList?.[0]
    if (file) void onFileSelected(file)
  }

  return (
    <section
      className={`dropzone ${dragging ? 'dropzone-active' : ''} ${disabled ? 'dropzone-disabled' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!disabled) pickFile(event.dataTransfer.files)
      }}
    >
      <div className="dropzone-icon" aria-hidden="true">
        <span>♪</span>
      </div>
      <p className="eyebrow">Importacao</p>
      <h2>Arraste um arquivo para o studio</h2>
      <p className="muted">
        Suporta `.mid`, `.midi`, `.wav`, `.mp3`, `.mpeg`, `.mpga`, `.ogg` e `.flac`. Audio vira
        um rascunho editavel; MIDI entra com leitura mais fiel e pronta para lapidacao.
      </p>
      <button
        className="primary-button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        Selecionar arquivo
      </button>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept=".mid,.midi,.wav,.mp3,.mpeg,.mpga,.ogg,.flac,audio/mpeg,audio/mp3,audio/*"
        onChange={(event) => pickFile(event.target.files)}
      />
    </section>
  )
}
