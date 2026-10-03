'use strict';
/* NETLab — shared theme toggle + main-nav dropdown behavior.
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
  try{localStorage.setItem('netlab-theme',t);}catch(e){}
  if(typeof onThemeChange==='function')onThemeChange(t);
}
function toggleTheme(){
  var cur=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
  applyTheme(cur==='light'?'dark':'light');
}
function loadTheme(){
  var saved=null;
  try{saved=localStorage.getItem('netlab-theme');}catch(e){}
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
