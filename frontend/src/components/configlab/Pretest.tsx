import type { DragDropQuestion, PretestQuestion } from '../../types/configLab';
import { clickable } from '../../lib/clickable';

export interface DdSelection {
  qi: number;
  pi: number;
  value: string;
}

export interface PretestProps {
  pretest: PretestQuestion[];
  shuffledPairs: Record<number, DragDropQuestion['pairs']>;
  answers: Record<number, { selected?: number; answered?: boolean }>;
  ddMap: Record<number, Record<number, { lpi: number; lv: string }>>;
  ddSel: DdSelection | null;
  scoreResult: { correct: number; total: number } | null;
  onSelectOption: (qi: number, oi: number) => void;
  onSelectDdItem: (qi: number, pi: number, value: string) => void;
  onDropDdTarget: (qi: number, ti: number) => void;
  onCheck: () => void;
  onSkip: () => void;
  onGoLab: () => void;
}

export default function Pretest({
  pretest,
  shuffledPairs,
  answers,
  ddMap,
  ddSel,
  scoreResult,
  onSelectOption,
  onSelectDdItem,
  onDropDdTarget,
  onCheck,
  onSkip,
  onGoLab,
}: PretestProps) {
  return (
    <>
      <div id="pretestContent">
        {pretest.map((q, qi) => {
          const a = answers[qi] || {};
          if (q.type === 'mcq') {
            return (
              <div className="q-card" key={q.id}>
                <div className="q-num">คำถามที่ {qi + 1}</div>
                <div className="q-text">{q.q}</div>
                <div className="q-opts">
                  {q.opts.map((o, oi) => {
                    const cls = ['q-opt'];
                    if (a.answered) {
                      cls.push('answered');
                      if (oi === q.ans) cls.push('correct');
                      else if (oi === a.selected) cls.push('wrong');
                    } else if (oi === a.selected) {
                      cls.push('selected');
                    }
                    return (
                      <div key={oi} className={cls.join(' ')} {...clickable(() => onSelectOption(qi, oi))}>
                        <div className="q-dot" />
                        <span>{o}</span>
                      </div>
                    );
                  })}
                </div>
                <div className={'q-explain' + (a.answered ? ' show' : '')}>{q.exp}</div>
              </div>
            );
          }

          // Left column is shuffled once per question; right column (the drop
          // targets) always keeps the original pair order — matches the vanilla
          // version's ddL (shuffled) vs ddR (q.pairs, unshuffled) split.
          const leftPairs = shuffledPairs[qi] || q.pairs;
          const rightPairs = q.pairs;
          const map = ddMap[qi] || {};
          const checked = scoreResult !== null;
          // correctLpis: left-item indices whose assigned target is correct — only
          // meaningful once checked (mirrors checkPretest() marking .matched).
          const correctLpis = new Set<number>();
          if (checked) {
            rightPairs.forEach((p, ti) => {
              const mp = map[ti];
              if (mp && mp.lv.trim() === p.left.trim()) correctLpis.add(mp.lpi);
            });
          }
          return (
            <div className="q-card" key={q.id}>
              <div className="q-num">คำถามที่ {qi + 1} — Drag &amp; Drop</div>
              <div className="q-text">{q.q}</div>
              <div className="dd-grid">
                <div>
                  <div className="dd-col-label">คลิกเลือก</div>
                  <div className="dd-items">
                    {leftPairs.map((p, pi) => {
                      const isSel = ddSel && ddSel.qi === qi && ddSel.pi === pi;
                      const isMatched = checked && correctLpis.has(pi);
                      const isPending = !checked && Object.values(map).some((m) => m.lpi === pi);
                      const cls = ['dd-item'];
                      if (checked) cls.push('checked');
                      if (isMatched) cls.push('matched');
                      else if (isPending) cls.push('pending');
                      else if (isSel) cls.push('sel');
                      return (
                        <div key={pi} className={cls.join(' ')} {...clickable(!checked && (() => onSelectDdItem(qi, pi, p.left)))}>
                          {p.left}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="dd-col-label">จับคู่กับ</div>
                  <div className="dd-items">
                    {rightPairs.map((p, ti) => {
                      const mp = map[ti];
                      const cls = ['dd-target'];
                      let text = p.right;
                      if (checked) {
                        if (mp) {
                          if (mp.lv.trim() === p.left.trim()) {
                            cls.push('filled');
                            text = '✓ ' + mp.lv;
                          } else {
                            cls.push('wrong-m');
                            text = '✗ ' + mp.lv;
                          }
                        }
                      } else if (mp) {
                        cls.push('pending');
                        text = '→ ' + mp.lv;
                      }
                      return (
                        <div key={ti} className={cls.join(' ')} {...clickable(!checked && (() => onDropDdTarget(qi, ti)))}>
                          {text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="pretest-actions">
        <button className="btn-check" onClick={onCheck}>
          ตรวจคำตอบ
        </button>
        <button className="btn-skip2" onClick={onSkip}>
          ข้ามไป Lab
        </button>
        {scoreResult && (
          <span className={'score-badge ' + (Math.round((scoreResult.correct / Math.max(scoreResult.total, 1)) * 100) >= 70 ? 'score-good' : 'score-ok')}>
            {scoreResult.correct}/{scoreResult.total} ({Math.round((scoreResult.correct / Math.max(scoreResult.total, 1)) * 100)}%)
          </span>
        )}
        {scoreResult && (
          <button className="btn-go-lab" onClick={onGoLab}>
            เริ่ม Lab →
          </button>
        )}
      </div>
    </>
  );
}
