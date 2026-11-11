/**
 * DON RASHID — Cloudflare Web Analytics
 *
 * SETUP: Once you've added "donrashid.com" in Cloudflare Web Analytics,
 * paste ONLY the site token (data-cf-beacon.token) into SITE_TOKEN below.
 * The token is a public website identifier, NOT a Cloudflare API key.
 *
 * No network request to Cloudflare is made until SITE_TOKEN is configured.
 * Only the artist website is tracked; games and trading applications on
 * separate subdomains are intentionally excluded.
 */
(() => {
  'use strict';

  const SITE_TOKEN = '';

  const host = window.location.hostname.toLowerCase();
  if (host !== 'donrashid.com' && host !== 'www.donrashid.com') return;

  const token = SITE_TOKEN.trim();
  if (!token) return;

  if (document.querySelector('script[data-cf-beacon]')) return;

  const beacon = document.createElement('script');
  beacon.type = 'module';
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.setAttribute('data-cf-beacon', JSON.stringify({ token }));
  document.head.appendChild(beacon);
})();
