import { validateConfig } from '../../shared/config';
import type { ShareClipConfig } from '../../shared/types';

interface SettingsStatusProps {
  config: ShareClipConfig;
  sourceLabel: string;
}

export function SettingsStatus({ config, sourceLabel }: SettingsStatusProps) {
  const errors = validateConfig(config);
  const ready = errors.length === 0;

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Settings Status</p>
          <h2>{ready ? 'Ready to upload' : 'Configuration required'}</h2>
        </div>
        <span className={ready ? 'source-chip source-chip--success' : 'source-chip source-chip--warning'}>
          {ready ? 'Ready' : `${errors.length} issue${errors.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="status-list">
        <div className="status-row">
          <span>Source</span>
          <strong>{sourceLabel}</strong>
        </div>
        <div className="status-row">
          <span>Bucket</span>
          <strong>{config.bucket || 'Not set'}</strong>
        </div>
        <div className="status-row">
          <span>Endpoint</span>
          <strong>{config.endpoint || 'Not set'}</strong>
        </div>
      </div>

      {errors.length > 0 ? (
        <ul className="inline-errors">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
