import { describe, it, expect } from 'vitest'
import { normalizePhoneForMeta } from '@/lib/utils/normalize'

describe('normalizePhoneForMeta', () => {
  it('formats local number with selected country code', () => {
    const r = normalizePhoneForMeta('(415) 963-9563', '+1')
    expect(r.valid).toBe(true)
    expect(r.e164).toBe('+14159639563')
  })

  it('respects already international number', () => {
    const r = normalizePhoneForMeta('+442079460123', '+1')
    expect(r.valid).toBe(true)
    expect(r.e164).toBe('+442079460123')
  })

  it('rejects clearly invalid number', () => {
    const r = normalizePhoneForMeta('123', '+1')
    expect(r.valid).toBe(false)
  })
})


