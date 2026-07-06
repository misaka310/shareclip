import { expiryOptions, type ExpiryDays, type HistoryEntry } from '../../shared/types';

interface HistoryPanelProps {
  entries: HistoryEntry[];
  busyId: string | null;
  onCopy: (entryId: string, expiryDays: ExpiryDays) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
}

export function HistoryPanel({ entries, busyId, onCopy, onDelete }: HistoryPanelProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">History</p>
          <h2>Uploaded files</h2>
        </div>
        <span className="source-chip">{entries.length} item{entries.length === 1 ? '' : 's'}</span>
      </div>

      {entries.length === 0 ? (
        <div className="history-empty">No uploads yet. Your signed links will show up here.</div>
      ) : (
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Object key</th>
                <th>Uploaded</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <strong>{entry.fileName}</strong>
                    <span>{Math.ceil(entry.size / 1024)} KB</span>
                  </td>
                  <td>{entry.objectKey}</td>
                  <td>{new Date(entry.uploadedAt).toLocaleString()}</td>
                  <td>{new Date(entry.signedUrlExpiresAt).toLocaleString()}</td>
                  <td>
                    <div className="history-actions">
                      {expiryOptions.map((expiry) => (
                        <button
                          key={expiry}
                          className={entry.expiryDays === expiry ? 'pill pill--active' : 'pill'}
                          type="button"
                          onClick={() => onCopy(entry.id, expiry)}
                          disabled={busyId === entry.id}
                        >
                          {expiry}d
                        </button>
                      ))}
                      <button
                        className="button button--ghost"
                        type="button"
                        onClick={() => onDelete(entry.id)}
                        disabled={busyId === entry.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
