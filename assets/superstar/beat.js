/* Superstar — built-in lofi beat engine (Web Audio, all synthesized, no samples) */
(function () {
  'use strict';

  // Patterns: 16 steps per bar. X = accent, x = normal, o = ghost, r = roll (hats only)
  var PRESETS = [
    { id: 'late-night', name: 'Late Night', vibe: 'Classic lofi boom bap', bpm: 80, swing: 0.22,
      k: 'x......x..x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xo',
      chords: [[57, 60, 64, 67], [50, 57, 60, 65, 64], [55, 59, 62, 65], [48, 55, 59, 64]], bass: [45, 38, 43, 36],
      bassPat: 'x.....x...x.....', vinyl: 1 },
    { id: 'rainy-window', name: 'Rainy Window', vibe: 'Slow, soft, rain outside', bpm: 72, swing: 0.16,
      k: 'x.........x.....', s: '....x.......x...', h: 'x...x...x...x...', rim: 1,
      chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], bass: [41, 40, 38, 36],
      bassPat: 'x.......x.......', vinyl: 1, rain: 1 },
    { id: 'dusty-tape', name: 'Dusty Tape', vibe: 'Heavy swing, warm keys', bpm: 86, swing: 0.3,
      k: 'x..x......x..x..', s: '....x.......x..o', h: 'xoxoxoxoxoxoxoxo',
      chords: [[51, 55, 58, 62], [48, 51, 55, 58], [53, 56, 60, 63], [46, 50, 53, 56]], bass: [39, 36, 41, 34],
      bassPat: 'x..x......x.....', vinyl: 1 },
    { id: 'sunday', name: 'Sunday', vibe: 'Bright and bouncy', bpm: 92, swing: 0.12,
      k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.xx',
      chords: [[55, 59, 62, 66], [52, 55, 59, 62], [57, 60, 64, 67], [50, 54, 57, 60]], bass: [43, 40, 45, 38],
      bassPat: 'x.....x.x.......', vinyl: 0 },
    { id: 'slow-burn', name: 'Slow Burn', vibe: 'Half-time, rolling hats', bpm: 66, swing: 0,
      k: 'x.......x..x....', s: '........x.......', h: 'x.x.x.x.x.x.xrx.', halftime: 1,
      chords: [[48, 51, 55, 58, 62], [44, 48, 51, 55], [51, 55, 58, 62], [46, 50, 53, 57]], bass: [36, 32, 39, 34],
      bassPat: 'x.........x.....', vinyl: 1 },
    { id: 'cypher', name: 'Cypher', vibe: 'Drums only, nothing in the way', bpm: 94, swing: 0.2,
      k: 'x.x....x..x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.',
      chords: null, bass: null, vinyl: 1 },
    { id: 'metronome', name: 'Metronome', vibe: 'Just a click', bpm: 90, swing: 0, click: 1,
      k: '', s: '', h: '', chords: null, bass: null, vinyl: 0 }
  ];

  var ctx = null, master, bus, lp, comp, recDest = null, noiseBuf, crackleBuf, rainBuf;
  var lfo, lfoGain, tremLfo;
  var timer = null, playing = false, cfg = null, startTime = 0, nextStep = 0, nextTime = 0, stepDur = 0;
  var beds = [], onStop = null, stopAt = Infinity, countSteps = 0;
  var mix = { drums: 1, keys: 1, bass: 1, vinyl: 1 };

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain(); master.gain.value = 0.9;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000; lp.Q.value = 0.3;
    bus = ctx.createGain(); bus.gain.value = 1;
    bus.connect(lp); lp.connect(comp); comp.connect(master); master.connect(ctx.destination);
    // tape wobble for keys
    lfo = ctx.createOscillator(); lfo.frequency.value = 0.45; lfoGain = ctx.createGain(); lfoGain.gain.value = 7;
    lfo.connect(lfoGain); lfo.start();
    noiseBuf = makeNoise(1.5, 'white');
    crackleBuf = makeCrackle(4);
    rainBuf = makeNoise(4, 'pink');
    return ctx;
  }
  function makeNoise(sec, kind) {
    var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < n; i++) {
      var w = Math.random() * 2 - 1;
      if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12; }
      else d[i] = w;
    }
    return b;
  }
  function makeCrackle(sec) {
    var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.012;
      if (Math.random() < 0.00045) { var a = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1); for (var j = 0; j < 30 && i + j < n; j++) d[i + j] += a * Math.exp(-j / 5); }
    }
    return b;
  }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // ---------- voices ----------
  function kick(t, v) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.0 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g); g.connect(drumOut(t)); o.start(t); o.stop(t + 0.45);
    // soft click for definition
    var n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g2 = ctx.createGain();
    n.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = 2200; g2.gain.setValueAtTime(0.12 * v, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    n.connect(f); f.connect(g2); g2.connect(drumOut(t)); n.start(t); n.stop(t + 0.03);
  }
  function snare(t, v, rim) {
    var n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noiseBuf; bp.type = 'bandpass'; bp.frequency.value = rim ? 2600 : 1700; bp.Q.value = rim ? 3 : 0.8;
    var len = rim ? 0.06 : 0.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((rim ? 0.35 : 0.55) * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    n.connect(bp); bp.connect(g); g.connect(drumOut(t)); n.start(t, Math.random()); n.stop(t + len + 0.02);
    var o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(rim ? 420 : 190, t); o.frequency.exponentialRampToValueAtTime(rim ? 380 : 150, t + 0.08);
    og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime((rim ? 0.18 : 0.32) * v, t + 0.003); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(og); og.connect(drumOut(t)); o.start(t); o.stop(t + 0.14);
  }
  function hat(t, v, open) {
    var n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = 7000;
    var len = open ? 0.22 : 0.045;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    n.connect(hp); hp.connect(g); g.connect(drumOut(t)); n.start(t, Math.random()); n.stop(t + len + 0.02);
  }
  function click(t, accent) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = accent ? 1760 : 1320;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(accent ? 0.22 : 0.14, t + 0.002); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.06);
  }
  var drumGain = null, keysGain = null, bassGain = null, vinylGain = null;
  function drumOut() { return drumGain; }
  function chord(t, notes, dur) {
    var g = ctx.createGain(), f = ctx.createBiquadFilter(), trem = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 0.4;
    trem.gain.value = 1;
    g.connect(f); f.connect(trem); trem.connect(keysGain);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.6); g.gain.setTargetAtTime(0.0001, t + dur - 0.08, 0.06);
    notes.forEach(function (m, i) {
      var tt = t + i * 0.012, fr = mtof(m);
      var o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = fr; lfoGain.connect(o1.detune);
      var o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = fr * 2; lfoGain.connect(o2.detune);
      var g2 = ctx.createGain(); g2.gain.value = 0.18;
      o1.connect(g); o2.connect(g2); g2.connect(g);
      o1.start(tt); o2.start(tt); o1.stop(t + dur + 0.3); o2.stop(t + dur + 0.3);
    });
  }
  function bassNote(t, m, dur) {
    var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sine'; o.frequency.value = mtof(m); f.type = 'lowpass'; f.frequency.value = 400;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42, t + 0.015); g.gain.setTargetAtTime(0.0001, t + dur * 0.85, 0.05);
    o.connect(f); f.connect(g); g.connect(bassGain); o.start(t); o.stop(t + dur + 0.3);
  }
  function startBeds(t) {
    stopBeds();
    if (cfg.vinyl) beds.push(loop(crackleBuf, 0.9, 'highpass', 900, t));
    if (cfg.rain) beds.push(loop(rainBuf, 0.55, 'lowpass', 2600, t));
  }
  function loop(buf, gain, type, freq, t) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; s.loop = true; f.type = type; f.frequency.value = freq; g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(vinylGain); s.start(t); return s;
  }
  function stopBeds() { beds.forEach(function (s) { try { s.stop(); } catch (e) {} }); beds = []; }

  // ---------- scheduler ----------
  function setMix(m) {
    for (var k in m) mix[k] = m[k] ? 1 : 0;
    if (!ctx) return;
    var t = ctx.currentTime;
    if (drumGain) drumGain.gain.setTargetAtTime(mix.drums ? 0.9 : 0, t, 0.03);
    if (keysGain) keysGain.gain.setTargetAtTime(mix.keys ? 1 : 0, t, 0.03);
    if (bassGain) bassGain.gain.setTargetAtTime(mix.bass ? 1 : 0, t, 0.03);
    if (vinylGain) vinylGain.gain.setTargetAtTime(mix.vinyl ? 1 : 0, t, 0.03);
  }
  function buildBuses() {
    [drumGain, keysGain, bassGain, vinylGain].forEach(function (g) { if (g) try { g.disconnect(); } catch (e) {} });
    drumGain = ctx.createGain(); keysGain = ctx.createGain(); bassGain = ctx.createGain(); vinylGain = ctx.createGain();
    [drumGain, keysGain, bassGain, vinylGain].forEach(function (g) { g.connect(bus); });
    setMix({});
  }
  function hitAt(str, i) { return str && str[i] && str[i] !== '.' ? str[i] : null; }
  function vel(c) { return c === 'X' ? 1 : c === 'o' ? 0.35 : 0.8; }
  function scheduleStep(step, t) {
    var i = step % 16;
    if (step >= stopAt) return;
    if (step < countSteps) { if (i % 4 === 0) click(t, i === 0); return; }
    var bar = Math.floor((step - countSteps) / 16);
    if (cfg.click) { if (i % 4 === 0) click(t, i === 0); return; }
    var c;
    if ((c = hitAt(cfg.k, i))) kick(t, vel(c));
    if ((c = hitAt(cfg.s, i))) snare(t, vel(c), false);
    if (cfg.rim && (i === 6 || i === 14)) snare(t, 0.45, true);
    if ((c = hitAt(cfg.h, i))) {
      if (c === 'r') { for (var r = 0; r < 3; r++) hat(t + r * stepDur / 3, 0.6, false); }
      else hat(t, vel(c) * (i % 4 === 0 ? 1 : 0.75), false);
    }
    if (cfg.chords && i === 0) chord(t, cfg.chords[bar % cfg.chords.length], stepDur * 16);
    if (cfg.bass && cfg.bassPat && cfg.bassPat[i] === 'x') {
      var len = 0; for (var j = i + 1; j < 16 && cfg.bassPat[j] !== 'x'; j++) len++;
      bassNote(t, cfg.bass[bar % cfg.bass.length], stepDur * (len + 1) * 0.95);
    }
  }
  function tick() {
    var ahead = ctx.currentTime + 0.14;
    while (nextTime < ahead) {
      var swingOff = (nextStep % 2 === 1) ? cfg.swing * stepDur : 0;
      scheduleStep(nextStep, nextTime + swingOff);
      nextStep++; nextTime = startTime + nextStep * stepDur;
    }
    if (nextStep >= stopAt && ctx.currentTime > startTime + stopAt * stepDur + 0.4) finish();
  }
  function finish() {
    var cb = onStop; stop(); if (cb) cb();
  }

  // iOS: make Web Audio play even with the ringer switch on silent
  var unlocked = false;
  function unlock() {
    ensure();
    if (ctx.state !== 'running') ctx.resume();
    if (unlocked) return; unlocked = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      var rate = 8000, n = rate / 4, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
      function s(o, str) { for (var i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); }
      s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
      var a = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
      a.loop = true; a.setAttribute('playsinline', ''); a.volume = 0.01; var p = a.play(); if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  function start(opts) {
    ensure(); unlock(); stop(true);
    var p = PRESETS.filter(function (x) { return x.id === opts.preset; })[0] || PRESETS[0];
    cfg = Object.assign({}, p);
    var bpm = opts.bpm || p.bpm;
    // half-time presets: a "beat" for the rapper is still a quarter note at the chosen tempo
    stepDur = 60 / bpm / 4;
    buildBuses();
    if (opts.mix) setMix(opts.mix);
    playing = true;
    startTime = ctx.currentTime + (opts.delay || 0.15);
    nextStep = 0; nextTime = startTime;
    stopAt = opts.steps ? opts.steps : Infinity;
    countSteps = (opts.countIn || 0) * 16;
    onStop = opts.onStop || null;
    startBeds(startTime + countSteps * stepDur);
    timer = setInterval(tick, 25); tick();
    return startTime;
  }
  function stop(silent) {
    if (timer) clearInterval(timer); timer = null;
    stopBeds();
    if (ctx && drumGain) {
      var t = ctx.currentTime;
      [drumGain, keysGain, bassGain].forEach(function (g) { g.gain.setTargetAtTime(0, t, 0.05); });
    }
    playing = false; onStop = null; stopAt = Infinity;
  }
  function endAfter(steps) { stopAt = steps; }
  function now() { return ctx ? ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0) : 0; }
  function recordStream() {
    ensure();
    if (!recDest) { recDest = ctx.createMediaStreamDestination(); master.connect(recDest); }
    return recDest;
  }

  window.Beat = {
    PRESETS: PRESETS, start: start, stop: stop, endAfter: endAfter, unlock: unlock, setMix: setMix,
    now: now, get startTime() { return startTime; }, get secPerBeat() { return stepDur * 4; },
    get playing() { return playing; }, get ctx() { return ensure(); }, recordStream: recordStream
  };
})();
