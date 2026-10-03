import { useEffect, useRef, useState } from 'react';
import AuthNav from './AuthNav';
import ThemeToggle from './ThemeToggle';

export interface NavLink {
  label: string;
  href: string;
}

const LINKS: NavLink[] = [
  { label: 'Home', href: '/index.html' },
  { label: 'Lab', href: '/labs.html' },
  { label: 'Dashboard', href: '/dashboard.html' },
];

/** Replaces theme.js's toggleNav() + the document-level click-outside-to-close
 * listener. The settings dropdown (#settingsMenu/#settingsToggle) from the old
 * theme.js was dead code in every live page, so it's not ported. */
export default function TopNav({ active }: { active: 'Home' | 'Lab' | 'Dashboard' | 'none' }) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        open &&
        navRef.current &&
        btnRef.current &&
        !navRef.current.contains(e.target as Node) &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  return (
    <header className="topbar topbar-main">
      <div className="topbar-left">
        <button
          ref={btnRef}
          className="nav-toggle"
          id="navToggle"
          onClick={() => setOpen((o) => !o)}
          aria-label="เปิดเมนู"
          aria-expanded={open}
          aria-controls="navLinks"
        >
          เมนู
        </button>
        <a className="brand" href="/index.html">
          NET<span>Lab</span>
        </a>
      </div>
      <nav ref={navRef} className={`nav-links${open ? ' open' : ''}`} id="navLinks" aria-label="เมนูหลัก">
        {LINKS.map((l) => (
          <a key={l.href} className={`nav-link${l.label === active ? ' active' : ''}`} href={l.href}>
            {l.label}
          </a>
        ))}
      </nav>
      <div className="topbar-right">
        <div id="authSlot">
          <AuthNav />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
