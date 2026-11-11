document.documentElement.classList.add('dr-nav-ready');

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.dr-header');
  const menu = header.querySelector('.dr-menu');
  const nav = header.querySelector('.dr-nav');

  function closeNavigation(restoreFocus = false) {
    if (menu.getAttribute('aria-expanded') !== 'true') return;
    menu.setAttribute('aria-expanded', 'false');
    if (restoreFocus) menu.focus();
  }

  menu.hidden = false;
  menu.addEventListener('click', () => {
    menu.setAttribute('aria-expanded', String(menu.getAttribute('aria-expanded') !== 'true'));
  });
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeNavigation(true);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNavigation(true);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!header.contains(event.target)) closeNavigation(header.contains(document.activeElement));
  });
  window.matchMedia('(max-width: 900px)').addEventListener('change', () => closeNavigation());
});

// Shared visitor-statistics loader for official Don Rashid artist pages.
// Analytics stays disabled until the public Cloudflare site token is set
// in /analytics.js. This does not load analytics on separate game sites.
if (location.hostname === 'donrashid.com' || location.hostname === 'www.donrashid.com') {
  const analyticsLoader = document.createElement('script');
  analyticsLoader.src = '/analytics.js';
  analyticsLoader.defer = true;
  document.head.appendChild(analyticsLoader);
}
