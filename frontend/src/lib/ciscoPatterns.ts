/* NETLab — Shared Cisco IOS command-abbreviation pattern library.
   Ported 1:1 from public/scripts/cisco-patterns.js. Every lab page imports this
   instead of duplicating the regex builders, so a single fix or a new command
   added here is immediately available to every lab. */

// abbr(word, minLen) builds the regex fragment that accepts any real Cisco-style
// prefix of `word`, from `minLen` characters up to the full word — e.g.
// abbr('enable',2) -> "en(a(b(l(e)?)?)?)?" which matches en/ena/enab/enabl/enable.
export function abbr(word: string, minLen?: number): string {
  minLen = minLen == null ? 1 : minLen;
  let tail = '';
  for (let i = word.length - 1; i >= minLen; i--) {
    tail = '(' + word[i] + tail + ')?';
  }
  return word.slice(0, minLen) + tail;
}

export function escDots(s: string): string {
  return s.replace(/\./g, '\\.');
}

// ── Universal EXEC / global-config commands (every lab uses these) ──
export const ENABLE_PAT = new RegExp('^' + abbr('enable', 2) + '$', 'i');
export const CONFT_PAT = new RegExp('^' + abbr('configure', 4) + '\\s+' + abbr('terminal', 1) + '$', 'i');
export const NOSHUT_PAT = new RegExp('^no\\s+' + abbr('shutdown', 2) + '$', 'i');
export const EXIT_PAT = new RegExp('^' + abbr('exit', 2) + '$', 'i');
export const END_OR_EXIT_PAT = new RegExp('^(end|' + abbr('exit', 2) + ')$', 'i');

export function ifpat(n: number | string): RegExp {
  return new RegExp('^' + abbr('interface', 2) + '\\s+' + abbr('gigabitethernet', 1) + '\\s*0\\/' + n + '$', 'i');
}
export function ipAddrPat(ip: string, mask: string): RegExp {
  return new RegExp('^ip\\s+' + abbr('address', 2) + '\\s+' + escDots(ip) + '\\s+' + escDots(mask) + '$', 'i');
}
export function hostnamePat(name: string): RegExp {
  return new RegExp('^' + abbr('hostname', 2) + '\\s+' + name + '$', 'i');
}
export function ipRoutePat(net: string, mask: string, nexthop: string): RegExp {
  return new RegExp('^ip\\s+' + abbr('route', 5) + '\\s+' + escDots(net) + '\\s+' + escDots(mask) + '\\s+' + escDots(nexthop) + '$', 'i');
}

// write memory / copy running-config startup-config, in every real-world shorthand
export function writeMemPat(): RegExp {
  const writeMem = abbr('write', 2) + '\\s+' + abbr('memory', 1);
  const copyRunStart = abbr('copy', 3) + '\\s+' + abbr('running-config', 1) + '\\s+' + abbr('startup-config', 1);
  return new RegExp('^(' + writeMem + '|wr|' + copyRunStart + ')$', 'i');
}
export function showRunPat(): RegExp {
  return new RegExp('^(do\\s+)?' + abbr('show', 2) + '\\s+' + abbr('running-config', 3) + '$', 'i');
}
export function tracerouteBasicPat(ip: string): RegExp {
  return new RegExp('^' + abbr('traceroute', 2) + '\\s+' + escDots(ip) + '(\\s+.*)?$', 'i');
}

// ── RIP (lab6/7) ──
export const ROUTERRIP_PAT = new RegExp('^' + abbr('router', 6) + '\\s+rip$', 'i');
export const VERSION1_PAT = new RegExp('^' + abbr('version', 2) + '\\s+1$', 'i');
export const VERSION2_PAT = new RegExp('^' + abbr('version', 2) + '\\s+2$', 'i');
export function networkPat(net: string): RegExp {
  return new RegExp('^' + abbr('network', 3) + '\\s+' + escDots(net) + '$', 'i');
}

// ── EIGRP (lab8/10) ──
export function routerEigrpPat(asn: number | string): RegExp {
  return new RegExp('^' + abbr('router', 6) + '\\s+eigrp\\s+' + asn + '$', 'i');
}
export const NOAUTOSUM_PAT = new RegExp('^no\\s+' + abbr('auto-summary', 2) + '$', 'i');
export function networkWildcardPat(net: string, wildcard: string): RegExp {
  return new RegExp('^' + abbr('network', 3) + '\\s+' + escDots(net) + '\\s+' + escDots(wildcard) + '$', 'i');
}

// ── OSPF (lab9/10) ──
export function routerOspfPat(pid: number | string): RegExp {
  return new RegExp('^' + abbr('router', 6) + '\\s+ospf\\s+' + pid + '$', 'i');
}
export function networkAreaPat(net: string, wildcard: string, area: number | string): RegExp {
  return new RegExp('^' + abbr('network', 3) + '\\s+' + escDots(net) + '\\s+' + escDots(wildcard) + '\\s+' + abbr('area', 2) + '\\s+' + area + '$', 'i');
}

// ── Redistribution (lab10) ──
export function redistributeIntoOspfPat(otherProto: string, otherId: number | string): RegExp {
  return new RegExp('^' + abbr('redistribute', 3) + '\\s+' + otherProto + '\\s+' + otherId + '\\s+' + abbr('subnets', 3) + '$', 'i');
}
export function redistributeIntoEigrpPat(
  otherProto: string,
  otherId: number | string,
  bw: number | string,
  delay: number | string,
  reliability: number | string,
  load: number | string,
  mtu: number | string,
): RegExp {
  return new RegExp(
    '^' + abbr('redistribute', 3) + '\\s+' + otherProto + '\\s+' + otherId +
    '\\s+' + abbr('metric', 3) + '\\s+' + bw + '\\s+' + delay + '\\s+' + reliability + '\\s+' + load + '\\s+' + mtu + '$',
    'i',
  );
}

// ── BGP (lab11) ──
export function routerBgpPat(asn: number | string): RegExp {
  return new RegExp('^' + abbr('router', 6) + '\\s+bgp\\s+' + asn + '$', 'i');
}
export function neighborRemoteAsPat(ip: string, asn: number | string): RegExp {
  return new RegExp('^' + abbr('neighbor', 3) + '\\s+' + escDots(ip) + '\\s+remote-as\\s+' + asn + '$', 'i');
}
export function networkMaskPat(net: string, mask: string): RegExp {
  return new RegExp('^' + abbr('network', 3) + '\\s+' + escDots(net) + '\\s+' + abbr('mask', 2) + '\\s+' + escDots(mask) + '$', 'i');
}

// ── Device-hardening commands (lab4) ──
export function enableSecretPat(secret: string): RegExp {
  return new RegExp('^' + abbr('enable', 2) + '\\s+' + abbr('secret', 1) + '\\s+' + secret + '$', 'i');
}
export function usernameSecretPat(user: string, secret: string): RegExp {
  return new RegExp('^' + abbr('username', 2) + '\\s+' + user + '\\s+' + abbr('secret', 1) + '\\s+' + secret + '$', 'i');
}
export const CRYPTO_KEY_PAT = new RegExp(
  '^' + abbr('crypto', 3) + '\\s+' + abbr('key', 1) + '\\s+' + abbr('generate', 1) + '\\s+rsa\\s+' +
  abbr('general-keys', 3) + '\\s+' + abbr('modulus', 3) + '\\s+1024$',
  'i',
);
export function lineVtyPat(a: number | string, b: number | string): RegExp {
  return new RegExp('^' + abbr('line', 2) + '\\s+vty\\s+' + a + '\\s+' + b + '$', 'i');
}
export const LOGIN_LOCAL_PAT = new RegExp('^' + abbr('login', 3) + '\\s+' + abbr('local', 3) + '$', 'i');
export const TRANSPORT_INPUT_SSH_PAT = new RegExp('^' + abbr('transport', 2) + '\\s+' + abbr('input', 1) + '\\s+ssh$', 'i');
export function ipDomainNamePat(domain: string): RegExp {
  return new RegExp('^ip\\s+' + abbr('domain-name', 8) + '\\s+' + escDots(domain) + '$', 'i');
}

// ── Terminal keyword lists — shared by isGibberish() and tabComplete() in every
// lab's terminal component. config-router is deliberately NOT included: RIP/EIGRP/
// OSPF/BGP each accept different sub-commands, so each lab passes its own list to
// modeKeywords(configRouterWords). ──
export const BASE_MODE_KEYWORDS: Record<string, string[]> = {
  exec: ['enable', 'ping'],
  'exec-priv': ['configure', 'terminal', 'write', 'memory', 'copy', 'running-config', 'startup-config',
    'ping', 'traceroute', 'show', 'ip', 'route', 'bgp', 'summary'],
  config: ['interface', 'ip', 'route', 'end', 'exit', 'do', 'router', 'hostname', 'show',
    'protocols', 'rip', 'eigrp', 'ospf', 'bgp', 'neighbor', 'neighbors', 'summary',
    'enable', 'secret', 'username', 'crypto', 'key', 'generate', 'rsa', 'general-keys',
    'modulus', 'line', 'vty', 'domain-name', 'brief'],
  'config-if': ['ip', 'address', 'no', 'shutdown', 'exit'],
  'config-line': ['login', 'local', 'transport', 'input', 'ssh', 'exit'],
};

export function modeKeywords(configRouterWords?: string[]): Record<string, string[]> {
  const m: Record<string, string[]> = {};
  Object.keys(BASE_MODE_KEYWORDS).forEach((k) => {
    m[k] = BASE_MODE_KEYWORDS[k].slice();
  });
  if (configRouterWords) m['config-router'] = configRouterWords;
  return m;
}
