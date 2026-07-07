import path from 'node:path';
import { clipboard, app, BrowserWindow, dialog, ipcMain } from 'electron';
import { ipcChannels } from './ipc';
import { ConfigStore } from './services/configStore';
import { HistoryStore } from './services/historyStore';
import { ShareService, createS3Client, toSafeErrorMessage } from './services/shareService';
import { mergeWithExistingSecrets, toPublicConfigLoadResult, toPublicHistory, validateConfig } from '../shared/config';
import type { ExpiryDays, HistoryEntry, ShareClipConfig, UploadInput } from '../shared/types';

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1120,
    minHeight: 760,
    backgroundColor: '#0d1321',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await window.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
}

function assertConfig(config: ShareClipConfig): void {
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
}

app.whenReady().then(async () => {
  const userDataDir = app.getPath('userData');
  const localConfigPath = app.isPackaged
    ? path.join(process.resourcesPath, 'config', 'shareclip.config.local.json')
    : path.join(process.cwd(), 'config', 'shareclip.config.local.json');

  const configStore = new ConfigStore(path.join(userDataDir, 'shareclip.config.json'), localConfigPath);
  const historyStore = new HistoryStore(path.join(userDataDir, 'shareclip.history.json'));
  let isFileDialogOpen = false;
  const shareService = new ShareService({
    historyStore,
    createClient: createS3Client,
    signUrl: async (...args) => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      return getSignedUrl(...args);
    }
  });

  ipcMain.handle(ipcChannels.getState, async () => {
    const configResult = await configStore.load();
    return {
      config: toPublicConfigLoadResult(configResult),
      history: toPublicHistory(await historyStore.list(), configResult.config)
    };
  });

  ipcMain.handle(ipcChannels.saveConfig, async (_event, config: ShareClipConfig) => {
    const existing = (await configStore.load()).config;
    const mergedConfig = mergeWithExistingSecrets(existing, config);
    assertConfig(mergedConfig);
    return toPublicConfigLoadResult(await configStore.save(mergedConfig));
  });

  ipcMain.handle(ipcChannels.chooseFile, async () => {
    if (isFileDialogOpen) {
      return null;
    }

    isFileDialogOpen = true;
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      const filePath = result.filePaths[0]!;
      const { size } = await import('node:fs/promises').then((fs) => fs.stat(filePath));

      return {
        filePath,
        fileName: path.basename(filePath),
        contentType: 'application/octet-stream',
        size,
        expiryDays: 1 as ExpiryDays
      } satisfies UploadInput;
    } finally {
      isFileDialogOpen = false;
    }
  });

  ipcMain.handle(ipcChannels.uploadFile, async (_event, input: UploadInput) => {
    const config = (await configStore.load()).config;
    try {
      const entry = await shareService.upload(config, input);
      clipboard.writeText(entry.signedUrl);
      return toPublicHistory([entry], config)[0];
    } catch (error) {
      throw new Error(toSafeErrorMessage(error, config));
    }
  });

  ipcMain.handle(ipcChannels.copyCurrentLink, async (_event, entryId: string) => {
    const config = (await configStore.load()).config;
    const history = await historyStore.list();
    const entry = history.find((item) => item.id === entryId);
    if (!entry) {
      throw new Error('履歴が見つかりません。');
    }

    clipboard.writeText(entry.signedUrl);
    return toPublicHistory([entry], config)[0];
  });

  ipcMain.handle(ipcChannels.copyLink, async (_event, entryId: string, expiryDays: ExpiryDays) => {
    const config = (await configStore.load()).config;
    const history = await historyStore.list();
    const entry = history.find((item) => item.id === entryId);
    if (!entry) {
      throw new Error('History entry not found.');
    }

    try {
      const nextEntry = await shareService.regenerateLink(config, entry, expiryDays);
      clipboard.writeText(nextEntry.signedUrl);
      return toPublicHistory([nextEntry], config)[0];
    } catch (error) {
      throw new Error(toSafeErrorMessage(error, config));
    }
  });

  ipcMain.handle(ipcChannels.deleteEntry, async (_event, entryId: string) => {
    const config = (await configStore.load()).config;
    const history = await historyStore.list();
    const entry = history.find((item) => item.id === entryId);
    if (!entry) {
      return toPublicHistory(history, config);
    }

    try {
      await shareService.deleteRemote(config, entry);
      return toPublicHistory(await historyStore.remove(entryId), config);
    } catch (error) {
      throw new Error(toSafeErrorMessage(error, config));
    }
  });

  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
