'use strict';
/* NETLab / QoSLab — Shared Cisco IOS command-abbreviation pattern library.
   Every lab*.html file includes this before its own inline <script>, so the regex
   objects that validate what a student types in the fake terminal are defined ONCE
   here instead of duplicated per lab. Centralizing them means a single fix or a new
   command added here is immediately available to every existing lab AND to any lab
   added later (this semester's remaining topics or a future semester-2 course) —
   nobody has to remember to patch 8+ files by hand again. */

// abbr(word, minLen) builds the regex fragment that accepts any real Cisco-style
// prefix of `word`, from `minLen` characters up to the full word — e.g.
// abbr('enable',2) -> "en(a(b(l(e)?)?)?)?" which matches en/ena/enab/enabl/enable.
// This is the same nested-optional-group technique the labs already hand-wrote for
// ENABLE_PAT/CONFT_PAT/NOSHUT_PAT, generalized so every command can get it for free.
function abbr(word, minLen){
  minLen = (minLen == null) ? 1 : minLen;
  var tail = '';
  for (var i = word.length - 1; i >= minLen; i--) {
    tail = '(' + word[i] + tail + ')?';
  }
  return word.slice(0, minLen) + tail;
}
function escDots(s){ return s.replace(/\./g, '\\.'); }

// ── Universal EXEC / global-config commands (every lab uses these) ──
var ENABLE_PAT = new RegExp('^' + abbr('enable', 2) + '$', 'i');
var CONFT_PAT  = new RegExp('^' + abbr('configure', 4) + '\\s+' + abbr('terminal', 1) + '$', 'i');
var NOSHUT_PAT = new RegExp('^no\\s+' + abbr('shutdown', 2) + '$', 'i');
var EXIT_PAT   = new RegExp('^' + abbr('exit', 2) + '$', 'i');
var END_OR_EXIT_PAT = new RegExp('^(end|' + abbr('exit', 2) + ')$', 'i');

function ifpat(n){
  return new RegExp('^' + abbr('interface', 2) + '\\s+' + abbr('gigabitethernet', 1) + '\\s*0\\/' + n + '$', 'i');
}
function ipAddrPat(ip, mask){
  return new RegExp('^ip\\s+' + abbr('address', 2) + '\\s+' + escDots(ip) + '\\s+' + escDots(mask) + '$', 'i');
}
function hostnamePat(name){
  return new RegExp('^' + abbr('hostname', 2) + '\\s+' + name + '$', 'i');
}
function ipRoutePat(net, mask, nexthop){
  return new RegExp('^ip\\s+' + abbr('route', 5) + '\\s+' + escDots(net) + '\\s+' + escDots(mask) + '\\s+' + escDots(nexthop) + '$', 'i');
}

// write memory / copy running-config startup-config, in every real-world shorthand
function writeMemPat(){
  var writeMem = abbr('write', 2) + '\\s+' + abbr('memory', 1);
  var copyRunStart = abbr('copy', 3) + '\\s+' + abbr('running-config', 1) + '\\s+' + abbr('startup-config', 1);
  return new RegExp('^(' + writeMem + '|wr|' + copyRunStart + ')$', 'i');
}
function showRunPat(){
  return new RegExp('^(do\\s+)?' + abbr('show', 2) + '\\s+' + abbr('running-config', 3) + '$', 'i');
}
function tracerouteBasicPat(ip){
  return new RegExp('^' + abbr('traceroute', 2) + '\\s+' + escDots(ip) + '(\\s+.*)?$', 'i');
}

// ── RIP (lab6/7) ──
var ROUTERRIP_PAT = new RegExp('^' + abbr('router', 6) + '\\s+rip$', 'i');
var VERSION1_PAT  = new RegExp('^' + abbr('version', 2) + '\\s+1$', 'i');
var VERSION2_PAT  = new RegExp('^' + abbr('version', 2) + '\\s+2$', 'i');
function networkPat(net){
  return new RegExp('^' + abbr('network', 3) + '\\s+' + escDots(net) + '$', 'i');
}

// ── EIGRP (lab8/10) ──
function routerEigrpPat(asn){
  return new RegExp('^' + abbr('router', 6) + '\\s+eigrp\\s+' + asn + '$', 'i');
}
var NOAUTOSUM_PAT = new RegExp('^no\\s+' + abbr('auto-summary', 2) + '$', 'i');
function networkWildcardPat(net, wildcard){
  return new RegExp('^' + abbr('network', 3) + '\\s+' + escDots(net) + '\\s+' + escDots(wildcard) + '$', 'i');
}

// ── OSPF (lab9/10) ──
function routerOspfPat(pid){
  return new RegExp('^' + abbr('router', 6) + '\\s+ospf\\s+' + pid + '$', 'i');
}
function networkAreaPat(net, wildcard, area){
  return new RegExp('^' + abbr('network', 3) + '\\s+' + escDots(net) + '\\s+' + escDots(wildcard) + '\\s+' + abbr('area', 2) + '\\s+' + area + '$', 'i');
}

// ── Redistribution (lab10) — parameterized so future redistribution labs (any
// protocol pairing, any process/AS numbers, any EIGRP seed metric) reuse the same
// abbreviation-aware grammar instead of hand-writing a new literal regex each time.
function redistributeIntoOspfPat(otherProto, otherId){
  return new RegExp('^' + abbr('redistribute', 3) + '\\s+' + otherProto + '\\s+' + otherId + '\\s+' + abbr('subnets', 3) + '$', 'i');
}
function redistributeIntoEigrpPat(otherProto, otherId, bw, delay, reliability, load, mtu){
  return new RegExp('^' + abbr('redistribute', 3) + '\\s+' + otherProto + '\\s+' + otherId +
    '\\s+' + abbr('metric', 3) + '\\s+' + bw + '\\s+' + delay + '\\s+' + reliability + '\\s+' + load + '\\s+' + mtu + '$', 'i');
}

// ── BGP (lab11) ──
function routerBgpPat(asn){
  return new RegExp('^' + abbr('router', 6) + '\\s+bgp\\s+' + asn + '$', 'i');
}
function neighborRemoteAsPat(ip, asn){
  return new RegExp('^' + abbr('neighbor', 3) + '\\s+' + escDots(ip) + '\\s+remote-as\\s+' + asn + '$', 'i');
}
function networkMaskPat(net, mask){
  return new RegExp('^' + abbr('network', 3) + '\\s+' + escDots(net) + '\\s+' + abbr('mask', 2) + '\\s+' + escDots(mask) + '$', 'i');
}

// ── Device-hardening commands (lab4) ──
function enableSecretPat(secret){
  return new RegExp('^' + abbr('enable', 2) + '\\s+' + abbr('secret', 1) + '\\s+' + secret + '$', 'i');
}
function usernameSecretPat(user, secret){
  return new RegExp('^' + abbr('username', 2) + '\\s+' + user + '\\s+' + abbr('secret', 1) + '\\s+' + secret + '$', 'i');
}
var CRYPTO_KEY_PAT = new RegExp('^' + abbr('crypto', 3) + '\\s+' + abbr('key', 1) + '\\s+' + abbr('generate', 1) + '\\s+rsa$', 'i');
function lineVtyPat(a, b){
  return new RegExp('^' + abbr('line', 2) + '\\s+vty\\s+' + a + '\\s+' + b + '$', 'i');
}
var LOGIN_LOCAL_PAT = new RegExp('^' + abbr('login', 3) + '\\s+' + abbr('local', 3) + '$', 'i');
var TRANSPORT_INPUT_SSH_PAT = new RegExp('^' + abbr('transport', 2) + '\\s+' + abbr('input', 1) + '\\s+ssh$', 'i');
function ipDomainNamePat(domain){
  return new RegExp('^ip\\s+' + abbr('domain-name', 8) + '\\s+' + escDots(domain) + '$', 'i');
}

// ── Terminal keyword lists — shared by isGibberish() (rejects input that matches no
// recognized keyword for the current mode, without counting it as a wrong attempt) and
// tabComplete() (Tab-key completion) in every lab's inline script. MODE_KEYWORDS is a flat
// per-mode word list — a word doesn't need to be the FIRST word of a command to belong here,
// any word a student might type and Tab-complete counts (e.g. "terminal" in "configure
// terminal", "memory" in "write memory"). BASE_MODE_KEYWORDS covers every word actually used
// across labs 4-11 in the modes that are common to all labs (exec, exec-priv, config,
// config-if, config-line) — extra entries a given lab doesn't use are harmless: no real
// command pattern in that lab matches them, so a mistaken match just becomes a normal wrong
// attempt instead of a false "gibberish" rejection, same as real IOS rejecting a
// syntactically-plausible-but-wrong-context command.
// config-router is deliberately NOT included here: RIP/EIGRP/OSPF/BGP each accept different
// sub-commands, so each lab passes its own list to modeKeywords(configRouterWords).
var BASE_MODE_KEYWORDS = {
  'exec':       ['enable', 'ping'],
  'exec-priv':  ['configure', 'terminal', 'write', 'memory', 'copy', 'running-config', 'startup-config',
                 'ping', 'traceroute', 'show', 'ip', 'route', 'bgp', 'summary'],
  'config':     ['interface', 'ip', 'route', 'end', 'exit', 'do', 'router', 'hostname', 'show',
                 'protocols', 'rip', 'eigrp', 'ospf', 'bgp', 'neighbor', 'neighbors', 'summary',
                 'enable', 'secret', 'username', 'crypto', 'key', 'generate', 'rsa', 'line', 'vty',
                 'domain-name', 'brief'],
  'config-if':  ['ip', 'address', 'no', 'shutdown', 'exit'],
  'config-line':['login', 'local', 'transport', 'input', 'ssh', 'exit']
};
function modeKeywords(configRouterWords){
  var m = {};
  Object.keys(BASE_MODE_KEYWORDS).forEach(function(k){ m[k] = BASE_MODE_KEYWORDS[k].slice(); });
  if (configRouterWords) m['config-router'] = configRouterWords;
  return m;
}
