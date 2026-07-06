import { expiryOptions, type ExpiryDays, type UploadInput } from '../../shared/types';

interface UploadPanelProps {
  file: UploadInput | null;
  expiryDays: ExpiryDays;
  busy: boolean;
  onPick: () => Promise<void>;
  onUpload: () => Promise<void>;
  onChangeExpiry: (value: ExpiryDays) => void;
  onDropFile: (file: UploadInput) => void;
}

type ElectronFile = File & { path?: string };

function formatSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.ceil(size / 1024)} KB`;
}

export function UploadPanel({ file, expiryDays, busy, onPick, onUpload, onChangeExpiry, onDropFile }: UploadPanelProps) {
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files[0] as ElectronFile | undefined;
    if (!dropped?.path) return;

    onDropFile({
      filePath: dropped.path,
      fileName: dropped.name,
      contentType: dropped.type || 'application/octet-stream',
      size: dropped.size,
      expiryDays
    });
  };

  return (
    <section className="page-card upload-page">
      <div className="section-heading">
        <h1>アップロード</h1>
        <p>ファイルを一時的に共有するためのリンクを生成します。</p>
      </div>

      <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
        <div className="upload-cloud">↑</div>
        <strong>ファイルをドラッグ&ドロップ</strong>
        <span>または</span>
        <button className="button button--secondary" type="button" onClick={onPick} disabled={busy}>
          ファイルを選択
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
          <button className="segment segment--disabled" type="button" disabled title="S3互換の署名付きURLは最大7日です">
            30日
          </button>
        </div>
      </div>

      <button className="button button--primary button--wide" type="button" onClick={onUpload} disabled={busy || !file}>
        {busy ? 'アップロード中...' : 'アップロードしてリンク生成'}
      </button>
    </section>
  );
}
