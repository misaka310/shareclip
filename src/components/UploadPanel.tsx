import { expiryOptions, type ExpiryDays, type UploadInput } from '../../shared/types';

interface UploadPanelProps {
  file: UploadInput | null;
  expiryDays: ExpiryDays;
  busy: boolean;
  storageReady: boolean;
  onPick: () => Promise<void>;
  onUpload: () => Promise<void>;
  onChangeExpiry: (value: ExpiryDays) => void;
  onDropFile: (file: UploadInput) => void;
  onOpenSettings: () => void;
}

function formatSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.ceil(size / 1024)} KB`;
}

export function UploadPanel({
  file,
  expiryDays,
  busy,
  storageReady,
  onPick,
  onUpload,
  onChangeExpiry,
  onDropFile,
  onOpenSettings
}: UploadPanelProps) {
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files[0];
    if (!dropped) return;

    const resolved = window.shareclip?.resolveDroppedFile(dropped, expiryDays);
    if (resolved) {
      onDropFile(resolved);
    }
  };

  return (
    <section className="page-card upload-page">
      <div className="section-heading">
        <h1>アップロード</h1>
        <p>ファイルを一時的に共有するためのリンクを生成します。</p>
      </div>

      {!storageReady ? (
        <div className="inline-warning upload-warning" role="alert">
          <strong>先に設定を完了してください。</strong>
          <span>OCI の Endpoint / Bucket / Customer Secret Key を保存するとアップロードできます。</span>
          <button className="button button--secondary" type="button" onClick={onOpenSettings} disabled={busy}>
            設定を開く
          </button>
        </div>
      ) : null}

      <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
        <div className="upload-cloud">↑</div>
        <strong>ファイルをドラッグ&ドロップ</strong>
        <span>または</span>
        <button className="button button--secondary" type="button" onClick={onPick} disabled={busy}>
          {'ファイルを選択'}
        </button>
      </div>

      {file ? (
        <div className="selected-file">
          <div className="file-icon">□</div>
          <div>
            <strong>{file.fileName}</strong>
            <span>{formatSize(file.size)}</span>
          </div>
          <button className="icon-button" type="button" onClick={onPick} disabled={busy} aria-label="ファイルを変更">
            変更
          </button>
        </div>
      ) : null}

      <div className="form-block">
        <strong>有効期限</strong>
        <div className="segmented-control">
          {expiryOptions.map((option) => (
            <button
              key={option}
              className={option === expiryDays ? 'segment segment--active' : 'segment'}
              type="button"
              onClick={() => onChangeExpiry(option)}
              disabled={busy}
            >
              {option}日
            </button>
          ))}
        </div>
      </div>

      <button className="button button--primary button--wide" type="button" onClick={onUpload} disabled={busy || !file || !storageReady}>
        {busy ? '処理中...' : storageReady ? 'アップロードしてリンク生成' : '設定完了後にアップロードできます'}
      </button>
    </section>
  );
}
