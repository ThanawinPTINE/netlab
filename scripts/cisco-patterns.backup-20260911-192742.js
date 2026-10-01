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
var ENABLE_PAT = /^en(a(b(le?)?)?)?$/i;
var CONFT_PAT  = /^conf(ig(ure)?)?\s+t(erm(inal)?)?$/i;
var NOSHUT_PAT = /^no\s+shut(d(o(w(n)?)?)?)?$/i;
var EXIT_PAT   = new RegExp('^' + abbr('exit', 2) + '$', 'i');
var END_OR_EXIT_PAT = new RegExp('^(end|' + abbr('exit', 2) + ')$', 'i');

function ifpat(n){
  return new RegExp('^int(erface)?\\s+g(i(gabitethernet)?)?\\s*0\\/' + n + '$', 'i');
}
function ipAddrPat(ip, mask){
  return new RegExp('^ip\\s+add(r(e(s(s)?)?)?)?\\s+' + escDots(ip) + '\\s+' + escDots(mask) + '$', 'i');
}
function hostnamePat(name){
  return new RegExp('^' + abbr('hostname', 4) + '\\s+' + name + '$', 'i');
}
function ipRoutePat(net, mask, nexthop){
  return new RegExp('^ip\\s+' + abbr('route', 3) + '\\s+' + escDots(net) + '\\s+' + escDots(mask) + '\\s+' + escDots(nexthop) + '$', 'i');
}

// write memory / copy running-config startup-config, in every real-world shorthand
function writeMemPat(){
  var writeMem = abbr('write', 2) + '\\s+' + abbr('memory', 3);
  var copyRunStart = abbr('copy', 2) + '\\s+' + abbr('running-config', 1) + '\\s+' + abbr('startup-config', 1);
  return new RegExp('^(' + writeMem + '|wr|' + copyRunStart + ')$', 'i');
}
function showRunPat(){
  return new RegExp('^(do\\s+)?' + abbr('show', 2) + '\\s+' + abbr('running-config', 3) + '$', 'i');
}
function tracerouteBasicPat(ip){
  return new RegExp('^' + abbr('traceroute', 5) + '\\s+' + escDots(ip) + '(\\s+.*)?$', 'i');
}

// ── RIP (lab6/7) ──
var ROUTERRIP_PAT = new RegExp('^' + abbr('router', 4) + '\\s+rip$', 'i');
var VERSION1_PAT  = new RegExp('^' + abbr('version', 3) + '\\s+1$', 'i');
var VERSION2_PAT  = new RegExp('^' + abbr('version', 3) + '\\s+2$', 'i');
function networkPat(net){
  return new RegExp('^' + abbr('network', 3) + '\\s+' + escDots(net) + '$', 'i');
}

// ── EIGRP (lab8/10) ──
function routerEigrpPat(asn){
  return new RegExp('^' + abbr('router', 4) + '\\s+eigrp\\s+' + asn + '$', 'i');
}
var NOAUTOSUM_PAT = new RegExp('^no\\s+' + abbr('auto-summary', 5) + '$', 'i');
function networkWildcardPat(net, wildcard){
  return new RegExp('^' + abbr('network', 3) + '\\s+' + escDots(net) + '\\s+' + escDots(wildcard) + '$', 'i');
}

// ── OSPF (lab9/10) ──
function routerOspfPat(pid){
  return new RegExp('^' + abbr('router', 4) + '\\s+ospf\\s+' + pid + '$', 'i');
}
function networkAreaPat(net, wildcard, area){
  return new RegExp('^' + abbr('network', 3) + '\\s+' + escDots(net) + '\\s+' + escDots(wildcard) + '\\s+' + abbr('area', 2) + '\\s+' + area + '$', 'i');
}

// ── Redistribution (lab10) — parameterized so future redistribution labs (any
// protocol pairing, any process/AS numbers, any EIGRP seed metric) reuse the same
// abbreviation-aware grammar instead of hand-writing a new literal regex each time.
function redistributeIntoOspfPat(otherProto, otherId){
  return new RegExp('^' + abbr('redistribute', 6) + '\\s+' + otherProto + '\\s+' + otherId + '\\s+' + abbr('subnets', 3) + '$', 'i');
}
function redistributeIntoEigrpPat(otherProto, otherId, bw, delay, reliability, load, mtu){
  return new RegExp('^' + abbr('redistribute', 6) + '\\s+' + otherProto + '\\s+' + otherId +
    '\\s+' + abbr('metric', 3) + '\\s+' + bw + '\\s+' + delay + '\\s+' + reliability + '\\s+' + load + '\\s+' + mtu + '$', 'i');
}

// ── BGP (lab11) ──
function routerBgpPat(asn){
  return new RegExp('^' + abbr('router', 4) + '\\s+bgp\\s+' + asn + '$', 'i');
}
function neighborRemoteAsPat(ip, asn){
  return new RegExp('^' + abbr('neighbor', 5) + '\\s+' + escDots(ip) + '\\s+remote-as\\s+' + asn + '$', 'i');
}
function networkMaskPat(net, mask){
  return new RegExp('^' + abbr('network', 3) + '\\s+' + escDots(net) + '\\s+' + abbr('mask', 2) + '\\s+' + escDots(mask) + '$', 'i');
}

// ── Device-hardening commands (lab4) ──
function enableSecretPat(secret){
  return new RegExp('^' + abbr('enable', 2) + '\\s+' + abbr('secret', 3) + '\\s+' + secret + '$', 'i');
}
function usernameSecretPat(user, secret){
  return new RegExp('^' + abbr('username', 4) + '\\s+' + user + '\\s+' + abbr('secret', 3) + '\\s+' + secret + '$', 'i');
}
var CRYPTO_KEY_PAT = new RegExp('^' + abbr('crypto', 3) + '\\s+' + abbr('key', 3) + '\\s+' + abbr('generate', 3) + '\\s+rsa$', 'i');
function lineVtyPat(a, b){
  return new RegExp('^' + abbr('line', 2) + '\\s+vty\\s+' + a + '\\s+' + b + '$', 'i');
}
var LOGIN_LOCAL_PAT = new RegExp('^' + abbr('login', 3) + '\\s+' + abbr('local', 3) + '$', 'i');
var TRANSPORT_INPUT_SSH_PAT = new RegExp('^' + abbr('transport', 4) + '\\s+' + abbr('input', 3) + '\\s+ssh$', 'i');
function ipDomainNamePat(domain){
  return new RegExp('^ip\\s+' + abbr('domain-name', 6) + '\\s+' + escDots(domain) + '$', 'i');
}
