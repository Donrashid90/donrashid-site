# Don Rashid SEO — deployment and Search Console handoff

Website: https://donrashid.com/
Repository: Donrashid90/donrashid-site

## Added
- `robots.txt` with sitemap directive
- `sitemap.xml` for core artist pages
- Crawlable, canonical, descriptive static pages for Music, African Analog, Lowrider and About
- Structured data for the album, song, and artist profile
- Existing public brand URLs reused; no invented direct track or album links

## Google Search Console (account owner must do)
1. Visit https://search.google.com/search-console
2. Add a **Domain** property: `donrashid.com`
3. Copy the unique TXT verification value shown by Google.
4. At the authoritative DNS provider for the domain (Namecheap if it hosts the DNS), add the supplied TXT record for the root (@), preserving existing records.
5. Return to Search Console and click Verify.
6. Under Sitemaps, submit `https://donrashid.com/sitemap.xml`.
7. Inspect `https://donrashid.com/`, `/music/`, `/albums/african-analog/`, `/tracks/lowrider/`, `/about/` and request indexing if necessary.
8. Monitor Google Search Console > Performance and Pages over the coming weeks.

Note: A URL-prefix property may alternatively be verified via an HTML file or meta tag, but the token must come from the signed-in Google account. Do not publish random verification tokens.

## Post-deployment checks
- Verify every sitemap URL serves an HTTP 200 with crawlable HTML.
- Verify `robots.txt` and `sitemap.xml` return HTTP 200.
- Verify canonical URL, title, descriptions and JSON-LD.
- Test mobile layout and pages in PageSpeed Insights.
- Update album or track links when their verified Spotify release URLs are known.
- Audit Search Console regularly; rankings are not guaranteed.
