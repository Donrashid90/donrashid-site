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

const lowriderLaunch = document.getElementById('lowrider-launch');
const lowriderPlayer = document.getElementById('lowrider-player');

if (lowriderLaunch && lowriderPlayer && typeof lowriderPlayer.showModal === 'function') {
  const playerFrame = lowriderPlayer.querySelector('.feature-player-frame');
  lowriderLaunch.setAttribute('aria-haspopup', 'dialog');

  lowriderLaunch.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    lowriderPlayer.showModal();
    event.preventDefault();

    const video = document.createElement('iframe');
    video.src = 'https://www.youtube-nocookie.com/embed/lYDPsgbOppM?autoplay=1';
    video.title = 'LOWRIDER — Don Rashid official music video';
    video.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    video.allowFullscreen = true;
    video.referrerPolicy = 'strict-origin-when-cross-origin';
    playerFrame.replaceChildren(video);
  });

  lowriderPlayer.addEventListener('close', () => {
    playerFrame.replaceChildren();
    lowriderLaunch.focus();
  });
}
