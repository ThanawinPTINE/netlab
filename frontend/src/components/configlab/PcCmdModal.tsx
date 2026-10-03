import { forwardRef, useEffect, useRef } from 'react';
import type { TermLine } from './Terminal';

export interface PcCmdModalProps {
  open: boolean;
  pcId: string | null;
  sub: string;
  screen: TermLine[];
  onClose: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const PcCmdModal = forwardRef<HTMLInputElement, PcCmdModalProps>(function PcCmdModal({ open, pcId, sub, screen, onClose, onKeyDown }, ref) {
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = screenRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [screen]);

  return (
    <div
      className={'pc-modal-backdrop' + (open ? ' show' : '')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pc-modal pc-cmd-modal" role="dialog" aria-labelledby="pcCmdTitle">
        <div className="pc-modal-title" id="pcCmdTitle">
          {pcId ? `${pcId} — Command Prompt` : 'Command Prompt'}
        </div>
        <div className="pc-modal-sub">{sub}</div>
        <div className="pc-cmd-screen" ref={screenRef}>
          {screen.length === 0 ? (
            'Microsoft Windows [Version 10.0.19045.3803]\n(c) Microsoft Corporation. All rights reserved.\n'
          ) : (
            screen.map((l, i) => (
              <span key={i} className={l.cls}>
                {l.text + '\n'}
              </span>
            ))
          )}
        </div>
        <div className="pc-cmd-inputrow">
          <span className="pc-cmd-prompt">{'C:\\Users\\Student>'}</span>
          <input ref={ref} className="pc-cmd-input" autoComplete="off" spellCheck={false} onKeyDown={onKeyDown} />
        </div>
        <div className="pc-modal-actions">
          <button className="btn-skip2" onClick={onClose}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
});

export default PcCmdModal;
