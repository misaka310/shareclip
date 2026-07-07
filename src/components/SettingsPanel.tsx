import { useEffect, useMemo, useState } from 'react';
import { validateConfig } from '../../shared/config';
import type { ShareClipConfig } from '../../shared/types';

interface SettingsPanelProps {
  initialConfig: ShareClipConfig;
  sourceLabel: string;
  busy: boolean;
  onSave: (nextConfig: ShareClipConfig) => Promise<void>;
}

function formatConfigError(error: string): string {
  switch (error) {
    case 'Endpoint is required.':
      return 'Endpoint を入力してください。';
    case 'Region is required.':
      return 'Region を入力してください。';
    case 'Bucket is required.':
      return 'Bucket を入力してください。';
    case 'Access key ID is required.':
      return 'Access Key ID を入力してください。';
    case 'Secret access key is required.':
      return 'Secret Access Key を入力してください。';
    case 'Key prefix is required.':
      return 'Key Prefix を入力してください。';
    case 'Signed URL seconds must be a positive number.':
      return 'Signed URL Max Seconds は 1 以上にしてください。';
    case 'Signed URL seconds must be 604800 or less.':
      return 'Signed URL Max Seconds は 604800 以下にしてください。';
    case 'Max file size MB must be a positive number.':
      return 'Max File Size MB は 1 以上にしてください。';
    default:
      return error;
  }
}

export function SettingsPanel({ initialConfig, sourceLabel, busy, onSave }: SettingsPanelProps) {
  const [form, setForm] = useState<ShareClipConfig>(initialConfig);
  const errors = useMemo(() => validateConfig(form), [form]);
  const hasErrors = errors.length > 0;

  useEffect(() => {
    setForm(initialConfig);
  }, [initialConfig]);

  const updateField = <K extends keyof ShareClipConfig>(key: K, value: ShareClipConfig[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="page-card settings-panel">
      <div className="section-heading section-heading--row">
        <div>
          <h2>設定</h2>
          <p>OCI の値を入力して保存します。JSON ファイルの手編集は不要です。</p>
        </div>
        <span className={hasErrors ? 'badge badge--warning' : 'badge badge--success'}>{hasErrors ? '未完了' : sourceLabel}</span>
      </div>

      {hasErrors ? (
        <div className="inline-warning" role="alert">
          <strong>入力が必要な項目があります。</strong>
          <ul className="inline-errors">
            {errors.map((error) => (
              <li key={error}>{formatConfigError(error)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="settings-grid">
        <label>
          Endpoint
          <input
            aria-invalid={!form.endpoint.trim()}
            placeholder="https://<namespace>.compat.objectstorage.<region>.oraclecloud.com"
            value={form.endpoint}
            onChange={(event) => updateField('endpoint', event.target.value)}
          />
        </label>
        <label>
          Region
          <input
            aria-invalid={!form.region.trim()}
            placeholder="ap-osaka-1"
            value={form.region}
            onChange={(event) => updateField('region', event.target.value)}
          />
        </label>
        <label>
          Bucket
          <input
            aria-invalid={!form.bucket.trim()}
            placeholder="shareclip"
            value={form.bucket}
            onChange={(event) => updateField('bucket', event.target.value)}
          />
        </label>
        <label>
          Access Key ID
          <input
            aria-invalid={!form.accessKeyId.trim()}
            placeholder="Customer Secret Key のアクセスキー"
            value={form.accessKeyId}
            onChange={(event) => updateField('accessKeyId', event.target.value)}
          />
        </label>
        <label>
          Secret Access Key
          <input
            aria-invalid={!form.secretAccessKey.trim()}
            placeholder="Customer Secret Key の秘密キー"
            type="password"
            value={form.secretAccessKey}
            onChange={(event) => updateField('secretAccessKey', event.target.value)}
          />
        </label>
        <label>
          Key Prefix
          <input placeholder="shareclip/" value={form.keyPrefix} onChange={(event) => updateField('keyPrefix', event.target.value)} />
        </label>
        <label>
          Signed URL Max Seconds
          <input
            type="number"
            min={1}
            max={604800}
            value={form.signedUrlBaseSeconds}
            onChange={(event) => updateField('signedUrlBaseSeconds', Number(event.target.value))}
          />
        </label>
        <label>
          Max File Size MB
          <input
            type="number"
            min={1}
            value={form.maxFileSizeMB}
            onChange={(event) => updateField('maxFileSizeMB', Number(event.target.value))}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.forcePathStyle}
            onChange={(event) => updateField('forcePathStyle', event.target.checked)}
          />
          Force path-style URLs
        </label>
      </div>

      <button className="button button--primary" type="button" onClick={() => onSave(form)} disabled={busy || hasErrors}>
        {busy ? '保存中...' : hasErrors ? '未入力があります' : '設定を保存'}
      </button>
    </section>
  );
}
