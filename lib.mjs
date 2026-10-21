// Paiir News: the pieces of the feed script that are worth testing on their own. No dependencies: a small RSS 2.0 and
// Atom reader, URL and text cleaning, categories, and the HTML of a share page. Everything from a feed is untrusted:
// text is stripped of HTML, and only http/https links and images are kept.
import { createHash } from 'node:crypto';

export const SOURCES = [
  { name: 'TechCrunch', domain: 'techcrunch.com', urls: ['https://techcrunch.com/feed/'] },
  { name: 'The Verge', domain: 'theverge.com', urls: ['https://www.theverge.com/rss/index.xml'] },
  { name: 'Ars Technica', domain: 'arstechnica.com', urls: ['https://feeds.arstechnica.com/arstechnica/index', 'https://arstechnica.com/feed/'] },
  { name: 'Wired', domain: 'wired.com', urls: ['https://www.wired.com/feed/rss'] },
  { name: 'Engadget', domain: 'engadget.com', urls: ['https://www.engadget.com/rss.xml'] },
  { name: 'MIT Technology Review', domain: 'technologyreview.com', urls: ['https://www.technologyreview.com/feed/'] },
  { name: 'Hacker News', domain: 'news.ycombinator.com', urls: ['https://hnrss.org/frontpage'] },
  { name: 'Inc42', domain: 'inc42.com', urls: ['https://inc42.com/feed/'], india: true },
  { name: 'YourStory', domain: 'yourstory.com', urls: ['https://yourstory.com/feed'], india: true },
  { name: 'Gadgets 360', domain: 'gadgets360.com', urls: ['https://feeds.feedburner.com/gadgets360-latest', 'https://www.gadgets360.com/rss/news'], india: true },
  // topics beyond tech (owner, 2026-10-21): readers pick what they want to see
  { name: 'Mint', domain: 'livemint.com', urls: ['https://www.livemint.com/rss/economy'], cat: 'Economy', india: true },
  { name: 'Economic Times', domain: 'economictimes.indiatimes.com', urls: ['https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms'], cat: 'Economy', india: true },
  { name: 'BBC Business', domain: 'bbc.com', urls: ['https://feeds.bbci.co.uk/news/business/rss.xml'], cat: 'Economy' },
  { name: 'Dezeen', domain: 'dezeen.com', urls: ['https://www.dezeen.com/feed/'], cat: 'Design' },
  { name: 'Creative Bloq', domain: 'creativebloq.com', urls: ['https://www.creativebloq.com/feeds.xml'], cat: 'Design' },
  { name: 'Fast Company', domain: 'fastcompany.com', urls: ['https://www.fastcompany.com/co-design/rss'], cat: 'Design' },
  { name: 'BBC Science', domain: 'bbc.com', urls: ['https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'], cat: 'Science' },
  { name: 'BBC Health', domain: 'bbc.com', urls: ['https://feeds.bbci.co.uk/news/health/rss.xml'], cat: 'Health' },
  { name: 'Scarleteen', domain: 'scarleteen.com', urls: ['https://www.scarleteen.com/rss.xml'], cat: 'Sex education', days: 60 },
  { name: 'ScienceDaily', domain: 'sciencedaily.com', urls: ['https://www.sciencedaily.com/rss/health_medicine/sexual_health.xml'], cat: 'Sex education', days: 30 }
];

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', ndash: '–', mdash: '–', middot: '·', bull: '•', copy: '©', reg: '®', trade: '™', rarr: '→', larr: '←', times: '×', eacute: 'é', egrave: 'è', aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', uuml: 'ü', ouml: 'ö', auml: 'ä', rupee: '₹' };
export function decode(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; }
    const v = NAMED[e.toLowerCase()]; return v === undefined ? m : v;
  });
}
const cdata = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
// plain text from (possibly escaped) HTML; em dashes become en dashes (Paiir copy never uses the em dash)
export function plain(s) {
  let t = cdata(s);
  if (/&lt;\s*[a-z/!]/i.test(t) && !/<[a-z/!]/i.test(t)) t = decode(t);
  t = t.replace(/<(script|style|noscript|iframe)[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>/gi, ' ').replace(/<[^>]*>/g, ' ');
  return decode(t).replace(/—/g, '–').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f​]/g, '').replace(/\s+/g, ' ').trim();
}
// about 60 words, ending on a full sentence where one fits (the phone cards read like Inshorts)
export function summary(s, max = 420) {
  const t = snippet(s, 100000);
  if (t.length <= max) return t;
  const cut = t.slice(0, max), end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return end > max * 0.5 ? cut.slice(0, end + 1) : snippet(t, max);
}
// the story page's text (owner, 2026-10-21: "make it atleast 10 - 15 lines readable"): the publisher's own feed text in
// paragraphs, up to about 15 lines (1,400 characters), ending on a full sentence; captions, "Read more" and "appeared
// first on" lines left out
export function bodyText(s, max = 1400) {
  let h = cdata(s);
  if (/&lt;\s*[a-z/!]/i.test(h) && !/<[a-z/!]/i.test(h)) h = decode(h);
  h = h.replace(/<(figure|figcaption|script|style|noscript|iframe|table)\b[\s\S]*?<\/\1>/gi, ' ');
  const paras = h.split(/<\/p>|<br\s*\/?>\s*<br\s*\/?>|<\/h\d>|<\/li>|<\/blockquote>|\n\s*\n/i).map(p => snippet(p, 100000))
    .filter(p => p.length > 25 && !/^(Article URL|Comments URL|Points:|# Comments)/i.test(p));
  const out = []; let n = 0;
  for (const p of paras) {
    if (n + p.length <= max) { out.push(p); n += p.length; continue; }
    const room = max - n, cut = p.slice(0, room), end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
    if (room > 120 && end > 60) out.push(cut.slice(0, end + 1));
    break;
  }
  return out;
}
export function snippet(s, max = 160) {
  let t = plain(s).replace(/The post .{3,300}? appeared first on .{2,80}?\.?$/i, '').replace(/\s*(Read more|Continue reading|Read the full story)\b.*$/i, '').trim();
  if (/^Article URL:/i.test(t)) t = '';
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1), sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.–-]+$/, '') + '…';
}
export function safeUrl(u, base) {
  try { const x = new URL(decode(String(u || '').trim()), base); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; }
}
const TRACK = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref|ref_src|ncid|guccounter|guce_referrer|guce_referrer_sig|_hsenc|_hsmi|cmpid|soc_src|soc_trk|taid|src|sr_share|output)$/i;
export function cleanUrl(u) {
  const s = safeUrl(u); if (!s) return '';
  const x = new URL(s); x.hash = ''; x.hostname = x.hostname.toLowerCase();
  [...x.searchParams.keys()].forEach(k => { if (TRACK.test(k)) x.searchParams.delete(k); });
  if (x.pathname.length > 1) x.pathname = x.pathname.replace(/\/+$/, '');
  return x.href;
}
export const idOf = u => createHash('sha1').update(u.replace(/^https?:\/\/(www\.)?/, '')).digest('hex').slice(0, 10);
export const titleKey = t => plain(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const cleanDomain = d => String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#:]/)[0].replace(/[^a-z0-9.-]/g, '');

// the inner text of the first <tag> (namespaced names welcome), and the attributes of tags
function tag(xml, name) {
  const m = new RegExp('<' + name.replace(':', '\\:') + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name.replace(':', '\\:') + '>', 'i').exec(xml);
  return m ? cdata(m[1]).trim() : '';
}
function attrs(s) { const o = {}; s.replace(/([a-zA-Z_:][-\w:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g, (m, k, v, a, b) => { o[k.toLowerCase()] = decode(a !== undefined ? a : b); return ''; }); return o; }
function tagsWithAttrs(xml, name) { const re = new RegExp('<' + name.replace(':', '\\:') + '\\b([^>]*)\\/?>', 'gi'), out = []; let m; while ((m = re.exec(xml))) out.push(attrs(m[1])); return out; }
const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;
function imageOf(item, base) {
  for (const a of tagsWithAttrs(item, 'media:content')) { if (a.url && (/^image\//i.test(a.type || '') || a.medium === 'image' || (!a.type && !a.medium && IMG_EXT.test(a.url)))) { const u = safeUrl(a.url, base); if (u) return u; } }
  for (const a of tagsWithAttrs(item, 'media:thumbnail')) { const u = safeUrl(a.url, base); if (u) return u; }
  for (const a of tagsWithAttrs(item, 'enclosure')) { if (a.url && (/^image\//i.test(a.type || '') || IMG_EXT.test(a.url))) { const u = safeUrl(a.url, base); if (u) return u; } }
  for (const part of [tag(item, 'content:encoded'), tag(item, 'content'), tag(item, 'description'), tag(item, 'summary')]) {
    const h = /&lt;img/i.test(part) ? decode(part) : part, m = /<img\b[^>]*?\bsrc\s*=\s*("([^"]+)"|'([^']+)')/i.exec(h);
    if (m) { const u = safeUrl(m[2] || m[3], base); if (u && !/(feedburner|pixel|1x1|tracking|gravatar|emoji)/i.test(u)) return u; }
  }
  return '';
}
function linkOf(item, base) {
  const orig = tag(item, 'feedburner:origLink'); if (orig) return safeUrl(orig, base);
  const ls = tagsWithAttrs(item, 'link').filter(a => a.href);
  if (ls.length) { const alt = ls.find(a => !a.rel || a.rel === 'alternate') || ls[0]; return safeUrl(alt.href, base); }
  const l = plain(tag(item, 'link')); if (l) return safeUrl(l, base);
  const g = tag(item, 'guid'); return /^https?:/i.test(plain(g)) ? safeUrl(plain(g), base) : '';
}
// some feeds point at a thumbnail; ask for the larger copy the same server already has (BBC: 240 to 976 pixels wide)
export const sharper = u => String(u || '').replace(/^(https:\/\/ichef\.bbci\.co\.uk\/ace\/(?:standard|ws))\/\d{2,3}\//, '$1/976/').replace(/^(https:\/\/ichef\.bbci\.co\.uk\/images\/ic)\/\d{2,3}x\d{2,3}\//, '$1/976x549/');
// every story in one feed (RSS <item> or Atom <entry>)
export function parseFeed(xml, base) {
  if (typeof xml !== 'string' || !/<(rss|feed|rdf:RDF)\b/i.test(xml)) throw new Error('not a feed');
  const re = /<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi, out = []; let m;
  while ((m = re.exec(xml))) {
    const it = m[2], title = plain(tag(it, 'title')), link = linkOf(it, base);
    if (!title || !link) continue;
    const when = Date.parse(plain(tag(it, 'pubDate') || tag(it, 'published') || tag(it, 'updated') || tag(it, 'dc:date')));
    const short = tag(it, 'description') || tag(it, 'summary') || tag(it, 'content:encoded') || tag(it, 'content'), long = tag(it, 'content:encoded') || tag(it, 'content') || short;
    const sum = summary(long), sumShort = summary(short);
    out.push({ title, link, published: isFinite(when) ? new Date(when).toISOString() : '', snippet: snippet(short), summary: sum.length > sumShort.length ? sum : sumShort, body: bodyText(long), image: sharper(imageOf(it, base)) });
  }
  return out;
}
// og:image (or twitter:image) from the first part of an article page
export function ogImage(html, base) {
  const head = String(html || '').slice(0, 300000);
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]), k = (a.property || a.name || '').toLowerCase();
    if ((k === 'og:image' || k === 'og:image:url' || k === 'og:image:secure_url' || k === 'twitter:image') && a.content) { const u = safeUrl(a.content, base); if (u) return u; }
  }
  return '';
}

const KW = {
  AI: /\b(ai|a\.i\.|artificial intelligence|genai|generative|openai|chatgpt|gpt-?\d|llms?|large language|gemini|anthropic|claude|copilot|machine learning|deepseek|mistral|llama|perplexity|agentic|ai agents?|neural|nvidia)\b/i,
  Startups: /\b(startups?|funding|raises?|raised|series [a-e]|seed round|pre-seed|venture|vcs?|investors?|ipo|acquires?|acquisition|unicorn|founders?|valuation|layoffs?|fundraise)\b/i,
  Security: /\b(security|hack(?:ed|ers?|ing)?|breach(?:es)?|vulnerabilit(?:y|ies)|malware|ransomware|privacy|cyber\w*|exploits?|phishing|passwords?|spyware|zero-day|data leak|leaked)\b/i,
  Gadgets: /\b(iphone|ipad|android phones?|smartphones?|phones?|laptops?|macbook|pixel \d+|galaxy|gadgets?|headphones|earbuds|airpods|smartwatch|cameras?|tablets?|consoles?|ps5|playstation|xbox|nintendo|switch 2|tvs?|wearables?|processor|gpus?|hands-on)\b/i,
  Apps: /\b(apps?|ios \d+|ios|android \d+|whatsapp|instagram|threads|tiktok|youtube|chrome|browser|windows \d+|windows|macos|software update|spotify|netflix|play store|app store)\b/i
};
const INDIA = /\b(india|indian|bengaluru|bangalore|mumbai|delhi|hyderabad|chennai|pune|gurugram|noida|rupees?|crore|lakh|upi|sebi|rbi|meity|isro|jio|reliance|tata|infosys|flipkart|zomato|swiggy|paytm|ola|byju'?s)\b|₹/i;
const MORE = {
  Economy: /\b(econom(y|ic|ics)|inflation|gdp|recession|interest rates?|repo rate|tariffs?|stock markets?|sensex|nifty|budget|fiscal|rupee|exports?|imports?)\b/i,
  Design: /\b(design(er|ers|ed)?|typography|ui\/ux|ux|branding|logo|architecture|interiors?)\b/i,
  Science: /\b(scien(ce|tists?)|nasa|isro|space|astronom\w*|physics|biolog\w*|climate|species|fossils?)\b/i,
  Health: /\b(health|medic(al|ine)|disease|vaccines?|cancer|mental health|doctors?|hospitals?|nutrition)\b/i
};
export const CATEGORIES = ['AI', 'Startups', 'Economy', 'Design', 'Gadgets', 'Apps', 'Security', 'Science', 'Health', 'Sex education', 'India'];
export function categorise(title, snip, src) {
  const t = title + ' ' + snip;
  if (src && src.cat) {
    // a topic source: its topic first, then any other topic its words clearly belong to
    const tags = [src.cat].concat(Object.keys(MORE).filter(k => k !== src.cat && MORE[k].test(title)));
    if (src.india || INDIA.test(title)) tags.push('India');
    return { category: src.cat, tags: [...new Set(tags)] };
  }
  const tags = Object.keys(KW).filter(k => KW[k].test(t)).concat(Object.keys(MORE).filter(k => MORE[k].test(title)));
  if (src && src.india || INDIA.test(title)) tags.push('India');
  const order = ['AI', 'Security', 'Startups', 'Gadgets', 'Apps'];
  const cat = order.find(k => KW[k].test(title)) || order.find(k => tags.includes(k)) || (tags.includes('India') ? 'India' : 'Tech');
  return { category: cat, tags: [...new Set(tags)] };
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Each story's own page on Paiir News (owner, 2026-10-21: "we should have our own news page instead of redirecting to the
// source"). Readers stay on Paiir: the picture, the headline, the source and time, our short summary, a sponsored slot,
// related stories and share. The full article stays with its publisher ("Read the full story at <source>"): copying
// publishers' full text and photos would need their permission. The same page carries the preview tags for WhatsApp,
// LinkedIn and X. story.js adds the related stories (from news.json), Dim light, share and "2h ago".
const SP_TIME = { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' };
export function storyPage(st, base, home, ogDefault) {
  const root = base.replace(/\/+$/, ''), url = root + '/s/' + st.id, pic = sharper(safeUrl(st.image)), link = safeUrl(st.link);
  const img = pic ? 'https://wsrv.nl/?url=' + encodeURIComponent(pic) + '&w=1200&h=630&fit=cover&a=attention&output=jpg&q=65' : ogDefault;
  const desc = st.snippet || ('From ' + st.source + ' on Paiir News.'), when = Date.parse(st.published);
  const date = isFinite(when) ? new Date(when).toLocaleString('en-IN', SP_TIME).replace(/\b(am|pm)\b/i, m => m.toLowerCase()) : '';
  const cat = st.category && st.category !== 'Tech' ? st.category : '';
  const tags = [...new Set([cat].concat(st.tags || []).filter(t => t && t !== 'Tech'))];
  const d = String(st.domain || '').toLowerCase().replace(/[^a-z0-9.-]/g, '');
  const fav = d ? '<img class="fav" src="https://www.google.com/s2/favicons?domain=' + encodeURIComponent(d) + '&amp;sz=64" alt="" width="20" height="20" referrerpolicy="no-referrer">' : '<span class="ph fav" aria-hidden="true">' + esc((String(st.source || 'P').trim()[0] || 'P').toUpperCase()) + '</span>';
  const ext = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
  const shareIc = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>';
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
  const back = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>';
  // the publisher's longer feed text when it says more than the summary
  const body = Array.isArray(st.body) && st.body.join(' ').length > String(st.summary || '').length + 40 ? st.body : [];
  const data = JSON.stringify({ id: st.id, category: cat, tags, title: st.title, published: st.published || '' }).replace(/</g, '\\u003c');
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
    '<title>' + esc(st.title) + ' · Paiir News</title>\n<meta name="description" content="' + esc(desc) + '">\n<meta name="robots" content="noindex">\n' +
    '<meta name="theme-color" content="#0E1014"><meta name="color-scheme" content="dark">\n' +
    '<meta property="og:type" content="article"><meta property="og:site_name" content="Paiir News">\n<meta property="og:title" content="' + esc(st.title) + '">\n<meta property="og:description" content="' + esc(desc) + '">\n' +
    '<meta property="og:image" content="' + esc(img) + '">\n<meta property="og:image:type" content="' + (pic ? 'image/jpeg' : 'image/png') + '"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">\n<meta property="og:url" content="' + esc(url) + '">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="' + esc(st.title) + '">\n<meta name="twitter:image" content="' + esc(img) + '">\n' +
    '<link rel="canonical" href="' + esc(url) + '"><link rel="icon" href="' + esc(root + '/brand/paiir-mark.svg') + '" type="image/svg+xml">\n' +
    '<script>try { if (localStorage.getItem(\'paiir-news-dim\') === \'1\') document.documentElement.classList.add(\'dim\'); } catch (e) {}</script>\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400..800;1,400..800&amp;display=swap">\n' +
    '<link rel="stylesheet" href="' + esc(root + '/news.css') + '">\n</head>\n<body class="sp-page">\n' +
    '<a class="skip" href="#story">Skip to the story</a>\n' +
    '<header class="nh"><div class="nw nh-in"><a class="nh-logo" href="' + esc(home) + '" aria-label="Paiir home"><img src="' + esc(root + '/brand/paiir-logo-on-dark.svg') + '" alt="Paiir" width="84" height="40"></a>' +
    '<a class="nh-tag" href="' + esc(root + '/') + '"><i aria-hidden="true"></i>News</a><div class="nh-right">' +
    '<button type="button" class="dim-btn" id="dimBtn" aria-pressed="false" title="A warmer, softer light for reading"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg><span>Dim light</span></button>' +
    '<a class="nh-home" href="' + esc(home) + '" aria-label="Paiir home"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"/><path d=\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/></svg><span>Home</span></a></div></div></header>\n' +
    '<main class="nw sp" id="story">\n<a class="sp-back" href="' + esc(root + '/') + '">' + back + 'All news</a>\n<div class="sp-g">\n<article class="sp-art">\n' +
    '<div class="src">' + fav + '<b>' + esc(st.source) + '</b>' + (date ? '<span>·</span><time datetime="' + esc(st.published) + '">' + esc(date) + '</time>' : '') + (cat ? '<span class="cat-sep">·</span><a class="cat" href="' + esc(root + '/?t=' + encodeURIComponent(cat)) + '">' + esc(cat) + '</a>' : '') + '</div>\n' +
    '<h1 class="sp-t">' + esc(st.title) + '</h1>\n' +
    (pic ? '<figure class="sp-fig"><img src="' + esc(pic) + '" alt="" referrerpolicy="no-referrer" decoding="async"><figcaption>Picture: ' + esc(st.source) + '</figcaption></figure>\n' : '') +
    (body.length ? '<div class="sp-body">' + body.map(p => '<p>' + esc(p) + '</p>').join('') + '</div>\n' : '<p class="sp-sum">' + esc(st.summary || st.snippet || '') + '</p>\n') +
    '<div class="sp-acts">' + (link ? '<a class="btn btn-pri sp-read" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Read the full story at ' + esc(st.source) + ext + '</a>' : '') +
    '<button type="button" class="btn btn-sec sp-share" data-share>' + shareIc + 'Share</button></div>\n' +
    '<p class="sp-note">' + (body.length ? 'From ' + esc(st.source) + '. ' : 'A short summary by Paiir News. ') + 'The full story and its pictures belong to ' + esc(st.source) + '.</p>\n' +
    (tags.length ? '<div class="sp-tags">' + tags.map(t => '<a href="' + esc(root + '/?t=' + encodeURIComponent(t)) + '">' + esc(t) + '</a>').join('') + '</div>\n' : '') +
    '</article>\n<aside class="sp-side" aria-label="Sponsored">\n<div class="sp-ad"><div class="sp-ad-k"><span>Sponsored</span><span class="sp-ex">Example</span></div>' +
    '<div class="sp-ad-c"><div class="sp-ad-top"><span class="sp-ad-logo" aria-hidden="true">YB</span><span><b>Your brand</b><small>Your offer for Paiir readers</small></span></div>' +
    '<div class="sp-ad-hero"><small>For readers of Paiir News</small><b>Your offer here</b><span>right beside every story</span></div>' +
    '<a class="sp-ad-cta" href="' + esc(root + '/?advertise=1') + '">Advertise with us' + arrow + '</a></div>' +
    '<p class="sp-ad-note">This could be your brand. Always marked as sponsored.</p></div>\n</aside>\n</div>\n' +
    '<section class="sp-more" aria-labelledby="spMoreH"><h2 id="spMoreH">' + (cat ? 'More in ' + esc(cat) : 'More on Paiir News') + '</h2><div class="sp-list" id="spMore"></div>' +
    '<a class="btn btn-sec sp-all" href="' + esc(root + '/') + '">See all the news' + arrow + '</a></section>\n</main>\n' +
    '<footer class="sp-foot"><div class="nw"><span>Paiir News · News you care about, every hour</span><a href="' + esc(home) + '">paiir.in</a></div></footer>\n' +
    '<div class="toast" id="toast" role="status" aria-live="polite"></div>\n' +
    '<script>window.PAIIR_STORY = ' + data + ';</script>\n<script src="' + esc(root + '/story.js') + '" defer></script>\n</body></html>\n';
}
// the old name, for anything that still calls it
export const sharePage = (st, base, ogDefault, home) => storyPage(st, base, home || 'https://paiir.in/', ogDefault);
