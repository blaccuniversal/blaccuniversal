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
    '844b21d4c690a41e774bcfa49484a8331deba133476a5092c102e5ee354ed687' /* key 12 */,
    '740d93eb3db671bee0009de889fa6301c59672023ae744bba07d7d644f0fc62f' /* key 13 */,
    'daab2d5eddd6c0dd6a21c73a4670b80af5165b34e81c69d1f65dbc96b747099d' /* key 14 */,
    '1cd0a4b96e446b982ec09c7b4a758404af5a22cd530ca8ac57cf082c0a38c874' /* key 15 */,
    'ecc66511d283ad0cf305b34d9d5dc1e9624a43b16f15a8885c1be05376ebd983' /* key 16 */,
    '73169774898077f912e97f516330aeb8698b6486c416d92b612af1bd80613e60' /* key 17 */,
    '5616274f4f7c9279ac9bc3cfaafbacf8b343574b94e4c3998ed9c1dea87d7d95' /* key 18 */,
    'eb83c9fbc63d19b45393315f946a83af9c8234d23c5da80d7c28d0115007a3f5' /* key 19 */,
    'af9f29a1f842f42a439bf4b3e31e8e9c0a0aea92a686b817c7025fd200ea0ce4' /* key 20 */,
    '569924305a5575e40d08a4c394b82028a8a7cf5e04f9cf0db1d732d0fe21aed8' /* key 21 */,
    'a4e537f925e11a4217ff1dc22e574535e8610e03482234bb6413dbf13d022329' /* key 22 */,
    '911bc791e2b56f624df3693388f4f2dec505de5c9176c097d56e82d1c425c17f' /* key 23 */,
    'fd3250fbf69fda257f5ead8f854ee0a7213616c6e66c76977059c7f9930a77b3' /* key 24 */,
    '93b879ce723e2af20c796c9395ab61f1e70d8b183795f9e8d9da58556d82c8c4' /* key 25 */,
    'fe8431780fa8a97e6ff1a4232d44bcc56a9d5d6d6b3c6c462d3a706b9b2deb2b' /* key 26 */,
    '54b2336bd8ef2d403370d67df8c1c3f2e8a52199b73eb48a2d0c709f01693575' /* key 27 */,
    'a196f4469d6c723b834a85b234d9cf38197aac889530a712662aab7de3885cb7' /* key 28 */,
    '694f4e9dd16b53add1b410c994c06bdabbe7d10462834912c6b3a7c96e639a9c' /* key 29 */,
    '188224ff3e190f5d48c6588f14c215df19cf1655c74bc8f973f6f340645aa4ef' /* key 30 */,
    'c218b2826c6fdf2b11ee04a6855f07eb85949a9cba5de3a72349c2b9a5954c57' /* key 31 */,
    '59af11f44d9f48a1708b86896b83f1c70d3c955bcaae53ddf9749ab37a83aa32' /* key 32 */,
    '159c68b682c0e9e7b9c3c3e9e2ae64a2e6f82ec365cb18f254cfd5e0bf6b10b3' /* key 33 */,
    'f27137ce266f774c9b43c3e52241bea84b5f794802eada62a28cc5c73c6685f5' /* key 34 */,
    'c371a8bdaa711571c6dde8f151603575fc24b258f5f8323162d86c92d20576b6' /* key 35 */,
    'ff215099deed9126c7216e4061546457f73975b79929d57fca369526c03d2725' /* key 36 */,
    'b944936a90913b88cd026560ca283f62fc99e5c271af028f7ca77b1f5d8e4dd8' /* key 37 */,
    '9cf0e74acee540ff9ace28a789f9e7c7bb29d01b5cd486cac59bc2661960e3a0' /* key 38 */,
    '41c9f01bb5a2225daa1ee31d9506b52657d9d6d95bd6f4055f830dec41326ff5' /* key 39 */,
    '53b679bc9802f4c9d60b21670e766a7f38d1e3e7c59ad8f748ba827d6719724f' /* key 40 */,
    'da18d646b2ea9cb04df7a47b206d2d7ff80f79377a8a4531a878bee586d56e19' /* key 41 */,
    '22457518b26f6d91f0fb2f800ca97c26223c288a59fee4d6a3f4aa13e0b7d392' /* key 42 */,
    'cf184a15020a65f85a7190fec67ea2808670c8e64775d2cc602d5ec47d28224c' /* key 43 */,
    'd72e2034c85be06cdf97eb79668b2ea2db199ae1dcab46ad6788c69d91a7940b' /* key 44 */,
    '717c722a219a72d3bfd2f2ecbbd76c35a249708e7d271c19137483892598e9c2' /* key 45 */,
    'ca1a3a686675212b0ba035287e0a3cfcd420e42a4c0da84c10a9a5150a6300f2' /* key 46 */,
    'ffbe6336eeb1d62873a49163a9f24e074bab353951a8c9b5218f6aab02aec7ee' /* key 47 */,
    'c3f83d6f97be01880bfc9d2a05ff296ac57e0d14271945db6952a07813f5a3d9' /* key 48 */,
    '9b9c392f5a9d74c9a0f33aae576b11edad10f766e8186a42290ddb71a387684c' /* key 49 */,
    'd084c8758650e857ad6443b17acec6688b1ea788949e3b496f2406bb13e39f57' /* key 50 */,
    'a519afe899e7144a73652a9f14847ef242d417304e9739b49b7abf54eee7db0d' /* key 51 */,
    'fb3668f7b586a093c236c839eed825a37eec9334999e312ba6b32f5f808375e4' /* key 52 */,
    '17a3fadd0ea22fb4a567d3616a93edf5c06753ffef40774272f6464c137a5320' /* key 53 */,
    '41ec60dea574bab97613ec03d01b9dcd386aa5c24a36e154454c0a5b1ad90706' /* key 54 */,
    '2b1cab1ee96d86c430b4019917ec6c0e3cc8ff0edaa0d3c3763b6ad270037212' /* key 55 */,
    '784efd00dd5156c1bc6df36b041b49f055af383d394ce413ffb4afd0385a79cf' /* key 56 */,
    'f335f08f5b4a2cb3e4c78fba17faa0592321b6d2f2c57d2e6307f276fa66b8f6' /* key 57 */,
    'abc235bff3ce84d00e2cddd187b1b58f7cba41f64da691b00c21ee7970661c29' /* key 58 */,
    '1888698780ce277480d15a3203b0a84c39fb9703ecf24e0242e23006a234932c' /* key 59 */,
    '5f80df03af5661436876d4a4784d7d9753dcf25a08f30261268e7493eb27ef11' /* key 60 */,
    '6de0c386d52b4cf9638503770bed80d6fc338ee273e1073a4d0fc04060033c28' /* key 61 */,
    '6cf84ceb1866b5939d794259c60a4eee889dee564b8ad95f00c936e98a397a35' /* key 62 */,
    '3972149871881ad58565fcc1adc991500cdaa485c552c16855bc72ef11666436' /* key 63 */,
    'fa0da10f2742a84c9b778cc0022384fadcf263f6b78c7659d267e3983fdc6c13' /* key 64 */,
    'ecdf9cc4159d0a8c78da36539732731e2d496825244bab95035fd17bd65465d6' /* key 65 */,
    '5b1f0bde7a4e7bcde1b98352a320592298dd694d4be14280eb67897f461ef13a' /* key 66 */,
    '4b9132e6c03f39a414719085d99d23564235ea2622aec820fee4864be649a594' /* key 67 */,
    '0f8cc90e2a935d8d7b4464dc1ec1ff5fe68efbc34d56dbc054271bfc37a0ffaf' /* key 68 */,
    '2cbecc9446bf22d0cfe39112acbf4772b745961e4ef9151af76e44a1a1574fb6' /* key 69 */,
    '822c87939b1bebb51cf23de06d4e0b95c8f8da45eacfe84958c0be06e6fea3cf' /* key 70 */,
    '7c9e8d5c11a5575b7a85510fab359aac8dda2324524dea800cf458ee4bf4d17b' /* key 71 */,
    'c8ad4dacd65cc29fb32ae4c56355ef502ca330623aece3d32c5093a632069320' /* key 72 */,
    '9c3cee3772ef5e914091e3cc2a1df56056967c9950200532e64c1d1ebdac0c46' /* key 73 */,
    'd27172f49db9002fc4248676f169dcb641e0e0cbf90419ac7bda5fb39f210ac2' /* key 74 */,
    '622b7e5a8c81a1008275654661ba455ef84be3a5a3c0f5efb15a0f8b497ebdaa' /* key 75 */,
    'e55501b34df7f8f93112fdc65076cf500e0f5e54b5d7fe4eb17ed2bb151aaac3' /* key 76 */,
    '3e20245170a1c9e7e82f952c9eaa73cf98e0f8c266cc9fb036a9e9ccd523f713' /* key 77 */,
    '3018d65c9ec5bb670179c60b6ede66464db2247541dde74894fe57f6d2efe7a5' /* key 78 */,
    '7b36bab6db0c193dd237ba6d03d47633809e304ab9954111b371833c076b4e41' /* key 79 */,
    'f0aaeedc7bad7ef6cc3e5ccbc96002847cd32501a0639d43b09234becf0f584c' /* key 80 */,
    'bae0e9f614a82168f66cd5d413ecb2c198b9a3214f5682ce0b0b80c40b45e64c' /* key 81 */,
    '30af008a5cb180524e72547e073f212623b9bb8c8f61147e134f108cdb1f7aee' /* key 82 */,
    'a59365bd236b57ac70c99951b699c4604a9f9e181b467bbcc5b904805e0f9edc' /* key 83 */,
    '0550b0a84eb2d99b95825607c789599192c391f9c676c1a12a12a625f46b2238' /* key 84 */,
    '1bd079f18d23f9f6233dc55a517f02bbcaf9ed2848281e5bfd5854465b51e031' /* key 85 */,
    '72251644bbd69143c070a07babcc78a730f283e87ebe847027a9cbaaa96db0a6' /* key 86 */,
    'b46acffacc75f58056b13503ce05e67cb2c7dbac05e94e2f5b6436d502da4bc7' /* key 87 */,
    '1502471a73873519ed32bfb99b9ee486c7fbcd5cf8a403a1eb8957c17160a661' /* key 88 */,
    '13c0037a5546d68209ec9bcf66ecee3c8ffc9e6468e417161e7a329a7a007ca8' /* key 89 */,
    'f68b43608454c01c771ada27a5e7fc7fa12d5a24ea0e9f55cbb86436abbd08c9' /* key 90 */,
    '6e168a5430a04d05167d9672859bf1bcc1206074f71830e3d9730b7eec3a705c' /* key 91 */,
    'e5ad6380182a946012108fb17258a5cb4e1981e7047fa130d0ea5284a8c227fe' /* key 92 */,
    'cf7b4d23bc07853c2f0746edf20cd1230566d05c1093b081846b39f3f595d2bd' /* key 93 */,
    '262dd062ac3d58bee050924fad8d681fe838799ec1e29cdb6dd8565f2c61bdc9' /* key 94 */,
    'c13227d7f1cfe4c355742e4f4c60965376660584ba7b0b7bfccb096132d3d0e5' /* key 95 */,
    '7aaa4c68cde627fa2729b324808976a452105cc8065faf54fbedf6fa421fda3a' /* key 96 */,
    '8494b6d642b9417a525cb9e8f65f102d27600729883025467b78b7d406243134' /* key 97 */,
    'a66ab671e00d16024bb0a1c781a08dee32b1ddddb70bbe2161e73cd0a0629da5' /* key 98 */,
    'd393afc9b2297e3e12ee26184be085eb3f8fe8a50ef05cb8ba68d1658d3bcc46' /* key 99 */,
    '89ca14c9dd4c637c089ad13051615b5e493c6128ca2db4a2d74ffced08151562' /* key 100 */
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
