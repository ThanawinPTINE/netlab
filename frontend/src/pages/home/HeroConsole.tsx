import { useEffect, useRef, useState } from 'react';

/** The home page's opening image is the product itself: a console typing the
 * sequence Lab 4 actually teaches, with Lab 4's own address, ending on the
 * interface coming up.
 *
 * PRODUCT.md: "The terminal is the product. Every surface should feel like it
 * belongs next to a real CLI, not like marketing wrapped around one." What was
 * here before was a blurred stock image of glowing network nodes — a picture of
 * networking rather than the thing a student came to practise.
 *
 * Colours come from the same roles the labs' own terminal uses (prompt teal,
 * green for router output), so this is the real component rather than a mockup
 * of one. With reduced motion the whole session prints at once: the information
 * is the point, the typing is not.
 */

interface Line {
  prompt?: string;
  cmd?: string;
  ok?: string;
}

const SESSION: Line[] = [
  { prompt: 'R1>', cmd: 'enable' },
  { prompt: 'R1#', cmd: 'configure terminal' },
  { prompt: 'R1(config)#', cmd: 'interface g0/0' },
  { prompt: 'R1(config-if)#', cmd: 'ip address 192.168.10.1 255.255.255.0' },
  { prompt: 'R1(config-if)#', cmd: 'no shutdown' },
  { ok: '%LINK-5-CHANGED: Interface GigabitEthernet0/0, changed state to up' },
];

const ARIA =
  'ตัวอย่างการตั้งค่า interface บนเราเตอร์ R1 ด้วยคำสั่ง Cisco IOS: enable, ' +
  'configure terminal, interface g0/0, ip address 192.168.10.1 255.255.255.0 ' +
  'แล้ว no shutdown จนพอร์ตขึ้นสถานะ up';

const CHAR_MS = 34;
const LINE_PAUSE_MS = 460;
const LOOP_PAUSE_MS = 4200;

export default function HeroConsole() {
  // how many lines are complete, and how much of the line in progress is typed
  const [done, setDone] = useState(0);
  const [typed, setTyped] = useState('');
  const still = useRef(false);

  useEffect(() => {
    still.current =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (still.current) {
      setDone(SESSION.length);
      return;
    }

    let timer: number;
    let cancelled = false;

    function step(lineIdx: number, charIdx: number) {
      if (cancelled) return;
      if (lineIdx >= SESSION.length) {
        timer = window.setTimeout(() => {
          setDone(0);
          setTyped('');
          step(0, 0);
        }, LOOP_PAUSE_MS);
        return;
      }
      const line = SESSION[lineIdx];
      const text = line.cmd ?? line.ok ?? '';
      if (charIdx <= text.length) {
        setTyped(text.slice(0, charIdx));
        timer = window.setTimeout(() => step(lineIdx, charIdx + 1), CHAR_MS);
      } else {
        setDone(lineIdx + 1);
        setTyped('');
        timer = window.setTimeout(() => step(lineIdx + 1, 0), LINE_PAUSE_MS);
      }
    }
    step(0, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const current = done < SESSION.length ? SESSION[done] : null;

  return (
    <div className="hero-term">
      <div className="ht-bar">
        <span className="ht-name">
          <b>R1</b> console
        </span>
        <span className="ht-name">Lab 4 · Basic Configuration</span>
      </div>
      <div className="ht-body" role="img" aria-label={ARIA}>
        {SESSION.slice(0, done).map((l, i) => (
          <div className="ht-line" key={i}>
            {l.ok ? (
              <span className="ht-ok">{l.ok}</span>
            ) : (
              <>
                <span className="ht-prompt">{l.prompt} </span>
                <span>{l.cmd}</span>
              </>
            )}
          </div>
        ))}
        {current && (
          <div className="ht-line">
            {current.ok ? (
              <span className="ht-ok">{typed}</span>
            ) : (
              <>
                <span className="ht-prompt">{current.prompt} </span>
                <span>{typed}</span>
              </>
            )}
            <span className="ht-caret" />
          </div>
        )}
      </div>
    </div>
  );
}
