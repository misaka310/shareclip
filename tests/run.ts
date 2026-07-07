import assert from 'node:assert/strict';
import { createElement } from 'react';
import { defaultConfig, mergeConfig, resolveConfig, sanitizeKeyPrefix, validateConfig } from '../shared/config';
import { removeHistoryEntry, sortHistory, upsertHistoryEntry } from '../shared/history';
import { buildObjectKey, resolveExpiresInSeconds, ShareService } from '../electron/services/shareService';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App';
import { ShareLinkCard } from '../src/components/ShareLinkCard';
import { HistoryPanel } from '../src/components/HistoryPanel';
import type { ExpiryDays, HistoryEntry, ShareClipConfig } from '../shared/types';

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

function testConfigHelpers() {
  assert.deepEqual(validateConfig(defaultConfig), [
    'Endpoint is required.',
    'Region is required.',
    'Bucket is required.',
    'Access key ID is required.',
    'Secret access key is required.'
  ]);

  assert.deepEqual(
    mergeConfig({
      bucket: 'demo',
      signedUrlBaseSeconds: 7200
    }),
    {
      ...defaultConfig,
      bucket: 'demo',
      signedUrlBaseSeconds: 7200
    }
  );

  assert.equal(sanitizeKeyPrefix('assets'), 'assets/');
  assert.equal(sanitizeKeyPrefix('assets/'), 'assets/');
  assert.equal(sanitizeKeyPrefix('   '), '');

  const resolved = resolveConfig({ bucket: 'file-bucket' }, { bucket: 'saved-bucket' });
  assert.equal(resolved.source, 'saved');
  assert.equal(resolved.config.bucket, 'saved-bucket');
}

function testHistoryHelpers() {
  const sorted = sortHistory([
    baseEntry('first', '2026-07-01T00:00:00.000Z'),
    baseEntry('second', '2026-07-03T00:00:00.000Z')
  ]);
  assert.deepEqual(sorted.map((entry) => entry.id), ['second', 'first']);

  const upserted = upsertHistoryEntry(
    [baseEntry('alpha', '2026-07-01T00:00:00.000Z')],
    {
      ...baseEntry('alpha', '2026-07-05T00:00:00.000Z'),
      signedUrl: 'https://example.com/alpha?fresh=1'
    }
  );
  assert.equal(upserted.length, 1);
  assert.match(upserted[0]!.signedUrl, /fresh=1/);

  const deleted = removeHistoryEntry(
    [baseEntry('alpha', '2026-07-01T00:00:00.000Z'), baseEntry('beta', '2026-07-02T00:00:00.000Z')],
    'alpha'
  );
  assert.deepEqual(deleted.map((entry) => entry.id), ['beta']);
}

async function testShareService() {
  assert.equal(resolveExpiresInSeconds(1, 172800), 86400);
  assert.equal(resolveExpiresInSeconds(7, 86400), 86400);
  assert.equal(resolveExpiresInSeconds(7, 999999), 604800);

  const key = buildObjectKey('shareclip', 'report.pdf', new Date('2026-07-06T12:00:00.000Z'));
  assert.match(key, /^shareclip\/2026-07-06T12-00-00.000Z-[a-f0-9]{10}-report\.pdf$/);

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
}

function testRendererShell() {
  const markup = renderToStaticMarkup(createElement(App));
  assert.match(markup, /アップロード/);
  assert.match(markup, /履歴/);
  assert.match(markup, /設定/);
  assert.match(markup, /ファイルをドラッグ&amp;ドロップ/);
  assert.match(markup, /アップロードしてリンク生成/);
  assert.match(markup, /最近のアップロード/);
  assert.doesNotMatch(markup, /コピーしました/);

  const entry = baseEntry('copied', '2026-07-03T00:00:00.000Z');
  const shareCard = renderToStaticMarkup(
    createElement(ShareLinkCard, {
      entry,
      busy: false,
      copied: true,
      onCopyCurrent: async (_entryId: string) => undefined
    })
  );
  assert.match(shareCard, /コピーしました/);

  const historyPanel = renderToStaticMarkup(
    createElement(HistoryPanel, {
      entries: [entry],
      busyId: null,
      copiedEntryId: entry.id,
      onCopyCurrent: async (_entryId: string) => undefined,
      onRegenerate: async (_entryId: string, _expiryDays: ExpiryDays) => undefined,
      onDelete: async (_entryId: string) => undefined
    })
  );
  assert.match(historyPanel, /コピーしました/);
}

async function main() {
  await testShareService();
  testConfigHelpers();
  testHistoryHelpers();
  testRendererShell();
  console.log('ShareClip tests passed.');
}

void main();
