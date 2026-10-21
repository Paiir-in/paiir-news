// Paiir News: the page. Reads news.json (written every hour by fetch-news.mjs).
// Phones (owner: "like the Inshorts app"): one story per screen, swipe up for the next; each card has the picture, a
// short summary, "Read the story" and share. Computers: the top story, then the latest as
// an easy-to-read list, with a side panel about Paiir. Both: "From Paiir" cards between stories, topic chips, readers'
// own topics ("For you", saved on their device), Dim light, and sharing. Every story opens its own Paiir page
// (/news/s/<id>, owner: "our own news page instead of redirecting to the source"), which links on to the publisher for
// the full story; that page is also the shared link, so its preview shows the story's picture. Everything from
// the feeds is untrusted: it goes in with textContent, and only http/https links and images are used.
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
    up: '<path d="m18 15-6-6-6 6"/>',
    ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    cpu: '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
    trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    phone: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    flask: '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
    pulse: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'
  };
  var TOPICS = [['AI', 'cpu'], ['Startups', 'rocket'], ['Economy', 'trend'], ['Design', 'palette'], ['Gadgets', 'phone'], ['Apps', 'grid'], ['Security', 'shield'], ['Science', 'flask'], ['Health', 'pulse'], ['Sex education', 'heart'], ['India', 'pin']];
  ICONS.megaphone = '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>';
  ICONS.cal = '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>';
  ICONS.play = '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>';
  ICONS.file = '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>';
  ICONS.clock = '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
  ICONS.moon = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';
  ICONS.badge = '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>';
  ICONS.user = '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>';
  ICONS.image = '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>';
  var STEP = 20, NEWS = '{{BASE}}/', HOME = '{{HOME}}', KEY = 'paiir-news-topics', MAIL = 'contact@paiir.in';
  // what Paiir does, between the stories (in turn)
  var PROMOS = [
    ['link', 'Know something people keep asking you about?', 'Sell it from one link: 1:1 calls, courses, templates and paid questions. Free to start, and you keep 93% of every sale.', 'Start selling on Paiir', '#products'],
    ['rocket', 'Building a startup in India?', 'Founder Hub lists the grants, government schemes and accelerators you can apply to today. Free, and each one links straight to apply.', 'Browse Founder Hub', '#founder-hub'],
    ['users', 'Stuck on something? Talk to someone who has done it.', 'Find a mentor is coming soon to Paiir. Verified experts, and you pay only when you book.', 'Get notified', '#experts'],
    ['bridge', 'Meet mentors and investors in one go.', 'Paiir Bridge takes a small batch of startups and gives each one a Founder Passport. Early access is open.', 'Apply for early access', '#bridge']
  ];
  var EXPLORE = [
    ['link', 'Paiir Connect', 'Coming soon', 'Sell what you know from one link: 1:1 calls, live sessions, courses and paid questions. Free to start, 7% only when you sell.', '#products', 'See how it works'],
    ['users', 'Find a mentor', 'Coming soon', 'Book someone who has done what you’re trying to do. Verified experts, and you pay only when you book.', '#experts', 'Get notified'],
    ['bridge', 'Paiir Bridge', 'Early access', 'Where startups meet verified mentors, investors and corporates. Scout does the matching.', '#bridge', 'Apply early'],
    ['rocket', 'Founder Hub', 'Free', 'Grants, government schemes, incubators and funding calls for Indian startups, all in one place.', '#founder-hub', 'Browse programs']
  ];
  var $ = function (id) { return document.getElementById(id); };
  var feed = $('feed'), more = $('more'), moreBtn = $('moreBtn'), chips = $('chips'), updated = $('updated'), toastEl = $('toast'), pager = $('pager');
  var phone = window.matchMedia ? matchMedia('(max-width: 720px)') : { matches: false };
  var ask = new URLSearchParams(location.search), shared = ask.get('s');
  var S = { data: null, cat: 'All', n: STEP, list: [], rows: 0, promos: 0, picks: load() };

  function load() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(function (t) { return TOPICS.some(function (x) { return x[0] === t; }); }) : []; } catch (e) { return []; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function icon(n) { var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[n]; return s; }
  function ic(n) { var w = el('span', 'ic'); w.appendChild(icon(n)); return w; }
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
  function letter(name, cls) { var p = el('span', 'ph' + (cls ? ' ' + cls : ''), (String(name || 'P').trim()[0] || 'P').toUpperCase()); p.setAttribute('aria-hidden', 'true'); return p; }
  function picture(src, name, eager) {
    var u = safe(src); if (!u) return letter(name);
    var img = el('img'); img.alt = ''; img.loading = eager ? 'eager' : 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.src = u;
    img.addEventListener('error', function () { img.replaceWith(letter(name)); });
    return img;
  }
  function favicon(name, d) {
    d = domain(d); if (!d) return letter(name, 'fav');
    var f = el('img', 'fav'); f.alt = ''; f.width = 20; f.height = 20; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer'; f.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(d) + '&sz=64';
    f.addEventListener('error', function () { f.replaceWith(letter(name, 'fav')); }); return f;
  }
  function srcRow(s) {
    var row = el('div', 'src'); row.appendChild(favicon(s.source, s.domain)); row.appendChild(el('b', '', s.source));
    var t = el('time', '', ago(s.published)); t.dateTime = s.published || ''; row.appendChild(el('span', '', '·')); row.appendChild(t);
    if (s.category && s.category !== 'Tech') { row.appendChild(el('span', 'cat-sep', '·')); row.appendChild(el('span', 'cat', s.category)); }
    return row;
  }
  function shareBtn(s, cls) {
    var b = el('button', cls || 'share'); b.type = 'button'; b.setAttribute('aria-label', 'Share: ' + s.title); b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-expanded', 'false'); b.appendChild(icon('share'));
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); share(s, b); }); return b;
  }
  function out(a, s) { a.href = '{{PATH}}s/' + encodeURIComponent(s.id); }

  // which stories: a topic chip, all of them, or "For you" (the reader's own topics). A shared story comes first.
  function inTopic(s, t) { return s.category === t || (s.tags || []).indexOf(t) > -1; }
  function filtered() {
    var all = (S.data && S.data.stories) || [], c = S.cat, list;
    if (c === 'All') list = all.slice();
    else if (c === 'For you') list = all.filter(function (s) { return S.picks.some(function (t) { return inTopic(s, t); }); });
    else list = all.filter(function (s) { return inTopic(s, c); });
    if (shared) { var x = all.filter(function (s) { return s.id === shared; })[0]; if (x) list = [x].concat(list.filter(function (s) { return s !== x; })); }
    return list;
  }

  // ---- computers: the top story, then the list ----
  function lead(s, label) {
    var art = el('article', 'lead'), a = el('a', 'lead-a'); out(a, s);
    var im = el('div', 'lead-img'); im.appendChild(picture(s.image, s.source, true)); im.appendChild(el('span', 'lead-k' + (label ? ' lead-k-shared' : ''), label || 'Top story')); a.appendChild(im);
    var b = el('div', 'lead-b'); b.appendChild(srcRow(s)); b.appendChild(el('h2', 'lead-t', s.title)); if (s.summary || s.snippet) b.appendChild(el('p', 'lead-p', s.summary || s.snippet)); a.appendChild(b);
    art.appendChild(a); art.appendChild(shareBtn(s)); return art;
  }
  function row(s) {
    var art = el('article', 'row'), a = el('a', 'row-a'); out(a, s);
    var b = el('div', 'row-b'); b.appendChild(srcRow(s)); b.appendChild(el('h3', 'row-t', s.title)); if (s.snippet) b.appendChild(el('p', 'row-p', s.snippet)); a.appendChild(b);
    // a story without a picture (or whose picture fails) gives its words the full width
    var u = safe(s.image);
    if (u) {
      var im = el('div', 'row-img'), img = el('img'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.src = u;
      img.addEventListener('error', function () { im.remove(); art.classList.add('noimg'); });
      im.appendChild(img); a.appendChild(im);
    } else art.classList.add('noimg');
    art.appendChild(a); art.appendChild(shareBtn(s)); return art;
  }
  // ---- pictures for Paiir's own cards: small scenes drawn in the page, so they stay crisp and follow Dim light ----
  function h(tag, cls, kids) { var e = el(tag, cls); (kids || []).forEach(function (k) { if (k) e.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); }); return e; }
  function ico(n, cls) { var w = el('span', cls || 'pa-i'); w.appendChild(icon(n)); return w; }
  var ART = {
    link: function () {
      var r = function (i, t, sub, pr) { return h('div', 'pa-row', [ico(i), h('span', 'pa-rt', [h('b', '', [t]), h('small', '', [sub])]), h('b', 'pa-pr', [pr])]); };
      return h('div', 'pa-scene pa-sell', [
        h('div', 'pa-card pa-page', [h('span', 'pa-url', ['paiir.in/', h('b', '', ['you'])]), r('cal', '1:1 call', '45 min', '₹1,499'), r('play', 'Video course', '12 lessons', '₹2,999'), r('file', 'Template kit', 'PDF', '₹799')]),
        h('div', 'pa-card pa-toast', [ico('check', 'pa-ok'), h('span', '', [h('b', '', ['New booking']), h('small', '', ['Paid by UPI'])])]),
        h('span', 'pa-chip pa-green', ['You keep 93%'])]);
    },
    rocket: function () {
      var c = function (cls, tag, t, sub) { return h('div', 'pa-card pa-prog ' + cls, [h('span', 'pa-tag', [tag]), h('b', '', [t]), h('small', '', [sub])]); };
      return h('div', 'pa-scene pa-hub', [c('p3', 'Credits', 'Cloud credits', 'For your stack'), c('p2', 'Scheme', 'State startup policy', 'Support and rebates'), c('p1', 'Grant', 'Seed fund for startups', 'Up to ₹50 lakh'),
        h('span', 'pa-chip pa-warm', [ico('clock', 'pa-ci'), 'Closes in 12 days'])]);
    },
    users: function () {
      return h('div', 'pa-scene pa-mentor', [
        h('span', 'pa-av a1', [ico('user', 'pa-ai')]), h('span', 'pa-av a2', [ico('user', 'pa-ai')]), h('span', 'pa-av a3', [ico('user', 'pa-ai')]),
        h('div', 'pa-card pa-book', [h('div', 'pa-who', [h('span', 'pa-av pa-me', [ico('user', 'pa-ai')]), h('span', '', [h('b', '', ['Talk to someone who’s done it']), h('small', '', [ico('badge', 'pa-vi'), 'Verified mentor'])])]),
          h('div', 'pa-slots', [h('span', '', ['Mon 10:00']), h('span', 'on', ['Tue 18:30']), h('span', '', ['Thu 12:00'])]), h('span', 'pa-btn', ['Book a call'])]),
        h('span', 'pa-chip', ['Coming soon'])]);
    },
    bridge: function () {
      return h('div', 'pa-scene pa-bridge', [
        h('div', 'pa-pass', [h('div', 'pa-ph', [h('span', '', ['Paiir · Founder Passport']), h('i', '', [])]), h('b', 'pa-pn', ['Your startup']),
          h('div', 'pa-pf', [h('span', '', [h('small', '', ['Stage']), h('b', '', ['Seed'])]), h('span', '', [h('small', '', ['Sector']), h('b', '', ['SaaS'])]), h('span', '', [h('small', '', ['Batch']), h('b', '', ['01'])])]),
          h('span', 'pa-ver', [ico('badge', 'pa-vi'), 'Verified by Paiir'])]),
        h('div', 'pa-card pa-ring', [ico('check', 'pa-ri'), h('small', '', ['Strong fit'])])]);
    },
    topics: function () {
      return h('div', 'pa-scene pa-topics', [h('div', 'pa-cloud', [['AI', 1], ['Design', 1], ['Economy', 0], ['Startups', 0], ['Health', 1], ['Science', 0], ['Sex education', 0], ['India', 1]].map(function (t) { return h('span', 'pa-tp' + (t[1] ? ' on' : ''), [t[1] ? ico('check', 'pa-tc') : null, t[0]]); }))]);
    },
    ad: function () { var w = h('div', 'pa-scene pa-adw', [adSample()]); return w; },
    end: function () {
      return h('div', 'pa-scene pa-end', [h('span', 'pa-star s1'), h('span', 'pa-star s2'), h('span', 'pa-star s3'), h('span', 'pa-star s4'), h('span', 'pa-moon', [ico('moon', 'pa-mi')]),
        h('span', 'pa-chip', [ico('clock', 'pa-ci'), 'Fresh stories every hour'])]);
    }
  };
  function art(key) { var w = el('div', 'pa-art'); w.setAttribute('aria-hidden', 'true'); w.appendChild(ART[key]()); return w; }
  function fromPaiir(label) { var r = el('div', 'src'), m = el('img', 'fav'); m.src = '{{PATH}}brand/paiir-mark.svg'; m.alt = ''; r.appendChild(m); r.appendChild(el('b', '', 'Paiir')); r.appendChild(el('span', '', '·')); r.appendChild(el('span', 'cat', label || 'From Paiir')); return r; }
  // on computers, between the stories: the picture as a banner, then the words
  function promo(i) {
    var p = PROMOS[i % PROMOS.length], a = el('a', 'promo promo-v'); a.href = HOME + p[4];
    a.appendChild(art(p[0]));
    var t = el('div', 'promo-b'); t.appendChild(fromPaiir()); t.appendChild(el('b', '', p[1])); t.appendChild(el('p', '', p[2]));
    var go = el('span', 'go', p[3]); go.appendChild(icon('arrow')); t.appendChild(go); a.appendChild(t);
    return a;
  }
  function addRows(from, to) {
    S.list.slice(from, to).forEach(function (s) {
      feed.appendChild(row(s)); S.rows++;
      if (S.rows === 5 || (S.rows > 5 && (S.rows - 5) % 7 === 0)) feed.appendChild(promo(S.promos++));
    });
  }
  function renderList() {
    S.rows = 0; S.promos = 0; feed.textContent = ''; feed.setAttribute('aria-busy', 'false');
    if (!S.list.length) { feed.appendChild(empty()); more.hidden = true; return; }
    var first = S.list[0], isShared = shared && first.id === shared;
    feed.appendChild(lead(first, isShared ? 'Shared with you' : ''));
    if (S.list.length > 1) feed.appendChild(el('h2', 'sec-h', S.cat === 'All' ? 'Latest' : S.cat === 'For you' ? 'For you' : 'Latest in ' + S.cat));
    addRows(1, Math.min(S.n, S.list.length));
    more.hidden = S.n >= S.list.length;
  }
  function loadMore() { if (phone.matches || !S.list.length || S.n >= S.list.length) return; var from = S.n; S.n += STEP; addRows(from, Math.min(S.n, S.list.length)); more.hidden = S.n >= S.list.length; }
  moreBtn.addEventListener('click', loadMore);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting && S.data) loadMore(); }, { rootMargin: '400px 0px' }).observe(more);

  // ---- phones: one story per screen, swipe up for the next ----
  function card(s, i) {
    var c = el('article', 'pc'); c.setAttribute('aria-label', s.title);
    var im = el('div', 'pc-img'); im.appendChild(picture(s.image, s.source, i < 2));
    if (shared && s.id === shared && i === 0) im.appendChild(el('span', 'pc-flag', 'Shared with you'));
    c.appendChild(im);
    var b = el('div', 'pc-b'); b.appendChild(srcRow(s)); b.appendChild(el('h2', 'pc-t', s.title));
    b.appendChild(el('p', 'pc-s', s.summary || s.snippet || ''));
    var f = el('div', 'pc-foot'), rm = el('a', 'pc-more'); out(rm, s);
    rm.appendChild(el('span', '', 'Read the story')); rm.appendChild(icon('arrow')); f.appendChild(rm);
    f.appendChild(shareBtn(s, 'pc-share')); b.appendChild(f); c.appendChild(b);
    if (i === 0) { var h = el('span', 'pc-hint'); h.appendChild(icon('up')); h.appendChild(document.createTextNode('Swipe up for the next story')); im.appendChild(h); }
    return c;
  }
  // on phones, Paiir's own cards are shaped like a story: the picture on top, then the words and the button
  function paiirCard(key, label, title, text, action) {
    var c = el('article', 'pc pc-promo'); c.setAttribute('aria-label', title);
    var im = el('div', 'pc-img'); im.appendChild(art(key)); c.appendChild(im);
    var b = el('div', 'pc-b'); b.appendChild(fromPaiir(label)); b.appendChild(el('h2', 'pc-t', title)); b.appendChild(el('p', 'pc-s', text));
    var f = el('div', 'pc-foot'); action.forEach(function (x) { f.appendChild(x); }); b.appendChild(f); c.appendChild(b);
    return c;
  }
  function goLink(label, href) { var a = el('a', 'pc-go', label); a.href = href; a.appendChild(icon('arrow')); return a; }
  function goBtn(label, fn, cls) { var b = el('button', cls || 'pc-go', label); b.type = 'button'; b.addEventListener('click', fn); if (!cls) b.appendChild(icon('arrow')); return b; }
  function promoCard(i) { var p = PROMOS[i % PROMOS.length]; return paiirCard(p[0], 'From Paiir', p[1], p[2], [goLink(p[3], HOME + p[4])]); }
  function topicsCard() {
    return paiirCard('topics', 'Your topics', 'Read what you care about.', 'Pick your topics, from AI and design to the economy and your health, and we’ll keep you updated every hour. Reading late? The moon button up top turns on Dim light.', [goBtn('Choose my topics', openPicker)]);
  }
  // ---- advertise with us: an example of a sponsored story, and a short form that reaches the Paiir team ----
  function adSample() {
    var w = el('div', 'ad-sample'); w.setAttribute('aria-hidden', 'true');
    var t = el('div', 'ad-sb'), src = el('div', 'src'), logo = el('span', 'fav ad-logo', 'B'); src.appendChild(logo); src.appendChild(el('b', '', 'Your brand')); src.appendChild(el('span', 'ad-tag', 'Sponsored'));
    t.appendChild(src); t.appendChild(el('b', 'ad-st', 'Your story, told in your words')); t.appendChild(el('span', 'ad-go', 'Learn more'));
    var im = el('div', 'ad-img'); im.appendChild(icon('image')); w.appendChild(t); w.appendChild(im);
    return w;
  }
  function adBlock(cls) {
    var c = el('div', cls), k = el('span', 'promo-k'); k.appendChild(el('i')); k.appendChild(document.createTextNode('For brands')); c.appendChild(k);
    c.appendChild(el('b', 'ad-h', 'Advertise on Paiir News'));
    c.appendChild(el('p', 'ad-p', 'Reach readers who choose what they read: founders, builders and curious minds. Your story sits in the feed like this, clearly marked as sponsored.'));
    var lab = el('span', 'ad-lab', 'Example placement'); c.appendChild(lab); c.appendChild(adSample());
    var b = el('button', 'btn btn-pri', 'Advertise with us'); b.type = 'button'; b.appendChild(icon('arrow')); b.addEventListener('click', openAdvertise); c.appendChild(b);
    return c;
  }
  function adCard() { return paiirCard('ad', 'For brands', 'Advertise on Paiir News', 'Reach readers who choose what they read: founders, builders and curious minds. Your story sits in the feed like the one above, clearly marked as sponsored.', [goBtn('Advertise with us', openAdvertise)]); }
  function field(label, input) { var l = el('label', 'af'); l.appendChild(el('span', 'af-l', label)); l.appendChild(input); return l; }
  function openAdvertise() {
    if (sheet) return;
    var back = document.activeElement;
    sheet = el('div', 'sheet-wrap');
    var box = el('div', 'sheet'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'adH');
    var head = el('div', 'sheet-h'), h = el('h2', '', 'Advertise on Paiir News'); h.id = 'adH'; head.appendChild(h);
    var x = el('button', 'sheet-x'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.appendChild(icon('x')); head.appendChild(x); box.appendChild(head);
    box.appendChild(el('p', 'sheet-p', 'Tell us a little about what you’d like to promote. The Paiir team replies within 2 working days with the options that fit.'));
    var f = el('form', 'af-form'); f.noValidate = true;
    var name = el('input'); name.name = 'name'; name.autocomplete = 'name'; name.maxLength = 120; name.placeholder = 'Your name';
    var email = el('input'); email.name = 'email'; email.type = 'email'; email.autocomplete = 'email'; email.required = true; email.placeholder = 'you@company.com';
    var co = el('input'); co.name = 'company'; co.autocomplete = 'organization'; co.maxLength = 120; co.placeholder = 'Company or brand';
    var msg = el('textarea'); msg.name = 'message'; msg.rows = 3; msg.maxLength = 1000; msg.placeholder = 'A product, an event, a hiring drive…';
    var hp = el('input'); hp.name = 'website'; hp.tabIndex = -1; hp.autocomplete = 'off'; hp.className = 'af-hp'; hp.setAttribute('aria-hidden', 'true');
    var row = el('div', 'af-two'); row.appendChild(field('Your name', name)); row.appendChild(field('Work email', email)); f.appendChild(row);
    f.appendChild(field('Company or brand', co)); f.appendChild(field('What would you like to promote?', msg)); f.appendChild(hp);
    var err = el('p', 'af-err'); err.setAttribute('role', 'alert'); f.appendChild(err);
    f.addEventListener('input', function () { err.textContent = ''; });
    var go = el('button', 'btn btn-pri', 'Send to the Paiir team'); go.type = 'submit'; f.appendChild(go);
    f.appendChild(el('small', 'af-note', 'Or write to ' + MAIL + '. We never share your details.'));
    box.appendChild(f); sheet.appendChild(box); document.body.appendChild(sheet);
    var close = function () { if (!sheet) return; sheet.remove(); sheet = null; document.removeEventListener('keydown', key, true); if (back && back.focus) back.focus(); };
    var key = function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } else if (e.key === 'Tab') { var q = box.querySelectorAll('button, input:not(.af-hp), textarea'), a = q[0], z = q[q.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } };
    document.addEventListener('keydown', key, true);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
    x.addEventListener('click', close);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); err.textContent = '';
      var em = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { err.textContent = 'Please add an email we can reply to.'; email.focus(); return; }
      go.disabled = true; go.textContent = 'Sending…';
      fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'news-advertise', email: em, name: name.value.trim(), detail: co.value.trim(), data: { company: co.value.trim(), message: msg.value.trim(), from: 'Paiir News' }, page: location.pathname, website: hp.value }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error('send'); }); })
        .then(function () {
          box.textContent = '';
          var d = el('div', 'af-done'), i = ic('check'); d.appendChild(i); d.appendChild(el('h2', '', 'Thank you. We’ve got it.'));
          d.appendChild(el('p', 'sheet-p', 'The Paiir team will write to ' + em + ' within 2 working days.'));
          var ok = el('button', 'btn btn-sec', 'Back to the news'); ok.type = 'button'; ok.addEventListener('click', close); d.appendChild(ok);
          box.appendChild(d); ok.focus();
        })
        .catch(function () { go.disabled = false; go.textContent = 'Send to the Paiir team'; err.textContent = 'We couldn’t send this just now. Please try again, or write to ' + MAIL + '.'; });
    });
    requestAnimationFrame(function () { sheet.classList.add('on'); name.focus(); });
  }
  function endCard() {
    return paiirCard('end', 'All caught up', 'You’re all caught up.', 'We’ll have fresh stories for you within the hour, so take a break and rest your eyes. Meanwhile, see what else Paiir does.', [goLink('Explore paiir.in', HOME), goBtn('Back to the top', function () { pager.scrollTo({ top: 0, behavior: 'smooth' }); }, 'pc-back')]);
  }
  function renderCards() {
    pager.textContent = '';
    if (!S.list.length) { var c = el('article', 'pc pc-paiir'), w = el('div', 'pc-pin'); w.appendChild(empty()); c.appendChild(w); pager.appendChild(c); return; }
    var n = 0, p = 0;
    S.list.forEach(function (s, i) {
      pager.appendChild(card(s, i)); n++;
      if (n === 2 && !S.picks.length) pager.appendChild(topicsCard());
      if (n === 6 || (n > 6 && (n - 6) % 8 === 0)) pager.appendChild(promoCard(p++));
      if (n === 14) pager.appendChild(adCard());
    });
    pager.appendChild(endCard());
    pager.scrollTop = 0;
  }
  if (pager) pager.addEventListener('scroll', function () { if (pager.scrollTop > 40) pager.classList.add('moved'); }, { passive: true });

  function empty() {
    var box = el('div', 'state'); box.appendChild(el('b', '', S.cat === 'For you' ? 'Nothing in your topics right now' : 'No ' + S.cat + ' stories right now'));
    box.appendChild(el('p', '', 'New stories arrive every hour. Have a look at everything else meanwhile.'));
    var b = el('button', 'btn btn-sec', 'Show all stories'); b.type = 'button'; b.addEventListener('click', function () { pick('All'); }); box.appendChild(b); return box;
  }
  function render() {
    S.list = filtered();
    document.body.classList.toggle('cards', !!phone.matches);
    if (phone.matches) renderCards(); else renderList();
  }
  if (phone.addEventListener) phone.addEventListener('change', function () { if (S.data) render(); });

  // ---- topic chips and the reader's own topics ----
  function drawChips() {
    chips.textContent = '';
    var t = el('button', 'chip chip-topics'); t.type = 'button'; t.appendChild(icon('sliders')); t.appendChild(document.createTextNode(S.picks.length ? 'My topics' : 'Choose topics')); t.addEventListener('click', openPicker); chips.appendChild(t);
    (S.picks.length ? ['For you', 'All'] : ['All']).concat(TOPICS.map(function (x) { return x[0]; })).forEach(function (c) {
      var b = el('button', 'chip', c); b.type = 'button'; b.dataset.c = c; b.setAttribute('aria-pressed', c === S.cat ? 'true' : 'false'); b.addEventListener('click', function () { pick(c); }); chips.appendChild(b);
    });
  }
  function pick(c) {
    S.cat = c; S.n = STEP; drawChips(); render();
    if (!phone.matches) { var top = feed.getBoundingClientRect().top - (chips.getBoundingClientRect().bottom + 16); if (top < 0) window.scrollBy(0, top); }
    var on = chips.querySelector('[aria-pressed="true"]'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  var sheet = null;
  function openPicker() {
    if (sheet) return;
    var back = document.activeElement, chosen = S.picks.slice();
    sheet = el('div', 'sheet-wrap');
    var box = el('div', 'sheet'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'sheetH');
    var head = el('div', 'sheet-h'), h = el('h2', '', 'Pick your topics'); h.id = 'sheetH'; head.appendChild(h);
    var x = el('button', 'sheet-x'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.appendChild(icon('x')); head.appendChild(x); box.appendChild(head);
    box.appendChild(el('p', 'sheet-p', 'Choose what you love to read. We’ll keep you updated on these every hour. Your choice stays on this device, and you can change it any time.'));
    var g = el('div', 'tgrid');
    TOPICS.forEach(function (t) {
      var b = el('button', 'tpick'); b.type = 'button'; b.setAttribute('aria-pressed', chosen.indexOf(t[0]) > -1 ? 'true' : 'false');
      b.appendChild(ic(t[1])); b.appendChild(el('span', '', t[0])); var ck = el('i', 'tck'); ck.appendChild(icon('check')); b.appendChild(ck);
      b.addEventListener('click', function () { var i = chosen.indexOf(t[0]); if (i > -1) chosen.splice(i, 1); else chosen.push(t[0]); b.setAttribute('aria-pressed', i > -1 ? 'false' : 'true'); done.textContent = chosen.length ? 'Show my ' + chosen.length + ' topic' + (chosen.length > 1 ? 's' : '') : 'Show everything'; });
      g.appendChild(b);
    });
    box.appendChild(g);
    var acts = el('div', 'sheet-a'), clear = el('button', 'btn btn-sec', 'Clear'); clear.type = 'button';
    var done = el('button', 'btn btn-pri', chosen.length ? 'Show my ' + chosen.length + ' topic' + (chosen.length > 1 ? 's' : '') : 'Show everything'); done.type = 'button';
    clear.addEventListener('click', function () { chosen = []; Array.prototype.forEach.call(g.children, function (b) { b.setAttribute('aria-pressed', 'false'); }); done.textContent = 'Show everything'; });
    acts.appendChild(clear); acts.appendChild(done); box.appendChild(acts);
    sheet.appendChild(box); document.body.appendChild(sheet);
    var close = function () { if (!sheet) return; sheet.remove(); sheet = null; document.removeEventListener('keydown', key, true); if (back && back.focus) back.focus(); };
    var key = function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } else if (e.key === 'Tab') { var f = box.querySelectorAll('button'), a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } };
    document.addEventListener('keydown', key, true);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
    x.addEventListener('click', close);
    done.addEventListener('click', function () { S.picks = chosen.slice(); save(S.picks); close(); pick(S.picks.length ? 'For you' : 'All'); toast(S.picks.length ? 'Showing your topics' : 'Showing everything'); });
    requestAnimationFrame(function () { sheet.classList.add('on'); (g.querySelector('[aria-pressed="true"]') || g.firstChild).focus(); });
  }

  // ---- the side panel (computers): what Paiir is, then where the news comes from ----
  function side() {
    var box = $('side'); if (!box) return; box.textContent = '';
    var c = el('div', 'card'), m = el('div', 'card-mark'), img = el('img'); img.src = '{{PATH}}brand/paiir-mark.svg'; img.alt = ''; m.appendChild(img); m.appendChild(el('b', '', 'Sell what you know. Find who you need.')); c.appendChild(m);
    c.appendChild(el('p', '', 'Paiir is one link where experts sell calls, courses and templates, and where people find the right expert to talk to.'));
    var ul = el('ul');
    [['link', 'Sell from one link', 'Calls, courses, templates', '#products'], ['users', 'Find a mentor', 'Coming soon', '#experts'], ['rocket', 'Founder Hub', 'Grants and schemes, free', '#founder-hub'], ['bridge', 'Paiir Bridge', 'Early access is open', '#bridge']].forEach(function (x) {
      var li = el('li'), a = el('a'); a.href = HOME + x[3]; a.appendChild(ic(x[0])); var t = el('span', '', x[1]); t.appendChild(el('small', '', x[2])); a.appendChild(t); li.appendChild(a); ul.appendChild(li);
    });
    c.appendChild(ul);
    var go = el('a', 'btn btn-pri', 'Visit paiir.in'); go.href = HOME; c.appendChild(go); box.appendChild(c);
    box.appendChild(adBlock('card ad-card'));
    var src = (S.data && S.data.sources) || [];
    if (src.length) {
      var d = el('div', 'card'); d.appendChild(el('p', 'card-h', 'From ' + src.length + ' trusted sources'));
      var g = el('div', 'srcs'); src.forEach(function (x) { var s = el('span'); s.appendChild(favicon(x.name, x.domain)); s.appendChild(document.createTextNode(x.name)); g.appendChild(s); });
      d.appendChild(g); box.appendChild(d);
    }
  }

  // ---- Explore Paiir, at the end of the page (computers) ----
  (function () {
    var w = el('div', 'nw'), h = el('h2', 'ex-h', 'Explore Paiir.'); h.id = 'exploreH'; w.appendChild(h);
    var p = el('p', 'ex-p', 'Sell what you know.'); p.appendChild(el('span', 'hl', ' Find who you need.')); w.appendChild(p);
    var g = el('div', 'ex-grid');
    EXPLORE.forEach(function (x) {
      var c = el('div', 'ex-c'); c.appendChild(ic(x[0]));
      var chip = el('span', 'ex-chip'); chip.appendChild(el('i')); chip.appendChild(document.createTextNode(x[2])); c.appendChild(chip);
      c.appendChild(el('b', '', x[1])); c.appendChild(el('p', '', x[3]));
      var a = el('a', 'ex-go', x[5]); a.href = HOME + x[4]; a.appendChild(icon('arrow')); c.appendChild(a); g.appendChild(c);
    });
    w.appendChild(g); $('explore').appendChild(w);
  })();

  // ---- Dim light: a warmer, softer palette for tired eyes, remembered on this device ----
  (function () {
    var b = $('dimBtn'), care = document.querySelector('[data-dim]'), note = document.querySelector('[data-dimnote]'), root = document.documentElement;
    var set = function (on) {
      root.classList.toggle('dim', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (care) { care.setAttribute('aria-pressed', on ? 'true' : 'false'); note.textContent = on ? 'Dim light is on. Rest easy' : 'Turn on Dim light'; }
      var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = on ? '#14110D' : '#0E1014';
    };
    var flip = function () { var on = !root.classList.contains('dim'); set(on); try { localStorage.setItem('paiir-news-dim', on ? '1' : '0'); } catch (e) {} toast(on ? 'Dim light on. Easier on your eyes' : 'Dim light off'); };
    set(root.classList.contains('dim'));
    b.addEventListener('click', flip); if (care) care.addEventListener('click', flip);
    var tp = document.querySelector('[data-topics]'); if (tp) tp.addEventListener('click', openPicker);
    var ad = document.querySelector('[data-advertise]'); if (ad) ad.addEventListener('click', openAdvertise);
  })();

  // ---- sharing: a Paiir link. Its preview shows the story's picture; it opens the story on Paiir News first ----
  var menu = null;
  function shareUrl(id) { return NEWS + 's/' + encodeURIComponent(id); }
  function closeMenu(focusBack) { if (!menu) return; var b = menu._btn; menu.remove(); menu = null; document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', keys, true); if (b) { b.setAttribute('aria-expanded', 'false'); if (focusBack) b.focus(); } }
  function outside(e) { if (menu && !menu.contains(e.target) && !menu._btn.contains(e.target)) closeMenu(false); }
  function keys(e) {
    if (!menu) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var it = Array.prototype.slice.call(menu.querySelectorAll('a,button')), i = it.indexOf(document.activeElement); it[(i + (e.key === 'ArrowDown' ? 1 : -1) + it.length) % it.length].focus(); }
  }
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { toastEl.classList.remove('on'); }, 2000); }
  function copy(u) {
    var done = function () { toast('Link copied'); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(u).then(done, legacy);
    legacy();
    function legacy() { var ta = el('textarea'); ta.value = u; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed'); } ta.remove(); }
  }
  function share(s, btn) {
    var url = shareUrl(s.id), e = encodeURIComponent;
    if (navigator.share && window.matchMedia && matchMedia('(pointer: coarse)').matches) { navigator.share({ title: s.title, text: s.title, url: url }).catch(function () {}); return; }
    if (menu && menu._btn === btn) return closeMenu(true);
    closeMenu(false);
    menu = el('div', 'menu'); menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Share this story'); menu._btn = btn;
    [['chat', 'WhatsApp', 'https://wa.me/?text=' + e(s.title + '\n\n' + url)], ['linkedin', 'LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + e(url)], ['send', 'X', 'https://x.com/intent/post?text=' + e(s.title) + '&url=' + e(url)]].forEach(function (x) {
      var a = el('a', '', x[1]); a.href = x[2]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('role', 'menuitem'); a.insertBefore(icon(x[0]), a.firstChild); a.addEventListener('click', function () { closeMenu(false); }); menu.appendChild(a);
    });
    var c = el('button', '', 'Copy link'); c.type = 'button'; c.setAttribute('role', 'menuitem'); c.insertBefore(icon('copy'), c.firstChild); c.addEventListener('click', function () { copy(url); closeMenu(true); }); menu.appendChild(c);
    menu.appendChild(el('small', '', 'Opens the story on Paiir News'));
    document.body.appendChild(menu);
    var r = btn.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = Math.max(12, Math.min(r.right - mw, innerWidth - mw - 12)) + 'px';
    menu.style.top = Math.max(12, Math.min(innerHeight - mh - 12, r.bottom + 8 + mh > innerHeight - 12 ? r.top - mh - 8 : r.bottom + 8)) + 'px';
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', keys, true);
    menu.querySelector('a,button').focus();
  }
  window.addEventListener('scroll', function () { if (menu) closeMenu(false); }, { passive: true });
  if (pager) pager.addEventListener('scroll', function () { if (menu) closeMenu(false); }, { passive: true });

  // ---- load ----
  if (S.picks.length) S.cat = 'For you';
  // a topic link from a story page (?t=AI) opens that topic
  var askT = ask.get('t'); if (askT && TOPICS.some(function (x) { return x[0] === askT; })) S.cat = askT;
  drawChips();
  $('today').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  function tick() { if (S.data) updated.textContent = 'Updated ' + ago(S.data.updated); }
  function skeleton() {
    feed.textContent = ''; feed.setAttribute('aria-busy', 'true');
    var l = el('div', 'lead skel'), im = el('div', 'lead-img'), q0 = el('div', 'sk'); q0.style.height = '100%'; im.appendChild(q0); l.appendChild(im); feed.appendChild(l);
    for (var i = 0; i < 4; i++) {
      var r = el('div', 'row skel'), a = el('div', 'row-a'), b = el('div', 'row-b');
      [['30%', 14], ['92%', 20], ['70%', 20]].forEach(function (w) { var x = el('div', 'sk'); x.style.width = w[0]; x.style.height = w[1] + 'px'; b.appendChild(x); });
      var p = el('div', 'row-img'), q = el('div', 'sk'); q.style.height = '100%'; p.appendChild(q); a.appendChild(b); a.appendChild(p); r.appendChild(a); feed.appendChild(r);
    }
  }
  function stateBox(title, text, btnLabel, onClick) {
    var box = el('div', 'state'); box.appendChild(el('b', '', title)); if (text) box.appendChild(el('p', '', text));
    if (btnLabel) { var b = el('button', 'btn btn-sec', btnLabel); b.type = 'button'; b.insertBefore(icon('refresh'), b.firstChild); b.addEventListener('click', onClick); box.appendChild(b); }
    return box;
  }
  function fetchNews() {
    skeleton(); more.hidden = true;
    fetch('{{PATH}}news.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      if (!d || !Array.isArray(d.stories) || !d.stories.length) throw new Error('empty');
      S.data = d; S.n = STEP; tick(); render(); side();
    }).catch(function () {
      feed.textContent = ''; feed.setAttribute('aria-busy', 'false'); updated.textContent = 'Couldn’t load the news';
      var box = stateBox('The news didn’t load', 'Check your connection and try again. Every story stays linked to its publisher.', 'Try again', fetchNews);
      if (phone.matches) { document.body.classList.add('cards'); pager.textContent = ''; var c = el('article', 'pc pc-paiir'), w = el('div', 'pc-pin'); w.appendChild(box); c.appendChild(w); pager.appendChild(c); } else feed.appendChild(box);
    });
  }
  setInterval(tick, 60000);
  fetchNews();
  // "Advertise with us" on a story page comes here with ?advertise=1
  if (ask.get('advertise')) openAdvertise();
})();
