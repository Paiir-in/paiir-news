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
  { name: 'Gadgets 360', domain: 'gadgets360.com', urls: ['https://feeds.feedburner.com/gadgets360-latest', 'https://www.gadgets360.com/rss/news'], india: true }
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
// every story in one feed (RSS <item> or Atom <entry>)
export function parseFeed(xml, base) {
  if (typeof xml !== 'string' || !/<(rss|feed|rdf:RDF)\b/i.test(xml)) throw new Error('not a feed');
  const re = /<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi, out = []; let m;
  while ((m = re.exec(xml))) {
    const it = m[2], title = plain(tag(it, 'title')), link = linkOf(it, base);
    if (!title || !link) continue;
    const when = Date.parse(plain(tag(it, 'pubDate') || tag(it, 'published') || tag(it, 'updated') || tag(it, 'dc:date')));
    out.push({ title, link, published: isFinite(when) ? new Date(when).toISOString() : '', snippet: snippet(tag(it, 'description') || tag(it, 'summary') || tag(it, 'content:encoded') || tag(it, 'content')), image: imageOf(it, base) });
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
export const CATEGORIES = ['AI', 'Startups', 'Gadgets', 'Apps', 'Security', 'India'];
export function categorise(title, snip, src) {
  const t = title + ' ' + snip, tags = Object.keys(KW).filter(k => KW[k].test(t));
  if (src && src.india || INDIA.test(title)) tags.push('India');
  const order = ['AI', 'Security', 'Startups', 'Gadgets', 'Apps'];
  const cat = order.find(k => KW[k].test(title)) || order.find(k => tags.includes(k)) || (tags.includes('India') ? 'India' : 'Tech');
  return { category: cat, tags: [...new Set(tags)] };
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// the tiny page behind every share link: preview tags for WhatsApp, LinkedIn and X, then on to the story on the news page
export function sharePage(st, base, ogDefault) {
  const url = base.replace(/\/+$/, '') + '/s/' + st.id + '/', img = safeUrl(st.image) || ogDefault, back = '../../?s=' + encodeURIComponent(st.id);
  const desc = st.snippet || ('From ' + st.source + ' on Paiir News.');
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<title>' + esc(st.title) + ' · Paiir News</title>\n<meta name="description" content="' + esc(desc) + '">\n<meta name="robots" content="noindex">\n' +
    '<meta property="og:type" content="article"><meta property="og:site_name" content="Paiir News">\n<meta property="og:title" content="' + esc(st.title) + '">\n<meta property="og:description" content="' + esc(desc) + '">\n' +
    '<meta property="og:image" content="' + esc(img) + '">\n<meta property="og:url" content="' + esc(url) + '">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="' + esc(st.title) + '">\n<meta name="twitter:image" content="' + esc(img) + '">\n' +
    '<link rel="canonical" href="' + esc(url) + '"><link rel="icon" href="../../brand/paiir-mark.svg" type="image/svg+xml">\n' +
    '<style>body{margin:0;display:grid;place-items:center;min-height:100vh;font:16px/1.5 Figtree,system-ui,sans-serif;color:#111318;background:#FFFFFF}a{color:#0A6CFF}</style></head>\n' +
    '<body><p><a href="' + esc(back) + '">' + esc(st.title) + ' · Open on Paiir News</a></p>\n<script>location.replace(' + JSON.stringify(back) + ');</script></body></html>\n';
}
