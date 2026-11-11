# DON RASHID — visitor stats (Cloudflare Web Analytics)

**Site:** https://donrashid.com
**GitHub Pages:** this repo's main branch
**Status:** Active Cloudflare website token configured on 2026-11-11. GitHub Pages deployment and Cloudflare reception should be verified.

## Activation completed / verification

Cloudflare Web Analytics site was created for `donrashid.com` and its public token added to `/analytics.js`. Once GitHub Pages finishes deploying, visit the site in a normal browser and check the **Cloudflare → Analytics & Logs → Web Analytics** dashboard for incoming page views. DNS does not need to be changed.

**Security:** never share your Cloudflare password, login code, or API key. The site token is a public site identifier.

## Coverage

The /analytics.js loader is shared by all public artist HTML pages using /artist.js and the /games/ hub. It is hostname-limited to donrashid.com (and www). Subdomain games such as game.donrashid.com, horsefarm.donrashid.com, and trading tools are not modified or tracked by this change. The script does not fire any Cloudflare requests until a site token is entered.

## Data history and limitations

Cloudflare Web Analytics records visits from the time it is activated; it cannot retroactively show visits from before tracking started. Google Search Console can provide historical Google search clicks, but not all visitors.

Official documentation:
https://developers.cloudflare.com/web-analytics/get-started/
