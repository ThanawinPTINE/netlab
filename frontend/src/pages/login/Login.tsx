import { useEffect, useRef } from 'react';
import { isLanHost, useAuth } from '../../context/AuthContext';
import './login.css';

// Same Google OAuth client ID as the old login.html's data-client_id attribute.
const GOOGLE_CLIENT_ID = '235099944918-3eak8o4eodg86v0nhfs479nhvmkpui75.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function Login() {
  const { profile, loginWithGoogle, signInAsGuest, loginError } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const showGuest = isLanHost();
  const loginRequired = new URLSearchParams(location.search).get('login') === 'required';

  // Mirrors the old inline script: already signed in? skip straight to labs.html.
  useEffect(() => {
    if (profile) window.location.href = '/labs.html';
  }, [profile]);

  // Load the Google Identity Services script once, then render the button
  // programmatically (equivalent to the old data-callback="handleGoogleCredential"
  // div-attribute approach, but without needing a global window function).
  useEffect(() => {
    if (profile) return;

    function renderGoogleButton() {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp) => loginWithGoogle(resp.credential),
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'filled_blue',
        text: 'continue_with',
        shape: 'pill',
        width: 280,
      });
    }

    if (window.google) {
      renderGoogleButton();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client?hl=en';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  return (
    <>
      <div className="login-topbar">
        <a className="brand" href="/index.html">
          NET<span>Lab</span>
        </a>
      </div>

      <div className="login-card">
        <div className="login-logo">
          NET<span>Lab</span>
        </div>
        <div className="login-title">Sign In</div>
        <div className="login-sub">Sign in with your student email to start your Lab</div>

        <div className="login-actions">
          <div ref={buttonRef} />
        </div>

        <div className="auth-note">
          Only student emails <code>@email.kmutnb.ac.th</code> are allowed
        </div>

        {showGuest && (
          <div className="guest-box" id="guestBox">
            <div className="guest-sep">
              <span>หรือ</span>
            </div>
            <button className="guest-btn" type="button" onClick={signInAsGuest}>
              เข้าดูแบบผู้เยี่ยมชม
            </button>
            <div className="guest-note">
              เครื่องนี้เปิดจากวงเครือข่ายภายใน ซึ่ง Google ไม่อนุญาตให้ล็อกอินจากหมายเลข IP โดยตรง
              <br />
              โหมดผู้เยี่ยมชมเข้าดูเนื้อหาและฝึกพิมพ์คำสั่งได้ครบทุก Lab แต่<b>จะไม่บันทึกความคืบหน้า</b>
            </div>
          </div>
        )}

        <div id="authStatus" className="auth-status">
          {loginError || (loginRequired ? 'Please sign in to continue' : '')}
        </div>
      </div>

      <div className="login-footer">Educational simulation — not affiliated with Cisco Networking Academy (NetAcad)</div>
    </>
  );
}
