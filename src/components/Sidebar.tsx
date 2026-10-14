interface SidebarProps {
  activeSection: 'upload' | 'history' | 'settings';
  historyCount: number;
  storageReady: boolean;
  onSelect: (section: 'upload' | 'history' | 'settings') => void;
}

const items = [
  { id: 'upload', label: 'アップロード', icon: '☁' },
  { id: 'history', label: '履歴', icon: '◷' },
  { id: 'settings', label: '設定', icon: '⚙' }
] as const;

export function Sidebar({ activeSection, historyCount, storageReady, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="brand-icon">↥</div>
        <strong>ShareClip</strong>
      </div>

      <nav className="sidebar__nav" aria-label="Primary">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activeSection === item.id ? 'sidebar__link sidebar__link--active' : 'sidebar__link'}
            onClick={() => onSelect(item.id)}
          >
            <span className="sidebar__icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__status">
        <div className={storageReady ? 'status-dot status-dot--ready' : 'status-dot'} />
        <div>
          <strong>Oracle Object Storage</strong>
          <span>{storageReady ? '接続準備OK' : '設定が必要'}</span>
          <small>{historyCount} 件の履歴</small>
        </div>
      </div>
    </aside>
  );
}
