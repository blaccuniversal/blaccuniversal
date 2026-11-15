/* PQT · read a question document (.docx or .txt) into rounds.
   Layout it understands:
     Title line (optional, e.g. "PQT Quests’ Gameweek 8")
     WRITTEN ROUND            <- round heading on its own line
     1. Question text         <- numbering optional
     Answer: the answer
     Notes: anything          <- ignored
     [A] option [B] option    <- multiple-choice lines kept with the question
   Rounds read: Written Round, Rapid Fire. Other round headings are recognised and reported. */
(function () {
  'use strict';
  var W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  var HEAD = {
    writtenround: 'written', written: 'written', rapidfireround: 'rapid', rapidfire: 'rapid', rapid: 'rapid',
    allexceptheseones: 'words', allexceptthese: 'words', password: 'pw', questsfeud: 'answers', feud: 'answers',
    alphasum: 'alpha', finishthelyrics: 'lyrics', spellingbee: 'spell', himynameis: 'names', discussion: 'talk', superstar: 'star', wordrace: 'race'
  };
  var READ = { written: 1, rapid: 1 };

  function u16(d, o) { return d.getUint16(o, true); }
  function u32(d, o) { return d.getUint32(o, true); }
  function inflate(bytes) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('old-browser'));
    var ds = new DecompressionStream('deflate-raw');
    var s = new Blob([bytes]).stream().pipeThrough(ds);
    return new Response(s).arrayBuffer();
  }
  function unzipEntry(buf, name) {
    var d = new DataView(buf), i = buf.byteLength - 22;
    while (i >= 0 && u32(d, i) !== 0x06054b50) i--;
    if (i < 0) return Promise.reject(new Error('not-docx'));
    var n = u16(d, i + 10), p = u32(d, i + 16), dec = new TextDecoder();
    for (var k = 0; k < n; k++) {
      if (u32(d, p) !== 0x02014b50) break;
      var meth = u16(d, p + 10), csize = u32(d, p + 20), nl = u16(d, p + 28), xl = u16(d, p + 30), cl = u16(d, p + 32), off = u32(d, p + 42);
      var nm = dec.decode(new Uint8Array(buf, p + 46, nl));
      if (nm === name) {
        var start = off + 30 + u16(d, off + 26) + u16(d, off + 28), data = new Uint8Array(buf, start, csize);
        if (meth === 0) return Promise.resolve(data.slice().buffer);
        if (meth === 8) return inflate(data);
        return Promise.reject(new Error('zip-method'));
      }
      p += 46 + nl + xl + cl;
    }
    return Promise.reject(new Error('not-docx'));
  }
  function docxLines(buf) {
    return unzipEntry(buf, 'word/document.xml').then(function (xmlBuf) {
      var doc = new DOMParser().parseFromString(new TextDecoder().decode(xmlBuf), 'application/xml');
      var out = [], ps = doc.getElementsByTagNameNS(W, 'p');
      for (var i = 0; i < ps.length; i++) {
        var s = '', walk = function (n) {
          for (var c = n.firstChild; c; c = c.nextSibling) {
            if (c.nodeType !== 1) continue;
            var ln = c.localName;
            if (ln === 't') s += c.textContent;
            else if (ln === 'tab') s += ' ';
            else if (ln === 'br' || ln === 'cr') s += '\n';
            else if (ln !== 'pPr' && ln !== 'rPr' && ln !== 'instrText') walk(c);
          }
        };
        walk(ps[i]);
        s.split('\n').forEach(function (l) { out.push(l); });
      }
      return out;
    });
  }
  function key(l) { return l.toLowerCase().replace(/[^a-z]/g, ''); }
  function parseLines(lines) {
    var res = { title: '', rounds: {}, other: [] }, cur = null, sec = null, seenHead = false;
    lines.forEach(function (raw) {
      var l = raw.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
      if (!l) return;
      var k = key(l), h = HEAD[k] || HEAD[k.replace(/round$/, '')];
      if (h && l.length < 40) {
        seenHead = true; sec = h; cur = null;
        if (READ[h]) res.rounds[h] = res.rounds[h] || [];
        else if (res.other.indexOf(h) < 0) res.other.push(h);
        return;
      }
      if (!seenHead) { if (!res.title) res.title = l; return; }
      if (!sec || !READ[sec]) return;
      var list = res.rounds[sec], m;
      if ((m = l.match(/^answers?\s*[:\-–—]\s*(.*)$/i))) { if (cur) cur.a = m[1].trim(); return; }
      if (/^notes?\s*[:\-–—]/i.test(l)) return;
      if (/^\[[A-H]\]/.test(l) && cur) { cur.opts.push(l); return; }
      cur = { q: l.replace(/^\(?\d{1,3}[.)]\s*/, ''), a: '', opts: [] };
      list.push(cur);
    });
    return res;
  }
  function toText(list) {
    return list.map(function (it) { return [it.q].concat(it.opts, [it.a]).join('\n'); }).join('\n\n');
  }
  function read(file) {
    var name = (file.name || '').toLowerCase();
    var p = /\.docx$/.test(name) ? file.arrayBuffer().then(docxLines)
      : /\.(txt|md)$/.test(name) || /^text\//.test(file.type) ? file.text().then(function (t) { return t.split(/\r?\n/); })
      : Promise.reject(new Error('type'));
    return p.then(parseLines);
  }
  window.PQT_IMPORT = { read: read, toText: toText, parseLines: parseLines };
})();
