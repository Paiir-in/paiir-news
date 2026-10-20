# Paiir News

Free tech news, every hour, at news.paiir.in. Headlines from 10 public feeds (TechCrunch, The Verge, Ars Technica,
Wired, Engadget, MIT Technology Review, Hacker News, Inc42, YourStory, Gadgets 360), each linking to the original.
Every story has a Paiir share link with a proper preview. No ads, no tracking, no keys, nothing paid.

## On your computer

- `npm run dev` fetches the news and opens it at http://localhost:5600 (and on your phone on the same Wi-Fi).
- `npm test` checks the feed script with sample feeds, including a missing and a broken one.
- `npm run news` builds `_site` exactly as GitHub does every hour.

Needs Node.js 20 or newer. There is nothing to install.

## How it updates

`.github/workflows/update-news.yml` runs every hour (and from the "Run workflow" button): it checks the script, fetches
the feeds, builds `_site` and publishes it on GitHub Pages. Nothing is committed each hour. A small memory between runs
(the last good stories, images already found and 30 days of share links) is kept in the Actions cache. If a feed fails
the others still update; if every feed fails, the last good stories stay up.

## Going live (one time)

1. Push this repository to GitHub as a public repository (Pages and Actions are free for public repositories).
2. Settings, Pages, Source: **GitHub Actions**.
3. Actions, "Update news", **Run workflow** once.
4. Settings, Pages, Custom domain: `news.paiir.in`. At your DNS provider add a CNAME record: name `news`, value
   `<your-github-username>.github.io`. Then tick **Enforce HTTPS**.
