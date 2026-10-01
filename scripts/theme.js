'use strict';
/* NETLab / QoSLab — shared theme toggle + main-nav dropdown behavior.
   Pages without a #navLinks/#navToggle (dashboard, course, lab5) simply no-op the nav functions.
   Pages needing a post-theme-change hook (e.g. lab5's SVG topology) may define window.onThemeChange. */
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  var btn=document.getElementById('themeToggle');
  if(btn){
    var icon=btn.querySelector('.theme-toggle-icon');
    var label=btn.querySelector('.theme-toggle-label');
    if(icon||label){
      if(icon)icon.textContent=t==='light'?'☀️':'🌙';
      if(label)label.textContent=t==='light'?'โหมดกลางวัน':'โหมดกลางคืน';
    }else{
      btn.textContent=t==='light'?'☀️':'🌙';
    }
  }
  try{localStorage.setItem('qoslab-theme',t);}catch(e){}
  if(typeof onThemeChange==='function')onThemeChange(t);
}
function toggleTheme(){
  var cur=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
  applyTheme(cur==='light'?'dark':'light');
}
function loadTheme(){
  var saved=null;
  try{saved=localStorage.getItem('qoslab-theme');}catch(e){}
  if(!saved)saved=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark';
  applyTheme(saved);
}
function toggleNav(){
  var nav=document.getElementById('navLinks');
  var btn=document.getElementById('navToggle');
  if(!nav||!btn)return;
  var open=nav.classList.toggle('open');
  btn.setAttribute('aria-expanded',open?'true':'false');
}
function toggleSettings(){
  var menu=document.getElementById('settingsMenu');
  var btn=document.getElementById('settingsToggle');
  if(!menu||!btn)return;
  var open=menu.classList.toggle('open');
  btn.setAttribute('aria-expanded',open?'true':'false');
}
document.addEventListener('click',function(e){
  var nav=document.getElementById('navLinks');
  var navBtn=document.getElementById('navToggle');
  if(nav&&navBtn&&nav.classList.contains('open')&&!nav.contains(e.target)&&!navBtn.contains(e.target)){
    nav.classList.remove('open');
    navBtn.setAttribute('aria-expanded','false');
  }
  var menu=document.getElementById('settingsMenu');
  var settingsBtn=document.getElementById('settingsToggle');
  if(menu&&settingsBtn&&menu.classList.contains('open')&&!menu.contains(e.target)&&!settingsBtn.contains(e.target)){
    menu.classList.remove('open');
    settingsBtn.setAttribute('aria-expanded','false');
  }
});
loadTheme();


/* ── Keyboard access for click handlers on non-button elements ─────────────
   Several components are divs with an onclick (step rows, quiz options,
   drag-drop targets, tab strips, PC icons). A pointer reaches them; a keyboard
   does not. This gives each one a tab stop, a role, and Enter/Space activation,
   so every action in a lab can be completed without a mouse.

   Skipped deliberately:
   - natively focusable tags, which already work
   - elements that contain their own button/link/field — those are containers
     such as a modal backdrop, and making the container a tab stop would put a
     meaningless stop in front of the real controls
   - elements already processed, so repeated runs stay cheap and idempotent */
function makeClickablesFocusable(root){
  var NATIVE = {BUTTON:1, A:1, INPUT:1, SELECT:1, TEXTAREA:1, SUMMARY:1};
  var nodes = (root || document).querySelectorAll('[onclick]:not([data-kbd])');
  for(var i=0; i<nodes.length; i++){
    var el = nodes[i];
    if(NATIVE[el.tagName]) continue;
    if(el.querySelector('button,a[href],input,select,textarea')) continue;
    /* A backdrop is a dismiss surface, not a control: the dialog it covers has
       its own close button, so a tab stop here would be a stop on nothing. */
    if(/backdrop|overlay|scrim/i.test(el.className || '')) continue;
    el.setAttribute('data-kbd','1');
    if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
    if(!el.hasAttribute('role')) el.setAttribute('role','button');
  }
}

/* One listener on the document rather than one per element: the labs redraw
   their step list and quiz options constantly, and per-element listeners would
   pile up on every render. */
document.addEventListener('keydown', function(e){
  if(e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
  var el = e.target;
  if(!el || !el.getAttribute || el.getAttribute('data-kbd') !== '1') return;
  e.preventDefault();            // stop Space from scrolling the page
  el.click();
});

if(window.MutationObserver){
  new MutationObserver(function(){ makeClickablesFocusable(); })
    .observe(document.documentElement, {childList:true, subtree:true});
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ makeClickablesFocusable(); });
}else{
  makeClickablesFocusable();
}
