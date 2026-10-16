import assert from 'node:assert/strict';
import fc from 'fast-check';
import { sanitizeKeyPrefix } from '../shared/config';

export function runFuzzProperties() {
  fc.assert(
    fc.property(fc.string(), (raw) => {
      const normalized = sanitizeKeyPrefix(raw);
      assert.equal(sanitizeKeyPrefix(normalized), normalized);
      assert.ok(normalized === '' || normalized.endsWith('/'));
      assert.equal(normalized.startsWith('/'), false);
    }),
    { numRuns: 1000 }
  );
}
