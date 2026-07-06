import type { HistoryEntry } from '../../shared/types';

interface ShareLinkCardProps {
  entry: HistoryEntry | null;
}

export function ShareLinkCard({ entry }: ShareLinkCardProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Share Link</p>
          <h2>Latest link copied to clipboard</h2>
        </div>
      </div>

      {entry ? (
        <div className="share-card">
          <div className="share-card__meta">
            <strong>{entry.fileName}</strong>
            <span>Expires {new Date(entry.signedUrlExpiresAt).toLocaleString()}</span>
          </div>
          <p className="share-card__hint">Full URL was copied by the app. This preview masks credential-like query values.</p>
          <code className="share-card__url">{entry.signedUrl}</code>
        </div>
      ) : (
        <div className="history-empty">Upload a file or refresh a history row to surface the current signed link here.</div>
      )}
    </section>
  );
}
