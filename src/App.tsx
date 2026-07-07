import { useEffect, useMemo, useState } from 'react';
import { defaultConfig, validateConfig } from '../shared/config';
import type { ConfigLoadResult, ExpiryDays, HistoryEntry, ShareClipConfig, UploadInput } from '../shared/types';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsStatus } from './components/SettingsStatus';
import { ShareLinkCard } from './components/ShareLinkCard';
import { Sidebar } from './components/Sidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusBanner } from './components/StatusBanner';
import { UploadPanel } from './components/UploadPanel';

const sourceLabels: Record<ConfigLoadResult['source'], string> = {
  default: '初期値',
  file: 'ローカル設定ファイル',
  saved: 'アプリ保存設定'
};

function assertBridge() {
  if (!window.shareclip) {
    throw new Error('Electron preload が読み込めていません。アプリを再起動してください。');
  }
  return window.shareclip;
}

export default function App() {
  const [config, setConfig] = useState<ShareClipConfig>(defaultConfig);
  const [configSource, setConfigSource] = useState<ConfigLoadResult['source']>('default');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [file, setFile] = useState<UploadInput | null>(null);
  const [expiryDays, setExpiryDays] = useState<ExpiryDays>(7);
  const [activeSection, setActiveSection] = useState<'upload' | 'history' | 'settings'>('upload');
  const [latestShared, setLatestShared] = useState<HistoryEntry | null>(null);
  const [status, setStatus] = useState<{ tone: 'idle' | 'success' | 'error'; message: string }>({
    tone: 'idle',
    message: 'ファイルを選択してアップロードできます。'
  });
  const [uploadBusy, setUploadBusy] = useState(false);
  const [pickBusy, setPickBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [historyBusyId, setHistoryBusyId] = useState<string | null>(null);

  const storageReady = useMemo(() => validateConfig(config).length === 0, [config]);

  useEffect(() => {
    void (async () => {
      try {
        const api = assertBridge();
        const state = await api.getState();
        setConfig(state.config.config);
        setConfigSource(state.config.source);
        setHistory(state.history);
        setLatestShared(state.history[0] ?? null);
        setStatus({ tone: 'success', message: '設定と履歴を読み込みました。' });
      } catch (error) {
        setStatus({
          tone: 'error',
          message: error instanceof Error ? error.message : 'アプリ状態の読み込みに失敗しました。'
        });
      }
    })();
  }, []);

  const pickFile = async () => {
    if (pickBusy) return;

    setPickBusy(true);
    const selected = await assertBridge().chooseFile();
    if (!selected) { setPickBusy(false); return; };

    setFile({ ...selected, expiryDays });
    setStatus({ tone: 'idle', message: `${selected.fileName} を選択しました。` });
    setPickBusy(false);
  };

  const prepareDroppedFile = (selected: UploadInput) => {
    setFile({ ...selected, expiryDays });
    setActiveSection('upload');
    setStatus({ tone: 'idle', message: `${selected.fileName} を追加しました。` });
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploadBusy(true);
    try {
      const uploaded = await assertBridge().uploadFile({ ...file, expiryDays });
      setHistory((current) => [uploaded, ...current.filter((entry) => entry.id !== uploaded.id)]);
      setLatestShared(uploaded);
      setFile(null);
      setStatus({ tone: 'success', message: `${uploaded.fileName} をアップロードし、リンクをコピーしました。` });
    } catch (error) {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : 'アップロードに失敗しました。' });
    } finally {
      setUploadBusy(false);
    }
  };

  const saveConfig = async (nextConfig: ShareClipConfig) => {
    setSettingsBusy(true);
    try {
      const result = await assertBridge().saveConfig(nextConfig);
      setConfig(result.config);
      setConfigSource(result.source);
      setStatus({ tone: 'success', message: '設定を保存しました。' });
    } catch (error) {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '設定保存に失敗しました。' });
    } finally {
      setSettingsBusy(false);
    }
  };

  const copyCurrentLink = async (entryId: string) => {
    setHistoryBusyId(entryId);
    try {
      const copied = await assertBridge().copyCurrentLink(entryId);
      setLatestShared(copied);
      setStatus({ tone: 'success', message: 'リンクをコピーしました。' });
    } catch (error) {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : 'リンクのコピーに失敗しました。' });
    } finally {
      setHistoryBusyId(null);
    }
  };

  const copyLink = async (entryId: string, nextExpiry: ExpiryDays) => {
    setHistoryBusyId(entryId);
    try {
      const updated = await assertBridge().copyLink(entryId, nextExpiry);
      setHistory((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setLatestShared(updated);
      setStatus({ tone: 'success', message: `${nextExpiry}日リンクを再発行してコピーしました。` });
    } catch (error) {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : 'リンク再発行に失敗しました。' });
    } finally {
      setHistoryBusyId(null);
    }
  };

  const deleteEntry = async (entryId: string) => {
    setHistoryBusyId(entryId);
    try {
      const nextHistory = await assertBridge().deleteEntry(entryId);
      setHistory(nextHistory);
      setLatestShared((current) => (current?.id === entryId ? nextHistory[0] ?? null : current));
      setStatus({ tone: 'success', message: 'リモートファイルを削除し、履歴を更新しました。' });
    } catch (error) {
      setStatus({ tone: 'error', message: error instanceof Error ? error.message : '削除に失敗しました。' });
    } finally {
      setHistoryBusyId(null);
    }
  };

  return (
    <main className="app-shell">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        historyCount={history.length}
        storageReady={storageReady}
      />

      <section className="workspace">
        <StatusBanner tone={status.tone} message={status.message} />

        {activeSection === 'upload' ? (
          <>
            <UploadPanel
              file={file}
              expiryDays={expiryDays}
              busy={uploadBusy}
              onPick={pickFile}
              onUpload={uploadFile}
              onChangeExpiry={setExpiryDays}
              onDropFile={prepareDroppedFile}
            />
            <ShareLinkCard entry={latestShared} busy={historyBusyId === latestShared?.id} onCopyCurrent={copyCurrentLink} />
            <HistoryPanel entries={history} busyId={historyBusyId} compact onCopyCurrent={copyCurrentLink} onRegenerate={copyLink} onDelete={deleteEntry} />
          </>
        ) : null}

        {activeSection === 'history' ? (
          <HistoryPanel entries={history} busyId={historyBusyId} onCopyCurrent={copyCurrentLink} onRegenerate={copyLink} onDelete={deleteEntry} />
        ) : null}

        {activeSection === 'settings' ? (
          <>
            <SettingsStatus config={config} sourceLabel={sourceLabels[configSource]} />
            <SettingsPanel
              initialConfig={config}
              sourceLabel={sourceLabels[configSource]}
              busy={settingsBusy}
              onSave={saveConfig}
            />
          </>
        ) : null}
      </section>
    </main>
  );
}
