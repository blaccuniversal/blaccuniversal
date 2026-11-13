/* Superstar · access gate. Passkeys are issued by BLACC Universal on request. */
(function () {
  'use strict';
  var KEYS = ["0f20e5df2fe59e5215c780f8", "dc0348de371291f960699082", "75e25b983255cab6f6ac93d1", "636200b9479ffc3ebf3ec7f9", "2a776faadbe38e8540c6743f", "b957677cd4e4aea9f371dc33", "034b6ddffe2fcd673f0e6800", "16b7b7fa0cdd5e18f2078119", "fb404bc315ede8196a64eb7d", "a019933b51b7b5f49dd55761", "7f7a77e83d06b5ef7b3cc5ef", "d154880b2611999b4d306f5b", "6a340ca68946c717d5e07e0c", "80da88ecbace426947642f21", "2c477bc329ff4cac6199f1ed", "b0a089b8e5a95f8ad5879205", "efd9cd316d741e1cfcc57327", "7fd4e88af0e6380c4b79beab", "72e6075d7cf3f30e2db6b759", "a3996392b2e3585cd27b748b", "805de88452f03f4beccc9ec6", "1bf326590a58ecb407fc59ef", "9942235e0bd97a04fda77902", "feb3da5dbcad9d52f8ce8ee3", "07c08dba1d74566c90d0543e", "e164c7dfc40e0d9935b6db3f", "bdfe72caae96689006579cb1", "3d27fb837f3fe54c47912be7", "659d4b0402c12eca7a75c399", "d05475d635a00aea0e2a5355", "6057d8398ad02853dac425eb", "d0c02fb324daccfab3c8928d", "d4a4822c2f4f463251ad3540", "cf0125fd73832b47e2b216f2", "3e6459086ce138885fa659f1", "986ce741aa1fad69b81d62cc", "acf0fefa040329d9a4b7e56c", "6691f62dc40abcfbcf4e4108", "40f28b42f65c424611c998a9", "e4f3436294cbc559ab984efd", "e54bed23171114c84b070542", "baadb1676a9107ba4db8d5a5", "4505613e31781933847e9d9d", "8a6d79cab9edb1f567c6053c", "31b3ea515b2712f24b50939a", "d8d953e2b86cea9221524c3d", "4a15ade4060f03286ab6a1aa", "59deb3a954d61d9be33fcae6", "f5413c0c8d48edfa61df0391", "161ec28f01755ecdd9d1d64a", "4fbafc862ce59757a178ab8d", "3fb78159cd3ea4ff20a753bf", "e103ccb758d539750ffc8697", "0b1b44e6e8b152c533e820d9", "c978cc8b215047f042a6bbe4", "b1e8f3972b669d9abe107189", "f0464964449d7bc3436f0c21", "0cd962c674e65c8c76436b15", "0b5b6cd80bebd37dd8ccc13d", "691abef21fe65e10e4e2304a", "edd260d78d79474b23041602", "e12c9d68b534ee156955c079", "98c25bfa375b1b67b35ad8d1", "af480fbe9e312009c33ff072", "1a22bbdb46c93909761c7261", "141109b570bca2dff2612bb4", "cbe4aa07524204359b720535", "4301ff6137dd4385baf655ed", "fb3828cc309ab6199c2536e3", "6792b830bbcb8a80ec6ac3ab", "35e33d89f83a65f873e6e22d", "0c5085a3197fa8bdb69fc7d3", "d1652e0cae061804ae91cb2c", "72f77f0a52b38d2bf734b948", "c07fc50dbeb332356caeff41", "2e1a17662d9d7a436bb9c8b0", "d05182ed31b7c5dbca46a170", "2ee6af25d53220231b81ca22", "44090eef837b2f8991f584b9", "ebbe3c0176f4f7d1f35c9e24", "78d0ed0072bd445ebaa42918", "78f1826d44f0d13ac7297450", "bc8a6cd8b4dc6fcd3c2d1c89", "89db7080484949e31aad43e0", "94825b4f3277f4bcefa0af82", "c0bc7782821243d41df14953", "c90e4893fe675d76b949d389", "f9cf0fdfc6ef6107799b0c79", "9ccce9133dc27ded702ea787", "efdcaefcb6429b3fb7bfcd41", "da8025bbf28b21627c37d5d9", "5fc660e2e5a4199705449b6e", "32a0cffa48d0e049b24e0cd6", "0fa47776b94275c8c7212466", "a9c00457e0d50ed7718d361b", "d47967e481785ae330e7b8a1", "812766268e4462e3184f009d", "b4a4cb6117d11bd95de86b88", "b4c353a55a653f4712e3cf98", "977aaf40216420f4cf9bfa7d"];
  var SALT = 'bu-superstar-v1:', STORE = 'ss_unlock', FORM = 'https://api.web3forms.com/submit', W3K = 'c45f617c-f3f2-4caa-93cf-5d49e2cece46';
  var root = document.documentElement, gate = document.querySelector('[data-gate]');
  function get() { try { return localStorage.getItem(STORE); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(STORE, v); } catch (e) {} }
  function norm(s) { s = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (s.indexOf('STAR') !== 0) s = 'STAR' + s; return s; }
  function hash(s) {
    var b = new TextEncoder().encode(SALT + s);
    return crypto.subtle.digest('SHA-256', b).then(function (d) { return Array.prototype.map.call(new Uint8Array(d), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('').slice(0, 24); });
  }
  function lock() { root.classList.add('ss-locked'); if (gate) gate.hidden = false; }
  function unlock() { root.classList.remove('ss-locked'); if (gate) gate.hidden = true; }
  var saved = get();
  if (saved && KEYS.indexOf(saved) > -1) { unlock(); return; }
  lock();
  if (!gate) return;
  function view(name) { Array.prototype.forEach.call(gate.querySelectorAll('[data-gv]'), function (v) { v.hidden = v.getAttribute('data-gv') !== name; }); var f = gate.querySelector('[data-gv="' + name + '"] input'); if (f) setTimeout(function () { f.focus(); }, 30); }
  Array.prototype.forEach.call(gate.querySelectorAll('[data-gview]'), function (b) { b.addEventListener('click', function () { view(b.getAttribute('data-gview')); }); });
  var kf = gate.querySelector('[data-gkey]'), kmsg = gate.querySelector('[data-gkmsg]');
  kf.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = kf.querySelector('input').value; if (!v.trim()) return;
    kmsg.textContent = ''; kmsg.className = 'gate__msg';
    hash(norm(v)).then(function (h) {
      if (KEYS.indexOf(h) > -1) { set(h); unlock(); }
      else { kmsg.textContent = 'That passkey isn’t valid. Check it and try again.'; kmsg.className = 'gate__msg is-err'; }
    }).catch(function () { kmsg.textContent = 'Couldn’t check the passkey on this browser.'; kmsg.className = 'gate__msg is-err'; });
  });
  var rf = gate.querySelector('[data-greq]'), rmsg = gate.querySelector('[data-grmsg]'), rbtn = rf.querySelector('button[type=submit]');
  rf.addEventListener('submit', function (e) {
    e.preventDefault();
    if (rf.querySelector('[name=_honey]').value) return;
    var d = { access_key: W3K, subject: 'Superstar passkey request: ' + rf.name.value.trim(), from_name: 'BLACC Universal website', name: rf.name.value.trim(), email: rf.email.value.trim(), message: rf.note.value.trim() || '(none)', page: 'Superstar passkey' };
    if (!d.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { rmsg.textContent = 'Add your name and a valid email.'; rmsg.className = 'gate__msg is-err'; return; }
    rbtn.disabled = true; rmsg.textContent = 'Sending…'; rmsg.className = 'gate__msg';
    fetch(FORM, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.success) throw 0; }); })
      .then(function () { rf.reset(); view('sent'); })
      .catch(function () { rmsg.textContent = 'Couldn’t send right now. Please try again in a moment.'; rmsg.className = 'gate__msg is-err'; })
      .then(function () { rbtn.disabled = false; });
  });
})();
