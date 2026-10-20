// Paiir News footer: the Paiir lockup (the Wink mark, then "Paiir") drawn from small square dots that scatter away from
// the cursor or a finger and spring back home. Decorative only (aria-hidden on the canvas).
(function () {
  'use strict';
  var cv = document.getElementById('dots'); if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d'), still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G0 = [0x1E, 0x63, 0xF0], G1 = [0x4D, 0xA3, 0xFF]; // the Wink gradient, top left to bottom right of the mark
  var dots = [], strays = [], W = 0, H = 0, R = 60, ptr = { x: 0, y: 0, on: false }, raf = 0, visible = false, mark = null;

  function loadMark() {
    return new Promise(function (ok) {
      var img = new Image(); img.onload = function () { ok(img); };
      img.onerror = function () { var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="38 34 124 114"><path d="M82 46 V78" fill="none" stroke="#0A6CFF" stroke-width="24" stroke-linecap="round"/><path d="M50 110 C70 148 130 148 150 110" fill="none" stroke="#0A6CFF" stroke-width="24" stroke-linecap="round"/></svg>'; var f = new Image(); f.onload = function () { ok(f); }; f.src = 'data:image/svg+xml,' + encodeURIComponent(s); };
      img.src = 'brand/paiir-mark.svg';
    });
  }
  function build() {
    var old = dots; W = Math.round(cv.clientWidth); if (W < 10) return;
    var gap = Math.max(4, Math.round(W / 200)), font = '800 100px Figtree, system-ui, sans-serif';
    var m = document.createElement('canvas').getContext('2d'); m.font = font;
    var mt = m.measureText('Paiir'), h100 = mt.actualBoundingBoxAscent, w100 = mt.actualBoundingBoxLeft + mt.actualBoundingBoxRight;
    var ratio = 124 / 114; // the mark's own viewBox (38 34 124 114)
    var s = 0.92 * W / (h100 * ratio + 0.3 * h100 + w100), size = 100 * s, h = h100 * s, mw = h * ratio, tw = w100 * s;
    H = Math.round(h + 6 * gap); R = Math.max(60, W * 0.075);
    var x0 = (W - (mw + 0.3 * h + tw)) / 2, base = 3 * gap + h;
    // draw the lockup on a hidden canvas: the word in white, the mark tinted pure blue
    var off = document.createElement('canvas'); off.width = W; off.height = H; var o = off.getContext('2d');
    o.font = '800 ' + size + 'px Figtree, system-ui, sans-serif'; o.fillStyle = '#ffffff'; o.textBaseline = 'alphabetic';
    o.fillText('Paiir', x0 + mw + 0.3 * h + mt.actualBoundingBoxLeft * s, base);
    var mk = document.createElement('canvas'); mk.width = Math.max(1, Math.round(mw)); mk.height = Math.max(1, Math.round(h)); var k = mk.getContext('2d');
    if (mark) { k.drawImage(mark, 0, 0, mk.width, mk.height); k.globalCompositeOperation = 'source-in'; k.fillStyle = '#0000ff'; k.fillRect(0, 0, mk.width, mk.height); }
    var mx = x0, my = base - h; o.drawImage(mk, mx, my);
    var px = o.getImageData(0, 0, W, H).data, next = [];
    for (var y = Math.round(gap / 2); y < H; y += gap) for (var x = Math.round(gap / 2); x < W; x += gap) {
      var i = (y * W + x) * 4; if (px[i + 3] <= 140) continue;
      var c;
      if (px[i + 2] > 200 && px[i] < 60) { var t = Math.max(0, Math.min(1, ((x - mx) / mw + (y - my) / h) / 2)); c = 'rgb(' + Math.round(G0[0] + (G1[0] - G0[0]) * t) + ',' + Math.round(G0[1] + (G1[1] - G0[1]) * t) + ',' + Math.round(G0[2] + (G1[2] - G0[2]) * t) + ')'; }
      else c = 'rgba(255,255,255,.9)';
      var p = old[next.length];
      next.push({ hx: x, hy: y, x: p ? p.x : x, y: p ? p.y : y, vx: p ? p.vx : 0, vy: p ? p.vy : 0, c: c });
    }
    dots = next; dots.size = Math.max(1.6, gap * 0.42);
    strays = []; var n = Math.round(dots.length * 0.02);
    for (var j = 0; j < n; j++) strays.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() * 2 - 1) * 0.075, vy: (Math.random() * 2 - 1) * 0.075, a: 0.15 + Math.random() * 0.35 });
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(); if (!still) start();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H); var sz = dots.size, hs = sz / 2;
    for (var j = 0; j < strays.length; j++) { var q = strays[j]; ctx.fillStyle = 'rgba(255,255,255,' + q.a.toFixed(2) + ')'; ctx.fillRect(q.x - hs, q.y - hs, sz, sz); }
    var last = '';
    for (var i = 0; i < dots.length; i++) { var d = dots[i]; if (d.c !== last) { ctx.fillStyle = d.c; last = d.c; } ctx.fillRect(d.x - hs, d.y - hs, sz, sz); }
  }
  function step() {
    raf = 0; var moving = false;
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (ptr.on) { var dx = d.x - ptr.x, dy = d.y - ptr.y, dd = Math.sqrt(dx * dx + dy * dy); if (dd < R && dd > 0.01) { var f = Math.pow(1 - dd / R, 2) * 6; d.vx += dx / dd * f; d.vy += dy / dd * f; } }
      d.vx += (d.hx - d.x) * 0.06; d.vy += (d.hy - d.y) * 0.06; d.vx *= 0.82; d.vy *= 0.82; d.x += d.vx; d.y += d.vy;
      if (Math.abs(d.vx) > 0.01 || Math.abs(d.vy) > 0.01 || Math.abs(d.hx - d.x) > 0.1 || Math.abs(d.hy - d.y) > 0.1) moving = true;
    }
    for (var j = 0; j < strays.length; j++) { var q = strays[j]; q.x += q.vx; q.y += q.vy; if (q.x < 0) q.x += W; if (q.x > W) q.x -= W; if (q.y < 0) q.y += H; if (q.y > H) q.y -= H; }
    draw();
    if (visible && (moving || ptr.on || strays.length)) raf = requestAnimationFrame(step);
  }
  function start() { if (!raf && visible && !still) raf = requestAnimationFrame(step); }
  function at(e) { var r = cv.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; }
  if (!still) {
    cv.addEventListener('pointermove', function (e) { at(e); ptr.on = true; start(); });
    cv.addEventListener('pointerdown', function (e) { at(e); ptr.on = true; start(); });
    cv.addEventListener('pointerleave', function () { ptr.on = false; });
    cv.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') ptr.on = false; });
    cv.addEventListener('pointercancel', function () { ptr.on = false; });
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } }).observe(cv);
  else visible = true;
  var rt = 0; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (Math.round(cv.clientWidth) !== W) build(); }, 150); });
  var fontReady = document.fonts && document.fonts.load ? document.fonts.load('800 100px Figtree').then(function () { return document.fonts.ready; }) : Promise.resolve();
  Promise.all([loadMark(), fontReady.catch(function () {})]).then(function (r) { mark = r[0]; build(); });
})();
