import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { mergeConfig, resolveConfig } from '../../shared/config';
import type { ConfigLoadResult, ShareClipConfig } from '../../shared/types';

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
    private readonly localConfigPath?: string
  ) {}

  async load(): Promise<ConfigLoadResult> {
    const fileConfig = this.localConfigPath ? await readJsonFile<Partial<ShareClipConfig>>(this.localConfigPath) : null;
    const savedConfig = await readJsonFile<Partial<ShareClipConfig>>(this.savedConfigPath);
    return resolveConfig(fileConfig ?? undefined, savedConfig ?? undefined);
  }

  async save(config: ShareClipConfig): Promise<ConfigLoadResult> {
    await mkdir(path.dirname(this.savedConfigPath), { recursive: true });
    await writeFile(this.savedConfigPath, JSON.stringify(mergeConfig(config), null, 2), 'utf8');
    return {
      config: mergeConfig(config),
      source: 'saved'
    };
  }
}
