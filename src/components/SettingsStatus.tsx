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
    <section className="page-card settings-status">
      <div className="section-heading section-heading--row">
        <div>
          <h2>{ready ? '接続準備OK' : '設定が必要です'}</h2>
          <p>設定元: {sourceLabel}</p>
        </div>
        <span className={ready ? 'badge badge--success' : 'badge badge--warning'}>{ready ? 'OK' : `${errors.length}件`}</span>
      </div>

      <div className="status-list">
        <div className="status-row">
          <span>Bucket</span>
          <strong>{config.bucket || '未設定'}</strong>
        </div>
        <div className="status-row">
          <span>Endpoint</span>
          <strong>{config.endpoint || '未設定'}</strong>
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
