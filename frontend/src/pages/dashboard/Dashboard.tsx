import { useEffect, useState } from 'react';
import { RequireAuth, useAuth } from '../../context/AuthContext';
import { getProgress, type WeeklyActivityRow } from '../../lib/api';
import { buildLabsFromProgress, type LabWithStatus } from '../../data/labMeta';
import ThemeToggle from '../../components/ThemeToggle';
import AuthNav from '../../components/AuthNav';
import './dashboard.css';

const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function useDashboardData() {
  const { profile, token } = useAuth();
  const [labs, setLabs] = useState<LabWithStatus[]>(() => buildLabsFromProgress([]));
  const [weekly, setWeekly] = useState<WeeklyActivityRow[]>([]);

  useEffect(() => {
    const studentId = profile && 'studentId' in profile ? profile.studentId : null;
    if (!studentId || !token) {
      setLabs(buildLabsFromProgress([]));
      setWeekly([]);
      return;
    }
    let cancelled = false;
    getProgress(studentId, token)
      .then((data) => {
        if (cancelled) return;
        setLabs(buildLabsFromProgress(data.labs));
        setWeekly(data.weeklyActivity);
      })
      .catch(() => {
        if (!cancelled) {
          setLabs(buildLabsFromProgress([]));
          setWeekly([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profile, token]);

  return { labs, weekly };
}

function ContinueCard({ labs }: { labs: LabWithStatus[] }) {
  const active = labs.find((l) => l.status === 'active');
  const done = labs.filter((l) => l.status === 'done').length;
  const total = labs.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (!active) {
    return (
      <div className="continue-card">
        <div className="continue-text">
          <div className="continue-label">สำเร็จการศึกษา</div>
          <div className="continue-title">สำเร็จการศึกษาครบทุก Lab แล้ว</div>
        </div>
      </div>
    );
  }

  return (
    <div className="continue-card">
      <div className="ring" style={{ ['--pct' as string]: `${pct}%` }}>
        <div className="ring-label">{pct}%</div>
      </div>
      <div className="continue-text">
        <div className="continue-label">อยู่ระหว่างดำเนินการ</div>
        <div className="continue-course">Network Engineering Laboratory I</div>
        <div className="continue-title">
          Lab {active.n} — {active.title}
        </div>
        <div className="continue-desc">
          สำเร็จแล้ว {done} จาก {total} Lab — ดำเนินการต่อเพื่อปลดล็อก Lab ถัดไป
        </div>
        <a className="btn-primary" href={active.href}>
          ไปต่อที่ Lab {active.n} →
        </a>
      </div>
    </div>
  );
}

function CourseAccordion({ labs }: { labs: LabWithStatus[] }) {
  const [openI, setOpenI] = useState(true);
  const [openII, setOpenII] = useState(false);
  const done = labs.filter((l) => l.status === 'done').length;
  const total = labs.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <div className="course-group">
        <button className="course-header" aria-expanded={openI} aria-controls="courseIBody" onClick={() => setOpenI((o) => !o)}>
          <div className="course-header-info">
            <div className="course-header-title">Network Engineering Laboratory I</div>
            <div className="course-header-sub">
              สำเร็จแล้ว {done}/{total} Lab — {pct}%
            </div>
          </div>
          <span className="course-caret">›</span>
        </button>
        {openI && (
          <div className="course-body" id="courseIBody">
            <div className="roadmap">
              {labs.map((l) => {
                const statusClass = l.status === 'done' ? 'ls-done' : l.status === 'active' ? 'ls-active' : 'ls-locked';
                const statusLabel = l.status === 'done' ? 'สำเร็จแล้ว' : l.status === 'active' ? 'กำลังดำเนินการ' : 'รอปลดล็อก';
                const icon = l.status === 'done' ? '✓' : l.status === 'locked' ? '–' : l.n;
                const clickable = (l.status === 'done' || l.status === 'active') && l.href;
                const cardClass = `road-card${clickable ? ' clickable' : ''}${l.status === 'locked' ? ' locked' : ''}`;
                const inner = (
                  <>
                    <div className="road-info">
                      <div className="road-title">
                        Lab {l.n} — {l.title}
                      </div>
                    </div>
                    <div className={`road-status ${statusClass}`}>{statusLabel}</div>
                  </>
                );
                return (
                  <div key={l.n} className={`road-step ${l.status}`}>
                    <div className="road-num">{icon}</div>
                    {clickable ? (
                      <a className={cardClass} href={l.href}>
                        {inner}
                      </a>
                    ) : (
                      <div className={cardClass}>{inner}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="course-group">
        <button className="course-header" aria-expanded={openII} aria-controls="courseIIBody" onClick={() => setOpenII((o) => !o)}>
          <div className="course-header-info">
            <div className="course-header-title">Network Engineering Laboratory II</div>
            <div className="course-header-sub">รอปลดล็อก</div>
          </div>
          <span className="course-caret">›</span>
        </button>
        {openII && (
          <div className="course-body" id="courseIIBody">
            <div className="course-locked-msg">ปลดล็อกหลังเรียน Network Engineering Laboratory I จบครบทุก Lab</div>
          </div>
        )}
      </div>
    </>
  );
}

function DashboardInner() {
  const { labs, weekly } = useDashboardData();
  const done = labs.filter((l) => l.status === 'done').length;
  const active = labs.filter((l) => l.status === 'active').length;
  const total = labs.length;
  const locked = total - done - active;
  const totalWrong = labs.reduce((sum, l) => sum + (l.wrong || 0), 0);

  return (
    <>
      <div className="topbar">
        <a className="brand" href="/index.html">
          NET<span>Lab</span>
        </a>
        <span className="crumb-sep">›</span>
        <a className="crumb" href="/labs.html">
          Lab
        </a>
        <span className="crumb-sep">›</span>
        <a className="crumb" href="/course.html">
          Network Engineering Laboratory I
        </a>
        <span className="crumb-sep">›</span>
        <span className="crumb current">Dashboard</span>
        <div className="topbar-right">
          <div id="authSlot">
            <AuthNav />
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="hero">
        <div className="hero-bg">
          <img src="/assets/topic-images/hero-network-dashboard.png" alt="" />
        </div>
        <div className="page-title">Dashboard</div>
        <div className="page-sub">ภาพรวมการเรียนของคุณในรายวิชา Network Engineering Laboratory I</div>
      </div>

      <div className="wrap">
        <ContinueCard labs={labs} />

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-num">{total || '–'}</div>
            <div className="stat-bar c-cyan" />
            <div className="stat-label">จำนวน Lab ทั้งหมด</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{done}</div>
            <div className="stat-bar c-green" />
            <div className="stat-label">สำเร็จแล้ว</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{active}</div>
            <div className="stat-bar c-amber" />
            <div className="stat-label">กำลังดำเนินการ</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{locked}</div>
            <div className="stat-bar c-purple" />
            <div className="stat-label">รอปลดล็อก</div>
          </div>
        </div>

        <div className="insight-grid">
          <ActivityChartWithTotals weekly={weekly} done={done} totalWrong={totalWrong} />
        </div>

        <div className="lab-section-title">รายละเอียดแต่ละ Lab</div>
        <div className="lab-section-sub">กดที่ชื่อวิชาเพื่อดูรายการ Lab ทั้งหมดในวิชานั้น</div>

        <CourseAccordion labs={labs} />
      </div>

      <div className="footer-note">
        ระบบจำลองเพื่อการศึกษา — ไม่มีความเกี่ยวข้องกับ Cisco Networking Academy (NetAcad)
        <br />
        <span style={{ opacity: 0.75 }}>Developed by 4th-year students, Information Technology and Networking Program, Academic Year 2026</span>
      </div>
    </>
  );
}

// Small wrapper so ActivityChart's two "{done} / {totalWrong}" placeholder divs
// (kept as plain ids in the markup above for 1:1 visual parity) get real values.
function ActivityChartWithTotals({ weekly, done, totalWrong }: { weekly: WeeklyActivityRow[]; done: number; totalWrong: number }) {
  const days = weekly.map((w) => {
    const d = new Date(`${w.day}T00:00:00`);
    return { label: DAY_LABELS[d.getDay()], hours: w.seconds / 3600 };
  });
  const max = Math.max(...days.map((x) => x.hours), 0.1);
  const todayIdx = days.length - 1;
  const totalSec = days.reduce((sum, x) => sum + x.hours * 3600, 0);

  return (
    <div className="insight-card">
      <div className="insight-head">
        <div className="insight-title">Practice Hours</div>
        <div className="insight-period">7 วันล่าสุด</div>
      </div>
      <div className="activity-body">
        <div className="activity-chart">
          {days.map((x, i) => {
            const pct = Math.round((x.hours / max) * 100);
            return (
              <div key={i} className="activity-bar-col">
                <div className={`activity-bar${i === todayIdx ? ' active' : ''}`} style={{ height: `${Math.max(pct, 2)}%` }} />
                <div className="activity-bar-day">{x.label}</div>
              </div>
            );
          })}
        </div>
        <div className="activity-stats">
          <div>
            <div className="activity-stat-label">เวลาฝึกสะสม (7 วันล่าสุด)</div>
            <div className="activity-stat-val">{(totalSec / 3600).toFixed(1)} ชม.</div>
          </div>
          <div>
            <div className="activity-stat-label">Lab ที่ทำเสร็จ</div>
            <div className="activity-stat-val">{done}</div>
          </div>
          <div>
            <div className="activity-stat-label">จำนวนครั้งที่ตอบผิดสะสม</div>
            <div className="activity-stat-val">{totalWrong}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}
