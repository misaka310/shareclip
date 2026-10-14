import assert from 'node:assert/strict';
import test from 'node:test';
import { buildObjectKey, resolveExpiresInSeconds, ShareService } from '../electron/services/shareService';
import type { HistoryEntry, ShareClipConfig } from '../shared/types';

test('share service resolves signed link seconds', () => {
  assert.equal(resolveExpiresInSeconds(1, 172800), 86400);
  assert.equal(resolveExpiresInSeconds(7, 86400), 86400);
  assert.equal(resolveExpiresInSeconds(7, 999999), 604800);
});

test('share service builds prefixed object keys', () => {
  const key = buildObjectKey('shareclip', 'report.pdf', new Date('2026-07-06T12:00:00.000Z'));
  assert.match(key, /^shareclip\/2026-07-06T12-00-00.000Z-[a-f0-9]{10}-report\.pdf$/);
});

test('share service regenerates a signed link and updates history', async () => {
  const calls: HistoryEntry[] = [];
  const service = new ShareService({
    historyStore: {
      upsert: async (entry: HistoryEntry) => {
        calls.push(entry);
        return [entry];
      }
    } as never,
    createClient: () => ({}) as never,
    signUrl: async () => 'https://signed.example.com/file'
  });

  const config: ShareClipConfig = {
    endpoint: 'https://example.com',
    region: 'us-ashburn-1',
    bucket: 'shareclip-temp',
    accessKeyId: 'key',
    secretAccessKey: 'secret',
    forcePathStyle: false,
    keyPrefix: 'shareclip/',
    signedUrlBaseSeconds: 86400,
    maxFileSizeMB: 2048
  };

  const entry: HistoryEntry = {
    id: 'entry-1',
    fileName: 'report.pdf',
    objectKey: 'shareclip/report.pdf',
    bucket: 'shareclip-temp',
    contentType: 'application/pdf',
    size: 10,
    uploadedAt: '2026-07-06T12:00:00.000Z',
    expiryDays: 1,
    signedUrl: 'https://expired.example.com/file',
    signedUrlExpiresAt: '2026-07-07T12:00:00.000Z'
  };

  const result = await service.regenerateLink(config, entry, 3);

  assert.equal(result.expiryDays, 3);
  assert.equal(result.signedUrl, 'https://signed.example.com/file');
  assert.equal(calls[0]?.id, 'entry-1');
  assert.equal(calls[0]?.expiryDays, 3);
});
