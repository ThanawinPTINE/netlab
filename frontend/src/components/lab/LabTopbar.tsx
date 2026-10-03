import AuthNav from '../AuthNav';
import ThemeToggle from '../ThemeToggle';

export interface LabTopbarProps {
  labNumberBadge: string;
  breadcrumbChapter: string;
  aiOnline: boolean;
  aiStatusText: string;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
}

/** Topbar shared by every lab page: breadcrumb, AI status pill, auth, theme,
 * and the two mobile panel toggles. Styling comes from the page's own CSS. */
export default function LabTopbar({ labNumberBadge, breadcrumbChapter, aiOnline, aiStatusText, onToggleSidebar, onToggleChat }: LabTopbarProps) {
  return (
    <header className="topbar">
      <button className="mobile-toggle" onClick={onToggleSidebar} title="Steps">
        {'☰'}
      </button>
      <a className="brand" href="/index.html">
        NET<span>Lab</span>
      </a>
      <span className="crumb-sep">{'›'}</span>
      <a className="crumb" href="/labs.html">
        Lab
      </a>
      <span className="crumb-sep">{'›'}</span>
      <a className="crumb" href="/course.html">
        Network Eng. Lab I
      </a>
      <span className="crumb-sep">{'›'}</span>
      <span className="chapter-badge">{labNumberBadge}</span>
      <span className="crumb current">{breadcrumbChapter}</span>
      <div className={'ai-pill ' + (aiOnline ? 'ai-on' : 'ai-off')}>
        <div className={'ai-dot' + (aiOnline ? ' pulse' : '')} />
        <span>{aiStatusText}</span>
      </div>
      <div className="lab-topbar-right">
        <AuthNav />
        <ThemeToggle />
        <button className="mobile-toggle" onClick={onToggleChat} title="AI Tutor">
          {'💬'}
        </button>
      </div>
    </header>
  );
}
