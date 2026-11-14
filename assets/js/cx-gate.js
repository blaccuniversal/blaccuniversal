/* Constructs gate · BLACC Universal
   Usage (in <head>, not deferred, after cx-codes.js):
   <script src="/assets/js/cx-gate.js" data-id="asa" data-name="ÀṢÀ Bar & Kitchen"></script>
   - First visit: a free preview of 1:23, then the page locks.
   - Unlock with an access code for this construct, or the owner code (any construct).
   - A floating dock offers "Make an offer" and "Build yours". */
(function () {
  'use strict';
  var me = document.currentScript;
  var ID = me.getAttribute('data-id'), NAME = me.getAttribute('data-name') || 'This construct';
  var PREVIEW = 83, DAYS = 30;
  var FORM_KEY = 'c45f617c-f3f2-4caa-93cf-5d49e2cece46';
  var K_START = 'cx_t_' + ID, K_UNLOCK = 'cx_u_' + ID;
  var root = document.documentElement;

  function get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function owner() { var v = get('cx_pass'); return !!(v && v.h === window.CX_OWNER && v.until > Date.now()); }
  function unlocked() { if (owner()) return true; var v = get(K_UNLOCK); return !!(v && v.until > Date.now() && (window.CX_CODES[ID] || []).indexOf(v.h) > -1); }
  var start = get(K_START);
  if (!start) { start = Date.now(); put(K_START, start); }
  function left() { return Math.max(0, PREVIEW - (Date.now() - start) / 1000); }
  var isOpen = unlocked();
  if (!isOpen && left() <= 0) root.classList.add('cxg-locked');

  /* ---------- styles ---------- */
  var css = '' +
    'html.cxg-locked body{overflow:hidden}' +
    'html.cxg-locked body>*:not(.cxg){filter:blur(18px) brightness(.45);pointer-events:none;user-select:none}' +
    '.cxg{--w:#f4f1ec;--m:#8b8b8b;--l:rgba(255,255,255,.14);font-family:"Open Sans",system-ui,-apple-system,sans-serif;color:var(--w);-webkit-font-smoothing:antialiased}' +
    '.cxg *{box-sizing:border-box}.cxg :where(button,input,textarea,select){font:inherit;color:inherit}' +
    '.cxg [hidden]{display:none!important}' +
    /* dock */
    '.cxg-dock{position:fixed;z-index:9990;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:6px;padding:6px;border:1px solid var(--l);border-radius:999px;background:rgba(10,10,10,.82);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:0 14px 40px rgba(0,0,0,.45);animation:cxgIn .7s cubic-bezier(.2,.7,.2,1) .8s both}' +
    '@keyframes cxgIn{from{opacity:0;transform:translateY(16px)}}' +
    '.cxg-b{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 15px 0 12px;border:1px solid transparent;border-radius:999px;background:none;font-size:12px;font-weight:600;letter-spacing:.06em;cursor:pointer;white-space:nowrap;transition:background .25s,border-color .25s,color .25s}' +
    '.cxg-b svg{width:18px;height:18px;flex:none;overflow:visible}' +
    '.cxg-b--o{border-color:var(--l)}.cxg-b--o:hover{border-color:var(--w)}' +
    '.cxg-b--w{background:var(--w);color:#0b0b0b}.cxg-b--w:hover{background:#fff}' +
    '.cxg-t{display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 12px 0 8px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--w)}' +
    '.cxg-t svg{width:22px;height:22px;transform:rotate(-90deg)}.cxg-t circle{fill:none;stroke-width:2.2}' +
    '.cxg-t .r1{stroke:rgba(255,255,255,.18)}.cxg-t .r2{stroke:var(--w);stroke-linecap:round;transition:stroke-dashoffset 1s linear}' +
    '.cxg-t.is-low{color:#ffb4a2}.cxg-t.is-low .r2{stroke:#ffb4a2}' +
    '.cxg-sep{width:1px;height:22px;background:var(--l)}' +
    /* moving icons */
    '.cxi-gavel{transform-box:view-box;transform-origin:15px 15px;animation:cxiGavel 1.6s cubic-bezier(.5,0,.3,1) infinite}' +
    '@keyframes cxiGavel{0%,55%,100%{transform:rotate(0)}25%{transform:rotate(-28deg)}45%{transform:rotate(4deg)}}' +
    '.cxi-hit{transform-box:view-box;transform-origin:5px 20px;animation:cxiHit 1.6s ease-out infinite}' +
    '@keyframes cxiHit{0%,42%{opacity:0;transform:scale(.6)}50%{opacity:1}70%,100%{opacity:0;transform:scale(1.3)}}' +
    '.cxi-ham{transform-box:view-box;transform-origin:4px 20px;animation:cxiHam 1.1s cubic-bezier(.5,0,.3,1) infinite}' +
    '@keyframes cxiHam{0%,100%{transform:rotate(0)}38%{transform:rotate(-22deg)}62%{transform:rotate(5deg)}74%{transform:rotate(0)}}' +
    '.cxi-sh{transform-box:view-box;transform-origin:16px 11px;animation:cxiSh 2.4s ease-in-out infinite}' +
    '@keyframes cxiSh{0%,30%,100%{transform:translateY(0)}45%,70%{transform:translateY(-2.5px)}}' +
    '@media (prefers-reduced-motion:reduce){.cxg *{animation:none!important}}' +
    /* lock + sheets */
    '.cxg-ov{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.55);animation:cxgFade .35s ease both;overflow-y:auto}' +
    '@keyframes cxgFade{from{opacity:0}}' +
    '.cxg-card{position:relative;width:100%;max-width:440px;margin:auto;padding:34px clamp(22px,5vw,36px) 28px;border:1px solid var(--l);border-radius:2px;background:#0b0b0b;box-shadow:0 30px 80px rgba(0,0,0,.6);animation:cxgUp .5s cubic-bezier(.2,.7,.2,1) both}' +
    '@keyframes cxgUp{from{opacity:0;transform:translateY(14px)}}' +
    '.cxg-x{position:absolute;top:10px;right:10px;width:40px;height:40px;display:grid;place-items:center;border:0;background:none;color:var(--m);cursor:pointer}.cxg-x:hover{color:var(--w)}.cxg-x svg{width:20px;height:20px}' +
    '.cxg-ic{width:64px;height:64px;display:grid;place-items:center;margin:0 auto 20px;border:1px solid var(--l);border-radius:2px}.cxg-ic svg{width:28px;height:28px;overflow:visible}' +
    '.cxg-ey{margin:0 0 8px;text-align:center;font-size:11px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--m)}' +
    '.cxg-h{margin:0 0 10px;text-align:center;font-size:26px;font-weight:600;letter-spacing:-.01em;line-height:1.15;text-wrap:balance}' +
    '.cxg-p{margin:0 0 22px;text-align:center;font-size:14px;line-height:1.6;color:#b8b8b8;text-wrap:pretty}' +
    '.cxg-code{display:flex;border:1px solid var(--l);border-radius:2px;background:#060606;transition:border-color .25s}.cxg-code:focus-within{border-color:#8a8a8a}' +
    '.cxg-code input{flex:1;min-width:0;height:52px;padding:0 0 0 52px;border:0;background:none;font-size:17px;font-weight:600;letter-spacing:.18em;text-align:center;text-transform:uppercase;outline:none}' +
    '.cxg-code input::placeholder{letter-spacing:.1em;font-weight:400;color:#555;text-transform:none}' +
    '.cxg-code button{width:52px;height:52px;display:grid;place-items:center;border:0;background:none;color:#9a9a9a;cursor:pointer;transition:color .2s,transform .2s}.cxg-code button:hover{color:#fff;transform:translateX(2px)}.cxg-code button svg{width:20px;height:20px}' +
    '.cxg-code.is-no{animation:cxgNo .4s;border-color:#6b2c22}@keyframes cxgNo{20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}' +
    '.cxg-err{margin:10px 0 0;text-align:center;font-size:13px;color:#ffb4a2}' +
    '.cxg-or{display:flex;align-items:center;gap:12px;margin:22px 0 16px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#5f5f5f}.cxg-or::before,.cxg-or::after{content:"";flex:1;height:1px;background:var(--l)}' +
    '.cxg-row{display:grid;grid-template-columns:1fr;gap:8px}' +
    '.cxg-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:48px;padding:0 18px;border:1px solid var(--l);border-radius:2px;background:none;font-size:13px;font-weight:600;letter-spacing:.06em;cursor:pointer;transition:border-color .2s,background .2s,color .2s}' +
    '.cxg-btn:hover{border-color:var(--w)}.cxg-btn svg{width:18px;height:18px;overflow:visible}' +
    '.cxg-btn--w{background:var(--w);border-color:var(--w);color:#0b0b0b}.cxg-btn--w:hover{background:#fff}' +
    '.cxg-f{display:flex;flex-direction:column;gap:12px}' +
    '.cxg-f label{display:flex;flex-direction:column;gap:6px;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--m)}' +
    '.cxg-f label small{font-weight:400;letter-spacing:.04em;text-transform:none;color:#5f5f5f}' +
    '.cxg-f input,.cxg-f textarea{width:100%;min-height:48px;padding:12px 14px;border:1px solid var(--l);border-radius:2px;background:#060606;font-size:16px;letter-spacing:0;text-transform:none;outline:none;resize:vertical}' +
    '.cxg-f input:focus,.cxg-f textarea:focus{border-color:#8a8a8a}' +
    '.cxg-f2{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
    '.cxg-money{position:relative}.cxg-money span{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;color:var(--m);letter-spacing:0}.cxg-money input{padding-left:30px;font-variant-numeric:tabular-nums}' +
    '.cxg-chips{display:flex;flex-wrap:wrap;gap:6px}.cxg-chips label{flex-direction:row;cursor:pointer}' +
    '.cxg-chips input{position:absolute;opacity:0;pointer-events:none}.cxg-chips span{display:inline-flex;align-items:center;height:36px;padding:0 14px;border:1px solid var(--l);border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:none;color:#cfcfcf;transition:all .2s}' +
    '.cxg-chips input:checked+span{background:var(--w);border-color:var(--w);color:#0b0b0b}' +
    '.cxg-done{text-align:center}.cxg-done .cxg-ic{border-color:var(--w)}' +
    '.cxg-fine{margin:16px 0 0;text-align:center;font-size:11px;color:#5f5f5f}' +
    '.cxg-s{display:none}' +
    '@media (max-width:560px){.cxg-l{display:none}.cxg-s{display:inline}.cxg-dock{left:auto;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));justify-content:space-between}.cxg-b{padding:0 13px 0 10px}.cxg-sep{display:none}.cxg-t{padding-right:6px}.cxg-card{padding-top:30px}.cxg-h{font-size:23px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- icons ---------- */
  var S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var I = {
    gavel: '<svg ' + S + '><g class="cxi-gavel"><path d="m14.5 12.5-8 8a2.1 2.1 0 0 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/></g><path class="cxi-hit" d="M2 22h7"/></svg>',
    hammer: '<svg ' + S + '><g class="cxi-ham"><path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"/></g></svg>',
    lock: '<svg ' + S + '><rect x="4" y="11" width="16" height="10" rx="2"/><path class="cxi-sh" d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none"/></svg>',
    arrow: '<svg ' + S + '><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    x: '<svg ' + S + '><path d="M6 6l12 12M18 6 6 18"/></svg>',
    key: '<svg ' + S + '><circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2"/></svg>',
    tick: '<svg ' + S + '><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(s) { s = Math.ceil(s); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function hex(b) { return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function sha(t) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)).then(hex); }

  var wrap, dock, timerEl, sheet, lockShown = false;

  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function () {
    wrap = document.createElement('div'); wrap.className = 'cxg'; document.body.appendChild(wrap);
    dock = document.createElement('div'); dock.className = 'cxg-dock'; dock.setAttribute('role', 'region'); dock.setAttribute('aria-label', 'About this concept');
    dock.innerHTML =
      (isOpen ? '' : '<span class="cxg-t" data-t title="Free preview time left"><svg viewBox="0 0 24 24"><circle class="r1" cx="12" cy="12" r="9"/><circle class="r2" cx="12" cy="12" r="9" stroke-dasharray="56.55" stroke-dashoffset="0"/></svg><b>' + fmt(left()) + '</b></span><span class="cxg-sep"></span>') +
      '<button class="cxg-b cxg-b--o" type="button" data-cxg="offer">' + I.gavel + '<span class="cxg-l">Make an offer</span><span class="cxg-s">Offer</span></button>' +
      '<button class="cxg-b cxg-b--w" type="button" data-cxg="build">' + I.hammer + '<span class="cxg-l">Build yours</span><span class="cxg-s">Build</span></button>';
    wrap.appendChild(dock);
    timerEl = dock.querySelector('[data-t]');
    wrap.addEventListener('click', onClick);
    wrap.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet && !sheet.hasAttribute('data-lock')) close(); });
    if (!isOpen) tick();
  });

  function tick() {
    if (isOpen) return;
    var l = left();
    if (timerEl) {
      timerEl.querySelector('b').textContent = fmt(l);
      timerEl.querySelector('.r2').style.strokeDashoffset = (56.55 * (1 - l / PREVIEW)).toFixed(2);
      timerEl.classList.toggle('is-low', l <= 15);
    }
    if (l <= 0) { lock(); return; }
    setTimeout(tick, 500);
  }

  /* ---------- sheets ---------- */
  function open(html, isLock) {
    close(true);
    sheet = document.createElement('div'); sheet.className = 'cxg-ov';
    if (isLock) sheet.setAttribute('data-lock', '');
    sheet.innerHTML = '<div class="cxg-card" role="dialog" aria-modal="true">' + (isLock ? '' : '<button class="cxg-x" type="button" data-cxg="close" aria-label="Close">' + I.x + '</button>') + html + '</div>';
    wrap.appendChild(sheet);
    var f = sheet.querySelector('input'); if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }
  function close(silent) { if (sheet) { sheet.remove(); sheet = null; } if (!silent && !isOpen && left() <= 0) lock(); }

  function lockHTML() {
    return '<div class="cxg-ic">' + I.lock + '</div>' +
      '<p class="cxg-ey">Concept by BLACC Universal</p>' +
      '<h2 class="cxg-h">Your preview of ' + esc(NAME) + ' has ended.</h2>' +
      '<p class="cxg-p">Enter an access code to keep exploring. No code yet? Request one and we’ll send it to you.</p>' +
      '<form class="cxg-code" data-form="code" novalidate><input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Access code" aria-label="Access code"><button type="submit" aria-label="Unlock">' + I.arrow + '</button></form>' +
      '<p class="cxg-err" data-err hidden>That code didn’t work for this construct.</p>' +
      '<div class="cxg-or">or</div>' +
      '<div class="cxg-row"><button class="cxg-btn cxg-btn--w" type="button" data-cxg="request">' + I.key + 'Request an access code</button>' +
      '<button class="cxg-btn" type="button" data-cxg="offer">' + I.gavel + 'Make an offer</button>' +
      '<button class="cxg-btn" type="button" data-cxg="build">' + I.hammer + 'Build my website</button></div>';
  }
  function lock() {
    if (isOpen) return;
    root.classList.add('cxg-locked'); lockShown = true;
    if (dock) dock.hidden = true;
    open(lockHTML(), true);
  }

  var FORMS = {
    request: {
      icon: I.key, eye: 'Access code', title: 'Request a code for ' + NAME + '.',
      p: 'Tell us who you are. We’ll send your code by email or WhatsApp.',
      fields: '<label>Name<input name="name" autocomplete="name" required></label>' +
        '<label>Email<input name="email" type="email" autocomplete="email" required></label>' +
        '<label>Phone / WhatsApp <small>(optional)</small><input name="phone" type="tel" autocomplete="tel" placeholder="+234"></label>' +
        '<label>Why are you interested? <small>(optional)</small><textarea name="message" rows="3"></textarea></label>',
      btn: 'Request code', subject: 'Access code request — ' + NAME,
      done: 'Request sent. We’ll send your code shortly.'
    },
    offer: {
      icon: I.gavel, eye: 'Make an offer', title: 'Want ' + NAME + '?',
      p: 'This site is for sale. Name your price and we’ll get back to you.',
      fields: '<label>Name<input name="name" autocomplete="name" required></label>' +
        '<div class="cxg-f2"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Phone<input name="phone" type="tel" autocomplete="tel" placeholder="+234" required></label></div>' +
        '<label>Your offer<span class="cxg-money"><span>₦</span><input name="offer" inputmode="numeric" placeholder="e.g. 500,000" required></span></label>' +
        '<label>Business or brand <small>(optional)</small><input name="business"></label>' +
        '<label>Message <small>(optional)</small><textarea name="message" rows="3"></textarea></label>',
      btn: 'Send offer', subject: 'Offer — ' + NAME,
      done: 'Offer received. We’ll be in touch soon.'
    },
    build: {
      icon: I.hammer, eye: 'Build with us', title: 'Let’s build your next project.',
      p: 'Websites, apps and brands, built in the BLACC Universal style.',
      fields: '<div class="cxg-chips" role="group" aria-label="What do you need">' +
        ['Website', 'App', 'Branding', 'Online store', 'Something else'].map(function (c, i) { return '<label><input type="checkbox" name="need" value="' + c + '"' + (i ? '' : ' checked') + '><span>' + c + '</span></label>'; }).join('') + '</div>' +
        '<label>Name<input name="name" autocomplete="name" required></label>' +
        '<div class="cxg-f2"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Phone <small>(optional)</small><input name="phone" type="tel" autocomplete="tel" placeholder="+234"></label></div>' +
        '<label>Tell us about it<textarea name="message" rows="4" required></textarea></label>',
      btn: 'Send request', subject: 'Build request (from ' + NAME + ')',
      done: 'Thanks. We’ll be in touch to talk about your project.'
    }
  };
  function formHTML(k) {
    var F = FORMS[k];
    return '<div class="cxg-ic">' + F.icon + '</div><p class="cxg-ey">' + F.eye + '</p><h2 class="cxg-h">' + esc(F.title) + '</h2><p class="cxg-p">' + F.p + '</p>' +
      '<form class="cxg-f" data-form="' + k + '" novalidate>' + F.fields +
      '<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none">' +
      '<p class="cxg-err" data-err hidden>Please fill in the required fields.</p>' +
      '<button class="cxg-btn cxg-btn--w" type="submit">' + F.btn + I.arrow + '</button></form>' +
      (lockShown ? '<button class="cxg-btn" type="button" data-cxg="back" style="margin-top:8px">Back</button>' : '') +
      '<p class="cxg-fine">Sent securely to BLACC Universal.</p>';
  }

  function onClick(e) {
    var b = e.target.closest('[data-cxg]'); if (!b) { if (e.target === sheet && !sheet.hasAttribute('data-lock')) close(); return; }
    var a = b.getAttribute('data-cxg');
    if (a === 'close') close();
    else if (a === 'back') lock();
    else if (FORMS[a]) open(formHTML(a), lockShown);
  }

  function onSubmit(e) {
    var f = e.target; if (!f.matches('form[data-form]')) return;
    e.preventDefault();
    var k = f.getAttribute('data-form'), err = f.parentNode.querySelector('[data-err]');
    if (k === 'code') {
      var box = f, v = f.code.value.replace(/\s+/g, '').toUpperCase();
      function no() { box.classList.remove('is-no'); void box.offsetWidth; box.classList.add('is-no'); err.hidden = false; f.code.select(); }
      if (!v || !window.crypto || !crypto.subtle) return no();
      sha('blacccx:' + v).then(function (ho) {
        if (ho === window.CX_OWNER) { put('cx_pass', { h: ho, until: Date.now() + DAYS * 864e5 }); return ok(); }
        return sha('blacccx:' + ID + ':' + v).then(function (h) {
          if ((window.CX_CODES[ID] || []).indexOf(h) < 0) return no();
          put(K_UNLOCK, { h: h, until: Date.now() + DAYS * 864e5 }); ok();
        });
      });
      return;
    }
    var bad = [].some.call(f.querySelectorAll('[required]'), function (i) { return !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value)); });
    if (bad) { err.textContent = 'Please fill in the required fields.'; err.hidden = false; return; }
    err.hidden = true;
    var data = { access_key: FORM_KEY, subject: FORMS[k].subject, from_name: 'BLACC Universal Constructs', construct: NAME, page: location.href };
    [].forEach.call(f.elements, function (i) {
      if (!i.name || i.name === 'botcheck') return;
      if (i.type === 'checkbox') { if (i.checked) data[i.name] = data[i.name] ? data[i.name] + ', ' + i.value : i.value; }
      else data[i.name] = i.value.trim();
    });
    if (data.offer) data.offer = '₦' + data.offer;
    if (f.botcheck && f.botcheck.checked) return;
    var btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.style.opacity = '.6';
    fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.success) throw 0;
        var card = f.closest('.cxg-card');
        card.innerHTML = (lockShown ? '' : '<button class="cxg-x" type="button" data-cxg="close" aria-label="Close">' + I.x + '</button>') +
          '<div class="cxg-done"><div class="cxg-ic">' + I.tick + '</div><h2 class="cxg-h">Thank you, ' + esc((data.name || '').split(' ')[0] || 'friend') + '.</h2><p class="cxg-p">' + FORMS[k].done + '</p>' +
          (lockShown ? '<button class="cxg-btn" type="button" data-cxg="back">I have a code</button>' : '<button class="cxg-btn cxg-btn--w" type="button" data-cxg="close">Close</button>') + '</div>';
      })
      .catch(function () { btn.disabled = false; btn.style.opacity = ''; err.textContent = 'Couldn’t send. Check your connection and try again.'; err.hidden = false; });
  }

  function ok() {
    isOpen = true; lockShown = false;
    root.classList.remove('cxg-locked');
    close(true);
    if (timerEl) { timerEl.nextSibling && timerEl.nextSibling.remove(); timerEl.remove(); timerEl = null; }
    if (dock) dock.hidden = false;
  }
})();
