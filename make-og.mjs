// Paiir News: the default share image (1200x630) for stories without a picture. Run once on this computer (it uses the
// Playwright browser from paiir-app): npm run og. The result, page/brand/og-default.png, is kept in the repository.
// Soft blue background, "Paiir News" and paiir.in on the left, the Wink mark in a white circle on the right.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)('D:/Build_Paiir/paiir-app/node_modules/playwright');
const mark = fs.readFileSync(path.join(HERE, 'page/brand/paiir-mark.svg'), 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/, '');
const html = `<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@500;600;700&display=swap">
<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;display:flex;align-items:center;justify-content:space-between;padding:0 96px;background:#EEF4FF;font-family:Figtree,sans-serif}
.t b{display:block;font-size:104px;font-weight:700;letter-spacing:-.03em;line-height:1;color:#111318}.t i{display:block;margin-top:22px;font-style:normal;font-size:44px;font-weight:600;color:#0A6CFF}
.t span{display:block;margin-top:40px;font-size:34px;font-weight:500;color:#5A6273}.m{display:grid;place-items:center;width:330px;height:330px;border-radius:50%;background:#FFFFFF}.m svg{width:190px;height:auto;overflow:visible}</style></head>
<body><div class="t"><b>Paiir News</b><i>Tech news, every hour.</i><span>paiir.in</span></div><div class="m">${mark}</div></body></html>`;
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: path.join(HERE, 'page/brand/og-default.png') });
await b.close();
console.log('wrote page/brand/og-default.png');
