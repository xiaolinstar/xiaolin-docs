import type { GlossaryEntry, TermHit, TermIndex } from './types.ts'

export function buildTermIndex(entries: GlossaryEntry[]): TermIndex {
  const enabled = entries.filter((e) => e.enabled)
  const phrases = enabled.flatMap((entry) =>
    [entry.term, ...entry.aliases]
      .filter(Boolean)
      .map((phrase) => ({ phrase, entry })),
  )
  phrases.sort((a, b) => b.phrase.length - a.phrase.length)
  return { entries: enabled, phrases }
}

export function matchTerms(text: string, index: TermIndex): TermHit[] {
  const hits: TermHit[] = []
  let i = 0
  while (i < text.length) {
    let found: TermHit | undefined
    for (const { phrase, entry } of index.phrases) {
      if (text.startsWith(phrase, i)) {
        found = { start: i, end: i + phrase.length, entry, matched: phrase }
        break
      }
    }
    if (found) {
      hits.push(found)
      i = found.end
    } else {
      i += 1
    }
  }
  return hits
}

export function resolveTermKey(key: string, index: TermIndex): GlossaryEntry | undefined {
  const hit = index.phrases.find((p) => p.phrase === key)
  if (hit) return hit.entry
  return index.entries.find((e) => e.id === key)
}
