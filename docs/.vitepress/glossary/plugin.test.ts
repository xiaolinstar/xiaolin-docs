import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import MarkdownIt from 'markdown-it'
import { glossaryPlugin } from './plugin.ts'

describe('glossaryPlugin shortcode nesting safety', () => {
  it('does not emit GlossaryTerm inside link text', () => {
    const md = new MarkdownIt()
    md.use(glossaryPlugin)
    const html = md.render('[{{term:生产环境}}](https://example.com)')
    // Plain text inside <a> is ok; interactive widget is not (<a><button> illegal)
    assert.match(html, /<a[^>]*>生产环境<\/a>/)
    assert.doesNotMatch(html, /<a[^>]*>[\s\S]*<GlossaryTerm/)
  })

  it('still emits GlossaryTerm for shortcode outside links', () => {
    const md = new MarkdownIt()
    md.use(glossaryPlugin)
    const html = md.render('见 {{term:生产环境}}。')
    assert.match(html, /<GlossaryTerm[^>]*>生产环境<\/GlossaryTerm>/)
  })
})

describe('glossaryPlugin once per page', () => {
  it('keeps only the first GlossaryTerm for the same id', () => {
    const md = new MarkdownIt()
    md.use(glossaryPlugin)
    const html = md.render('先说生产环境。再说生产环境与线上环境。')
    const terms = html.match(/<GlossaryTerm[\s\S]*?<\/GlossaryTerm>/g) || []
    assert.equal(terms.length, 1)
    assert.match(html, /先说[\s\S]*<GlossaryTerm[^>]*>生产环境<\/GlossaryTerm>/)
    assert.match(html, /再说生产环境与线上环境/)
    assert.doesNotMatch(html, /再说[\s\S]*<GlossaryTerm/)
  })

  it('still tips distinct terms once each', () => {
    const md = new MarkdownIt()
    md.use(glossaryPlugin)
    const html = md.render('生产环境需要云服务器。再次提到生产环境与云服务器。')
    const terms = html.match(/<GlossaryTerm[\s\S]*?<\/GlossaryTerm>/g) || []
    assert.equal(terms.length, 2)
    assert.match(html, /<GlossaryTerm[^>]*>生产环境<\/GlossaryTerm>/)
    assert.match(html, /<GlossaryTerm[^>]*>云服务器<\/GlossaryTerm>/)
  })
})
