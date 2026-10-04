import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { RequireAuth, useAuth } from '../../context/AuthContext';
import {
  getProgress as apiGetProgress,
  saveProgress as apiSaveProgress,
  saveProgressBeacon,
  saveQuizScore as apiSaveQuizScore,
  sendChatMessage,
} from '../../lib/api';
import { genericSyntax, isGibberish, isIpTypingSlip, isLikelyTypo } from '../../lib/terminalHelpers';
import { modeKeywords } from '../../lib/ciscoPatterns';
import type {
  DragDropQuestion,
  HintEntry,
  PcConfigStep,
  PcPingStep,
  PretestQuestion,
  Step,
  SyntaxTemplate,
  TopoLink,
  TopoNode,
} from '../../types/configLab';
import LabTopbar from '../lab/LabTopbar';
import { useAiHealth } from '../lab/useAiHealth';
import Topology, { findPcStep, findPcPingStep } from './Topology';
import Sidebar from './Sidebar';
import Checklist from './Checklist';
import Terminal, { type TermLine, type HintBoxState } from './Terminal';
import Pretest, { type DdSelection } from './Pretest';
import IpTable from './IpTable';
import ChatPanel, { type ChatMsg } from './ChatPanel';
import PcConfigModal from './PcConfigModal';
import PcCmdModal from './PcCmdModal';
import LabCompleteModal from './LabCompleteModal';
import './configlab.css';
import { clickable } from '../../lib/clickable';
import { buildLabsFromProgress } from '../../data/labMeta';

export interface ConfigLabProps {
  labId: number;
  labNumberBadge: string;
  breadcrumbChapter: string;
  docTitle: string;
  pretestTitle: string;
  topologyViewBox: string;
  nodes: TopoNode[];
  links: TopoLink[];
  steps: Step[];
  pretest: PretestQuestion[];
  nodeIpLabels: Record<string, string>;
  /** Cosmetic-only initial terminal prompt shown before the first command runs
   * (e.g. lab5 shows "R1>" even though step 1's real IOS prompt is "Router>" —
   * the device hasn't been hostnamed yet). Defaults to steps[0].prompt. */
  initialPrompt?: string;
  completeTitle: string;
  completeSubLines: string[];
  completeChatSummary: string;
  nextLabHref: string | null;
  /** Defaults to "ไป Lab ถัดไป →" — lab11 (the last lab) overrides this to
   * "กลับไปหน้า Course →" since there's no next lab to go to. */
  nextLabLabel?: string;
  welcomeMsg: string;
  introLines: { text: string; cls?: string }[];
  systemSubject: string;
  systemRef: string;
  configRouterWords?: string[];
  extraSyntaxTemplates?: SyntaxTemplate[];
}

interface AppState {
  step: number;
  stepsDone: number[];
  wrong: number;
  mode: string;
  prompt: string;
  chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[];
  cmdIdx: number;
  wrongSinceSave: number;
  hintsSinceSave: number;
  lastSaveTime: number;
}

const MODE_LABEL: Record<string, string> = {
  exec: 'User EXEC',
  'exec-priv': 'Privileged EXEC',
  config: 'Global Configuration',
  'config-if': 'Interface Configuration',
  'config-router': 'Router Configuration',
  'config-line': 'Line Configuration',
};

function stepHint(s: Step, cmdIdx: number): HintEntry {
  if (!s.type) {
    return (s.hints && s.hints[cmdIdx]) || s.cmdHint;
  }
  return s.cmdHint;
}

function ConfigLabInner(props: ConfigLabProps) {
  const {
    labId,
    labNumberBadge,
    breadcrumbChapter,
    docTitle,
    pretestTitle,
    topologyViewBox,
    nodes,
    links,
    steps,
    pretest,
    nodeIpLabels,
    initialPrompt,
    completeTitle,
    completeSubLines,
    completeChatSummary,
    nextLabHref,
    nextLabLabel = 'ไป Lab ถัดไป →',
    welcomeMsg,
    introLines,
    systemSubject,
    systemRef,
    configRouterWords,
    extraSyntaxTemplates,
  } = props;

  const { profile, token } = useAuth();
  const studentId = profile && 'studentId' in profile ? profile.studentId : null;

  const MODE_KEYWORDS = useMemo(() => modeKeywords(configRouterWords), [configRouterWords]);

  // ── core state machine — kept as a ref (not useState) because runCmd/tabComplete
  // must read-after-write synchronously within one event handler, which React's
  // batched setState can't guarantee. tick forces a re-render after mutating it,
  // mirroring the vanilla version's "mutate APP then call the render functions". ──
  const appRef = useRef<AppState>({
    step: 1,
    stepsDone: [],
    wrong: 0,
    mode: steps[0].mode,
    prompt: initialPrompt ?? steps[0].prompt,
    chatHistory: [],
    cmdIdx: 0,
    wrongSinceSave: 0,
    hintsSinceSave: 0,
    lastSaveTime: Date.now(),
  });
  const [, bump] = useReducer((x: number) => x + 1, 0);

  const [activeTab, setActiveTab] = useState<'pretest' | 'lab' | 'iptab'>('pretest');
  const [termLines, setTermLines] = useState<TermLine[]>([]);
  const [hintVisible, setHintVisible] = useState(false);
  const [showCompleteChips, setShowCompleteChips] = useState(false);
  const [labCompleteOpen, setLabCompleteOpen] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [chatMobileOpen, setChatMobileOpen] = useState(false);

  const { aiOnline, aiStatusText, modelTag } = useAiHealth();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const termBusyRef = useRef(false);

  const [pretestAnswers, setPretestAnswers] = useState<Record<number, { selected?: number; answered?: boolean }>>({});
  const [ddMap, setDdMap] = useState<Record<number, Record<number, { lpi: number; lv: string }>>>({});
  const [ddSel, setDdSel] = useState<DdSelection | null>(null);
  const [scoreResult, setScoreResult] = useState<{ correct: number; total: number } | null>(null);
  const [shuffledPairs] = useState<Record<number, DragDropQuestion['pairs']>>(() => {
    const out: Record<number, DragDropQuestion['pairs']> = {};
    pretest.forEach((q, qi) => {
      if (q.type === 'dragdrop') out[qi] = [...q.pairs].sort(() => Math.random() - 0.5);
    });
    return out;
  });

  const [pcModalOpen, setPcModalOpen] = useState(false);
  const [pcModalPcId, setPcModalPcId] = useState<string | null>(null);
  const [pcModalSub, setPcModalSub] = useState('');
  const [pcIp, setPcIp] = useState('');
  const [pcMask, setPcMask] = useState('');
  const [pcGw, setPcGw] = useState('');
  const [pcModalErr, setPcModalErr] = useState('');
  const [pcFieldErr, setPcFieldErr] = useState({ ip: false, mask: false, gateway: false });
  const pcModalTargetRef = useRef<PcConfigStep | null>(null);
  const [pcValues, setPcValues] = useState<Record<string, { ip: string; mask: string; gateway: string }>>({});

  const [pcCmdOpen, setPcCmdOpen] = useState(false);
  const [pcCmdPcId, setPcCmdPcId] = useState<string | null>(null);
  const [pcCmdSub, setPcCmdSub] = useState('');
  const [pcCmdScreen, setPcCmdScreen] = useState<TermLine[]>([]);
  const pcCmdTargetRef = useRef<PcPingStep | null>(null);
  const pcCmdInputRef = useRef<HTMLInputElement>(null);
  const [pcPinged, setPcPinged] = useState<Record<string, TermLine[]>>({});

  const termInputRef = useRef<HTMLInputElement>(null);
  const cmdHistoryRef = useRef<string[]>([]);
  const histIdxRef = useRef(-1);
  const histDraftRef = useRef('');
  const tabCycleRef = useRef<{ prefix: string | null; mode: string | null; matches: string[]; idx: number; listed: boolean }>({
    prefix: null,
    mode: null,
    matches: [],
    idx: -1,
    listed: false,
  });

  function rerender() {
    bump();
  }

  function tPrint(txt: string, cls?: string) {
    const newLines = (txt || '').split('\n').map((text) => ({ text, cls }));
    setTermLines((prev) => [...prev, ...newLines]);
  }

  function addMsg(role: 'ai' | 'user', text: string) {
    setMessages((prev) => [...prev, { role, text }]);
    appRef.current.chatHistory = appRef.current.chatHistory.concat([{ role: role === 'ai' ? 'assistant' : 'user', content: text }]).slice(-16);
  }

  // ── document title + intro + welcome message (mirrors window.onload) ──
  // introRanRef guards against StrictMode's dev-only double-invoke of effects,
  // which would otherwise print the intro banner and AI greeting twice.
  const introRanRef = useRef(false);
  useEffect(() => {
    document.title = docTitle;
  }, [docTitle]);

  useEffect(() => {
    if (introRanRef.current) return;
    introRanRef.current = true;
    introLines.forEach((l) => tPrint(l.text, l.cls));
    addMsg('ai', welcomeMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── pagehide beacon — captures in-progress time even if the student never
  // finishes a step before closing the tab ──
  useEffect(() => {
    function onPageHide() {
      if (!studentId || !token) return;
      const elapsedSec = Math.round((Date.now() - appRef.current.lastSaveTime) / 1000);
      if (elapsedSec < 1 && appRef.current.wrongSinceSave === 0) return;
      saveProgressBeacon({
        token,
        studentId,
        labId,
        courseId: 'netlab1',
        stepsDone: appRef.current.stepsDone.length,
        totalSteps: steps.length,
        wrongDelta: appRef.current.wrongSinceSave,
        hintsDelta: appRef.current.hintsSinceSave,
        elapsedSec,
        completed: false,
      });
    }
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, token]);

  function replayHistory(n: number) {
    let prevRouter: string | null = null;
    for (let idx = 0; idx < n; idx++) {
      const s = steps[idx];
      if (prevRouter !== null && s.router !== prevRouter) {
        tPrint('');
        tPrint(`\u2550\u2550 สลับไปทำ ${s.router} \u2550\u2550`, 't-info');
      }
      if (s.type === 'pcconfig') {
        const e = s.expected;
        tPrint(`# \u2713 ${s.router} — ตั้งค่า IP ${e.ip} / ${e.mask} / Gateway ${e.gateway} สำเร็จครับ`, 't-ok');
        prevRouter = s.router;
        continue;
      }
      if (s.type === 'pcping') {
        tPrint(`# \u2713 ${s.router} ping ไปยัง ${s.target.label} (${s.target.ip}) สำเร็จผ่าน Command Prompt ครับ`, 't-ok');
        prevRouter = s.router;
        continue;
      }
      const lines = s.answer.split('\n');
      let curPrompt = s.prompt;
      for (let i = 0; i < s.commands.length; i++) {
        tPrint(curPrompt + ' ' + lines[i]);
        const c = s.commands[i];
        if (c.msg) tPrint(c.msg, 't-ok');
        curPrompt = c.pr;
      }
      prevRouter = s.router;
    }
    tPrint('');
  }

  // ── restore saved progress on mount ──
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
      appRef.current.stepsDone = steps.slice(0, n).map((s) => s.id);
      if (n > 0) replayHistory(n);
      if (n >= steps.length) {
        appRef.current.step = steps.length;
        setLabCompleteOpen(true);
        setShowCompleteChips(true);
        tPrint('# กู้คืนความคืบหน้า: ทำ Lab นี้เสร็จแล้วก่อนหน้านี้ครับ', 't-info');
        rerender();
        return;
      }
      const next = steps[n];
      appRef.current.step = n + 1;
      appRef.current.mode = next.mode;
      appRef.current.prompt = next.prompt;
      appRef.current.cmdIdx = 0;
      rerender();
      tPrint(`# กู้คืนความคืบหน้า: ทำสำเร็จไปแล้ว ${n}/${steps.length} Step ครับ ทำต่อจาก Step ${appRef.current.step} (${next.name})`, 't-info');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveProgress(completed: boolean) {
    if (!studentId || !token) return;
    const now = Date.now();
    const elapsedSec = Math.round((now - appRef.current.lastSaveTime) / 1000);
    const payload = {
      token,
      studentId,
      labId,
      courseId: 'netlab1',
      stepsDone: appRef.current.stepsDone.length,
      totalSteps: steps.length,
      wrongDelta: appRef.current.wrongSinceSave,
      hintsDelta: appRef.current.hintsSinceSave,
      elapsedSec,
      completed,
    };
    appRef.current.lastSaveTime = now;
    appRef.current.wrongSinceSave = 0;
    appRef.current.hintsSinceSave = 0;
    apiSaveProgress(payload).catch(() => {});
  }

  function showHint() {
    // Counted separately from wrongSinceSave: a student can press hint and still
    // answer correctly first try, so wrong_count cannot stand in for the quota
    // semester 2's difficulty levels put on hints.
    appRef.current.hintsSinceSave++;
    setHintVisible(true);
  }
  function hideHint() {
    setHintVisible(false);
  }

  function advanceStep() {
    const cur = steps[appRef.current.step - 1];
    if (appRef.current.stepsDone.indexOf(cur.id) >= 0) return;
    appRef.current.stepsDone = [...appRef.current.stepsDone, cur.id];
    if (appRef.current.step < steps.length) {
      const prevRouter = cur.router;
      appRef.current.step++;
      appRef.current.cmdIdx = 0;
      const next = steps[appRef.current.step - 1];
      appRef.current.mode = next.mode;
      appRef.current.prompt = next.prompt;
      if (next.router !== prevRouter) {
        tPrint('');
        tPrint(`\u2550\u2550 สลับไปทำ ${next.router} \u2550\u2550`, 't-info');
      }
      rerender();
      saveProgress(false);
    } else {
      completeLab();
    }
  }

  function completeLab() {
    setPcModalOpen(false);
    setPcCmdOpen(false);
    rerender();
    setLabCompleteOpen(true);
    setShowCompleteChips(true);
    addMsg('ai', completeChatSummary);
    saveProgress(true);
  }

  function resetLab() {
    setLabCompleteOpen(false);
    setShowCompleteChips(false);
    appRef.current = {
      step: 1,
      stepsDone: [],
      wrong: 0,
      mode: steps[0].mode,
      prompt: initialPrompt ?? steps[0].prompt,
      chatHistory: appRef.current.chatHistory,
      cmdIdx: 0,
      wrongSinceSave: 0,
      hintsSinceSave: 0,
      lastSaveTime: Date.now(),
    };
    setPcValues({});
    setPcPinged({});
    setPcCmdOpen(false);
    setTermLines([]);
    tPrint('# เริ่ม Lab ใหม่อีกครั้งครับ — พิมพ์: enable', 't-info');
    rerender();
    setActiveTab('lab');
    // Without this the reset lived only in this tab: reloading restored the old
    // progress from the server and the restart silently undid itself.
    if (studentId && token) {
      apiSaveProgress({
        token, studentId, labId, courseId: 'netlab1',
        stepsDone: 0, totalSteps: steps.length,
        wrongDelta: 0, hintsDelta: 0, elapsedSec: 0,
        completed: false, reset: true,
      }).catch(() => {});
    }
  }

  function goNextLab() {
    if (nextLabHref) window.location.href = nextLabHref;
  }

  function switchTab(t: 'pretest' | 'lab' | 'iptab') {
    setActiveTab(t);
    if (t === 'lab') window.setTimeout(() => termInputRef.current?.focus(), 100);
  }

  // ── terminal input handling ──
  function handleTermKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      tabComplete();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      historyNav(-1);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyNav(1);
      return;
    }
    if (e.key !== 'Enter') return;
    const inp = termInputRef.current;
    if (!inp) return;
    const cmd = inp.value.trim();
    inp.value = '';
    histIdxRef.current = -1;
    histDraftRef.current = '';
    if (!cmd) return;
    cmdHistoryRef.current.push(cmd);
    runCmd(cmd);
  }

  function historyNav(dir: number) {
    const hist = cmdHistoryRef.current;
    if (!hist.length) return;
    const inp = termInputRef.current;
    if (!inp) return;
    if (dir < 0) {
      if (histIdxRef.current === -1) {
        histDraftRef.current = inp.value;
        histIdxRef.current = hist.length - 1;
      } else if (histIdxRef.current > 0) {
        histIdxRef.current--;
      }
    } else {
      if (histIdxRef.current === -1) return;
      if (histIdxRef.current < hist.length - 1) {
        histIdxRef.current++;
      } else {
        histIdxRef.current = -1;
        inp.value = histDraftRef.current;
        return;
      }
    }
    inp.value = hist[histIdxRef.current];
    inp.setSelectionRange(inp.value.length, inp.value.length);
  }

  function tabComplete() {
    const inp = termInputRef.current;
    if (!inp) return;
    const val = inp.value;
    if (!val || /\s$/.test(val)) {
      tabCycleRef.current.prefix = null;
      return;
    }
    const parts = val.split(/(\s+)/);
    const lastWord = parts[parts.length - 1];
    if (!lastWord) {
      tabCycleRef.current.prefix = null;
      return;
    }
    const lw = lastWord.toLowerCase();
    const keywords = MODE_KEYWORDS[appRef.current.mode] || [];
    const tc = tabCycleRef.current;
    const cycling = tc.prefix !== null && tc.mode === appRef.current.mode && tc.matches.length > 1 && tc.matches[tc.idx] === lw;

    if (cycling) {
      tc.idx = (tc.idx + 1) % tc.matches.length;
    } else {
      const matches = keywords.filter((k) => k.indexOf(lw) === 0);
      if (!matches.length) return;
      if (matches.length === 1 && matches[0] === lw) {
        inp.value = parts.join('') + ' ';
        tc.prefix = null;
        return;
      }
      tabCycleRef.current = { prefix: lw, mode: appRef.current.mode, matches, idx: 0, listed: false };
      if (matches.length > 1) {
        tPrint(appRef.current.prompt + ' ' + val);
        tPrint(matches.join('   '), 't-hint');
        tPrint('# กด Tab ซ้ำเพื่อไล่ดูตัวเลือกถัดไป', 't-hint');
        tabCycleRef.current.listed = true;
      }
    }
    const tc2 = tabCycleRef.current;
    const pick = tc2.matches[tc2.idx];
    parts[parts.length - 1] = pick;
    inp.value = parts.join('') + (tc2.matches.length === 1 ? ' ' : '');
    if (tc2.matches.length === 1) tc2.prefix = null;
    inp.focus();
  }

  function runCmd(cmd: string) {
    tPrint(appRef.current.prompt + ' ' + cmd);
    const step = steps[appRef.current.step - 1];
    if (!step) return;
    if (step.type === 'pcconfig') {
      tPrint(`# ขั้นตอนนี้ต้องคลิกที่ไอคอน ${step.router} บนแผนภาพด้านบนเพื่อกำหนดค่า IP ครับ ไม่ต้องพิมพ์คำสั่ง`, 't-hint');
      return;
    }
    if (step.type === 'pcping') {
      tPrint(`# ขั้นตอนนี้ต้องคลิกที่ไอคอน ${step.router} บนแผนภาพด้านบน แล้วพิมพ์ ping ในหน้า Command Prompt ครับ ไม่ต้องพิมพ์ในเทอร์มินัลนี้`, 't-hint');
      return;
    }
    let hit = false;
    const p = step.commands[appRef.current.cmdIdx];
    if (p && p.mode === appRef.current.mode && p.pat.test(cmd)) {
      hit = true;
      if (p.msg) tPrint(p.msg, 't-ok');
      appRef.current.mode = p.next;
      appRef.current.prompt = p.pr;
      appRef.current.wrong = 0;
      hideHint();
      if (p.adv) {
        appRef.current.cmdIdx = 0;
        rerender();
        notifyTerminal(cmd, true);
        window.setTimeout(advanceStep, 600);
      } else {
        appRef.current.cmdIdx++;
        rerender();
      }
    }
    if (!hit) {
      if (isGibberish(cmd, appRef.current.mode, MODE_KEYWORDS)) {
        tPrint("% Invalid input detected at '^' marker.", 't-err');
        tPrint('# อันนี้ไม่ใช่คำสั่ง Cisco IOS ที่เกี่ยวข้องเลยครับ ลองพิมพ์คำสั่งจริงดูนะ (ไม่นับเป็นครั้งที่ตอบผิด)', 't-hint');
        return;
      }
      appRef.current.wrong++;
      appRef.current.wrongSinceSave++;
      const firstWord = (cmd.trim().split(/\s+/)[0] || '').toLowerCase();
      const known = (MODE_KEYWORDS[appRef.current.mode] || []).some((k) => k.indexOf(firstWord) === 0);
      if (known) tPrint('% คำสั่งนี้ยังไม่ตรงกับสิ่งที่ขั้นตอนนี้ต้องการ — ตรวจค่าที่ใส่อีกครั้งครับ', 't-err');
      else tPrint("% Invalid input detected at '^' marker.", 't-err');
      showHint();
      rerender();
      const curHint = stepHint(step, appRef.current.cmdIdx);
      if (isLikelyTypo(cmd, curHint && curHint.cmd)) {
        tPrint('# ดูเหมือนพิมพ์ผิดนิดเดียว ลองเช็คตัวสะกด/ช่องว่างอีกครั้งครับ', 't-hint');
      } else if (isIpTypingSlip(cmd, curHint && curHint.cmd)) {
        tPrint('# ลองเช็ค IP Address/Subnet Mask ที่พิมพ์อีกครั้งครับ อาจมีจุด(.) เกินหรือตัวเลขซ้ำ', 't-hint');
      } else {
        notifyTerminal(cmd, false);
      }
    }
  }

  function buildSys(): string {
    const s = steps[appRef.current.step - 1];
    return (
      'Role: Cisco IOS Networking Tutor\nLanguage: Thai, ใช้ครับ\n' +
      `Subject: ${systemSubject}\nRef: ${systemRef}\n` +
      'Rules: ตอบสั้นไม่เกิน 4 ประโยค, wrong>=4 ให้เฉลย\n' +
      "UI ที่ผู้เรียนเห็นบนหน้าจอ (อ้างอิงได้เฉพาะสิ่งเหล่านี้เท่านั้น): แผนภาพ Topology ด้านบน | แท็บ 'ตาราง IP' มีตาราง IP/Subnet Mask/Interface ของทุกอุปกรณ์ | รายการขั้นตอนด้านซ้าย | กล่อง 'สิ่งที่ต้องทำตอนนี้' ใต้เทอร์มินัล ห้ามอ้างถึงเอกสาร ใบงาน หรือไฟล์ PDF ที่ไม่มีอยู่ในหน้าจอนี้\n" +
      `Current: Step ${appRef.current.step}/${steps.length} — ${s ? s.name : ''} | Mode: ${appRef.current.prompt} | Wrong: ${appRef.current.wrong}`
    );
  }

  /** `inHistory` says whether addMsg() has already put `msg` into chatHistory.
   *  The chat box has — the student typed it and it is on screen — so appending
   *  it again sent the same question to the model twice. The terminal's hint
   *  prompt has not: it is built internally and never shown, so it still needs
   *  to be appended. */
  async function callAI(msg: string, sys?: string, inHistory = false): Promise<string> {
    const recent = appRef.current.chatHistory.slice(-8);
    const res = await sendChatMessage({
      messages: inHistory ? recent : recent.concat([{ role: 'user', content: msg }]),
      system: sys || buildSys(),
      max_tokens: 150,
      token: studentId ? token : null,
      labId,
    });
    return res.content || 'ขออภัยครับ';
  }

  async function sendChat(text: string) {
    if (isBusy) return;
    setIsBusy(true);
    addMsg('user', text);
    setIsTyping(true);
    try {
      const r = await callAI(text, undefined, true);
      setIsTyping(false);
      addMsg('ai', r);
    } catch (e) {
      setIsTyping(false);
      addMsg('ai', e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsBusy(false);
    }
  }

  function askSyntaxOnly() {
    const s = steps[appRef.current.step - 1];
    if (!s) return;
    const curHint = stepHint(s, appRef.current.cmdIdx);
    addMsg('user', 'อธิบาย command ที่ต้องพิมพ์ตอนนี้');
    const t = genericSyntax(curHint.cmd, extraSyntaxTemplates);
    const reply = t
      ? `รูปแบบคำสั่งพื้นฐาน: \`${t.tpl}\`\n${t.desc}\n\nลองแทนค่าตามโจทย์ของ Step นี้ดูครับ`
      : 'ลองดูรูปแบบคำสั่ง Cisco IOS ทั่วไปที่เกี่ยวข้องกับขั้นตอนนี้ แล้วปรับค่าตามโจทย์ครับ';
    addMsg('ai', reply);
  }

  function showModeCommands() {
    addMsg('user', 'คำสั่งที่ใช้ได้ในโหมดนี้');
    const kws = MODE_KEYWORDS[appRef.current.mode] || [];
    const label = MODE_LABEL[appRef.current.mode] || appRef.current.mode;
    addMsg('ai', `โหมดปัจจุบัน: ${appRef.current.prompt} (${label})\nคำสั่งที่ใช้ได้: ${kws.map((k) => '`' + k + '`').join(', ')}`);
  }

  function showProgressSummary() {
    addMsg('user', 'สรุปที่ทำมาแล้ว');
    if (!appRef.current.stepsDone.length) {
      addMsg('ai', 'ยังไม่ได้ทำ Step ไหนสำเร็จเลยครับ เริ่มจาก Step 1 ได้เลย');
      return;
    }
    const lines = steps.filter((s) => appRef.current.stepsDone.indexOf(s.id) >= 0).map((s) => '\u2713 ' + s.name);
    addMsg('ai', `ทำสำเร็จแล้ว ${appRef.current.stepsDone.length}/${steps.length} step:\n${lines.join('\n')}`);
  }

  function moreBasics() {
    window.location.href = '/index.html#static';
  }

  async function notifyTerminal(cmd: string, ok: boolean) {
    if (termBusyRef.current || isBusy) return;
    termBusyRef.current = true;
    const s = steps[appRef.current.step - 1];
    if (!s) {
      termBusyRef.current = false;
      return;
    }
    let prompt: string;
    if (ok) {
      const nextStep = steps[appRef.current.step];
      prompt =
        `"${cmd}" ถูกต้อง! Step ${appRef.current.step}: ${s.name} เสร็จแล้ว\n` +
        (nextStep
          ? `ขั้นต่อไปคือ "${nextStep.name}" — สิ่งที่ต้องทำ: ${nextStep.cmdHint.desc}\nแสดงความยินดีสั้น 1 ประโยค แล้วอธิบายสิ่งที่ต้องทำต่อไปแบบกว้างๆ ให้ผู้ใช้คิดคำสั่ง Cisco IOS เองครับ ห้ามบอกคำสั่งเป๊ะๆ ตรงๆ`
          : 'นี่คือ step สุดท้ายของ Lab แล้ว แสดงความยินดีที่ทำสำเร็จสั้นๆ ครับ');
    } else {
      const canReveal = appRef.current.wrong >= 4;
      const curHint = stepHint(s, appRef.current.cmdIdx);
      prompt =
        `"${cmd}" ผิด (ผิดมา ${appRef.current.wrong} ครั้ง) Mode:${appRef.current.prompt}` +
        (canReveal ? ` Expected:${curHint.cmd}` : ` Goal:${curHint.desc}`) +
        '\n' +
        (canReveal
          ? 'ผิดครบ 4 ครั้งแล้ว ให้เฉลยคำสั่งของขั้นย่อยนี้ได้ (ห้ามเฉลยคำสั่งย่อยถัดไปหรือ Step ถัดไป)'
          : appRef.current.wrong >= 2
            ? 'ให้ hint บางส่วน ห้ามบอกคำสั่งเต็มเด็ดขาด'
            : 'อธิบายสั้นๆ ห้ามบอกคำสั่งเต็มเด็ดขาด');
    }
    setIsTyping(true);
    try {
      const r = await callAI(prompt, buildSys());
      setIsTyping(false);
      addMsg('ai', r);
    } catch {
      setIsTyping(false);
    } finally {
      termBusyRef.current = false;
    }
  }

  function showAnswer() {
    const s = steps[appRef.current.step - 1];
    if (s && !s.type) addMsg('ai', `เฉลย Step ${appRef.current.step}:\n${s.answer}`);
  }

  // ── PC config modal ──
  function openPcConfig(pcId: string) {
    const step = findPcStep(steps, pcId);
    if (!step) return;
    const isCurrent = steps[appRef.current.step - 1] === step;
    const isDone = appRef.current.stepsDone.indexOf(step.id) >= 0;
    if (!isCurrent && !isDone) {
      tPrint(`# ยังไม่ถึงขั้นตอนตั้งค่า ${pcId} ครับ ทำ Step ปัจจุบันให้เสร็จก่อนนะครับ`, 't-hint');
      return;
    }
    pcModalTargetRef.current = step;
    setPcModalPcId(pcId);
    setPcModalSub(isDone ? 'ตั้งค่าไว้แล้วครับ (แก้ไขใหม่ได้)' : 'กรอกค่าตาม Topology ด้านบนให้ตรงครับ');
    const saved = pcValues[pcId] || { ip: '', mask: '', gateway: '' };
    setPcIp(saved.ip);
    setPcMask(saved.mask);
    setPcGw(saved.gateway);
    setPcModalErr('');
    setPcFieldErr({ ip: false, mask: false, gateway: false });
    setPcModalOpen(true);
  }

  function closePcConfig() {
    setPcModalOpen(false);
    pcModalTargetRef.current = null;
  }

  function submitPcConfig() {
    const target = pcModalTargetRef.current;
    if (!target) return;
    const exp = target.expected;
    const errs: string[] = [];
    const fieldErr = { ip: false, mask: false, gateway: false };
    if (pcIp.trim() !== exp.ip) {
      errs.push('IP Address');
      fieldErr.ip = true;
    }
    if (pcMask.trim() !== exp.mask) {
      errs.push('Subnet Mask');
      fieldErr.mask = true;
    }
    if (pcGw.trim() !== exp.gateway) {
      errs.push('Default Gateway');
      fieldErr.gateway = true;
    }
    setPcFieldErr(fieldErr);
    if (errs.length) {
      setPcModalErr(errs.join(', ') + ' ไม่ถูกต้อง ลองเช็คอีกครั้งครับ');
      return;
    }
    const ip = pcIp.trim();
    const mask = pcMask.trim();
    const gateway = pcGw.trim();
    setPcValues((prev) => ({ ...prev, [target.router]: { ip, mask, gateway } }));
    const wasDone = appRef.current.stepsDone.indexOf(target.id) >= 0;
    const pcId = target.router;
    closePcConfig();
    if (!wasDone) {
      tPrint(`# \u2713 ${pcId} — ตั้งค่า IP ${ip} / ${mask} / Gateway ${gateway} สำเร็จครับ`, 't-ok');
      advanceStep();
    } else {
      rerender();
    }
  }

  // ── PC ping modal ──
  function openPcCmd(pcId: string) {
    const step = findPcPingStep(steps, pcId);
    if (!step) return;
    const isCurrent = steps[appRef.current.step - 1] === step;
    const isDone = appRef.current.stepsDone.indexOf(step.id) >= 0;
    if (!isCurrent && !isDone) {
      tPrint(`# ยังไม่ถึงขั้นตอนทดสอบ ping จาก ${pcId} ครับ ทำ Step ปัจจุบันให้เสร็จก่อนนะครับ`, 't-hint');
      return;
    }
    pcCmdTargetRef.current = step;
    setPcCmdPcId(pcId);
    setPcCmdSub(isDone ? 'ทดสอบ ping สำเร็จไว้แล้วครับ (ลองใหม่ได้)' : 'พิมพ์ ping ตามด้วย IP ปลายทางแล้วกด Enter');
    setPcCmdScreen(pcPinged[pcId] || []);
    setPcCmdOpen(true);
    window.setTimeout(() => pcCmdInputRef.current?.focus(), 50);
  }

  function closePcCmd() {
    setPcCmdOpen(false);
    pcCmdTargetRef.current = null;
  }

  function openPcModal(pcId: string) {
    const cfgStep = findPcStep(steps, pcId);
    const pingStep = findPcPingStep(steps, pcId);
    const cfgDone = cfgStep != null && appRef.current.stepsDone.indexOf(cfgStep.id) >= 0;
    if (pingStep && (cfgDone || !cfgStep)) openPcCmd(pcId);
    else if (cfgStep) openPcConfig(pcId);
    else if (pingStep) openPcCmd(pcId);
  }

  function handlePcCmdKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') runPcPing();
  }

  function runPcPing() {
    const target = pcCmdTargetRef.current;
    if (!target) return;
    const input = pcCmdInputRef.current;
    if (!input) return;
    const cmd = input.value.trim();
    if (!cmd) return;
    input.value = '';
    const screen = [...pcCmdScreen];
    screen.push({ text: 'C:\\Users\\Student>' + cmd });
    const m = cmd.match(/^ping\s+(\S+)$/i);
    if (!m) {
      screen.push({
        text: `'${cmd.split(/\s+/)[0]}' is not recognized as an internal or external command,\noperable program or batch file.`,
        cls: 'pc-cmd-err',
      });
      setPcCmdScreen(screen);
      return;
    }
    const ip = m[1];
    if (ip !== target.target.ip) {
      screen.push({ text: `Ping request could not find host ${ip}. Please check the name and try again.`, cls: 'pc-cmd-err' });
      setPcCmdScreen(screen);
      return;
    }
    screen.push({ text: '' });
    screen.push({ text: `Pinging ${ip} with 32 bytes of data:` });
    const ttl = target.target.ttl || 125;
    for (let i = 0; i < 4; i++) screen.push({ text: `Reply from ${ip}: bytes=32 time<1ms TTL=${ttl}`, cls: 'pc-cmd-ok' });
    screen.push({ text: '' });
    screen.push({ text: `Ping statistics for ${ip}:` });
    screen.push({ text: '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),' });
    screen.push({ text: 'Approximate round trip times in milli-seconds:' });
    screen.push({ text: '    Minimum = 0ms, Maximum = 0ms, Average = 0ms', cls: 'pc-cmd-ok' });
    setPcCmdScreen(screen);
    const wasDone = appRef.current.stepsDone.indexOf(target.id) >= 0;
    const pcId = target.router;
    const label = target.target.label;
    setPcPinged((prev) => ({ ...prev, [pcId]: screen }));
    if (!wasDone) {
      window.setTimeout(() => {
        closePcCmd();
        tPrint(`# \u2713 ${pcId} ping ไปยัง ${label} (${ip}) สำเร็จผ่าน Command Prompt ครับ`, 't-ok');
        advanceStep();
      }, 900);
    }
  }

  // ── pretest ──
  function selOpt(qi: number, oi: number) {
    setPretestAnswers((prev) => (prev[qi]?.answered ? prev : { ...prev, [qi]: { selected: oi } }));
  }
  function selDD(qi: number, pi: number, value: string) {
    setDdSel((prev) => (prev && prev.qi === qi && prev.pi === pi ? null : { qi, pi, value }));
  }
  function dropDD(qi: number, ti: number) {
    if (!ddSel || ddSel.qi !== qi) return;
    const sel = ddSel;
    setDdMap((prev) => {
      const qMap = { ...(prev[qi] || {}) };
      Object.keys(qMap).forEach((k) => {
        if (qMap[Number(k)].lpi === sel.pi) delete qMap[Number(k)];
      });
      qMap[ti] = { lpi: sel.pi, lv: sel.value };
      return { ...prev, [qi]: qMap };
    });
    setDdSel(null);
  }
  function checkPretest() {
    let correct = 0;
    let total = 0;
    const newAnswers = { ...pretestAnswers };
    pretest.forEach((q, qi) => {
      if (q.type === 'mcq') {
        total++;
        const sel = newAnswers[qi]?.selected;
        if (sel === q.ans) correct++;
        newAnswers[qi] = { ...newAnswers[qi], answered: true };
      } else {
        const m = ddMap[qi] || {};
        q.pairs.forEach((pair, ti) => {
          total++;
          const mp = m[ti];
          if (mp && mp.lv.trim() === pair.left.trim()) correct++;
        });
      }
    });
    setPretestAnswers(newAnswers);
    setScoreResult({ correct, total });
    if (studentId && token) {
      apiSaveQuizScore({ token, labId, quizKey: 'pretest', score: correct, maxScore: total }).catch(() => {});
    }
  }

  // ── derived render data ──
  const currentStepObj = steps[appRef.current.step - 1];
  const currentHint: HintEntry = currentStepObj ? stepHint(currentStepObj, appRef.current.cmdIdx) : { cmd: '', desc: '' };
  const hintBoxState: HintBoxState = useMemo(() => {
    const h = currentHint;
    const cmdOnly = h.cmd.replace(/^\S+[#>]\s*/, '');
    const firstWord = cmdOnly.split(/\s+/)[0];
    let txt = `Mode: ${appRef.current.prompt}\n${h.desc}`;
    if (appRef.current.wrong >= 4) txt += `\n\nคำสั่งที่ต้องพิมพ์: ${cmdOnly}`;
    else if (appRef.current.wrong >= 2) txt += `\n\nเริ่มต้นคำสั่งด้วย: ${firstWord} ...`;
    return {
      show: hintVisible,
      title: `Hint (ผิด ${appRef.current.wrong} ครั้ง)`,
      text: txt,
      showAnswerBtn: appRef.current.wrong >= 4,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintVisible, currentHint, appRef.current.wrong, appRef.current.prompt]);

  return (
    <>
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

      <div className="tab-bar">
        <div className={'tab' + (activeTab === 'pretest' ? ' active' : '')} {...clickable(() => switchTab('pretest'))}>
          Pre-test
        </div>
        <div className={'tab' + (activeTab === 'lab' ? ' active' : '')} {...clickable(() => switchTab('lab'))}>
          Config Terminal
        </div>
        <div className={'tab' + (activeTab === 'iptab' ? ' active' : '')} {...clickable(() => switchTab('iptab'))}>
          ตาราง IP
        </div>
      </div>

      <div
        className={'mobile-backdrop' + (sidebarMobileOpen || chatMobileOpen ? ' show' : '')}
        onClick={() => {
          setSidebarMobileOpen(false);
          setChatMobileOpen(false);
        }}
      />

      <div className="main">
        <Sidebar steps={steps} stepsDone={appRef.current.stepsDone} currentStep={appRef.current.step} mobileOpen={sidebarMobileOpen} />

        <div className="center">
          <div className="content-area">
            <div className={'view' + (activeTab === 'pretest' ? ' active' : '')}>
              <div className="pretest-wrap">
                <div className="pretest-head">
                  <div>
                    <div className="pretest-title">{pretestTitle}</div>
                    <div className="pretest-sub">ทดสอบความรู้ก่อน Lab — ทำหรือข้ามก็ได้ครับ</div>
                  </div>
                  <button className="skip-btn" onClick={() => switchTab('lab')}>
                    ข้ามไป Lab →
                  </button>
                </div>
                <Pretest
                  pretest={pretest}
                  shuffledPairs={shuffledPairs}
                  answers={pretestAnswers}
                  ddMap={ddMap}
                  ddSel={ddSel}
                  scoreResult={scoreResult}
                  onSelectOption={selOpt}
                  onSelectDdItem={selDD}
                  onDropDdTarget={dropDD}
                  onCheck={checkPretest}
                  onSkip={() => switchTab('lab')}
                  onGoLab={() => switchTab('lab')}
                />
              </div>
            </div>

            {activeTab === 'iptab' && (
              <div className="view active">
                <IpTable steps={steps} links={links} />
              </div>
            )}

            <div className={'view' + (activeTab === 'lab' ? ' active' : '')}>
              <div className="lab-view">
                <div className="topology">
                  <Topology
                    viewBox={topologyViewBox}
                    nodes={nodes}
                    links={links}
                    steps={steps}
                    stepsDone={appRef.current.stepsDone}
                    currentStep={appRef.current.step}
                    nodeIpLabels={nodeIpLabels}
                    onNodeClick={openPcModal}
                  />
                  <div className="topo-status">
                    <div className="topo-chip">
                      Step {appRef.current.step}/{steps.length}
                    </div>
                    {showCompleteChips && (
                      <div className="complete-reopen-chip show" {...clickable(() => setLabCompleteOpen(true))}>
                        {'\u2713 Lab สำเร็จ — ดูสรุปผล'}
                      </div>
                    )}
                    {showCompleteChips && nextLabHref && (
                      <div className="next-lab-chip show" {...clickable(goNextLab)}>
                        {nextLabLabel}
                      </div>
                    )}
                  </div>
                </div>
                <Terminal
                  ref={termInputRef}
                  lines={termLines}
                  prompt={appRef.current.prompt}
                  disabled={false}
                  hint={hintBoxState}
                  onKeyDown={handleTermKey}
                  onShowAnswer={showAnswer}
                />
                <Checklist steps={steps} stepsDone={appRef.current.stepsDone} currentStep={appRef.current.step} currentHint={currentHint} />
              </div>
              <LabCompleteModal
                open={labCompleteOpen}
                title={completeTitle}
                subLines={completeSubLines}
                nextLabHref={nextLabHref}
                nextLabLabel={nextLabLabel}
                onClose={() => setLabCompleteOpen(false)}
                onReset={resetLab}
                onNextLab={goNextLab}
              />
            </div>
          </div>
        </div>

        <ChatPanel
          messages={messages}
          isTyping={isTyping}
          isBusy={isBusy}
          aiOnline={aiOnline}
          modelTag={modelTag}
          mobileOpen={chatMobileOpen}
          onSend={sendChat}
          chips={[
            { label: 'อธิบาย cmd', onClick: askSyntaxOnly },
            { label: 'คำสั่งในโหมดนี้', onClick: showModeCommands },
            { label: 'สรุปที่ทำมาแล้ว', onClick: showProgressSummary },
            { label: 'พื้นฐานเพิ่มเติม', onClick: moreBasics },
          ]}
        />
      </div>

      <PcConfigModal
        open={pcModalOpen}
        pcId={pcModalPcId}
        sub={pcModalSub}
        ip={pcIp}
        mask={pcMask}
        gateway={pcGw}
        err={pcModalErr}
        fieldErr={pcFieldErr}
        onChangeIp={setPcIp}
        onChangeMask={setPcMask}
        onChangeGateway={setPcGw}
        onCancel={closePcConfig}
        onSubmit={submitPcConfig}
      />
      <PcCmdModal ref={pcCmdInputRef} open={pcCmdOpen} pcId={pcCmdPcId} sub={pcCmdSub} screen={pcCmdScreen} onClose={closePcCmd} onKeyDown={handlePcCmdKey} />
    </>
  );
}

export default function ConfigLab(props: ConfigLabProps) {
  return (
    <RequireAuth>
      <ConfigLabInner {...props} />
    </RequireAuth>
  );
}
