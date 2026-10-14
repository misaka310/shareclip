import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  maskSensitiveText,
  resolveExpiryDays,
  resolveSignedUrlSeconds,
  sanitizeKeyPrefix,
  validateConfig
} from '../../shared/config';
import type { ExpiryDays, HistoryEntry, ShareClipConfig, UploadInput, UploadResult } from '../../shared/types';
import { HistoryStore } from './historyStore';

export function resolveExpiresInSeconds(expiryDays: ExpiryDays, signedUrlBaseSeconds: number): number {
  return resolveSignedUrlSeconds(expiryDays, signedUrlBaseSeconds);
}

export function buildObjectKey(keyPrefix: string, fileName: string, now = new Date()): string {
  const safePrefix = sanitizeKeyPrefix(keyPrefix);
  const stamp = now.toISOString().replaceAll(':', '-');
  const hash = createHash('sha1').update(`${stamp}:${fileName}:${randomUUID()}`).digest('hex').slice(0, 10);
  return `${safePrefix}${stamp}-${hash}-${path.basename(fileName)}`;
}

export interface ShareServiceDependencies {
  historyStore: HistoryStore;
  createClient: (config: ShareClipConfig) => S3Client;
  signUrl: typeof getSignedUrl;
}

function assertValidConfig(config: ShareClipConfig): void {
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
}

function assertValidUpload(config: ShareClipConfig, input: UploadInput): ExpiryDays {
  const errors = validateConfig(config);
  const expiryDays = resolveExpiryDays(input.expiryDays);
  const maxBytes = config.maxFileSizeMB * 1024 * 1024;

  if (input.size > maxBytes) {
    errors.push(`File is larger than the configured ${config.maxFileSizeMB} MB limit.`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  return expiryDays;
}

export class ShareService {
  constructor(private readonly dependencies: ShareServiceDependencies) {}

  async testConnection(config: ShareClipConfig): Promise<void> {
    assertValidConfig(config);

    const client = this.dependencies.createClient(config);
    const key = `${sanitizeKeyPrefix(config.keyPrefix)}connection-test-${randomUUID()}.txt`;
    const body = `shareclip connection test ${new Date().toISOString()}\n`;
    const expiresIn = resolveSignedUrlSeconds(1, config.signedUrlBaseSeconds);
    let uploaded = false;

    try {
      await client.send(new HeadBucketCommand({ Bucket: config.bucket }));

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: 'text/plain; charset=utf-8',
          ContentDisposition: "attachment; filename*=UTF-8''shareclip-connection-test.txt"
        })
      );
      uploaded = true;

      const signedUrl = await this.dependencies.signUrl(
        client,
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: key
        }),
        { expiresIn }
      );

      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error(`Connection test download failed with HTTP ${response.status}.`);
      }

      const downloaded = await response.text();
      if (downloaded !== body) {
        throw new Error('Connection test downloaded content did not match uploaded content.');
      }
    } finally {
      if (uploaded) {
        await client.send(
          new DeleteObjectCommand({
            Bucket: config.bucket,
            Key: key
          })
        );
      }
    }
  }

  async upload(config: ShareClipConfig, input: UploadInput): Promise<UploadResult> {
    const expiryDays = assertValidUpload(config, input);
    const expiresIn = resolveSignedUrlSeconds(expiryDays, config.signedUrlBaseSeconds);
    const objectKey = buildObjectKey(config.keyPrefix, input.fileName);
    const client = this.dependencies.createClient(config);

    await new Upload({
      client,
      params: {
        Bucket: config.bucket,
        Key: objectKey,
        Body: createReadStream(input.filePath),
        ContentType: input.contentType || 'application/octet-stream',
        ContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(input.fileName)}`
      }
    }).done();

    const signedUrl = await this.dependencies.signUrl(
      client,
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectKey
      }),
      { expiresIn }
    );

    const uploadedAt = new Date().toISOString();
    const signedUrlExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const entry: UploadResult = {
      id: randomUUID(),
      fileName: input.fileName,
      filePath: input.filePath,
      objectKey,
      bucket: config.bucket,
      contentType: input.contentType || 'application/octet-stream',
      size: input.size,
      uploadedAt,
      expiryDays,
      signedUrl,
      signedUrlExpiresAt
    };

    await this.dependencies.historyStore.upsert(entry);
    return entry;
  }

  async regenerateLink(config: ShareClipConfig, entry: HistoryEntry, expiryDaysInput: ExpiryDays): Promise<HistoryEntry> {
    assertValidConfig(config);

    const expiryDays = resolveExpiryDays(expiryDaysInput);
    const expiresIn = resolveSignedUrlSeconds(expiryDays, config.signedUrlBaseSeconds);
    const client = this.dependencies.createClient(config);
    const signedUrl = await this.dependencies.signUrl(
      client,
      new GetObjectCommand({
        Bucket: entry.bucket,
        Key: entry.objectKey
      }),
      { expiresIn }
    );

    const nextEntry: HistoryEntry = {
      ...entry,
      expiryDays,
      signedUrl,
      signedUrlExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
    };

    await this.dependencies.historyStore.upsert(nextEntry);
    return nextEntry;
  }

  async deleteRemote(config: ShareClipConfig, entry: HistoryEntry): Promise<void> {
    assertValidConfig(config);

    const client = this.dependencies.createClient(config);
    await client.send(
      new DeleteObjectCommand({
        Bucket: entry.bucket,
        Key: entry.objectKey
      })
    );
  }
}

export function createS3Client(config: ShareClipConfig): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    },
    forcePathStyle: config.forcePathStyle || config.endpoint.includes('.compat.objectstorage.')
  });
}

export function toSafeErrorMessage(error: unknown, config?: Partial<ShareClipConfig>): string {
  const message = error instanceof Error ? error.message : String(error);
  return maskSensitiveText(message, config);
}
