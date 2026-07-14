import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { mergeConfig, resolveConfig } from '../../shared/config';
import type { ConfigLoadResult, ShareClipConfig } from '../../shared/types';

type StoredConfig = Omit<Partial<ShareClipConfig>, 'secretAccessKey'> & {
  secretAccessKey?: string;
  secretAccessKeyEncrypted?: string;
};

export interface ConfigSecretStorage {
  isAvailable(): Promise<boolean>;
  encrypt(plainText: string): Promise<Buffer>;
  decrypt(encrypted: Buffer): Promise<{
    result: string;
    shouldReEncrypt: boolean;
  }>;
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

export class ConfigStore {
  constructor(
    private readonly savedConfigPath: string,
    private readonly localConfigPath: string | undefined,
    private readonly secretStorage: ConfigSecretStorage
  ) {}

  private async assertSecureStorageAvailable(): Promise<void> {
    if (!(await this.secretStorage.isAvailable())) {
      throw new Error('Secure storage is unavailable. ShareClip will not save the secret access key as plaintext.');
    }
  }

  private async protectSecret(config: Partial<ShareClipConfig>): Promise<StoredConfig> {
    const { secretAccessKey, ...publicConfig } = config;
    if (!secretAccessKey) {
      return publicConfig;
    }

    await this.assertSecureStorageAvailable();
    const encrypted = await this.secretStorage.encrypt(secretAccessKey);
    return {
      ...publicConfig,
      secretAccessKeyEncrypted: encrypted.toString('base64')
    };
  }

  private async writeStoredConfig(config: StoredConfig): Promise<void> {
    await mkdir(path.dirname(this.savedConfigPath), { recursive: true });
    await writeFile(this.savedConfigPath, JSON.stringify(config, null, 2), 'utf8');
  }

  private async loadSavedConfig(storedConfig: StoredConfig | null): Promise<Partial<ShareClipConfig> | null> {
    if (!storedConfig) {
      return null;
    }

    const { secretAccessKeyEncrypted, secretAccessKey, ...publicConfig } = storedConfig;

    if (secretAccessKeyEncrypted) {
      await this.assertSecureStorageAvailable();
      const decrypted = await this.secretStorage.decrypt(Buffer.from(secretAccessKeyEncrypted, 'base64'));

      if (decrypted.shouldReEncrypt || secretAccessKey !== undefined) {
        await this.writeStoredConfig(
          await this.protectSecret({
            ...publicConfig,
            secretAccessKey: decrypted.result
          })
        );
      }

      return {
        ...publicConfig,
        secretAccessKey: decrypted.result
      };
    }

    if (secretAccessKey) {
      const migratedConfig = await this.protectSecret({
        ...publicConfig,
        secretAccessKey
      });
      await this.writeStoredConfig(migratedConfig);
      return {
        ...publicConfig,
        secretAccessKey
      };
    }

    return publicConfig;
  }

  async load(): Promise<ConfigLoadResult> {
    const fileConfig = this.localConfigPath ? await readJsonFile<Partial<ShareClipConfig>>(this.localConfigPath) : null;
    const storedConfig = await readJsonFile<StoredConfig>(this.savedConfigPath);
    const savedConfig = await this.loadSavedConfig(storedConfig);
    return resolveConfig(fileConfig ?? undefined, savedConfig ?? undefined);
  }

  async save(config: ShareClipConfig): Promise<ConfigLoadResult> {
    const mergedConfig = mergeConfig(config);
    await this.writeStoredConfig(await this.protectSecret(mergedConfig));
    return {
      config: mergedConfig,
      source: 'saved'
    };
  }
}
