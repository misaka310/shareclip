interface StatusBannerProps {
  tone: 'idle' | 'success' | 'error';
  message: string;
}

export function StatusBanner({ tone, message }: StatusBannerProps) {
  return (
    <div className={`status-banner status-banner--${tone}`} role="status">
      {message}
    </div>
  );
}
