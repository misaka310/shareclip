import { useEffect, useState } from 'react';
import { defaultConfig } from '../shared/config';
import type { ConfigLoadResult, ExpiryDays, HistoryEntry, ShareClipConfig, UploadInput } from '../shared/types';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsStatus } from './components/SettingsStatus';
import { ShareLinkCard } from './components/ShareLinkCard';
import { Sidebar } from './components/Sidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBanner } from './components/StatusBanner';
import { UploadPanel } from './components/UploadPanel';

const sourceLabels: Record<ConfigLoadResult['source'], string> = {
  default: 'Built-in defaults',
  file: 'Local JSON file',
  saved: 'Saved in app data'
};

export default function App() {
  const [config, setConfig] = useState<ShareClipConfig>(defaultConfig);
  const [configSource, setConfigSource] = useState<ConfigLoadResult['source']>('default');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [file, setFile] = useState<UploadInput | null>(null);
  const [expiryDays, setExpiryDays] = useState<ExpiryDays>(1);
  const [activeSection, setActiveSection] = useState<'upload' | 'history' | 'settings'>('upload');
  const [latestShared, setLatestShared] = useState<HistoryEntry | null>(null);
  const [status, setStatus] = useState<{ tone: 'idle' | 'success' | 'error'; message: string }>({
    tone: 'idle',
    message: 'Oracle Object Storage の設定を読み込んで、ファイル共有を開始します。'
  });
  const [uploadBusy, setUploadBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [historyBusyId, setHistoryBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const state = await window.shareclip.getState();
        setConfig(state.config.config);
        setConfigSource(state.config.source);
        setHistory(state.history);
        setLatestShared(state.history[0] ?? null);
      } catch (error) {
        setStatus({
          tone: 'error',
          message: error instanceof Error ? error.message : 'Failed to load app state.'
        });
      }
    })();
  }, []);

  const pickFile = async () => {
    const selected = await window.shareclip.chooseFile();
    if (!selected) {
      return;
    }

    setFile({
      ...selected,
      expiryDays
    });
    setStatus({ tone: 'idle', message: `${selected.fileName} is ready. Upload will also copy the link.` });
  };

  const prepareDroppedFile = (selected: UploadInput) => {
    setFile({
      ...selected,
      expiryDays
    });
    setActiveSection('upload');
    setStatus({ tone: 'idle', message: `${selected.fileName} was added from drag and drop.` });
  };

  const uploadFile = async () => {
    if (!file) {
      return;
    }

    setUploadBusy(true);
    try {
      const uploaded = await window.shareclip.uploadFile({
        ...file,
        expiryDays
      });
      setHistory((current) => [uploaded, ...current.filter((entry) => entry.id !== uploaded.id)]);
      setLatestShared(uploaded);
      setFile(null);
      setActiveSection('history');
      setStatus({
        tone: 'success',
        message: `${uploaded.fileName} uploaded. Signed link copied to clipboard.`
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Upload failed.'
      });
    } finally {
      setUploadBusy(false);
    }
  };

  const saveConfig = async (nextConfig: ShareClipConfig) => {
    setSettingsBusy(true);
    try {
      const result = await window.shareclip.saveConfig(nextConfig);
      setConfig(result.config);
      setConfigSource(result.source);
      setStatus({ tone: 'success', message: 'Settings saved locally.' });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Failed to save settings.'
      });
    } finally {
      setSettingsBusy(false);
    }
  };

  const copyLink = async (entryId: string, nextExpiry: ExpiryDays) => {
    setHistoryBusyId(entryId);
    try {
      const updated = await window.shareclip.copyLink(entryId, nextExpiry);
      setHistory((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setLatestShared(updated);
      setStatus({
        tone: 'success',
        message: `${updated.fileName} link refreshed for ${nextExpiry} day${nextExpiry > 1 ? 's' : ''} and copied.`
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Failed to copy a new link.'
      });
    } finally {
      setHistoryBusyId(null);
    }
  };

  const deleteEntry = async (entryId: string) => {
    setHistoryBusyId(entryId);
    try {
      const nextHistory = await window.shareclip.deleteEntry(entryId);
      setHistory(nextHistory);
      setStatus({
        tone: 'success',
        message: 'Remote object deleted and history updated.'
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete history entry.'
      });
    } finally {
      setHistoryBusyId(null);
    }
  };

  return (
    <main className="app-shell">
      <Sidebar activeSection={activeSection} onSelect={setActiveSection} historyCount={history.length} />

      <section className="workspace">
        <section className="hero">
          <div>
            <p className="eyebrow">ShareClip</p>
            <h1>一時ファイル共有ツール</h1>
            <p className="hero__copy">
              ファイルをアップロードして、1日・3日・7日の直接ダウンロードリンクを生成します。
            </p>
          </div>
          <StatusBanner tone={status.tone} message={status.message} />
        </section>

        <section className="layout-grid">
          <div className="layout-stack">
            <UploadPanel
              file={file}
              expiryDays={expiryDays}
              busy={uploadBusy}
              onPick={pickFile}
              onUpload={uploadFile}
              onChangeExpiry={setExpiryDays}
              onDropFile={prepareDroppedFile}
            />
            <ShareLinkCard entry={latestShared} />
            <HistoryPanel entries={history} busyId={historyBusyId} onCopy={copyLink} onDelete={deleteEntry} />
          </div>
          <div className="layout-stack">
            <SettingsStatus config={config} sourceLabel={sourceLabels[configSource]} />
            <SettingsPanel
              initialConfig={config}
              sourceLabel={sourceLabels[configSource]}
              busy={settingsBusy}
              onSave={saveConfig}
            />
          </div>
        </section>
      </section>
    </main>
  );
}
