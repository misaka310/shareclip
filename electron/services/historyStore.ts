import { removeHistoryEntry, sortHistory, upsertHistoryEntry } from '../../shared/history';
import type { HistoryEntry } from '../../shared/types';
import { writeJsonAtomically } from './atomicJsonFile';
import { readJsonOrQuarantine, SerialQueue } from './jsonFileRecovery';

function isHistoryArray(value: unknown): value is HistoryEntry[] {
  return Array.isArray(value);
}

export class HistoryStore {
  // upsert/remove are read-modify-write; IPC handlers run concurrently, so every
  // file access goes through one queue to keep a later write from dropping or
  // resurrecting entries written by an earlier one.
  private readonly queue = new SerialQueue();

  constructor(private readonly historyPath: string) {}

  list(): Promise<HistoryEntry[]> {
    return this.queue.run(() => this.read());
  }

  upsert(entry: HistoryEntry): Promise<HistoryEntry[]> {
    return this.queue.run(async () => {
      const next = upsertHistoryEntry(await this.read(), entry);
      await writeJsonAtomically(this.historyPath, next);
      return next;
    });
  }

  remove(entryId: string): Promise<HistoryEntry[]> {
    return this.queue.run(async () => {
      const next = removeHistoryEntry(await this.read(), entryId);
      await writeJsonAtomically(this.historyPath, next);
      return next;
    });
  }

  private async read(): Promise<HistoryEntry[]> {
    const result = await readJsonOrQuarantine(this.historyPath, isHistoryArray);
    return result.status === 'ok' ? sortHistory(result.value) : [];
  }
}
