import type { ConfigLoadResult, ExpiryDays, HistoryEntry, ShareClipConfig } from './types';
import { defaultMaxFileSizeMB, expiryOptions, maxSignedUrlSeconds } from './types';

export const maskedAccessKey = '<configured>';
export const maskedSecretKey = '<configured>';

export const defaultConfig: ShareClipConfig = {
  endpoint: '',
  region: '',
  bucket: '',
  accessKeyId: '',
  secretAccessKey: '',
  forcePathStyle: false,
  keyPrefix: 'shareclip/',
  signedUrlBaseSeconds: maxSignedUrlSeconds,
  maxFileSizeMB: defaultMaxFileSizeMB
};

export function mergeConfig(overrides: Partial<ShareClipConfig>): ShareClipConfig {
  return {
    ...defaultConfig,
    ...overrides,
    forcePathStyle: overrides.forcePathStyle ?? defaultConfig.forcePathStyle,
    signedUrlBaseSeconds: Number(overrides.signedUrlBaseSeconds ?? defaultConfig.signedUrlBaseSeconds),
    maxFileSizeMB: Number(overrides.maxFileSizeMB ?? defaultConfig.maxFileSizeMB)
  };
}

export function isExpiryDays(value: number): value is ExpiryDays {
  return expiryOptions.includes(value as ExpiryDays);
}

export function resolveExpiryDays(value: number): ExpiryDays {
  if (!isExpiryDays(value)) {
    throw new Error('Expiry must be 1, 3, or 7 days.');
  }
  return value;
}

export function resolveSignedUrlSeconds(expiryDays: ExpiryDays, configuredSeconds: number): number {
  const requestedSeconds = expiryDays * 24 * 60 * 60;
  const configured = Number.isFinite(configuredSeconds) && configuredSeconds > 0 ? configuredSeconds : maxSignedUrlSeconds;
  return Math.min(requestedSeconds, configured, maxSignedUrlSeconds);
}

export function validateConfig(config: ShareClipConfig): string[] {
  const errors: string[] = [];

  if (!config.endpoint.trim()) errors.push('Endpoint is required.');
  if (!config.region.trim()) errors.push('Region is required.');
  if (!config.bucket.trim()) errors.push('Bucket is required.');
  if (!config.accessKeyId.trim()) errors.push('Access key ID is required.');
  if (!config.secretAccessKey.trim()) errors.push('Secret access key is required.');
  if (!config.keyPrefix.trim()) errors.push('Key prefix is required.');

  if (!Number.isFinite(config.signedUrlBaseSeconds) || config.signedUrlBaseSeconds <= 0) {
    errors.push('Signed URL seconds must be a positive number.');
  }

  if (config.signedUrlBaseSeconds > maxSignedUrlSeconds) {
    errors.push('Signed URL seconds must be 604800 or less.');
  }

  if (!Number.isFinite(config.maxFileSizeMB) || config.maxFileSizeMB <= 0) {
    errors.push('Max file size MB must be a positive number.');
  }

  return errors;
}

export function sanitizeKeyPrefix(prefix: string): string {
  const trimmed = prefix.trim().replace(/^\/+/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

export function resolveConfig(fileConfig?: Partial<ShareClipConfig>, savedConfig?: Partial<ShareClipConfig>): ConfigLoadResult {
  if (savedConfig) {
    return {
      config: mergeConfig(savedConfig),
      source: 'saved'
    };
  }

  if (fileConfig) {
    return {
      config: mergeConfig(fileConfig),
      source: 'file'
    };
  }

  return {
    config: defaultConfig,
    source: 'default'
  };
}

export function mergeWithExistingSecrets(existingConfig: ShareClipConfig, nextConfig: ShareClipConfig): ShareClipConfig {
  return {
    ...nextConfig,
    accessKeyId:
      !nextConfig.accessKeyId || nextConfig.accessKeyId === maskedAccessKey ? existingConfig.accessKeyId : nextConfig.accessKeyId,
    secretAccessKey:
      !nextConfig.secretAccessKey || nextConfig.secretAccessKey === maskedSecretKey
        ? existingConfig.secretAccessKey
        : nextConfig.secretAccessKey
  };
}

export function toPublicConfig(config: ShareClipConfig): ShareClipConfig {
  return {
    ...config,
    accessKeyId: config.accessKeyId ? maskedAccessKey : '',
    secretAccessKey: config.secretAccessKey ? maskedSecretKey : ''
  };
}

export function toPublicConfigLoadResult(result: ConfigLoadResult): ConfigLoadResult {
  return {
    ...result,
    config: toPublicConfig(result.config)
  };
}

export function maskSensitiveText(input: string, config?: Partial<ShareClipConfig>): string {
  let output = input;
  const values = [config?.accessKeyId, config?.secretAccessKey].filter((value): value is string => Boolean(value));
  for (const value of values) {
    output = output.split(value).join('MASKED');
  }
  output = output.replace(/(Credential=)[^&\s]+/gi, '$1MASKED');
  return output;
}

export function toPublicHistoryEntry(entry: HistoryEntry, config?: Partial<ShareClipConfig>): HistoryEntry {
  return {
    ...entry,
    signedUrl: maskSensitiveText(entry.signedUrl, config)
  };
}

export function toPublicHistory(entries: HistoryEntry[], config?: Partial<ShareClipConfig>): HistoryEntry[] {
  return entries.map((entry) => toPublicHistoryEntry(entry, config));
}
