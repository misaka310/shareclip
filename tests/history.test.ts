import assert from 'node:assert/strict';
import test from 'node:test';
import { removeHistoryEntry, sortHistory, upsertHistoryEntry } from '../shared/history';
import type { HistoryEntry } from '../shared/types';

const baseEntry = (id: string, uploadedAt: string): HistoryEntry => ({
  id,
  fileName: `${id}.txt`,
  objectKey: `${id}.txt`,
  bucket: 'shareclip-temp',
  contentType: 'text/plain',
  size: 128,
  uploadedAt,
  expiryDays: 1,
  signedUrl: `https://example.com/${id}`,
  signedUrlExpiresAt: '2026-07-07T00:00:00.000Z'
});

test('history helpers sort newest uploads first', () => {
  const result = sortHistory([
    baseEntry('first', '2026-07-01T00:00:00.000Z'),
    baseEntry('second', '2026-07-03T00:00:00.000Z')
  ]);

  assert.deepEqual(result.map((entry) => entry.id), ['second', 'first']);
});

test('history helpers replace existing entries when re-signed', () => {
  const result = upsertHistoryEntry(
    [baseEntry('alpha', '2026-07-01T00:00:00.000Z')],
    {
      ...baseEntry('alpha', '2026-07-05T00:00:00.000Z'),
      signedUrl: 'https://example.com/alpha?fresh=1'
    }
  );

  assert.equal(result.length, 1);
  assert.match(result[0]!.signedUrl, /fresh=1/);
});

test('history helpers delete entries by id', () => {
  const result = removeHistoryEntry(
    [baseEntry('alpha', '2026-07-01T00:00:00.000Z'), baseEntry('beta', '2026-07-02T00:00:00.000Z')],
    'alpha'
  );

  assert.deepEqual(result.map((entry) => entry.id), ['beta']);
});
