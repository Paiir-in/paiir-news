// Paiir News: counting visits, like the rest of paiir.in (owner, 2026-10-26: count visitors, to show advertisers).
// Each page opened sends one small note to app.paiir.in/api/track: the page, its title, on arrival the site the reader
// came from, and the same random id paiir.in keeps in this browser, so a person counts once across paiir.in and the
// news. No cookies, names or emails. Links to a publisher count as clicks. paiir.in/?notrack=1 stops counting.
(function () {
  'use strict';
  var KEY = 'paiirVisitor', id = '';
  var app = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:3000' : 'https://app.paiir.in';
  try {
    if (localStorage.getItem('paiirNoTrack') === '1') return;
    id = localStorage.getItem(KEY) || '';
    if (!/^[a-z0-9-]{8,64}$/i.test(id)) { id = window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'v-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem(KEY, id); }
  } catch (e) { id = 'v-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function send(o) {
    o.v = id;
    var body = JSON.stringify(o), url = app + '/api/track';
    try { if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return; } catch (e) {}
    try { fetch(url, { method: 'POST', body: body, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
  }
  var q = new URLSearchParams(location.search);
  send({ k: 'view', p: location.pathname, t: document.title, r: document.referrer || '', s: q.get('utm_source') || '', c: q.get('utm_campaign') || '' });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (!/^https?:$/.test(u.protocol) || /(^|\.)paiir\.in$/.test(u.hostname) || u.hostname === location.hostname) return;
    send({ k: 'click', p: location.pathname, l: u.href });
  }, true);
})();
