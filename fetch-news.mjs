// Paiir News: fetch every feed, clean and merge the stories, and publish the page.
//   npm run news      builds _site for paiir.in/news (what the hourly GitHub Action runs)
//   npm run dev       the same build on this computer, served at localhost:5600 (dev.mjs)
//   npm run site      the same build inside the main site's preview at localhost:5500/news/ (site.mjs)
// Writes <out>/news.json, one small share page per story at <out>/s/<id>.html (kept 30 days) and the page files
// from ./page. If one feed fails the others still update (its stories from the last run are kept for a day); if every
// feed fails, the last good news.json is kept. Costs nothing: public feeds only, no keys.
// Settings (environment): NEWS_OUT (folder), NEWS_BASE (public address of the news page), NEWS_HOME (paiir.in, for the
// links back to the main site). Memory between runs lives in .cache: the last news.json, images found, share pages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES, parseFeed, cleanUrl, idOf, titleKey, categorise, ogImage, sharePage, safeUrl, cleanDomain } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (compatible; PaiirNews/1.0; +https://paiir.in/news/)';
const KEEP = 80, SHARE_DAYS = 30, STALE_HOURS = 24, DAY = 864e5;

const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeAtomic = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f + '.tmp', s); fs.renameSync(f + '.tmp', f); };
async function pool(list, n, fn) { let i = 0; await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const k = i++; await fn(list[k], k); } })); }
export function settings(o = {}) {
  return {
    out: path.resolve(o.out || process.env.NEWS_OUT || path.join(HERE, '_site')),
    base: (o.base || process.env.NEWS_BASE || 'https://paiir.in/news').replace(/\/+$/, ''),
    home: o.home || process.env.NEWS_HOME || 'https://paiir.in/',
    cache: path.resolve(o.cache || process.env.NEWS_CACHE || path.join(HERE, '.cache'))
  };
}
// the page files, with the addresses filled in ({{HOME}} = paiir.in, {{BASE}} = the news page itself, {{PATH}} = its
// path, so its files load the same with or without a trailing slash)
export function publishPage(out, base, home) {
  const at = new URL(base + '/').pathname;
  const copy = (a, b) => {
    fs.mkdirSync(b, { recursive: true });
    for (const e of fs.readdirSync(a, { withFileTypes: true })) {
      const s = path.join(a, e.name), d = path.join(b, e.name);
      if (e.isDirectory()) copy(s, d);
      else if (/\.(html|js|css)$/.test(e.name)) fs.writeFileSync(d, fs.readFileSync(s, 'utf8').replace(/\{\{HOME\}\}/g, home).replace(/\{\{BASE\}\}/g, base).replace(/\{\{PATH\}\}/g, at));
      else fs.copyFileSync(s, d);
    }
  };
  copy(path.join(HERE, 'page'), out);
}
// share pages for every story seen in the last 30 days (kept in .cache, so a fresh build on GitHub still has them)
function writeShares(out, cache, base, now, latest) {
  const raw = readJSON(path.join(cache, 'shares.json'), {}), arc = {};
  Object.keys(raw).forEach(k => { const v = raw[k]; arc[k] = typeof v === 'number' ? { first: v } : v; });
  (latest || []).forEach(s => { arc[s.id] = { first: (arc[s.id] && arc[s.id].first) || now, story: s }; });
  const live = new Set((latest || []).map(s => s.id));
  Object.keys(arc).forEach(k => { if (now - arc[k].first > SHARE_DAYS * DAY && !live.has(k)) delete arc[k]; });
  const ogDefault = base + '/brand/og-default.png', sdir = path.join(out, 's');
  // s/<id>.html, served at /s/<id> (GitHub Pages and both local previews drop the .html)
  Object.keys(arc).forEach(k => { if (arc[k].story) writeAtomic(path.join(sdir, k + '.html'), sharePage(arc[k].story, base, ogDefault)); });
  if (fs.existsSync(sdir)) for (const d of fs.readdirSync(sdir)) {
    const m = /^([a-f0-9]{10})(\.html)?$/.exec(d);
    if (m && (!m[2] || !arc[m[1]])) fs.rmSync(path.join(sdir, d), { recursive: true, force: true });
  }
  writeAtomic(path.join(cache, 'shares.json'), JSON.stringify(arc));
  return Object.keys(arc).length;
}

export async function run(o = {}) {
  const { out, base, home, cache } = settings(o), fetchImpl = o.fetch || fetch;
  const sources = o.sources || SOURCES, log = o.log || console.log, now = o.now || Date.now();
  if (!o.skipPage) publishPage(out, base, home);
  const get = async (url, ms, accept) => { const r = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: accept }, signal: AbortSignal.timeout(ms), redirect: 'follow' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); };

  // 1. every feed, each on its own (a failure never stops the rest)
  const report = [], items = [];
  await pool(sources, 5, async (src) => {
    let ok = false, n = 0, err = '';
    for (const u of src.urls) {
      try { const list = parseFeed(await get(u, 15000, 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5'), u); list.forEach(it => items.push(Object.assign(it, { src }))); ok = true; n = list.length; break; }
      catch (e) { err = e.message; }
    }
    report.push({ name: src.name, domain: src.domain, ok, count: n, error: ok ? undefined : err });
    log((ok ? 'ok   ' : 'FAIL ') + src.name.padEnd(22) + (ok ? n + ' stories' : err));
  });
  const prev = readJSON(path.join(out, 'news.json'), null) || readJSON(path.join(cache, 'last-news.json'), null);
  if (!report.some(r => r.ok)) {
    // keep the last good stories: on a fresh build they come back from the cache
    if (!fs.existsSync(path.join(out, 'news.json')) && prev) writeAtomic(path.join(out, 'news.json'), JSON.stringify(prev));
    writeShares(out, cache, base, now, prev && prev.stories);
    log('Every feed failed. Keeping the last good news.json.');
    return { ok: false, report };
  }

  // 2. clean, merge, de-duplicate, newest first (a failed feed keeps its stories from the last run for a day)
  const failed = new Set(report.filter(r => !r.ok).map(r => r.name));
  const stories = [], seenId = new Set(), seenTitle = new Set();
  const add = (s) => { if (!s.id || seenId.has(s.id) || seenTitle.has(titleKey(s.title))) return; seenId.add(s.id); seenTitle.add(titleKey(s.title)); stories.push(s); };
  for (const it of items) {
    const link = cleanUrl(it.link); if (!link) continue;
    const c = categorise(it.title, it.snippet, it.src);
    add({ id: idOf(link), title: it.title.slice(0, 220), link, source: it.src.name, domain: cleanDomain(it.src.domain), published: it.published || new Date(now).toISOString(), snippet: it.snippet, image: it.image, category: c.category, tags: c.tags });
  }
  if (prev && Array.isArray(prev.stories)) prev.stories.filter(s => failed.has(s.source) && now - Date.parse(s.published) < STALE_HOURS * 36e5).forEach(add);
  stories.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  // at most 12 from one source, so a busy feed (Gadgets 360 posts 100 a day) never crowds out the rest; then fill up
  const per = {}, latest = [];
  for (const s of stories) { if (latest.length >= KEEP) break; if ((per[s.source] = (per[s.source] || 0) + 1) <= 12) latest.push(s); }
  for (const s of stories) { if (latest.length >= KEEP) break; if (!latest.includes(s)) latest.push(s); }
  latest.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));

  // 3. images: from the feed; else reuse what an earlier run found; else the article's og:image (5 seconds, once)
  const imgCache = readJSON(path.join(cache, 'images.json'), {});
  if (prev && Array.isArray(prev.stories)) prev.stories.forEach(s => { if (s.image && !imgCache[s.id]) imgCache[s.id] = s.image; });
  const need = latest.filter(s => !s.image && imgCache[s.id] === undefined);
  latest.forEach(s => { if (!s.image && imgCache[s.id]) s.image = imgCache[s.id]; });
  await pool(need, 6, async (s) => {
    let img = '';
    try { img = ogImage(await get(s.link, 5000, 'text/html'), s.link); } catch { img = ''; }
    imgCache[s.id] = img; if (img) s.image = img;
  });
  latest.forEach(s => { s.image = safeUrl(s.image) || ''; if (s.image) imgCache[s.id] = s.image; });
  const keepIds = new Set(latest.map(s => s.id)); Object.keys(imgCache).forEach(k => { if (!keepIds.has(k) && Object.keys(imgCache).length > 600) delete imgCache[k]; });
  writeAtomic(path.join(cache, 'images.json'), JSON.stringify(imgCache));

  // 4. news.json (and a copy in the cache for the next run)
  const data = { updated: new Date(now).toISOString(), count: latest.length, sources: report.map(r => ({ name: r.name, domain: r.domain, ok: r.ok, count: r.count })), stories: latest };
  writeAtomic(path.join(out, 'news.json'), JSON.stringify(data));
  writeAtomic(path.join(cache, 'last-news.json'), JSON.stringify(data));

  // 5. a share page for every story of the last 30 days
  const shares = writeShares(out, cache, base, now, latest);
  log('Wrote ' + latest.length + ' stories (' + latest.filter(s => s.image).length + ' with images) from ' + report.filter(r => r.ok).length + ' of ' + report.length + ' sources, and ' + shares + ' share pages.');
  return { ok: true, report, stories: latest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--page')) {
    // only the page files (while working on the design); the stories stay as they are
    const s = settings(); publishPage(s.out, s.base, s.home); console.log('Page files copied to ' + s.out);
  } else {
    // a failed fetch never fails the build: the last good stories are published instead
    run().then(r => { if (!r.ok) console.log('Published the last good stories.'); }, e => { console.error(e); process.exitCode = 1; });
  }
}
