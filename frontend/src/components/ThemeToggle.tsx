import { useTheme } from '../context/ThemeContext';

/** Replaces theme.js's applyTheme() button icon/title DOM write. Every live page
 * only ever used the plain icon+title button shape (the icon+label span variant
 * in the old theme.js was dead code — no page markup had those child spans). */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const icon = theme === 'light' ? '☀️' : '🌙';
  const title = theme === 'light' ? 'โหมดกลางวัน' : 'โหมดกลางคืน';

  return (
    <button className="theme-toggle" id="themeToggle" onClick={toggleTheme} title={title}>
      {icon}
    </button>
  );
}
