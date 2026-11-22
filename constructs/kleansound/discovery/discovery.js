/* KLS discovery questionnaire engine */
(function () {
  'use strict';
  var F = window.KLS_FORM, SEC = F.sections, KEY = 'kls_disc_v1';
  var FORM_KEY = 'c45f617c-f3f2-4caa-93cf-5d49e2cece46';
  var stage = document.querySelector('[data-stage]'), side = document.querySelector('[data-side]');
  var STEPS = ['welcome'].concat(SEC.map(function (s) { return s.id; }), ['review']);
  var st = { a: {}, products: [{}], ck: {}, step: 0, consent: false, seen: {} };
  var qmap = {}; SEC.forEach(function (s) { s.qs.forEach(function (q) { if (q.id) qmap[q.id] = q; }); });

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load() { try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.a) return d; } catch (e) {} return null; }
  var saveT = null, savedEl = document.querySelector('[data-saved]');
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { st.ts = Date.now(); localStorage.setItem(KEY, JSON.stringify(st)); savedEl.textContent = 'Saved on this device'; } catch (e) { savedEl.textContent = ''; } }, 400); }

  /* ---- values ---- */
  function getv(id, p) { return p === '' || p == null ? st.a[id] : (st.products[+p] || {})[id]; }
  function setv(id, p, v) { if (p === '' || p == null) st.a[id] = v; else { st.products[+p] = st.products[+p] || {}; st.products[+p][id] = v; } }
  function vis(q) { try { return !q.if || !!q.if(st.a); } catch (e) { return true; } }
  function filled(q, v) {
    if (q.k === 'check') return Array.isArray(v) && v.length > 0;
    if (q.k === 'grid') { if (!v) return false; return q.rows.every(function (r) { return v[r] && v[r].v; }); }
    return !!String(v == null ? '' : v).trim();
  }
  function anyVal(v) { if (v == null) return false; if (Array.isArray(v)) return v.length > 0; if (typeof v === 'object') return Object.keys(v).some(function (k) { return anyVal(v[k] && v[k].v !== undefined ? v[k].v : v[k]); }); return !!String(v).trim(); }

  /* ---- rendering a question ---- */
  var uid = 0;
  function qHTML(q, p) {
    var v = getv(q.id, p), id = 'q' + (++uid), sc = p === '' || p == null ? '' : p;
    var lab = '<div class="q__l"><label for="' + id + '">' + esc(q.t || '') + '</label>' + (q.req ? '<span class="tag tag--req">Required</span>' : '<span class="tag">Optional</span>') + '</div>' + (q.help ? '<p class="q__h">' + esc(q.help) + '</p>' : '');
    var body = '', at = ' data-id="' + q.id + '" data-p="' + sc + '"';
    if (q.k === 'text' || q.k === 'email' || q.k === 'tel' || q.k === 'number' || q.k === 'date' || q.k === 'url')
      body = '<input class="in" id="' + id + '" type="' + (q.k === 'url' ? 'text' : q.k) + '"' + (q.k === 'url' ? ' inputmode="url"' : '') + (q.k === 'number' ? ' inputmode="numeric"' : '') + (q.ph ? ' placeholder="' + esc(q.ph) + '"' : '') + ' value="' + esc(v) + '" autocomplete="off"' + at + '>';
    else if (q.k === 'long') body = '<textarea id="' + id + '" rows="4"' + at + '>' + esc(v) + '</textarea>';
    else if (q.k === 'select') body = '<select id="' + id + '"' + at + '><option value="">Select one</option>' + q.opts.map(function (o) { return '<option' + (v === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
    else if (q.k === 'radio' || q.k === 'check') {
      var t = q.k === 'radio' ? 'radio' : 'checkbox', nm = 'n' + id, row = q.opts.every(function (o) { return o.length < 18; }) && q.opts.length <= 4;
      body = '<div class="opts' + (row ? ' opts--row' : '') + '" role="' + (t === 'radio' ? 'radiogroup' : 'group') + '" aria-labelledby="' + id + '"' + at + '>' + q.opts.map(function (o) {
        var on = t === 'radio' ? v === o : Array.isArray(v) && v.indexOf(o) >= 0;
        return '<label class="opt"><input type="' + t + '" name="' + nm + '" value="' + esc(o) + '"' + (on ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
      }).join('') + '</div>';
    }
    return '<div class="q" data-q="' + q.id + '" data-pq="' + sc + '"' + (vis(q) ? '' : ' hidden') + '>' + lab + body + '<p class="err">Please answer this question.</p></div>';
  }
  function gridHTML(q) {
    var v = st.a[q.id] || {}, c = q.cols.length;
    var h = '<div class="q" data-q="' + q.id + '" data-pq=""><div class="q__l"><span>' + esc(q.title || 'Please answer for each row') + '</span>' + (q.req ? '<span class="tag tag--req">Required</span>' : '<span class="tag">Optional</span>') + '</div>' + (q.note ? '<p class="q__h">' + esc(q.note) + '</p>' : '') +
      '<div class="grid" style="--c:' + c + '"><div class="g__h"><span></span>' + q.cols.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>';
    q.rows.forEach(function (r, i) {
      var cur = v[r] || {};
      h += '<div class="g__r"><div class="g__n">' + esc(r) + '</div>' + q.cols.map(function (x) {
        return '<label class="g__c"><input type="radio" name="g' + q.id + i + '" value="' + esc(x) + '" data-g="' + esc(r) + '" data-gid="' + q.id + '"' + (cur.v === x ? ' checked' : '') + '><span>' + esc(x) + '</span></label>';
      }).join('');
      if (!q.noNote) h += '<div class="g__note"' + (cur.v === q.cols[0] ? '' : ' hidden') + '><input class="in" type="text" placeholder="Short note" value="' + esc(cur.n || '') + '" data-gn="' + esc(r) + '" data-gid="' + q.id + '"></div>';
      h += '</div>';
    });
    return h + '</div><p class="err">Please answer every row.</p></div>';
  }
  function productsHTML() {
    var h = '<div data-plist>';
    st.products.forEach(function (pr, i) { h += productCard(pr, i); });
    return h + '</div><div class="row"><button type="button" class="btn" data-addp>+ Add another product</button></div><p class="gnote">Add every product you sell, one card each. You can come back and add more later.</p>';
  }
  function productCard(pr, i) {
    var open = st.open === undefined || st.open === i || (st.products.length === 1);
    return '<div class="pc' + (open ? '' : ' shut') + '" data-pc="' + i + '"><div class="pc__h" data-pct><b>' + esc(pr.name || 'Product ' + (i + 1)) + '</b><small>' + (open ? 'Hide' : 'Edit') + '</small>' + (st.products.length > 1 ? '<button type="button" class="pc__x" data-rm="' + i + '">Remove</button>' : '') + '</div><div class="pc__b"><div class="qs">' + F.product.map(function (q) { return qHTML(q, i); }).join('') + '</div></div></div>';
  }

  /* ---- steps ---- */
  function sectionIdx(id) { for (var i = 0; i < SEC.length; i++) if (SEC[i].id === id) return i; return -1; }
  function numLabel(i) { return i; }
  function missingIn(sec) {
    var m = [];
    sec.qs.forEach(function (q) {
      if (q.k === 'products') {
        var named = st.products.filter(function (p) { return anyVal(p.name); });
        st.products.forEach(function (p, i) { var other = Object.keys(p).some(function (k) { return k !== 'name' && anyVal(p[k]); }); if (other && !anyVal(p.name)) m.push('pc:' + i); });
        if (st.a.have_cat === 'No' && !named.length) m.push('pc:0');
        return;
      }
      if (!q.req || !vis(q)) return;
      var v = st.a[q.id];
      if (!filled(q, v)) m.push(q.id);
      else if (q.k === 'email' && !/^\S+@\S+\.\S{2,}$/.test(String(v).trim())) m.push(q.id);
    });
    return m;
  }
  function renderSide() {
    var h = '';
    STEPS.forEach(function (id, i) {
      if (id === 'welcome') return;
      var nm = id === 'review' ? 'Review and send' : SEC[sectionIdx(id)].title, done = id !== 'review' && st.seen[id] && !missingIn(SEC[sectionIdx(id)]).length;
      h += '<button type="button" data-go="' + i + '" class="' + (i === st.step ? 'on ' : '') + (done ? 'done' : '') + '"><i>' + (done ? '✓' : i) + '</i><span>' + esc(nm) + '</span></button>';
    });
    side.innerHTML = h;
    var cur = STEPS[st.step], nm = cur === 'welcome' ? 'Welcome' : cur === 'review' ? 'Review and send' : cur === 'about' ? 'Before you start' : 'Section ' + (st.step - 1) + ' of ' + (SEC.length - 1) + ' · ' + SEC[sectionIdx(cur)].title;
    document.querySelector('[data-stepname]').textContent = nm;
    document.querySelector('[data-bar]').style.width = Math.round(st.step / (STEPS.length - 1) * 100) + '%';
  }
  function go(i, noScroll) {
    st.step = Math.max(0, Math.min(STEPS.length - 1, i)); render(); save();
    if (!noScroll) { window.scrollTo({ top: 0 }); stage.focus({ preventScroll: true }); }
  }
  function render() {
    var id = STEPS[st.step]; uid = 0;
    if (id === 'welcome') stage.innerHTML = welcome();
    else if (id === 'review') stage.innerHTML = review();
    else stage.innerHTML = section(SEC[sectionIdx(id)]);
    renderSide();
  }
  function welcome() {
    var d = load(), has = d && (anyVal(d.a) || d.step > 0);
    return '<p class="eyebrow">KLS by KleanSound</p><h1>Brand and business discovery</h1>' +
      '<p class="lead">We are building the KLS website. To make it accurate, clear and useful to your customers, we need to understand the company properly: its story, products, services and goals. Your answers become the content of the site, and nothing is published without your approval.</p>' +
      '<ul class="how"><li><b>About 45 to 60 minutes</b>Thirteen short sections. You can stop at any time.</li><li><b>Saved as you go</b>Your answers stay on this device, so you can close the page and return.</li><li><b>Share the work</b>Different people can answer different sections. Send the link to colleagues.</li></ul>' +
      '<p class="legend"><span class="tag tag--req">Required</span> questions are marked. Everything else is optional, and “I do not know yet” is a perfectly good answer. Please do not guess technical figures. Anything you leave blank we will ask about later.</p>' +
      '<div class="row"><button class="btn btn--g" type="button" data-start>' + (has ? 'Start again' : 'Start') + '</button>' + (has ? '<button class="btn" type="button" data-resume>Continue where I stopped</button>' : '') + '</div>';
  }
  function section(sec) {
    st.seen[sec.id] = 1;
    var i = sectionIdx(sec.id), h = '<p class="eyebrow">' + (i === 0 ? 'Before you start' : 'Section ' + i + ' of ' + (SEC.length - 1)) + '</p><h2>' + esc(sec.title) + '</h2><p class="lead">' + esc(sec.intro) + '</p><p class="meta"><span><b>About</b> ' + esc(sec.time) + '</span></p><div class="qs">';
    sec.qs.forEach(function (q) {
      if (q.k === 'grid') h += gridHTML(q); else if (q.k === 'products') h += productsHTML(); else h += qHTML(q, '');
    });
    h += '</div><div class="nav">' + (st.step > 0 ? '<button class="btn" type="button" data-prev>Back</button>' : '<span></span>') + '<button class="btn btn--g" type="button" data-next>' + (st.step === STEPS.length - 2 ? 'Review' : 'Save and continue') + '</button></div>';
    return h;
  }
  function review() {
    var h = '<p class="eyebrow">Last step</p><h2>Review and send</h2><p class="lead">Check that each section is complete, tick off what you can prepare, then send. A copy of your answers will be saved to your device so you can keep it.</p><ul class="sum">';
    SEC.forEach(function (s, i) {
      var m = missingIn(s), cnt = s.qs.reduce(function (n, q) { if (q.k === 'products') return n + st.products.filter(function (p) { return anyVal(p.name); }).length; return n; }, 0);
      h += '<li><b>' + esc(s.title) + (s.id === 's3' ? ' <small>(' + cnt + ' product' + (cnt === 1 ? '' : 's') + ')</small>' : '') + '</b>' + (m.length ? '<span class="miss">' + m.length + ' required left</span>' : '<span class="ok">Complete</span>') + '<button type="button" data-go="' + (i + 1) + '">' + (m.length ? 'Fix' : 'Edit') + '</button></li>';
    });
    h += '</ul><div class="ck"><h2 style="font-size:clamp(24px,3vw,32px)">Documents and assets to prepare</h2><p class="lead" style="margin-top:10px">Not needed to submit this form, but they will speed up the website a lot. Tick what you already have.</p>';
    F.checklist.forEach(function (g, gi) {
      h += '<h3>' + esc(g[0]) + '</h3><div class="opts">' + g[1].map(function (t, ti) { var k = gi + '_' + ti; return '<label class="opt"><input type="checkbox" data-ck="' + k + '"' + (st.ck[k] ? ' checked' : '') + '><span>' + esc(t) + '</span></label>'; }).join('') + '</div>';
    });
    h += '</div><div class="consent"><label class="opt"><input type="checkbox" data-consent' + (st.consent ? ' checked' : '') + '><span>I confirm the information is correct to the best of my knowledge, and I am authorised to share it for the purpose of building the KLS website.</span></label></div>' +
      '<input type="text" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true" data-bot style="position:absolute;left:-9999px;opacity:0">' +
      '<div class="nav"><button class="btn" type="button" data-prev>Back</button><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end"><button class="btn" type="button" data-dl>Download my answers</button><button class="btn btn--g" type="button" data-send>Send answers</button></div></div><p class="msg" data-msg role="status"></p>';
    return h;
  }

  /* ---- composing ---- */
  function fmtVal(q, v) {
    if (q.k === 'check') return v.join('; ');
    return String(v).trim();
  }
  function compose() {
    var out = [];
    SEC.forEach(function (s, si) {
      var lines = [];
      s.qs.forEach(function (q) {
        if (q.k === 'products') {
          st.products.forEach(function (p, i) {
            if (!anyVal(p.name) && !Object.keys(p).some(function (k) { return anyVal(p[k]); })) return;
            lines.push('--- PRODUCT ' + (i + 1) + ': ' + (p.name || '(unnamed)') + ' ---');
            F.product.forEach(function (pq) { var v = p[pq.id]; if (anyVal(v)) lines.push(pq.t + ': ' + fmtVal(pq, v)); });
          });
          return;
        }
        if (!vis(q)) return;
        var v = st.a[q.id];
        if (q.k === 'grid') {
          if (!v) return;
          var rl = q.rows.filter(function (r) { return v[r] && v[r].v; }).map(function (r) { return '  - ' + r + ': ' + v[r].v + (v[r].n ? ' (' + v[r].n + ')' : ''); });
          if (rl.length) lines.push((q.title || q.id === 'services' ? 'Services' : q.id === 'assets' ? 'Assets' : 'Website features') + ':\n' + rl.join('\n'));
          return;
        }
        if (anyVal(v)) lines.push(q.t + ': ' + fmtVal(q, v));
      });
      out.push({ k: (si === 0 ? '00 ' : (si < 10 ? '0' + si : si) + ' ') + s.title, v: lines.join('\n') || '(no answers)' });
    });
    var ck = []; F.checklist.forEach(function (g, gi) { g[1].forEach(function (t, ti) { ck.push((st.ck[gi + '_' + ti] ? '[x] ' : '[ ] ') + t); }); });
    out.push({ k: 'Checklist', v: ck.join('\n') });
    return out;
  }
  function download() {
    var txt = 'KLS BY KLEANSOUND: DISCOVERY ANSWERS\nExported ' + new Date().toLocaleString() + '\n\n' + compose().map(function (s) { return '== ' + s.k.toUpperCase() + ' ==\n' + s.v; }).join('\n\n') + '\n';
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); a.download = 'KLS-discovery-answers.txt'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---- events ---- */
  function refreshVis() {
    stage.querySelectorAll('[data-q]').forEach(function (w) {
      var q = qmap[w.getAttribute('data-q')]; if (!q || w.getAttribute('data-pq') !== '') return;
      w.hidden = !vis(q);
    });
  }
  stage.addEventListener('input', function (e) {
    var t = e.target, id = t.getAttribute('data-id');
    if (t.hasAttribute('data-gn')) { var g = st.a[t.getAttribute('data-gid')] = st.a[t.getAttribute('data-gid')] || {}, r = t.getAttribute('data-gn'); g[r] = g[r] || {}; g[r].n = t.value; save(); return; }
    if (!id || t.type === 'radio' || t.type === 'checkbox') return;
    setv(id, t.getAttribute('data-p'), t.value);
    var w = t.closest('.q'); if (w) w.classList.remove('bad');
    if (id === 'name' && t.getAttribute('data-p') !== '') { var b = t.closest('.pc').querySelector('.pc__h b'); b.textContent = t.value.trim() || 'Product ' + (+t.getAttribute('data-p') + 1); }
    refreshVis(); save();
  });
  stage.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-ck')) { st.ck[t.getAttribute('data-ck')] = t.checked; save(); return; }
    if (t.hasAttribute('data-consent')) { st.consent = t.checked; save(); return; }
    if (t.hasAttribute('data-g')) {
      var gid = t.getAttribute('data-gid'), g = st.a[gid] = st.a[gid] || {}, r = t.getAttribute('data-g'); g[r] = g[r] || {}; g[r].v = t.value;
      var note = t.closest('.g__r').querySelector('.g__note'); if (note) note.hidden = t.value !== qmap[gid].cols[0];
      t.closest('.q').classList.remove('bad'); refreshVis(); save(); return;
    }
    var box = t.closest('[data-id]'); if (!box) { if (t.tagName === 'SELECT') { setv(t.getAttribute('data-id'), t.getAttribute('data-p'), t.value); refreshVis(); save(); } return; }
    if (t.type === 'radio') setv(box.getAttribute('data-id'), box.getAttribute('data-p'), t.value);
    else if (t.type === 'checkbox') setv(box.getAttribute('data-id'), box.getAttribute('data-p'), [].slice.call(box.querySelectorAll('input:checked')).map(function (x) { return x.value; }));
    var w = t.closest('.q'); if (w) w.classList.remove('bad'); refreshVis(); save();
  });
  function firstBad(m) {
    var sel = m[0].indexOf('pc:') === 0 ? '[data-pc="' + m[0].slice(3) + '"]' : '[data-q="' + m[0] + '"]';
    var el = stage.querySelector(sel); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); var f = el.querySelector('input,textarea,select'); if (f && f.type !== 'radio' && f.type !== 'checkbox') setTimeout(function () { f.focus({ preventScroll: true }); }, 350); }
  }
  function validateCurrent() {
    var sec = SEC[sectionIdx(STEPS[st.step])], m = missingIn(sec);
    stage.querySelectorAll('.bad').forEach(function (x) { x.classList.remove('bad'); });
    m.forEach(function (id) {
      if (id.indexOf('pc:') === 0) { var pcard = stage.querySelector('[data-pc="' + id.slice(3) + '"]'); if (pcard) { pcard.classList.remove('shut'); var w0 = pcard.querySelector('[data-q="name"]'); if (w0) { w0.classList.add('bad'); w0.querySelector('.err').textContent = 'Please give this product a name.'; } } return; }
      var w = stage.querySelector('[data-q="' + id + '"]'); if (w) { w.classList.add('bad'); if (qmap[id].k === 'email') w.querySelector('.err').textContent = 'Please enter a valid email address.'; }
    });
    if (m.length) { firstBad(m); return false; }
    return true;
  }
  stage.addEventListener('click', function (e) {
    var t = e.target.closest('button,.pc__h'); if (!t) return;
    if (t.hasAttribute('data-start')) { st = { a: {}, products: [{}], ck: {}, step: 0, consent: false, seen: {} }; go(1); return; }
    if (t.hasAttribute('data-resume')) { var d = load(); if (d) { st = d; st.seen = st.seen || {}; } go(Math.max(1, st.step || 1)); return; }
    if (t.hasAttribute('data-next')) { if (validateCurrent()) go(st.step + 1); return; }
    if (t.hasAttribute('data-prev')) { go(st.step - 1); return; }
    if (t.hasAttribute('data-go')) { go(+t.getAttribute('data-go')); return; }
    if (t.hasAttribute('data-addp')) { st.products.push({}); st.open = st.products.length - 1; render(); save(); var c = stage.querySelector('[data-pc="' + st.open + '"]'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (t.hasAttribute('data-rm')) { e.stopPropagation(); var i = +t.getAttribute('data-rm'); if (!anyVal(st.products[i].name) || confirm('Remove this product card?')) { st.products.splice(i, 1); st.open = 0; render(); save(); } return; }
    if (t.classList.contains('pc__h') || t.hasAttribute('data-pct')) { var card = t.closest('.pc'), idx = +card.getAttribute('data-pc'); card.classList.toggle('shut'); card.querySelector('.pc__h small').textContent = card.classList.contains('shut') ? 'Edit' : 'Hide'; return; }
    if (t.hasAttribute('data-dl')) { download(); return; }
    if (t.hasAttribute('data-send')) { send(t); return; }
  });
  side.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) go(+b.getAttribute('data-go')); });

  function send(btn) {
    var msg = stage.querySelector('[data-msg]'); function say(t, c) { msg.className = 'msg' + (c ? ' err2' : ''); msg.textContent = t; }
    for (var i = 0; i < SEC.length; i++) { var m = missingIn(SEC[i]); if (m.length) { say('Section “' + SEC[i].title + '” still has required questions. Tap “Fix” next to it above.', 1); return; } }
    if (!st.consent) { say('Please tick the confirmation box.', 1); return; }
    if (stage.querySelector('[data-bot]').value) return;
    btn.disabled = true; say('Sending…');
    var secs = compose(), biz = st.a.official || 'KLS', d = { access_key: FORM_KEY, subject: 'KLS discovery questionnaire: ' + biz, from_name: 'KLS discovery form', botcheck: '', name: st.a.r_name || '', email: st.a.r_email || '', phone: st.a.r_phone || '', page: location.href };
    secs.forEach(function (s) { d[s.k] = s.v; });
    fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.success === false) throw 0; }); })
      .then(function () {
        try { localStorage.removeItem(KEY); } catch (x) {}
        stage.innerHTML = '<div class="done"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg><h2>Thank you, ' + esc((st.a.r_name || '').split(' ')[0]) + '.</h2><p class="lead" style="margin:14px auto 0">Your answers have been sent. We will review them and come back with questions on anything that needs confirming. Please keep the checklist in mind and share your assets folder when ready.</p><div class="row" style="justify-content:center"><button class="btn" type="button" data-dl>Download a copy</button></div></div>';
        document.querySelector('[data-bar]').style.width = '100%'; side.innerHTML = ''; savedEl.textContent = 'Sent'; window.scrollTo({ top: 0 });
      })
      .catch(function () { btn.disabled = false; say('Could not send just now. Your answers are saved on this device. Please try again, or download them and email the file.', 1); });
  }

  var prev = load(); if (prev) { savedEl.textContent = 'Saved on this device'; }
  render();
  window.addEventListener('beforeunload', function () { try { if (st.step > 0) localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} });
})();
