/* BLACC Universal · website offer: floating hourglass + countdown (ends 25 Nov 2026, 00:00 WAT) */
(function () {
  'use strict';
  var END = Date.parse('2026-11-25T00:00:00+01:00');
  if (!(END > Date.now())) return;

  var css = '' +
  '.hg{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:58;width:56px;height:56px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:rgba(0,0,0,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;animation:hgIn .8s cubic-bezier(.2,.7,.2,1) 1.2s both}' +
  '.hg::before,.hg::after{content:"";position:absolute;inset:0;border-radius:50%;border:1px solid rgba(255,255,255,.55);animation:hgPulse 2.4s cubic-bezier(.2,.7,.2,1) infinite;pointer-events:none}' +
  '.hg::after{animation-delay:1.2s}' +
  '.hg svg{width:26px;height:26px;animation:hgFlip 3.6s linear infinite}' +
  '.hg .sand-t{animation:hgTop 3.6s linear infinite;transform-origin:12px 9px}' +
  '.hg .sand-b{animation:hgBot 3.6s linear infinite;transform-origin:12px 19px}' +
  '.hg .drip{stroke-dasharray:1 2;animation:hgDrip .5s linear infinite}.hg svg .drip{opacity:.9}' +
  '.hg:hover{background:#fff;color:#000}' +
  '.hg:focus-visible{outline:2px solid #fff;outline-offset:4px}' +
  'body.has-hg .footer{padding-bottom:calc(96px + env(safe-area-inset-bottom))}' +
  'body.build-open .hg,body.menu-open .hg,body.offer-open .hg{opacity:0;pointer-events:none}' +
  '@keyframes hgIn{from{opacity:0;transform:translateY(20px) scale(.8)}}' +
  '@keyframes hgPulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.7);opacity:0}}' +
  '@keyframes hgFlip{0%,84%{transform:rotate(0);animation-timing-function:cubic-bezier(.6,0,.2,1)}100%{transform:rotate(180deg)}}' +
  '@keyframes hgTop{0%{transform:scaleY(1)}84%,100%{transform:scaleY(.1)}}' +
  '@keyframes hgBot{0%{transform:scaleY(.1)}84%,100%{transform:scaleY(1)}}' +
  '@keyframes hgDrip{to{stroke-dashoffset:-3}}' +
  '.ofr{position:fixed;inset:0;z-index:70;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:ofrFade .25s ease both}' +
  '.ofr[hidden]{display:none}' +
  '.ofr__card{position:relative;width:100%;max-width:520px;max-height:92vh;max-height:92dvh;overflow-y:auto;padding:34px clamp(20px,5vw,40px) calc(28px + env(safe-area-inset-bottom));background:#000;border:1px solid #222;border-bottom:0;border-radius:14px 14px 0 0;color:#fff;font-family:inherit;animation:ofrUp .45s cubic-bezier(.2,.7,.2,1) both}' +
  '@media (min-width:700px){.ofr{align-items:center;padding:20px}.ofr__card{border-radius:2px;border-bottom:1px solid #222}}' +
  '.ofr__x{position:absolute;top:10px;right:10px;width:44px;height:44px;display:grid;place-items:center;padding:0;border:0;background:none;color:#8a8a8a;cursor:pointer}' +
  '.ofr__x:hover{color:#fff}' +
  '.ofr__eye{display:flex;align-items:center;gap:10px;margin:0 0 14px;font-size:12px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#8a8a8a}' +
  '.ofr__eye svg{width:16px;height:16px;color:#fff}' +
  '.ofr__t{margin:0 0 12px;font-size:clamp(28px,6vw,38px);font-weight:600;line-height:1.08;letter-spacing:-.02em;text-wrap:balance}' +
  '.ofr__p{margin:0 0 24px;font-size:16px;line-height:1.6;color:#b5b5b5}' +
  '.ofr__price{display:flex;align-items:baseline;flex-wrap:wrap;gap:6px 14px;margin:0 0 26px;padding:18px 0;border-top:1px solid #1f1f1f;border-bottom:1px solid #1f1f1f}' +
  '.ofr__price b{font-size:clamp(36px,8vw,48px);font-weight:600;letter-spacing:-.03em;line-height:1}' +
  '.ofr__price s{font-size:18px;color:#6f6f6f}' +
  '.ofr__price span{flex-basis:100%;font-size:13px;color:#8a8a8a}' +
  '.ofr__cd{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 26px}' +
  '.ofr__cd div{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 0 12px;border:1px solid #222;border-radius:2px}' +
  '.ofr__cd b{font-size:clamp(26px,6vw,34px);font-weight:600;line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.02em}' +
  '.ofr__cd small{font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#7a7a7a}' +
  '.ofr__go{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;min-height:54px;padding:0 26px;border:0;border-radius:2px;background:#fff;color:#000;font-family:inherit;font-size:16px;font-weight:600;cursor:pointer;transition:background .2s}' +
  '.ofr__go:hover{background:#e6e6e6}' +
  '.ofr__go svg{width:18px;height:18px;transition:transform .3s}' +
  '.ofr__go:hover svg{transform:translateX(3px)}' +
  '.ofr__fine{margin:14px 0 0;font-size:12px;color:#6f6f6f;text-align:center}' +
  '@keyframes ofrFade{from{opacity:0}}' +
  '@keyframes ofrUp{from{opacity:0;transform:translateY(40px)}}' +
  '@media (prefers-reduced-motion:reduce){.hg,.hg::before,.hg::after,.hg svg,.hg .sand-t,.hg .sand-b,.hg .drip{animation:none}.hg::before,.hg::after{opacity:.35}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var GLASS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M6 2.75h12M6 21.25h12"/><path d="M7.5 2.75v2.6c0 2.2 1.6 3.6 3.2 4.9l1.3 1.1 1.3-1.1c1.6-1.3 3.2-2.7 3.2-4.9v-2.6"/><path d="M7.5 21.25v-2.6c0-2.2 1.6-3.6 3.2-4.9l1.3-1.1 1.3 1.1c1.6 1.3 3.2 2.7 3.2 4.9v2.6"/>' +
    '<path class="sand-t" d="M9.2 6.2h5.6c-.6 1.2-1.7 2-2.8 2.8-1.1-.8-2.2-1.6-2.8-2.8z" fill="currentColor" stroke="none"/>' +
    '<path class="drip" d="M12 11.5v6"/>' +
    '<path class="sand-b" d="M8.6 19.6c.5-1.5 1.9-2.4 3.4-2.4s2.9.9 3.4 2.4z" fill="currentColor" stroke="none"/></svg>';
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'hg';
  btn.setAttribute('aria-label', 'Website offer: ends 25 November');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = GLASS;

  var box = document.createElement('div');
  box.className = 'ofr'; box.hidden = true;
  box.innerHTML = '<div class="ofr__card" role="dialog" aria-modal="true" aria-labelledby="ofr-t">' +
    '<button class="ofr__x" type="button" data-ofr-close aria-label="Close"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
    '<p class="ofr__eye">' + GLASS + 'Offer ends 25 November</p>' +
    '<h2 class="ofr__t" id="ofr-t">Your website, built by BLACC.</h2>' +
    '<p class="ofr__p">We design and build your website, with one year of hosting on your own domain name.</p>' +
    '<p class="ofr__price"><b>₦123,456</b><s>₦450,000</s><span>One-off price. You save ₦326,544.</span></p>' +
    '<div class="ofr__cd" aria-live="off"><div><b data-cd="d">00</b><small>Days</small></div><div><b data-cd="h">00</b><small>Hours</small></div><div><b data-cd="m">00</b><small>Mins</small></div><div><b data-cd="s">00</b><small>Secs</small></div></div>' +
    '<button class="ofr__go" type="button" data-ofr-claim>Claim this offer' + ARROW + '</button>' +
    '<p class="ofr__fine">Ends 25 November 2026, 12:00 AM (Lagos time).</p></div>';

  document.body.appendChild(btn); document.body.classList.add('has-hg');
  document.body.appendChild(box);

  var tick = null, last = null;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function draw() {
    var t = Math.max(0, END - Date.now());
    if (!t) { close(); btn.remove(); box.remove(); document.body.classList.remove('has-hg'); return; }
    var s = Math.floor(t / 1000);
    box.querySelector('[data-cd="d"]').textContent = pad(Math.floor(s / 86400));
    box.querySelector('[data-cd="h"]').textContent = pad(Math.floor(s % 86400 / 3600));
    box.querySelector('[data-cd="m"]').textContent = pad(Math.floor(s % 3600 / 60));
    box.querySelector('[data-cd="s"]').textContent = pad(s % 60);
  }
  function open() {
    last = document.activeElement;
    draw(); box.hidden = false; document.body.classList.add('offer-open');
    clearInterval(tick); tick = setInterval(draw, 1000);
    setTimeout(function () { box.querySelector('[data-ofr-claim]').focus(); }, 60);
  }
  function close() {
    box.hidden = true; document.body.classList.remove('offer-open');
    clearInterval(tick);
    if (last && last.focus) last.focus();
  }
  btn.addEventListener('click', open);
  box.addEventListener('click', function (e) {
    if (e.target === box || e.target.closest('[data-ofr-close]')) return close();
    if (e.target.closest('[data-ofr-claim]')) {
      close();
      var opener = document.querySelector('[data-build-open]');
      if (opener) {
        opener.click();
        var topic = document.getElementById('b-topic'), msg = document.getElementById('b-message');
        if (topic) topic.value = 'Website offer: ₦123,456 (ends 25 Nov)';
        if (msg && !msg.value) msg.value = 'Hi BLACC, I would like to claim the website offer (₦123,456, one year of hosting on my domain). My business is: ';
      } else {
        location.href = '/#contact';
      }
    }
  });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
})();
