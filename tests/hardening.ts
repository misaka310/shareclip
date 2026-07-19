import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeJsonAtomically } from '../electron/services/atomicJsonFile';
import { validateUploadInputFromDisk } from '../electron/services/uploadInput';
import type { ShareClipConfig, UploadInput } from '../shared/types';

const config: ShareClipConfig = {
  endpoint: 'https://example.com',
  region: 'us-ashburn-1',
  bucket: 'shareclip-temp',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  forcePathStyle: false,
  keyPrefix: 'shareclip/',
  signedUrlBaseSeconds: 86400,
  maxFileSizeMB: 1
};

async function testAtomicJsonReplacement(): Promise<void> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'shareclip-atomic-'));
  const target = path.join(tempDir, 'state.json');
  try {
    await writeJsonAtomically(target, { revision: 1 });
    await writeJsonAtomically(target, { revision: 2, valid: true });

    assert.deepEqual(JSON.parse(await readFile(target, 'utf8')), { revision: 2, valid: true });
    assert.deepEqual((await readdir(tempDir)).filter((name) => name.endsWith('.tmp')), []);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function testAtomicJsonCleansUpAfterSerializationFailure(): Promise<void> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'shareclip-atomic-failure-'));
  const target = path.join(tempDir, 'state.json');
  try {
    await assert.rejects(() => writeJsonAtomically(target, { invalid: 1n }), /BigInt/);
    assert.deepEqual((await readdir(tempDir)).filter((name) => name.endsWith('.tmp')), []);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function testUploadInputIsRevalidatedFromDisk(): Promise<void> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'shareclip-upload-'));
  const filePath = path.join(tempDir, 'report.txt');
  await writeFile(filePath, 'actual-content', 'utf8');

  const input: UploadInput = {
    filePath,
    fileName: 'report.txt',
    contentType: ' text/plain ',
    size: 0,
    expiryDays: 3
  };

  try {
    const validated = await validateUploadInputFromDisk(input, config);
    assert.equal(validated.filePath, path.resolve(filePath));
    assert.equal(validated.fileName, 'report.txt');
    assert.equal(validated.size, Buffer.byteLength('actual-content'));
    assert.equal(validated.contentType, 'text/plain');
    assert.equal(validated.expiryDays, 3);

    const defaultContentType = await validateUploadInputFromDisk({ ...input, contentType: '' }, config);
    assert.equal(defaultContentType.contentType, 'application/octet-stream');

    await assert.rejects(
      () => validateUploadInputFromDisk({ ...input, filePath: '' }, config),
      /path is required/
    );
    await assert.rejects(
      () => validateUploadInputFromDisk({ ...input, fileName: '' }, config),
      /name is required/
    );
    await assert.rejects(
      () => validateUploadInputFromDisk({ ...input, fileName: 'spoofed.txt' }, config),
      /does not match/
    );
    await assert.rejects(
      () => validateUploadInputFromDisk({ ...input, filePath: tempDir, fileName: path.basename(tempDir) }, config),
      /not a regular file/
    );
    await assert.rejects(
      () => validateUploadInputFromDisk(input, { ...config, maxFileSizeMB: 0.000001 }),
      /larger than/
    );
    await assert.rejects(
      () => validateUploadInputFromDisk({ ...input, expiryDays: 2 as never }, config),
      /Expiry must be/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  await testAtomicJsonReplacement();
  await testAtomicJsonCleansUpAfterSerializationFailure();
  await testUploadInputIsRevalidatedFromDisk();
  console.log('ShareClip hardening tests passed.');
}

void main();
