/* PQT host codes. Each code opens its own private space: its own question bank, games and history.
   Codes are stored only as SHA-256 hashes of "blaccpqt:" + CODE (upper case, no dashes).
   A code's question bank lives in /pqt/bank/<id>.json, encrypted (AES-GCM) with a key made from the code,
   so nobody without that code can read it, even from the page source. */
(function () {
  var OWNER = '085bc209d0254d58de17876d5a987bbfdfd6ac67d3bd6cbd2b263d94cd6cb8a0';
  var PASSES = [OWNER,
    '20ece94a4509b7da550df9885228d7cf1a7e42f22449ba173dd7f5d263942c02',
    'a542fd812e4acf6dd3f82d066421d6d1bc8815f16944d0bc97dad56da181b876', '33029e55b9da82d5c7facc3444b3eeefd3c0b3d841e634982343d587deaa2954',
    '9e09380c51bde091a83d16741d103a87169da574275ccfd4f1a529cc20d79b1b', 'ab6ffbe7c4e8b6f654d979ac7e32628d9c997c141c6415c650e5e623c5d6d430',
    '0e2510ba6d603f4547877ce0c2024b49984a12b15a19121ddbb300895c8ce4cb', 'f810ca20a3a93c23946a34a8a21ad84a417916abc2936040f5a760702e22dd3e',
    '99ca0ffb8df5d68327490c4df4a67fd927ccd28c3a7fd5f19a35fde62f86bb51', 'fe11ea83d23bbb7a7320d33b1b5efafd41af6a911cb28c47b008fa225e0847f9',
    '29b656479e9d30ef51b192a5b26afdd7d96056b80509d5442a015c75df4095ae', 'f8ce7e6348e7e949ea0f72f2bdef8017f257d64319716bb2c3308fed034c367b',
    'b54eda4f8dd5f7c960be0071d904e9c44f0618661b0fa5b8918ba64fea5e30e1', '20abe0fa749a942f898929f9ef2885329ed1838cc985901096c833e7dfb64cf2',
    '9a4563f89c254013a6e182217d37cfc351487e2fc72e8252a792e875b802a139', '690de008eae2d02a5163a3988a1377578c75e3460a8996df8eba6ce77fb7c2c8',
    '9a8e0697f18309f36941e6274d3011648f86910bda761b0c693ec5f7d6acaa0a', '744a5c7c37713b977a2ef719048d66977f5d004b813116cbc382c399a8f55214',
    '11da9c7958206df42fcf70b2836c8c96bb2e348f23bcb4ebd9fd8d0af83e04dd', 'a6822387c587b3a8ec998140c8037d9cb0311a335baac3f277d9a63184033f59',
    '2e6267123bd885c4b78a05ead81b962e26f7ea909068441a813e81cff79ca473', 'bb02369f09f15f991c0946aeb15b8c9449dd38f208832bef4011273bb4a864e9'
  ];
  var KEY = 'pqt_pass', DAYS = 30;
  var BANK = ['WORDS', 'BOARDS', 'NAMES', 'SPELL', 'WRITTEN', 'RAPID', 'TALK', 'ALPHA', 'PW'];
  var LEGACY = /^(pqt_host|pqt_history|wr_index|wr_cur|wr_t_.+)$/;
  var body = document.body, enc = new TextEncoder();
  BANK.forEach(function (k) { window['PQT_SAMPLE_' + k] = ''; });

  function hex(buf) { return [].map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function unhex(s) { var a = new Uint8Array(s.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(s.substr(i * 2, 2), 16); return a; }
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { var r = atob(s), a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; }
  function sha(s) { return crypto.subtle.digest('SHA-256', enc.encode(s)).then(hex); }
  function derive(code) {
    return crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']).then(function (km) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode('blaccpqt-bank-v1'), iterations: 200000, hash: 'SHA-256' }, km, 256);
    }).then(hex);
  }
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function valid(v) { return v && v.until > Date.now() && v.k && v.b && PASSES.indexOf(v.h) > -1; }

  /* ---- per-code storage space ---- */
  function useSpace(h) {
    var ns = 'pqt@' + h.slice(0, 16) + ':';
    window.PQT_KEY = function (k) { return ns + k; };
    if (h !== OWNER) return;
    try { // games saved before host codes existed belong to the owner's space
      var ks = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (LEGACY.test(k)) ks.push(k); }
      ks.forEach(function (k) { if (localStorage.getItem(ns + k) == null) localStorage.setItem(ns + k, localStorage.getItem(k)); localStorage.removeItem(k); });
    } catch (e) {}
  }

  /* ---- encryption for the code's bank ---- */
  var aes = null;
  function aesKey(k) { return aes || (aes = crypto.subtle.importKey('raw', unhex(k), 'AES-GCM', false, ['encrypt', 'decrypt'])); }
  function setCrypto(v) {
    window.PQT_CRYPT = {
      seal: function (obj) {
        var iv = crypto.getRandomValues(new Uint8Array(12));
        return aesKey(v.k).then(function (key) { return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(JSON.stringify(obj))); })
          .then(function (ct) { return JSON.stringify({ pqt: 'bank', v: 1, iv: b64(iv), ct: b64(new Uint8Array(ct)) }); });
      },
      open: function (txt) {
        var j = typeof txt === 'string' ? JSON.parse(txt) : txt;
        if (!j || j.pqt !== 'bank') return Promise.reject(new Error('not a bank'));
        return aesKey(v.k).then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(j.iv) }, key, unb64(j.ct)); })
          .then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); });
      }
    };
  }
  function applyBank(o) {
    window.PQT_BANK = o;
    BANK.forEach(function (k) { window['PQT_SAMPLE_' + k] = o[k] || ''; });
  }
  function ready() { window.PQT_READY = true; document.dispatchEvent(new Event('pqt:ready')); }
  function start(v) {
    useSpace(v.h); setCrypto(v);
    fetch('/pqt/bank/' + v.b + '.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j ? window.PQT_CRYPT.open(j) : null; })
      .then(function (o) { if (o) applyBank(o); })
      .catch(function () {})
      .then(ready);
  }

  var cur = read();
  if (valid(cur)) { start(cur); return; }
  try { localStorage.removeItem(KEY); } catch (e) {}

  body.setAttribute('data-locked', '');
  var g = document.createElement('div');
  g.className = 'pq-gate';
  g.innerHTML = '<form class="card pq-gate__card" novalidate>' +
    '<img class="pq-gate__mark" src="/assets/pqt/pqt-mark.png" alt="PQT" width="371" height="400">' +
    '<p class="eyebrow" style="margin-top:22px">Hosts only</p>' +
    '<h1 class="pq-gate__title">Enter your host code.</h1>' +
    '<input class="hc-input pq-gate__in" type="password" autocomplete="current-password" autocapitalize="characters" spellcheck="false" placeholder="Host code" aria-label="Host code" required>' +
    '<p class="pq-gate__err" role="alert" hidden>That code didn’t work. Check it and try again.</p>' +
    '<button class="pbtn pbtn--o pbtn--lg pbtn--block" type="submit">Unlock</button>' +
    '<p class="hc-note">Your code opens your own questions and games. No other host can see them. This device stays unlocked for 30 days.</p>' +
    '<a class="pq-gate__back" href="/pqt/">← Back to PQT</a></form>';
  function mount() {
    body.appendChild(g);
    var f = g.querySelector('form'), inp = g.querySelector('input'), err = g.querySelector('.pq-gate__err'), btn = g.querySelector('button');
    setTimeout(function () { inp.focus(); }, 50);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = inp.value.trim().toUpperCase(), clean = raw.replace(/[^A-Z0-9]/g, ''); if (!clean) return;
      btn.disabled = true; err.hidden = true;
      Promise.all([sha('blaccpqt:' + clean), sha('blaccpqt:' + raw)]).then(function (hs) {
        var code = PASSES.indexOf(hs[0]) > -1 ? clean : PASSES.indexOf(hs[1]) > -1 ? raw : null;
        if (!code) { btn.disabled = false; err.hidden = false; inp.select(); return; }
        btn.textContent = 'Opening…';
        return Promise.all([derive(code), sha('blaccpqt-bank-id:' + code)]).then(function (r) {
          var v = { h: code === clean ? hs[0] : hs[1], until: Date.now() + DAYS * 864e5, k: r[0], b: r[1].slice(0, 24) };
          try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (x) {}
          g.remove(); body.removeAttribute('data-locked');
          document.dispatchEvent(new Event('pqt:unlock'));
          start(v);
        });
      }).catch(function () { btn.disabled = false; btn.textContent = 'Unlock'; err.hidden = false; });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
