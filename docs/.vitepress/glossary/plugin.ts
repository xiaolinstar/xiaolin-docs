import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import { loadGlossary } from './loadGlossary.ts'
import { matchTerms, resolveTermKey } from './matchTerms.ts'

const glossaryDir = path.join(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../glossary',
)
const index = loadGlossary(glossaryDir)

const SHORTCODE_PREFIX = '{{term:'
const SHORTCODE_SUFFIX = '}}'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}

function pushGlossaryTerm(
  state: StateInline,
  attrs: { id: string; term: string; en?: string; definition: string; fromShortcode?: boolean },
  content: string,
): void {
  const token = state.push('glossary_term', '', 0)
  token.content = content
  token.attrSet('id', attrs.id)
  token.attrSet('term', attrs.term)
  if (attrs.en) token.attrSet('en', attrs.en)
  token.attrSet('definition', attrs.definition)
  if (attrs.fromShortcode) {
    token.attrSet('fromShortcode', 'true')
  }
}

function createGlossaryTermToken(
  TokenCtor: typeof Token,
  attrs: { id: string; term: string; en?: string; definition: string },
  content: string,
): Token {
  const token = new TokenCtor('glossary_term', '', 0)
  token.content = content
  token.attrSet('id', attrs.id)
  token.attrSet('term', attrs.term)
  if (attrs.en) token.attrSet('en', attrs.en)
  token.attrSet('definition', attrs.definition)
  return token
}

function glossaryTermShortcode(state: StateInline, silent: boolean): boolean {
  const pos = state.pos
  if (!state.src.startsWith(SHORTCODE_PREFIX, pos)) return false

  const keyStart = pos + SHORTCODE_PREFIX.length
  const end = state.src.indexOf(SHORTCODE_SUFFIX, keyStart)
  if (end < 0) return false

  const raw = state.src.slice(pos, end + SHORTCODE_SUFFIX.length)
  const key = state.src.slice(keyStart, end).trim()

  if (!silent) {
    const entry = resolveTermKey(key, index)
    if (entry) {
      pushGlossaryTerm(
        state,
        { id: entry.id, term: entry.term, en: entry.en, definition: entry.definition, fromShortcode: true },
        entry.term,
      )
    } else {
      console.warn(`[glossary] unknown term: ${key}`)
      const text = state.push('text', '', 0)
      text.content = key
    }
  }

  state.pos = end + SHORTCODE_SUFFIX.length
  return true
}

/** Demote interactive glossary_term → plain text (avoids <a><button> / image-alt widgets). */
function demoteGlossaryTermToText(token: Token, TokenCtor: typeof Token): Token {
  const t = new TokenCtor('text', '', 0)
  t.content = token.content
  return t
}

function demoteGlossaryTermsInTree(children: Token[], TokenCtor: typeof Token): Token[] {
  return children.map((child) => {
    if (child.type === 'glossary_term') {
      return demoteGlossaryTermToText(child, TokenCtor)
    }
    if (child.children?.length) {
      child.children = demoteGlossaryTermsInTree(child.children, TokenCtor)
    }
    return child
  })
}

function autolinkChildren(children: Token[], TokenCtor: typeof Token): Token[] {
  const result: Token[] = []
  let inLink = 0

  for (const child of children) {
    if (child.type === 'link_open') {
      inLink += 1
      result.push(child)
      continue
    }
    if (child.type === 'link_close') {
      inLink -= 1
      result.push(child)
      continue
    }
    // Image alt children: never emit interactive glossary widgets
    if (child.type === 'image' && child.children?.length) {
      child.children = demoteGlossaryTermsInTree(child.children, TokenCtor)
      result.push(child)
      continue
    }
    // Shortcode path: plain text inside links (auto-match already skips links)
    if (child.type === 'glossary_term' && inLink > 0) {
      result.push(demoteGlossaryTermToText(child, TokenCtor))
      continue
    }
    if (
      inLink > 0
      || child.type === 'code_inline'
      || child.type === 'glossary_term'
    ) {
      result.push(child)
      continue
    }
    if (child.type !== 'text') {
      result.push(child)
      continue
    }

    const text = child.content
    const hits = matchTerms(text, index)
    if (hits.length === 0) {
      result.push(child)
      continue
    }

    let last = 0
    for (const hit of hits) {
      if (hit.start > last) {
        const t = new TokenCtor('text', '', 0)
        t.content = text.slice(last, hit.start)
        result.push(t)
      }
      result.push(
        createGlossaryTermToken(
          TokenCtor,
          {
            id: hit.entry.id,
            term: hit.entry.term,
            en: hit.entry.en,
            definition: hit.entry.definition,
          },
          hit.matched,
        ),
      )
      last = hit.end
    }
    if (last < text.length) {
      const t = new TokenCtor('text', '', 0)
      t.content = text.slice(last)
      result.push(t)
    }
  }

  return result
}

function glossaryTermAutolink(state: StateCore): void {
  const TokenCtor = state.Token
  for (const token of state.tokens) {
    if (token.type !== 'inline' || !token.children) continue
    // Demote shortcodes inside links/images before (and instead of) leaving <GlossaryTerm>
    token.children = autolinkChildren(token.children, TokenCtor)
  }
}

/** Keep only the first glossary_term per entry id on this page; later hits → plain text. */
function glossaryOncePerPage(state: StateCore): void {
  const seen = new Set<string>()
  const TokenCtor = state.Token

  for (const token of state.tokens) {
    if (token.type !== 'inline' || !token.children) continue
    token.children = token.children.map((child) => {
      if (child.type !== 'glossary_term') return child
      const id = child.attrGet('id')
      if (!id) return demoteGlossaryTermToText(child, TokenCtor)
      const isFromShortcode = child.attrGet('fromShortcode') === 'true'
      if (seen.has(id) && !isFromShortcode) {
        return demoteGlossaryTermToText(child, TokenCtor)
      }
      seen.add(id)
      return child
    })
  }
}

function renderAsideHtml(term: string, definition: string): string {
  return `<GlossaryAside term="${escapeAttr(term)}" definition="${escapeAttr(definition)}" />\n`
}

function glossaryFirstAside(state: StateCore): void {
  const asided = new Set<string>()
  const tokens = state.tokens
  const TokenCtor = state.Token

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type !== 'inline' || !token.children) continue

    const firstMentions: { term: string; definition: string }[] = []
    for (const child of token.children) {
      if (child.type !== 'glossary_term') continue
      if (child.attrGet('fromShortcode') !== 'true') continue
      const id = child.attrGet('id')
      if (!id || asided.has(id)) continue
      asided.add(id)
      firstMentions.push({
        term: child.attrGet('term') || '',
        definition: child.attrGet('definition') || '',
      })
    }
    if (firstMentions.length === 0) continue

    // Skip aside injection inside table cells: <GlossaryAside /> is an html_block
    // token, which breaks markdown-it's table structure (the tag escapes the <td>
    // and is rendered as an extra <tr> child → "phantom column" in browsers).
    const prevToken = i > 0 ? tokens[i - 1] : undefined
    if (prevToken && (prevToken.type === 'td_open' || prevToken.type === 'th_open')) {
      continue
    }

    let insertAt = i
    if (i > 0 && tokens[i - 1].type.endsWith('_open')) {
      insertAt = i - 1
    }

    for (const mention of firstMentions) {
      const aside = new TokenCtor('html_block', '', 0)
      aside.content = renderAsideHtml(mention.term, mention.definition)
      tokens.splice(insertAt, 0, aside)
      insertAt += 1
      i += 1
    }
  }
}

export function glossaryPlugin(md: MarkdownIt): void {
  md.inline.ruler.before('emphasis', 'glossary_term_shortcode', glossaryTermShortcode)
  md.core.ruler.after('inline', 'glossary_term_autolink', glossaryTermAutolink)
  md.core.ruler.after('glossary_term_autolink', 'glossary_once_per_page', glossaryOncePerPage)
  md.core.ruler.after('glossary_once_per_page', 'glossary_first_aside', glossaryFirstAside)

  md.renderer.rules.glossary_term = (tokens, idx) => {
    const t = tokens[idx]
    const term = t.attrGet('term') || ''
    const en = t.attrGet('en') || ''
    const definition = t.attrGet('definition') || ''
    const text = t.content
    return `<GlossaryTerm term="${escapeAttr(term)}" en="${escapeAttr(en)}" definition="${escapeAttr(definition)}">${escapeHtml(text)}</GlossaryTerm>`
  }
}
