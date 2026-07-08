import { validateConfig } from '../../shared/config';
import type { ShareClipConfig } from '../../shared/types';

interface SettingsStatusProps {
  config: ShareClipConfig;
  sourceLabel: string;
}

const errorLabels: Record<string, string> = {
  'Endpoint is required.': 'Endpoint を入力してください。',
  'Region is required.': 'Region を入力してください。',
  'Bucket is required.': 'Bucket を入力してください。',
  'Access key ID is required.': 'アクセスキーを入力してください。',
  'Secret access key is required.': '秘密キーを入力してください。',
  'Key prefix is required.': 'Key Prefix を入力してください。',
  'Signed URL seconds must be a positive number.': 'Signed URL Max Seconds は 1 以上にしてください。',
  'Signed URL seconds must be 604800 or less.': 'Signed URL Max Seconds は 604800 以下にしてください。',
  'Max file size MB must be a positive number.': 'Max File Size MB は 1 以上にしてください。'
};

function formatConfigError(error: string): string {
  return errorLabels[error] ?? error;
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
            <li key={error}>{formatConfigError(error)}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
