import type { ConfigLoadResult, ExpiryDays, HistoryEntry, ShareClipConfig, UploadInput, UploadResult } from '../shared/types';

export const ipcChannels = {
  getState: 'shareclip:get-state',
  saveConfig: 'shareclip:save-config',
  uploadFile: 'shareclip:upload-file',
  chooseFile: 'shareclip:choose-file',
  copyCurrentLink: 'shareclip:copy-current-link',
  copyLink: 'shareclip:copy-link',
  deleteEntry: 'shareclip:delete-entry'
} as const;

export interface ShareClipApi {
  getState: () => Promise<{ config: ConfigLoadResult; history: HistoryEntry[] }>;
  saveConfig: (config: ShareClipConfig) => Promise<ConfigLoadResult>;
  chooseFile: () => Promise<UploadInput | null>;
  resolveDroppedFile: (file: File, expiryDays: ExpiryDays) => UploadInput | null;
  uploadFile: (input: UploadInput) => Promise<UploadResult>;
  copyCurrentLink: (entryId: string) => Promise<HistoryEntry>;
  copyLink: (entryId: string, expiryDays: ExpiryDays) => Promise<HistoryEntry>;
  deleteEntry: (entryId: string) => Promise<HistoryEntry[]>;
}
