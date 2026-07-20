import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { buildTermIndex } from './matchTerms.ts'
import type { GlossaryEntry, TermIndex } from './types.ts'

export function loadGlossary(dir: string): TermIndex {
  if (!fs.existsSync(dir)) return buildTermIndex([])
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
  const entries: GlossaryEntry[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8')
    const { data } = matter(raw)
    return {
      id: String(data.id),
      term: String(data.term),
      definition: String(data.definition),
      aliases: Array.isArray(data.aliases) ? data.aliases.map(String) : [],
      enabled: data.enabled !== false,
    }
  })
  return buildTermIndex(entries)
}
