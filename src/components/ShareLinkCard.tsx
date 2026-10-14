import type { HistoryEntry } from '../../shared/types';

interface ShareLinkCardProps {
  entry: HistoryEntry | null;
  busy: boolean;
  copied: boolean;
  onCopyCurrent: (entryId: string) => Promise<void>;
}

export function ShareLinkCard({ entry, busy, copied, onCopyCurrent }: ShareLinkCardProps) {
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
        <input value={entry.signedUrl} readOnly aria-label="共有リンク" data-testid="share-link-input" />
        <button className={copied ? 'button button--secondary button--copied' : 'button button--secondary'} type="button" onClick={() => onCopyCurrent(entry.id)} disabled={busy}>
          <span aria-live="polite">{copied ? 'コピーしました' : 'コピー'}</span>
        </button>
      </div>
    </section>
  );
}
