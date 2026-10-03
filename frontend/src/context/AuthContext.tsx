/* NETLab — Google Sign-In (organization email only) + client-side session gate.
   Ported 1:1 from public/scripts/auth.js. Backend verifies the Google ID token and
   the @email.kmutnb.ac.th domain at login, then issues a signed session token (see
   session.py). Any call that writes/reads a student's data (/progress, /quiz-score,
   /chat) must send the token — the backend derives the real studentId from it and
   never trusts a bare studentId from the client.

   Storage shape is kept byte-identical to the old auth.js ({profile, token, exp} under
   the 'netlab-profile' key) so nothing on the backend or in localStorage changes. */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { authGoogle, type AuthProfile } from '../lib/api';

const AUTH_KEY = 'netlab-profile';
const AUTH_SESSION_DAYS = 7;

export interface GuestProfile {
  name: string;
  email: string;
  studentId: null;
  guest: true;
}

export type Profile = AuthProfile | GuestProfile;

interface StoredAuth {
  profile: Profile;
  token: string | null; // guests have no token
  exp: number;
}

function readStoredAuth(): StoredAuth | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let data: StoredAuth;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  // A signed-in (non-guest) session with no token predates session tokens: every
  // /progress call from it would 401 silently, so make the student sign in again.
  const tokenless = !!data && !isGuestProfile(data.profile) && !data.token;
  if (!data || !data.exp || Date.now() > data.exp || tokenless) {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
  return data;
}

// Google OAuth cannot authorize a raw private IP as a JavaScript origin, so a
// classmate on the same Wi-Fi can never complete sign-in. isLanHost() is true only
// for RFC1918 addresses — exactly the case Google refuses, never localhost or a
// deployed domain — so the guest door does not exist in production.
export function isLanHost(): boolean {
  const h = window.location.hostname;
  return /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(h);
}

export function isGuestProfile(p: Profile | null): p is GuestProfile {
  return !!p && 'guest' in p && p.guest === true;
}

export function initials(name: string): string {
  return (name || '?').trim().charAt(0).toUpperCase();
}

interface AuthContextValue {
  profile: Profile | null;
  token: string | null;
  loading: boolean;
  loginError: string | null;
  loginWithGoogle: (credential: string) => Promise<void>;
  signInAsGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredAuth();
    if (stored) {
      setProfile(stored.profile);
      setToken(stored.token);
    }
    setLoading(false);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    setLoginError(null);
    try {
      const data = await authGoogle(credential);
      const exp = Date.now() + AUTH_SESSION_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(AUTH_KEY, JSON.stringify({ profile: data.profile, token: data.token, exp }));
      setProfile(data.profile);
      setToken(data.token);
      window.location.href = '/labs.html';
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : 'เชื่อมต่อ server ไม่ได้ ลองใหม่อีกครั้ง');
    }
  }, []);

  const signInAsGuest = useCallback(() => {
    if (!isLanHost()) return;
    const exp = Date.now() + 24 * 60 * 60 * 1000; // หมดอายุใน 1 วัน
    const guestProfile: GuestProfile = { name: 'ผู้เยี่ยมชม', email: '', studentId: null, guest: true };
    localStorage.setItem(AUTH_KEY, JSON.stringify({ profile: guestProfile, token: null, exp }));
    setProfile(guestProfile);
    setToken(null);
    window.location.href = '/labs.html';
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
    window.location.href = '/index.html';
  }, []);

  return (
    <AuthContext.Provider value={{ profile, token, loading, loginError, loginWithGoogle, signInAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

/** Mirrors the old requireAuth(): redirects to login if there's no session once
 * the initial localStorage read has settled. Render children only once a profile
 * is confirmed present, to avoid a flash of protected content pre-redirect. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !profile) {
      window.location.href = '/login.html?login=required';
    }
  }, [loading, profile]);

  if (loading || !profile) return null;
  return <>{children}</>;
}
