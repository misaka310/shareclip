import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { contentTypeForFileName } from '../shared/contentType';
import { isSignedUrlExpired } from '../shared/history';
import type { HistoryEntry, ShareClipConfig } from '../shared/types';
import { ConfigStore, type ConfigSecretStorage } from '../electron/services/configStore';
import { HistoryStore } from '../electron/services/historyStore';
import { SerialQueue } from '../electron/services/jsonFileRecovery';
import { createS3Client, ShareService, withCleanupFailure } from '../electron/services/shareService';

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

const entry = (id: string, uploadedAt = '2026-07-01T00:00:00.000Z'): HistoryEntry => ({
  id,
  fileName: `${id}.txt`,
  objectKey: `shareclip/${id}.txt`,
  bucket: 'shareclip-temp',
  contentType: 'text/plain',
  size: 1,
  uploadedAt,
  expiryDays: 1,
  signedUrl: `https://example.com/${id}`,
  signedUrlExpiresAt: '2026-07-02T00:00:00.000Z'
});

const plainSecretStorage: ConfigSecretStorage = {
  isAvailable: async () => true,
  encrypt: async (plainText) => Buffer.from(plainText, 'utf8'),
  decrypt: async (encrypted) => ({ result: encrypted.toString('utf8'), shouldReEncrypt: false })
};

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'shareclip-reliability-'));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('a corrupt history file is moved aside and the history starts empty', async () => {
  await withTempDir(async (dir) => {
    const historyPath = path.join(dir, 'shareclip.history.json');
    await writeFile(historyPath, '{ not json', 'utf8');
    const store = new HistoryStore(historyPath);

    assert.deepEqual(await store.list(), []);
    const files = await readdir(dir);
    assert.ok(files.some((name) => name.startsWith('shareclip.history.json.corrupt-')));

    assert.deepEqual((await store.upsert(entry('fresh'))).map((item) => item.id), ['fresh']);
  });
});

test('a history file that is valid JSON but not a list is also recovered', async () => {
  await withTempDir(async (dir) => {
    const historyPath = path.join(dir, 'shareclip.history.json');
    await writeFile(historyPath, '{"entries": []}', 'utf8');
    assert.deepEqual(await new HistoryStore(historyPath).list(), []);
  });
});

test('concurrent history writes do not lose entries', async () => {
  await withTempDir(async (dir) => {
    const store = new HistoryStore(path.join(dir, 'shareclip.history.json'));
    const ids = Array.from({ length: 20 }, (_, index) => `entry-${index}`);
    await Promise.all(ids.map((id, index) => store.upsert(entry(id, `2026-07-01T00:00:${String(index).padStart(2, '0')}.000Z`))));
    await Promise.all([store.remove('entry-0'), store.upsert(entry('late', '2026-07-02T00:00:00.000Z'))]);

    const listed = (await store.list()).map((item) => item.id).sort();
    assert.deepEqual(listed, [...ids.slice(1), 'late'].sort());
  });
});

test('a corrupt saved config is moved aside and can be overwritten from the UI', async () => {
  await withTempDir(async (dir) => {
    const savedPath = path.join(dir, 'shareclip.config.json');
    await writeFile(savedPath, '{ broken', 'utf8');
    const store = new ConfigStore(savedPath, undefined, plainSecretStorage);

    assert.equal((await store.load()).source, 'default');
    await store.save(config);
    assert.equal((await store.load()).config.bucket, 'shareclip-temp');
    assert.ok((await readdir(dir)).some((name) => name.startsWith('shareclip.config.json.corrupt-')));
  });
});

test('an unreadable local config file is ignored and left in place', async () => {
  await withTempDir(async (dir) => {
    const localPath = path.join(dir, 'shareclip.config.local.json');
    await writeFile(localPath, '{ hand edited', 'utf8');
    const store = new ConfigStore(path.join(dir, 'shareclip.config.json'), localPath, plainSecretStorage);

    assert.equal((await store.load()).source, 'default');
    assert.equal(await readFile(localPath, 'utf8'), '{ hand edited');
  });
});

test('serial queue keeps running after a failed task', async () => {
  const queue = new SerialQueue();
  const order: number[] = [];
  const failing = queue.run(async () => {
    order.push(1);
    throw new Error('boom');
  });
  const next = queue.run(async () => {
    order.push(2);
    return 'ok';
  });
  await assert.rejects(failing, /boom/);
  assert.equal(await next, 'ok');
  assert.deepEqual(order, [1, 2]);
});

test('connection test reports the original failure when cleanup also fails', async () => {
  const service = new ShareService({
    historyStore: {} as never,
    createClient: () =>
      ({
        send: async (command: unknown) => {
          if (command instanceof DeleteObjectCommand) throw new Error('AccessDenied on delete');
          return {};
        }
      }) as never,
    signUrl: async () => {
      throw new Error('SignatureDoesNotMatch');
    }
  });

  await assert.rejects(service.testConnection(config), (error: Error) => {
    assert.match(error.message, /^SignatureDoesNotMatch/);
    assert.match(error.message, /AccessDenied on delete/);
    return true;
  });
});

test('withCleanupFailure keeps the original error as the cause', () => {
  const primary = new Error('primary');
  const combined = withCleanupFailure(primary, new Error('cleanup'), 'Cleanup');
  assert.equal(combined.cause, primary);
  assert.equal(combined.message, 'primary (Cleanup also failed: cleanup)');
});

test('regenerating a link for a deleted object fails instead of reporting success', async () => {
  const upserts: HistoryEntry[] = [];
  const notFound = Object.assign(new Error('NotFound'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } });
  const service = new ShareService({
    historyStore: { upsert: async (next: HistoryEntry) => (upserts.push(next), [next]) } as never,
    createClient: () =>
      ({
        send: async (command: unknown) => {
          if (command instanceof HeadObjectCommand) throw notFound;
          return {};
        }
      }) as never,
    signUrl: async () => 'https://signed.example.com/file'
  });

  await assert.rejects(service.regenerateLink(config, entry('gone'), 3), /no longer exists/);
  assert.equal(upserts.length, 0);
});

test('expired signed links are detected before copying', () => {
  const now = Date.parse('2026-07-02T00:00:00.000Z');
  assert.equal(isSignedUrlExpired({ signedUrlExpiresAt: '2026-07-01T23:59:59.000Z' }, now), true);
  assert.equal(isSignedUrlExpired({ signedUrlExpiresAt: '2026-07-02T00:00:00.000Z' }, now), true);
  assert.equal(isSignedUrlExpired({ signedUrlExpiresAt: '2026-07-02T00:00:01.000Z' }, now), false);
  assert.equal(isSignedUrlExpired({ signedUrlExpiresAt: 'not a date' }, now), true);
});

test('files picked in the dialog get a content type from their extension', () => {
  assert.equal(contentTypeForFileName('report.PDF'), 'application/pdf');
  assert.equal(contentTypeForFileName('photo.jpeg'), 'image/jpeg');
  assert.equal(contentTypeForFileName('archive.tar.gz'), 'application/gzip');
  assert.equal(contentTypeForFileName('README'), 'application/octet-stream');
  assert.equal(contentTypeForFileName('.env'), 'application/octet-stream');
  assert.equal(contentTypeForFileName('data.unknownext'), 'application/octet-stream');
});

test('an upload whose history save fails deletes the uploaded object again', async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir, 'note.txt');
    await writeFile(filePath, 'hello', 'utf8');
    const sent: string[] = [];
    // A real client so lib-storage can resolve the endpoint offline; only the
    // network call is replaced.
    const client = createS3Client(config);
    client.send = (async (command: { constructor: { name: string } }) => {
      sent.push(command.constructor.name);
      return {};
    }) as never;
    const service = new ShareService({
      historyStore: {
        upsert: async () => {
          throw new Error('history write failed');
        }
      } as never,
      createClient: () => client as never,
      signUrl: async () => 'https://signed.example.com/file'
    });

    await assert.rejects(
      service.upload(config, { filePath, fileName: 'note.txt', contentType: 'text/plain', size: 5, expiryDays: 1 }),
      /history write failed/
    );
    assert.equal(sent.at(-1), 'DeleteObjectCommand');
  });
});
