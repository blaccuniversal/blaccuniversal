/* Bemaamoo passkey gate. Keeps casual visitors out while the game is private.
   Passkeys are stored only as SHA-256 hashes of "blaccbmo:" + KEY (upper case).
   To remove a key, delete its line. To add one:
   python3 -c "import hashlib;print(hashlib.sha256(b'blaccbmo:NEWKEY').hexdigest())" */
(function () {
  var PASSES = [
    '0158d267958871a7cf93308b15013beae8c3b2036a3bcb15189ec4a2dc3e6754' /* main key */,
    '1491019d9b231fbfcf87e024d70e4ce6e53079a8908291a011772cde1391d80b' /* key 1 */,
    '37b11659b4f23e9d5ec1ad29e698a780dab245eb86418608b2682e10cd66cc23' /* key 2 */,
    '597716b3a9e70416b87d2a71077c2a7c10c49701ed15ad4ec0a39b88860e930d' /* key 3 */,
    '0ed0ffb9584c2a9eab3bea4361ad6816873a6d2d5f02753f73bcbb35dcf78f8c' /* key 4 */,
    '056721ca47c2acd9108cb40bd18d43eff4290c6f8ce25a2b8a408df573a01c4d' /* key 5 */,
    '09769503e51026317e2c40bdd28819bfc42a378bceff4936b4c932e4cac4c1b2' /* key 6 */,
    'fe58896e36a879fe625973b7ccb4cdd09b9ba72475769a11eb2b614d70d79c20' /* key 7 */,
    '2c06150c64be0e106410755b66dc98140c8def210f0f007b70208a8836ef634d' /* key 8 */,
    'c1bf5e63721d7d83dfc8111c7e71719e84bea493961345233704e306b5132c3b' /* key 9 */,
    '8215149cd0a57b8d15f2a84327eb23e5652e3683ed6d7ea8a24a88c0f2769a8c' /* key 10 */,
    'ddbd7cb4b18478dec23de1736874844619e13de1f9c0dd30306f62c7200450b3' /* key 11 */,
    '844b21d4c690a41e774bcfa49484a8331deba133476a5092c102e5ee354ed687' /* key 12 */
  ];
  var KEY = 'bmo_pass', DAYS = 30, body = document.body;
  function hex(buf) { return [].map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function hash(s) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode('blaccbmo:' + s)).then(hex); }
  function saved() { try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.until > Date.now() && PASSES.indexOf(v.h) > -1; } catch (e) { return false; } }
  if (saved()) return;
  body.setAttribute('data-locked', '');
  var g = document.createElement('section');
  g.className = 'gate';
  g.innerHTML = '<form class="gate__card" novalidate>' +
    '<p class="eyebrow">Private preview</p>' +
    '<h1 class="gate__t">Bemaamoo</h1>' +
    '<p class="gate__p">Enter your passkey to play.</p>' +
    '<input class="gate__in" type="password" autocomplete="current-password" autocapitalize="characters" spellcheck="false" placeholder="Passkey" aria-label="Passkey" required>' +
    '<p class="gate__err" role="alert" hidden>That passkey didn’t work. Check it and try again.</p>' +
    '<button class="btn btn--big btn--full" type="submit">Unlock</button>' +
    '<p class="gate__note">This device stays unlocked for 30 days.</p>' +
    '<a class="gate__back" href="/projects/">← BLACC Universal</a></form>';
  body.appendChild(g);
  var f = g.querySelector('form'), inp = g.querySelector('input'), err = g.querySelector('.gate__err');
  setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60);
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = inp.value.replace(/\s+/g, '').toUpperCase(); if (!v) return;
    if (!window.crypto || !crypto.subtle) { err.textContent = 'This browser can’t check passkeys. Open the page over https.'; err.hidden = false; return; }
    hash(v).then(function (h) {
      if (PASSES.indexOf(h) < 0) { err.hidden = false; inp.select(); return; }
      try { localStorage.setItem(KEY, JSON.stringify({ h: h, until: Date.now() + DAYS * 864e5 })); } catch (x) {}
      g.remove(); body.removeAttribute('data-locked');
    });
  });
})();
