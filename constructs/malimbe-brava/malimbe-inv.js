/* Malimbe investor form: sends details, then downloads the deck */
(function () {
  'use strict';
  var KEY = 'c45f617c-f3f2-4caa-93cf-5d49e2cece46';
  var PDF = '/constructs/malimbe/files/mlb-investor-deck-2026-7k3q.pdf';
  var NAME = 'Malimbe-Lodge-Investor-Pitch-Deck-2026.pdf';
  var f = document.getElementById('invForm'); if (!f) return;
  var msg = document.getElementById('invMsg'), src = f.elements.source, oth = f.querySelector('.inv__oth'), amt = f.elements.amount;
  function say(t, c) { msg.className = 'jf__msg' + (c ? ' ' + c : ''); msg.textContent = t; }
  src.addEventListener('change', function () { oth.hidden = src.value !== 'Other'; });
  amt.addEventListener('input', function () { var d = amt.value.replace(/[^\d]/g, ''); amt.value = d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''; });
  f.addEventListener('input', function (e) { e.target.classList.remove('bad'); });
  f.addEventListener('change', function (e) { e.target.classList.remove('bad'); });
  function dl() { var a = document.createElement('a'); a.href = PDF; a.download = NAME; document.body.appendChild(a); a.click(); a.remove(); }
  function fixUrl(u) { u = u.trim(); if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u; return u; }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var el = f.elements, bad = [];
    [].forEach.call(f.querySelectorAll('.bad'), function (x) { x.classList.remove('bad'); });
    function need(n, ok) { if (!ok) { bad.push(el[n]); el[n].classList.add('bad'); } }
    need('name', el.name.value.trim().split(/\s+/).length >= 2 && el.name.value.trim().length >= 4);
    need('email', /^\S+@\S+\.\S{2,}$/.test(el.email.value.trim()));
    need('phone', el.phone.value.replace(/\D/g, '').length >= 7);
    need('amount', +amt.value.replace(/,/g, '') > 0);
    need('source', !!src.value && (src.value !== 'Other' || el.source_other.value.trim().length > 2));
    need('address', el.address.value.trim().length >= 6);
    need('country', el.country.value.trim().length >= 2);
    var li = fixUrl(el.linkedin.value);
    need('linkedin', /^https?:\/\/([a-z0-9-]+\.)?linkedin\.com\/\S+/i.test(li));
    if (bad.length) { say(bad[0] === el.name ? 'Please enter your first and last name.' : bad[0] === el.linkedin ? 'Please add your LinkedIn page, like linkedin.com/in/yourname.' : 'Please check the highlighted fields.', 'err'); try { bad[0].focus(); } catch (x) {} return; }
    if (!el.consent.checked) { say('Please tick the confirmation box.', 'err'); return; }
    if (el.botcheck.value) return;
    var btn = f.querySelector('button[type=submit]'); btn.disabled = true; say('Sending…');
    var data = {
      access_key: KEY, subject: 'Investor deck request: ' + el.name.value.trim() + ' (' + el.currency.value + el.amount.value + ')',
      from_name: 'Malimbe Lodge investor page', botcheck: '', page: location.href,
      name: el.name.value.trim(), email: el.email.value.trim(), phone: el.phone.value.trim(),
      amount_to_invest: el.currency.value + ' ' + el.amount.value, source_of_funds: src.value === 'Other' ? 'Other: ' + el.source_other.value.trim() : src.value,
      address: el.address.value.trim(), country: el.country.value.trim(), linkedin: li, consent: 'Confirmed'
    };
    fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.success === false) throw 0; }); })
      .then(function () {
        f.innerHTML = '<div class="inv__done jf__full"><h3>Thank you, ' + data.name.split(' ')[0].replace(/[<>&"]/g, '') + '.</h3><p>Your investor deck is downloading. We will be in touch soon.</p><a class="pill pill--ghost pill--lg" href="' + PDF + '" download="' + NAME + '">Download again</a></div>';
        dl();
      })
      .catch(function () { btn.disabled = false; say('Could not send just now. Please check your connection and try again.', 'err'); });
  });
})();
