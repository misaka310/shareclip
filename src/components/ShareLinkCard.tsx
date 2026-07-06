import type { HistoryEntry } from '../../shared/types';

interface ShareLinkCardProps {
  entry: HistoryEntry | null;
}

export function ShareLinkCard({ entry }: ShareLinkCardProps) {
  if (!entry) return null;

  return (
    <section className="page-card share-result">
      <div className="result-heading">
        <div className="check-icon">✓</div>
        <div>
          <h2>共有リンク</h2>
          <p>有効期限: {new Date(entry.signedUrlExpiresAt).toLocaleString()}</p>
        </div>
      </div>
      <div className="link-row">
        <input value={entry.signedUrl} readOnly aria-label="共有リンク" />
        <button className="button button--secondary" type="button">
          コピー済み
        </button>
      </div>
    </section>
  );
}
