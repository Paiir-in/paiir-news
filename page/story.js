// Paiir News: a story's own page (s/<id>, written by fetch-news.mjs). The story is already on the page; this adds
// "2h ago", Dim light, share, and more stories from news.json (the same topic first, then the latest). Everything from
// the feeds is untrusted: it goes in with textContent, and only http/https links and images are used.
(function () {
  'use strict';
  // links and data on this site's own address (paiir.in and www.paiir.in both work; a fetch across them would be blocked)
  var PATH = '{{PATH}}', ST = window.PAIIR_STORY || {}, NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function safe(u) { try { var x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch (e) { return ''; } }
  function domain(d) { return String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#:]/)[0].replace(/[^a-z0-9.-]/g, ''); }
  function letter(name, cls) { var p = el('span', 'ph' + (cls ? ' ' + cls : ''), (String(name || 'P').trim()[0] || 'P').toUpperCase()); p.setAttribute('aria-hidden', 'true'); return p; }
  function ago(iso) {
    var t = Date.parse(iso); if (!isFinite(t)) return '';
    var m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + 'h ago';
    var d = Math.round(h / 24); if (d < 7) return d + 'd ago';
    return '';
  }
  var toastEl = $('toast');
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { toastEl.classList.remove('on'); }, 2000); }

  // the time: "2h ago", with the full date kept for a hover
  var tm = document.querySelector('.sp-art time'), rel = ago(ST.published);
  if (tm && rel) { tm.title = tm.textContent; tm.textContent = rel; }
  // a picture that fails to load leaves no gap; a logo that fails becomes a letter
  var fig = document.querySelector('.sp-fig img'); if (fig) fig.addEventListener('error', function () { fig.parentNode.remove(); });
  var fv = document.querySelector('.sp-art .fav'); if (fv && fv.tagName === 'IMG') fv.addEventListener('error', function () { fv.replaceWith(letter(document.querySelector('.sp-art .src b').textContent, 'fav')); });

  // the reading light, the same choice (saved the same way) as the News reader: one tap moves Light, Dim, Warm
  var LIGHTS = {
    light: ['Light', 'dim', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>', 'Bright and clear'],
    dim: ['Dim', 'warm', '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', 'Soft and dark, for the night'],
    warm: ['Warm', 'light', '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>', 'Less blue light, kind to tired eyes']
  };
  var lb = $('lightBtn'), root = document.documentElement;
  var now = function () { var k = root.getAttribute('data-light'); return LIGHTS[k] ? k : 'light'; };
  var drawLight = function () { var L = LIGHTS[now()]; lb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + L[2] + '</svg><span>' + L[0] + '</span>'; lb.setAttribute('aria-label', 'Reading light: ' + L[0] + '. Switch to ' + LIGHTS[L[1]][0]); };
  if (lb) {
    drawLight();
    lb.addEventListener('click', function () {
      var k = LIGHTS[now()][1]; root.setAttribute('data-light', k); drawLight();
      try { localStorage.setItem('paiir-news-light', k); } catch (e) {}
      var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = { light: '#F3F4F6', dim: '#0E1014', warm: '#F0E7D8' }[k];
      toast(LIGHTS[k][0] + ' light. ' + LIGHTS[k][3]);
    });
  }

  // share: the phone's own share sheet, or the link copied
  var url = location.href.split('#')[0].split('?')[0];
  function copy() {
    var done = function () { toast('Link copied'); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(url).then(done, legacy);
    legacy();
    function legacy() { var ta = el('textarea'); ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy this link: ' + url); } ta.remove(); }
  }
  var sh = document.querySelector('[data-share]');
  if (sh) sh.addEventListener('click', function () { if (navigator.share) navigator.share({ title: ST.title, text: ST.title, url: url }).catch(function () {}); else copy(); });

  // more stories: the same topic first, then the newest
  var list = $('spMore');
  function item(s) {
    var a = el('a', 'sp-it'); a.href = PATH + 's/' + encodeURIComponent(s.id);
    var im = el('div', 'sp-it-img'), u = safe(s.image);
    if (u) { var img = el('img'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.src = u; img.addEventListener('error', function () { img.replaceWith(letter(s.source)); }); im.appendChild(img); } else im.appendChild(letter(s.source));
    a.appendChild(im);
    var src = el('div', 'src'), d = domain(s.domain);
    if (d) { var f = el('img', 'fav'); f.alt = ''; f.width = 20; f.height = 20; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer'; f.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(d) + '&sz=64'; f.addEventListener('error', function () { f.replaceWith(letter(s.source, 'fav')); }); src.appendChild(f); } else src.appendChild(letter(s.source, 'fav'));
    src.appendChild(el('b', '', s.source)); var t = ago(s.published); if (t) { src.appendChild(el('span', '', '·')); src.appendChild(el('time', '', t)); }
    a.appendChild(src); a.appendChild(el('h3', 'sp-it-t', s.title));
    return a;
  }
  if (list) fetch(PATH + 'news.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
    var all = (d && d.stories || []).filter(function (s) { return s.id !== ST.id && s.title; });
    var near = function (s) { return ST.category && (s.category === ST.category || (s.tags || []).indexOf(ST.category) > -1); };
    // only the same topic under "More in <topic>" (6, or 3 to keep the rows even); too few, and it is the latest instead
    var same = all.filter(near), pick = same.length >= 3 ? same.slice(0, same.length >= 6 ? 6 : 3) : all.slice(0, 6);
    if (same.length < 3) { var h = $('spMoreH'); if (h) h.textContent = 'Latest on Paiir News'; }
    pick.forEach(function (s) { list.appendChild(item(s)); });
    if (!pick.length) list.parentNode.hidden = true;
  }).catch(function () { list.parentNode.querySelector('h2').textContent = 'More on Paiir News'; });
})();
