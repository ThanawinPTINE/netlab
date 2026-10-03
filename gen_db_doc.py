# -*- coding: utf-8 -*-
"""Generate the database documentation page from the live schema.

Everything structural — table names, columns, types, NOT NULL, defaults, CHECK
constraints, primary keys, foreign keys, indexes — is read out of netlab.db with
PRAGMA, so the page cannot drift from the database the way the hand-written
version did (it still described 2 tables after the schema grew to 5). Only the
Thai prose is authored here, and every column must have a description or the
script refuses to write the file.
"""
import io
import os
import re
import sqlite3
import sys
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding='utf-8')

import pathlib
HERE = pathlib.Path(__file__).resolve().parent
DB = str(HERE / 'netlab.db')
# public/ is the static file root; the database stays outside it (CLAUDE.md)
OUT = str(HERE / 'public' / 'เอกสาร_โครงสร้าง_DB.html')
BKK = timezone(timedelta(hours=7))

ORDER = ['users', 'progress', 'activity', 'quiz_attempts', 'ai_chat_logs']

PURPOSE = {
    'users': 'นักศึกษาและอาจารย์ที่เข้าสู่ระบบด้วยอีเมลมหาวิทยาลัย หนึ่งแถวต่อหนึ่งคน',
    'progress': 'ความคืบหน้าสะสม หนึ่งแถวต่อ นักศึกษา × Lab × ระดับความยาก',
    'activity': 'เวลาฝึกรายวัน สำหรับกราฟ Practice Hours ย้อนหลัง 7 วัน หนึ่งแถวต่อ นักศึกษา × วัน',
    'quiz_attempts': 'ผลการทำแบบทดสอบ เก็บทุกครั้งที่ส่งคำตอบ ไม่ใช่เฉพาะครั้งที่ผ่าน',
    'ai_chat_logs': 'ประวัติการโต้ตอบกับ AI Tutor หนึ่งแถวต่อหนึ่งคำถาม-คำตอบ',
}

DESC = {
 'users': {
  'student_id': 'รหัสนักศึกษา แยกมาจากหน้าอีเมลโดยตัดตัว s ออก เช่น s6606022610021 → 6606022610021',
  'email': 'อีเมลมหาวิทยาลัยที่ใช้เข้าสู่ระบบ บังคับไม่ซ้ำ',
  'name': 'ชื่อ-นามสกุล ดึงจากบัญชี Google',
  'picture': 'URL รูปโปรไฟล์จาก Google อาจว่างถ้าบัญชีไม่มีรูป',
  'role': "สิทธิ์การใช้งาน student หรือ teacher — การเข้าสู่ระบบซ้ำไม่ทับค่านี้ สิทธิ์ที่ตั้งไว้จึงไม่หาย",
  'created_at': 'เวลาที่เข้าสู่ระบบครั้งแรก (UTC, ISO 8601)',
  'last_login_at': 'เวลาที่เข้าสู่ระบบครั้งล่าสุด (UTC, ISO 8601)',
 },
 'progress': {
  'student_id': 'รหัสนักศึกษา เชื่อมกับตาราง users',
  'course_id': "รายวิชา netlab1 = ปฏิบัติการฯ 1 (11 Labs), netlab2 = ปฏิบัติการฯ 2 (12 Labs) — กันเลข Lab ชนกันข้ามวิชา",
  'lab_id': 'เลข Lab 1–11',
  'difficulty': "ระดับความยาก basic / medium / hard — อยู่ใน Primary Key เพราะการทำ Lab เดิมคนละระดับคือการทำคนละครั้ง",
  'steps_done': 'จำนวนขั้นตอนที่ทำสำเร็จ (ค่าสัมบูรณ์ เขียนทับทุกครั้ง)',
  'total_steps': 'จำนวนขั้นตอนทั้งหมดของ Lab นั้น',
  'wrong_count': 'จำนวนครั้งที่ตอบผิดสะสม (บวกทับ ไม่เขียนทับ)',
  'hints_used': 'จำนวนครั้งที่กดปุ่ม Hint สะสม (บวกทับ) — คนละอย่างกับตอบผิด เพราะกด Hint แล้วตอบถูกครั้งแรกก็ได้',
  'time_spent_sec': 'เวลาที่ใช้สะสมเป็นวินาที (บวกทับ)',
  'completed': '0 = ยังไม่จบ, 1 = ทำ Lab นี้จบแล้ว — ตั้งแล้วไม่ถูกลบ',
  'started_at': 'เวลาที่เริ่ม Lab นี้ครั้งแรก (UTC)',
  'updated_at': 'เวลาที่บันทึกล่าสุด (UTC)',
 },
 'activity': {
  'student_id': 'รหัสนักศึกษา',
  'day': 'วันที่รูปแบบ YYYY-MM-DD นับตามปฏิทินไทย (UTC+7) ไม่ใช่ UTC เพื่อให้การฝึกช่วงหลังเที่ยงคืนลงวันเดียวกับที่นักศึกษารู้สึก',
  'seconds': 'เวลาฝึกรวมของวันนั้นเป็นวินาที (บวกทับ)',
 },
 'quiz_attempts': {
  'id': 'เลขลำดับแถว เพิ่มเองอัตโนมัติ',
  'student_id': 'รหัสนักศึกษา — มี FOREIGN KEY บังคับว่าต้องมีอยู่ในตาราง users',
  'course_id': 'รายวิชา เช่นเดียวกับตาราง progress',
  'lab_id': 'เลข Lab ที่ทำแบบทดสอบ',
  'quiz_key': "ชื่อชุดคำถาม เช่น pretest (แบบทดสอบก่อนเรียนใน Lab 4-11) หรือ quiz_stepN / review_stepN (แบบทดสอบระหว่างบทใน Lab 1-3)",
  'score': 'จำนวนข้อที่ตอบถูก',
  'max_score': 'จำนวนข้อทั้งหมดของชุดนั้น',
  'attempt_no': 'ครั้งที่เท่าไรของชุดคำถามนี้ นับให้อัตโนมัติ — บอกได้ว่านักศึกษาต้องลองกี่รอบจึงผ่าน',
  'created_at': 'เวลาที่ส่งคำตอบ (UTC)',
 },
 'ai_chat_logs': {
  'id': 'เลขลำดับแถว เพิ่มเองอัตโนมัติ',
  'student_id': 'รหัสนักศึกษา — ว่างได้ กรณีผู้เยี่ยมชมที่ยังไม่เข้าสู่ระบบ ระบบยังตอบคำถามให้แต่ไม่ผูกกับใคร',
  'course_id': 'รายวิชา',
  'lab_id': 'Lab ที่กำลังทำอยู่ตอนถาม',
  'task_type': "ชนิดคำถามที่ระบบจำแนกได้ hint / explain / chat ใช้เลือกโมเดล",
  'model_used': 'ชื่อโมเดลที่ตอบคำถามนั้นจริง',
  'user_message': 'ข้อความที่นักศึกษาพิมพ์',
  'ai_response': 'คำตอบที่ AI Tutor ตอบกลับ',
  'wrong_count_at_time': 'จำนวนครั้งที่ตอบผิดในขณะที่ถาม — ใช้ตรวจว่าระบบรัดเฉลยตามกฎหรือไม่',
  'created_at': 'เวลาที่ถาม (UTC)',
 },
}

SCOPE_MAP = [
 ('ข้อมูลผู้ใช้งาน', 'users', 'รหัสนักศึกษา อีเมล ชื่อ รูปโปรไฟล์ สิทธิ์ และเวลาเข้าสู่ระบบ'),
 ('ความคืบหน้าของนักศึกษาในแต่ละ Lab', 'progress + activity',
  'progress เก็บสถานะต่อ Lab, activity เก็บเวลาฝึกรายวันสำหรับกราฟ'),
 ('ผลคะแนนแบบทดสอบ', 'quiz_attempts', 'คะแนน เต็ม และครั้งที่เท่าไรของทุกชุดคำถาม'),
 ('ประวัติการโต้ตอบกับ AI Tutor', 'ai_chat_logs', 'คำถาม คำตอบ โมเดลที่ใช้ และบริบทตอนถาม'),
]

ENDPOINTS = [
 ('POST', '/auth/google', 'ตรวจ Google ID token + โดเมน @email.kmutnb.ac.th แล้วบันทึกลง users และออก session token',
  'users'),
 ('POST', '/progress', 'บันทึกความคืบหน้า เขียน 2 ตารางพร้อมกันในการเรียกครั้งเดียว', 'progress, activity'),
 ('GET', '/progress/{studentId}', 'อ่านความคืบหน้าทุก Lab + เวลาฝึก 7 วันย้อนหลัง สำหรับหน้า Dashboard',
  'progress, activity'),
 ('POST', '/quiz-score', 'บันทึกคะแนนแบบทดสอบ ทั้งตอนผ่านและไม่ผ่าน', 'quiz_attempts'),
 ('POST', '/chat', 'ส่งคำถามไปยัง AI Tutor แล้วบันทึกบทสนทนา', 'ai_chat_logs'),
]

RATIONALE = [
 ('SQLite ไฟล์เดียว ไม่ใช้ ORM',
  'ความสัมพันธ์ของข้อมูลเรียบง่าย ใช้โมดูล sqlite3 ที่มาพร้อม Python ได้เลย ไม่ต้องเพิ่ม dependency '
  'และตรงตามที่ระบุไว้ในข้อเสนอโครงงาน §2.7.6 ฐานข้อมูลทั้งหมดอยู่ในไฟล์เดียวชื่อ netlab.db '
  'ย้ายเครื่องหรือสำรองข้อมูลทำได้ด้วยการคัดลอกไฟล์'),
 ('ค่าที่เป็นการสะสมใช้วิธีบวกทับ ไม่เขียนทับ',
  'wrong_count, hints_used และ time_spent_sec ถูกส่งมาเป็น "ส่วนต่าง" แล้ว backend บวกเข้ากับของเดิม '
  'เพราะนักศึกษาอาจปิดหน้าเว็บแล้วกลับมาทำต่อหลายรอบ ต้องนับรวมทุกรอบไม่ใช่แค่รอบล่าสุด '
  'ส่วน steps_done กับ total_steps เป็นค่าสัมบูรณ์ เพราะเป็นสถานะไม่ใช่การสะสม'),
 ('แยกตาราง activity ออกจาก progress',
  'progress เก็บสถานะล่าสุดต่อ Lab (แถวเดิมอัปเดตทับ) ส่วน activity ต้องเก็บประวัติรายวัน (แถวใหม่ทุกวัน) '
  'เพื่อวาดกราฟย้อนหลัง 7 วัน ถ้ารวมไว้ตารางเดียวจะคำนวณกราฟยากและข้อมูลซ้ำซ้อน'),
 ('difficulty อยู่ใน Primary Key ไม่ใช่คอลัมน์ธรรมดา',
  'ขอบเขตภาคเรียนที่ 2 ข้อ 1.2 กำหนดระดับความยาก 3 ระดับ ถ้า Primary Key ไม่มี difficulty '
  'นักศึกษาที่ทำ Lab เดิมคนละระดับจะได้คีย์ซ้ำ แถวที่สองจะเขียนทับแถวแรก '
  'ทดสอบแล้วได้ผลลัพธ์ที่ขัดแย้งกับตัวเอง คือแถวที่บอกว่าทำได้ 5 จาก 30 ขั้นตอน แต่ยังติดสถานะว่าผ่านแล้ว '
  'จึงออกแบบให้แต่ละระดับมีแถวของตัวเองตั้งแต่ต้น'),
 ('เวลาเก็บเป็น UTC แต่การนับวันใช้ปฏิทินไทย',
  'ทุก timestamp เก็บเป็น UTC เพื่อให้เทียบกันได้ไม่สับสน แต่คอลัมน์ activity.day ใช้วันที่ตามเวลาไทย (UTC+7) '
  'เพราะถ้านับวันแบบ UTC การฝึกช่วงเที่ยงคืนถึงเจ็ดโมงเช้า ซึ่งเป็นช่วงที่นักศึกษาฝึกจริง '
  'จะไปลงแท่งของวันก่อนหน้าในกราฟ'),
 ('เซิร์ฟเวอร์ไม่เชื่อรหัสนักศึกษาที่หน้าเว็บส่งมา',
  'ทุกการอ่านและเขียนข้อมูลของนักศึกษาต้องแนบ session token ที่เซ็นด้วย HMAC มาด้วย '
  'แล้วเซิร์ฟเวอร์ถอดรหัสนักศึกษาออกจาก token เอง ถ้าไม่ทำเช่นนี้ ใครก็ส่งคะแนนในชื่อคนอื่นได้'),
 ('บันทึกตอนทำขั้นตอนสำเร็จ และตอนออกจากหน้าเว็บ',
  'ไม่ส่งทุกการกดแป้นเพื่อไม่ให้ยิง request ถี่เกินไป แต่ดักจังหวะปิดแท็บไว้ด้วย '
  'เพื่อไม่ให้เวลาที่ฝึกไปแล้วหายถ้านักศึกษาปิดหน้าเว็บกลางคัน'),
]

PENDING = [
 ('classrooms และ enrollments', 'ขอบเขตภาคเรียน 2 ข้อ 2.2 — อาจารย์สร้างห้องเรียนและให้นักศึกษาเข้าร่วม',
  'เพิ่มเป็นตารางใหม่ได้ ไม่กระทบตารางเดิม'),
 ('คำสั่งอ่านข้อมูลนักศึกษาหลายคนพร้อมกัน', 'ขอบเขตภาคเรียน 2 ข้อ 2.3 — อาจารย์ดูความคืบหน้าทั้งห้อง',
  'ข้อมูลที่ต้องใช้มีอยู่ครบในตาราง progress แล้ว ขาดเพียงคำสั่งอ่าน'),
 ('difficulty ในตาราง quiz_attempts', 'ถ้าต้องการแยกคะแนนแบบทดสอบตามระดับความยากด้วย',
  'ยังไม่จำเป็น เพราะชุดคำถามไม่ได้เปลี่ยนตามระดับ'),
]


# ── read the real schema ─────────────────────────────────────────────
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row

schema = {}
for name in ORDER:
    sql = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
                       (name,)).fetchone()
    if sql is None:
        print('!! ไม่พบตาราง', name)
        sys.exit(1)
    cols = [dict(r) for r in conn.execute('PRAGMA table_info("%s")' % name)]
    fks = [dict(r) for r in conn.execute('PRAGMA foreign_key_list("%s")' % name)]
    # CHECK clauses are not exposed by PRAGMA, so pull them out of the DDL
    checks = re.findall(r'CHECK\(([^()]*(?:\([^()]*\))?[^()]*)\)', sql['sql'])
    pk = [c['name'] for c in sorted([c for c in cols if c['pk']], key=lambda c: c['pk'])]
    idx = []
    for r in conn.execute('PRAGMA index_list("%s")' % name):
        if r['origin'] == 'c':   # explicitly created, not auto
            icols = [x['name'] for x in conn.execute('PRAGMA index_info("%s")' % r['name'])]
            idx.append((r['name'], icols))
    schema[name] = {'ddl': sql['sql'], 'cols': cols, 'fks': fks, 'pk': pk,
                    'checks': checks, 'idx': idx}
conn.close()

# every column must be documented
missing = []
for t, info in schema.items():
    for c in info['cols']:
        if c['name'] not in DESC.get(t, {}):
            missing.append('%s.%s' % (t, c['name']))
if missing:
    print('!! คอลัมน์ที่ยังไม่มีคำอธิบาย:', ', '.join(missing))
    sys.exit(1)
extra = []
for t, d in DESC.items():
    names = {c['name'] for c in schema[t]['cols']}
    extra += ['%s.%s' % (t, k) for k in d if k not in names]
if extra:
    print('!! คำอธิบายที่ไม่มีคอลัมน์จริงรองรับ (คงค้างจากสคีมาเก่า):', ', '.join(extra))
    sys.exit(1)


def esc(s):
    return (str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))


def constraint_text(table, col):
    bits = []
    info = schema[table]
    if col['name'] in info['pk']:
        bits.append('PK')
    for fk in info['fks']:
        if fk['from'] == col['name']:
            bits.append('FK → %s.%s' % (fk['table'], fk['to']))
    if col['notnull']:
        bits.append('NOT NULL')
    if col['dflt_value'] is not None:
        bits.append('DEFAULT %s' % col['dflt_value'])
    if 'AUTOINCREMENT' in info['ddl'] and col['name'] in info['pk']:
        bits.append('AUTOINCREMENT')
    for ch in info['checks']:
        if re.search(r'\b%s\b' % re.escape(col['name']), ch) and ch.count(' ') < 12:
            bits.append('CHECK(%s)' % ch.strip())
    if not bits:
        bits.append('—')
    return bits


# ── ER diagram ───────────────────────────────────────────────────────
ROW_H, HEAD_H, PAD = 19, 30, 8
BOX_W = 236


def box_h(table):
    return HEAD_H + len(schema[table]['cols']) * ROW_H + PAD


POS = {'users': (392, 24), 'progress': (14, 300), 'activity': (266, 300),
       'quiz_attempts': (518, 300), 'ai_chat_logs': (770, 300)}
VB_W, VB_H = 1020, 300 + max(box_h(t) for t in ORDER) + 30


def svg_box(table):
    x, y = POS[table]
    h = box_h(table)
    info = schema[table]
    out = ['<rect class="er-box" x="%d" y="%d" width="%d" height="%d" rx="7"/>' % (x, y, BOX_W, h)]
    out.append('<rect class="er-head" x="%d" y="%d" width="%d" height="%d"/>' % (x, y, BOX_W, HEAD_H))
    out.append('<text class="er-title" x="%d" y="%d">%s</text>' % (x + 10, y + 20, table))
    out.append('<text class="er-count" x="%d" y="%d">%d คอลัมน์</text>'
               % (x + BOX_W - 10, y + 20, len(info['cols'])))
    out.append('<line class="er-sep" x1="%d" y1="%d" x2="%d" y2="%d"/>'
               % (x, y + HEAD_H, x + BOX_W, y + HEAD_H))
    for i, c in enumerate(info['cols']):
        ty = y + HEAD_H + PAD + 6 + i * ROW_H
        is_pk = c['name'] in info['pk']
        is_fk = any(fk['from'] == c['name'] for fk in info['fks'])
        mark = '▪' if is_pk else ('▫' if is_fk else ' ')
        cls = 'er-pk' if is_pk else ('er-fk' if is_fk else 'er-col')
        out.append('<text class="%s" x="%d" y="%d">%s %s</text>'
                   % (cls, x + 10, ty, mark, esc(c['name'])))
        out.append('<text class="er-type" x="%d" y="%d">%s</text>'
                   % (x + BOX_W - 10, ty, c['type']))
    return '\n'.join(out)


ux, uy = POS['users']
uh = box_h('users')
links = []
# One nurse's-ear per relationship: 1 at the users end, N at the child end, each
# route on its own Y so the four lines never share a horizontal run.
for table, dash, label in (('progress', True, 'ไม่บังคับ'), ('activity', True, 'ไม่บังคับ'),
                           ('quiz_attempts', False, 'FOREIGN KEY'),
                           ('ai_chat_logs', False, 'FOREIGN KEY')):
    i = ORDER.index(table)
    tx, ty = POS[table]
    sx = ux + BOX_W * (0.16 + 0.22 * i)
    ex = tx + BOX_W / 2
    # every horizontal run must clear the row of child boxes at y=300, or it
    # draws straight across their headers
    ymid = uy + uh + 22 + 16 * i
    assert ymid < POS[table][1] - 12, 'connector %s overlaps the box row' % table
    links.append('<path class="er-link%s" d="M %.0f %d V %d H %.0f V %d"/>'
                 % (' er-dash' if dash else '', sx, uy + uh, ymid, ex, ty))
    links.append('<text class="er-card" x="%.0f" y="%d">1</text>' % (sx + 6, uy + uh + 13))
    links.append('<text class="er-card" x="%.0f" y="%d">N</text>' % (ex + 6, ty - 5))
    links.append('<text class="er-linklabel" x="%.0f" y="%d">%s</text>'
                 % ((sx + ex) / 2, ymid - 5, label))

ER = ('<svg viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" role="img" '
      'aria-label="แผนภาพความสัมพันธ์ของตารางในฐานข้อมูล">\n%s\n%s\n</svg>'
      % (VB_W, VB_H, '\n'.join(links), '\n'.join(svg_box(t) for t in ORDER)))


# ── build the page ───────────────────────────────────────────────────
stamp = datetime.now(BKK).strftime('%d/%m/%Y %H:%M')
rows_total = sum(len(schema[t]['cols']) for t in ORDER)

parts = []
A = parts.append

A('<!DOCTYPE html>\n<html lang="th">\n<head>\n<meta charset="UTF-8">')
A('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
A('<title>โครงสร้างฐานข้อมูล — NETLab</title>')
A('<link rel="stylesheet" href="styles/tokens.css?v=3">')
A('<link rel="stylesheet" href="styles/shared.css?v=2">')
A('<script src="scripts/theme.js?v=2"></script>')
A('''<style>
body{background:var(--bg);color:var(--text);font-family:var(--font);font-size:var(--step-base);
  line-height:1.7;margin:0;padding:var(--space-6) var(--space-5) var(--space-8)}
.wrap{max-width:1180px;margin:0 auto}
h1{font-size:var(--step-3xl);letter-spacing:-0.02em;margin:0 0 var(--space-2)}
h2{font-size:var(--step-xl);margin:var(--space-8) 0 var(--space-3);
  padding-bottom:var(--space-2);border-bottom:1px solid var(--border)}
h3{font-size:var(--step-md);margin:var(--space-5) 0 var(--space-2);font-family:var(--mono)}
.sub{color:var(--text2);margin:0 0 var(--space-5)}
.meta{display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-6)}
.chip{background:var(--panel2);border:1px solid var(--border);border-radius:8px;
  padding:5px 11px;font-size:var(--step-sm);color:var(--text2)}
.chip b{color:var(--text);font-family:var(--mono)}
.note{background:var(--cyan-wash);border:1px solid var(--cyan-d);border-left-width:3px;
  border-radius:8px;padding:var(--space-3) var(--space-4);margin:var(--space-4) 0;
  font-size:var(--step-sm);color:var(--text2)}
table{width:100%;border-collapse:collapse;margin:var(--space-3) 0 var(--space-5);
  font-size:var(--step-sm);background:var(--panel);border:1px solid var(--border);border-radius:9px}
caption{text-align:left;color:var(--text3);font-size:var(--step-xs);padding-bottom:6px}
th,td{text-align:left;padding:8px 11px;border-bottom:1px solid var(--border);vertical-align:top}
th{background:var(--panel2);font-weight:700;font-size:var(--step-xs);text-transform:uppercase;
  letter-spacing:.06em;color:var(--text3)}
tr:last-child td{border-bottom:none}
code,.m{font-family:var(--mono);font-size:.93em}
code{background:var(--panel2);padding:1px 5px;border-radius:4px}
.col-name{font-family:var(--mono);white-space:nowrap;font-weight:700}
.col-type{font-family:var(--mono);color:var(--cyan);white-space:nowrap}
.cons{font-family:var(--mono);font-size:var(--step-xs);color:var(--text3);white-space:nowrap}
.cons b{color:var(--green);font-weight:700}
.cons i{color:var(--purple);font-style:normal;font-weight:700}
.tbl-card{background:var(--panel);border:1px solid var(--border);border-radius:11px;
  padding:var(--space-4) var(--space-5);margin-bottom:var(--space-5)}
.tbl-card h3{margin-top:0}
.tbl-card>p{color:var(--text2);font-size:var(--step-sm);margin:0 0 var(--space-3)}
.tbl-card table{margin-bottom:var(--space-2)}
.extra{font-size:var(--step-xs);color:var(--text3);margin:var(--space-2) 0 0}
.extra b{color:var(--text2)}
ol.why{padding-left:0;list-style:none;counter-reset:w;margin:0}
ol.why li{counter-increment:w;background:var(--panel);border:1px solid var(--border);
  border-radius:9px;padding:var(--space-3) var(--space-4);margin-bottom:var(--space-3);
  position:relative;padding-left:46px;font-size:var(--step-sm);color:var(--text2)}
ol.why li::before{content:counter(w);position:absolute;left:14px;top:var(--space-3);
  width:21px;height:21px;border-radius:50%;background:var(--cyan-wash);color:var(--cyan);
  font-weight:700;font-size:var(--step-xs);display:flex;align-items:center;justify-content:center}
ol.why b{color:var(--text);display:block;margin-bottom:3px}
.er{background:var(--panel);border:1px solid var(--border);border-radius:11px;
  padding:var(--space-4);overflow-x:auto}
.er svg{width:100%;min-width:900px;height:auto;display:block}
.er-box{fill:var(--panel);stroke:var(--border);stroke-width:1}
.er-head{fill:var(--panel2)}
.er-sep{stroke:var(--border);stroke-width:1}
.er-title{font-family:var(--mono);font-size:13px;font-weight:700;fill:var(--text)}
.er-count{font-size:10px;fill:var(--text3);text-anchor:end}
.er-col{font-family:var(--mono);font-size:11px;fill:var(--text2)}
.er-pk{font-family:var(--mono);font-size:11px;fill:var(--cyan);font-weight:700}
.er-fk{font-family:var(--mono);font-size:11px;fill:var(--purple)}
.er-type{font-family:var(--mono);font-size:9.5px;fill:var(--text3);text-anchor:end}
.er-link{fill:none;stroke:var(--cyan);stroke-width:1.5}
.er-dash{stroke:var(--text3);stroke-dasharray:5 4}
.er-linklabel{font-size:9.5px;fill:var(--text3);text-anchor:middle}
.er-card{font-family:var(--mono);font-size:10px;font-weight:700;fill:var(--cyan)}
.legend{display:flex;flex-wrap:wrap;gap:var(--space-4);margin-top:var(--space-3);
  font-size:var(--step-xs);color:var(--text3)}
.legend span{display:flex;align-items:center;gap:6px}
.sw{width:15px;height:2px;border-radius:1px}
footer{margin-top:var(--space-8);padding-top:var(--space-4);border-top:1px solid var(--border);
  color:var(--text3);font-size:var(--step-xs)}
.topline{display:flex;justify-content:flex-end;margin-bottom:var(--space-3)}
/* Printing always uses the light palette, whatever the reader has on screen —
   the declarations below are lifted from tokens.css's [data-theme="light"] block
   when this page is generated, so they cannot drift from the real light theme. */
@media print{
  :root,:root[data-theme="dark"],:root[data-theme="light"]{__LIGHT_TOKENS__}
  body{background:#fff;padding:0;font-size:10.5pt}
  .er{border:none;padding:0}
  .er svg{min-width:0}
  .theme-toggle,.topline{display:none}
  h2{page-break-after:avoid}
  .tbl-card,ol.why li,table,.er{page-break-inside:avoid}
  a{text-decoration:none;color:inherit}
}
@media(max-width:760px){
  body{padding:var(--space-5) var(--space-4) var(--space-7)}
  .cons,.col-type{white-space:normal}
}
</style>\n</head>\n<body>\n<a class="skip-link" href="#main">ข้ามไปเนื้อหาหลัก</a>\n<main id="main" tabindex="-1" class="wrap">''')

A('<div class="topline">'
  '<button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" '
  'title="สลับโหมดสว่าง/มืด">🌙</button></div>')
A('<h1>โครงสร้างฐานข้อมูล</h1>')
A('<p class="sub">NETLab — ระบบเรียนรู้เนื้อหาปฏิบัติการวิศวกรรมสารสนเทศและเครือข่ายแบบโต้ตอบด้วยปัญญาประดิษฐ์</p>')
A('<div class="meta">')
A('<span class="chip">ระบบจัดการฐานข้อมูล <b>SQLite</b></span>')
A('<span class="chip">ไฟล์ <b>netlab.db</b></span>')
A('<span class="chip"><b>%d</b> ตาราง</span>' % len(ORDER))
A('<span class="chip"><b>%d</b> คอลัมน์</span>' % rows_total)
A('<span class="chip">โมดูลที่จัดการ <b>db.py</b></span>')
A('</div>')
A('<div class="note">เอกสารนี้สร้างจากสคีมาจริงของไฟล์ <code>netlab.db</code> โดยอ่านผ่านคำสั่ง '
  '<code>PRAGMA</code> ไม่ได้พิมพ์ด้วยมือ — ชื่อตาราง คอลัมน์ ชนิดข้อมูล และเงื่อนไขทั้งหมด '
  'จึงตรงกับฐานข้อมูลที่ใช้งานอยู่เสมอ <span class="m">(สร้างเมื่อ %s)</span></div>' % stamp)

# 1. scope mapping
A('<h2>1. ความสอดคล้องกับข้อเสนอโครงงาน</h2>')
A('<p class="sub">หัวข้อ §2.4.9 ของข้อเสนอโครงงาน (ทก.01) ระบุว่า SQLite ถูกนำมาใช้จัดเก็บข้อมูลสี่ประเภท '
  'แต่ละประเภทมีตารางรองรับตรงกัน</p>')
A('<table><caption>ตารางที่ 1 — ข้อมูลที่ข้อเสนอโครงงานระบุ เทียบกับตารางที่พัฒนาขึ้น</caption>'
  '<thead><tr><th>ข้อมูลที่ §2.4.9 ระบุ</th><th>ตารางที่รองรับ</th><th>สิ่งที่เก็บ</th></tr></thead><tbody>')
for want, tbl, what in SCOPE_MAP:
    A('<tr><td>%s</td><td class="col-name">%s</td><td>%s</td></tr>' % (want, tbl, what))
A('</tbody></table>')
A('<div class="note">นอกจากนี้ยังออกแบบเผื่อขอบเขตที่เหลือไว้แล้วสองจุด — คอลัมน์ <code>course_id</code> '
  'แยกรายวิชาปฏิบัติการฯ 1 และ 2 ออกจากกัน (ภาคเรียนที่ 2 ข้อ 1.1) และคอลัมน์ <code>difficulty</code> '
  'กับ <code>hints_used</code> รองรับระดับความยาก 3 ระดับ (ภาคเรียนที่ 2 ข้อ 1.2) '
  'โดยยังไม่เปิดใช้งานในภาคเรียนนี้</div>')

# 2. ER
A('<h2>2. แผนภาพความสัมพันธ์ของข้อมูล (ER Diagram)</h2>')
A('<p class="sub">ตาราง <code>users</code> เป็นศูนย์กลาง อีกสี่ตารางอ้างถึงนักศึกษาผ่าน '
  '<code>student_id</code> โดยสองตารางบังคับด้วย FOREIGN KEY และอีกสองตารางเชื่อมด้วยข้อตกลงร่วมกัน</p>')
A('<div class="er">%s' % ER)
A('<div class="legend">'
  '<span><b class="m" style="color:var(--cyan)">▪</b> Primary Key</span>'
  '<span><b class="m" style="color:var(--purple)">▫</b> Foreign Key</span>'
  '<span><i class="sw" style="background:var(--cyan)"></i> บังคับด้วย FOREIGN KEY</span>'
  '<span><i class="sw" style="background:var(--text3)"></i> เชื่อมด้วย student_id แต่ไม่ได้บังคับ</span>'
  '</div></div>')
A('<div class="note">เส้นทึบคือความสัมพันธ์ที่ฐานข้อมูลบังคับจริง — บันทึกคะแนนหรือบทสนทนาของรหัสนักศึกษา '
  'ที่ไม่มีในตาราง <code>users</code> ไม่ได้ ส่วนเส้นประคือตารางที่ใช้ <code>student_id</code> ร่วมกัน '
  'แต่ไม่ได้ประกาศ FOREIGN KEY ไว้ เพื่อให้ยังบันทึกความคืบหน้าได้แม้ยังไม่มีข้อมูลผู้ใช้ '
  'เช่นตอนทดสอบระบบในเครื่องพัฒนา</div>')

# 3. data dictionary
A('<h2>3. พจนานุกรมข้อมูล (Data Dictionary)</h2>')
A('<p class="sub">รายละเอียดทุกคอลัมน์ของทั้ง %d ตาราง พร้อมชนิดข้อมูลและเงื่อนไขที่ฐานข้อมูลบังคับ</p>'
  % len(ORDER))
for t in ORDER:
    info = schema[t]
    A('<div class="tbl-card">')
    A('<h3>%s</h3>' % t)
    A('<p>%s</p>' % PURPOSE[t])
    A('<table><caption>ตารางที่ %d — คอลัมน์ของตาราง %s</caption><thead><tr>'
      '<th>คอลัมน์</th><th>ชนิด</th><th>เงื่อนไข</th><th>ความหมาย</th>'
      '</tr></thead><tbody>' % (2 + ORDER.index(t), t))
    for c in info['cols']:
        cons = constraint_text(t, c)
        cons_html = ' · '.join(
            ('<b>%s</b>' % esc(b)) if b == 'PK' else
            ('<i>%s</i>' % esc(b)) if b.startswith('FK') else esc(b)
            for b in cons)
        A('<tr><td class="col-name">%s</td><td class="col-type">%s</td>'
          '<td class="cons">%s</td><td>%s</td></tr>'
          % (esc(c['name']), c['type'], cons_html, esc(DESC[t][c['name']])))
    A('</tbody></table>')
    A('<p class="extra"><b>Primary Key:</b> <span class="m">(%s)</span></p>' % ', '.join(info['pk']))
    if info['idx']:
        A('<p class="extra"><b>Index:</b> ' + ' · '.join(
            '<span class="m">%s (%s)</span>' % (n, ', '.join(cs)) for n, cs in info['idx']) + '</p>')
    A('</div>')

# 4. endpoints
A('<h2>4. คำสั่งที่เขียนและอ่านฐานข้อมูล</h2>')
A('<p class="sub">ทุกคำสั่งอยู่ในไฟล์ <code>main.py</code> และเรียกใช้ฟังก์ชันในไฟล์ <code>db.py</code> '
  'ไม่มีจุดใดในระบบที่เขียน SQL ตรงจากหน้าเว็บ</p>')
A('<table><caption>ตารางที่ %d — คำสั่ง (API endpoint) และตารางที่เกี่ยวข้อง</caption><thead><tr>'
  '<th>วิธี</th><th>เส้นทาง</th><th>หน้าที่</th><th>ตารางที่แตะ</th>'
  '</tr></thead><tbody>' % (2 + len(ORDER)))
for method, path, what, tables in ENDPOINTS:
    A('<tr><td class="m"><b>%s</b></td><td class="col-name">%s</td><td>%s</td>'
      '<td class="m">%s</td></tr>' % (method, esc(path), what, tables))
A('</tbody></table>')
A('<div class="note">คำสั่งที่อ่านหรือเขียนข้อมูลของนักศึกษาต้องแนบ session token ที่ลงลายมือชื่อแล้วมาด้วย '
  'เซิร์ฟเวอร์ถอดรหัสนักศึกษาออกจาก token เองและไม่เชื่อรหัสที่หน้าเว็บส่งมา</div>')

# 5. rationale
A('<h2>5. เหตุผลการออกแบบ</h2>')
A('<ol class="why">')
for title, body in RATIONALE:
    A('<li><b>%s</b>%s</li>' % (title, body))
A('</ol>')

# 6. pending
A('<h2>6. ส่วนที่ยังไม่ได้พัฒนา</h2>')
A('<p class="sub">ทั้งสามรายการอยู่ในขอบเขตภาคเรียนที่ 2 และเพิ่มได้ภายหลังโดยไม่ต้องแก้ตารางที่มีอยู่</p>')
A('<table><caption>ตารางที่ %d — ส่วนที่เหลือตามขอบเขตภาคเรียนที่ 2</caption><thead><tr>'
  '<th>สิ่งที่ยังไม่มี</th><th>รองรับขอบเขตข้อใด</th><th>ผลกระทบ</th>'
  '</tr></thead><tbody>' % (3 + len(ORDER)))
for what, why, impact in PENDING:
    A('<tr><td class="col-name">%s</td><td>%s</td><td>%s</td></tr>' % (what, why, impact))
A('</tbody></table>')

A('<footer>NETLab · เอกสารประกอบปริญญานิพนธ์ · สร้างจากสคีมาของ netlab.db เมื่อ %s</footer>' % stamp)
A('</main>\n</body>\n</html>')

html_out = '\n'.join(parts)

# Lift the real light-theme declarations out of tokens.css for the print rule,
# so a change to the light palette reaches this document on the next generate.
tokens_css = io.open(str(HERE / 'public' / 'styles' / 'tokens.css'), encoding='utf-8').read()
m = re.search(r'\[data-theme="light"\]\s*\{(.*?)\n\}', tokens_css, re.S)
if not m:
    print('!! หาบล็อก [data-theme="light"] ใน tokens.css ไม่เจอ')
    sys.exit(1)
light = re.sub(r'/\*.*?\*/', '', m.group(1), flags=re.S)
light = ''.join(line.strip() for line in light.splitlines())
n_vars = len(re.findall(r'--[a-z0-9-]+\s*:', light))
if n_vars < 20:
    print('!! บล็อก light ดูสั้นผิดปกติ (%d ตัวแปร)' % n_vars)
    sys.exit(1)
html_out = html_out.replace('__LIGHT_TOKENS__', light)
print('ฝัง light tokens สำหรับการพิมพ์: %d ตัวแปร' % n_vars)
io.open(OUT, 'w', encoding='utf-8', newline='\r\n').write(html_out)
print('เขียน %s (%d ตัวอักษร)' % (os.path.basename(OUT), len(html_out)))
print('ตาราง %d · คอลัมน์ %d · ทุกคอลัมน์มีคำอธิบายครบ' % (len(ORDER), rows_total))
for t in ORDER:
    print('  %-14s %2d คอลัมน์  PK(%s)%s'
          % (t, len(schema[t]['cols']), ', '.join(schema[t]['pk']),
             '  FK→users' if schema[t]['fks'] else ''))
