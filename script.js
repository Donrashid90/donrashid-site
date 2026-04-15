document.addEventListener("DOMContentLoaded", () => {
  const listenBtn = document.querySelector(".listen-btn");
  const playerSection = document.getElementById("player-section");

  if (listenBtn && playerSection) {
    listenBtn.addEventListener("click", (e) => {
      e.preventDefault();
      playerSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }
});
