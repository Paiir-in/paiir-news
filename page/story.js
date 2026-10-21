// Paiir News: a story's own page (s/<id>, written by fetch-news.mjs). The story is already on the page; this adds
// "2h ago", Dim light, share, and more stories from news.json (the same topic first, then the latest). Everything from
// the feeds is untrusted: it goes in with textContent, and only http/https links and images are used.
(function () {
  'use strict';
  var NEWS = '{{BASE}}/', ST = window.PAIIR_STORY || {}, NS = 'http://www.w3.org/2000/svg';
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

  // Dim light, the same switch (and the same saved choice) as the News page
  var dim = $('dimBtn'), root = document.documentElement;
  var setDim = function (on) { root.classList.toggle('dim', on); dim.setAttribute('aria-pressed', on ? 'true' : 'false'); };
  setDim(root.classList.contains('dim'));
  dim.addEventListener('click', function () { var on = !root.classList.contains('dim'); setDim(on); try { localStorage.setItem('paiir-news-dim', on ? '1' : '0'); } catch (e) {} toast(on ? 'Dim light on. Easier on your eyes' : 'Dim light off'); });

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
    var a = el('a', 'sp-it'); a.href = NEWS + 's/' + encodeURIComponent(s.id);
    var im = el('div', 'sp-it-img'), u = safe(s.image);
    if (u) { var img = el('img'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.src = u; img.addEventListener('error', function () { img.replaceWith(letter(s.source)); }); im.appendChild(img); } else im.appendChild(letter(s.source));
    a.appendChild(im);
    var src = el('div', 'src'), d = domain(s.domain);
    if (d) { var f = el('img', 'fav'); f.alt = ''; f.width = 20; f.height = 20; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer'; f.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(d) + '&sz=64'; f.addEventListener('error', function () { f.replaceWith(letter(s.source, 'fav')); }); src.appendChild(f); } else src.appendChild(letter(s.source, 'fav'));
    src.appendChild(el('b', '', s.source)); var t = ago(s.published); if (t) { src.appendChild(el('span', '', '·')); src.appendChild(el('time', '', t)); }
    a.appendChild(src); a.appendChild(el('h3', 'sp-it-t', s.title));
    return a;
  }
  if (list) fetch(NEWS + 'news.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
    var all = (d && d.stories || []).filter(function (s) { return s.id !== ST.id && s.title; });
    var near = function (s) { return ST.category && (s.category === ST.category || (s.tags || []).indexOf(ST.category) > -1); };
    // only the same topic under "More in <topic>" (6, or 3 to keep the rows even); too few, and it is the latest instead
    var same = all.filter(near), pick = same.length >= 3 ? same.slice(0, same.length >= 6 ? 6 : 3) : all.slice(0, 6);
    if (same.length < 3) { var h = $('spMoreH'); if (h) h.textContent = 'Latest on Paiir News'; }
    pick.forEach(function (s) { list.appendChild(item(s)); });
    if (!pick.length) list.parentNode.hidden = true;
  }).catch(function () { list.parentNode.querySelector('h2').textContent = 'More on Paiir News'; });
})();
