import { forwardRef, useEffect, useRef } from 'react';

export interface TermLine {
  text: string;
  cls?: string;
}

export interface HintBoxState {
  show: boolean;
  title: string;
  text: string;
  showAnswerBtn: boolean;
}

export interface TerminalProps {
  lines: TermLine[];
  prompt: string;
  disabled: boolean;
  hint: HintBoxState;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onShowAnswer: () => void;
}

const Terminal = forwardRef<HTMLInputElement, TerminalProps>(function Terminal({ lines, prompt, disabled, hint, onKeyDown, onShowAnswer }, ref) {
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = 999999;
  }, [lines]);

  return (
    <div className="terminal-wrap">
      <div className="terminal" ref={termRef}>
        {lines.map((l, i) => (
          <div key={i} className={'t-line' + (l.cls ? ' ' + l.cls : '')}>
            {l.text}
          </div>
        ))}
      </div>
      <div className="t-input-row">
        <span className="t-prompt">{prompt}</span>
        <input
          ref={ref}
          className="t-input"
          autoComplete="off"
          spellCheck={false}
          placeholder="พิมพ์ Cisco IOS command..."
          disabled={disabled}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className={'hint-box' + (hint.show ? ' show' : '')}>
        <div className="hint-title">{hint.title}</div>
        <div className="hint-text">{hint.text}</div>
        <button className={'hint-answer-btn' + (hint.showAnswerBtn ? ' show' : '')} onClick={onShowAnswer}>
          แสดงเฉลย (ผิด 4 ครั้ง)
        </button>
      </div>
    </div>
  );
});

export default Terminal;
