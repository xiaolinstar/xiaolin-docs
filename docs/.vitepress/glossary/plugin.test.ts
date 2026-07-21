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

describe('glossaryPlugin aside restriction (Option A)', () => {
  it('does not emit GlossaryAside for auto-matched terms', () => {
    const md = new MarkdownIt()
    md.use(glossaryPlugin)
    const html = md.render('我们把网站发布到生产环境。')
    // Auto-matched "生产环境" should only render GlossaryTerm, NOT GlossaryAside
    assert.match(html, /<GlossaryTerm[^>]*>生产环境<\/GlossaryTerm>/)
    assert.doesNotMatch(html, /<GlossaryAside/)
  })

  it('emits GlossaryAside only for explicit shortcodes', () => {
    const md = new MarkdownIt()
    md.use(glossaryPlugin)
    const html = md.render('部署到 {{term:生产环境}}。')
    // Shortcode should render GlossaryTerm AND GlossaryAside
    assert.match(html, /<GlossaryTerm[^>]*>生产环境<\/GlossaryTerm>/)
    assert.match(html, /<GlossaryAside[^>]*term="生产环境"/)
  })

  it('keeps shortcode GlossaryTerm and prevents demotion even if already seen, but only triggers Aside once', () => {
    const md = new MarkdownIt()
    md.use(glossaryPlugin)
    const html = md.render('首先是自动匹配的生产环境。然后是显式短码的 {{term:生产环境}}。最后又是一个短码 {{term:生产环境}}。')
    
    // First (auto-matched) "生产环境" is a GlossaryTerm.
    // Second (shortcode) "生产环境" is a GlossaryTerm and triggers GlossaryAside because it's the first shortcode reference.
    // Third (shortcode) "生产环境" is a GlossaryTerm but does NOT trigger GlossaryAside because it was already aside-rendered.
    const terms = html.match(/<GlossaryTerm[\s\S]*?<\/GlossaryTerm>/g) || []
    assert.equal(terms.length, 3) // None of them are demoted
    
    const asides = html.match(/<GlossaryAside[\s\S]*?\/>/g) || []
    assert.equal(asides.length, 1) // Only one aside is emitted
  })

  it('strips braces and renders key as plain text when shortcode term is unknown', () => {
    const md = new MarkdownIt()
    md.use(glossaryPlugin)
    const html = md.render('我们使用的是 {{term:未知术语}}。')
    // Should strip braces and render "未知术语" without wrapping in GlossaryTerm
    assert.match(html, /我们使用的是 未知术语。/)
    assert.doesNotMatch(html, /<GlossaryTerm/)
    assert.doesNotMatch(html, /{{term:/)
  })
})

