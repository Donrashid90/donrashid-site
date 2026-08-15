document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");
  const navLinks = nav ? nav.querySelectorAll("a") : [];
  const year = document.getElementById("year");

  const closeMenu = () => {
    if (!menuToggle || !nav) return;
    menuToggle.classList.remove("active");
    nav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    document.body.classList.remove("menu-open");
  };

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      menuToggle.classList.toggle("active", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
      document.body.classList.toggle("menu-open", isOpen);
    });

    navLinks.forEach((link) => link.addEventListener("click", closeMenu));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 24);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
});
