document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const canvasShell = document.getElementById("gameCanvasShell");
  const overlay = document.getElementById("gameOverlay");
  const overlayKicker = document.getElementById("overlayKicker");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const startButton = document.getElementById("startButton");
  const hydraulicButton = document.getElementById("hydraulicButton");
  const pauseButton = document.getElementById("pauseButton");
  const scoreValue = document.getElementById("scoreValue");
  const bestValue = document.getElementById("bestValue");
  const runStatus = document.getElementById("runStatus");
  const announcement = document.getElementById("gameAnnouncement");
  const scoreEntry = document.getElementById("scoreEntry");
  const scoreName = document.getElementById("scoreName");
  const scoreSubmit = document.getElementById("scoreSubmit");
  const scoreEntryStatus = document.getElementById("scoreEntryStatus");
  const leaderboardRoot = document.getElementById("leaderboard");
  const leaderboardList = document.getElementById("leaderboardList");
  const leaderboardStatus = document.getElementById("leaderboardStatus");
  const leaderboardRefresh = document.getElementById("leaderboardRefresh");

  if (!canvas || !canvasShell) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const VIEW_W = 960;
  const VIEW_H = 540;
  const ROAD_TOP = 370;
  const GROUND_Y = 414;
  const GRAVITY = 1100;
  const HYDRAULIC_IMPULSE = -620;
  const STORAGE_KEY = "don-rashid-lowrider-night-run-best-v1";
  const NICKNAME_KEY = "don-rashid-lowrider-night-run-nickname-v1";
  const LEADERBOARD_API = leaderboardRoot?.dataset.apiUrl || "";

  let mode = "idle";
  let lastTime = 0;
  let elapsed = 0;
  let distance = 0;
  let score = 0;
  let speed = 285;
  let obstacleClock = 1.2;
  let pickupClock = 2.1;
  let announcementTimer = 0;
  let animationFrame = 0;
  let best = readBest();
  let leaderboardScores = [];
  let runSequence = 0;
  let currentRunId = null;
  let currentRunPromise = Promise.resolve(null);
  let qualifiedScore = null;
  let qualifiedDurationMs = null;

  const player = {
    x: 142,
    y: 0,
    vy: 0,
    grounded: true,
    tilt: 0,
    compression: 0
  };

  const obstacles = [];
  const pickups = [];
  const particles = [];

  const stars = Array.from({ length: 72 }, (_, index) => ({
    x: (index * 137.3) % VIEW_W,
    y: 28 + ((index * 83.7) % 245),
    radius: index % 9 === 0 ? 1.45 : .65,
    alpha: .18 + ((index * 17) % 55) / 100
  }));

  const skyline = Array.from({ length: 30 }, (_, index) => ({
    x: index * 48,
    width: 29 + (index * 19) % 42,
    height: 44 + (index * 37) % 118,
    antenna: index % 7 === 0
  }));

  function readBest() {
    try {
      const stored = Number.parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
      return Number.isFinite(stored) ? stored : 0;
    } catch (error) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (error) {
      // The game remains fully playable when local storage is unavailable.
    }
  }

  function readNickname() {
    try {
      return localStorage.getItem(NICKNAME_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function saveNickname(value) {
    try {
      localStorage.setItem(NICKNAME_KEY, value);
    } catch (error) {
      // Remembering a nickname is optional and never blocks score submission.
    }
  }

  function setLeaderboardStatus(message = "", isError = false) {
    if (!leaderboardStatus) return;
    leaderboardStatus.textContent = message;
    leaderboardStatus.classList.toggle("is-error", isError);
  }

  function setScoreEntryStatus(message = "", isError = false) {
    if (!scoreEntryStatus) return;
    scoreEntryStatus.textContent = message;
    scoreEntryStatus.classList.toggle("is-error", isError);
  }

  function renderLeaderboard(scores) {
    if (!leaderboardList) return;
    leaderboardList.replaceChildren();

    if (!scores.length) {
      const empty = document.createElement("li");
      empty.className = "leaderboard-empty";
      empty.textContent = "No scores yet — be the first name on the boulevard.";
      leaderboardList.append(empty);
      return;
    }

    scores.forEach((entry) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const points = document.createElement("strong");
      name.className = "leaderboard-name";
      points.className = "leaderboard-score";
      name.textContent = entry.name;
      points.textContent = formatScore(entry.score);
      item.append(name, points);
      leaderboardList.append(item);
    });
  }

  async function requestLeaderboard(options = {}) {
    if (!LEADERBOARD_API) throw new Error("Leaderboard is not configured");
    const headers = { ...(options.headers || {}) };
    if (options.body) headers["Content-Type"] = "application/json";
    const response = await fetch(LEADERBOARD_API, {
      cache: "no-store",
      credentials: "omit",
      ...options,
      headers
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Leaderboard is temporarily unavailable");
    return payload;
  }

  async function loadLeaderboard(showProgress = true) {
    if (showProgress) setLeaderboardStatus("Refreshing worldwide scores…");
    if (leaderboardRefresh) leaderboardRefresh.disabled = true;

    try {
      const payload = await requestLeaderboard();
      leaderboardScores = Array.isArray(payload.scores) ? payload.scores : [];
      renderLeaderboard(leaderboardScores);
      setLeaderboardStatus(leaderboardScores.length ? "Worldwide scores are live." : "The boulevard is ready for its first record.");
      return true;
    } catch (error) {
      if (!leaderboardScores.length && leaderboardList) {
        leaderboardList.replaceChildren();
        const empty = document.createElement("li");
        empty.className = "leaderboard-empty";
        empty.textContent = "Worldwide scores are temporarily unavailable.";
        leaderboardList.append(empty);
      }
      setLeaderboardStatus("Could not reach the worldwide leaderboard. Your local best still works.", true);
      return false;
    } finally {
      if (leaderboardRefresh) leaderboardRefresh.disabled = false;
    }
  }

  async function beginVerifiedRun(sequence) {
    currentRunId = null;
    try {
      const payload = await requestLeaderboard({
        method: "POST",
        body: JSON.stringify({ action: "start" })
      });
      if (sequence !== runSequence || typeof payload.runId !== "string") return null;
      currentRunId = payload.runId;
      return currentRunId;
    } catch (error) {
      return null;
    }
  }

  function resetScoreEntry() {
    qualifiedScore = null;
    qualifiedDurationMs = null;
    if (scoreEntry) scoreEntry.hidden = true;
    if (scoreName) {
      scoreName.disabled = false;
      scoreName.value = readNickname();
    }
    if (scoreSubmit) {
      scoreSubmit.disabled = false;
      scoreSubmit.textContent = "Save score →";
    }
    setScoreEntryStatus();
  }

  async function offerWorldwideScore(finalScore, durationMs, sequence) {
    const [runId, boardAvailable] = await Promise.all([
      currentRunPromise,
      loadLeaderboard(false)
    ]);

    if (sequence !== runSequence || mode !== "gameover") return;
    if (!runId || !boardAvailable || durationMs < 1500) return;

    const lastPlace = leaderboardScores[9];
    const madeTopTen = leaderboardScores.length < 10 || finalScore > Number(lastPlace?.score || 0);
    if (!madeTopTen) return;

    qualifiedScore = finalScore;
    qualifiedDurationMs = durationMs;
    if (scoreEntry) scoreEntry.hidden = false;
    if (overlayKicker) overlayKicker.textContent = "Boulevard Top 10";
    if (overlayText) overlayText.textContent = "Enter a public nickname below to put this run on the worldwide board.";
    if (runStatus) runStatus.textContent = "Top 10 run — enter your nickname";
  }

  function formatScore(value) {
    return Math.max(0, Math.floor(value)).toString().padStart(6, "0");
  }

  function updateHud() {
    if (scoreValue) scoreValue.textContent = formatScore(score);
    if (bestValue) bestValue.textContent = formatScore(best);
  }

  function resizeCanvas() {
    const rect = canvasShell.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    drawScene();
  }

  function setOverlay({ kicker, title, text, button }) {
    if (overlayKicker) overlayKicker.textContent = kicker;
    if (overlayTitle) overlayTitle.innerHTML = title;
    if (overlayText) overlayText.textContent = text;
    if (startButton) startButton.firstChild.textContent = `${button} `;
    if (overlay) overlay.classList.add("is-visible");
  }

  function hideOverlay() {
    if (overlay) overlay.classList.remove("is-visible");
  }

  function showAnnouncement(message) {
    if (!announcement) return;
    announcement.textContent = message;
    announcement.classList.add("is-visible");
    announcementTimer = 1.15;
  }

  function resetPlayer() {
    player.y = 0;
    player.vy = 0;
    player.grounded = true;
    player.tilt = 0;
    player.compression = 0;
  }

  function startGame() {
    runSequence += 1;
    const sequence = runSequence;
    mode = "running";
    lastTime = performance.now();
    elapsed = 0;
    distance = 0;
    score = 0;
    speed = 285;
    obstacleClock = 1.15;
    pickupClock = 1.75;
    obstacles.length = 0;
    pickups.length = 0;
    particles.length = 0;
    resetScoreEntry();
    resetPlayer();
    hideOverlay();
    if (pauseButton) {
      pauseButton.disabled = false;
      pauseButton.textContent = "Pause";
    }
    if (runStatus) runStatus.textContent = "Night run in progress";
    updateHud();
    currentRunPromise = beginVerifiedRun(sequence);
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(loop);
  }

  function endGame() {
    if (mode !== "running") return;
    mode = "gameover";
    const finalScore = Math.floor(score);
    const finalDurationMs = Math.floor(elapsed * 1000);
    const finishedRunSequence = runSequence;
    const isNewBest = finalScore > best;
    if (isNewBest) {
      best = finalScore;
      saveBest(best);
    }
    updateHud();
    if (pauseButton) pauseButton.disabled = true;
    if (runStatus) runStatus.textContent = isNewBest ? "New boulevard record" : "Run ended — chrome reset";
    setOverlay({
      kicker: isNewBest ? "New high score" : "Run complete",
      title: `${formatScore(finalScore)}<br />${isNewBest ? "NEW RECORD" : "TRY AGAIN"}`,
      text: isNewBest ? "The boulevard has a new number to beat." : "One clean jump can change the whole night.",
      button: "Run it back"
    });
    void offerWorldwideScore(finalScore, finalDurationMs, finishedRunSequence);
  }

  async function submitWorldwideScore(event) {
    event.preventDefault();
    if (!scoreName || !scoreSubmit || !currentRunId || qualifiedScore === null || qualifiedDurationMs === null) return;
    if (!scoreName.reportValidity()) return;

    const nickname = scoreName.value.trim().replace(/\s+/g, " ");
    scoreName.value = nickname;
    scoreName.disabled = true;
    scoreSubmit.disabled = true;
    scoreSubmit.textContent = "Saving…";
    setScoreEntryStatus("Saving your Top 10 run worldwide…");

    try {
      const payload = await requestLeaderboard({
        method: "POST",
        body: JSON.stringify({
          action: "submit",
          runId: currentRunId,
          name: nickname,
          score: qualifiedScore,
          durationMs: qualifiedDurationMs
        })
      });

      leaderboardScores = Array.isArray(payload.scores) ? payload.scores : leaderboardScores;
      renderLeaderboard(leaderboardScores);
      saveNickname(nickname);
      scoreSubmit.textContent = "Saved ✓";
      setScoreEntryStatus("Your score is now visible on the worldwide leaderboard.");
      setLeaderboardStatus("Worldwide scores updated.");
      if (runStatus) runStatus.textContent = "Worldwide score saved";
    } catch (error) {
      scoreName.disabled = false;
      scoreSubmit.disabled = false;
      scoreSubmit.textContent = "Try again →";
      setScoreEntryStatus(error instanceof Error ? error.message : "Score could not be saved.", true);
    }
  }

  function togglePause() {
    if (mode === "running") {
      mode = "paused";
      if (pauseButton) pauseButton.textContent = "Resume";
      if (runStatus) runStatus.textContent = "Run paused";
      setOverlay({
        kicker: "Night run paused",
        title: "HOLD<br />THE LINE",
        text: "The boulevard will wait. Resume when you are ready.",
        button: "Resume run"
      });
    } else if (mode === "paused") {
      mode = "running";
      lastTime = performance.now();
      if (pauseButton) pauseButton.textContent = "Pause";
      if (runStatus) runStatus.textContent = "Night run in progress";
      hideOverlay();
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(loop);
    }
  }

  function triggerHydraulics() {
    if (mode !== "running") return;
    if (!player.grounded) return;

    player.grounded = false;
    player.vy = HYDRAULIC_IMPULSE;
    player.compression = 1;
    player.tilt = -.055;

    for (let index = 0; index < 9; index += 1) {
      particles.push({
        x: player.x + 42 + Math.random() * 120,
        y: GROUND_Y + 5,
        vx: -45 - Math.random() * 110,
        vy: -18 - Math.random() * 55,
        life: .35 + Math.random() * .35,
        maxLife: .7,
        color: index % 3 === 0 ? "#cba25b" : "#46aeb3"
      });
    }

    if (hydraulicButton) {
      hydraulicButton.classList.add("is-active");
      window.setTimeout(() => hydraulicButton.classList.remove("is-active"), 150);
    }
  }

  function spawnObstacle() {
    const roll = Math.random();
    const kind = roll < .42 ? "cone" : roll < .74 ? "pothole" : "barrier";
    const dimensions = {
      cone: { width: 34, height: 50 },
      pothole: { width: 78, height: 15 },
      barrier: { width: 56, height: 52 }
    }[kind];

    obstacles.push({
      kind,
      x: VIEW_W + 80,
      width: dimensions.width,
      height: dimensions.height,
      counted: false
    });
  }

  function spawnPickup() {
    pickups.push({
      kind: Math.random() < .66 ? "token" : "cassette",
      x: VIEW_W + 70,
      y: 286 + Math.random() * 42,
      width: 42,
      height: 42,
      phase: Math.random() * Math.PI * 2
    });
  }

  function playerBounds() {
    return {
      x: player.x + 34,
      y: 336 + player.y,
      width: 136,
      height: 66
    };
  }

  function overlapsHorizontally(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x;
  }

  function overlaps(a, b) {
    return a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y;
  }

  function update(dt) {
    elapsed += dt;
    speed = Math.min(515, 285 + elapsed * 6.1);
    distance += speed * dt;
    score += dt * (25 + speed * .035);

    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;
    player.compression = Math.max(0, player.compression - dt * 3.8);

    if (player.y >= 0) {
      if (!player.grounded && player.vy > 180) {
        player.compression = .75;
        for (let index = 0; index < 5; index += 1) {
          particles.push({
            x: player.x + 32 + Math.random() * 140,
            y: GROUND_Y + 4,
            vx: -20 - Math.random() * 75,
            vy: -8 - Math.random() * 28,
            life: .25 + Math.random() * .25,
            maxLife: .5,
            color: "#596a69"
          });
        }
      }
      player.y = 0;
      player.vy = 0;
      player.grounded = true;
    }

    player.tilt += (0 - player.tilt) * Math.min(1, dt * 5.5);

    obstacleClock -= dt;
    if (obstacleClock <= 0) {
      spawnObstacle();
      const difficulty = Math.min(.55, elapsed / 115);
      obstacleClock = 1.35 + Math.random() * (1.05 - difficulty);
    }

    pickupClock -= dt;
    if (pickupClock <= 0) {
      spawnPickup();
      pickupClock = 2.05 + Math.random() * 2.3;
    }

    const car = playerBounds();

    for (let index = obstacles.length - 1; index >= 0; index -= 1) {
      const obstacle = obstacles[index];
      obstacle.x -= speed * dt;

      const obstacleY = obstacle.kind === "pothole" ? GROUND_Y - 8 : GROUND_Y - obstacle.height + 3;
      const hitbox = {
        x: obstacle.x + (obstacle.kind === "pothole" ? 8 : 4),
        y: obstacleY + (obstacle.kind === "pothole" ? 3 : 4),
        width: obstacle.width - (obstacle.kind === "pothole" ? 16 : 8),
        height: Math.max(9, obstacle.height - 5)
      };

      const hasHit = obstacle.kind === "pothole"
        ? player.grounded && overlapsHorizontally(car, hitbox)
        : overlaps(car, hitbox);

      if (hasHit) {
        endGame();
        return;
      }

      if (!obstacle.counted && obstacle.x + obstacle.width < player.x) {
        obstacle.counted = true;
        score += 35;
      }

      if (obstacle.x + obstacle.width < -100) obstacles.splice(index, 1);
    }

    for (let index = pickups.length - 1; index >= 0; index -= 1) {
      const pickup = pickups[index];
      pickup.x -= speed * dt;
      pickup.phase += dt * 4.5;
      const pickupY = pickup.y + Math.sin(pickup.phase) * 8;
      const hitbox = { x: pickup.x, y: pickupY, width: pickup.width, height: pickup.height };

      if (overlaps(car, hitbox)) {
        score += pickup.kind === "token" ? 250 : 400;
        showAnnouncement(pickup.kind === "token" ? "+250 DR TOKEN" : "+400 ANALOG TAPE");
        for (let spark = 0; spark < 13; spark += 1) {
          particles.push({
            x: pickup.x + pickup.width / 2,
            y: pickupY + pickup.height / 2,
            vx: -95 + Math.random() * 190,
            vy: -95 + Math.random() * 190,
            life: .35 + Math.random() * .45,
            maxLife: .8,
            color: spark % 2 ? "#edd498" : "#49b8bd"
          });
        }
        pickups.splice(index, 1);
        continue;
      }

      if (pickup.x + pickup.width < -80) pickups.splice(index, 1);
    }

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 135 * dt;
      if (particle.life <= 0) particles.splice(index, 1);
    }

    if (announcementTimer > 0) {
      announcementTimer -= dt;
      if (announcementTimer <= 0 && announcement) announcement.classList.remove("is-visible");
    }

    updateHud();
  }

  function pathRoundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, "#05070b");
    sky.addColorStop(.48, "#0b1b20");
    sky.addColorStop(.75, "#12363a");
    sky.addColorStop(1, "#090b0d");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const glow = ctx.createRadialGradient(755, 145, 8, 755, 145, 155);
    glow.addColorStop(0, "rgba(237, 212, 152, .22)");
    glow.addColorStop(.18, "rgba(203, 162, 91, .1)");
    glow.addColorStop(1, "rgba(203, 162, 91, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(575, 0, 360, 320);

    ctx.fillStyle = "rgba(237, 212, 152, .82)";
    ctx.beginPath();
    ctx.arc(755, 145, 24, 0, Math.PI * 2);
    ctx.fill();

    stars.forEach((star) => {
      const twinkle = .72 + Math.sin(elapsed * 1.3 + star.x) * .28;
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = "#f3f0e9";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawSkyline() {
    const offset = -((distance * .08) % 1440);
    ctx.save();
    ctx.fillStyle = "rgba(5, 8, 11, .88)";

    for (let repeat = 0; repeat < 3; repeat += 1) {
      skyline.forEach((building, index) => {
        const x = offset + repeat * 1440 + building.x;
        const y = ROAD_TOP - building.height;
        ctx.fillRect(x, y, building.width, building.height);

        if (building.antenna) {
          ctx.fillRect(x + building.width * .52, y - 25, 1.5, 25);
          ctx.fillStyle = "rgba(203, 162, 91, .65)";
          ctx.fillRect(x + building.width * .52 - 1, y - 27, 3, 3);
          ctx.fillStyle = "rgba(5, 8, 11, .88)";
        }

        for (let row = 0; row < Math.floor(building.height / 24); row += 1) {
          for (let column = 0; column < Math.floor(building.width / 16); column += 1) {
            if ((index + row * 2 + column * 3) % 5 !== 0) continue;
            ctx.fillStyle = (index + row) % 3 === 0 ? "rgba(203, 162, 91, .28)" : "rgba(73, 184, 189, .2)";
            ctx.fillRect(x + 8 + column * 14, y + 10 + row * 20, 3, 5);
          }
        }
        ctx.fillStyle = "rgba(5, 8, 11, .88)";
      });
    }
    ctx.restore();
  }

  function drawPalm(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "rgba(3, 5, 6, .88)";
    ctx.fillStyle = "rgba(3, 5, 6, .92)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-6, -61, 6, -122);
    ctx.stroke();

    ctx.translate(6, -122);
    for (let index = 0; index < 8; index += 1) {
      const angle = -Math.PI + index * (Math.PI / 7);
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(18, -8, 54, 4);
      ctx.quadraticCurveTo(24, 9, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPalms() {
    const offset = -((distance * .19) % 560);
    for (let repeat = -1; repeat < 4; repeat += 1) {
      drawPalm(offset + repeat * 560 + 220, ROAD_TOP + 8, .92);
      drawPalm(offset + repeat * 560 + 465, ROAD_TOP + 8, .7);
    }
  }

  function drawRoad() {
    const road = ctx.createLinearGradient(0, ROAD_TOP, 0, VIEW_H);
    road.addColorStop(0, "#14191b");
    road.addColorStop(.45, "#090b0d");
    road.addColorStop(1, "#050607");
    ctx.fillStyle = road;
    ctx.fillRect(0, ROAD_TOP, VIEW_W, VIEW_H - ROAD_TOP);

    ctx.fillStyle = "rgba(237, 212, 152, .24)";
    ctx.fillRect(0, ROAD_TOP + 3, VIEW_W, 1);

    const laneOffset = -((distance * 1.04) % 170);
    ctx.fillStyle = "rgba(237, 212, 152, .3)";
    for (let x = laneOffset - 170; x < VIEW_W + 170; x += 170) {
      ctx.save();
      ctx.transform(1, 0, -.2, 1, 0, 0);
      ctx.fillRect(x, 478, 86, 5);
      ctx.restore();
    }

    const reflection = ctx.createLinearGradient(0, ROAD_TOP, 0, VIEW_H);
    reflection.addColorStop(0, "rgba(44, 150, 158, .1)");
    reflection.addColorStop(1, "rgba(44, 150, 158, 0)");
    ctx.fillStyle = reflection;
    ctx.fillRect(0, ROAD_TOP, VIEW_W, VIEW_H - ROAD_TOP);

    ctx.strokeStyle = "rgba(255, 255, 255, .025)";
    ctx.lineWidth = 1;
    for (let index = 0; index < 7; index += 1) {
      const y = ROAD_TOP + 25 + index * index * 3.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_W, y);
      ctx.stroke();
    }
  }

  function drawCone(obstacle) {
    const x = obstacle.x;
    const y = GROUND_Y + 3;
    ctx.save();
    ctx.fillStyle = "#d18d45";
    ctx.beginPath();
    ctx.moveTo(x + obstacle.width / 2, y - obstacle.height);
    ctx.lineTo(x + obstacle.width - 6, y - 7);
    ctx.lineTo(x + 6, y - 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(243, 240, 233, .78)";
    ctx.fillRect(x + 10, y - 27, obstacle.width - 20, 7);
    ctx.fillStyle = "#a2632d";
    pathRoundRect(ctx, x, y - 9, obstacle.width, 10, 3);
    ctx.fill();
    ctx.restore();
  }

  function drawBarrier(obstacle) {
    const x = obstacle.x;
    const y = GROUND_Y - obstacle.height + 3;
    ctx.save();
    ctx.fillStyle = "#d8d4ca";
    pathRoundRect(ctx, x, y, obstacle.width, obstacle.height - 13, 3);
    ctx.fill();
    ctx.fillStyle = "#aa6431";
    for (let stripe = -15; stripe < obstacle.width + 20; stripe += 24) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, obstacle.width, obstacle.height - 13);
      ctx.clip();
      ctx.translate(x + stripe, y);
      ctx.rotate(-.58);
      ctx.fillRect(0, -5, 10, 80);
      ctx.restore();
    }
    ctx.fillStyle = "#6d7372";
    ctx.fillRect(x + 8, y + obstacle.height - 13, 6, 13);
    ctx.fillRect(x + obstacle.width - 14, y + obstacle.height - 13, 6, 13);
    ctx.restore();
  }

  function drawPothole(obstacle) {
    const x = obstacle.x;
    const y = GROUND_Y + 1;
    const hole = ctx.createRadialGradient(x + obstacle.width / 2, y, 3, x + obstacle.width / 2, y, obstacle.width / 2);
    hole.addColorStop(0, "rgba(0, 0, 0, .96)");
    hole.addColorStop(.62, "rgba(2, 3, 4, .82)");
    hole.addColorStop(1, "rgba(66, 73, 72, 0)");
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.ellipse(x + obstacle.width / 2, y, obstacle.width / 2, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(121, 126, 121, .42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 7, y - 2);
    ctx.lineTo(x - 2, y - 10);
    ctx.moveTo(x + obstacle.width - 8, y - 2);
    ctx.lineTo(x + obstacle.width + 8, y - 8);
    ctx.stroke();
  }

  function drawObstacles() {
    obstacles.forEach((obstacle) => {
      if (obstacle.kind === "cone") drawCone(obstacle);
      if (obstacle.kind === "barrier") drawBarrier(obstacle);
      if (obstacle.kind === "pothole") drawPothole(obstacle);
    });
  }

  function drawToken(pickup, y) {
    const centerX = pickup.x + pickup.width / 2;
    const centerY = y + pickup.height / 2;
    const pulse = 1 + Math.sin(pickup.phase * 1.5) * .05;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(pulse, pulse);
    const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, 32);
    glow.addColorStop(0, "rgba(237, 212, 152, .42)");
    glow.addColorStop(1, "rgba(203, 162, 91, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-34, -34, 68, 68);
    ctx.fillStyle = "#cba25b";
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#edd498";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#08090a";
    ctx.font = "700 10px Space Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DR", 0, 1);
    ctx.restore();
  }

  function drawCassette(pickup, y) {
    const x = pickup.x;
    ctx.save();
    ctx.translate(x + 21, y + 21);
    ctx.rotate(Math.sin(pickup.phase) * .08);
    ctx.translate(-21, -21);
    ctx.shadowColor = "rgba(72, 184, 189, .56)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#11191d";
    pathRoundRect(ctx, 1, 4, 40, 30, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(73, 184, 189, .88)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(237, 212, 152, .82)";
    ctx.beginPath();
    ctx.arc(13, 19, 5, 0, Math.PI * 2);
    ctx.arc(29, 19, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#070708";
    ctx.beginPath();
    ctx.arc(13, 19, 2.2, 0, Math.PI * 2);
    ctx.arc(29, 19, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPickups() {
    pickups.forEach((pickup) => {
      const y = pickup.y + Math.sin(pickup.phase) * 8;
      if (pickup.kind === "token") drawToken(pickup, y);
      else drawCassette(pickup, y);
    });
  }

  function drawWheel(x, y, radius, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = "#050506";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#aeb5b3";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#c7cecb";
    ctx.beginPath();
    ctx.arc(0, 0, radius - 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5b6262";
    ctx.lineWidth = 1.5;
    for (let spoke = 0; spoke < 8; spoke += 1) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius - 11, 0);
      ctx.stroke();
    }
    ctx.fillStyle = "#151819";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLowrider() {
    const baseX = player.x;
    const baseY = 327 + player.y;
    const wheelRotation = distance * .035;
    const compression = player.compression * 6;

    ctx.save();
    ctx.translate(baseX + 98, baseY + 52);
    ctx.rotate(player.tilt);
    ctx.translate(-(baseX + 98), -(baseY + 52));

    const underglow = ctx.createRadialGradient(baseX + 102, baseY + 88, 8, baseX + 102, baseY + 88, 102);
    underglow.addColorStop(0, "rgba(56, 187, 195, .4)");
    underglow.addColorStop(.48, "rgba(40, 143, 151, .18)");
    underglow.addColorStop(1, "rgba(40, 143, 151, 0)");
    ctx.fillStyle = underglow;
    ctx.fillRect(baseX - 20, baseY + 55, 245, 76);

    drawWheel(baseX + 49, baseY + 76 + compression, 25, wheelRotation);
    drawWheel(baseX + 153, baseY + 76 - compression * .25, 25, wheelRotation);

    const bodyGradient = ctx.createLinearGradient(baseX, baseY + 22, baseX, baseY + 78);
    bodyGradient.addColorStop(0, "#242a2d");
    bodyGradient.addColorStop(.42, "#111417");
    bodyGradient.addColorStop(1, "#08090b");
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(baseX - 4, baseY + 43);
    ctx.quadraticCurveTo(baseX + 5, baseY + 28, baseX + 32, baseY + 25);
    ctx.lineTo(baseX + 63, baseY + 22);
    ctx.lineTo(baseX + 87, baseY + 2);
    ctx.quadraticCurveTo(baseX + 98, baseY - 5, baseX + 123, baseY - 2);
    ctx.lineTo(baseX + 157, baseY + 22);
    ctx.lineTo(baseX + 196, baseY + 28);
    ctx.quadraticCurveTo(baseX + 208, baseY + 31, baseX + 211, baseY + 45);
    ctx.lineTo(baseX + 207, baseY + 66);
    ctx.quadraticCurveTo(baseX + 190, baseY + 75, baseX + 176, baseY + 74);
    ctx.quadraticCurveTo(baseX + 171, baseY + 49, baseX + 151, baseY + 49);
    ctx.quadraticCurveTo(baseX + 130, baseY + 49, baseX + 127, baseY + 75);
    ctx.lineTo(baseX + 75, baseY + 75);
    ctx.quadraticCurveTo(baseX + 71, baseY + 49, baseX + 49, baseY + 49);
    ctx.quadraticCurveTo(baseX + 27, baseY + 50, baseX + 24, baseY + 73);
    ctx.lineTo(baseX + 2, baseY + 68);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(237, 212, 152, .72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(baseX + 5, baseY + 48);
    ctx.quadraticCurveTo(baseX + 84, baseY + 42, baseX + 205, baseY + 48);
    ctx.stroke();

    const windowGradient = ctx.createLinearGradient(baseX + 85, baseY, baseX + 145, baseY + 28);
    windowGradient.addColorStop(0, "rgba(59, 139, 147, .72)");
    windowGradient.addColorStop(1, "rgba(8, 17, 22, .95)");
    ctx.fillStyle = windowGradient;
    ctx.beginPath();
    ctx.moveTo(baseX + 91, baseY + 4);
    ctx.lineTo(baseX + 121, baseY + 2);
    ctx.lineTo(baseX + 151, baseY + 23);
    ctx.lineTo(baseX + 82, baseY + 22);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(189, 201, 200, .5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(baseX + 121, baseY + 2);
    ctx.lineTo(baseX + 120, baseY + 23);
    ctx.stroke();

    ctx.fillStyle = "rgba(203, 162, 91, .92)";
    ctx.font = "700 10px Space Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DR", baseX + 112, baseY + 49);

    ctx.fillStyle = "#d7dcd9";
    ctx.fillRect(baseX + 201, baseY + 40, 8, 5);
    ctx.fillStyle = "rgba(174, 49, 38, .86)";
    ctx.fillRect(baseX + 4, baseY + 44, 5, 7);

    ctx.strokeStyle = "#aeb5b3";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(baseX - 2, baseY + 67);
    ctx.lineTo(baseX + 22, baseY + 70);
    ctx.moveTo(baseX + 183, baseY + 72);
    ctx.lineTo(baseX + 215, baseY + 65);
    ctx.stroke();

    ctx.restore();
  }

  function drawParticles() {
    particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawVignette() {
    const vignette = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 160, VIEW_W / 2, VIEW_H / 2, 610);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, .58)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.fillStyle = "rgba(255, 255, 255, .025)";
    for (let y = 0; y < VIEW_H; y += 4) ctx.fillRect(0, y, VIEW_W, 1);
  }

  function drawScene() {
    const scaleX = canvas.width / VIEW_W;
    const scaleY = canvas.height / VIEW_H;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawSky();
    drawSkyline();
    drawPalms();
    drawRoad();
    drawPickups();
    drawObstacles();
    drawLowrider();
    drawParticles();
    drawVignette();
  }

  function loop(time) {
    if (mode !== "running") return;
    const dt = Math.min((time - lastTime) / 1000, .033);
    lastTime = time;
    update(dt);
    drawScene();
    if (mode === "running") animationFrame = requestAnimationFrame(loop);
  }

  function handlePrimaryAction(event) {
    if (event) event.preventDefault();
    if (mode === "idle" || mode === "gameover") startGame();
    else if (mode === "paused") togglePause();
    else triggerHydraulics();
  }

  if (startButton) startButton.addEventListener("click", handlePrimaryAction);
  if (hydraulicButton) hydraulicButton.addEventListener("pointerdown", handlePrimaryAction);
  canvas.addEventListener("pointerdown", handlePrimaryAction);
  if (pauseButton) pauseButton.addEventListener("click", togglePause);
  if (scoreEntry) scoreEntry.addEventListener("submit", submitWorldwideScore);
  if (leaderboardRefresh) leaderboardRefresh.addEventListener("click", () => void loadLeaderboard());

  document.addEventListener("keydown", (event) => {
    if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
      if (event.repeat) return;
      handlePrimaryAction(event);
    }
    if (event.code === "KeyP" && (mode === "running" || mode === "paused")) {
      event.preventDefault();
      togglePause();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && mode === "running") togglePause();
  });

  window.addEventListener("resize", resizeCanvas, { passive: true });

  resetScoreEntry();
  updateHud();
  resizeCanvas();
  drawScene();
  void loadLeaderboard(false);
});
