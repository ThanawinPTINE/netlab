"""
QoSLab AI Backend — FastAPI + OpenRouter API
Model routing:
  hint/เร็ว  → deepseek/deepseek-v4-flash
  chat       → google/gemini-2.5-flash
  fallback   → qwen/qwen3-32b (ผิดเยอะ หรือคำถามยาก)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx, os, re, logging
from datetime import datetime
from dotenv import load_dotenv
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import db

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
log = logging.getLogger("qoslab")

# ─── App ───────────────────────────────────────────────────
app = FastAPI(title="QoSLab API", version="3.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
db.init_db()

# ─── Schemas ───────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    system: Optional[str] = None
    max_tokens: int = 120
    task_type: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    credential: str

class ProgressUpdate(BaseModel):
    studentId: str
    labId: int
    stepsDone: int
    totalSteps: int
    wrongDelta: int = 0
    elapsedSec: int = 0
    completed: bool = False
    courseId: str = "netlab1"  # disambiguates lab_id across courses (Network Eng. Lab I vs II)

# ─── System prompt ─────────────────────────────────────────
QOS_SYSTEM = (
    "คุณคือ AI Tutor สำหรับระบบเรียนรู้ QoS และ Cisco IOS "
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
    return (system or QOS_SYSTEM) + guard

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
        return MODEL_FALLBACK   # qwen3-32b —똑똑สุด ใช้ตอนผิดเยอะ
    if task == "hint":
        return MODEL_FAST       # deepseek — เร็วสุด ใช้ตอบ hint
    return MODEL_DEFAULT        # gemini-2.5-flash — สมดุล ใช้ทั่วไป

# ─── Core: call OpenRouter ─────────────────────────────────
async def call_openrouter(
    messages: list,
    system: str,
    max_tokens: int,
    model: str,
) -> str:
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
        "X-Title": "QoSLab",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        r.raise_for_status()
        data = r.json()
        content = data["choices"][0]["message"]["content"]

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

        return content

# ─── Helper: extract student ID from email local-part ──────
def extract_student_id(local_part: str) -> Optional[str]:
    m = re.match(r"^[sS](\d+)$", local_part)
    return m.group(1) if m else None

# ─── Endpoint: /auth/google ─────────────────────────────────
@app.post("/auth/google")
async def auth_google(req: GoogleAuthRequest):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(500, detail="GOOGLE_CLIENT_ID not set in .env")

    try:
        payload = google_id_token.verify_oauth2_token(
            req.credential, google_requests.Request(), GOOGLE_CLIENT_ID
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

    return {
        "ok": True,
        "profile": {
            "name": payload.get("name") or email,
            "email": email,
            "studentId": student_id,
            "picture": payload.get("picture"),
        },
    }

# ─── Endpoint: /progress ────────────────────────────────────
@app.post("/progress")
async def save_progress(req: ProgressUpdate):
    db.upsert_progress(
        req.studentId, req.labId, req.stepsDone, req.totalSteps,
        req.wrongDelta, req.elapsedSec, req.completed,
        course_id=req.courseId,
    )
    return {"ok": True}

@app.get("/progress/{student_id}")
async def read_progress(student_id: str, course_id: str | None = None):
    return {
        "labs": db.get_progress_for_student(student_id, course_id=course_id),
        "weeklyActivity": db.get_weekly_activity(student_id),
    }

# ─── Endpoint: /chat ───────────────────────────────────────
@app.post("/chat")
async def chat(req: ChatRequest):
    system_prompt = req.system or QOS_SYSTEM
    wrong_count   = extract_wrong_count(system_prompt)
    task          = req.task_type or detect_task(system_prompt, req.messages)
    model         = select_model(task, wrong_count)
    max_tokens    = MAX_TOKENS.get(task, 120)
    # Reasoning models spend tokens on an internal <reasoning> field before
    # writing the answer, so the task budget alone truncates them mid-thought
    # and content comes back null (finish_reason "length"). Measured on the
    # tutor hint prompt: deepseek-v4-flash produced nothing at 900/1200/1600
    # and only answered at 2000. Give any such model real headroom — and give
    # plain models the small budget the task actually needs, so hints stay short.
    if is_reasoning_model(model):
        max_tokens = max(max_tokens, 2000)
    system_prompt = inject_hint_guard(system_prompt, wrong_count)

    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    log.info(f"task={task} model={model} wrong={wrong_count} tokens={max_tokens}")

    try:
        reply = await call_openrouter(messages, system_prompt, max_tokens, model)
        return {
            "content": reply,
            "model": model,
            "task": task,
            "done": True,
        }
    except httpx.TimeoutException:
        # fallback ไป MODEL_FAST ถ้า timeout
        log.warning(f"Timeout {model} → fallback {MODEL_FAST}")
        try:
            reply = await call_openrouter(messages, system_prompt, 80, MODEL_FAST)
            return {"content": reply, "model": MODEL_FAST, "task": task, "done": True}
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
        "timestamp": datetime.utcnow().isoformat(),
    }

# ─── Endpoint: /models ─────────────────────────────────────
@app.get("/models")
async def list_models():
    return {
        "default":  MODEL_DEFAULT,
        "fast":     MODEL_FAST,
        "fallback": MODEL_FALLBACK,
    }
