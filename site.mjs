// Paiir News inside the main site's local preview (http://localhost:5500/news/): same build, written to
// ../paiir-site/news, with links back to the site's own pages.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './fetch-news.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
await run({ out: path.join(HERE, '../paiir-site/news'), base: 'http://localhost:5500/news', home: '../' });
