/* NETLab — typed API client for the FastAPI backend (main.py).
   Every shape here mirrors a Pydantic model or response dict in main.py exactly —
   keep this file in sync if the backend contract changes. */

// API_BASE mirrors every labN.html's existing convention: talk to the backend
// directly on localhost during dev, go through the "/api" reverse-proxy path in
// any other deployment (CLAUDE.md "Frontend pages call the backend via API_BASE").
// The page's own protocol is kept so an https deployment doesn't call http://…/api
// and get blocked as mixed content.
// window.location.host, not .hostname: .hostname drops the port, so a page
// opened from another machine on the LAN at 192.168.1.5:5500 asked
// http://192.168.1.5/api — port 80, where nothing listens — and every call
// failed. .host keeps the port, which the Vite dev server then proxies to :8000
// (see vite.config.ts). In production nginx serves on the default port, so
// .host carries none and the URL is unchanged.
export const API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : `${window.location.protocol}//${window.location.host}/api`;

// ─── /auth/google ────────────────────────────────────────────────
export interface AuthProfile {
  name: string;
  email: string;
  studentId: string;
  picture: string | null;
}

export interface AuthResponse {
  ok: boolean;
  token: string;
  profile: AuthProfile;
}

export async function authGoogle(credential: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// A 401 from a student-data endpoint means the server no longer accepts this
// session token (expired, SECRET_KEY rotated, or the users row is gone). Left
// alone, every save would fail silently while the student keeps working, so drop
// the stored session and send them to sign in again. The key is AuthContext's
// AUTH_KEY, inlined because AuthContext imports this module.
function endSessionIfRejected(res: Response | null) {
  if (res?.status !== 401) return;
  try {
    localStorage.removeItem('netlab-profile');
  } catch {
    /* ignore */
  }
  window.location.href = '/login.html?login=required';
}

// ─── /progress ───────────────────────────────────────────────────

// Difficulty is part of progress's primary key on the server (db.DIFFICULTIES).
// Semester 2's scope item 1.2 adds Basic/Medium/Hard; until the picker exists
// every call sends this one value, so turning the levels on is a change here
// rather than at each call site.
export const DIFFICULTY = 'basic';

export interface ProgressUpdatePayload {
  token: string;
  studentId: string;
  labId: number;
  stepsDone: number;
  totalSteps: number;
  wrongDelta?: number;
  hintsDelta?: number; // hint presses since the last save, not a running total
  elapsedSec?: number;
  completed?: boolean;
  courseId?: string;
  difficulty?: string;
  reset?: boolean; // student restarted the lab — the server clears `completed`
}

export async function saveProgress(payload: ProgressUpdatePayload): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseId: 'netlab1',
      difficulty: DIFFICULTY,
      wrongDelta: 0,
      hintsDelta: 0,
      elapsedSec: 0,
      completed: false,
      ...payload,
    }),
  });
  endSessionIfRejected(res);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// sendBeacon can't set custom headers, so the token travels in the body — same
// convention as every labN.html's pagehide handler.
export function saveProgressBeacon(payload: ProgressUpdatePayload): boolean {
  const body = new Blob(
    [
      JSON.stringify({
        courseId: 'netlab1',
        difficulty: DIFFICULTY,
        wrongDelta: 0,
        hintsDelta: 0,
        elapsedSec: 0,
        completed: false,
        ...payload,
      }),
    ],
    { type: 'application/json' },
  );
  return navigator.sendBeacon(`${API_BASE}/progress`, body);
}

export interface ProgressRow {
  course_id: string;
  lab_id: number;
  difficulty: string;
  steps_done: number;
  total_steps: number;
  wrong_count: number;
  hints_used: number;
  time_spent_sec: number;
  completed: number; // 0 | 1, as returned by SQLite
  updated_at: string;
}

export interface WeeklyActivityRow {
  day: string; // YYYY-MM-DD
  seconds: number;
}

export interface ProgressResponse {
  labs: ProgressRow[];
  weeklyActivity: WeeklyActivityRow[];
}

export async function getProgress(
  studentId: string,
  token: string,
  courseId?: string,
  difficulty?: string,
): Promise<ProgressResponse> {
  const qs = new URLSearchParams({ token });
  if (courseId) qs.set('course_id', courseId);
  // Omitted by default: a lab can hold one row per level once the picker ships,
  // and callers that want a single row per lab should ask for one level.
  if (difficulty) qs.set('difficulty', difficulty);
  const res = await fetch(`${API_BASE}/progress/${encodeURIComponent(studentId)}?${qs}`);
  endSessionIfRejected(res);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── /quiz-score ─────────────────────────────────────────────────
export interface QuizScorePayload {
  token: string;
  labId: number;
  score: number;
  maxScore: number;
  courseId?: string;
  quizKey?: string;
}

export async function saveQuizScore(payload: QuizScorePayload): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/quiz-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId: 'netlab1', quizKey: 'pretest', ...payload }),
  }).catch(() => null);
  endSessionIfRejected(res);
  if (!res || !res.ok) throw new Error('quiz-score save failed');
  return res.json();
}

// ─── /chat ───────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequestPayload {
  messages: ChatMessage[];
  system?: string;
  max_tokens?: number;
  task_type?: 'hint' | 'explain' | 'chat';
  token?: string | null; // session token — omit/null for guest chat (still works, just unattributed)
  labId?: number;
  courseId?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  task: string;
  done: boolean;
}

export async function sendChatMessage(payload: ChatRequestPayload): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId: 'netlab1', max_tokens: 150, ...payload }),
  });
  // /chat now requires a session token, so a guest gets 401 here. That is not a
  // dead session — deliberately no endSessionIfRejected(), which would bounce
  // them to a sign-in they cannot complete on a LAN address. Say what happened
  // instead of surfacing "HTTP 401" in a chat bubble.
  if (res.status === 401) {
    throw new Error('AI Tutor ใช้ได้เฉพาะผู้ที่เข้าสู่ระบบด้วยอีเมลมหาวิทยาลัย — ส่วนอื่นของ Lab ยังใช้ได้ตามปกติ');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── /health ─────────────────────────────────────────────────────
export interface HealthResponse {
  status: string;
  backend: string;
  model_ready: boolean;
  model: string;
  models: { default: string; fast: string; fallback: string };
  timestamp: string;
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
