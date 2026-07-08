import type { HistoryEntry } from './types';

export function sortHistory(entries: HistoryEntry[]): HistoryEntry[] {
  return [...entries].sort((left, right) => {
    return right.uploadedAt.localeCompare(left.uploadedAt);
  });
}

export function upsertHistoryEntry(entries: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const withoutExisting = entries.filter((item) => item.id !== entry.id);
  return sortHistory([entry, ...withoutExisting]);
}

export function removeHistoryEntry(entries: HistoryEntry[], entryId: string): HistoryEntry[] {
  return entries.filter((entry) => entry.id !== entryId);
}
