/* BLACC Universal · "Add to home screen" prompt for app pages.
   Usage: <script src="/assets/js/install.js" data-app="Block Mayhem" data-icon="/blockmayhem/icon-192.png" data-key="bm"></script>
   The page calls window.BUInstall.moment() after a good moment (a level cleared, a session finished). */
(function () {
  'use strict';
  var me = document.currentScript, APP = me.getAttribute('data-app') || 'this app', ICON = me.getAttribute('data-icon') || '', KEY = 'bu_install_' + (me.getAttribute('data-key') || 'app');
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var ua = navigator.userAgent || '', ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var iosSafari = ios && /safari/i.test(ua) && !/crios|fxios|edgios|opios|gsa\//i.test(ua);
  var deferred = null, shown = false, moments = 0;
  function get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', function () { var s = get(); s.done = 1; set(s); close(); });

  var css = '.bui{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));z-index:300;width:min(420px,calc(100% - 24px));transform:translate(-50%,140%);transition:transform .45s cubic-bezier(.2,.9,.3,1);display:grid;grid-template-columns:auto 1fr;gap:12px 14px;align-items:center;padding:14px;background:#0b0b0b;border:1px solid #262626;border-radius:4px;box-shadow:0 18px 50px rgba(0,0,0,.6);color:#fff;font-family:"Open Sans",system-ui,sans-serif}' +
    '.bui.is-in{transform:translate(-50%,0)}.bui img{width:48px;height:48px;border-radius:11px;border:1px solid #222}' +
    '.bui b{display:block;font-size:15px;font-weight:600;line-height:1.3}.bui p{margin:3px 0 0;font-size:13px;line-height:1.45;color:#a3a3a3}' +
    '.bui__btns{grid-column:1/-1;display:flex;gap:8px}.bui__btns button{flex:1;min-height:44px;border-radius:2px;font:inherit;font-size:14px;font-weight:600;cursor:pointer}' +
    '.bui__go{background:#fff;color:#000;border:1px solid #fff}.bui__no{background:transparent;color:#fff;border:1px solid #444}' +
    '.bui__share{display:inline-block;width:15px;height:15px;vertical-align:-2px;margin:0 2px}';
  var el = null;
  function build(kind) {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    el = document.createElement('div'); el.className = 'bui'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Add ' + APP + ' to your home screen');
    var share = '<svg class="bui__share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4M6 11H5v10h14V11h-1"/></svg>';
    el.innerHTML = (ICON ? '<img src="' + ICON + '" alt="">' : '<span></span>') +
      '<div><b>Put ' + APP + ' on your home screen</b>' +
      (kind === 'ios' ? '<p>Tap ' + share + ' Share below, then <b style="display:inline;font-size:13px">Add to Home Screen</b>.</p>' : '<p>Opens full screen like an app and works offline.</p>') + '</div>' +
      '<div class="bui__btns">' + (kind === 'ios' ? '<button class="bui__go" data-bui-ok>Got it</button>' : '<button class="bui__no" data-bui-no>Not now</button><button class="bui__go" data-bui-go>Install</button>') + '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target.closest('[data-bui-go]') && deferred) { deferred.prompt(); deferred.userChoice.then(function (c) { var s = get(); if (c.outcome === 'accepted') s.done = 1; else s.later = Date.now(); set(s); }); deferred = null; close(); }
      else if (e.target.closest('[data-bui-no]') || e.target.closest('[data-bui-ok]')) { var s = get(); s.later = Date.now(); s.no = (s.no || 0) + 1; set(s); close(); }
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); });
  }
  function close() { if (!el) return; el.classList.remove('is-in'); var x = el; setTimeout(function () { x.remove(); }, 500); el = null; }
  function allowed() {
    if (standalone || shown) return false;
    var s = get(); if (s.done) return false;
    if (s.no >= 2) return false;                          // asked twice, leave them alone
    if (s.later && Date.now() - s.later < 7 * 864e5) return false; // a week between asks
    return true;
  }
  function maybeShow() {
    if (!allowed()) return;
    if (deferred) { shown = true; build('android'); }
    else if (iosSafari) { shown = true; build('ios'); }
  }
  window.BUInstall = { moment: function () { moments++; setTimeout(maybeShow, 1400); }, show: maybeShow };
  // fallback: after a few minutes of real use
  setTimeout(function () { if (!moments) maybeShow(); }, 180000);
})();
