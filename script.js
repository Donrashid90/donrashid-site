const revealItems = document.querySelectorAll('[data-reveal]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reducedMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.06 });

  revealItems.forEach((item) => {
    item.classList.add('dr-reveal');
    observer.observe(item);
  });
}

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
