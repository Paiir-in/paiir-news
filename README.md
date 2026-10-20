# Paiir News

Free tech news, every hour, at paiir.in/news. Headlines from 10 public feeds (TechCrunch, The Verge, Ars Technica,
Wired, Engadget, MIT Technology Review, Hacker News, Inc42, YourStory, Gadgets 360), each linking to the original.
Every story has a Paiir share link with a proper preview. No ads, no tracking, no keys, nothing paid.

## On your computer

- `npm run dev` fetches the news and opens it at http://localhost:5600 (and on your phone on the same Wi-Fi).
- `npm test` checks the feed script with sample feeds, including a missing and a broken one.
- `npm run news` builds `_site` exactly as GitHub does every hour.

Needs Node.js 20 or newer. There is nothing to install.

## How it updates and where it lives

`.github/workflows/update-news.yml` runs every hour (and from the "Run workflow" button): it checks the script, fetches
the feeds, builds `_site` and publishes it on GitHub Pages. Nothing is committed each hour. A small memory between runs
(the last good stories, images already found and 30 days of share links) is kept in the Actions cache. If a feed fails
the others still update; if every feed fails, the last good stories stay up.

The paiir.in site (Vercel) passes every `/news` address through to this Pages site, so visitors and share links stay
on paiir.in/news. Share pages are `s/<id>.html`, served at `/news/s/<id>`.
