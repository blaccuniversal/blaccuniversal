/* PQT · WORD RACE link between the host console, the big screen and team phones.
   Same device: BroadcastChannel. Across devices: the MQTT relays PQT already uses.
   The host publishes one retained state message; screens and phones only read it. Phones send answers to the host's inbox. */
(function (root) {
  'use strict';
  var BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
  var BASE = 'blaccuniversal/pqt/wr/v1/';
  var ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  function code() { var c = ''; for (var i = 0; i < 4; i++) c += ALPHA[Math.floor(Math.random() * ALPHA.length)]; return c; }
  function clean(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); }

  function mq(o) {
    var bi = 0, cl = null, dead = false, ok = false, t = null;
    function go() {
      if (dead || !root.mqtt) return;
      var url = BROKERS[bi % BROKERS.length]; ok = false;
      try { cl = root.mqtt.connect(url, { clientId: 'wr_' + Math.random().toString(16).slice(2, 10), clean: true, connectTimeout: 8000, reconnectPeriod: 2500, keepalive: 20 }); } catch (e) { bi++; setTimeout(go, 1000); return; }
      clearTimeout(t); t = setTimeout(function () { if (!ok) { try { cl.end(true); } catch (e) {} bi++; go(); } }, 10000);
      cl.on('connect', function () { ok = true; o.state(true); (o.subs || []).forEach(function (s) { cl.subscribe(s); }); o.ready && o.ready(); });
      cl.on('close', function () { o.state(false); }); cl.on('offline', function () { o.state(false); });
      cl.on('message', function (topic, p) { var m; try { m = JSON.parse(p.toString()); } catch (e) { return; } o.msg(topic, m); });
      cl.on('error', function () {});
    }
    go();
    return { pub: function (topic, obj, retain) { if (cl && cl.connected) try { cl.publish(topic, JSON.stringify(obj), { qos: 0, retain: !!retain }); } catch (e) {} }, on: function () { return !!(cl && cl.connected); }, end: function () { dead = true; if (cl) try { cl.end(true); } catch (e) {} } };
  }

  /* Host: publish(state) to everyone, onIn(msg) for answers from phones. */
  function host(roomCode, onIn, onNet) {
    var C = clean(roomCode), sT = BASE + C + '/s', iT = BASE + C + '/i', last = null, bc = null;
    if ('BroadcastChannel' in root) { bc = new BroadcastChannel('blaccpqt-wr-' + C); bc.onmessage = function (e) { var m = e.data || {}; if (m.k === 'i') onIn(m.d); if (m.k === 'hello' && last) bc.postMessage({ k: 's', d: last }); }; }
    var link = mq({ subs: [iT], state: function (on) { onNet && onNet(on); }, msg: function (t, m) { if (t === iT) onIn(m); }, ready: function () { if (last) link.pub(sT, last, true); } });
    return {
      code: C,
      publish: function (state) { last = state; if (bc) bc.postMessage({ k: 's', d: state }); link.pub(sT, state, true); },
      online: function () { return link.on(); },
      end: function () { link.pub(sT, { gone: true }, true); link.end(); if (bc) bc.close(); }
    };
  }
  /* Viewer (screen or phone): onState(state), send(msg) to the host. */
  function view(roomCode, onState, onNet) {
    var C = clean(roomCode), sT = BASE + C + '/s', iT = BASE + C + '/i', bc = null, newest = 0;
    function take(s) { if (!s) return; if (s.at && s.at < newest) return; newest = s.at || newest; onState(s); }
    if ('BroadcastChannel' in root) { bc = new BroadcastChannel('blaccpqt-wr-' + C); bc.onmessage = function (e) { var m = e.data || {}; if (m.k === 's') take(m.d); }; bc.postMessage({ k: 'hello' }); }
    var link = mq({ subs: [sT], state: function (on) { onNet && onNet(on); }, msg: function (t, m) { if (t === sT) take(m); } });
    return {
      code: C,
      send: function (msg) { if (bc) bc.postMessage({ k: 'i', d: msg }); link.pub(iT, msg, false); },
      online: function () { return link.on(); },
      end: function () { link.end(); if (bc) bc.close(); }
    };
  }
  root.WRLink = { host: host, view: view, code: code, clean: clean };
})(this);
