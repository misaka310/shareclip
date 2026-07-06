interface SidebarProps {
  activeSection: 'upload' | 'history' | 'settings';
  historyCount: number;
  onSelect: (section: 'upload' | 'history' | 'settings') => void;
}

export function Sidebar({ activeSection, historyCount, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <p className="eyebrow">Navigation</p>
        <strong>ShareClip</strong>
        <span>Desktop uploader</span>
      </div>

      <nav className="sidebar__nav" aria-label="Primary">
        <button
          type="button"
          className={activeSection === 'upload' ? 'sidebar__link sidebar__link--active' : 'sidebar__link'}
          onClick={() => onSelect('upload')}
        >
          Upload
        </button>
        <button
          type="button"
          className={activeSection === 'history' ? 'sidebar__link sidebar__link--active' : 'sidebar__link'}
          onClick={() => onSelect('history')}
        >
          History
        </button>
        <button
          type="button"
          className={activeSection === 'settings' ? 'sidebar__link sidebar__link--active' : 'sidebar__link'}
          onClick={() => onSelect('settings')}
        >
          Settings
        </button>
      </nav>

      <div className="sidebar__meta">
        <span className="source-chip">{historyCount} history item{historyCount === 1 ? '' : 's'}</span>
      </div>
    </aside>
  );
}
