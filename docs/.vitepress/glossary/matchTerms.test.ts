import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildTermIndex, matchTerms, resolveTermKey } from './matchTerms.ts'
import type { GlossaryEntry } from './types.ts'

const entries: GlossaryEntry[] = [
  {
    id: 'production-env',
    term: '生产环境',
    definition: '面向真实用户的环境',
    aliases: ['线上环境'],
    enabled: true,
  },
  {
    id: 'cloud-server',
    term: '云服务器',
    definition: '云上的虚拟机',
    aliases: ['ECS'],
    enabled: true,
  },
  {
    id: 'disabled-term',
    term: '已下线词',
    definition: '不应匹配',
    aliases: [],
    enabled: false,
  },
]

describe('matchTerms', () => {
  const index = buildTermIndex(entries)

  it('longest match wins', () => {
    const hits = matchTerms('部署到生产环境即可', index)
    assert.equal(hits.length, 1)
    assert.equal(hits[0].matched, '生产环境')
    assert.equal(hits[0].entry.id, 'production-env')
  })

  it('matches aliases', () => {
    const hits = matchTerms('切到线上环境', index)
    assert.equal(hits[0].entry.id, 'production-env')
    assert.equal(hits[0].matched, '线上环境')
  })

  it('non-overlapping matches', () => {
    const hits = matchTerms('生产环境与云服务器', index)
    assert.equal(hits.length, 2)
    assert.equal(hits[0].matched, '生产环境')
    assert.equal(hits[1].matched, '云服务器')
  })

  it('skips disabled entries', () => {
    assert.equal(matchTerms('已下线词出现了', index).length, 0)
  })

  it('resolveTermKey by id/term/alias', () => {
    assert.equal(resolveTermKey('production-env', index)?.id, 'production-env')
    assert.equal(resolveTermKey('生产环境', index)?.id, 'production-env')
    assert.equal(resolveTermKey('线上环境', index)?.id, 'production-env')
    assert.equal(resolveTermKey('不存在', index), undefined)
  })
})
