/* ÀṢÀ Bar & Kitchen · concept by BLACC Universal */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var WA = '2348029743214';

  // header goes solid on scroll
  var hd = $('[data-hd]');
  function onScroll() { hd.classList.toggle('is-solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // mobile menu
  var bg = $('[data-burger]'), dr = $('[data-drawer]');
  bg.addEventListener('click', function () {
    var open = dr.hidden; dr.hidden = !open; bg.setAttribute('aria-expanded', open);
    hd.classList.toggle('is-solid', open || window.scrollY > 40);
  });
  dr.addEventListener('click', function (e) { if (e.target.closest('a')) { dr.hidden = true; bg.setAttribute('aria-expanded', 'false'); onScroll(); } });

  // reveal on scroll
  var els = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add('is-in'); });

  // clay pot: lift the lid
  var pot = $('[data-pot]'), potTx = $('[data-pot-tx]'), auto = false;
  function setPot(open) {
    pot.classList.toggle('is-open', open);
    pot.setAttribute('aria-pressed', open);
    pot.setAttribute('aria-label', open ? 'Close the lid' : 'Lift the lid');
    potTx.textContent = open ? 'Close the lid' : 'Lift the lid';
  }
  pot.addEventListener('click', function () { setPot(!pot.classList.contains('is-open')); });
  if ('IntersectionObserver' in window) {
    var po = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && !auto) { auto = true; setTimeout(function () { setPot(true); }, 1400); po.disconnect(); } });
    }, { threshold: .6 });
    po.observe(pot);
  }

  // menu tabs
  $$('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-tab');
      $$('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      $$('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== k; });
      b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
  });

  // reservations: open WhatsApp with the details filled in
  var f = $('[data-reserve]'), err = $('[data-err]');
  var d = f.elements.date;
  try { var t = new Date(); d.min = t.toISOString().slice(0, 10); } catch (e) {}
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = function (n) { return (f.elements[n].value || '').trim(); };
    if (!v('name') || !v('phone') || !v('date') || !v('time')) { err.hidden = false; return; }
    err.hidden = true;
    var day = v('date');
    try { day = new Date(v('date') + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (x) {}
    var msg = 'Hello ÀṢÀ, I would like to reserve a table.\n\n' +
      'Name: ' + v('name') + '\nPhone: ' + v('phone') + '\nDate: ' + day + '\nTime: ' + v('time') +
      '\nGuests: ' + v('guests') + '\nWhere: ' + v('space') + (v('note') ? '\nNote: ' + v('note') : '');
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });
})();

/* premium pass: sticky reserve bar, menu accordions */
(function () {
  'use strict';
  var bar = document.querySelector('[data-mbar]'), hero = document.querySelector('.hero'), res = document.getElementById('reserve'), ft = document.querySelector('.ft');
  if (bar && 'IntersectionObserver' in window) {
    var inHero = true, inRes = false, inFt = false;
    function upd() { var on = !inHero && !inRes && !inFt; bar.classList.toggle('is-on', on); bar.setAttribute('aria-hidden', !on); [].forEach.call(bar.querySelectorAll('a'), function (a) { a.tabIndex = on ? 0 : -1; }); }
    new IntersectionObserver(function (es) { inHero = es[0].isIntersecting; upd(); }, { threshold: .15 }).observe(hero);
    new IntersectionObserver(function (es) { inRes = es[0].isIntersecting; upd(); }, { threshold: 0 }).observe(res);
    new IntersectionObserver(function (es) { inFt = es[0].isIntersecting; upd(); }, { threshold: 0 }).observe(ft);
  }
  var mq = window.matchMedia('(max-width:699px)');
  function setup() {
    document.querySelectorAll('[data-panel]').forEach(function (p) {
      var g = p.querySelectorAll('.mgrp');
      g.forEach(function (x, i) { x.classList.toggle('is-open', !mq.matches || i === 0); var b = x.querySelector('[data-acc]'); if (b) b.setAttribute('aria-expanded', x.classList.contains('is-open')); });
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-acc]'); if (!b || !mq.matches) return;
    var g = b.closest('.mgrp'), open = !g.classList.contains('is-open');
    g.classList.toggle('is-open', open); b.setAttribute('aria-expanded', open);
  });
  if (mq.addEventListener) mq.addEventListener('change', setup);
  setup();
})();
