import { useEffect, useState } from 'react';
import { RequireAuth, useAuth } from '../../context/AuthContext';
import { getProgress } from '../../lib/api';
import TopNav from '../../components/TopNav';
import './labs.css';

const NETLAB1_TOTAL = 11;

function useLab1Progress() {
  const { profile, token } = useAuth();
  const [meta, setMeta] = useState('กำลังโหลดความคืบหน้า…');
  const [pct, setPct] = useState<number | null>(null);

  useEffect(() => {
    const studentId = profile && 'studentId' in profile ? profile.studentId : null;
    if (!studentId || !token) {
      setMeta('ยังไม่เริ่มเรียน');
      setPct(0);
      return;
    }
    let cancelled = false;
    getProgress(studentId, token, 'netlab1')
      .then((data) => {
        if (cancelled) return;
        const byId: Record<number, (typeof data.labs)[number]> = {};
        data.labs.forEach((r) => {
          byId[r.lab_id] = r;
        });
        let done = 0;
        let firstNotDone: number | null = null;
        for (let n = 1; n <= NETLAB1_TOTAL; n++) {
          const p = byId[n];
          if (p && p.completed) done++;
          else if (firstNotDone === null) firstNotDone = n;
        }
        const percent = Math.round((done / NETLAB1_TOTAL) * 100);
        setMeta(
          done >= NETLAB1_TOTAL
            ? 'เรียนจบครบทุก Lab แล้ว'
            : done === 0 && !byId[firstNotDone ?? -1]
              ? 'ยังไม่เริ่มเรียน'
              : `อยู่ระหว่างดำเนินการ Lab ที่ ${firstNotDone} จาก ${NETLAB1_TOTAL}`,
        );
        setPct(percent);
      })
      .catch(() => {
        // เครือข่ายมีปัญหา — ปล่อยให้แสดงค่า 0% แทนการค้างข้อความ "กำลังโหลด" ไว้เฉยๆ
        if (!cancelled) {
          setMeta('ยังไม่เริ่มเรียน');
          setPct(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profile, token]);

  return { meta, pct };
}

function LabsInner() {
  const { meta, pct } = useLab1Progress();

  return (
    <>
      <TopNav active="Lab" />

      <div className="hero">
        <div className="hero-bg">
          <img src="/assets/topic-images/hero-network-dashboard.png" alt="" />
        </div>
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-eyebrow">Faculty of Engineering</div>
            <h1 className="hero-title">Network Engineering Lab</h1>
            <div className="hero-sub">Cisco IOS พร้อม AI Tutor ฝึกปฏิบัติตลอดหลักสูตร 2 รายวิชา</div>
          </div>
        </div>
      </div>

      <div className="catalog">
        <div className="catalog-title">Learning Path</div>

        <div className="roadmap">
          <div className="road-step active">
            <a className="road-card clickable" href="/course.html">
              <div className="road-card-top">
                <div className="road-num">1</div>
                <div className="road-tags">
                  <span className="badge">Self-Paced</span>
                  <span className="badge">ปีที่ 1</span>
                </div>
              </div>
              <div className="road-title">Network Engineering Laboratory I</div>
              <div className="road-desc">
                การฝึกปฏิบัติการรับส่งสารสนเทศ การสื่อสารข้อมูล และการกำหนดค่าอุปกรณ์เราเตอร์ รวมถึงการกำหนดค่าโปรโตคอลเลือกเส้นทาง ได้แก่ Static Route,
                Default Route, RIP, OSPF, EIGRP ตลอดจนเนื้อหาอื่น ๆ ที่เกี่ยวข้องกับเทคโนโลยีเครือข่าย
              </div>
              <div className="road-meta">
                <span>ประกอบด้วย 11 Lab ปฏิบัติการ</span>
                <span>{meta}</span>
              </div>
              <div className="road-progress">
                <div className="pbar">
                  <div className="pbar-fill" style={{ width: `${pct ?? 0}%` }} />
                </div>
                <span>{pct === null ? '–' : `${pct}%`}</span>
              </div>
              <span className="btn-primary">เข้าสู่รายวิชา →</span>
            </a>
          </div>

          <div className="road-step locked">
            <div className="road-card locked">
              <div className="road-card-top">
                <div className="road-num">–</div>
                <div className="road-tags">
                  <span className="badge">ปีที่ 2</span>
                </div>
              </div>
              <div className="road-title">Network Engineering Laboratory II</div>
              <div className="road-desc">จะปลดล็อกภายหลังจากสำเร็จการศึกษารายวิชา Network Engineering Laboratory I ครบถ้วนทุก Lab ปฏิบัติการ</div>
              <div className="road-meta">
                <span>รอปลดล็อก</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-note">
        ระบบจำลองเพื่อการศึกษา — ไม่มีความเกี่ยวข้องกับ Cisco Networking Academy (NetAcad)
        <br />
        <span style={{ opacity: 0.75 }}>Developed by 4th-year students, Information Technology and Networking Program, Academic Year 2026</span>
      </div>
    </>
  );
}

export default function Labs() {
  return (
    <RequireAuth>
      <LabsInner />
    </RequireAuth>
  );
}
