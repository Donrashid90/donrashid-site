const header = document.querySelector('.dr-header');
const menu = header.querySelector('.dr-menu');
const nav = header.querySelector('.dr-nav');

function closeNavigation(restoreFocus = false) {
  if (menu.getAttribute('aria-expanded') !== 'true') return;
  menu.setAttribute('aria-expanded', 'false');
  if (restoreFocus) menu.focus();
}

header.classList.add('dr-nav-ready');
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
