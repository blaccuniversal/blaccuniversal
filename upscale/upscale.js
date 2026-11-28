(function(){
"use strict";

var root = document.querySelector('[data-root]');
if (!root) return;

var dropEl = root.querySelector('[data-drop]');
var fileEl = root.querySelector('[data-file]');
var dropTextEl = root.querySelector('[data-drop-text]');
var workEl = root.querySelector('[data-work]');
var previewEl = root.querySelector('[data-preview]');
var srcNameEl = root.querySelector('[data-src-name]');
var srcDimEl = root.querySelector('[data-src-dim]');
var changeBtn = root.querySelector('[data-change]');
var chipsEl = root.querySelector('[data-scale-chips]');
var widthEl = root.querySelector('[data-width]');
var sharpEl = root.querySelector('[data-sharp]');
var sharpValEl = root.querySelector('[data-sharp-val]');
var outEl = root.querySelector('[data-out]');
var warnEl = root.querySelector('[data-warn]');
var goBtn = root.querySelector('[data-go]');
var progEl = root.querySelector('[data-prog]');
var progFillEl = root.querySelector('[data-prog-fill]');
var progTextEl = root.querySelector('[data-prog-text]');
var cancelBtn = root.querySelector('[data-cancel]');

/* ---------- capability / limits ---------- */

var canStream = (typeof window.showSaveFilePicker === 'function');
// Safe to build as one single in-memory canvas on any browser (RGBA bytes).
var SAFE_PIXELS = 16000000; // ~16MP -> 64MB RGBA buffer
// Hard dimension ceiling. 30,000px needs streaming (Chrome/Edge etc.); without it we cap lower.
var MAX_DIM = canStream ? 30000 : 6000;

/* ---------- state ---------- */

var state = {
  bitmap: null,
  srcW: 0,
  srcH: 0,
  fileBaseName: 'image',
  targetW: 0,
  targetH: 0,
  busy: false,
  cancelled: false
};

/* ---------- small helpers ---------- */

function fmtInt(n){ return Math.round(n).toLocaleString('en-US'); }
function fmtMP(px){ return (px/1000000).toFixed(px >= 10000000 ? 0 : 1); }
function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

function setWarn(msg, isErr){
  if (!msg){ warnEl.hidden = true; warnEl.textContent=''; warnEl.classList.remove('err'); return; }
  warnEl.hidden = false;
  warnEl.textContent = msg;
  warnEl.classList.toggle('err', !!isErr);
}

function updateOut(){
  if (!state.srcW) return;
  var w = clamp(parseInt(widthEl.value,10) || 0, 1, MAX_DIM);
  var h = Math.max(1, Math.round(w * (state.srcH/state.srcW)));
  if (h > MAX_DIM){ h = MAX_DIM; w = Math.max(1, Math.round(h * (state.srcW/state.srcH))); }
  state.targetW = w; state.targetH = h;
  widthEl.value = w;
  var mult = w/state.srcW;
  outEl.innerHTML = 'Output: <b>' + fmtInt(w) + ' &times; ' + fmtInt(h) + '</b> px &middot; ' + mult.toFixed(mult<10?1:0) + '&times; &middot; ' + fmtMP(w*h) + ' MP';

  chipsEl.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('is-on'); });
  var exactChip = chipsEl.querySelector('.chip[data-scale="'+ Math.round(mult) +'"]');
  if (exactChip && Math.abs(mult-Math.round(mult))<0.01) exactChip.classList.add('is-on');

  if (!canStream && w*h > SAFE_PIXELS){
    setWarn('Your browser can only export up to about ' + fmtInt(Math.round(Math.sqrt(SAFE_PIXELS))) + 'px on the long edge without crashing the tab. For the full ' + fmtInt(MAX_DIM === 6000 ? 30000 : MAX_DIM) + 'px range, use Chrome, Edge or another Chromium-based browser — it can stream the file straight to disk instead of holding it all in memory.');
  } else if (w*h > SAFE_PIXELS){
    setWarn('This is a big export (' + fmtMP(w*h) + ' megapixels). You’ll be asked where to save the file — it streams straight to disk as it’s generated, so it won’t crash the tab, but it can take a while.');
  } else {
    setWarn(null);
  }
}

/* ---------- loading an image ---------- */

function loadFile(file){
  if (!file || !/^image\//.test(file.type)){ setWarn('That doesn’t look like an image file.', true); return; }
  createImageBitmap(file).then(function(bmp){
    state.bitmap = bmp;
    state.srcW = bmp.width;
    state.srcH = bmp.height;
    state.fileBaseName = (file.name || 'image').replace(/\.[^.]+$/, '');
    previewEl.src = URL.createObjectURL(file);
    srcNameEl.textContent = file.name || 'image';
    srcDimEl.textContent = fmtInt(bmp.width) + ' × ' + fmtInt(bmp.height);
    workEl.hidden = false;
    dropTextEl.textContent = 'Drop another image, or click to choose one';
    widthEl.value = Math.min(bmp.width*2, MAX_DIM);
    setWarn(null);
    updateOut();
  }).catch(function(err){
    setWarn('Couldn’t read that image: ' + (err && err.message ? err.message : err), true);
  });
}

dropEl.addEventListener('click', function(){ fileEl.click(); });
dropEl.addEventListener('keydown', function(e){ if (e.key==='Enter' || e.key===' '){ e.preventDefault(); fileEl.click(); } });
changeBtn.addEventListener('click', function(e){ e.preventDefault(); fileEl.click(); });
fileEl.addEventListener('change', function(){ if (fileEl.files && fileEl.files[0]) loadFile(fileEl.files[0]); });

['dragenter','dragover'].forEach(function(ev){
  dropEl.addEventListener(ev, function(e){ e.preventDefault(); dropEl.classList.add('is-over'); });
});
['dragleave','drop'].forEach(function(ev){
  dropEl.addEventListener(ev, function(e){ e.preventDefault(); dropEl.classList.remove('is-over'); });
});
dropEl.addEventListener('drop', function(e){
  var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) loadFile(f);
});

chipsEl.addEventListener('click', function(e){
  var btn = e.target.closest('.chip');
  if (!btn || !state.srcW) return;
  if (btn.dataset.scale === 'max'){ widthEl.value = MAX_DIM; }
  else { widthEl.value = Math.round(state.srcW * parseFloat(btn.dataset.scale)); }
  updateOut();
});
widthEl.addEventListener('input', updateOut);

sharpEl.addEventListener('input', function(){ sharpValEl.textContent = sharpEl.value + '%'; });

/* ================================================================
   PNG encoding (used for the streamed, tiled path)
   ================================================================ */

var CRC_TABLE = (function(){
  var t = new Uint32Array(256);
  for (var n=0;n<256;n++){
    var c = n;
    for (var k=0;k<8;k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes){
  var c = 0xFFFFFFFF;
  for (var i=0;i<bytes.length;i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function u32(n){ return new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]); }
function concatU8(parts){
  var len = 0; for (var i=0;i<parts.length;i++) len += parts[i].length;
  var out = new Uint8Array(len); var o = 0;
  for (var j=0;j<parts.length;j++){ out.set(parts[j], o); o += parts[j].length; }
  return out;
}
function pngChunk(type, data){
  var typeBytes = new Uint8Array(type.length);
  for (var i=0;i<type.length;i++) typeBytes[i] = type.charCodeAt(i);
  var body = concatU8([typeBytes, data]);
  var crc = crc32(body);
  return concatU8([u32(data.length), body, u32(crc)]);
}
var PNG_SIG = new Uint8Array([137,80,78,71,13,10,26,10]);

function ihdrChunk(w,h){
  var d = new Uint8Array(13);
  d.set(u32(w),0); d.set(u32(h),4);
  d[8]=8; d[9]=6; d[10]=0; d[11]=0; d[12]=0; // 8-bit, RGBA, deflate, filter0, no interlace
  return pngChunk('IHDR', d);
}

/* ---------- sharpening: separable 3-tap unsharp mask, RGB only ---------- */

function sharpenRGBA(data, w, h, amount){
  if (amount <= 0) return data;
  var n = w*h;
  // horizontal box blur (3-tap) into tmp, per channel 0..2
  var tmp = new Float32Array(n*3);
  for (var y=0;y<h;y++){
    var rowOff = y*w;
    for (var x=0;x<w;x++){
      var xl = x>0?x-1:0, xr = x<w-1?x+1:w-1;
      var il=(rowOff+xl)*4, ic=(rowOff+x)*4, ir=(rowOff+xr)*4, ti=(rowOff+x)*3;
      tmp[ti]   = (data[il]+data[ic]+data[ir]) / 3;
      tmp[ti+1] = (data[il+1]+data[ic+1]+data[ir+1]) / 3;
      tmp[ti+2] = (data[il+2]+data[ic+2]+data[ir+2]) / 3;
    }
  }
  // vertical box blur (3-tap) from tmp -> blurred, then unsharp combine into data
  for (var yy=0; yy<h; yy++){
    var yu = yy>0?yy-1:0, yd = yy<h-1?yy+1:h-1;
    var rowU=yu*w, rowC=yy*w, rowD=yd*w, rowOut=yy*w;
    for (var xx=0; xx<w; xx++){
      var tu=(rowU+xx)*3, tc=(rowC+xx)*3, td=(rowD+xx)*3, di=(rowOut+xx)*4;
      for (var ch=0; ch<3; ch++){
        var blurred = (tmp[tu+ch]+tmp[tc+ch]+tmp[td+ch]) / 3;
        var orig = data[di+ch];
        var v = orig + amount*(orig - blurred);
        data[di+ch] = v<0?0:(v>255?255:v);
      }
    }
  }
  return data;
}

/* ================================================================
   Simple path: everything fits comfortably in one canvas
   ================================================================ */

function upscaleSimple(bitmap, targetW, targetH, sharpAmt, onProgress){
  return new Promise(function(resolve, reject){
    try{
      var canvas = document.createElement('canvas');
      canvas.width = targetW; canvas.height = targetH;
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      onProgress(0.5, 'Sharpening…');
      if (sharpAmt > 0){
        var imgData = ctx.getImageData(0,0,targetW,targetH);
        sharpenRGBA(imgData.data, targetW, targetH, sharpAmt);
        ctx.putImageData(imgData, 0, 0);
      }
      onProgress(0.85, 'Encoding PNG…');
      canvas.toBlob(function(blob){
        if (!blob){ reject(new Error('Could not encode the image.')); return; }
        onProgress(1, 'Done');
        resolve(blob);
      }, 'image/png');
    } catch(err){ reject(err); }
  });
}

/* ================================================================
   Streamed, tiled path: for huge outputs, writes a PNG straight to
   disk via the File System Access API so the full image is never
   held in memory at once.
   ================================================================ */

function upscaleStreamed(bitmap, srcW, srcH, targetW, targetH, sharpAmt, writable, onProgress, isCancelled){
  return new Promise(function(resolve, reject){
    (async function(){
      try{
        await writable.write(PNG_SIG);
        await writable.write(ihdrChunk(targetW, targetH));

        var cs = new CompressionStream('deflate');
        var writer = cs.writable.getWriter();
        var reader = cs.readable.getReader();

        var pumpDone = (async function pump(){
          while(true){
            var r = await reader.read();
            if (r.done) break;
            if (r.value && r.value.length) await writable.write(pngChunk('IDAT', r.value));
          }
        })();

        // rows of output processed per tile, kept small so each tile canvas is cheap
        var PAD = 3;
        var tileInner = Math.max(1, Math.min(256, Math.floor(6000000 / targetW)));
        var y = 0;
        while (y < targetH){
          if (isCancelled()) throw new Error('cancelled');
          var y1 = Math.min(targetH, y + tileInner);
          var padTop = Math.min(PAD, y);
          var padBot = Math.min(PAD, targetH - y1);
          var pStart = y - padTop, pEnd = y1 + padBot;
          var pRows = pEnd - pStart;

          var tileCanvas = document.createElement('canvas');
          tileCanvas.width = targetW; tileCanvas.height = pRows;
          var tctx = tileCanvas.getContext('2d');
          tctx.imageSmoothingEnabled = true;
          if ('imageSmoothingQuality' in tctx) tctx.imageSmoothingQuality = 'high';

          var sy = pStart * (srcH/targetH);
          var sh = pRows * (srcH/targetH);
          tctx.drawImage(bitmap, 0, sy, srcW, sh, 0, 0, targetW, pRows);

          var tileData = tctx.getImageData(0,0,targetW,pRows);
          if (sharpAmt > 0) sharpenRGBA(tileData.data, targetW, pRows, sharpAmt);

          var innerRows = y1 - y;
          var bytesPerRow = 1 + targetW*4;
          var out = new Uint8Array(innerRows * bytesPerRow);
          var src = tileData.data;
          for (var r=0; r<innerRows; r++){
            var srcRowStart = (padTop + r) * targetW * 4;
            var outOff = r * bytesPerRow;
            out[outOff] = 0; // filter type: none
            out.set(src.subarray(srcRowStart, srcRowStart + targetW*4), outOff+1);
          }
          await writer.write(out);

          y = y1;
          onProgress(y/targetH, 'Rendering row ' + fmtInt(y) + ' of ' + fmtInt(targetH));
          await new Promise(function(r){ setTimeout(r,0); }); // yield to UI
        }

        await writer.close();
        await pumpDone;
        await writable.write(pngChunk('IEND', new Uint8Array(0)));
        await writable.close();
        onProgress(1, 'Done');
        resolve();
      } catch(err){
        try{ await writable.close(); } catch(e2){}
        reject(err);
      }
    })();
  });
}

/* ---------- download helper (simple path) ---------- */

function downloadBlob(blob, filename){
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
}

/* ---------- run button ---------- */

var cancelled = false;

function setBusy(on){
  state.busy = on;
  goBtn.disabled = on;
  progEl.hidden = !on;
  if (!on){ progFillEl.style.width='0%'; }
}

goBtn.addEventListener('click', function(){
  if (!state.bitmap || state.busy) return;
  updateOut();
  var w = state.targetW, h = state.targetH;
  var sharpAmt = (parseInt(sharpEl.value,10)||0) / 100 * 1.2;
  cancelled = false;
  setBusy(true);
  progTextEl.textContent = 'Preparing…';

  function onProgress(p, text){
    progFillEl.style.width = Math.round(clamp(p,0,1)*100) + '%';
    if (text) progTextEl.textContent = text;
  }

  var needsStream = (w*h) > SAFE_PIXELS;

  if (!needsStream){
    upscaleSimple(state.bitmap, w, h, sharpAmt, onProgress).then(function(blob){
      downloadBlob(blob, state.fileBaseName + '-upscaled-' + w + 'x' + h + '.png');
      setBusy(false);
      progTextEl.textContent = 'Downloaded.';
    }).catch(function(err){
      setBusy(false);
      setWarn('Upscale failed: ' + (err && err.message ? err.message : err), true);
    });
    return;
  }

  if (!canStream){
    setBusy(false);
    setWarn('This output is too large for your browser to hold in memory. Use Chrome, Edge or another Chromium-based browser for exports over about ' + fmtInt(Math.round(Math.sqrt(SAFE_PIXELS))) + 'px, or pick a smaller width above.', true);
    return;
  }

  window.showSaveFilePicker({
    suggestedName: state.fileBaseName + '-upscaled-' + w + 'x' + h + '.png',
    types: [{ description: 'PNG image', accept: {'image/png': ['.png']} }]
  }).then(function(handle){
    return handle.createWritable();
  }).then(function(writable){
    return upscaleStreamed(state.bitmap, state.srcW, state.srcH, w, h, sharpAmt, writable, onProgress, function(){ return cancelled; });
  }).then(function(){
    setBusy(false);
    progTextEl.textContent = 'Saved.';
  }).catch(function(err){
    setBusy(false);
    if (err && (err.name === 'AbortError' || err.message === 'cancelled')){
      progTextEl.textContent = 'Cancelled.';
      return;
    }
    setWarn('Upscale failed: ' + (err && err.message ? err.message : err), true);
  });
});

cancelBtn.addEventListener('click', function(){ cancelled = true; });

})();
