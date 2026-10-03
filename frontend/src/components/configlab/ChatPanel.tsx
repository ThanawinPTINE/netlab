import { useEffect, useRef, useState } from 'react';

export interface ChatMsg {
  role: 'ai' | 'user';
  text: string;
}

export interface ChatChip {
  label: string;
  onClick: () => void;
}

export interface ChatPanelProps {
  messages: ChatMsg[];
  isTyping: boolean;
  isBusy: boolean;
  aiOnline: boolean;
  modelTag: string;
  mobileOpen: boolean;
  chips: ChatChip[];
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, isTyping, isBusy, aiOnline, modelTag, mobileOpen, chips, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = 999999;
  }, [messages, isTyping]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    onSend(text);
  }

  return (
    <div className={'chat-panel' + (mobileOpen ? ' mobile-open' : '')} id="chatPanel">
      <div className="chat-header">
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: aiOnline ? 'var(--green)' : 'var(--text3)' }} />
        <div className="chat-title">AI — Network Tutor</div>
        <div className="model-tag">{modelTag}</div>
      </div>
      <div className="messages" ref={msgsRef}>
        {messages.map((m, i) => (
          <div className={'msg' + (m.role === 'user' ? ' user' : '')} key={i}>
            <div className={'av ' + (m.role === 'ai' ? 'ai-av' : 'user-av')}>{m.role === 'ai' ? 'AI' : 'U'}</div>
            <div className={'bub ' + (m.role === 'ai' ? 'ai-b' : 'user-b')}>{m.text}</div>
          </div>
        ))}
        {isTyping && (
          <div className="msg">
            <div className="av ai-av">AI</div>
            <div className="typing-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>
      <div className="chat-chips">
        {chips.map((c) => (
          <div className="chip" key={c.label} onClick={c.onClick}>
            {c.label}
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          className="chat-in"
          placeholder="ถาม AI Tutor..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isBusy) send();
          }}
        />
        <button aria-label="ส่งคำถาม" className="send-btn" onClick={send} disabled={isBusy}>
          {'↑'}
        </button>
      </div>
    </div>
  );
}
