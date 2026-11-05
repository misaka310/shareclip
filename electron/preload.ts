import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { ipcChannels as IpcChannels, ShareClipApi } from './ipc';

// The sandboxed preload can only require Electron's own modules, so the channel
// map cannot be imported at runtime. `satisfies` makes the compiler reject any
// key or channel name that drifts from the single definition in ipc.ts.
const ipcChannels = {
  getState: 'shareclip:get-state',
  saveConfig: 'shareclip:save-config',
  testConnection: 'shareclip:test-connection',
  uploadFile: 'shareclip:upload-file',
  chooseFile: 'shareclip:choose-file',
  copyCurrentLink: 'shareclip:copy-current-link',
  copyLink: 'shareclip:copy-link',
  deleteEntry: 'shareclip:delete-entry'
} as const satisfies typeof IpcChannels;

const api: ShareClipApi = {
  getState: () => ipcRenderer.invoke(ipcChannels.getState),
  saveConfig: (config) => ipcRenderer.invoke(ipcChannels.saveConfig, config),
  testConnection: (config) => ipcRenderer.invoke(ipcChannels.testConnection, config),
  chooseFile: () => ipcRenderer.invoke(ipcChannels.chooseFile),
  resolveDroppedFile: (file, expiryDays) => {
    const filePath = webUtils.getPathForFile(file);
    if (!filePath) return null;
    return {
      filePath,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
      expiryDays
    };
  },
  uploadFile: (input) => ipcRenderer.invoke(ipcChannels.uploadFile, input),
  copyCurrentLink: (entryId) => ipcRenderer.invoke(ipcChannels.copyCurrentLink, entryId),
  copyLink: (entryId, expiryDays) => ipcRenderer.invoke(ipcChannels.copyLink, entryId, expiryDays),
  deleteEntry: (entryId) => ipcRenderer.invoke(ipcChannels.deleteEntry, entryId)
};

contextBridge.exposeInMainWorld('shareclip', api);
