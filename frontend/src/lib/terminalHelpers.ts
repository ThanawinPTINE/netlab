/* NETLab — shared terminal-input heuristics for the Config Lab engine. Ported
   1:1 from labnetwork1/lab05-static-route/lab5.html's inline <script> (every
   Config Lab duplicated this logic verbatim — centralized here for the React
   port so a fix applies to every lab at once). */
import type { SyntaxTemplate } from '../types/configLab';

export function levenshtein(a: string, b: string): number {
  const dp: number[][] = [];
  for (let i = 0; i <= a.length; i++) dp[i] = [i];
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** Detects typed input that doesn't resemble any valid keyword in the current
 * mode at all — spam/gibberish, which should neither count as a wrong attempt
 * nor trigger an AI call (token cost + anti-grinding-the-answer-reveal). */
export function isGibberish(cmd: string, mode: string, modeKeywords: Record<string, string[]>): boolean {
  const first = (cmd || '').trim().toLowerCase().split(/\s+/)[0];
  if (!first) return false;
  const kws = modeKeywords[mode] || [];
  for (const k of kws) {
    if (first === k || k.indexOf(first) === 0 || first.indexOf(k) === 0) return false;
    if (levenshtein(first, k) <= 1) return false;
  }
  return true;
}

/** Detects a fat-finger typo (1-2 character edit distance) against the expected
 * command for this sub-step — but only when every number token matches exactly,
 * since a numeric mismatch is a real misunderstanding, not a typo. */
export function isLikelyTypo(cmd: string, expectedWithPrompt: string | undefined): boolean {
  if (!expectedWithPrompt) return false;
  const expected = expectedWithPrompt.replace(/^\S+[>#]\s*/, '').trim().toLowerCase();
  const typed = (cmd || '').trim().toLowerCase();
  if (!typed || !expected || expected.length < 4) return false;
  const typedNums = (typed.match(/\d+/g) || []).join(',');
  const expectedNums = (expected.match(/\d+/g) || []).join(',');
  if (typedNums !== expectedNums) return false;
  const dist = levenshtein(typed, expected);
  return dist > 0 && dist <= 2;
}

function fixDottedToken(raw: string, expectedToken: string): boolean {
  const expOcts = expectedToken.split('.');
  const octs = raw.split('.').filter((s) => s.length > 0);
  if (octs.length === expOcts.length) return octs.join('.') === expOcts.join('.');
  if (octs.length === expOcts.length + 1) {
    for (let i = 0; i < octs.length; i++) {
      const trimmed = octs.slice(0, i).concat(octs.slice(i + 1));
      if (trimmed.join('.') === expOcts.join('.')) return true;
    }
  }
  return false;
}

/** Detects an IP/subnet-mask typing slip (extra octet, doubled dot) where every
 * non-dotted-decimal token matches exactly and the dotted token "fixes" to the
 * expected value by dropping exactly one stray octet. */
export function isIpTypingSlip(cmd: string, expectedWithPrompt: string | undefined): boolean {
  if (!expectedWithPrompt) return false;
  const expected = expectedWithPrompt.replace(/^\S+[>#]\s*/, '').trim().toLowerCase();
  const typed = (cmd || '').trim().toLowerCase();
  if (!typed || typed === expected) return false;
  const ew = expected.split(/\s+/);
  const tw = typed.split(/\s+/);
  if (ew.length !== tw.length) return false;
  let sawDiff = false;
  for (let i = 0; i < ew.length; i++) {
    if (ew[i] === tw[i]) continue;
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ew[i])) return false;
    if (!fixDottedToken(tw[i], ew[i])) return false;
    sawDiff = true;
  }
  return sawDiff;
}

// Generic (lab-independent) Cisco IOS syntax templates — used by the "อธิบาย cmd"
// chat chip to answer deterministically from the client, without an AI call, so
// the real answer can never leak through it.
export const BASE_SYNTAX_TEMPLATES: SyntaxTemplate[] = [
  { re: /^enable$/i, tpl: 'enable', desc: 'เข้าสู่ Privileged EXEC mode' },
  { re: /^configure terminal$/i, tpl: 'configure terminal', desc: 'เข้าสู่ Global Configuration mode' },
  { re: /^interface\s/i, tpl: 'interface [interface-type][interface-number]', desc: 'เข้าสู่ Interface Configuration mode ของพอร์ตที่ต้องตั้งค่า' },
  { re: /^ip address\s/i, tpl: 'ip address [ip-address] [subnet-mask]', desc: 'กำหนด IP Address และ Subnet Mask ให้ interface ปัจจุบัน' },
  { re: /^no shutdown$/i, tpl: 'no shutdown', desc: 'เปิดใช้งาน interface (เขียนติดกัน ไม่เว้นวรรคระหว่าง no กับ shutdown)' },
  { re: /^shutdown$/i, tpl: 'shutdown', desc: 'ปิดใช้งาน interface' },
  { re: /^exit$/i, tpl: 'exit', desc: 'ออกจาก mode ปัจจุบัน กลับขึ้นไปหนึ่งระดับ' },
  { re: /^end$/i, tpl: 'end', desc: 'ออกจาก Configuration mode กลับสู่ Privileged EXEC ทันที' },
  { re: /^write memory$/i, tpl: 'write memory', desc: 'บันทึก running-config ลง NVRAM (startup-config)' },
  { re: /^ip route\s/i, tpl: 'ip route [destination-network] [subnet-mask] [next-hop-ip]', desc: 'สร้าง Static Route ไปยัง network ปลายทาง โดยส่งผ่าน next-hop ที่ระบุ' },
  { re: /^ping\s/i, tpl: 'ping [destination-ip]', desc: 'ทดสอบการเชื่อมต่อไปยัง IP ปลายทาง' },
  { re: /^do\s+sh(ow)?\s+ip\s+route$/i, tpl: 'do show ip route', desc: 'ตรวจสอบ Routing Table จาก config mode ได้เลยโดยไม่ต้อง exit (do นำหน้า)' },
];

export function genericSyntax(cmdLine: string, extra: SyntaxTemplate[] = []): SyntaxTemplate | null {
  const bare = cmdLine.replace(/^\S+[>#]\s*/, '');
  const all = extra.concat(BASE_SYNTAX_TEMPLATES);
  for (const t of all) {
    if (t.re.test(bare)) return t;
  }
  return null;
}
