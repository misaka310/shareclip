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
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Storage settings</h2>
        </div>
        <span className="source-chip">Source: {sourceLabel}</span>
      </div>

      <div className="settings-grid">
        <label>
          Endpoint
          <input value={form.endpoint} onChange={(event) => updateField('endpoint', event.target.value)} />
        </label>
        <label>
          Region
          <input value={form.region} onChange={(event) => updateField('region', event.target.value)} />
        </label>
        <label>
          Bucket
          <input value={form.bucket} onChange={(event) => updateField('bucket', event.target.value)} />
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
          <input value={form.keyPrefix} onChange={(event) => updateField('keyPrefix', event.target.value)} />
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

      <div className="actions">
        <button className="button" type="button" onClick={() => onSave(form)} disabled={busy}>
          {busy ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </section>
  );
}
