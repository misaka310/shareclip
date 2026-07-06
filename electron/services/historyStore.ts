import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { removeHistoryEntry, sortHistory, upsertHistoryEntry } from '../../shared/history';
import type { HistoryEntry } from '../../shared/types';

async function readHistoryFile(historyPath: string): Promise<HistoryEntry[]> {
  try {
    const content = await readFile(historyPath, 'utf8');
    return sortHistory(JSON.parse(content) as HistoryEntry[]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

export class HistoryStore {
  constructor(private readonly historyPath: string) {}

  async list(): Promise<HistoryEntry[]> {
    return readHistoryFile(this.historyPath);
  }

  async upsert(entry: HistoryEntry): Promise<HistoryEntry[]> {
    const next = upsertHistoryEntry(await this.list(), entry);
    await this.write(next);
    return next;
  }

  async remove(entryId: string): Promise<HistoryEntry[]> {
    const next = removeHistoryEntry(await this.list(), entryId);
    await this.write(next);
    return next;
  }

  private async write(entries: HistoryEntry[]): Promise<void> {
    await mkdir(path.dirname(this.historyPath), { recursive: true });
    await writeFile(this.historyPath, JSON.stringify(entries, null, 2), 'utf8');
  }
}
