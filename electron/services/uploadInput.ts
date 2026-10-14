import { stat } from 'node:fs/promises';
import path from 'node:path';
import { resolveExpiryDays } from '../../shared/config';
import type { ShareClipConfig, UploadInput } from '../../shared/types';

export async function validateUploadInputFromDisk(
  input: UploadInput,
  config: ShareClipConfig
): Promise<UploadInput> {
  if (!input || typeof input.filePath !== 'string' || !input.filePath.trim()) {
    throw new Error('Upload file path is required.');
  }
  if (typeof input.fileName !== 'string' || !input.fileName.trim()) {
    throw new Error('Upload file name is required.');
  }

  const filePath = path.resolve(input.filePath);
  const fileName = path.basename(filePath);
  if (path.basename(input.fileName) !== fileName) {
    throw new Error('Upload file name does not match the selected file path.');
  }

  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    throw new Error('The selected upload path is not a regular file.');
  }

  const maxBytes = config.maxFileSizeMB * 1024 * 1024;
  if (fileStat.size > maxBytes) {
    throw new Error(`File is larger than the configured ${config.maxFileSizeMB} MB limit.`);
  }

  return {
    filePath,
    fileName,
    contentType:
      typeof input.contentType === 'string' && input.contentType.trim()
        ? input.contentType.trim()
        : 'application/octet-stream',
    size: fileStat.size,
    expiryDays: resolveExpiryDays(input.expiryDays)
  };
}
