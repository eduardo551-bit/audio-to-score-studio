export type SongbookVersion = 'simplificada' | 'completa'

export type SongbookEntry = {
  id: string
  title: string
  artist: string
  block: string
  key: string | null
  availableVersions: SongbookVersion[]
  searchText: string
  versions: Partial<Record<SongbookVersion, {
    text: string
    pageStart: number
    pageEnd: number
    sourcePdf: string
  }>>
}

export type SongbookCatalog = {
  generatedAt: string
  songCount: number
  artists: string[]
  keys: string[]
  entries: SongbookEntry[]
}
