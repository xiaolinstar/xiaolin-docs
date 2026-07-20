export type GlossaryEntry = {
  id: string
  term: string
  definition: string
  aliases: string[]
  enabled: boolean
}

export type TermPhrase = {
  phrase: string
  entry: GlossaryEntry
}

export type TermIndex = {
  entries: GlossaryEntry[]
  phrases: TermPhrase[]
}

export type TermHit = {
  start: number
  end: number
  entry: GlossaryEntry
  matched: string
}
