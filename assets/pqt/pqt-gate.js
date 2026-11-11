/* PQT pass gate. Keeps casual visitors out of the host console and screen.
   Passes are stored only as SHA-256 hashes of "blaccpqt:" + PASS (upper case).
   To add a pass: python3 -c "import hashlib;print(hashlib.sha256(b'blaccpqt:NEWPASS').hexdigest())" and add it below. */
(function () {
  var PASSES = [
    '20ece94a4509b7da550df9885228d7cf1a7e42f22449ba173dd7f5d263942c02'
  ];
  var KEY = 'pqt_pass', DAYS = 30;
  var body = document.body;
  function hex(buf) { return [].map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function hash(s) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode('blaccpqt:' + s)).then(hex); }
  function saved() { try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.until > Date.now() && PASSES.indexOf(v.h) > -1; } catch (e) { return false; } }
  if (saved()) return;
  body.setAttribute('data-locked', '');
  var g = document.createElement('div');
  g.className = 'pq-gate';
  g.innerHTML = '<form class="card pq-gate__card" novalidate>' +
    '<div class="pq-pill"><span>PQT</span><i></i></div>' +
    '<p class="eyebrow" style="margin-top:22px">Hosts only</p>' +
    '<h1 class="pq-gate__title">Enter your pass.</h1>' +
    '<input class="hc-input pq-gate__in" type="password" autocomplete="current-password" placeholder="Pass" aria-label="Pass" required>' +
    '<p class="pq-gate__err" role="alert" hidden>That pass didn’t work. Check it and try again.</p>' +
    '<button class="pbtn pbtn--o pbtn--lg pbtn--block" type="submit">Unlock</button>' +
    '<p class="hc-note">Need a pass? Ask BLACC Universal. This device stays unlocked for 30 days.</p>' +
    '<a class="pq-gate__back" href="/pqt/">← Back to PQT</a></form>';
  function mount() {
    body.appendChild(g);
    var f = g.querySelector('form'), inp = g.querySelector('input'), err = g.querySelector('.pq-gate__err');
    setTimeout(function () { inp.focus(); }, 50);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = inp.value.trim().toUpperCase(); if (!v) return;
      hash(v).then(function (h) {
        if (PASSES.indexOf(h) < 0) { err.hidden = false; inp.select(); return; }
        try { localStorage.setItem(KEY, JSON.stringify({ h: h, until: Date.now() + DAYS * 864e5 })); } catch (x) {}
        g.remove(); body.removeAttribute('data-locked');
        document.dispatchEvent(new Event('pqt:unlock'));
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
