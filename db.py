"""
NETLab progress database — SQLite, single file, no ORM.
Tracks per-student per-course per-lab progress, daily practice time, quiz
scores and AI Tutor chat history so dashboard.html can show real data and
the DB matches what section 2.4.9 of the thesis proposal (ทก.01) promises:
user data, lab progress, quiz scores, and AI Tutor interaction history.

course_id disambiguates lab_id across courses (e.g. 'netlab1' for Network Eng.
Lab I, this term's labnetwork1/ content; 'netlab2' reserved for Network Eng.
Lab II next term's labnetwork2/ content, not built yet) — without it, two
different courses' "Lab 4" would collide on the same primary key.
"""

import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "netlab.db")

# Every row saved before course_id existed belongs to this term's only course.
DEFAULT_COURSE_ID = "netlab1"

# activity.day is the student's calendar day, so it is cut at Thai midnight, not
# UTC midnight (07:00 Thai) — otherwise practice before 7am lands on yesterday's
# bar of the dashboard graph. Fixed offset: Thailand has no DST, and this avoids
# needing tzdata on Windows. Rows written before 2026-10-02 used UTC days.
LOCAL_TZ = timezone(timedelta(hours=7))

# Semester 2's scope item 1.2: Basic/Medium/Hard differ in topology size, hint
# quota and time limit. Part of progress's primary key, not a plain column — the
# same student retrying a lab at another level is a separate attempt, and keyed
# without it the second attempt UPDATEs over the first.
DIFFICULTIES = ("basic", "medium", "hard")
DEFAULT_DIFFICULTY = "basic"


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def init_db():
    with _connect() as conn:
        _migrate_progress_table(conn)
        # users first — quiz_attempts/ai_chat_logs FK-reference it.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                student_id    TEXT PRIMARY KEY,
                email         TEXT NOT NULL UNIQUE,
                name          TEXT NOT NULL,
                picture       TEXT,
                role          TEXT NOT NULL DEFAULT 'student',
                created_at    TEXT NOT NULL,
                last_login_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS progress (
                student_id     TEXT NOT NULL,
                course_id      TEXT NOT NULL DEFAULT 'netlab1',
                lab_id         INTEGER NOT NULL,
                difficulty     TEXT NOT NULL DEFAULT 'basic',
                steps_done     INTEGER NOT NULL DEFAULT 0 CHECK(steps_done >= 0),
                total_steps    INTEGER NOT NULL DEFAULT 0 CHECK(total_steps >= 0),
                wrong_count    INTEGER NOT NULL DEFAULT 0 CHECK(wrong_count >= 0),
                hints_used     INTEGER NOT NULL DEFAULT 0 CHECK(hints_used >= 0),
                time_spent_sec INTEGER NOT NULL DEFAULT 0 CHECK(time_spent_sec >= 0),
                completed      INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
                started_at     TEXT NOT NULL,
                updated_at     TEXT NOT NULL,
                PRIMARY KEY (student_id, course_id, lab_id, difficulty),
                CHECK(steps_done <= total_steps),
                CHECK(difficulty IN ('basic', 'medium', 'hard'))
            )
        """)
        # activity stays course-agnostic on purpose — it powers the dashboard's
        # single "practice time per day" graph, not a per-course breakdown.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS activity (
                student_id TEXT NOT NULL,
                day        TEXT NOT NULL,
                seconds    INTEGER NOT NULL DEFAULT 0 CHECK(seconds >= 0),
                PRIMARY KEY (student_id, day)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS quiz_attempts (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id  TEXT NOT NULL REFERENCES users(student_id),
                course_id   TEXT NOT NULL DEFAULT 'netlab1',
                lab_id      INTEGER NOT NULL,
                quiz_key    TEXT NOT NULL DEFAULT 'pretest',
                score       INTEGER NOT NULL CHECK(score >= 0),
                max_score   INTEGER NOT NULL CHECK(max_score >= 0),
                attempt_no  INTEGER NOT NULL DEFAULT 1,
                created_at  TEXT NOT NULL,
                CHECK(score <= max_score)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ai_chat_logs (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id          TEXT REFERENCES users(student_id),
                course_id           TEXT NOT NULL DEFAULT 'netlab1',
                lab_id              INTEGER,
                task_type           TEXT,
                model_used          TEXT,
                user_message        TEXT NOT NULL,
                ai_response         TEXT NOT NULL,
                wrong_count_at_time INTEGER,
                created_at          TEXT NOT NULL
            )
        """)
        # quiz_attempts/ai_chat_logs only auto-index their AUTOINCREMENT id — every
        # real query filters by student_id instead, which would otherwise be a full
        # table scan once these grow past a handful of rows per student.
        conn.execute("CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id, course_id, lab_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_logs_student ON ai_chat_logs(student_id, course_id)")
        # runs last: it touches every table above, so they must all exist first.
        _migrate_naive_timestamps(conn)


def _migrate_naive_timestamps(conn):
    """Rows written before this module moved to timezone-aware datetimes carry
    no UTC offset, because datetime.utcnow().isoformat() omits one. JavaScript's
    Date() reads an offset-less string as LOCAL time, so in Thailand those rows
    render 7 hours away from rows written since, and the two spellings also sort
    differently as text. The old values genuinely are UTC, so stamping the offset
    on is a correction rather than a guess. Idempotent: the WHERE clause skips
    anything that already carries one."""
    for table, cols in (("progress", ("started_at", "updated_at")),
                        ("users", ("created_at", "last_login_at")),
                        ("quiz_attempts", ("created_at",)),
                        ("ai_chat_logs", ("created_at",))):
        for col in cols:
            conn.execute(f"""
                UPDATE {table} SET {col} = {col} || '+00:00'
                WHERE {col} IS NOT NULL
                  AND {col} NOT LIKE '%+%'
                  AND {col} NOT LIKE '%Z'
            """)


def _migrate_progress_table(conn):
    """One-time, idempotent migration that brings an older `progress` table up
    to the current schema. Handles every earlier shape this table has had: no
    course_id, no CHECK constraints, and no difficulty/hints_used. Safe to run on
    every startup — it no-ops once `difficulty` is part of the primary key.

    The table is rebuilt rather than altered because SQLite cannot add a column
    to a PRIMARY KEY in place. Nothing is dropped: absent columns are backfilled
    (course_id, difficulty, hints_used) and legacy values are clamped into the
    new CHECK bounds before the old table goes away, so one dirty pre-existing
    row cannot abort the migration and lose every other row with it."""
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='progress'"
    ).fetchone()
    if row is None:
        return  # fresh DB — init_db()'s CREATE TABLE builds the current schema
    if "lab_id, difficulty)" in row["sql"]:
        return  # already current

    cols = [r["name"] for r in conn.execute("PRAGMA table_info(progress)").fetchall()]
    course_id_expr = "course_id" if "course_id" in cols else f"'{DEFAULT_COURSE_ID}'"
    # Rows predating difficulty were all played at the one level that existed.
    difficulty_expr = "difficulty" if "difficulty" in cols else f"'{DEFAULT_DIFFICULTY}'"
    hints_expr = "MAX(hints_used, 0)" if "hints_used" in cols else "0"

    conn.execute("ALTER TABLE progress RENAME TO progress_pre_difficulty")
    conn.execute("""
        CREATE TABLE progress (
            student_id     TEXT NOT NULL,
            course_id      TEXT NOT NULL DEFAULT 'netlab1',
            lab_id         INTEGER NOT NULL,
            difficulty     TEXT NOT NULL DEFAULT 'basic',
            steps_done     INTEGER NOT NULL DEFAULT 0 CHECK(steps_done >= 0),
            total_steps    INTEGER NOT NULL DEFAULT 0 CHECK(total_steps >= 0),
            wrong_count    INTEGER NOT NULL DEFAULT 0 CHECK(wrong_count >= 0),
            hints_used     INTEGER NOT NULL DEFAULT 0 CHECK(hints_used >= 0),
            time_spent_sec INTEGER NOT NULL DEFAULT 0 CHECK(time_spent_sec >= 0),
            completed      INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
            started_at     TEXT NOT NULL,
            updated_at     TEXT NOT NULL,
            PRIMARY KEY (student_id, course_id, lab_id, difficulty),
            CHECK(steps_done <= total_steps),
            CHECK(difficulty IN ('basic', 'medium', 'hard'))
        )
    """)
    conn.execute(f"""
        INSERT INTO progress (student_id, course_id, lab_id, difficulty, steps_done,
                               total_steps, wrong_count, hints_used, time_spent_sec,
                               completed, started_at, updated_at)
        SELECT student_id,
               {course_id_expr},
               lab_id,
               {difficulty_expr},
               MIN(MAX(steps_done, 0), MAX(total_steps, 0)),
               MAX(total_steps, 0),
               MAX(wrong_count, 0),
               {hints_expr},
               MAX(time_spent_sec, 0),
               CASE WHEN completed = 1 THEN 1 ELSE 0 END,
               started_at,
               updated_at
        FROM progress_pre_difficulty
    """)
    conn.execute("DROP TABLE progress_pre_difficulty")


@contextmanager
def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ─── Users ───────────────────────────────────────────────────
def upsert_user(student_id, email, name, picture=None, role="student"):
    now = _now_iso()
    with _connect() as conn:
        existing = conn.execute(
            "SELECT student_id FROM users WHERE student_id=?", (student_id,)
        ).fetchone()
        if existing:
            conn.execute("""
                UPDATE users SET email=?, name=?, picture=?, last_login_at=?
                WHERE student_id=?
            """, (email, name, picture, now, student_id))
        else:
            conn.execute("""
                INSERT INTO users (student_id, email, name, picture, role, created_at, last_login_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (student_id, email, name, picture, role, now, now))


def get_user(student_id):
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE student_id=?", (student_id,)).fetchone()
        return dict(row) if row else None


# ─── Progress / activity ────────────────────────────────────
def upsert_progress(student_id, lab_id, steps_done, total_steps, wrong_count, elapsed_sec, completed,
                     course_id=DEFAULT_COURSE_ID, difficulty=DEFAULT_DIFFICULTY, hints_used=0,
                     reset=False):
    """`wrong_count`, `elapsed_sec` and `hints_used` are deltas the server adds to
    the stored totals; `steps_done`/`total_steps` are absolute. `difficulty` is
    part of the key, so each level keeps its own row and its own history."""
    if difficulty not in DIFFICULTIES:
        raise ValueError("unknown difficulty: %r" % (difficulty,))
    # `completed` is sticky on an ordinary save — finishing a lab once stays
    # true. A reset is the one case that clears it, because a row reporting no
    # steps done and still finished contradicts itself.
    now = _now_iso()
    today = datetime.now(LOCAL_TZ).strftime("%Y-%m-%d")
    with _connect() as conn:
        existing = conn.execute(
            "SELECT * FROM progress WHERE student_id=? AND course_id=? AND lab_id=? AND difficulty=?",
            (student_id, course_id, lab_id, difficulty)
        ).fetchone()
        if existing:
            conn.execute("""
                UPDATE progress SET
                    steps_done=?, total_steps=?, wrong_count=wrong_count+?,
                    hints_used=hints_used+?, time_spent_sec=time_spent_sec+?,
                    completed=?, updated_at=?
                WHERE student_id=? AND course_id=? AND lab_id=? AND difficulty=?
            """, (steps_done, total_steps, wrong_count, hints_used, elapsed_sec,
                  1 if completed else (0 if reset else existing["completed"]), now,
                  student_id, course_id, lab_id, difficulty))
        else:
            conn.execute("""
                INSERT INTO progress
                    (student_id, course_id, lab_id, difficulty, steps_done, total_steps,
                     wrong_count, hints_used, time_spent_sec, completed, started_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (student_id, course_id, lab_id, difficulty, steps_done, total_steps,
                  wrong_count, hints_used, elapsed_sec, 1 if completed else 0, now, now))

        conn.execute("""
            INSERT INTO activity (student_id, day, seconds) VALUES (?, ?, ?)
            ON CONFLICT(student_id, day) DO UPDATE SET seconds = seconds + excluded.seconds
        """, (student_id, today, elapsed_sec))


def get_progress_for_student(student_id, course_id=None, difficulty=None):
    query = ("SELECT course_id, lab_id, difficulty, steps_done, total_steps, wrong_count, "
              "hints_used, time_spent_sec, completed, updated_at FROM progress WHERE student_id=?")
    params = [student_id]
    if course_id:
        query += " AND course_id=?"
        params.append(course_id)
    if difficulty:
        query += " AND difficulty=?"
        params.append(difficulty)
    # Ordered so a caller keeping one row per lab_id lands on a predictable level
    # rather than whatever the table happened to return. Dashboard.tsx still does
    # exactly that, so it needs revisiting when the level picker ships.
    query += " ORDER BY course_id, lab_id, difficulty"
    with _connect() as conn:
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]


def get_weekly_activity(student_id):
    with _connect() as conn:
        rows = conn.execute(
            "SELECT day, seconds FROM activity WHERE student_id=? ORDER BY day", (student_id,)
        ).fetchall()
        by_day = {r["day"]: r["seconds"] for r in rows}

    today = datetime.now(LOCAL_TZ).date()
    out = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        out.append({"day": key, "seconds": by_day.get(key, 0)})
    return out


# ─── Quiz attempts (Pre-test scores) ────────────────────────
def save_quiz_attempt(student_id, lab_id, score, max_score, course_id=DEFAULT_COURSE_ID, quiz_key="pretest"):
    now = _now_iso()
    with _connect() as conn:
        prev = conn.execute("""
            SELECT COUNT(*) AS n FROM quiz_attempts
            WHERE student_id=? AND course_id=? AND lab_id=? AND quiz_key=?
        """, (student_id, course_id, lab_id, quiz_key)).fetchone()
        attempt_no = prev["n"] + 1
        conn.execute("""
            INSERT INTO quiz_attempts
                (student_id, course_id, lab_id, quiz_key, score, max_score, attempt_no, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (student_id, course_id, lab_id, quiz_key, score, max_score, attempt_no, now))


def get_quiz_scores_for_student(student_id, course_id=None):
    query = ("SELECT course_id, lab_id, quiz_key, score, max_score, attempt_no, created_at "
             "FROM quiz_attempts WHERE student_id=?")
    params = [student_id]
    if course_id:
        query += " AND course_id=?"
        params.append(course_id)
    query += " ORDER BY course_id, lab_id, created_at"
    with _connect() as conn:
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]


# ─── AI Tutor chat logs ──────────────────────────────────────
def log_chat(student_id, user_message, ai_response, course_id=DEFAULT_COURSE_ID,
             lab_id=None, task_type=None, model_used=None, wrong_count_at_time=None):
    now = _now_iso()
    with _connect() as conn:
        conn.execute("""
            INSERT INTO ai_chat_logs
                (student_id, course_id, lab_id, task_type, model_used,
                 user_message, ai_response, wrong_count_at_time, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (student_id, course_id, lab_id, task_type, model_used,
              user_message, ai_response, wrong_count_at_time, now))
