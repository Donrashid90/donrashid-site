# DON RASHID — visitor stats (Cloudflare Web Analytics)

**Site:** https://donrashid.com
**GitHub Pages:** this repo's main branch
**Status:** installed, **inactive until a Cloudflare site token is entered** in /analytics.js.

## One-time activation

1. Sign in or sign up at https://dash.cloudflare.com.
2. Open **Analytics & Logs → Web Analytics** (or search for **Web Analytics**).
3. Choose **Add a site**. Enter hostname **donrashid.com**. Do **not** migrate DNS.
4. Open **Manage site**, copy the JavaScript beacon snippet.
5. In `analytics.js` replace `const SITE_TOKEN = '';` with the **public site token** from `data-cf-beacon='{"token":"..."}'` (or provide just that snippet to your developer).
6. Push to main and check the **Web Analytics** dashboard after visiting the site in a normal browser.

**Security:** never share your Cloudflare password, login code, or API key. The site token is a public site identifier.

## Coverage

The /analytics.js loader is shared by all public artist HTML pages using /artist.js and the /games/ hub. It is hostname-limited to donrashid.com (and www). Subdomain games such as game.donrashid.com, horsefarm.donrashid.com, and trading tools are not modified or tracked by this change. The script does not fire any Cloudflare requests until a site token is entered.

## Data history and limitations

Cloudflare Web Analytics records visits from the time it is activated; it cannot retroactively show visits from before tracking started. Google Search Console can provide historical Google search clicks, but not all visitors.

Official documentation:
https://developers.cloudflare.com/web-analytics/get-started/
