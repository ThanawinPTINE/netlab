import type { HintEntry, Step } from '../../types/configLab';

export interface ChecklistProps {
  steps: Step[];
  stepsDone: number[];
  currentStep: number;
  currentHint: HintEntry;
}

export default function Checklist({ steps, stepsDone, currentStep, currentHint }: ChecklistProps) {
  return (
    <div className="checklist">
      <div className="steps-row">
        {steps.map((s, i) => {
          const done = stepsDone.indexOf(s.id) >= 0;
          const cur = i === currentStep - 1;
          return (
            <span key={s.id} style={{ display: 'contents' }}>
              {i > 0 && <span className="sep">{'›'}</span>}
              <div className={'step-pill ' + (done ? 'pill-done' : cur ? 'pill-cur' : 'pill-next')}>
                {(done ? '✓ ' : cur ? '● ' : '') + s.short}
              </div>
            </span>
          );
        })}
      </div>
      <div className="cmd-hint-box">
        <div className="cmd-hint-cmd">สิ่งที่ต้องทำตอนนี้</div>
        <div className="cmd-hint-desc">{currentHint.desc}</div>
      </div>
    </div>
  );
}
