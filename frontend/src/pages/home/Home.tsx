import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { REF_GROUPS, REF_TOPICS } from '../../data/referenceTopics';
import TopNav from '../../components/TopNav';
import './home.css';

const DEFAULT_TOPIC = 'cmd';

function topicIdFromHash(): string {
  const id = (location.hash || '').slice(1);
  return REF_TOPICS.some((t) => t.id === id) ? id : DEFAULT_TOPIC;
}

export default function Home() {
  const { profile } = useAuth();
  const [topicId, setTopicId] = useState(topicIdFromHash);
  const [railOpen, setRailOpen] = useState(false);

  useEffect(() => {
    function onPopState() {
      setTopicId(topicIdFromHash());
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function selectTopic(id: string) {
    setTopicId(id);
    setRailOpen(false);
    if (location.hash === '#' + id) history.replaceState(null, '', '#' + id);
    else history.pushState(null, '', '#' + id);
  }

  const topic = useMemo(() => REF_TOPICS.find((t) => t.id === topicId) ?? REF_TOPICS[0], [topicId]);

  function onRailKeyDown(e: React.KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (target.getAttribute('role') !== 'tab') return;
    const idx = REF_TOPICS.findIndex((t) => t.id === topicId);
    let next: string | null = null;
    if (e.key === 'ArrowDown') next = REF_TOPICS[(idx + 1) % REF_TOPICS.length].id;
    else if (e.key === 'ArrowUp') next = REF_TOPICS[(idx - 1 + REF_TOPICS.length) % REF_TOPICS.length].id;
    else if (e.key === 'Home') next = REF_TOPICS[0].id;
    else if (e.key === 'End') next = REF_TOPICS[REF_TOPICS.length - 1].id;
    if (next) {
      e.preventDefault();
      selectTopic(next);
      document.getElementById('tab-' + next)?.focus();
    }
  }

  return (
    <>
      <TopNav active="Home" />

      <div className="hero">
        <div className="hero-bg">
          <img src="/assets/topic-images/hero-network-dashboard.png" alt="" />
        </div>
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-title">
              NET<span style={{ color: 'var(--cyan)' }}>Lab</span> for INE
            </div>
            <div className="hero-sub">
              ระบบนี้ช่วยลดช่องว่างความรู้พื้นฐาน ให้ผู้เรียนฝึกปฏิบัติได้ทุกที่ทุกเวลาผ่านเว็บเบราว์เซอร์
              ยกระดับการเรียนการสอนวิชา Network Engineering Lab ให้มีประสิทธิภาพมากขึ้น
            </div>

            {profile ? (
              <div className="hero-actions">
                <a className="btn-primary" href="/labs.html">
                  เริ่มทำ Lab →
                </a>
                <a className="btn-secondary" href="/dashboard.html">
                  ดูความคืบหน้า
                </a>
              </div>
            ) : (
              <div className="hero-actions">
                <a className="btn-primary" href="/login.html">
                  เข้าสู่ระบบ →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="ref-mobile-bar">
          <button
            className="ref-toggle"
            id="refToggle"
            onClick={() => setRailOpen((o) => !o)}
            aria-expanded={railOpen}
            aria-controls="refRail"
          >
            หัวข้ออ้างอิง
          </button>
        </div>
        <div className={`ref-backdrop${railOpen ? ' show' : ''}`} onClick={() => setRailOpen(false)} />

        <div className="ref-body">
          <div className={`ref-rail${railOpen ? ' open' : ''}`} id="refRail" role="tablist" aria-label="หัวข้ออ้างอิง" onKeyDown={onRailKeyDown}>
            {REF_GROUPS.map((group) => (
              <div className="ref-rail-group" key={group}>
                <div className="ref-rail-label">{group}</div>
                {REF_TOPICS.filter((t) => t.group === group).map((t) => (
                  <button
                    key={t.id}
                    className="ref-tab"
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={t.id === topicId}
                    aria-controls={`panel-${t.id}`}
                    tabIndex={t.id === topicId ? 0 : -1}
                    data-topic={t.id}
                    onClick={() => selectTopic(t.id)}
                  >
                    {t.tabLabel}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="ref-panels">
            <div className="ref-panel" role="tabpanel" id={`panel-${topic.id}`} aria-labelledby={`tab-${topic.id}`}>
              <div className="ref-panel-head">
                <div className="ref-panel-title">{topic.title}</div>
              </div>
              <div className="ref-panel-body">
                {topic.bodyHtml.includes('cmd-row') ? (
                  <div className="topic-cmds" dangerouslySetInnerHTML={{ __html: topic.bodyHtml }} />
                ) : topic.id === 'abbr' ? (
                  <div className="topic-cmds" style={{ minWidth: 0 }} dangerouslySetInnerHTML={{ __html: topic.bodyHtml }} />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: topic.bodyHtml }} />
                )}
                {topic.visual && (
                  <div className="ref-panel-visual">
                    <img src={topic.visual.src} alt={topic.visual.alt} />
                  </div>
                )}
              </div>
              <button className="doc-link ref-panel-doclink" type="button" disabled aria-disabled="true">
                {topic.docLinkLabel} <span className="doc-hint">(จะเพิ่มไฟล์ภายหลัง)</span>
              </button>
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
