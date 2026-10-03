import { useEffect, useState } from 'react';
import { RequireAuth, useAuth } from '../../context/AuthContext';
import { getProgress } from '../../lib/api';
import { STATUS_LABEL, buildLabsFromProgress, type LabWithStatus } from '../../data/labMeta';
import ThemeToggle from '../../components/ThemeToggle';
import AuthNav from '../../components/AuthNav';
import './course.css';

function useCourseLabs(): LabWithStatus[] {
  const { profile, token } = useAuth();
  const [labs, setLabs] = useState<LabWithStatus[]>(() => buildLabsFromProgress([]));

  useEffect(() => {
    const studentId = profile && 'studentId' in profile ? profile.studentId : null;
    if (!studentId || !token) {
      setLabs(buildLabsFromProgress([]));
      return;
    }
    let cancelled = false;
    getProgress(studentId, token)
      .then((data) => {
        if (!cancelled) setLabs(buildLabsFromProgress(data.labs));
      })
      .catch(() => {
        if (!cancelled) setLabs(buildLabsFromProgress([]));
      });
    return () => {
      cancelled = true;
    };
  }, [profile, token]);

  return labs;
}

function CourseInner() {
  const labs = useCourseLabs();
  const total = labs.length;
  const done = labs.filter((l) => l.status === 'done').length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const active = labs.find((l) => l.status === 'active');

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/index.html">
          NET<span>Lab</span>
        </a>
        <span className="crumb-sep">›</span>
        <a className="crumb" href="/labs.html">
          Lab
        </a>
        <span className="crumb-sep">›</span>
        <span className="crumb current">Network Engineering Laboratory I</span>
        <div className="topbar-right">
          <div id="authSlot">
            <AuthNav />
          </div>
          <ThemeToggle />
        </div>
      <a className="skip-link" href="#main">ข้ามไปเนื้อหาหลัก</a>
      </header>
      <main id="main" tabIndex={-1}>

      <div className="hero">
        <div className="hero-bg">
          <img src="/assets/topic-images/hero-network-dashboard.png" alt="" />
        </div>
        <div className="overview">
          <span className="ov-tag">รายวิชาปฏิบัติการ</span>
          <h1 className="ov-title">Network Engineering Laboratory I</h1>
          <div className="ov-desc">
            การฝึกปฏิบัติการ การรับส่งสารสนเทศ การสื่อสารข้อมูล การกำหนดค่าต่าง ๆ ให้กับอุปกรณ์เราเตอร์ การกำหนดค่าโปรโตคอลเลือกเส้นทาง ได้แก่ Static
            route default route rip ospf eigrp เรื่องอื่น ๆ ที่สัมพันธ์กับเนื้อหาวิชาทางด้านเทคโนโลยีเครือข่าย
          </div>
          <div className="ov-actions">
            {active ? (
              <>
                <a className="btn-primary" href={active.href}>
                  ไปต่อที่ Lab {active.n} (กำลังเรียน) →
                </a>
                <a className="btn-secondary" href="/dashboard.html">
                  ดู Dashboard
                </a>
              </>
            ) : (
              <a className="btn-secondary" href="/dashboard.html">
                ดู Dashboard
              </a>
            )}
          </div>
        </div>
        <div className="stat-bar">
          <div className="stat-item">
            <b>{total || '–'}</b>
            <span>Labs ทั้งหมด</span>
          </div>
          <div className="stat-item">
            <b>{done}</b>
            <span>เรียนจบแล้ว</span>
          </div>
          <div className="stat-item">
            <b>{pct}%</b>
            <span>ความคืบหน้ารวม</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="lab-section">
        <div className="lab-section-title">Lab ทั้งหมดในรายวิชา</div>
        <div className="lab-section-sub">เรียงตามลำดับ — ต้องเรียนจบ Lab ก่อนหน้าให้ครบก่อนถึงจะปลดล็อก Lab ถัดไป</div>
        <div className="roadmap">
          {labs.map((l) => {
            const statusClass = l.status === 'done' ? 'ls-done' : l.status === 'active' ? 'ls-active' : 'ls-locked';
            const icon = l.status === 'done' ? '✓' : l.status === 'locked' ? '–' : l.n;
            const clickable = (l.status === 'done' || l.status === 'active') && l.href;
            const cardClass = `road-card${clickable ? ' clickable' : ''}${l.status === 'locked' ? ' locked' : ''}`;
            const sub = l.status === 'locked' ? `ปลดล็อกหลังเรียน Lab ${l.n - 1} จบ` : 'Network Engineering Laboratory I';
            const inner = (
              <>
                <div className="road-info">
                  <div className="road-title">
                    Lab {l.n} — {l.title}
                  </div>
                  <div className="road-sub">{sub}</div>
                </div>
                <div className={`road-status ${statusClass}`}>{STATUS_LABEL[l.status]}</div>
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

      <div className="footer-note">
        ระบบจำลองเพื่อการศึกษา — ไม่มีความเกี่ยวข้องกับ Cisco Networking Academy (NetAcad)
        <br />
        <span style={{ opacity: 0.75 }}>Developed by 4th-year students, Information Technology and Networking Program, Academic Year 2026</span>
      </div>
      </main>
    </>
  );
}

export default function Course() {
  return (
    <RequireAuth>
      <CourseInner />
    </RequireAuth>
  );
}
