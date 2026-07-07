import { useEffect, useState } from 'react';
import type { ShareClipConfig } from '../../shared/types';

interface SettingsPanelProps {
  initialConfig: ShareClipConfig;
  sourceLabel: string;
  busy: boolean;
  onSave: (nextConfig: ShareClipConfig) => Promise<void>;
}

export function SettingsPanel({ initialConfig, sourceLabel, busy, onSave }: SettingsPanelProps) {
  const [form, setForm] = useState<ShareClipConfig>(initialConfig);

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
          <p>この画面に必要な値を入力して保存します。</p>
        </div>
        <span className="badge">{sourceLabel}</span>
      </div>

      <div className="settings-grid">
        <label>
          Endpoint
          <input placeholder="https://<namespace>.compat.objectstorage.<region>.oraclecloud.com" value={form.endpoint} onChange={(event) => updateField('endpoint', event.target.value)} />
        </label>
        <label>
          Region
          <input placeholder="ap-osaka-1" value={form.region} onChange={(event) => updateField('region', event.target.value)} />
        </label>
        <label>
          Bucket
          <input placeholder="shareclip" value={form.bucket} onChange={(event) => updateField('bucket', event.target.value)} />
        </label>
        <label>
          Access Key ID
          <input value={form.accessKeyId} onChange={(event) => updateField('accessKeyId', event.target.value)} />
        </label>
        <label>
          Secret Access Key
          <input
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

      <button className="button button--primary" type="button" onClick={() => onSave(form)} disabled={busy}>
        {busy ? '保存中...' : '設定を保存'}
      </button>
    </section>
  );
}
