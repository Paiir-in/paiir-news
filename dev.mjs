// Paiir News on this computer, built exactly as the hourly GitHub Action builds news.paiir.in, then served.
//   npm run dev                 fetch the news, build _site, serve it at http://localhost:5600
//   npm run dev -- --no-fetch   serve the _site that is already there
// Links back to paiir.in point at the main site's own preview (http://localhost:5500), if it is running.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './fetch-news.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), PORT = +(process.env.PORT || 5600), ROOT = path.join(HERE, '_site');
if (!process.argv.includes('--no-fetch')) await run({ out: ROOT, base: 'http://localhost:' + PORT, home: process.env.NEWS_HOME || 'http://localhost:5500/' });

// a small static server that behaves like GitHub Pages: folder addresses end in "/", and index.html is the page
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
http.createServer((req, res) => {
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
  let f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
    if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '') }); return res.end(); }
    f = path.join(f, 'index.html');
  }
  if (!fs.existsSync(f) && !path.extname(f) && fs.existsSync(f + '.html')) f += '.html';
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(PORT, () => {
  const lan = Object.values(os.networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a.address).sort((a, b) => (b.startsWith('192.168.') ? 1 : 0) - (a.startsWith('192.168.') ? 1 : 0));
  console.log('\nPaiir News is running.\n  On this computer:  http://localhost:' + PORT + '/' + (lan[0] ? '\n  On your phone:     http://' + lan[0] + ':' + PORT + '/   (same Wi-Fi)' : '') + '\n');
});
