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

export function UploadPanel({ file, expiryDays, busy, onPick, onUpload, onChangeExpiry, onDropFile }: UploadPanelProps) {
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files[0] as ElectronFile | undefined;
    if (!dropped?.path) {
      return;
    }

    onDropFile({
      filePath: dropped.path,
      fileName: dropped.name,
      contentType: dropped.type || 'application/octet-stream',
      size: dropped.size,
      expiryDays
    });
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Temporary Upload</p>
          <h2>Upload a file and copy a signed link</h2>
        </div>
        <div className="pill-group">
          {expiryOptions.map((option) => (
            <button
              key={option}
              className={option === expiryDays ? 'pill pill--active' : 'pill'}
              type="button"
              onClick={() => onChangeExpiry(option)}
            >
              {option} day{option > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="drop-card" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
        <div>
          <strong>{file ? file.fileName : 'Drop a file here or choose one manually'}</strong>
          <p>
            {file
              ? `${Math.ceil(file.size / 1024)} KB ready for upload`
              : 'Drag a local file onto this card, then upload and copy the signed link.'}
          </p>
        </div>
        <div className="actions">
          <button className="button button--secondary" type="button" onClick={onPick} disabled={busy}>
            Choose file
          </button>
          <button className="button" type="button" onClick={onUpload} disabled={busy || !file}>
            {busy ? 'Uploading...' : 'Upload and copy link'}
          </button>
        </div>
      </div>
    </section>
  );
}
