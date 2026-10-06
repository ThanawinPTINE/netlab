import type { Step } from '../../types/configLab';

export interface SidebarProps {
  steps: Step[];
  stepsDone: number[];
  currentStep: number;
  mobileOpen: boolean;
}

export default function Sidebar({ steps, stepsDone, currentStep, mobileOpen }: SidebarProps) {
  const pct = Math.round((stepsDone.length / steps.length) * 100);
  let lastRouter = '';

  return (
    <nav className={'sidebar' + (mobileOpen ? ' mobile-open' : '')} id="sidebarPanel" aria-label="ขั้นตอนของแลป">
      <div className="sb-section">
        {steps.map((s, i) => {
          const showLabel = s.router !== lastRouter;
          lastRouter = s.router;
          const done = stepsDone.indexOf(s.id) >= 0;
          const cur = i === currentStep - 1;
          return (
            <div key={s.id}>
              {showLabel && <div className="sb-label">{s.router}</div>}
              <div className={'step-item' + (done ? ' done' : '') + (cur ? ' active' : '')}>
                <div className={'step-num ' + (done ? 'sn-done' : cur ? 'sn-active' : 'sn-next')}>{done ? '✓' : i + 1}</div>
                <div className="step-info">
                  <div className="step-title">{s.name}</div>
                  <div className="step-sub">{s.prompt}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="progress-wrap">
        <div className="prog-label">
          <span>ความคืบหน้า</span>
          <span>{pct}%</span>
        </div>
        <div className="prog-bar">
          <div className="prog-fill" style={{ width: pct + '%' }} />
        </div>
      </div>
    </nav>
  );
}
