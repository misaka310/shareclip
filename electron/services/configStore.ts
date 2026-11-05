import { readFile } from 'node:fs/promises';
import { mergeConfig, resolveConfig } from '../../shared/config';
import type { ConfigLoadResult, ShareClipConfig } from '../../shared/types';
import { writeJsonAtomically } from './atomicJsonFile';
import { isPlainObject, readJsonOrQuarantine, SerialQueue } from './jsonFileRecovery';

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

async function readLocalConfigFile(filePath: string): Promise<Partial<ShareClipConfig> | null> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  // The local file is written by hand, so never move it. Ignore it when it is
  // unreadable instead of blocking every IPC call; saved/default config is used.
  try {
    const parsed: unknown = JSON.parse(content);
    if (isPlainObject(parsed)) {
      return parsed as Partial<ShareClipConfig>;
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  console.warn(`ShareClip ignored an unreadable local config file: ${filePath}`);
  return null;
}

async function readStoredConfig(filePath: string): Promise<StoredConfig | null> {
  const result = await readJsonOrQuarantine(filePath, (value): value is StoredConfig => isPlainObject(value));
  return result.status === 'ok' ? result.value : null;
}

export class ConfigStore {
  // load() can re-write the saved file (secret migration / re-encryption), so
  // loads and saves share one queue to avoid interleaved writes.
  private readonly queue = new SerialQueue();

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
    await writeJsonAtomically(this.savedConfigPath, config);
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

  load(): Promise<ConfigLoadResult> {
    return this.queue.run(async () => {
      const fileConfig = this.localConfigPath ? await readLocalConfigFile(this.localConfigPath) : null;
      const storedConfig = await readStoredConfig(this.savedConfigPath);
      const savedConfig = await this.loadSavedConfig(storedConfig);
      return resolveConfig(fileConfig ?? undefined, savedConfig ?? undefined);
    });
  }

  save(config: ShareClipConfig): Promise<ConfigLoadResult> {
    return this.queue.run(async () => {
      const mergedConfig = mergeConfig(config);
      await this.writeStoredConfig(await this.protectSecret(mergedConfig));
      return {
        config: mergedConfig,
        source: 'saved' as const
      };
    });
  }
}
