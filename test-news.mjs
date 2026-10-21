// Paiir News: tests for the feed script, with sample feeds in each format and no network. npm test
// RSS with content:encoded and CDATA, Atom with escaped HTML, RSS with media:thumbnail, a Hacker News style feed, a feed
// that is missing (404) and one that is broken (not XML). The others must still update; when every feed fails the old
// news.json stays; unsafe links and images are dropped; story pages carry the story, escaped preview tags, and expire after 30 days.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, publishPage } from './fetch-news.mjs';
import { parseFeed, snippet, cleanUrl, sharePage, bodyText } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), OUT = path.join(HERE, '.test-out'), CACHE = path.join(OUT, '.cache');
const NOW = Date.parse('2026-10-21T12:00:00Z');
let T = NOW; const iso = h => new Date(T - h * 36e5).toUTCString(); // the sample feeds are dated against T
const RSS = () => `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>A</title>
<item><title><![CDATA[OpenAI raises <b>$10B</b> &amp; more — India push]]></title><link>https://a.example/story-one/?utm_source=rss&amp;id=7#top</link><pubDate>${iso(1)}</pubDate>
<description><![CDATA[<p>Big round for the <a href="x">AI</a> lab.</p><script>alert(1)</script>]]></description><content:encoded><![CDATA[<img src="https://a.example/one.jpg"><p>Body</p>]]></content:encoded></item>
<item><title>Same headline twice</title><link>https://a.example/two</link><pubDate>${iso(2)}</pubDate><description>First copy</description></item>
<item><title>Same headline twice</title><link>https://a.example/two-dup</link><pubDate>${iso(3)}</pubDate><description>Second copy</description></item>
<item><title>Bad link story</title><link>javascript:alert(1)</link><pubDate>${iso(1)}</pubDate></item>
<item><title>Data image story about a ransomware breach</title><link>https://a.example/three</link><pubDate>${iso(4)}</pubDate><enclosure url="data:image/png;base64,AAAA" type="image/png"/><description>The post Data image story appeared first on A.</description></item>
</channel></rss>`;
const ATOM = () => `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>B</title>
<entry><title>New iPhone hands-on</title><link rel="alternate" href="https://b.example/iphone"/><published>${new Date(T - 5 * 36e5).toISOString()}</published>
<content type="html">&lt;figure&gt;&lt;img src="https://b.example/iphone.jpg"&gt;&lt;/figure&gt;&lt;p&gt;We tried the new phone. It is fast.&lt;/p&gt;</content></entry>
<entry><title>An entry with no picture</title><link href="https://b.example/nopic"/><updated>${new Date(T - 6 * 36e5).toISOString()}</updated><summary>Short &amp; sweet.</summary></entry></feed>`;
const MEDIA = () => `<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><item><title>Bengaluru startup ships an app</title><link>https://c.example/app</link><pubDate>${iso(7)}</pubDate><media:thumbnail url="https://c.example/app.jpg" width="640"/><description>A Bengaluru startup.</description></item></channel></rss>`;
const HN = () => `<rss version="2.0"><channel><item><title>Show HN: A tiny database</title><link>https://d.example/db</link><pubDate>${iso(8)}</pubDate><description><![CDATA[<p>Article URL: <a href="https://d.example/db">https://d.example/db</a></p><p>Points: 120</p>]]></description></item></channel></rss>`;
const ARTICLE = `<html><head><meta content="https://b.example/nopic-og.jpg" property="og:image"></head><body>x</body></html>`;
const SOURCES = [
  { name: 'Alpha', domain: 'a.example', urls: ['https://feeds.test/a'] },
  { name: 'Beta', domain: 'b.example', urls: ['https://feeds.test/b'] },
  { name: 'Gamma', domain: 'c.example', urls: ['https://feeds.test/missing', 'https://feeds.test/c'], india: true, cat: 'Economy' },
  { name: 'Hacker News', domain: 'news.ycombinator.com', urls: ['https://feeds.test/hn'] },
  { name: 'Missing', domain: 'm.example', urls: ['https://feeds.test/missing'] },
  { name: 'Broken', domain: 'x.example', urls: ['https://feeds.test/broken'] }
];
const pages = () => ({ 'https://feeds.test/a': RSS(), 'https://feeds.test/b': ATOM(), 'https://feeds.test/c': MEDIA(), 'https://feeds.test/hn': HN(), 'https://feeds.test/broken': '<html><body>Service unavailable</body></html>', 'https://b.example/nopic': ARTICLE });
const fakeFetch = (fail) => async (url) => {
  const P = pages();
  if (fail || !(url in P)) return { ok: false, status: 404, text: async () => 'nope' };
  return { ok: true, status: 200, text: async () => P[url] };
};
const quiet = () => {};
let passed = 0; const t = (name, fn) => { fn(); passed++; console.log('ok   ' + name); };

fs.rmSync(OUT, { recursive: true, force: true });

// unit checks
t('plain text from HTML, no em dash, no scripts', () => {
  const it = parseFeed(RSS(), 'https://feeds.test/a')[0];
  assert.equal(it.title, 'OpenAI raises $10B & more – India push');
  assert.equal(it.snippet, 'Big round for the AI lab.');
  assert.equal(it.image, 'https://a.example/one.jpg');
});
t('tracking parameters and fragments removed from links', () => assert.equal(cleanUrl('https://A.example/x/?utm_source=rss&id=7#top'), 'https://a.example/x?id=7'));
t('snippets stop at 160 characters on a word', () => { const s = snippet('word '.repeat(80)); assert.ok(s.length <= 160 && s.endsWith('…')); });
t('Atom with escaped HTML gives its picture', () => assert.equal(parseFeed(ATOM(), 'https://feeds.test/b')[0].image, 'https://b.example/iphone.jpg'));
t('a page that is not a feed is rejected', () => assert.throws(() => parseFeed('<html></html>')));

// the whole run
const r1 = await run({ fetch: fakeFetch(false), out: OUT, cache: CACHE, base: 'https://paiir.in/news', sources: SOURCES, log: quiet, now: NOW, skipPage: true });
const news = JSON.parse(fs.readFileSync(path.join(OUT, 'news.json'), 'utf8')), ids = news.stories.map(s => s.id);
t('the run succeeds with two feeds failing', () => assert.equal(r1.ok, true));
t('failed feeds are reported, the rest updated', () => {
  const by = Object.fromEntries(news.sources.map(s => [s.name, s.ok]));
  assert.deepEqual(by, { Alpha: true, Beta: true, Gamma: true, 'Hacker News': true, Missing: false, Broken: false });
});
t('a backup URL is used when the first one fails', () => assert.ok(news.stories.some(s => s.source === 'Gamma')));
t('duplicates removed, unsafe links dropped', () => {
  assert.equal(news.stories.filter(s => s.title === 'Same headline twice').length, 1);
  assert.ok(!news.stories.some(s => s.title === 'Bad link story'));
  assert.equal(new Set(ids).size, ids.length);
});
t('newest first', () => { const ts = news.stories.map(s => Date.parse(s.published)); assert.deepEqual([...ts].sort((a, b) => b - a), ts); });
t('only http/https images; og:image used when the feed has none', () => {
  assert.ok(news.stories.every(s => !s.image || /^https?:\/\//.test(s.image)));
  assert.equal(news.stories.find(s => s.title === 'An entry with no picture').image, 'https://b.example/nopic-og.jpg');
  assert.equal(news.stories.find(s => s.title.startsWith('Data image')).image, '');
});
t('categories and India tags', () => {
  const g = n => news.stories.find(s => s.title.startsWith(n));
  assert.equal(g('OpenAI').category, 'AI'); assert.ok(g('OpenAI').tags.includes('India'));
  assert.equal(g('Bengaluru').category, 'Economy', 'a topic source gives its topic');
  assert.equal(g('Data image').category, 'Security'); assert.equal(g('New iPhone').category, 'Gadgets');
  assert.ok(g('Bengaluru').tags.includes('India'));
});
t('every story has a summary for the phone cards, at least as long as its snippet', () => {
  assert.ok(news.stories.every(s => typeof s.summary === 'string' && s.summary.length >= s.snippet.length && s.summary.length <= 430));
  assert.equal(news.stories.find(s => s.title.startsWith('New iPhone')).summary, 'We tried the new phone. It is fast.');
});
t('story pages get the publisher\'s longer feed text: paragraphs, about 15 lines at most, ending on a sentence', () => {
  const html = '<p>' + 'One sentence sits here. '.repeat(8) + '</p><figure><img src="https://a.example/p.jpg"><figcaption>A caption that should not be shown</figcaption></figure>' +
    '<p>A second paragraph with enough words in it.</p><p>The post Something big appeared first on Some Site.</p><p>' + 'Another long sentence keeps going. '.repeat(60) + '</p>';
  const b = bodyText(html), all = b.join(' ');
  assert.ok(b.length >= 3, 'paragraphs kept apart');
  assert.ok(all.length <= 1400, 'about 15 lines at most');
  assert.ok(!all.includes('caption') && !/appeared first on/.test(all), 'no captions or feed footers');
  assert.match(b[b.length - 1], /[.!?]$/, 'ends on a full sentence');
  assert.ok(!fs.readFileSync(path.join(OUT, 'news.json'), 'utf8').includes('"body"'), 'news.json stays light');
});
t('Hacker News link text is not used as a snippet', () => assert.equal(news.stories.find(s => s.source === 'Hacker News').snippet, ''));
t('story pages exist with the story and escaped preview tags', () => {
  const s = news.stories.find(x => x.title.startsWith('OpenAI')), html = fs.readFileSync(path.join(OUT, 's', s.id + '.html'), 'utf8');
  assert.match(html, /<meta property="og:title" content="OpenAI raises \$10B &amp; more – India push">/);
  assert.ok(html.includes('og:image" content="https://wsrv.nl/?url=https%3A%2F%2Fa.example%2Fone.jpg&amp;w=1200&amp;h=630&amp;fit=cover&amp;a=attention&amp;output=jpg&amp;q=65"'), 'a small JPEG preview WhatsApp can show');
  assert.ok(html.includes('og:image:width" content="1200"'));
  assert.match(html, /<meta property="og:site_name" content="Paiir News">/);
  assert.match(html, /twitter:card" content="summary_large_image"/);
  assert.ok(!html.includes('location.replace('), 'the story page is a page, not a redirect');
  assert.match(html, /<h1 class="sp-t">OpenAI raises \$10B &amp; more – India push<\/h1>/);
  assert.ok(html.includes('href="' + s.link + '" target="_blank" rel="noopener noreferrer">Read the full story at ' + s.source), 'it links on to the publisher');
  assert.match(html, /<script src="\/news\/story\.js\?v=[a-f0-9]{10}" defer><\/script>/, 'story.js (versioned, from this site) adds more stories, Dim light and share');
  assert.match(html, /<link rel="stylesheet" href="\/news\/news\.css\?v=[a-f0-9]{10}">/, 'news.css versioned, so a release shows at once');
  assert.ok(html.includes('class="sp-ad"') && html.includes('Sponsored'), 'a clearly marked sponsored slot');
  assert.ok(html.includes('class="nh-home"'), 'a Home button in the header');
  const noimg = news.stories.find(x => x.title.startsWith('Data image'));
  assert.match(fs.readFileSync(path.join(OUT, 's', noimg.id + '.html'), 'utf8'), /og:image" content="https:\/\/paiir\.in\/news\/brand\/og-default\.png"/);
});
t('story page escapes hostile text, in the page and in its data', () => {
  const h = sharePage({ id: 'abcdef0123', title: '"><script>x</script>', snippet: '', source: 'S', image: 'javascript:alert(1)' }, 'https://paiir.in/news', 'https://paiir.in/news/brand/og-default.png');
  assert.ok(!h.includes('<script>x</script>')); assert.ok(h.includes('og:image" content="https://paiir.in/news/brand/og-default.png"'));
  assert.ok(!/<\/script>x/.test(h) && h.includes('\\u003cscript>x\\u003c/script>'), 'the title inside the page data cannot close the script');
  assert.ok(!h.includes('javascript:'), 'no unsafe picture');
});
const before = fs.readFileSync(path.join(OUT, 'news.json'), 'utf8');
const r2 = await run({ fetch: fakeFetch(true), out: OUT, cache: CACHE, base: 'https://paiir.in/news', sources: SOURCES, log: quiet, now: NOW + 36e5, skipPage: true });
t('when every feed fails, the old news.json stays', () => { assert.equal(r2.ok, false); assert.equal(fs.readFileSync(path.join(OUT, 'news.json'), 'utf8'), before); });
const late = NOW + 40 * 864e5;
T = late; // the feeds have moved on: new stories, dated against the later clock
await run({ fetch: async (u) => (u === 'https://feeds.test/a' ? { ok: false, status: 500, text: async () => '' } : fakeFetch(false)(u)), out: OUT, cache: CACHE, base: 'https://paiir.in/news', sources: SOURCES, log: quiet, now: late, skipPage: true });
t('share pages older than 30 days are removed', () => {
  const one = news.stories.find(x => x.title.startsWith('OpenAI'));
  assert.equal(fs.existsSync(path.join(OUT, 's', one.id + '.html')), false);
});
// a fresh build on GitHub starts from an empty folder: the stories and share pages come back from the cache
const FRESH = path.join(OUT, 'fresh');
const r3 = await run({ fetch: fakeFetch(true), out: FRESH, cache: CACHE, base: 'https://paiir.in/news', sources: SOURCES, log: quiet, now: late + 36e5, skipPage: true });
t('a fresh build with every feed down still publishes the last good stories and their share pages', () => {
  assert.equal(r3.ok, false);
  const d = JSON.parse(fs.readFileSync(path.join(FRESH, 'news.json'), 'utf8'));
  assert.ok(d.stories.length > 0);
  assert.ok(d.stories.every(s => fs.existsSync(path.join(FRESH, 's', s.id + '.html'))));
});
t('page addresses are filled in for paiir.in/news', () => {
  const P = path.join(OUT, 'page'); publishPage(P, 'https://paiir.in/news', 'https://paiir.in/');
  const html = fs.readFileSync(path.join(P, 'index.html'), 'utf8'), js = fs.readFileSync(path.join(P, 'news.js'), 'utf8');
  assert.ok(!/\{\{(HOME|BASE|PATH|V)\}\}/.test(html + js));
  assert.ok(html.includes('og:image" content="https://paiir.in/news/brand/og-default.png"'));
  assert.match(html, /href="\/news\/news\.css\?v=[a-f0-9]{10}"/, 'the stylesheet is versioned, so a release shows at once');
  assert.match(html, /src="\/news\/news\.js\?v=[a-f0-9]{10}"/, 'the script is versioned too');
  assert.ok(js.includes("fetch('/news/news.json?t='"));
  assert.ok(js.includes("NEWS = 'https://paiir.in/news/'") && js.includes("HOME = 'https://paiir.in/'"));
  assert.ok(html.includes('href="https://paiir.in/#bridge"'));
});
fs.rmSync(OUT, { recursive: true, force: true });
console.log('\n' + passed + ' checks passed');
