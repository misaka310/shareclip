export const expiryOptions = [1, 3, 7] as const;
export const maxSignedUrlSeconds = 604800;
export const defaultMaxFileSizeMB = 2048;

export type ExpiryDays = (typeof expiryOptions)[number];

export interface ShareClipConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  keyPrefix: string;
  signedUrlBaseSeconds: number;
  maxFileSizeMB: number;
}

export interface ConfigLoadResult {
  config: ShareClipConfig;
  source: 'default' | 'file' | 'saved';
}

export interface HistoryEntry {
  id: string;
  fileName: string;
  filePath?: string;
  objectKey: string;
  bucket: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  expiryDays: ExpiryDays;
  signedUrl: string;
  signedUrlExpiresAt: string;
}

export interface UploadInput {
  filePath: string;
  fileName: string;
  contentType: string;
  size: number;
  expiryDays: ExpiryDays;
}

export interface UploadResult extends HistoryEntry {}

export interface RendererState {
  config: ShareClipConfig;
  history: HistoryEntry[];
}
