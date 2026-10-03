"""
NETLab database backup — run daily via cron (prod) or Task Scheduler (local dev).

Uses sqlite3's built-in backup API instead of a plain file copy: netlab.db runs in
WAL mode, so copying the .db file alone while the server is live can miss
recently-committed data still sitting in the -wal sidecar file. The backup API
takes a consistent snapshot regardless of WAL state.

Usage:
    python backup_db.py

Cron (prod, daily at 03:00):
    0 3 * * * cd /opt/qoslab && /usr/bin/python3 backup_db.py >> backups/backup.log 2>&1

Windows Task Scheduler (local dev): create a daily trigger that runs
    python E:\\Project\\backup_db.py
"""

import os
import sqlite3
from datetime import datetime, timezone

import db as db_module

BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups")
KEEP_LAST_N = 30  # ~1 month of daily backups


def backup_once():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    dest_path = os.path.join(BACKUP_DIR, f"netlab-{stamp}.db")

    src = sqlite3.connect(db_module.DB_PATH)
    dest = sqlite3.connect(dest_path)
    with dest:
        src.backup(dest)
    src.close()
    dest.close()

    size_kb = os.path.getsize(dest_path) / 1024
    print(f"[backup_db] wrote {dest_path} ({size_kb:.1f} KB)")
    return dest_path


def prune_old_backups():
    files = sorted(
        f for f in os.listdir(BACKUP_DIR)
        if f.startswith("netlab-") and f.endswith(".db")
    )
    excess = len(files) - KEEP_LAST_N
    for f in files[:max(excess, 0)]:
        path = os.path.join(BACKUP_DIR, f)
        os.remove(path)
        print(f"[backup_db] pruned old backup {path}")


if __name__ == "__main__":
    backup_once()
    prune_old_backups()
