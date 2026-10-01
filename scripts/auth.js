'use strict';
/* NETLab / QoSLab — Google Sign-In (organization email only) + client-side session gate.
   Backend verifies the Google ID token and the @email.kmutnb.ac.th domain once at login;
   after that, pages only trust the profile object this file wrote to localStorage. */
var AUTH_KEY = 'netlab-profile';
var AUTH_SESSION_DAYS = 7;
var AUTH_API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8000' : 'http://' + window.location.hostname + '/api';

function getProfile(){
  var raw;
  try{ raw = localStorage.getItem(AUTH_KEY); }catch(e){ return null; }
  if(!raw) return null;
  var data;
  try{ data = JSON.parse(raw); }catch(e){ return null; }
  if(!data || !data.exp || Date.now() > data.exp) {
    try{ localStorage.removeItem(AUTH_KEY); }catch(e){}
    return null;
  }
  return data.profile;
}

function logout(){
  try{ localStorage.removeItem(AUTH_KEY); }catch(e){}
  window.location.href = '/index.html';
}

function requireAuth(){
  var profile = getProfile();
  if(!profile){
    window.location.href = '/login.html?login=required';
    return null;
  }
  return profile;
}

async function handleGoogleCredential(response){
  var statusEl = document.getElementById('authStatus');
  if(statusEl) statusEl.textContent = 'กำลังตรวจสอบอีเมล...';
  try{
    var res = await fetch(AUTH_API_BASE + '/auth/google', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({credential: response.credential})
    });
    var data = await res.json();
    if(!res.ok){
      if(statusEl) statusEl.textContent = data.detail || 'เข้าสู่ระบบไม่สำเร็จ';
      return;
    }
    var exp = Date.now() + AUTH_SESSION_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(AUTH_KEY, JSON.stringify({profile: data.profile, exp: exp}));
    window.location.href = '/labs.html';
  }catch(e){
    if(statusEl) statusEl.textContent = 'เชื่อมต่อ server ไม่ได้ ลองใหม่อีกครั้ง';
  }
}

/* ── Guest access (LAN only) ──────────────────────────────────────────────
   Google OAuth cannot authorize a raw private IP as a JavaScript origin, so a
   classmate on the same Wi-Fi can never complete sign-in. isLanHost() is true
   only for RFC1918 addresses, which is exactly the case Google refuses and
   never matches localhost or a deployed domain — so the guest door does not
   exist in production. A guest has no studentId, and saveProgress() already
   returns early without one, so nothing a guest does is written to the
   database. */
function isLanHost(){
  var h = window.location.hostname;
  return /^10\./.test(h)
      || /^192\.168\./.test(h)
      || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(h);
}

function isGuest(){
  var p = getProfile();
  return !!(p && p.guest);
}

function signInAsGuest(){
  if(!isLanHost()) return;
  var exp = Date.now() + 24 * 60 * 60 * 1000;   // หมดอายุใน 1 วัน
  localStorage.setItem(AUTH_KEY, JSON.stringify({
    exp: exp,
    profile: {name: 'ผู้เยี่ยมชม', email: '', studentId: null, guest: true}
  }));
  window.location.href = '/labs.html';
}

function initials(name){
  return (name || '?').trim().charAt(0).toUpperCase();
}

function renderAuthNav(){
  var slot = document.getElementById('authSlot');
  if(!slot) return;
  var profile = getProfile();
  if(!profile){
    slot.innerHTML = '';
    return;
  }
  if(profile.guest){
    slot.innerHTML = '<span class="profile-avatar profile-avatar-fallback" '
      + 'title="โหมดผู้เยี่ยมชม — ความคืบหน้าจะไม่ถูกบันทึก" '
      + 'style="cursor:default">ผู้เยี่ยมชม</span>';
    return;
  }
  slot.innerHTML = profile.picture
    ? '<a class="profile-avatar" href="/profile.html" title="'+profile.name+'"><img src="'+profile.picture+'" alt=""></a>'
    : '<a class="profile-avatar profile-avatar-fallback" href="/profile.html" title="'+profile.name+'">'+initials(profile.name)+'</a>';
}
