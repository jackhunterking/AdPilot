import { describe, it, expect } from 'vitest'
import { normalizeUrlForMeta } from '@/lib/utils/normalize'

describe('normalizeUrlForMeta', () => {
  it('adds https when missing', () => {
    const r = normalizeUrlForMeta('adpilot.studio')
    expect(r.valid).toBe(true)
    expect(r.normalized).toMatch(/^https:\/\/adpilot\.studio\/?$/)
  })

  it('keeps explicit http', () => {
    const r = normalizeUrlForMeta('http://adpilot.studio')
    expect(r.valid).toBe(true)
    expect(r.normalized.startsWith('http://')).toBe(true)
  })

  it('accepts path and query', () => {
    const r = normalizeUrlForMeta('adpilot.studio/path?x=1')
    expect(r.valid).toBe(true)
    expect(r.normalized).toContain('/path?x=1')
  })

  it('rejects invalid host without tld', () => {
    const r = normalizeUrlForMeta('localhost')
    expect(r.valid).toBe(false)
  })
})


