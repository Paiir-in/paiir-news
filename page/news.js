// Paiir News: the page. Reads news.json (written every hour by fetch-news.mjs), shows the feed with topic chips, a
// "Shared with you" card for share links (?s=<id>), the share menu and the Explore Paiir cards. Everything from the
// feeds is untrusted: it goes in with textContent, and only http/https links and images are used.
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  // Lucide icons (ISC licence), outline, stroke 1.75
  var ICONS = {
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    bridge: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>'
  };
  var CATS = ['All', 'AI', 'Startups', 'Gadgets', 'Apps', 'Security', 'India'], STEP = 20;
  var EXPLORE = [
    ['link', 'Paiir Connect', 'Coming soon', 'Sell what you know from one link: 1:1 calls, live sessions, courses and paid questions. Free to start, 7% only when you sell.', '{{HOME}}#products', 'See how it works'],
    ['users', 'Find a mentor', 'Coming soon', 'Book someone who has done what you’re trying to do. Verified experts, and you pay only when you book.', '{{HOME}}#experts', 'Get notified'],
    ['bridge', 'Paiir Bridge', 'Early access', 'Where startups meet verified mentors, investors and corporates. Scout does the matching.', '{{HOME}}#bridge', 'Apply early'],
    ['rocket', 'Founder Hub', 'Free', 'Grants, government schemes, incubators and funding calls for Indian startups, all in one place.', '{{HOME}}#founder-hub', 'Browse programs']
  ];
  var $ = function (id) { return document.getElementById(id); };
  var feed = $('feed'), more = $('more'), moreBtn = $('moreBtn'), chips = $('chips'), sharedBox = $('shared'), updated = $('updated'), toastEl = $('toast');
  var S = { data: null, cat: 'All', n: STEP, list: [] };
  var BASE = new URL('./', location.href);

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function icon(n) { var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.75'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[n]; return s; }
  function safe(u) { try { var x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch (e) { return ''; } }
  function domain(d) { return String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#:]/)[0].replace(/[^a-z0-9.-]/g, ''); }
  function ago(iso) {
    var t = Date.parse(iso); if (!isFinite(t)) return '';
    var m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + 'h ago';
    var d = Math.round(h / 24); if (d < 7) return d + 'd ago';
    return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  function shareUrl(id) { return new URL('s/' + encodeURIComponent(id) + '/', BASE).href; }
  function letter(name, cls) { var p = el('span', 'ph' + (cls ? ' ' + cls : ''), (String(name || 'P').trim()[0] || 'P').toUpperCase()); p.setAttribute('aria-hidden', 'true'); return p; }
  function picture(src, name) {
    var u = safe(src); if (!u) return letter(name);
    var img = el('img'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.src = u;
    img.addEventListener('error', function () { img.replaceWith(letter(name)); });
    return img;
  }
  function srcRow(s) {
    var row = el('div', 'src'), d = domain(s.domain);
    if (d) { var f = el('img', 'fav'); f.alt = ''; f.width = 20; f.height = 20; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer'; f.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(d) + '&sz=64'; f.addEventListener('error', function () { f.replaceWith(letter(s.source, 'fav')); }); row.appendChild(f); }
    else row.appendChild(letter(s.source, 'fav'));
    row.appendChild(el('b', '', s.source));
    var t = el('time', '', ago(s.published)); t.dateTime = s.published || ''; row.appendChild(el('span', '', '·')); row.appendChild(t);
    return row;
  }
  function card(s, lead) {
    var art = el('article', 'st' + (lead ? ' lead' : '')), a = el('a', 'st-a');
    a.href = safe(s.link) || '#'; a.target = '_blank'; a.rel = 'noopener noreferrer';
    var im = el('div', 'st-img'); im.appendChild(picture(s.image, s.source)); a.appendChild(im);
    var b = el('div', 'st-b'); b.appendChild(srcRow(s)); b.appendChild(el('h3', 'st-t', s.title)); if (s.snippet) b.appendChild(el('p', 'st-p', s.snippet)); a.appendChild(b);
    art.appendChild(a);
    var sh = el('button', 'share'); sh.type = 'button'; sh.setAttribute('aria-label', 'Share: ' + s.title); sh.setAttribute('aria-haspopup', 'menu'); sh.setAttribute('aria-expanded', 'false'); sh.appendChild(icon('share'));
    sh.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); share(s, sh); });
    art.appendChild(sh);
    return art;
  }
  function skeleton() {
    feed.textContent = ''; feed.setAttribute('aria-busy', 'true');
    var g = el('div', 'grid');
    for (var i = 0; i < 6; i++) {
      var art = el('article', 'st skel' + (i ? '' : ' lead')), a = el('div', 'st-a'), im = el('div', 'st-img'); im.appendChild(el('div', 'sk')); a.appendChild(im);
      var b = el('div', 'st-b'); [['40%', 14], ['92%', 20], ['70%', 20], ['84%', 14]].forEach(function (w) { var l = el('div', 'sk'); l.style.width = w[0]; l.style.height = w[1] + 'px'; b.appendChild(l); });
      a.appendChild(b); art.appendChild(a); g.appendChild(art);
    }
    feed.appendChild(g);
  }
  function stateBox(title, text, btnLabel, onClick) {
    var box = el('div', 'state'); box.appendChild(el('b', '', title)); if (text) box.appendChild(el('p', '', text));
    if (btnLabel) { var b = el('button', 'btn btn-sec', btnLabel); b.type = 'button'; b.insertBefore(icon('refresh'), b.firstChild); b.addEventListener('click', onClick); box.appendChild(b); }
    return box;
  }

  // Explore Paiir: after the first 20 stories, and again at the end of the page
  function exploreBody(headTag, id) {
    var f = document.createDocumentFragment(), h = el(headTag, 'ex-h', 'Explore Paiir.'); if (id) h.id = id; f.appendChild(h);
    var p = el('p', 'ex-p', 'Sell what you know.'); p.appendChild(el('span', 'blue', ' Find who you need.')); f.appendChild(p);
    var g = el('div', 'ex-grid');
    EXPLORE.forEach(function (x) {
      var c = el('div', 'ex-c'), ic = el('span', 'ex-ic'); ic.appendChild(icon(x[0])); c.appendChild(ic);
      var chip = el('span', 'ex-chip'); chip.appendChild(el('i')); chip.appendChild(document.createTextNode(x[2])); c.appendChild(chip);
      c.appendChild(el('b', '', x[1])); c.appendChild(el('p', '', x[3]));
      var a = el('a', 'ex-go', x[5]); a.href = x[4]; a.appendChild(icon('arrow')); c.appendChild(a);
      g.appendChild(c);
    });
    f.appendChild(g); return f;
  }
  function exploreInline() { var d = el('div', 'explore-in'); d.appendChild(exploreBody('h2')); return d; }
  (function () { var w = el('div', 'nw'); w.appendChild(exploreBody('h2', 'exploreH')); $('explore').appendChild(w); })();

  // the feed
  function filtered() { var c = S.cat, all = (S.data && S.data.stories) || []; return c === 'All' ? all : all.filter(function (s) { return s.category === c || (s.tags || []).indexOf(c) > -1; }); }
  function render() {
    S.list = filtered(); feed.textContent = ''; feed.setAttribute('aria-busy', 'false');
    if (!S.list.length) { feed.appendChild(stateBox('No ' + S.cat + ' stories right now', 'New stories arrive every hour. Have a look at everything else meanwhile.', 'Show all stories', function () { pick('All'); })); more.hidden = true; return; }
    var g = el('div', 'grid'); g.id = 'g1'; feed.appendChild(g);
    S.list.slice(0, Math.min(S.n, STEP)).forEach(function (s, i) { g.appendChild(card(s, i === 0)); });
    if (S.n > STEP) append(STEP, S.n);
    more.hidden = S.n >= S.list.length;
  }
  function append(from, to) {
    var g2 = $('g2');
    if (!g2) { feed.appendChild(exploreInline()); g2 = el('div', 'grid'); g2.id = 'g2'; feed.appendChild(g2); }
    S.list.slice(from, to).forEach(function (s) { g2.appendChild(card(s, false)); });
  }
  function loadMore() { if (!S.list.length || S.n >= S.list.length) return; var from = S.n; S.n += STEP; append(from, S.n); more.hidden = S.n >= S.list.length; }
  moreBtn.addEventListener('click', loadMore);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting && S.data) loadMore(); }, { rootMargin: '400px 0px' }).observe(more);

  function pick(c) {
    S.cat = c; S.n = STEP;
    Array.prototype.forEach.call(chips.children, function (b) { b.setAttribute('aria-pressed', b.dataset.c === c ? 'true' : 'false'); });
    render();
    var top = feed.getBoundingClientRect().top - (chips.getBoundingClientRect().bottom + 12);
    if (top < 0) window.scrollBy(0, top);
  }
  CATS.forEach(function (c, i) { var b = el('button', 'chip', c); b.type = 'button'; b.dataset.c = c; b.setAttribute('aria-pressed', i ? 'false' : 'true'); b.addEventListener('click', function () { pick(c); }); chips.appendChild(b); });

  // "Shared with you": the story behind a share link, then a short way into the rest of Paiir
  function showShared() {
    var id = new URLSearchParams(location.search).get('s'); if (!id) return;
    sharedBox.textContent = '';
    var s = (S.data.stories || []).filter(function (x) { return x.id === id; })[0];
    if (!s) { sharedBox.appendChild(el('p', 'gone', 'This story is no longer in the feed. Here’s what’s new.')); }
    else {
      var box = el('article', 'shared'), im = el('div', 'shared-img'); im.appendChild(picture(s.image, s.source)); box.appendChild(im);
      var b = el('div', 'shared-b'), k = el('span', 'shared-k'); k.appendChild(el('i')); k.appendChild(document.createTextNode('Shared with you')); b.appendChild(k);
      b.appendChild(srcRow(s)); b.appendChild(el('h2', 'shared-t', s.title)); if (s.snippet) b.appendChild(el('p', 'shared-p', s.snippet));
      var acts = el('div', 'shared-acts'), read = el('a', 'btn btn-pri', 'Read on ' + s.source); read.href = safe(s.link) || '#'; read.target = '_blank'; read.rel = 'noopener noreferrer'; read.appendChild(icon('ext')); acts.appendChild(read);
      var sb = el('button', 'btn btn-sec', 'Share'); sb.type = 'button'; sb.setAttribute('aria-haspopup', 'menu'); sb.setAttribute('aria-expanded', 'false'); sb.insertBefore(icon('share'), sb.firstChild); sb.addEventListener('click', function () { share(s, sb); }); acts.appendChild(sb);
      b.appendChild(acts); box.appendChild(b); sharedBox.appendChild(box);
    }
    var strip = el('a', 'new-strip'); strip.href = '#explore';
    var mk = el('img'); mk.src = 'brand/paiir-mark.svg'; mk.alt = ''; strip.appendChild(mk);
    var t = el('span'); t.appendChild(el('b', '', 'New to Paiir? ')); t.appendChild(document.createTextNode('Sell what you know. Find who you need.')); strip.appendChild(t); strip.appendChild(icon('arrow'));
    sharedBox.appendChild(strip);
  }

  // sharing: the phone's own share sheet, or a small menu (WhatsApp, LinkedIn, X, copy link)
  var menu = null;
  function closeMenu(focusBack) { if (!menu) return; var b = menu._btn; menu.remove(); menu = null; document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', keys, true); if (b) { b.setAttribute('aria-expanded', 'false'); if (focusBack) b.focus(); } }
  function outside(e) { if (menu && !menu.contains(e.target) && e.target !== menu._btn && !menu._btn.contains(e.target)) closeMenu(false); }
  function keys(e) {
    if (!menu) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var it = Array.prototype.slice.call(menu.querySelectorAll('a,button')), i = it.indexOf(document.activeElement); it[(i + (e.key === 'ArrowDown' ? 1 : -1) + it.length) % it.length].focus(); }
  }
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { toastEl.classList.remove('on'); }, 2200); }
  function copy(u) {
    var done = function () { toast('Link copied'); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(u).then(done, function () { legacy(); });
    legacy();
    function legacy() { var ta = el('textarea'); ta.value = u; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed. The link is ' + u); } ta.remove(); }
  }
  function share(s, btn) {
    var url = shareUrl(s.id);
    if (navigator.share && window.matchMedia && matchMedia('(pointer: coarse)').matches) { navigator.share({ title: s.title, text: s.title, url: url }).catch(function () {}); return; }
    if (menu && menu._btn === btn) return closeMenu(true);
    closeMenu(false);
    menu = el('div', 'menu'); menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Share this story'); menu._btn = btn;
    var e = encodeURIComponent;
    [['chat', 'WhatsApp', 'https://wa.me/?text=' + e(s.title + ' ' + url)], ['linkedin', 'LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + e(url)], ['send', 'X', 'https://x.com/intent/post?text=' + e(s.title) + '&url=' + e(url)]].forEach(function (x) {
      var a = el('a', '', x[1]); a.href = x[2]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('role', 'menuitem'); a.insertBefore(icon(x[0]), a.firstChild); a.addEventListener('click', function () { closeMenu(false); }); menu.appendChild(a);
    });
    var c = el('button', '', 'Copy link'); c.type = 'button'; c.setAttribute('role', 'menuitem'); c.insertBefore(icon('copy'), c.firstChild); c.addEventListener('click', function () { copy(url); closeMenu(true); }); menu.appendChild(c);
    document.body.appendChild(menu);
    var r = btn.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.max(12, Math.min(r.right - mw, innerWidth - mw - 12)) + 'px';
    menu.style.top = Math.max(12, Math.min(innerHeight - mh - 12, r.bottom + 8 + mh > innerHeight - 12 ? r.top - mh - 8 : r.bottom + 8)) + 'px';
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', keys, true);
    menu.querySelector('a,button').focus();
  }
  window.addEventListener('scroll', function () { if (menu) closeMenu(false); }, { passive: true });

  // load
  function tick() { if (S.data) updated.textContent = 'Updated ' + ago(S.data.updated); }
  function load() {
    skeleton(); more.hidden = true;
    fetch('news.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      if (!d || !Array.isArray(d.stories) || !d.stories.length) throw new Error('empty');
      S.data = d; S.n = STEP; tick(); showShared(); render();
    }).catch(function () {
      feed.textContent = ''; feed.setAttribute('aria-busy', 'false'); updated.textContent = 'Couldn’t load the news';
      feed.appendChild(stateBox('The news didn’t load', 'Check your connection and try again. Every story stays linked to its publisher.', 'Try again', load));
    });
  }
  setInterval(tick, 60000);
  load();
})();
