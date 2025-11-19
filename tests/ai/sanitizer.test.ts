import { describe, it, expect } from 'vitest';
import { sanitizeParts, sanitizeMessages } from '@/lib/ai/schema';

describe('sanitizeParts', () => {
  it('drops parts without string type', () => {
    const parts = [{}, { type: 123 }, { type: null }];
    expect(sanitizeParts(parts)).toEqual([]);
  });

  it('keeps valid text and reasoning parts', () => {
    const parts = [
      { type: 'text', text: 'hello' },
      { type: 'reasoning', text: 'why' },
    ];
    expect(sanitizeParts(parts)).toEqual(parts);
  });

  it('drops tool-* without toolCallId', () => {
    const parts = [
      { type: 'tool-editImage' },
      { type: 'tool-result' },
    ];
    expect(sanitizeParts(parts)).toEqual([]);
  });

  it('keeps tool parts with toolCallId and output/input/state', () => {
    const parts = [
      { type: 'tool-addLocations', toolCallId: 'abc', output: { success: true } },
      { type: 'tool-generateVariations', toolCallId: 'def', input: { prompt: 'test' }, state: 'input-available' },
      { type: 'tool-result', toolCallId: 'ghi', output: { data: 'result' } },
    ];
    expect(sanitizeParts(parts).length).toBe(3);
    expect(sanitizeParts(parts)[0]).toHaveProperty('type', 'tool-addLocations');
    expect(sanitizeParts(parts)[1]).toHaveProperty('type', 'tool-generateVariations');
    expect(sanitizeParts(parts)[2]).toHaveProperty('type', 'tool-result');
  });

  it('keeps complete tool-* with output or result', () => {
    const parts = [
      { type: 'tool-editImage', toolCallId: 'x', output: { ok: true } },
      { type: 'tool-regenerateImage', toolCallId: 'y', result: { ok: true } },
    ];
    expect(sanitizeParts(parts)).toEqual(parts);
  });
});

describe('sanitizeMessages', () => {
  it('drops invalid parts but preserves message envelope', () => {
    const msgs = [{ id: 'm1', role: 'assistant', parts: [{}, { type: 'text', text: 'ok' }] } as any];
    const out = sanitizeMessages(msgs);
    expect(out[0].parts).toEqual([{ type: 'text', text: 'ok' }]);
  });
});


