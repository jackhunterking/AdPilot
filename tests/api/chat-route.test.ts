import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('chat route system prompt', () => {
  it('mentions square+vertical parity defaults', () => {
    const file = readFileSync(resolve(process.cwd(), 'app/api/v1/chat/route.ts'), 'utf8');
    expect(file).toMatch(/vertical reuses the same base image|extend the canvas/i);
  });
});


