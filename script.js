function togglePlayer() {
    const player = document.getElementById("player");

    if (player.classList.contains("hidden")) {
        player.classList.remove("hidden");
    } else {
        player.classList.add("hidden");
    }
}