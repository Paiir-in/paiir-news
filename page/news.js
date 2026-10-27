// Paiir News: the reader (owner, 2026-10-26: "make it a separate page ... in phone also people can use it like the
// Inshorts app, just swipe up to read news, and to know more they can swipe left or right ... filter, screen colour
// like dim, warm ... placement matters a lot ... very calm and easy to use").
// One story at a time. Swipe up (or scroll, the arrow keys, the buttons) for the next story: the one on top lifts away
// and the next waits underneath; swipe down and the one before slides back. Swipe LEFT, as in Inshorts, and the full
// story slides in from the right; swipe it back (or Back, Esc, the phone's back button) to return. Swipe RIGHT and
// Discover slides in from the left, as Inshorts opens its Discover: the topics. Both also have a button that says what
// it does: Read the full story on every card, the topic in the bar. The reading light (Light, Dim, Warm) is ONLY the
// button in the top bar (owner, 2026-10-27: "avoid making it two time"). On computers the topics sit in a rail beside
// the story, and the full story opens at the side. No counts anywhere: no story numbers, no "1 / 184", no number of
// sources (owner, 2026-10-27: "it feels very less content ... remove number").
// Stories come from news.json (fetch-news.mjs, every hour); the full story is the publisher's longer feed text from the
// story's own page (s/<id>), never the article itself, with a link to read it all at the publisher. A Paiir card after
// every 8 stories, an end card, and a one-time hint on how to read. Feed text is untrusted: it is always escaped, and
// only http/https links and pictures are used.
(function () {
  'use strict';
  var PATH = '{{PATH}}', NEWS = '{{BASE}}/', HOME = '{{HOME}}', MAIL = 'contact@paiir.in';
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname), APP = LOCAL ? 'http://localhost:3000' : 'https://app.paiir.in';
  // Lucide icons (ISC licence)
  var ICONS = {
    chev: '<path d="m6 9 6 6 6-6"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
    book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    sunset: '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    ccheck: '<path d="M21.8 10A10 10 0 1 1 17 3.34"/><path d="m9 11 3 3L22 4"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
    news: '<path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="10" y="6" rx="1"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    cal: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    brief: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    bridge: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
  };
  function ic(n, cls) { return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n] + '</svg>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safe(u) { try { var x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch (e) { return ''; } }
  function $(id) { return document.getElementById(id); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var root = document.documentElement, deck = $('deck');
  var R = { data: null, cat: '', items: [], i: 0, busy: 0, total: 0, body: {}, open: '', dragged: false, wheel: { until: 0, step: 0 } };
  var ask = new URLSearchParams(location.search), shared = ask.get('s');
  var wide = window.matchMedia ? matchMedia('(min-width: 1000px)') : { matches: true };
  var touch = window.matchMedia ? matchMedia('(pointer: coarse)') : { matches: false };

  function age(d) {
    var m = Math.max(0, Math.round((Date.now() - Date.parse(d)) / 60000)); if (!isFinite(m)) return '';
    return m < 60 ? (m < 2 ? 'Just now' : m + ' min ago') : m < 1440 ? Math.round(m / 60) + (Math.round(m / 60) === 1 ? ' hour ago' : ' hours ago') : Math.round(m / 1440) === 1 ? 'Yesterday' : Math.round(m / 1440) + ' days ago';
  }
  // pictures come resized through wsrv.nl (free, no key; it loads pictures some publishers refuse to other sites, and
  // sends a smaller one), then the publisher's own if that fails, then the card without a picture
  function pic(s, cls) {
    var u = safe(s.image); if (!u) return '';
    return '<img class="' + cls + '" src="https://wsrv.nl/?url=' + encodeURIComponent(u) + '&amp;w=1000&amp;output=webp" data-o="' + esc(u) + '" alt="" decoding="async" referrerpolicy="no-referrer">';
  }
  document.addEventListener('error', function (e) {
    var im = e.target; if (!im || im.tagName !== 'IMG' || !im.closest('.c,.full-p')) return;
    var o = im.getAttribute('data-o'); if (o) { im.removeAttribute('data-o'); im.src = o; return; }
    var c = im.closest('.c'); if (c) c.classList.add('no-img');
    var f = im.closest('.full-pic'); if (f) f.remove(); else im.remove();
  }, true);

  // ---- the reading light: Light, Dim (soft dark, for night), Warm (paper tones, less blue light)
  var LIGHTS = [['light', 'Light', 'Bright and clear, for the day', 'sun'], ['dim', 'Dim', 'Soft and dark, for the night', 'moon'], ['warm', 'Warm', 'Less blue light, kind to tired eyes', 'sunset']];
  var THEME = { light: '#F3F4F6', dim: '#0F1115', warm: '#F0E7D8' };
  function lightNow() { var l = root.getAttribute('data-light'); return THEME[l] ? l : 'light'; }
  function lightOf(k) { return LIGHTS.filter(function (x) { return x[0] === k; })[0] || LIGHTS[0]; }
  function setLight(k, say) {
    root.setAttribute('data-light', k); store('paiir-news-light', k);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = THEME[k];
    drawLight(); if (say) toast(lightOf(k)[1] + ' light. ' + lightOf(k)[2]);
  }
  function drawLight() {
    var L = lightOf(lightNow()), b = $('lightBtn');
    b.innerHTML = ic(L[3]); b.setAttribute('aria-label', 'Reading light: ' + L[1] + '. Change it');
    $$('[data-light-set]').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-light-set') === L[0] ? 'true' : 'false'); });
  }
  // the bar's light button: a small menu of the three, each with a line on what it's for
  var pop = null;
  function closePop() { if (!pop) return; pop.remove(); pop = null; $('lightBtn').setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', popOut, true); }
  function popOut(e) { if (pop && !pop.contains(e.target) && !$('lightBtn').contains(e.target)) closePop(); }
  function openPop() {
    if (pop) return closePop();
    var b = $('lightBtn'); pop = document.createElement('div'); pop.className = 'pop'; pop.setAttribute('role', 'menu'); pop.setAttribute('aria-label', 'Reading light');
    pop.innerHTML = '<p class="pop-h">Reading light</p>' + LIGHTS.map(function (L) {
      return '<button type="button" role="menuitemradio" data-light-set="' + L[0] + '"><span class="sw-c sw-' + L[0] + '">' + ic(L[3]) + '</span><span><b>' + L[1] + '</b><small>' + L[2] + '</small></span>' + ic('check', 'ck') + '</button>';
    }).join('');
    document.body.appendChild(pop);
    var r = b.getBoundingClientRect();
    pop.style.top = (r.bottom + 10) + 'px'; pop.style.left = Math.max(12, Math.min(r.right - pop.offsetWidth, innerWidth - pop.offsetWidth - 12)) + 'px';
    drawLight(); b.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(function () { if (pop) pop.classList.add('on'); });
    document.addEventListener('pointerdown', popOut, true);
    var on = pop.querySelector('[aria-pressed="true"]'); if (on) on.focus();
  }

  // ---- the panel: the topics and what Paiir News is (in Discover on phones, in the rail on computers)
  function panelHtml() {
    return '<div class="grp"><p class="grp-h">Topics <small data-upd></small></p><div class="tps" data-tps role="group" aria-label="Topics">' + topicsHtml() + '</div></div>' +
      '<div class="grp grp-ft"><p class="about">Startup and tech news from trusted sources, updated every hour. Every story links to where it came from.</p><div class="links">' +
      '<a href="' + esc(HOME) + '">' + ic('home') + 'Explore paiir.in</a>' +
      '<a href="' + esc(HOME) + '#grants">' + ic('gift') + 'Grants for startups</a>' +
      '<a href="' + esc(HOME) + '#bridge">' + ic('bridge') + 'Paiir Bridge</a>' +
      '<button type="button" data-adv>' + ic('megaphone') + 'Advertise with us</button></div></div>';
  }
  function cats() {
    var c = {}; ((R.data && R.data.stories) || []).forEach(function (s) { if (s.category && (s.summary || s.snippet)) c[s.category] = (c[s.category] || 0) + 1; });
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).map(function (k) { return [k, c[k]]; });
  }
  function topicsHtml() { // the busiest topics first, without their counts
    return [['']].concat(cats()).map(function (t) {
      return '<button type="button" class="tp" data-cat="' + esc(t[0]) + '" aria-pressed="' + (R.cat === t[0]) + '">' + (t[0] ? esc(t[0]) : 'All news') + '</button>';
    }).join('');
  }
  function drawPanels() {
    var rail = $('rail'), disc = $('discBody');
    if (rail) rail.innerHTML = panelHtml();
    if (disc) disc.innerHTML = panelHtml();
    drawLight(); drawUpdated();
    $('topicName').textContent = R.cat || 'All news';
  }
  function drawUpdated() {
    var t = R.data && R.data.updated ? 'Updated ' + age(R.data.updated).toLowerCase() : 'Every hour';
    $('upd').textContent = t; $$('[data-upd]').forEach(function (x) { x.textContent = t; });
  }
  setInterval(drawUpdated, 60000);

  // ---- the stories, and Paiir's own cards between them (no prices: the owner's fee rule)
  var PROMOS = [
    { ic: 'gift', k: 'Founder Hub', t: 'Grants that fit your startup', p: 'Government schemes, accelerators and credits, researched by Paiir and kept up to date.', b: 'Find grants', h: HOME + '#grants' },
    { ic: 'wallet', k: 'Paiir Connect', t: 'Earn from what you know', p: 'Your own page at paiir.in/yourname. Sell calls, sessions and downloads, and get paid by UPI.', b: 'Claim your free link', h: HOME + '#signup' },
    { ic: 'people', k: 'Founder Hub', t: 'Find your co-founder', p: 'Meet founders matched on skills, city and stage. Making your profile is free.', b: 'Find a co-founder', h: APP + '/cofounders' },
    { ic: 'cal', k: 'Founder Hub', t: 'Startup events across India', p: 'Summits, demo days and program deadlines, month by month.', b: 'See the events', h: HOME + '#events' },
    { ic: 'brief', k: 'Startup Jobs', t: 'Work at a startup', p: 'Open roles at startups in India, straight from their careers pages.', b: 'See startup jobs', h: HOME + '#jobs' },
    { ic: 'megaphone', k: 'Example placement', ad: 1, t: 'Your brand, here', p: 'Reach founders and builders who read Paiir News every day. Always marked as sponsored.', b: 'Advertise with us' }
  ];
  function inCat(s) { return !R.cat || s.category === R.cat || (s.tags || []).indexOf(R.cat) > -1; }
  function buildItems() {
    var list = ((R.data && R.data.stories) || []).filter(function (s) { return (s.summary || s.snippet) && s.title && inCat(s); });
    if (shared) { var x = list.filter(function (s) { return s.id === shared; })[0]; if (x) list = [x].concat(list.filter(function (s) { return s !== x; })); }
    var out = [], n = 0;
    list.forEach(function (s) { out.push({ s: s, n: ++n }); if (n % 8 === 0) out.push({ p: PROMOS[(n / 8 - 1) % PROMOS.length] }); });
    R.total = n; out.push({ end: 1 });
    return out;
  }
  function slide(it) {
    if (it.s) {
      var s = it.s, im = pic(s, 'c-img');
      return '<article class="c' + (im ? '' : ' no-img') + '" aria-label="' + esc(s.title) + '"><span class="c-pic">' + im + '<span class="c-src">' + esc(s.source) + '</span>' + (shared && s.id === shared && it.n === 1 ? '<span class="c-flag">Shared with you</span>' : '') + '</span>' +
        '<div class="c-body"><p class="c-k"><b>' + esc(s.category || 'News') + '</b><span>' + esc(age(s.published)) + '</span></p>' +
        '<h2 class="c-h"><button type="button" data-full>' + esc(s.title) + '</button></h2><p class="c-sum">' + esc(s.summary || s.snippet) + '</p></div>' +
        '<div class="c-ft"><button type="button" class="c-more" data-full>' + ic('book') + '<span>Read the full story</span><span class="sw" aria-hidden="true">' + ic('chevL') + ic('chevL') + '</span>' + ic('arrow', 'ar') + '</button>' +
        '<button type="button" class="ib" data-share aria-label="Share this story">' + ic('share') + '</button></div></article>';
    }
    if (it.p) {
      var p = it.p;
      return '<article class="c' + (p.ad ? ' is-ad' : '') + '" aria-label="' + esc(p.t) + '"><span class="c-pic c-pa" aria-hidden="true"><span class="pa-ic">' + ic(p.ic) + '</span></span>' +
        '<div class="c-body"><p class="c-k c-pk"><b>' + (p.ad ? 'Sponsored' : 'From Paiir') + '</b><span>' + esc(p.k) + '</span></p><h2 class="c-h">' + esc(p.t) + '</h2><p class="c-sum">' + esc(p.p) + '</p>' +
        (p.ad ? '<button type="button" class="go c-go" data-adv>' : '<a class="go c-go" href="' + esc(p.h) + '">') + esc(p.b) + ic('arrow') + (p.ad ? '</button>' : '</a>') + '</div></article>';
    }
    if (it.wait) return '<article class="c c-sk" aria-label="Loading the news"><span class="c-pic"></span><div class="c-body"><i></i><i></i><i></i><i></i><i></i></div></article>';
    if (it.err) return '<article class="c"><div class="c-end"><span class="end-ic">' + ic('refresh') + '</span><h2>The news didn’t load</h2><p>Please check your internet and try again. Every story stays linked to its publisher.</p><button type="button" class="go" data-retry>Try again</button></div></article>';
    var has = R.total > 0;
    return '<article class="c"><div class="c-end"><span class="end-ic">' + ic(has ? 'ccheck' : 'news') + '</span>' +
      '<h2>' + (has ? 'You’re all caught up.' : 'No stories in ' + esc(R.cat) + ' right now.') + '</h2>' +
      '<p>' + (has ? 'Fresh stories arrive every hour. Take a break and rest your eyes.' : 'New stories arrive every hour. Have a look at everything else meanwhile.') + '</p>' +
      (has ? '<button type="button" class="go" data-first><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(180deg)">' + ICONS.chev + '</svg>Back to the first story</button>' : '<button type="button" class="go" data-cat="">Show all news</button>') +
      '<div class="end-l"><a href="' + esc(HOME) + '#grants">' + ic('gift') + 'Grants</a><a href="' + esc(HOME) + '#events">' + ic('cal') + 'Events</a><a href="' + esc(HOME) + '#jobs">' + ic('brief') + 'Startup Jobs</a><a href="' + esc(HOME) + '">' + ic('home') + 'paiir.in</a></div></div></article>';
  }

  // ---- the deck keeps three slides: the one before (lifted away above), the one showing, and the next (underneath)
  function node(k) {
    var el = deck.querySelector('[data-k="' + k + '"]');
    if (!el && R.items[k]) { el = document.createElement('div'); el.className = 's ' + (k < R.i ? 'is-prev' : k > R.i ? 'is-next' : 'is-cur'); el.dataset.k = k; el.innerHTML = slide(R.items[k]); deck.appendChild(el); }
    return el;
  }
  function lay() {
    var keep = {}; [R.i - 1, R.i, R.i + 1].forEach(function (k) { if (k >= 0 && k < R.items.length) keep[k] = 1; });
    $$('.s', deck).forEach(function (el) { if (!keep[el.dataset.k]) el.remove(); });
    Object.keys(keep).forEach(function (k) {
      k = +k; var el = node(k), cur = k === R.i;
      el.className = 's ' + (k < R.i ? 'is-prev' : k > R.i ? 'is-next' : 'is-cur');
      el.style.transition = ''; el.style.transform = ''; el.style.filter = '';
      el.setAttribute('aria-hidden', cur ? 'false' : 'true'); el.inert = !cur;
      clip(el);
    });
    var it = R.items[R.i];
    $$('[data-go]').forEach(function (b) { b.disabled = +b.dataset.go < 0 ? R.i === 0 : R.i >= R.items.length - 1; });
    if (it && it.s) body(it.s); // the full story is ready before anyone asks for it
  }
  function clip(el) { var b = el.querySelector('.c-body'); if (b) b.classList.toggle('c-clip', b.scrollHeight > b.clientHeight + 2); }
  function reset() { // a new list (first load, or another topic): back to the first story
    R.items = R.data && R.data.stories ? buildItems() : [R.data && R.data.error ? { err: 1 } : { wait: 1 }];
    R.i = 0; deck.innerHTML = ''; lay();
  }
  function go(dir) {
    var j = R.i + dir;
    if (R.busy || j < 0 || j >= R.items.length) return;
    R.busy = 1; R.i = j; lay(); tipDone();
    setTimeout(function () { R.busy = 0; }, 400);
  }
  function first() { R.i = 0; deck.innerHTML = ''; lay(); }
  function pickCat(c) {
    R.cat = c || ''; shared = null; $$('[data-cat]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-cat') === R.cat ? 'true' : 'false'); });
    $('topicName').textContent = R.cat || 'All news'; reset();
  }

  // the publisher's longer feed text, from the story's own page on Paiir News (fetched once, kept for this visit)
  function body(s) {
    if (R.body[s.id]) return R.body[s.id];
    R.body[s.id] = fetch(PATH + 's/' + encodeURIComponent(s.id)).then(function (r) { return r.ok ? r.text() : ''; }).then(function (h) {
      var doc = new DOMParser().parseFromString(h, 'text/html');
      return $$('.sp-body p', doc).map(function (p) { return p.textContent.trim(); }).filter(Boolean);
    }).catch(function () { delete R.body[s.id]; return []; });
    return R.body[s.id];
  }

  // ---- the two side panels: the full story (from the right) and Discover (from the left). Each one adds a step to
  // the browser's history, so the phone's back button closes it.
  var OV = { full: { el: $('full'), p: $('fullP'), from: 1 }, disc: { el: $('disc'), p: document.querySelector('.disc-p'), from: -1 } };
  function onNow() { return OV.full.el.classList.contains('open') ? 'full' : OV.disc.el.classList.contains('open') ? 'disc' : ''; }
  function fillFull(s) {
    R.open = s.id; var im = pic(s, '');
    OV.full.p.innerHTML = '<div class="full-top"><button type="button" class="back" data-close>' + ic('chev') + 'Back</button><span class="full-src">' + esc(s.source) + '</span>' +
      '<button type="button" class="ib" data-share aria-label="Share this story">' + ic('share') + '</button></div>' +
      '<div class="full-sc">' + (im ? '<span class="full-pic">' + im + '</span>' : '') +
      '<div class="full-in"><p class="c-k"><b>' + esc(s.category || 'News') + '</b><span>' + esc(s.source) + ' · ' + esc(age(s.published)) + '</span></p>' +
      '<h2 class="full-t" id="fullT">' + esc(s.title) + '</h2><div class="full-body" id="fullB"><i></i><i></i><i></i><i></i></div>' +
      (safe(s.link) ? '<a class="go full-go" href="' + esc(safe(s.link)) + '" target="_blank" rel="noopener noreferrer">Read it all at ' + esc(s.source) + ic('ext') + '</a>' : '') +
      '<p class="full-note">From ' + esc(s.source) + '’s own feed. The full story and its pictures belong to ' + esc(s.source) + '.</p>' +
      '<button type="button" class="go go-2 full-next" data-next>Next story' + ic('chev') + '</button></div></div>';
    body(s).then(function (ps) { var b = $('fullB'); if (b && R.open === s.id) b.innerHTML = (ps.length ? ps : [s.summary || s.snippet]).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''); });
  }
  function prep(name) {
    var it = R.items[R.i];
    if (name === 'full') { if (!it || !it.s) return false; if (R.open !== it.s.id || !$('fullT')) fillFull(it.s); }
    return true;
  }
  function open(name, dragged) {
    closePop(); var o = OV[name], other = onNow(); if (other && other !== name) return;
    if (!prep(name)) return;
    o.el.hidden = false; root.classList.add('ov-on');
    if (!dragged) { o.p.style.transition = 'none'; o.p.style.transform = ''; void o.p.offsetWidth; }
    o.p.style.transition = ''; o.p.style.transform = ''; o.el.classList.add('open');
    var cur = node(R.i); if (cur && !wide.matches) { cur.style.transition = ''; cur.style.transform = 'translateX(' + (-o.from * 16) + '%)'; cur.style.filter = 'brightness(.85)'; }
    if (!(history.state && history.state.ov)) history.pushState({ ov: name }, '');
    tipDone();
    // keys: focus Back (with its ring); a touch or a click: focus the panel itself, so no ring appears on Back
    var f = R.kb ? o.p.querySelector('[data-close]') : o.p; if (!R.kb) o.p.tabIndex = -1; if (f) f.focus({ preventScroll: true });
  }
  function close(viaBack) {
    var name = onNow(); if (!name) return;
    if (!viaBack && history.state && history.state.ov) { history.back(); return; } // popstate (below) closes it
    var o = OV[name]; o.p.style.transition = ''; o.p.style.transform = ''; o.el.classList.remove('open');
    var cur = node(R.i); if (cur) { cur.style.transition = ''; cur.style.transform = ''; cur.style.filter = ''; }
    setTimeout(function () { if (!o.el.classList.contains('open')) { o.el.hidden = true; if (!onNow()) root.classList.remove('ov-on'); } }, 420);
    deck.focus({ preventScroll: true });
  }
  window.addEventListener('popstate', function () { if (onNow()) close(true); });

  // ---- swipes (touch and pen; a mouse uses the wheel, the keys and the buttons). On the deck: up and down move between
  // stories, left pulls the full story in, right pulls Discover in. On a panel: a swipe back the way it came closes it.
  function swipes(el, panel) {
    var g = null;
    el.addEventListener('pointerdown', function (e) {
      R.dragged = false;
      if (e.pointerType === 'mouse' || e.button > 0 || (!panel && R.busy)) return;
      g = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), ax: '' };
    });
    el.addEventListener('pointermove', function (e) {
      if (!g || e.pointerId !== g.id) return;
      var dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (!g.ax) {
        if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;
        g.ax = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'x' : 'y';
        if (panel && g.ax === 'y') { g = null; return; } // a panel scrolls by itself
        if (!panel && g.ax === 'x' && dx < 0 && !(R.items[R.i] && R.items[R.i].s)) { g = null; return; } // Paiir cards have no full story
        R.dragged = true; try { el.setPointerCapture(g.id); } catch (x) {}
        g.to = panel || (g.ax === 'y' ? 'y' : dx < 0 ? 'full' : 'disc');
        if (!panel && g.to !== 'y') { prep(g.to); OV[g.to].el.hidden = false; OV[g.to].el.classList.add('drag'); }
      }
      g.dx = dx; g.dy = dy;
      if (panel) pullBack(panel, dx); else if (g.to === 'y') pullY(dy); else pullIn(g.to, dx);
    });
    var end = function (e) {
      if (!g || e.pointerId !== g.id) return;
      var gg = g; g = null; if (!gg.ax) return;
      var dt = Math.max(1, performance.now() - gg.t), cancel = e.type === 'pointercancel';
      if (panel) return dropBack(panel, gg.dx || 0, (gg.dx || 0) / dt, cancel);
      if (gg.to === 'y') dropY(gg.dy || 0, (gg.dy || 0) / dt, cancel); else dropIn(gg.to, gg.dx || 0, (gg.dx || 0) / dt, cancel);
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  function pullY(dy) {
    var H = deck.clientHeight, cur = node(R.i), nx = R.items[R.i + 1] && node(R.i + 1), pv = R.i > 0 && node(R.i - 1);
    [cur, nx, pv].forEach(function (el) { if (el) el.style.transition = 'none'; });
    if (dy < 0) {
      if (!nx) { cur.style.transform = 'translateY(' + dy * 0.25 + 'px)'; return; }
      var q = Math.min(1, -dy / H);
      cur.style.transform = 'translateY(' + dy + 'px)';
      nx.style.transform = 'scale(' + (0.94 + 0.06 * q) + ')'; nx.style.filter = 'brightness(' + (0.94 + 0.06 * q) + ')';
      if (pv) pv.style.transform = '';
    } else {
      if (!pv) { cur.style.transform = 'translateY(' + dy * 0.25 + 'px)'; return; }
      var r = Math.min(1, dy / H);
      pv.style.transform = 'translateY(' + (dy - H * 1.06) + 'px)';
      cur.style.transform = 'scale(' + (1 - 0.06 * r) + ')'; cur.style.filter = 'brightness(' + (1 - 0.06 * r) + ')';
      if (nx) nx.style.transform = '';
    }
  }
  function dropY(dy, v, cancel) {
    var H = deck.clientHeight, far = Math.abs(dy) > H * 0.16 || Math.abs(v) > 0.45;
    if (!cancel && far && dy < 0 && R.i < R.items.length - 1) return go(1);
    if (!cancel && far && dy > 0 && R.i > 0) return go(-1);
    lay(); // back where it was
  }
  function pullIn(name, dx) {
    var o = OV[name], cur = node(R.i), d = o.from > 0 ? Math.min(0, dx) : Math.max(0, dx);
    o.p.style.transition = 'none'; o.p.style.transform = 'translateX(calc(' + (o.from > 0 ? '100%' : '-104%') + ' + ' + d + 'px))';
    if (cur) { cur.style.transition = 'none'; cur.style.transform = 'translateX(' + d * 0.16 + 'px)'; }
  }
  function dropIn(name, dx, v, cancel) {
    var o = OV[name], W = deck.clientWidth, d = o.from > 0 ? -dx : dx;
    if (!cancel && (d > W * 0.22 || (d > 30 && Math.abs(v) > 0.4))) { o.el.classList.remove('drag'); return open(name, true); }
    var cur = node(R.i);
    o.p.style.transition = ''; o.p.style.transform = 'translateX(' + (o.from > 0 ? '100%' : '-104%') + ')';
    if (cur) { cur.style.transition = ''; cur.style.transform = ''; }
    setTimeout(function () { if (!o.el.classList.contains('open')) { o.el.classList.remove('drag'); o.el.hidden = true; o.p.style.transform = ''; } }, 420);
  }
  function pullBack(name, dx) { // only toward the side it came from
    var o = OV[name], d = o.from > 0 ? Math.max(0, dx) : Math.min(0, dx);
    o.p.style.transition = 'none'; o.p.style.transform = 'translateX(' + d + 'px)';
  }
  function dropBack(name, dx, v, cancel) {
    var o = OV[name], W = o.p.offsetWidth, d = o.from > 0 ? dx : -dx;
    if (!cancel && (d > W * 0.22 || (d > 30 && Math.abs(v) > 0.4))) return close();
    o.p.style.transition = ''; o.p.style.transform = '';
  }

  // ---- the first visit: how to read, once
  function tip() {
    if (store('paiir-news-tip') || $('tip')) return;
    var st = deck.querySelector('.s.is-cur .c-pic'); if (!st || !R.total || deck.querySelector('.s.is-cur .no-img')) return;
    var t = document.createElement('div'); t.className = 'tip'; t.id = 'tip'; t.setAttribute('role', 'note');
    t.innerHTML = touch.matches || !wide.matches
      ? '<span><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(180deg)">' + ICONS.chev + '</svg>Swipe up for the next story</span><span>' + ic('chevL') + 'Swipe left for the full story</span><span><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(180deg)">' + ICONS.chevL + '</svg>Swipe right for topics</span>'
      : '<span><kbd>↓</kbd>Scroll or press the down arrow for the next story</span><span><kbd>→</kbd>The right arrow opens the full story</span>';
    st.appendChild(t); setTimeout(tipDone, 8000);
  }
  function tipDone() { var t = $('tip'); if (!t) return; store('paiir-news-tip', '1'); t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }

  // ---- sharing: the story's Paiir link (its preview shows the story's picture; it opens the story here first)
  var toastEl = $('toast');
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { toastEl.classList.remove('on'); }, 2400); }
  var menu = null;
  function closeMenu() { if (!menu) return; menu.remove(); menu = null; document.removeEventListener('pointerdown', menuOut, true); }
  function menuOut(e) { if (menu && !menu.contains(e.target) && !(menu._btn && menu._btn.contains(e.target))) closeMenu(); }
  function copy(u) {
    var done = function () { toast('Link copied'); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(u).then(done, legacy);
    legacy();
    function legacy() { var ta = document.createElement('textarea'); ta.value = u; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy this link: ' + u); } ta.remove(); }
  }
  function share(btn) {
    var it = R.items[R.i], s = it && it.s; if (!s) return;
    var url = NEWS + 's/' + encodeURIComponent(s.id), e = encodeURIComponent;
    if (navigator.share && touch.matches) { navigator.share({ title: s.title, text: s.title, url: url }).catch(function () {}); return; }
    if (menu) return closeMenu();
    menu = document.createElement('div'); menu.className = 'menu'; menu.setAttribute('role', 'menu'); menu._btn = btn;
    menu.innerHTML = [['chat', 'WhatsApp', 'https://wa.me/?text=' + e(s.title + '\n\n' + url)], ['linkedin', 'LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + e(url)], ['send', 'X', 'https://x.com/intent/post?text=' + e(s.title) + '&url=' + e(url)]].map(function (x) {
      return '<a role="menuitem" href="' + esc(x[2]) + '" target="_blank" rel="noopener noreferrer">' + ic(x[0]) + x[1] + '</a>';
    }).join('') + '<button type="button" role="menuitem" data-copy>' + ic('copy') + 'Copy link</button><small>Opens the story on Paiir News</small>';
    document.body.appendChild(menu);
    menu.addEventListener('click', function (ev) { if (ev.target.closest('[data-copy]')) copy(url); closeMenu(); });
    var r = btn.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.max(12, Math.min(r.right - mw, innerWidth - mw - 12)) + 'px';
    menu.style.top = Math.max(12, r.top - mh - 8 > 12 ? r.top - mh - 8 : r.bottom + 8) + 'px';
    document.addEventListener('pointerdown', menuOut, true);
    menu.querySelector('a').focus();
  }

  // ---- advertise with us: a short form that reaches the Paiir team (Admin > Forms, kind news-advertise)
  var sheet = null;
  function openAdvertise() {
    if (sheet) return;
    closePop(); var back = document.activeElement;
    sheet = document.createElement('div'); sheet.className = 'sheet-wrap';
    sheet.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="adH"><div class="sheet-h"><h2 id="adH">Advertise on Paiir News</h2><button type="button" class="ib" data-x aria-label="Close">' + ic('x') + '</button></div>' +
      '<p class="sheet-p">Tell us a little about what you’d like to promote. The Paiir team replies within 2 working days with the options that fit.</p>' +
      '<form class="af-form" novalidate><div class="af-two"><label class="af"><span class="af-l">Your name</span><input name="name" autocomplete="name" maxlength="120"></label><label class="af"><span class="af-l">Work email</span><input name="email" type="email" autocomplete="email" required></label></div>' +
      '<label class="af"><span class="af-l">Company or brand</span><input name="company" autocomplete="organization" maxlength="120"></label>' +
      '<label class="af"><span class="af-l">What would you like to promote?</span><textarea name="message" rows="3" maxlength="1000" placeholder="A product, an event, a hiring drive…"></textarea></label>' +
      '<input name="website" class="af-hp" tabindex="-1" autocomplete="off" aria-hidden="true"><p class="af-err" role="alert"></p>' +
      '<button type="submit" class="go">Send to the Paiir team</button><small class="af-note">Or write to ' + MAIL + '. We never share your details.</small></form></div>';
    document.body.appendChild(sheet);
    var box = sheet.querySelector('.sheet'), f = sheet.querySelector('form'), err = f.querySelector('.af-err'), btn = f.querySelector('[type=submit]');
    var shut = function () { if (!sheet) return; sheet.remove(); sheet = null; document.removeEventListener('keydown', key, true); if (back && back.focus) back.focus(); };
    var key = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); shut(); } };
    document.addEventListener('keydown', key, true);
    sheet.addEventListener('click', function (e) { if (e.target === sheet || e.target.closest('[data-x]')) shut(); });
    f.addEventListener('input', function () { err.textContent = ''; });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (n) { return f.elements[n].value.trim(); }, em = v('email');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { err.textContent = 'Please add an email we can reply to.'; f.elements.email.focus(); return; }
      btn.disabled = true; btn.textContent = 'Sending…';
      fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'news-advertise', email: em, name: v('name'), detail: v('company'), data: { company: v('company'), message: v('message'), from: 'Paiir News' }, page: location.pathname, website: f.elements.website.value }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error('send'); }); })
        .then(function () { box.innerHTML = '<div class="af-done"><span class="end-ic">' + ic('check') + '</span><h2>Thank you. We’ve got it.</h2><p class="sheet-p">The Paiir team will write to ' + esc(em) + ' within 2 working days.</p><button type="button" class="go go-2" data-x>Back to the news</button></div>'; box.querySelector('[data-x]').focus(); })
        .catch(function () { btn.disabled = false; btn.textContent = 'Send to the Paiir team'; err.textContent = 'We couldn’t send this just now. Please try again, or write to ' + MAIL + '.'; });
    });
    requestAnimationFrame(function () { if (sheet) { sheet.classList.add('on'); f.elements.name.focus(); } });
  }

  // ---- wiring
  swipes(deck, ''); swipes(OV.full.p, 'full'); swipes(OV.disc.p, 'disc');
  // a mouse wheel or a trackpad: one story per flick (a trackpad keeps sending after the fingers lift)
  deck.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    e.preventDefault();
    var now = performance.now(), w = R.wheel;
    if (Math.abs(e.deltaY) < 6) return;
    if (now < w.until) { if (now - w.step < 1000) w.until = now + 180; return; }
    w.step = now; w.until = now + 450; go(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
  // a swipe that ends on a button shouldn't press it
  document.addEventListener('click', function (e) { if (R.dragged) { e.preventDefault(); e.stopPropagation(); R.dragged = false; } }, true);
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-full],[data-share],[data-close],[data-next],[data-go],[data-first],[data-cat],[data-retry],[data-light-set],[data-adv],[data-top]');
    if (!t) return;
    if (t.hasAttribute('data-full')) return open('full');
    if (t.hasAttribute('data-share')) return share(t);
    if (t.hasAttribute('data-close')) return close();
    if (t.hasAttribute('data-next')) { close(); return setTimeout(function () { go(1); }, 160); }
    if (t.hasAttribute('data-go')) return go(+t.dataset.go);
    if (t.hasAttribute('data-first')) return first();
    if (t.hasAttribute('data-top')) { e.preventDefault(); if (onNow()) close(); return R.cat || shared ? pickCat('') : first(); }
    if (t.hasAttribute('data-light-set')) { setLight(t.getAttribute('data-light-set'), true); if (pop) setTimeout(closePop, 180); return; }
    if (t.hasAttribute('data-adv')) { if (onNow() === 'disc') close(); return openAdvertise(); }
    if (t.hasAttribute('data-retry')) { R.data = null; reset(); return load(); }
    // a topic: from Discover it closes the panel and shows the topic's first story
    var c = t.getAttribute('data-cat') || '';
    if (onNow() === 'disc') { close(); setTimeout(function () { pickCat(c); }, 120); } else pickCat(c);
  });
  $('topicBtn').addEventListener('click', function () { open('disc'); });
  $('lightBtn').addEventListener('click', openPop);
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || sheet) return;
    var tg = e.target, k = e.key;
    if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
    if (k === 'Escape' && (pop || menu)) { closePop(); closeMenu(); return; }
    var on = onNow();
    if (on) { if (k === 'Escape' || (on === 'full' && k === 'ArrowLeft') || (on === 'disc' && k === 'ArrowRight')) { e.preventDefault(); close(); } return; }
    var plain = tg === document.body || tg === deck;
    if (k === 'ArrowDown' || k === 'PageDown' || k === 'j' || (k === ' ' && plain)) { e.preventDefault(); go(1); }
    else if (k === 'ArrowUp' || k === 'PageUp' || k === 'k') { e.preventDefault(); go(-1); }
    else if (k === 'ArrowRight' || (k === 'Enter' && plain)) { e.preventDefault(); open('full'); }
    else if (k === 'ArrowLeft' && !wide.matches) { e.preventDefault(); open('disc'); }
    else if (k === 'Home') { e.preventDefault(); first(); }
  });
  window.addEventListener('resize', function () { closePop(); closeMenu(); $$('.s', deck).forEach(clip); });
  document.addEventListener('pointerdown', function () { R.kb = false; }, true);
  document.addEventListener('keydown', function () { R.kb = true; }, true);

  function load() {
    return fetch(PATH + 'news.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      if (!d || !Array.isArray(d.stories) || !d.stories.length) throw new Error('empty');
      R.data = d;
    }).catch(function () { R.data = { error: 1 }; }).then(function () {
      var t = ask.get('t'); if (t && cats().some(function (c) { return c[0] === t; })) R.cat = t;
      drawPanels(); reset(); tip();
    });
  }
  drawPanels(); reset(); load();
  // "Advertise with us" on a story page comes here with ?advertise=1
  if (ask.get('advertise')) openAdvertise();
})();
