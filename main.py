"""
NETLab AI Backend — FastAPI + OpenRouter API

Model routing is decided by select_model() and the three MODEL_* keys in .env.
The names are deliberately not repeated here: a docstring listing them drifts
the moment .env changes, and then states the wrong thing with confidence.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
import httpx, os, re, logging, sqlite3
from datetime import datetime, timezone
from dotenv import load_dotenv
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import db
import session

# Legacy path from an earlier project name. Nothing reads it today: NETLab has
# never been deployed, and deploy/DEPLOY.md puts the server at /opt/netlab. Kept
# only so a machine still holding the old file keeps working — the .env beside
# main.py, loaded next, is what actually applies.
load_dotenv("/opt/qoslab/.env")
load_dotenv()  # fallback: .env ข้าง main.py เอง (สำหรับรัน local/Windows)

# ─── Config ────────────────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL_DEFAULT      = os.getenv("MODEL_DEFAULT",  "google/gemini-2.5-flash")
MODEL_FAST         = os.getenv("MODEL_FAST",     "deepseek/deepseek-v4-flash")
MODEL_FALLBACK     = os.getenv("MODEL_FALLBACK", "qwen/qwen3-32b")
ALLOWED_ORIGINS    = os.getenv("ALLOWED_ORIGINS", "*").split(",")
GOOGLE_CLIENT_ID   = os.getenv("GOOGLE_CLIENT_ID", "")
ALLOWED_EMAIL_DOMAIN = os.getenv("ALLOWED_EMAIL_DOMAIN", "email.kmutnb.ac.th").lower()

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("netlab")

# ─── App ───────────────────────────────────────────────────
app = FastAPI(title="NETLab API", version="3.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
db.init_db()

# ─── Schemas ───────────────────────────────────────────────
# Size caps on /chat input. The frontend sends at most 9 messages (last 8 of
# history + the new one) and a lab-context system prompt of a few KB, so these
# never bind for a real student — they only stop one request from forwarding an
# arbitrarily large prompt to OpenRouter on our API key.
class Message(BaseModel):
    role: str = Field(max_length=20)
    content: str = Field(max_length=8000)  # longest real message logged so far: ~500 chars

class ChatRequest(BaseModel):
    messages: List[Message] = Field(min_length=1, max_length=20)
    system: Optional[str] = Field(default=None, max_length=20000)
    max_tokens: int = 120
    task_type: Optional[str] = None
    token: Optional[str] = None       # session token — None for guests, chat still works but isn't logged to a student
    labId: Optional[int] = None
    courseId: str = "netlab1"

class GoogleAuthRequest(BaseModel):
    credential: str

class ProgressUpdate(BaseModel):
    token: str                        # session token — server derives the real studentId from this
    studentId: str                    # cross-checked against the token's studentId, not trusted alone
    labId: int
    stepsDone: int = Field(ge=0)
    totalSteps: int = Field(ge=0)
    wrongDelta: int = Field(default=0, ge=0)
    hintsDelta: int = Field(default=0, ge=0)   # hint presses since the last save, not a running total
    elapsedSec: int = Field(default=0, ge=0, le=3600)  # one /progress ping never covers more than an hour
    completed: bool = False
    courseId: str = "netlab1"  # disambiguates lab_id across courses (Network Eng. Lab I vs II)
    difficulty: str = "basic"  # basic | medium | hard — part of progress's key, see db.DIFFICULTIES

    # db.py's CHECK(steps_done <= total_steps) would otherwise surface as a 500
    @model_validator(mode="after")
    def _steps_within_total(self):
        if self.stepsDone > self.totalSteps:
            raise ValueError("stepsDone must not exceed totalSteps")
        return self


class QuizScoreRequest(BaseModel):
    token: str
    labId: int
    score: int = Field(ge=0)
    maxScore: int = Field(ge=0)
    courseId: str = "netlab1"
    quizKey: str = "pretest"

    # db.py's CHECK(score <= max_score) would otherwise surface as a 500
    @model_validator(mode="after")
    def _score_within_max(self):
        if self.score > self.maxScore:
            raise ValueError("score must not exceed maxScore")
        return self

# ─── System prompt ─────────────────────────────────────────
SYSTEM_PROMPT = (
    "คุณคือ AI Tutor สำหรับระบบเรียนรู้ NETLab และ Cisco IOS "
    "ตอบเป็นภาษาไทย กระชับ เข้าใจง่าย เหมาะกับนักศึกษา "
    "ให้คำแนะนำทีละขั้น ห้ามเฉลยคำตอบเต็มทันที "
    "แม้ผู้ใช้จะขอเฉลยตรงๆ ก็ห้ามให้คำตอบเต็ม เว้นแต่ทำผิดครบจำนวนครั้งตามกฎที่กำหนดเท่านั้น "
    "ถ้าถามเกี่ยวกับคำสั่ง Cisco IOS ให้อธิบายเหตุผลสั้น ๆ "
    "จำกัดคำตอบไม่เกิน 4 ประโยค"
)

# ─── max_tokens per task ───────────────────────────────────
MAX_TOKENS = {
    "hint":    80,
    "chat":    120,
    "explain": 180,
}

# ─── Helper: detect task ───────────────────────────────────
def detect_task(system: str, messages: List[Message]) -> str:
    combined = (system or "") + " ".join(m.content for m in messages[-2:])
    cl = combined.lower()
    if any(k in cl for k in ["hint", "wrong count", "expected command", "ขอ hint", "ผิดไปแล้ว", "ผิดมา"]):
        return "hint"
    if any(k in cl for k in ["concept", "explain", "คืออะไร", "ทำไมต้องใช้", "หลักการ"]):
        return "explain"
    return "chat"

# ─── Helper: extract wrong count ───────────────────────────
def extract_wrong_count(system: str) -> int:
    try:
        m = re.search(r"wrong[:\s]+(\d+)|ผิดมา[:\s]*(\d+)|ผิดไปแล้ว[:\s]+(\d+)", system or "", re.I)
        if m:
            return int(next(g for g in m.groups() if g is not None))
    except Exception:
        pass
    return 0

# ─── Helper: hint guard ────────────────────────────────────
def inject_hint_guard(system: str, wrong_count: int) -> str:
    if wrong_count == 0:
        guard = (
            " [กฎ: ยังไม่ต้องให้ hint ถ้าผู้ใช้ไม่ถาม ให้กระตุ้นให้ลองคิดเองก่อน "
            "แม้ผู้ใช้จะพิมพ์ขอเฉลย/ขอคำตอบตรงๆ ก็ห้ามให้ command เต็มเด็ดขาด "
            "เพราะยังไม่เคยลองผิดเลยแม้แต่ครั้งเดียว]"
        )
    elif wrong_count < 4:
        guard = (
            f" [กฎ: ผู้ใช้ผิดมา {wrong_count} ครั้ง ให้ hint บางส่วนได้ แต่ห้ามบอก command เต็ม "
            f"แม้ผู้ใช้จะพิมพ์ขอเฉลย/ขอคำตอบตรงๆ ก็ตาม ต้องผิดครบ 4 ครั้งก่อนถึงจะเฉลยเต็มได้ "
            f"และห้ามบอกค่าที่เป็นคำตอบของขั้นตอนนั้นออกมาตรงๆ ไม่ว่าจะเป็นส่วนเดียวของคำสั่งก็ตาม "
            f"เช่น wildcard mask, subnet mask, IP address, next-hop, AS number, process ID, area, metric "
            f"ให้สอนวิธีหาคำตอบแทน เช่นบอกว่า wildcard mask หาได้จากการเอา 255 ลบแต่ละ Octet ของ subnet mask "
            f"แล้วให้ผู้ใช้คำนวณเอง ห้ามคำนวณให้เสร็จ ถ้าผู้ใช้ใส่ค่าผิดให้บอกว่าผิดตรงไหนและให้ทบทวนวิธีคิด "
            f"โดยไม่เฉลยค่าที่ถูกต้อง]"
        )
    else:
        guard = (
            f" [กฎ: ผู้ใช้ผิดมา {wrong_count} ครั้ง ครบเงื่อนไขแล้ว "
            f"ให้เฉลย command ได้เฉพาะ Step ปัจจุบันที่ผู้ใช้ติดอยู่เท่านั้น "
            f"ห้ามเฉลยหรือบอก command ของ Step ถัดไปที่ยังไม่ถึงล่วงหน้าเด็ดขาด]"
        )
    return (system or SYSTEM_PROMPT) + guard

# Models that emit a hidden <reasoning> pass before the answer. Keep this list
# in sync with .env — a model here needs a far larger max_tokens than the task
# itself implies, or it returns content=null.
REASONING_MODELS = ("deepseek", "qwen", "o1", "o3", "thinking", "reasoner")

def is_reasoning_model(model: str) -> bool:
    m = (model or "").lower()
    return any(tag in m for tag in REASONING_MODELS)

# ─── Helper: select model ──────────────────────────────────
def select_model(task: str, wrong_count: int) -> str:
    if wrong_count >= 4:
        return MODEL_FALLBACK   # ฉลาดที่สุด ใช้ตอนผิดเยอะ
    if task == "hint":
        # Named "fast" after the model first chosen for it. Measured 4 Oct 2026
        # on the Lab 5 hint prompt, deepseek-v4-flash comes back empty 8 times in
        # 10 — the budget goes on its internal reasoning — so the request falls
        # through to MODEL_DEFAULT and the student waits about 9 seconds for an
        # answer that model would have given in about 1.2. Fixing that means a
        # different MODEL_FAST in .env, not a change here.
        return MODEL_FAST
    return MODEL_DEFAULT        # ใช้ทั่วไป

# ─── Core: call OpenRouter ─────────────────────────────────
async def call_openrouter(
    messages: list,
    system: str,
    max_tokens: int,
    model: str,
) -> tuple[str, str]:
    """Returns (content, model_that_answered). The second value is not always
    the model asked for — see the fallbacks below."""
    if not OPENROUTER_API_KEY:
        raise HTTPException(500, detail="OPENROUTER_API_KEY not set in .env")

    payload = {
        "model": model,
        "messages": [{"role": "system", "content": system}] + messages,
        "max_tokens": max_tokens,
        "temperature": 0.2,
        "top_p": 0.8,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "NETLab",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        r.raise_for_status()
        data = r.json()
        content = data["choices"][0]["message"]["content"]
        answered_by = model

        # Reasoning-capable models (deepseek-v4-flash, qwen3-32b) spend the
        # budget on an internal <reasoning> field before writing content, so a
        # tight max_tokens comes back with content=null. Retry wider once.
        if not content and max_tokens < 900:
            log.warning(f"content=null model={model} tokens={max_tokens} → retry with 900")
            payload["max_tokens"] = 900
            r2 = await client.post(OPENROUTER_URL, json=payload, headers=headers)
            r2.raise_for_status()
            content = r2.json()["choices"][0]["message"]["content"]

        # Still nothing: the model is having a bad day and the student is
        # staring at a blank bubble. Ask the default model instead rather than
        # returning an empty string for the frontend to apologize over.
        if not content and model != MODEL_DEFAULT:
            log.warning(f"content still empty from {model} → falling back to {MODEL_DEFAULT}")
            payload["model"] = MODEL_DEFAULT
            payload["max_tokens"] = max(max_tokens, 300)
            r3 = await client.post(OPENROUTER_URL, json=payload, headers=headers)
            r3.raise_for_status()
            content = r3.json()["choices"][0]["message"]["content"]
            answered_by = MODEL_DEFAULT

        # The model that produced these words, which is not always the one that
        # was asked. Returning only the text is what let ai_chat_logs record a
        # model that had answered nothing, and made every latency figure drawn
        # from it describe the wrong model.
        return content, answered_by

# ─── Helper: extract student ID from email local-part ──────
def extract_student_id(local_part: str) -> Optional[str]:
    m = re.match(r"^[sS](\d+)$", local_part)
    return m.group(1) if m else None

# ─── Helper: verify session token, return its studentId or raise ───
def require_student(token: Optional[str]) -> str:
    student_id = session.verify_token(token or "")
    # A validly signed token whose student has no users row (DB restored from an
    # older backup, or replaced) would hit quiz_attempts' FOREIGN KEY and 500 —
    # treat it as an expired session instead, so signing in again recreates the row.
    if not student_id or not db.get_user(student_id):
        raise HTTPException(401, detail="Session หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่")
    return student_id

# ─── Endpoint: /auth/google ─────────────────────────────────
@app.post("/auth/google")
async def auth_google(req: GoogleAuthRequest):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(500, detail="GOOGLE_CLIENT_ID not set in .env")

    try:
        # clock_skew_in_seconds defaults to 0 in google-auth, so even a 1-second
        # difference between this server's clock and Google's rejects the token
        # with "Token used too early" — 10s tolerates normal drift without
        # meaningfully weakening the check.
        payload = google_id_token.verify_oauth2_token(
            req.credential, google_requests.Request(), GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except ValueError as e:
        raise HTTPException(401, detail=f"Invalid Google token: {str(e)}")

    email = (payload.get("email") or "").lower()
    if not payload.get("email_verified"):
        raise HTTPException(403, detail="อีเมลนี้ยังไม่ได้ยืนยันกับ Google")

    local_part, _, domain = email.partition("@")
    if domain != ALLOWED_EMAIL_DOMAIN:
        raise HTTPException(
            403,
            detail=f"อนุญาตเฉพาะอีเมลนักศึกษา @{ALLOWED_EMAIL_DOMAIN} เท่านั้น",
        )

    student_id = extract_student_id(local_part)
    if not student_id:
        raise HTTPException(403, detail="รูปแบบอีเมลไม่ตรงกับรหัสนักศึกษา (คาดว่าเป็น s ตามด้วยรหัสนักศึกษา)")

    name = payload.get("name") or email
    picture = payload.get("picture")
    try:
        db.upsert_user(student_id, email, name, picture)
    except sqlite3.IntegrityError:
        # users.email is UNIQUE, so an email already bound to a different
        # student_id fails here. Login is the worst place to surface a raw 500,
        # and the student can do nothing about it on their own.
        log.error(f"upsert_user conflict: student_id={student_id} email={email}")
        raise HTTPException(409, detail="อีเมลนี้ถูกผูกกับรหัสนักศึกษาอื่นในระบบแล้ว กรุณาติดต่อผู้สอน")

    return {
        "ok": True,
        "token": session.issue_token(student_id),
        "profile": {
            "name": name,
            "email": email,
            "studentId": student_id,
            "picture": picture,
        },
    }

# ─── Endpoint: /progress ────────────────────────────────────
@app.post("/progress")
async def save_progress(req: ProgressUpdate):
    token_student_id = require_student(req.token)
    if token_student_id != req.studentId:
        raise HTTPException(403, detail="studentId ไม่ตรงกับ session token")
    if req.difficulty not in db.DIFFICULTIES:
        raise HTTPException(400, detail="difficulty ต้องเป็น %s" % ", ".join(db.DIFFICULTIES))
    db.upsert_progress(
        token_student_id, req.labId, req.stepsDone, req.totalSteps,
        req.wrongDelta, req.elapsedSec, req.completed,
        course_id=req.courseId, difficulty=req.difficulty, hints_used=req.hintsDelta,
    )
    return {"ok": True}

@app.get("/progress/{student_id}")
async def read_progress(student_id: str, token: str, course_id: str | None = None,
                        difficulty: str | None = None):
    token_student_id = require_student(token)
    if token_student_id != student_id:
        raise HTTPException(403, detail="token ไม่ตรงกับ studentId ที่ขอดู")
    if difficulty is not None and difficulty not in db.DIFFICULTIES:
        raise HTTPException(400, detail="difficulty ต้องเป็น %s" % ", ".join(db.DIFFICULTIES))
    return {
        "labs": db.get_progress_for_student(student_id, course_id=course_id,
                                            difficulty=difficulty),
        "weeklyActivity": db.get_weekly_activity(student_id),
    }

# ─── Endpoint: /quiz-score ───────────────────────────────────
@app.post("/quiz-score")
async def save_quiz_score(req: QuizScoreRequest):
    student_id = require_student(req.token)
    db.save_quiz_attempt(
        student_id, req.labId, req.score, req.maxScore,
        course_id=req.courseId, quiz_key=req.quizKey,
    )
    return {"ok": True}

# ─── Endpoint: /chat ───────────────────────────────────────
@app.post("/chat")
async def chat(req: ChatRequest):
    # Every call spends our OpenRouter credit, so it has to belong to a signed-in
    # student. There was no check here at all: on localhost that cost nothing,
    # but deploy/nginx-netlab.conf publishes /api/, and an unauthenticated proxy
    # to a paid model is the kind of thing that gets found by scanners within
    # days. CORS does not help — it only restrains browsers, not curl.
    #
    # Consequence worth knowing: LAN guest mode can no longer use the tutor. A
    # guest has no token by design (Google cannot authorise a raw private IP as
    # an origin), and that mode exists only for showing classmates the labs on
    # the same Wi-Fi. The labs themselves still work for them.
    student_id = require_student(req.token)
    system_prompt = req.system or SYSTEM_PROMPT
    wrong_count   = extract_wrong_count(system_prompt)
    task          = req.task_type or detect_task(system_prompt, req.messages)
    model         = select_model(task, wrong_count)
    max_tokens    = MAX_TOKENS.get(task, 120)
    # Reasoning models spend tokens on an internal <reasoning> field before
    # writing the answer, so the task budget alone truncates them mid-thought
    # and content comes back null (finish_reason "length"). Measured on the
    # tutor hint prompt deepseek-v4-flash produced nothing at 900/1200/1600 and
    # answered at 2000, which is where this number came from. The 4 Oct 2026
    # measurement found it returns empty 8 times in 10 even at 2000, so treat
    # this as headroom that helps some models rather than a fix for that one.
    # Plain models keep the small budget the task needs, so hints stay short.
    if is_reasoning_model(model):
        max_tokens = max(max_tokens, 2000)
    system_prompt = inject_hint_guard(system_prompt, wrong_count)

    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    log.info(f"task={task} model={model} wrong={wrong_count} tokens={max_tokens}")

    last_user_msg = next((m.content for m in reversed(req.messages) if m.role == "user"), "")

    def log_it(reply: str, used_model: str):
        try:
            db.log_chat(
                student_id, last_user_msg, reply,
                course_id=req.courseId, lab_id=req.labId,
                task_type=task, model_used=used_model, wrong_count_at_time=wrong_count,
            )
        except Exception as e:
            log.warning(f"log_chat failed: {e}")

    try:
        reply, answered_by = await call_openrouter(messages, system_prompt, max_tokens, model)
        if answered_by != model:
            log.warning(f"asked {model}, answered by {answered_by} — student waited for both")
        log_it(reply, answered_by)
        return {
            "content": reply,
            "model": answered_by,
            "task": task,
            "done": True,
        }
    except httpx.TimeoutException:
        # fallback ไป MODEL_FAST ถ้า timeout
        log.warning(f"Timeout {model} → fallback {MODEL_FAST}")
        try:
            reply, answered_by = await call_openrouter(messages, system_prompt, 80, MODEL_FAST)
            log_it(reply, answered_by)
            return {"content": reply, "model": answered_by, "task": task, "done": True}
        except Exception as e2:
            raise HTTPException(504, detail=f"Timeout: {str(e2)}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(500, detail=str(e))

# ─── Endpoint: /health ─────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "backend": "openrouter",
        "model_ready": bool(OPENROUTER_API_KEY),
        "model": MODEL_DEFAULT,
        "models": {
            "default":  MODEL_DEFAULT,
            "fast":     MODEL_FAST,
            "fallback": MODEL_FALLBACK,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# ─── Endpoint: /models ─────────────────────────────────────
@app.get("/models")
async def list_models():
    return {
        "default":  MODEL_DEFAULT,
        "fast":     MODEL_FAST,
        "fallback": MODEL_FALLBACK,
    }
