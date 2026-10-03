# คู่มือติดตั้ง NETLab บน server มหาวิทยาลัย (ติดตั้งครั้งแรก)

ระบบมี 2 ส่วน:
- **Frontend**: ไฟล์ static ใน `frontend/dist/` ที่ build จากเครื่องเรา บน server ไม่ต้องลง Node
- **Backend**: FastAPI (`main.py`) ที่ใช้ SQLite (`netlab.db`) และเรียก AI ผ่าน OpenRouter

nginx เป็นตัวรับคำขอทั้งหมด: ไฟล์หน้าเว็บส่งจาก `dist/` ส่วนทุก path ที่ขึ้นต้นด้วย `/api/` ส่งต่อไปที่ backend ซึ่งเปิดรับเฉพาะภายในเครื่อง (`127.0.0.1:8000`)

ไฟล์ในโฟลเดอร์นี้:

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `nginx-netlab.conf` | config ของ nginx |
| `netlab-backend.service` | ให้ backend รันเองตอนเปิดเครื่อง และรีสตาร์ทเองถ้าล่ม |
| `env.example` | แม่แบบ `.env` |

---

## 0. สิ่งที่ต้องถามฝ่าย IT ก่อน

1. **ชื่อโดเมนและใบรับรอง HTTPS** เช่น `netlab.xxx.kmutnb.ac.th`
   - ข้อนี้จำเป็น: Google Sign-In ใช้กับ IP ตรงๆ ไม่ได้ และนอก localhost ต้องเป็น https เท่านั้น
2. **ระบบปฏิบัติการ** (คู่มือนี้เขียนสำหรับ Ubuntu/Debian) และสิทธิ์ `sudo`
3. **Python 3.10 ขึ้นไป**: โค้ดใช้ syntax ที่รุ่นต่ำกว่านี้รันไม่ได้
4. **Server ออกอินเทอร์เน็ตได้** ไปที่ `openrouter.ai` (AI Tutor) และ `www.googleapis.com` (ตรวจ token ตอน login)
   - firewall ของมหาวิทยาลัยมักบล็อก ถ้าโดนบล็อก login และ AI จะใช้ไม่ได้
5. **เปิดพอร์ต 80/443** ให้นักศึกษาเข้าถึง (เฉพาะในมหาวิทยาลัย หรือจากภายนอกด้วย)

## 1. เตรียมไฟล์บนเครื่องเรา

```bash
npm --prefix frontend run build
```

ไฟล์ที่ต้องอัปโหลด:
- `main.py`, `db.py`, `session.py`, `backup_db.py`, `requirements.txt`
- โฟลเดอร์ `frontend/dist/`

**ห้ามอัปโหลด**:
- `netlab.db`: ในเครื่องเรามีข้อมูลทดสอบ ส่วน server จะสร้างฐานข้อมูลใหม่ว่างๆ ให้เอง
- `.env` ของเครื่องเรา: ให้สร้างใหม่บน server ตามขั้นที่ 3
- `public/`, `node_modules/`, `backups/`

## 2. ติดตั้งบน server

```bash
sudo apt update && sudo apt install -y nginx python3 python3-venv
sudo useradd --system --home /opt/netlab --shell /usr/sbin/nologin netlab
sudo mkdir -p /opt/netlab/frontend /opt/netlab/backups
mkdir -p /tmp/netlab
```

อัปโหลดไฟล์จากเครื่องเรา (รันบนเครื่องเราในโฟลเดอร์โปรเจกต์ และแทน `<user>@<server>` ด้วยของจริง):

```bash
scp main.py db.py session.py backup_db.py requirements.txt <user>@<server>:/tmp/netlab/
scp -r frontend/dist <user>@<server>:/tmp/netlab/dist
```

กลับมาที่ server:

```bash
sudo cp /tmp/netlab/*.py /tmp/netlab/requirements.txt /opt/netlab/
sudo cp -r /tmp/netlab/dist /opt/netlab/frontend/dist
sudo python3 -m venv /opt/netlab/venv
sudo /opt/netlab/venv/bin/pip install -r /opt/netlab/requirements.txt
sudo chown -R netlab:netlab /opt/netlab
```

## 3. ตั้งค่า `.env`

คัดลอก `env.example` ไปไว้ที่ `/opt/netlab/.env` แล้วกรอกค่าให้ครบ:
- `OPENROUTER_API_KEY`
- `ALLOWED_ORIGINS` (ใส่โดเมนจริง)
- `SECRET_KEY`: สร้างใหม่บน server ด้วยคำสั่งด้านล่าง ห้ามใช้ค่าเดียวกับเครื่องเรา

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

```bash
sudo chown netlab:netlab /opt/netlab/.env && sudo chmod 600 /opt/netlab/.env
```

## 4. เปิด backend

อัปโหลดไฟล์ในโฟลเดอร์ `deploy/` ไปที่ server ด้วย จากนั้นรันคำสั่งในขั้นที่ 4–5 ในโฟลเดอร์ที่เก็บไฟล์เหล่านั้น

```bash
sudo cp netlab-backend.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now netlab-backend
curl -s http://127.0.0.1:8000/health
```

ต้องเห็น `"status":"ok"` และ `"model_ready":true` ถ้าไม่ขึ้นให้ดู log ด้วย `journalctl -u netlab-backend -n 50`

## 5. ตั้งค่า nginx

แก้ `netlab.example.ac.th` และ path ของใบรับรองใน `nginx-netlab.conf` ให้ตรงกับของจริง แล้วรัน:

```bash
sudo cp nginx-netlab.conf /etc/nginx/sites-available/netlab
sudo ln -s /etc/nginx/sites-available/netlab /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 6. เพิ่มโดเมนใน Google Cloud Console

ทำที่ Google Cloud Console > APIs & Services > Credentials > OAuth client
(`235099944918-3eak8o4...`) > **Authorized JavaScript origins**
แล้วเพิ่ม `https://<โดเมนจริง>`

ถ้าไม่ทำ ปุ่ม login จะขึ้น error `origin_mismatch` แบบเดียวกับที่เคยเจอบน localhost:5173 การเปลี่ยนแปลงอาจใช้เวลาไม่กี่นาทีถึงจะมีผล

## 7. ตรวจหลังติดตั้ง

1. เปิด `https://<โดเมน>/` แล้วหน้าแรกต้องขึ้น
2. Login ด้วยอีเมลมหาวิทยาลัย แล้วต้องพาไปหน้า "รายวิชาในหลักสูตร"
3. เข้า Lab 1 ทำ 1–2 ขั้น แล้วกด refresh ความคืบหน้าต้องยังอยู่
4. ถาม AI 1 ข้อ ต้องได้คำตอบ และไฟสถานะ AI ต้องเป็นสีเขียว
5. เปิด Dashboard ต้องเห็นเวลาฝึกของวันนี้

## 8. Backup อัตโนมัติ

สำรองทุกวันตอนตี 3 เก็บย้อนหลัง 30 วันใน `/opt/netlab/backups/` ให้รัน `sudo crontab -u netlab -e` แล้วเพิ่มบรรทัดนี้:

```
0 3 * * * cd /opt/netlab && /opt/netlab/venv/bin/python backup_db.py >> backups/backup.log 2>&1
```

ควร copy โฟลเดอร์ `backups/` ออกไปเก็บนอก server เป็นระยะด้วย

## อัปเดตเวอร์ชันในภายหลัง

**Frontend**: build ใหม่ อัปโหลดไปไว้ที่ `dist.new` ก่อน แล้วค่อยสลับ เพื่อไม่ให้นักศึกษาโหลดเจอไฟล์ที่ copy ไปแค่ครึ่งเดียว

```bash
cd /opt/netlab/frontend && sudo rm -rf dist.old && sudo mv dist dist.old && sudo mv dist.new dist
```

**Backend**: copy ไฟล์ `.py` ทับของเดิม แล้วรัน `sudo systemctl restart netlab-backend`
- ฐานข้อมูลจะปรับโครงสร้างให้เองตอน start และไม่ลบข้อมูลเดิม
- ควรรัน `backup_db.py` ก่อนอัปเดตทุกครั้ง
