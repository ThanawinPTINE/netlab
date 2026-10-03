import { useState } from 'react';
import { RequireAuth, initials, isGuestProfile, useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import './profile.css';

function ProfileInner() {
  const { profile, logout } = useAuth();
  const [picFailed, setPicFailed] = useState(false);
  if (!profile) return null;

  const guest = isGuestProfile(profile);
  const displayName = guest ? 'ผู้เยี่ยมชม (ไม่บันทึกความคืบหน้า)' : profile.name;

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/index.html">
          NET<span>Lab</span>
        </a>
        <span className="crumb-sep">›</span>
        <span className="crumb current">โปรไฟล์</span>
        <div className="topbar-right">
          <ThemeToggle />
        </div>
      </header>

      <div className="wrap">
        <div className="profile-card">
          <div className="profile-pic" id="profilePic">
            {/* same no-referrer + initials fallback as AuthNav's avatar */}
            {!guest && profile.picture && !picFailed ? (
              <img src={profile.picture} alt="" referrerPolicy="no-referrer" onError={() => setPicFailed(true)} />
            ) : (
              <div className="profile-pic-fallback">{initials(profile.name)}</div>
            )}
          </div>
          <h1 className="profile-name">{displayName}</h1>
          <div className="profile-email">{profile.email || '—'}</div>
        </div>

        <div className="detail-list">
          <div className="detail-row">
            <span className="detail-label">รหัสนักศึกษา</span>
            <span className="detail-value">{profile.studentId || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">อีเมล</span>
            <span className="detail-value">{profile.email || '—'}</span>
          </div>
        </div>

        <button className="logout-btn" type="button" onClick={logout}>
          ออกจากระบบ
        </button>
      </div>
    </>
  );
}

export default function Profile() {
  return (
    <RequireAuth>
      <ProfileInner />
    </RequireAuth>
  );
}
