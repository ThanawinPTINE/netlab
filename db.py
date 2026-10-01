"""
QoSLab progress database — SQLite, single file, no ORM.
Tracks per-student per-course per-lab progress and daily practice time so
dashboard.html can show real data instead of mock data.

course_id disambiguates lab_id across courses (e.g. 'netlab1' for Network Eng.
Lab I, this term's labnetwork1/ content; 'netlab2' reserved for Network Eng.
Lab II next term's labnetwork2/ content, not built yet) — without it, two
different courses' "Lab 4" would collide on the same primary key.
"""

import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qoslab.db")

# Every row saved before course_id existed belongs to this term's only course.
DEFAULT_COURSE_ID = "netlab1"


def init_db():
    with _connect() as conn:
        _migrate_progress_table(conn)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS progress (
                student_id     TEXT NOT NULL,
                course_id      TEXT NOT NULL DEFAULT 'netlab1',
                lab_id         INTEGER NOT NULL,
                steps_done     INTEGER NOT NULL DEFAULT 0,
                total_steps    INTEGER NOT NULL DEFAULT 0,
                wrong_count    INTEGER NOT NULL DEFAULT 0,
                time_spent_sec INTEGER NOT NULL DEFAULT 0,
                completed      INTEGER NOT NULL DEFAULT 0,
                started_at     TEXT NOT NULL,
                updated_at     TEXT NOT NULL,
                PRIMARY KEY (student_id, course_id, lab_id)
            )
        """)
        # activity stays course-agnostic on purpose — it powers the dashboard's
        # single "practice time per day" graph, not a per-course breakdown.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS activity (
                student_id TEXT NOT NULL,
                day        TEXT NOT NULL,
                seconds    INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (student_id, day)
            )
        """)


def _migrate_progress_table(conn):
    """One-time, idempotent migration from the old (student_id, lab_id) PK
    schema to (student_id, course_id, lab_id). Safe to run on every startup:
    no-ops once the table already has course_id. Never drops data — old rows
    are backfilled with DEFAULT_COURSE_ID before the old table is replaced."""
    cols = [r["name"] for r in conn.execute("PRAGMA table_info(progress)").fetchall()]
    if not cols or "course_id" in cols:
        return  # fresh DB (table doesn't exist yet) or already migrated

    conn.execute("ALTER TABLE progress RENAME TO progress_pre_course_id")
    conn.execute("""
        CREATE TABLE progress (
            student_id     TEXT NOT NULL,
            course_id      TEXT NOT NULL DEFAULT 'netlab1',
            lab_id         INTEGER NOT NULL,
            steps_done     INTEGER NOT NULL DEFAULT 0,
            total_steps    INTEGER NOT NULL DEFAULT 0,
            wrong_count    INTEGER NOT NULL DEFAULT 0,
            time_spent_sec INTEGER NOT NULL DEFAULT 0,
            completed      INTEGER NOT NULL DEFAULT 0,
            started_at     TEXT NOT NULL,
            updated_at     TEXT NOT NULL,
            PRIMARY KEY (student_id, course_id, lab_id)
        )
    """)
    conn.execute(f"""
        INSERT INTO progress (student_id, course_id, lab_id, steps_done, total_steps,
                               wrong_count, time_spent_sec, completed, started_at, updated_at)
        SELECT student_id, '{DEFAULT_COURSE_ID}', lab_id, steps_done, total_steps,
               wrong_count, time_spent_sec, completed, started_at, updated_at
        FROM progress_pre_course_id
    """)
    conn.execute("DROP TABLE progress_pre_course_id")


@contextmanager
def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def upsert_progress(student_id, lab_id, steps_done, total_steps, wrong_count, elapsed_sec, completed,
                     course_id=DEFAULT_COURSE_ID):
    now = datetime.utcnow().isoformat()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    with _connect() as conn:
        existing = conn.execute(
            "SELECT * FROM progress WHERE student_id=? AND course_id=? AND lab_id=?",
            (student_id, course_id, lab_id)
        ).fetchone()
        if existing:
            conn.execute("""
                UPDATE progress SET
                    steps_done=?, total_steps=?, wrong_count=wrong_count+?,
                    time_spent_sec=time_spent_sec+?, completed=?, updated_at=?
                WHERE student_id=? AND course_id=? AND lab_id=?
            """, (steps_done, total_steps, wrong_count, elapsed_sec,
                  1 if completed else existing["completed"], now, student_id, course_id, lab_id))
        else:
            conn.execute("""
                INSERT INTO progress
                    (student_id, course_id, lab_id, steps_done, total_steps, wrong_count,
                     time_spent_sec, completed, started_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (student_id, course_id, lab_id, steps_done, total_steps, wrong_count,
                  elapsed_sec, 1 if completed else 0, now, now))

        conn.execute("""
            INSERT INTO activity (student_id, day, seconds) VALUES (?, ?, ?)
            ON CONFLICT(student_id, day) DO UPDATE SET seconds = seconds + excluded.seconds
        """, (student_id, today, elapsed_sec))


def get_progress_for_student(student_id, course_id=None):
    query = ("SELECT course_id, lab_id, steps_done, total_steps, wrong_count, "
              "time_spent_sec, completed, updated_at FROM progress WHERE student_id=?")
    params = [student_id]
    if course_id:
        query += " AND course_id=?"
        params.append(course_id)
    query += " ORDER BY course_id, lab_id"
    with _connect() as conn:
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]


def get_weekly_activity(student_id):
    with _connect() as conn:
        rows = conn.execute(
            "SELECT day, seconds FROM activity WHERE student_id=? ORDER BY day", (student_id,)
        ).fetchall()
        by_day = {r["day"]: r["seconds"] for r in rows}

    today = datetime.utcnow().date()
    out = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        out.append({"day": key, "seconds": by_day.get(key, 0)})
    return out
