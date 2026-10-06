import { useEffect, useReducer, useRef, useState } from 'react';
import { RequireAuth, useAuth } from '../../context/AuthContext';
import {
  getProgress as apiGetProgress,
  saveProgress as apiSaveProgress,
  saveProgressBeacon,
  saveQuizScore as apiSaveQuizScore,
  sendChatMessage,
} from '../../lib/api';
import type { TheoryItem, TheoryStep } from '../../types/theoryLab';
import LabTopbar from '../lab/LabTopbar';
import { useAiHealth } from '../lab/useAiHealth';
import ChatPanel, { type ChatMsg } from '../configlab/ChatPanel';
import LabCompleteModal from '../configlab/LabCompleteModal';
import { CalcView, CheckpointView, LessonView, ReviewView, WireOrderView, type StepCtx } from './StepViews';
import './theorylab.css';
import { clickable as kbd } from '../../lib/clickable';
import { buildLabsFromProgress } from '../../data/labMeta';

export interface TheoryLabProps {
  labId: number;
  labNumberBadge: string;
  breadcrumbChapter: string;
  docTitle: string;
  steps: TheoryStep[];
  welcomeMsg: string;
  completeTitle: string;
  completeSub: string;
  completeChatSummary: string;
  nextLabHref: string;
  /** AI system prompt up to (not including) the per-request "Current: ..." line */
  systemPromptPrefix: string;
}

interface AppState {
  step: number;
  maxStep: number;
  stepsDone: number[];
  wrong: number;
  chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[];
  wrongSinceSave: number;
  lastSaveTime: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const isQuizLike = (s: TheoryStep) => s.type === 'quiz' || s.type === 'review';
/** Anything that is graded. isLockedInTest() draws the same line. */
const isTest = (s: TheoryStep) => s.type !== 'lesson';

/** Failed attempts before the step closes and the student is sent back to read.
 *  Lower than the config labs' reveal threshold of 4 on purpose: there the
 *  fourth attempt earned the answer, here the third earns a second reading, and
 *  a third strike is enough frustration to act on. */
const WRONG_BEFORE_REREAD = 3;
/** How long the step stays shut. Long enough to actually re-read the lesson
 *  rather than bounce straight back. */
const REREAD_MS = 5 * 60 * 1000;

const cooldownKey = (labId: number, stepId: number | string) =>
  `netlab-reread-${labId}-${stepId}`;

/** Deadline for a step, or 0. Kept in localStorage so a reload does not clear
 *  it; a cleared browser store bypasses it, as with any client-side gate. */
function cooldownUntil(labId: number, stepId: number | string): number {
  try {
    const v = Number(localStorage.getItem(cooldownKey(labId, stepId)) || 0);
    return Number.isFinite(v) && v > Date.now() ? v : 0;
  } catch {
    return 0;
  }
}

function startCooldown(labId: number, stepId: number | string): number {
  const until = Date.now() + REREAD_MS;
  try {
    localStorage.setItem(cooldownKey(labId, stepId), String(until));
  } catch {
    /* private window or storage full — the in-memory deadline still holds for
       this tab, which is the common case */
  }
  return until;
}

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function TheoryLabInner(props: TheoryLabProps) {
  const { labId, labNumberBadge, breadcrumbChapter, docTitle, steps, welcomeMsg, completeTitle, completeSub, completeChatSummary, nextLabHref, systemPromptPrefix } =
    props;
  const { profile, token } = useAuth();
  const studentId = profile && 'studentId' in profile ? profile.studentId : null;
  const { aiOnline, aiStatusText, modelTag } = useAiHealth();

  // Kept as a ref (mutated then re-rendered via bump) for the same reason as
  // ConfigLab: handlers read-after-write within one event.
  const appRef = useRef<AppState>({ step: 1, maxStep: 1, stepsDone: [], wrong: 0, chatHistory: [], wrongSinceSave: 0, lastSaveTime: Date.now() });
  const [, bump] = useReducer((x: number) => x + 1, 0);
  // bumping viewKey remounts the step view = a fresh render of the step, as the vanilla renderStep() did
  const [viewKey, setViewKey] = useState(0);
  const [lockFlash, setLockFlash] = useState(0);
  const [labCompleteOpen, setLabCompleteOpen] = useState(false);
  const [showCompleteChips, setShowCompleteChips] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [chatMobileOpen, setChatMobileOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const lessonViewRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  /** review/quiz items drawn for this run, per step id — cleared on resetLab so a retake redraws */
  const drawnRef = useRef<Record<number, TheoryItem[]>>({});

  const app = appRef.current;
  const cur = steps[app.step - 1];

  // `now` ticks only while a step is cooling down, so the countdown updates and
  // the step reopens on its own without the student reloading.
  const [now, setNow] = useState(Date.now());
  const [rereadFor, setRereadFor] = useState<TheoryStep | null>(null);
  const anyCooling = steps.some((s) => cooldownUntil(labId, s.id) > 0);
  useEffect(() => {
    if (!anyCooling) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [anyCooling]);

  /** Remaining wait for a step, in ms. Reads `now` so it re-renders each tick. */
  function waitLeft(s: TheoryStep): number {
    void now;
    const until = cooldownUntil(labId, s.id);
    return until ? until - Date.now() : 0;
  }

  /** The lesson this test came from — the one to send them back to. */
  function lessonBefore(index: number): number {
    for (let i = index - 1; i >= 0; i--) if (steps[i].type === 'lesson') return i + 1;
    return 1;
  }

  /* ── review pool ── */
  function poolOf(s: TheoryStep): TheoryItem[] {
    let pool = (s.pool || []).slice();
    if (s.fromQuizzes) steps.forEach((st) => st.type === 'quiz' && st.items && (pool = pool.concat(st.items)));
    return pool;
  }
  /** one random question per topic, then shuffled — a retake is a real retest */
  function draw(s: TheoryStep): TheoryItem[] {
    const all = poolOf(s);
    if (!all.length) return s.items || [];
    const byTopic: Record<string, TheoryItem[]> = {};
    const order: string[] = [];
    all.forEach((it) => {
      const t = it.topic || 'อื่นๆ';
      if (!byTopic[t]) {
        byTopic[t] = [];
        order.push(t);
      }
      byTopic[t].push(it);
    });
    return shuffle(order.map((t) => byTopic[t][Math.floor(Math.random() * byTopic[t].length)]));
  }
  function itemsOf(s: TheoryStep): TheoryItem[] {
    if (!(s.pool || s.fromQuizzes)) return s.items || [];
    if (!drawnRef.current[s.id]) drawnRef.current[s.id] = draw(s);
    return drawnRef.current[s.id];
  }
  function countOf(s: TheoryStep): number {
    if (drawnRef.current[s.id]) return drawnRef.current[s.id].length;
    if (s.items && s.items.length && !(s.pool || s.fromQuizzes)) return s.items.length;
    const topics = new Set(poolOf(s).map((it) => it.topic || 'อื่นๆ'));
    return topics.size;
  }

  /* ── chat ── */
  function addMsg(role: 'ai' | 'user', text: string) {
    setMessages((prev) => [...prev, { role, text }]);
    appRef.current.chatHistory = appRef.current.chatHistory.concat([{ role: role === 'ai' ? 'assistant' : 'user', content: text }]).slice(-16);
  }
  function topicOf(s: TheoryStep | undefined) {
    return s ? s.title || s.q || '' : '';
  }
  function buildSys() {
    const a = appRef.current;
    return `${systemPromptPrefix}\nCurrent: Step ${a.step}/${steps.length} — ${topicOf(steps[a.step - 1])} | Wrong: ${a.wrong}`;
  }
  async function sendChat(text: string) {
    if (isBusy) return;
    setIsBusy(true);
    addMsg('user', text);
    setIsTyping(true);
    try {
      const res = await sendChatMessage({
        // addMsg('user', text) above already appended this to chatHistory;
        // concatenating it again sent the same question to the model twice.
        messages: appRef.current.chatHistory.slice(-8),
        system: buildSys(),
        max_tokens: 150,
        token: studentId ? token : null,
        labId,
      });
      setIsTyping(false);
      addMsg('ai', res.content || 'ขออภัยครับ');
    } catch (e) {
      setIsTyping(false);
      addMsg('ai', e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsBusy(false);
    }
  }

  /* ── progress persistence ── */
  function saveProgress(completed: boolean) {
    if (!studentId || !token) return;
    const now = Date.now();
    const a = appRef.current;
    const elapsedSec = Math.round((now - a.lastSaveTime) / 1000);
    const payload = {
      token,
      studentId,
      labId,
      courseId: 'netlab1',
      stepsDone: a.stepsDone.length,
      totalSteps: steps.length,
      wrongDelta: a.wrongSinceSave,
      elapsedSec,
      completed,
    };
    a.lastSaveTime = now;
    a.wrongSinceSave = 0;
    apiSaveProgress(payload).catch(() => {});
  }

  const introRanRef = useRef(false);
  useEffect(() => {
    document.title = docTitle;
  }, [docTitle]);
  useEffect(() => {
    if (introRanRef.current) return;
    introRanRef.current = true;
    // {steps} / {review} are filled from the data so the greeting can't drift from
    // the real chapter (the hardcoded counts once said 27/20/22 for 23/16/18 steps)
    const review = steps.find((s) => s.type === 'review');
    addMsg('ai', welcomeMsg.replace('{steps}', String(steps.length)).replace('{review}', String(review ? countOf(review) : 0)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onPageHide() {
      if (!studentId || !token) return;
      const a = appRef.current;
      const elapsedSec = Math.round((Date.now() - a.lastSaveTime) / 1000);
      if (elapsedSec < 1 && a.wrongSinceSave === 0) return;
      saveProgressBeacon({
        token,
        studentId,
        labId,
        courseId: 'netlab1',
        stepsDone: a.stepsDone.length,
        totalSteps: steps.length,
        wrongDelta: a.wrongSinceSave,
        elapsedSec,
        completed: false,
      });
    }
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [studentId, token, labId, steps.length]);

  const restoreRanRef = useRef(false);
  useEffect(() => {
    if (restoreRanRef.current) return;
    restoreRanRef.current = true;
    (async () => {
      if (!studentId || !token) return;
      let row;
      try {
        const data = await apiGetProgress(studentId, token, 'netlab1');
        // The Roadmap greys out a locked lab; nothing stopped anyone opening it
        // by URL. Same rule, same data, no extra request.
        const mine = buildLabsFromProgress(data.labs || []).find((l) => l.n === labId);
        if (mine?.status === 'locked') {
          window.location.replace('/course.html?locked=' + labId);
          return;
        }
        row = (data.labs || []).find((r) => r.lab_id === labId);
      } catch {
        return;
      }
      if (!row || !row.steps_done) return;
      const n = Math.min(row.steps_done, steps.length);
      const a = appRef.current;
      a.stepsDone = steps.slice(0, n).map((s) => s.id);
      if (n >= steps.length) {
        a.step = steps.length;
        a.maxStep = steps.length;
        setLabCompleteOpen(true);
        setShowCompleteChips(true);
      } else {
        a.step = n + 1;
        a.maxStep = a.step;
      }
      // Restoring put them on the next step, which may be the very one a
      // re-read wait has closed. Landing there means sitting on a step that
      // cannot be answered while isLockedInTest() also refuses to let them
      // leave — so move to the lesson, which is where the wait intends them.
      const landed = steps[a.step - 1];
      if (landed && isTest(landed) && cooldownUntil(labId, landed.id) > 0) {
        setRereadFor(landed);
        a.step = lessonBefore(a.step - 1);
      }
      setViewKey((k) => k + 1);
      bump();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── navigation ── */
  const isDone = (s: TheoryStep | undefined) => !!s && appRef.current.stepsDone.indexOf(s.id) >= 0;
  /** inside an unfinished test you can't wander back to the lesson that holds the answer */
  function isLockedInTest() {
    const s = steps[appRef.current.step - 1];
    if (!s || s.type === 'lesson') return false;
    return !isDone(s);
  }
  /** Every view is keyed by step, so changing step unmounts whatever the
   * student had focused and focus drops to <body> — the next Tab then starts
   * from the top of the page again. Put it on <main> instead, which is where
   * the skip link lands too, so one Tab reaches the new step's first control. */
  function resetView() {
    mainRef.current?.focus({ preventScroll: true });
    if (lessonViewRef.current) lessonViewRef.current.scrollTop = 0;
  }
  function goToStep(n: number) {
    const a = appRef.current;
    if (n < 1 || n > steps.length || n > a.maxStep) return;
    if (isLockedInTest() && n !== a.step) {
      setLockFlash((x) => x + 1);
      return;
    }
    // Still inside the re-read wait for that step.
    if (waitLeft(steps[n - 1]) > 0) {
      setLockFlash((x) => x + 1);
      return;
    }
    a.step = n;
    a.wrong = 0;
    setViewKey((k) => k + 1);
    bump();
    resetView();
  }
  function completeLab() {
    bump();
    setLabCompleteOpen(true);
    setShowCompleteChips(true);
    addMsg('ai', completeChatSummary);
    saveProgress(true);
  }
  function advanceStep() {
    const a = appRef.current;
    const s = steps[a.step - 1];
    const already = a.stepsDone.indexOf(s.id) >= 0;
    if (!already) a.stepsDone = [...a.stepsDone, s.id];
    if (a.step < steps.length) {
      a.step++;
      if (a.step > a.maxStep) a.maxStep = a.step;
      setViewKey((k) => k + 1);
      bump();
      resetView();
      if (!already) saveProgress(false);
    } else if (already) {
      setLabCompleteOpen(true);
    } else {
      completeLab();
    }
  }
  function resetLab() {
    setLabCompleteOpen(false);
    setShowCompleteChips(false);
    const a = appRef.current;
    a.step = 1;
    a.maxStep = 1;
    a.stepsDone = [];
    a.wrong = 0;
    a.wrongSinceSave = 0;
    a.lastSaveTime = Date.now();
    drawnRef.current = {};
    setViewKey((k) => k + 1);
    bump();
    // Without this the reset lived only in this tab: reloading restored the old
    // progress from the server and the restart silently undid itself.
    if (studentId && token) {
      apiSaveProgress({
        token,
        studentId,
        labId,
        courseId: 'netlab1',
        stepsDone: 0,
        totalSteps: steps.length,
        wrongDelta: 0,
        elapsedSec: 0,
        completed: false,
        reset: true,
      }).catch(() => {});
    }
  }

  const ctx: StepCtx = {
    reviewMode: isDone(cur),
    isLast: app.step >= steps.length,
    canPrev: app.step > 1,
    lockFlash,
    getWrong: () => appRef.current.wrong,
    bumpWrong: () => {
      appRef.current.wrong++;
      appRef.current.wrongSinceSave++;
      const w = appRef.current.wrong;
      // Every graded view reports failures through here, so one check covers
      // mcq, drag-drop, wireorder, calc, quiz and the end-of-chapter review.
      const s = steps[appRef.current.step - 1];
      if (s && isTest(s) && w >= WRONG_BEFORE_REREAD && !isDone(s)) {
        startCooldown(labId, s.id);
        setRereadFor(s);
        appRef.current.wrong = 0;
        const back = lessonBefore(appRef.current.step - 1);
        // Moved by the system, so this bypasses the in-test navigation freeze
        // rather than going through goToStep().
        appRef.current.step = back;
        setViewKey((k) => k + 1);
        setNow(Date.now());
        bump();
        resetView();
      }
      return w;
    },
    resetWrong: () => {
      appRef.current.wrong = 0;
    },
    onAdvance: advanceStep,
    onPrev: () => goToStep(appRef.current.step - 1),
    onNext: () => goToStep(appRef.current.step + 1),
    onOpenComplete: () => setLabCompleteOpen(true),
  };

  function renderStepView() {
    if (!cur) return null;
    const key = `${cur.id}-${viewKey}`;
    if (isQuizLike(cur))
      return (
        <ReviewView
          key={key}
          step={cur}
          items={itemsOf(cur)}
          ctx={ctx}
          onScore={(ok, total) => {
            if (studentId && token) apiSaveQuizScore({ token, labId, quizKey: `${cur.type}_${cur.id}`, score: ok, maxScore: total }).catch(() => {});
          }}
        />
      );
    if (cur.type === 'lesson') return <LessonView key={key} step={cur} ctx={ctx} />;
    if (cur.type === 'calc') return <CalcView key={key} step={cur} ctx={ctx} />;
    if (cur.type === 'wireorder') return <WireOrderView key={key} step={cur} ctx={ctx} />;
    return <CheckpointView key={key} step={cur} ctx={ctx} />;
  }

  /* ── sidebar ── */
  const lockedNow = isLockedInTest();
  let lastSection = '';
  const pct = Math.round((app.stepsDone.length / steps.length) * 100);

  return (
    <>
      <a className="skip-link" href="#main">ข้ามไปเนื้อหาหลัก</a>
      <LabTopbar
        labNumberBadge={labNumberBadge}
        breadcrumbChapter={breadcrumbChapter}
        aiOnline={aiOnline}
        aiStatusText={aiStatusText}
        onToggleSidebar={() => {
          setChatMobileOpen(false);
          setSidebarMobileOpen((o) => !o);
        }}
        onToggleChat={() => {
          setSidebarMobileOpen(false);
          setChatMobileOpen((o) => !o);
        }}
      />

      <div
        className={'mobile-backdrop' + (sidebarMobileOpen || chatMobileOpen ? ' show' : '')}
        onClick={() => {
          setSidebarMobileOpen(false);
          setChatMobileOpen(false);
        }}
      />

      <div className="main">
        <nav className={'sidebar' + (sidebarMobileOpen ? ' mobile-open' : '')} aria-label="ขั้นตอนของบทเรียน">
          <div className="sb-section">
            {steps.map((s, i) => {
              const showLabel = s.section !== lastSection;
              lastSection = s.section;
              const done = isDone(s);
              const isCur = i === app.step - 1;
              const rawTitle = s.type === 'lesson' || s.type === 'calc' || isQuizLike(s) ? s.title || '' : s.q || s.title || '';
              const title = rawTitle.length > 44 ? rawTitle.slice(0, 44) + '…' : rawTitle;
              const sub =
                s.type === 'lesson'
                  ? 'เนื้อหา'
                  : s.type === 'review'
                    ? countOf(s) + ' ข้อ รวมทุกหัวข้อ'
                    : s.type === 'quiz'
                      ? countOf(s) + ' ข้อ ทดสอบความรู้'
                      : s.type === 'calc'
                        ? 'คำนวณ'
                        : s.final
                          ? 'ทบทวนท้ายบท'
                          : 'Checkpoint';
              const left = waitLeft(s);
              const clickable = i + 1 <= app.maxStep && !lockedNow && left <= 0;
              return (
                <div key={s.id}>
                  {showLabel && <div className="sb-label">{s.section}</div>}
                  <div
                    className={'step-item' + (done ? ' done' : '') + (isCur ? ' active' : '') + (clickable ? ' clickable' : '')}
                    {...kbd(clickable && (() => goToStep(i + 1)))}
                  >
                    <div className={'step-num ' + (done ? 'sn-done' : isCur ? 'sn-active' : 'sn-next')}>{done ? '✓' : i + 1}</div>
                    <div className="step-info">
                      <div className="step-title">{title}</div>
                      <div className="step-sub">
                        {left > 0 ? `เปิดอีกครั้งใน ${formatRemaining(left)}` : sub}
                      </div>
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

        <main id="main" className="center" tabIndex={-1} ref={mainRef}>
          <div className="content-area">
            <div className="lesson-view" ref={lessonViewRef}>
              <div className="lesson-status">
                <div className="topo-chip">
                  Step {app.step}/{steps.length}
                </div>
                {showCompleteChips && (
                  <div className="complete-reopen-chip show" {...kbd(() => setLabCompleteOpen(true))}>
                    {'✓ Lab สำเร็จ — ดูสรุปผล'}
                  </div>
                )}
                {showCompleteChips && (
                  <div className="next-lab-chip show" {...kbd(() => (window.location.href = nextLabHref))}>
                    ไป Lab ถัดไป →
                  </div>
                )}
              </div>
              <div className="lesson-wrap">
                {rereadFor && waitLeft(rereadFor) > 0 && (
                  <div className="reread-notice" role="status">
                    <b>ลองมาแล้ว {WRONG_BEFORE_REREAD} ครั้ง — กลับมาอ่านเนื้อหาอีกรอบก่อนครับ</b>
                    <span>
                      “{rereadFor.title || rereadFor.section}” จะเปิดให้ทำอีกครั้งใน{' '}
                      <b>{formatRemaining(waitLeft(rereadFor))}</b> ระหว่างนี้อ่านหัวข้ออื่นได้ตามปกติ
                      และถาม AI Tutor ได้ แต่จะไม่เฉลยคำตอบให้
                    </span>
                  </div>
                )}
                {renderStepView()}
              </div>
              <LabCompleteModal
                open={labCompleteOpen}
                title={completeTitle}
                subLines={[completeSub]}
                nextLabHref={nextLabHref}
                nextLabLabel="ไป Lab ถัดไป →"
                closeLabel="ปิด — ทบทวนเนื้อหา"
                closeTitle="ปิด (ดูทบทวนเนื้อหาได้)"
                onClose={() => setLabCompleteOpen(false)}
                onReset={resetLab}
                onNextLab={() => (window.location.href = nextLabHref)}
              />
            </div>
          </div>
        </main>

        <ChatPanel
          messages={messages}
          isTyping={isTyping}
          isBusy={isBusy}
          aiOnline={aiOnline}
          modelTag={modelTag}
          mobileOpen={chatMobileOpen}
          onSend={sendChat}
          chips={[
            { label: 'อธิบายเพิ่มเติม', onClick: () => sendChat(`ช่วยอธิบายเรื่อง "${topicOf(cur)}" เพิ่มเติมแบบเข้าใจง่ายหน่อยครับ`) },
            { label: 'สรุปที่เรียนมาแล้ว', onClick: () => sendChat('สรุปสิ่งที่เรียนมาแล้วในหัวข้อที่ทำเสร็จให้หน่อยครับ') },
            { label: 'หน้าอ้างอิงหลัก', onClick: () => (window.location.href = '/index.html') },
          ]}
        />
      </div>
    </>
  );
}

export default function TheoryLab(props: TheoryLabProps) {
  return (
    <RequireAuth>
      <TheoryLabInner {...props} />
    </RequireAuth>
  );
}
