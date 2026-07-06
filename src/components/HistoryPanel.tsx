import { expiryOptions, type ExpiryDays, type HistoryEntry } from '../../shared/types';

interface HistoryPanelProps {
  entries: HistoryEntry[];
  busyId: string | null;
  compact?: boolean;
  onCopy: (entryId: string, expiryDays: ExpiryDays) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
}

function formatSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.ceil(size / 1024)} KB`;
}

export function HistoryPanel({ entries, busyId, compact = false, onCopy, onDelete }: HistoryPanelProps) {
  const visibleEntries = compact ? entries.slice(0, 3) : entries;

  return (
    <section className="page-card history-section">
      <div className="section-heading section-heading--row">
        <div>
          <h2>{compact ? '最近のアップロード' : 'アップロード履歴'}</h2>
          <p>{entries.length === 0 ? 'まだアップロード履歴はありません。' : `${entries.length} 件の履歴があります。`}</p>
        </div>
      </div>

      {visibleEntries.length === 0 ? (
        <div className="empty-state">アップロードするとここに履歴が表示されます。</div>
      ) : (
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>ファイル名</th>
                <th>サイズ</th>
                <th>有効期限</th>
                <th>作成日時</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <div className="file-cell">
                      <span className="file-badge">□</span>
                      <strong>{entry.fileName}</strong>
                    </div>
                  </td>
                  <td>{formatSize(entry.size)}</td>
                  <td>{new Date(entry.signedUrlExpiresAt).toLocaleString()}</td>
                  <td>{new Date(entry.uploadedAt).toLocaleString()}</td>
                  <td>
                    <div className="history-actions">
                      {expiryOptions.map((expiry) => (
                        <button
                          key={expiry}
                          className="icon-button"
                          type="button"
                          onClick={() => onCopy(entry.id, expiry)}
                          disabled={busyId === entry.id}
                          title={`${expiry}日で再発行`}
                        >
                          {expiry}日
                        </button>
                      ))}
                      <button
                        className="icon-button icon-button--danger"
                        type="button"
                        onClick={() => onDelete(entry.id)}
                        disabled={busyId === entry.id}
                      >
                        削除
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
