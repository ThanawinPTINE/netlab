import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { TheoryItem, TheoryStep } from '../../types/theoryLab';
import DragMatch, { clearWrongMatch, emptyMatch, gradeMatch, revealMatch, shuffledIndices, type MatchState } from './DragMatch';
import WirePins, { WIRE_COLORS, emptyWire, gradeWire, revealWire, shuffledWireKeys, type WireState } from './WirePins';
import { clickable } from '../../lib/clickable';
import { shuffledOrder } from '../../lib/shuffle';

/* Lesson bodies, figures, explanations and calc scenarios are trusted, static
   course content written as HTML — rendered as-is, exactly like the vanilla pages. */
const html = (s: string | undefined) => ({ __html: s || '' });

export interface StepCtx {
  reviewMode: boolean;
  isLast: boolean;
  canPrev: boolean;
  lockFlash: number;
  getWrong: () => number;
  bumpWrong: () => number;
  resetWrong: () => void;
  onAdvance: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenComplete: () => void;
}

type Fb = { text: string; ok: boolean } | null;

const LOCK_MSG = 'ตอบคำถามข้อนี้ให้ถูกก่อนครับ ระหว่างทำแบบทดสอบจะย้อนกลับไปดูเนื้อหาไม่ได้';
const GRADE_DELAY = 900;

/** Shows the "finish this test first" message whenever the sidebar refuses a jump. */
function useLockFlash(lockFlash: number, setFb: (f: Fb) => void) {
  const first = useRef(lockFlash);
  useEffect(() => {
    if (lockFlash !== first.current) setFb({ text: LOCK_MSG, ok: false });
  }, [lockFlash, setFb]);
}

function Feedback({ fb, style }: { fb: Fb; style?: React.CSSProperties }) {
  return (
    <div className={'checkpoint-fb' + (fb ? (fb.ok ? ' ok' : ' bad') : '')} style={style}>
      {fb?.text}
    </div>
  );
}

export function ReviewNav({ ctx }: { ctx: StepCtx }) {
  return (
    <>
      <div className="checkpoint-actions">
        {ctx.canPrev && (
          <button className="btn-skip2" onClick={ctx.onPrev}>
            ← ย้อนกลับ
          </button>
        )}
        {ctx.isLast ? (
          <button className="btn-check" onClick={ctx.onOpenComplete}>
            ดูสรุปผล Lab →
          </button>
        ) : (
          <button className="btn-check" onClick={ctx.onNext}>
            ถัดไป →
          </button>
        )}
      </div>
      <div className="review-note">
        <b>โหมดทบทวน</b> — ข้อนี้ทำผ่านไปแล้ว เฉลยจึงแสดงไว้ให้ ย้อนดูข้อก่อนหน้าได้จากรายการด้านซ้าย
      </div>
    </>
  );
}

/** Action row: review nav once done, an explicit "next" once answered correctly
 * (never auto-advance — the student should read the explanation), else the check buttons. */
function Actions({ ctx, passed, children }: { ctx: StepCtx; passed: boolean; children: ReactNode }) {
  if (ctx.reviewMode) return <ReviewNav ctx={ctx} />;
  if (passed)
    return (
      <div className="checkpoint-actions">
        <button className="btn-check" onClick={ctx.onAdvance}>
          {ctx.isLast ? 'จบ Lab — ดูสรุปผล →' : 'ถัดไป →'}
        </button>
      </div>
    );
  return <div className="checkpoint-actions">{children}</div>;
}

/* ── lesson ── */
export function LessonView({ step, ctx }: { step: TheoryStep; ctx: StepCtx }) {
  return (
    <>
      <div className="lesson-section-label">{step.section}</div>
      <div className="lesson-card">
        <div className="lesson-title">{step.title}</div>
        <div className="lesson-body" dangerouslySetInnerHTML={html(step.body)} />
        {step.fig && (
          <div className="lesson-fig">
            <div dangerouslySetInnerHTML={html(step.fig)} />
            {step.figCap && <div className="fig-cap">{step.figCap}</div>}
          </div>
        )}
        {ctx.reviewMode ? (
          <ReviewNav ctx={ctx} />
        ) : (
          <div className="lesson-actions">
            <button className="btn-check" onClick={ctx.onAdvance}>
              เข้าใจแล้ว ถัดไป →
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ── single checkpoint (MCQ or drag-drop) ── */
export function CheckpointView({ step, ctx }: { step: TheoryStep; ctx: StepCtx }) {
  // Fixed for this attempt: recomputing per render would reorder the
  // options while the student is reading them.
  const [optOrder] = useState(() => shuffledOrder((step.opts || []).length));
  const [fb, setFb] = useState<Fb>(null);
  const [passed, setPassed] = useState(false);
  useLockFlash(ctx.lockFlash, setFb);

  // MCQ
  const [sel, setSel] = useState<number | null>(null);
  const [graded, setGraded] = useState(ctx.reviewMode);
  const [expShown, setExpShown] = useState(ctx.reviewMode);

  // drag-drop
  const pairs = step.pairs || [];
  const [leftOrder] = useState(() => shuffledIndices(pairs.length));
  const [match, setMatch] = useState<MatchState>(() => (ctx.reviewMode ? revealMatch(pairs, leftOrder) : emptyMatch()));
  const [hintShown, setHintShown] = useState(false);

  function submit() {
    if (step.dragdrop) {
      const g = gradeMatch(pairs, match);
      setMatch(g.state);
      if (g.ok) {
        setFb({ text: '✓ ถูกต้องทั้งหมดครับ!', ok: true });
        ctx.resetWrong();
        setPassed(true);
      } else {
        const w = ctx.bumpWrong();
        setFb({ text: `ถูก ${g.okCount} จาก ${pairs.length} คู่ — คู่ที่ยังไม่ถูกถูกคืนกลับไปให้ลากใหม่แล้วครับ`, ok: false });
        if (w >= 3) setHintShown(true);
        window.setTimeout(() => setMatch((m) => clearWrongMatch(m)), GRADE_DELAY);
      }
      return;
    }
    setGraded(true);
    if (sel === step.ans) {
      setExpShown(true);
      setFb({ text: '✓ ถูกต้องครับ! — อ่านคำอธิบายด้านบน แล้วกด "ถัดไป"', ok: true });
      ctx.resetWrong();
      setPassed(true);
    } else {
      const w = ctx.bumpWrong();
      setFb({ text: 'ยังไม่ถูกครับ ลองใหม่อีกครั้ง', ok: false });
      if (w >= 3) setExpShown(true);
      window.setTimeout(() => {
        setGraded(false);
        setSel(null);
      }, GRADE_DELAY);
    }
  }

  const label = step.section + (step.final ? ' — คำถามทบทวนรวม' : '');

  if (step.dragdrop) {
    return (
      <>
        <div className="lesson-section-label">{label}</div>
        <div className="q-card">
          <div className="q-num">{step.final ? 'ทบทวนท้ายบท — Drag & Drop' : 'Checkpoint — Drag & Drop'}</div>
          <div className="q-text">{step.q}</div>
          <div className="dd-hint">ลากข้อความจากคอลัมน์ซ้ายไปวางบนคู่ที่ถูกต้องทางขวา (หรือจะคลิกเลือกแล้วคลิกช่องปลายทางก็ได้)</div>
          <DragMatch pairs={pairs} leftOrder={leftOrder} state={match} onChange={setMatch} locked={ctx.reviewMode || passed} />
          <Feedback fb={fb} />
          <Actions ctx={ctx} passed={passed}>
            <button className="btn-check" onClick={submit}>
              ตรวจคำตอบ
            </button>
          </Actions>
          <div className={'hint-box' + (hintShown ? ' show' : '')}>
            <div className="hint-title">เฉลย</div>
            <div className="hint-text">{pairs.map((p) => p.left + ' → ' + p.right).join('\n')}</div>
          </div>
        </div>
      </>
    );
  }

  const opts = step.opts || [];
  return (
    <>
      <div className="lesson-section-label">{label}</div>
      <div className="q-card">
        <div className="q-num">{step.final ? 'ทบทวนท้ายบท' : 'Checkpoint'}</div>
        <div className="q-text">{step.q}</div>
        <div className="q-opts">
          {optOrder.map((oi) => {
            const o = opts[oi];
            const cls = ['q-opt'];
            if (sel === oi && !graded) cls.push('selected');
            if (graded) {
              cls.push('answered');
              if (oi === step.ans) cls.push('correct');
              else if (oi === sel) cls.push('wrong');
            }
            return (
              <div key={oi} className={cls.join(' ')} {...clickable(!graded && (() => setSel(oi)))}>
                <div className="q-dot" />
                <span>{o}</span>
              </div>
            );
          })}
        </div>
        <div className={'q-explain' + (expShown ? ' show' : '')} dangerouslySetInnerHTML={html(step.exp)} />
        <Feedback fb={fb} />
        <Actions ctx={ctx} passed={passed}>
          <button className="btn-check" onClick={submit}>
            ตรวจคำตอบ
          </button>
        </Actions>
      </div>
    </>
  );
}

/* ── subnet calc (Lab 3) ── */
export function CalcView({ step, ctx }: { step: TheoryStep; ctx: StepCtx }) {
  const fields = step.fields || [];
  const answer = step.answer || {};
  const [fb, setFb] = useState<Fb>(null);
  const [passed, setPassed] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>(() => (ctx.reviewMode ? { ...answer } : {}));
  const [marks, setMarks] = useState<Record<string, 'correct' | 'wrong'>>(() =>
    ctx.reviewMode ? Object.fromEntries(fields.map((f) => [f.key, 'correct' as const])) : {},
  );
  const [shownAns, setShownAns] = useState<Record<string, boolean>>({});
  const firstRef = useRef<HTMLInputElement>(null);
  useLockFlash(ctx.lockFlash, setFb);

  useEffect(() => {
    if (!ctx.reviewMode) window.setTimeout(() => firstRef.current?.focus(), 50);
  }, [ctx.reviewMode]);

  function submit() {
    // the answer reveal is decided on the wrong count *before* this attempt, like the vanilla page
    const wrongBefore = ctx.getWrong();
    const m: Record<string, 'correct' | 'wrong'> = {};
    const shown: Record<string, boolean> = {};
    let all = true;
    fields.forEach((f) => {
      const good = (vals[f.key] || '').trim() === answer[f.key];
      m[f.key] = good ? 'correct' : 'wrong';
      if (!good) {
        all = false;
        if (wrongBefore >= 2) shown[f.key] = true;
      }
    });
    setMarks(m);
    setShownAns(shown);
    if (all) {
      setFb({ text: '✓ ถูกต้องทั้งหมดครับ!', ok: true });
      ctx.resetWrong();
      setPassed(true);
    } else {
      const w = ctx.bumpWrong();
      setFb({ text: 'ยังไม่ถูกทั้งหมดครับ ลองคำนวณใหม่อีกครั้ง' + (w >= 2 ? ' (ดูเฉลยช่องที่ผิดได้ด้านล่างช่องนั้นๆ)' : ''), ok: false });
    }
  }

  return (
    <>
      <div className="lesson-section-label">{step.section + (step.final ? ' — ทบทวนท้ายบท' : '')}</div>
      <div className="lesson-card">
        <div className="lesson-title">{step.title}</div>
        <div className="calc-scenario" dangerouslySetInnerHTML={html(step.scenario)} />
        <div className="calc-fields">
          {fields.map((f, i) => (
            <div className="calc-field" key={f.key}>
              <label className="calc-field-label" htmlFor={'calcIn_' + f.key}>
                {f.label}
              </label>
              <input
                ref={i === 0 ? firstRef : undefined}
                id={'calcIn_' + f.key}
                className={'calc-field-input' + (marks[f.key] ? ' ' + marks[f.key] : '')}
                autoComplete="off"
                spellCheck={false}
                placeholder={f.placeholder}
                readOnly={ctx.reviewMode || passed}
                value={vals[f.key] || ''}
                onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              />
              <div className={'calc-field-ans' + (shownAns[f.key] ? ' show' : '')}>{shownAns[f.key] ? 'เฉลย: ' + answer[f.key] : ''}</div>
            </div>
          ))}
        </div>
        <Feedback fb={fb} style={{ marginTop: 12 }} />
        <Actions ctx={ctx} passed={passed}>
          <button className="btn-check" onClick={submit}>
            ตรวจคำตอบ
          </button>
        </Actions>
      </div>
    </>
  );
}

/* ── wire order (Lab 2) ── */
export function WireOrderView({ step, ctx }: { step: TheoryStep; ctx: StepCtx }) {
  const order = step.order || [];
  const [round, setRound] = useState(0);
  const [poolOrder, setPoolOrder] = useState(shuffledWireKeys);
  const [wire, setWire] = useState<WireState>(() => (ctx.reviewMode ? revealWire(order) : emptyWire()));
  const [fb, setFb] = useState<Fb>(null);
  const [passed, setPassed] = useState(false);
  useLockFlash(ctx.lockFlash, setFb);

  function reset() {
    setPoolOrder(shuffledWireKeys());
    setWire(emptyWire());
    setFb(null);
    setRound((r) => r + 1);
  }

  function submit() {
    const g = gradeWire(order, wire);
    setWire(g.state);
    if (g.ok) {
      setFb({ text: '✓ เรียงถูกต้องทั้งหมดครับ!', ok: true });
      ctx.resetWrong();
      setPassed(true);
    } else {
      const w = ctx.bumpWrong();
      let msg = 'ยังไม่ถูกทั้งหมดครับ ช่องที่ขอบแดงคือตำแหน่งที่ผิด ลองใหม่อีกครั้ง';
      if (w >= 3) msg += ' — เฉลย: ' + order.map((k) => WIRE_COLORS[k].label).join(' → ');
      setFb({ text: msg, ok: false });
    }
  }

  return (
    <>
      <div className="lesson-section-label">{step.section + (step.final ? ' — ทบทวนท้ายบท' : '')}</div>
      <div className="q-card">
        <div className="q-num">แบบฝึกหัดเรียงสาย — {step.standard}</div>
        <div className="q-text">{step.title}</div>
        <div className="wire-scenario" dangerouslySetInnerHTML={html(step.scenario)} />
        <WirePins
          key={round}
          order={order}
          poolOrder={poolOrder}
          state={wire}
          onChange={setWire}
          locked={ctx.reviewMode || passed}
          chipWrapClass="wire-chip-wrap"
        />
        <Feedback fb={fb} style={{ marginTop: 14 }} />
        <Actions ctx={ctx} passed={passed}>
          <button className="btn-check" onClick={submit}>
            ตรวจคำตอบ
          </button>
          <button className="btn-skip2" onClick={reset}>
            รีเซ็ต
          </button>
        </Actions>
      </div>
    </>
  );
}

/* ── quiz gate / end-of-chapter review: every item on one page, graded together ── */
const isMcq = (it: TheoryItem) => !!(it.opts && it.opts.length);

export function ReviewView({
  step,
  items,
  ctx,
  onScore,
}: {
  step: TheoryStep;
  items: TheoryItem[];
  ctx: StepCtx;
  onScore: (ok: number, total: number) => void;
}) {
  // One order per drawn item, fixed for this attempt.
  const [itemOrders] = useState(() => items.map((it) => shuffledOrder((it.opts || []).length)));
  const reveal = ctx.reviewMode;
  const [leftOrders] = useState(() => items.map((it) => shuffledIndices(it.pairs?.length || 0)));
  const [poolOrders] = useState(() => items.map(() => shuffledWireKeys()));

  const [sel, setSel] = useState<Record<number, number>>({});
  const [mcqGraded, setMcqGraded] = useState<Record<number, boolean>>(() => (reveal ? Object.fromEntries(items.map((_, k) => [k, true])) : {}));
  const [dd, setDd] = useState<Record<number, MatchState>>(() =>
    Object.fromEntries(items.map((it, k) => [k, reveal && it.dragdrop ? revealMatch(it.pairs || [], leftOrders[k]) : emptyMatch()])),
  );
  const [wire, setWire] = useState<Record<number, WireState>>(() =>
    Object.fromEntries(items.map((it, k) => [k, reveal && it.type === 'wireorder' ? revealWire(it.order || []) : emptyWire()])),
  );
  const [calc, setCalc] = useState<Record<number, Record<string, string>>>(() =>
    Object.fromEntries(items.map((it, k) => [k, reveal && it.type === 'calc' ? { ...(it.answer || {}) } : {}])),
  );
  const [calcMarks, setCalcMarks] = useState<Record<number, Record<string, 'correct' | 'wrong'>>>(() =>
    Object.fromEntries(
      items.map((it, k) => [k, reveal && it.type === 'calc' ? Object.fromEntries((it.fields || []).map((f) => [f.key, 'correct' as const])) : {}]),
    ),
  );
  const [card, setCard] = useState<Record<number, 'ok' | 'bad'>>(() => (reveal ? Object.fromEntries(items.map((_, k) => [k, 'ok' as const])) : {}));
  const [fb, setFb] = useState<Fb>(null);
  const [passed, setPassed] = useState(false);
  useLockFlash(ctx.lockFlash, setFb);

  const locked = (k: number) => card[k] === 'ok';

  function gradeItem(it: TheoryItem, k: number): boolean {
    if (isMcq(it)) return sel[k] === it.ans;
    if (it.dragdrop) return gradeMatch(it.pairs || [], dd[k]).ok;
    if (it.type === 'wireorder') return gradeWire(it.order || [], wire[k]).ok;
    if (it.type === 'calc') return (it.fields || []).every((f) => (calc[k]?.[f.key] || '').trim() === it.answer?.[f.key]);
    return false;
  }

  function submit() {
    const nextCard: Record<number, 'ok' | 'bad'> = {};
    const nextDd = { ...dd };
    const nextWire = { ...wire };
    const nextCalcMarks = { ...calcMarks };
    const nextGraded = { ...mcqGraded };
    let okCount = 0;
    items.forEach((it, k) => {
      if (locked(k)) {
        nextCard[k] = 'ok';
        okCount++;
        return;
      }
      const ok = gradeItem(it, k);
      if (isMcq(it)) nextGraded[k] = true;
      else if (it.dragdrop) nextDd[k] = gradeMatch(it.pairs || [], dd[k]).state;
      else if (it.type === 'wireorder') nextWire[k] = gradeWire(it.order || [], wire[k]).state;
      else if (it.type === 'calc')
        nextCalcMarks[k] = Object.fromEntries(
          (it.fields || []).map((f) => [f.key, (calc[k]?.[f.key] || '').trim() === it.answer?.[f.key] ? 'correct' : 'wrong']),
        );
      nextCard[k] = ok ? 'ok' : 'bad';
      if (ok) okCount++;
    });
    setCard(nextCard);
    setDd(nextDd);
    setWire(nextWire);
    setCalcMarks(nextCalcMarks);
    setMcqGraded(nextGraded);

    const total = items.length;
    onScore(okCount, total);
    if (okCount === total) {
      ctx.resetWrong();
      setFb({ text: `✓ ถูกต้องครบทั้ง ${total} ข้อ — จบบทเรียนแล้วครับ`, ok: true });
      setPassed(true);
      return;
    }
    ctx.bumpWrong();
    setFb({ text: `ถูก ${okCount} จาก ${total} ข้อ — ข้อที่ยังไม่ถูกถูกคืนกลับมาให้แก้ใหม่แล้วครับ`, ok: false });
    window.setTimeout(() => {
      // wrong MCQ answers and wrong drag-drop pairs are handed back for another try
      setMcqGraded((g) => {
        const out = { ...g };
        items.forEach((it, k) => {
          if (isMcq(it) && nextCard[k] !== 'ok') delete out[k];
        });
        return out;
      });
      setSel((s) => {
        const out = { ...s };
        items.forEach((it, k) => {
          if (isMcq(it) && nextCard[k] !== 'ok') delete out[k];
        });
        return out;
      });
      setDd((d) => {
        const out = { ...d };
        items.forEach((it, k) => {
          if (it.dragdrop) out[k] = clearWrongMatch(out[k]);
        });
        return out;
      });
    }, GRADE_DELAY);
  }

  const showPoolNote = !!(step.pool || step.fromQuizzes);

  return (
    <>
      <div className="lesson-section-label">{step.section}</div>
      <div className="lesson-card">
        <div className="lesson-title">{step.title}</div>
        <div className="review-intro">{step.intro}</div>
        {items.map((it, k) => {
          const st = card[k];
          const markText = st === 'ok' ? (reveal ? '✓ เฉลย' : '✓ ถูกต้อง') : st === 'bad' ? '✗ ยังไม่ถูก' : '';
          const isLocked = reveal || passed || locked(k);
          return (
            <div key={k} className={'rv-item' + (st ? ' ' + st : '')}>
              <div className="rv-head">
                <div className="rv-num">ข้อ {k + 1}</div>
                <div className={'rv-mark' + (st ? ' ' + st : '')}>{markText}</div>
              </div>
              <div className="rv-q">{it.q || it.title || ''}</div>

              {isMcq(it) && (
                <>
                  <div className="q-opts">
                    {(itemOrders[k] ?? (it.opts || []).map((_, i) => i)).map((oi) => {
                      const o = (it.opts || [])[oi];
                      const graded = !!mcqGraded[k];
                      const cls = ['q-opt'];
                      if (sel[k] === oi) cls.push('selected');
                      if (graded) {
                        cls.push('answered');
                        // the right answer is only revealed once this item is solved (or in review mode)
                        if (oi === it.ans && (st === 'ok' || reveal)) cls.push('correct');
                        else if (oi === sel[k] && st === 'bad') cls.push('wrong');
                      }
                      return (
                        <div key={oi} className={cls.join(' ')} {...clickable(!isLocked && !graded && (() => setSel((s) => ({ ...s, [k]: oi }))))}>
                          <div className="q-dot" />
                          <span>{o}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className={'q-explain' + (st === 'ok' ? ' show' : '')} dangerouslySetInnerHTML={html(it.exp)} />
                </>
              )}

              {!isMcq(it) && it.dragdrop && (
                <>
                  <div className="dd-hint">ลากข้อความจากซ้ายไปวางบนคู่ที่ถูกต้องทางขวา (หรือคลิกเลือกแล้วคลิกช่องปลายทาง)</div>
                  <DragMatch
                    pairs={it.pairs || []}
                    leftOrder={leftOrders[k]}
                    state={dd[k]}
                    onChange={(s) => setDd((d) => ({ ...d, [k]: s }))}
                    locked={isLocked}
                  />
                </>
              )}

              {it.type === 'wireorder' && (
                <>
                  <div className="wire-scenario" dangerouslySetInnerHTML={html(it.scenario)} />
                  <WirePins
                    order={it.order || []}
                    poolOrder={poolOrders[k]}
                    state={wire[k]}
                    onChange={(s) => setWire((w) => ({ ...w, [k]: s }))}
                    locked={isLocked}
                  />
                </>
              )}

              {it.type === 'calc' && (
                <>
                  <div className="calc-scenario" dangerouslySetInnerHTML={html(it.scenario)} />
                  <div className="calc-fields">
                    {(it.fields || []).map((f) => (
                      <div className="calc-field" key={f.key}>
                        <label className="calc-field-label" htmlFor={`rvcalc_${k}_${f.key}`}>
                          {f.label}
                        </label>
                        <input
                          id={`rvcalc_${k}_${f.key}`}
                          className={'calc-field-input' + (calcMarks[k]?.[f.key] ? ' ' + calcMarks[k][f.key] : '')}
                          autoComplete="off"
                          spellCheck={false}
                          placeholder={f.placeholder}
                          readOnly={isLocked}
                          value={calc[k]?.[f.key] || ''}
                          onChange={(e) => setCalc((c) => ({ ...c, [k]: { ...c[k], [f.key]: e.target.value } }))}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
        {showPoolNote && (
          <div className="review-note">
            <b>ชุดคำถามสุ่ม</b> — สุ่มมาหัวข้อละ 1 ข้อจากทุกเรื่องที่เรียนในบทนี้ ถ้าทำ Lab ซ้ำจะได้คำถามชุดใหม่
          </div>
        )}
        <Feedback fb={fb} />
        <Actions ctx={ctx} passed={passed}>
          <button className="btn-check" onClick={submit}>
            ตรวจคำตอบทั้งหมด
          </button>
        </Actions>
      </div>
    </>
  );
}
