import { contextBridge, ipcRenderer } from 'electron';
import type { ConfigLoadResult, ExpiryDays, HistoryEntry, ShareClipConfig, UploadInput, UploadResult } from '../shared/types';

const ipcChannels = {
  getState: 'shareclip:get-state',
  saveConfig: 'shareclip:save-config',
  uploadFile: 'shareclip:upload-file',
  chooseFile: 'shareclip:choose-file',
  copyLink: 'shareclip:copy-link',
  deleteEntry: 'shareclip:delete-entry'
} as const;

interface ShareClipApi {
  getState: () => Promise<{ config: ConfigLoadResult; history: HistoryEntry[] }>;
  saveConfig: (config: ShareClipConfig) => Promise<ConfigLoadResult>;
  chooseFile: () => Promise<UploadInput | null>;
  uploadFile: (input: UploadInput) => Promise<UploadResult>;
  copyLink: (entryId: string, expiryDays: ExpiryDays) => Promise<HistoryEntry>;
  deleteEntry: (entryId: string) => Promise<HistoryEntry[]>;
}

const api: ShareClipApi = {
  getState: () => ipcRenderer.invoke(ipcChannels.getState),
  saveConfig: (config) => ipcRenderer.invoke(ipcChannels.saveConfig, config),
  chooseFile: () => ipcRenderer.invoke(ipcChannels.chooseFile),
  uploadFile: (input) => ipcRenderer.invoke(ipcChannels.uploadFile, input),
  copyLink: (entryId, expiryDays) => ipcRenderer.invoke(ipcChannels.copyLink, entryId, expiryDays),
  deleteEntry: (entryId) => ipcRenderer.invoke(ipcChannels.deleteEntry, entryId)
};

contextBridge.exposeInMainWorld('shareclip', api);
