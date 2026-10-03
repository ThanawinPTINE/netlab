/* Replaces auth.js's renderAuthNav() innerHTML write — same markup/classes from
   styles/shared.css (.profile-avatar / .profile-avatar-fallback), driven by
   AuthContext instead of a direct getProfile() DOM write. */
import { useState } from 'react';
import { initials, isGuestProfile, useAuth } from '../context/AuthContext';

export default function AuthNav() {
  const { profile } = useAuth();
  const [picFailed, setPicFailed] = useState(false);

  if (!profile) return null;

  if (isGuestProfile(profile)) {
    return (
      <span
        className="profile-avatar profile-avatar-fallback"
        title="โหมดผู้เยี่ยมชม — ความคืบหน้าจะไม่ถูกบันทึก"
        style={{ cursor: 'default' }}
      >
        ผู้เยี่ยมชม
      </span>
    );
  }

  // Google's avatar host intermittently refuses requests that carry our page as
  // Referer, so the referrer is withheld, and a picture that still fails (or a
  // stale URL) falls back to initials instead of the browser's broken-image icon.
  return profile.picture && !picFailed ? (
    <a className="profile-avatar" href="/profile.html" title={profile.name}>
      <img src={profile.picture} alt="" referrerPolicy="no-referrer" onError={() => setPicFailed(true)} />
    </a>
  ) : (
    <a className="profile-avatar profile-avatar-fallback" href="/profile.html" title={profile.name}>
      {initials(profile.name)}
    </a>
  );
}
