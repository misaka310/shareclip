import { contextBridge, ipcRenderer } from 'electron';
import { ipcChannels, type ShareClipApi } from './ipc';

const api: ShareClipApi = {
  getState: () => ipcRenderer.invoke(ipcChannels.getState),
  saveConfig: (config) => ipcRenderer.invoke(ipcChannels.saveConfig, config),
  chooseFile: () => ipcRenderer.invoke(ipcChannels.chooseFile),
  uploadFile: (input) => ipcRenderer.invoke(ipcChannels.uploadFile, input),
  copyLink: (entryId, expiryDays) => ipcRenderer.invoke(ipcChannels.copyLink, entryId, expiryDays),
  deleteEntry: (entryId) => ipcRenderer.invoke(ipcChannels.deleteEntry, entryId)
};

contextBridge.exposeInMainWorld('shareclip', api);
