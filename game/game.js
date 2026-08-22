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
  const levelValue = document.getElementById("levelValue");
  const levelMap = document.getElementById("levelMap");
  const levelProgress = document.getElementById("levelProgress");
  const runStatus = document.getElementById("runStatus");
  const announcement = document.getElementById("gameAnnouncement");
  const promoReward = document.getElementById("promoReward");
  const promoCode = document.getElementById("promoCode");
  const promoRewardStatus = document.getElementById("promoRewardStatus");
  const copyPromoButton = document.getElementById("copyPromoButton");
  const promoShopLink = document.getElementById("promoShopLink");
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
  const LEVEL_DURATION = 21;
  const STORAGE_KEY = "don-rashid-lowrider-night-run-best-v1";
  const NICKNAME_KEY = "don-rashid-lowrider-night-run-nickname-v1";
  const DEVICE_KEY = "don-rashid-lowrider-night-run-device-v1";
  const LEADERBOARD_API = leaderboardRoot?.dataset.apiUrl || "";

  const LEVELS = [
    {
      number: 1,
      name: "Midnight Boulevard",
      upgrade: "Factory frame / street chrome",
      baseSpeed: 285,
      maxSpeed: 355,
      acceleration: 3.4,
      spawnMin: 1.3,
      spawnRange: .72,
      jumpImpulse: -620,
      patternChance: 0,
      trafficChance: 0,
      callout: "CLEAN JUMPS",
      challenge: "Single road hazards. Learn the clean jump.",
      map: "boulevard",
      sky: ["#05070b", "#0b1b20", "#12363a", "#090b0d"],
      accent: "#49b8bd",
      vehicle: { top: "#242a2d", middle: "#111417", bottom: "#08090b", trim: "#edd498", glow: "#38bbc3", wheel: "#c7cecb", spokes: 8 },
    },
    {
      number: 2,
      name: "Neon Harbor",
      upgrade: "Chrome wire wheels unlocked",
      baseSpeed: 330,
      maxSpeed: 410,
      acceleration: 4,
      spawnMin: 1.17,
      spawnRange: .58,
      jumpImpulse: -632,
      patternChance: .22,
      trafficChance: 0,
      callout: "PAIRED HAZARDS",
      challenge: "Harbor rain and paired cones demand longer jumps.",
      map: "harbor",
      sky: ["#050611", "#101638", "#133b48", "#080a12"],
      accent: "#51cbd1",
      vehicle: { top: "#30424b", middle: "#13242c", bottom: "#071015", trim: "#d8e4e4", glow: "#42d9df", wheel: "#eef4f2", spokes: 10 },
    },
    {
      number: 3,
      name: "Desert Interstate",
      upgrade: "Hydraulics Stage II unlocked",
      baseSpeed: 370,
      maxSpeed: 455,
      acceleration: 4.35,
      spawnMin: 1.08,
      spawnRange: .5,
      jumpImpulse: -645,
      patternChance: .34,
      trafficChance: .05,
      callout: "DUST COMBOS",
      challenge: "Dust cuts visibility while mixed roadwork arrives in waves.",
      map: "desert",
      sky: ["#10080d", "#341725", "#6b382d", "#160d10"],
      accent: "#e99b63",
      vehicle: { top: "#63332b", middle: "#311615", bottom: "#0e090a", trim: "#f0c075", glow: "#dc6945", wheel: "#e8c5a2", spokes: 10 },
    },
    {
      number: 4,
      name: "Downtown Pressure",
      upgrade: "Neon performance kit unlocked",
      baseSpeed: 410,
      maxSpeed: 500,
      acceleration: 4.7,
      spawnMin: 1,
      spawnRange: .44,
      jumpImpulse: -660,
      patternChance: .47,
      trafficChance: .18,
      callout: "NEON TRAFFIC",
      challenge: "Downtown traffic joins the lane and the timing window tightens.",
      map: "downtown",
      sky: ["#07050f", "#1c0d2d", "#172f45", "#07090e"],
      accent: "#d55ee9",
      vehicle: { top: "#382245", middle: "#1c1025", bottom: "#09070d", trim: "#df8cf0", glow: "#c84ee4", wheel: "#e6d8ec", spokes: 12 },
    },
    {
      number: 5,
      name: "Golden Coast",
      upgrade: "Black-gold crown build",
      baseSpeed: 450,
      maxSpeed: 535,
      acceleration: 5,
      spawnMin: .94,
      spawnRange: .4,
      jumpImpulse: -675,
      patternChance: .58,
      trafficChance: .27,
      callout: "TRIPLE WAVES",
      challenge: "Triple obstacle waves guard the Golden Coast.",
      map: "golden",
      sky: ["#080705", "#21170c", "#634421", "#0c0906"],
      accent: "#edd498",
      vehicle: { top: "#332a1d", middle: "#15110c", bottom: "#050504", trim: "#f4d58b", glow: "#d6a742", wheel: "#f1d48f", spokes: 12 },
    },
  ];

  const FINAL_LEVEL = LEVELS.length;

  let mode = "idle";
  let lastTime = 0;
  let elapsed = 0;
  let levelElapsed = 0;
  let currentLevel = 1;
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
  let qualifiedLevel = 1;
  let levelCheckpointPromise = Promise.resolve(null);

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

  function getDeviceId() {
    try {
      const stored = localStorage.getItem(DEVICE_KEY);
      if (stored) return stored;
      const id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
      return id;
    } catch (error) {
      return crypto.randomUUID();
    }
  }

  function getLevelConfig() {
    return LEVELS[Math.max(0, Math.min(FINAL_LEVEL - 1, currentLevel - 1))];
  }

  function resetPromoReward() {
    if (promoReward) promoReward.hidden = true;
    if (promoCode) promoCode.textContent = "UNLOCKING…";
    if (promoRewardStatus) promoRewardStatus.textContent = "Verifying your completed run.";
    if (copyPromoButton) {
      copyPromoButton.disabled = true;
      copyPromoButton.textContent = "Copy code";
      copyPromoButton.dataset.code = "";
    }
    if (promoShopLink) promoShopLink.href = "https://shop.donrashid.com";
    canvasShell.classList.remove("has-reward");
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
      const playerInfo = document.createElement("span");
      const name = document.createElement("span");
      const level = document.createElement("small");
      const points = document.createElement("strong");
      playerInfo.className = "leaderboard-player";
      name.className = "leaderboard-name";
      level.className = "leaderboard-level";
      points.className = "leaderboard-score";
      name.textContent = entry.name;
      level.textContent = `Level ${Math.max(1, Math.min(FINAL_LEVEL, Number(entry.level) || 1))}`;
      points.textContent = formatScore(entry.score);
      playerInfo.append(name, level);
      item.append(playerInfo, points);
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

  async function reportLevelCheckpoint(completedLevel, sequence, checkpointScore, checkpointDurationMs) {
    const runId = await currentRunPromise;
    if (!runId || sequence !== runSequence) return null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await requestLeaderboard({
          method: "POST",
          body: JSON.stringify({
            action: "checkpoint",
            runId,
            level: completedLevel,
            score: checkpointScore,
            durationMs: checkpointDurationMs,
          }),
        });
      } catch (error) {
        if (attempt === 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }
      }
    }

    return null;
  }

  async function claimLevelReward(sequence) {
    if (!promoReward || !promoCode || !promoRewardStatus || !copyPromoButton) return;
    promoReward.hidden = false;
    canvasShell.classList.add("has-reward");
    resizeCanvas();

    const [runId, checkpoint] = await Promise.all([
      currentRunPromise,
      levelCheckpointPromise,
    ]);

    if (!runId || !checkpoint || sequence !== runSequence) {
      promoCode.textContent = "NOT VERIFIED";
      promoRewardStatus.textContent = "The reward server could not verify this run. Your score still counts.";
      return;
    }

    try {
      const payload = await requestLeaderboard({
        method: "POST",
        body: JSON.stringify({
          action: "reward",
          runId,
          deviceId: getDeviceId(),
          score: Math.floor(score),
          durationMs: Math.floor(elapsed * 1000),
        }),
      });

      if (sequence !== runSequence || typeof payload.code !== "string") return;
      promoCode.textContent = payload.code;
      promoRewardStatus.textContent = payload.returning
        ? "Your previously unlocked one-time code is ready."
        : "You cleared all five levels. Your one-time code is ready.";
      copyPromoButton.dataset.code = payload.code;
      copyPromoButton.disabled = false;
      if (promoShopLink && typeof payload.promoUrl === "string") {
        try {
          const rewardUrl = new URL(payload.promoUrl);
          if (rewardUrl.protocol === "https:" && rewardUrl.hostname === "shop.donrashid.com") {
            promoShopLink.href = rewardUrl.href;
          }
        } catch (error) {
          // The copyable code remains available if a malformed shop URL is returned.
        }
      }
    } catch (error) {
      promoCode.textContent = "REWARD UNAVAILABLE";
      promoRewardStatus.textContent = error instanceof Error
        ? error.message
        : "The limited reward could not be issued right now.";
    }
  }

  async function copyPromoCode() {
    if (!copyPromoButton) return;
    const code = copyPromoButton.dataset.code || "";
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      copyPromoButton.textContent = "Copied ✓";
    } catch (error) {
      const input = document.createElement("textarea");
      input.value = code;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.append(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      copyPromoButton.textContent = "Copied ✓";
    }
  }

  function resetScoreEntry() {
    qualifiedScore = null;
    qualifiedDurationMs = null;
    qualifiedLevel = 1;
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

  async function offerWorldwideScore(finalScore, durationMs, finalLevel, sequence) {
    const [runId, , boardAvailable] = await Promise.all([
      currentRunPromise,
      levelCheckpointPromise,
      loadLeaderboard(false)
    ]);

    if (sequence !== runSequence || !["gameover", "victory"].includes(mode)) return;
    if (!runId || !boardAvailable || durationMs < 1500) return;

    const lastPlace = leaderboardScores[9];
    const madeTopTen = leaderboardScores.length < 10 || finalScore > Number(lastPlace?.score || 0);
    if (!madeTopTen) return;

    qualifiedScore = finalScore;
    qualifiedDurationMs = durationMs;
    qualifiedLevel = Math.max(1, Math.min(FINAL_LEVEL, Number(finalLevel) || 1));
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
    const level = getLevelConfig();
    if (levelValue) levelValue.textContent = `Level ${currentLevel} / ${FINAL_LEVEL}`;
    if (levelMap) levelMap.textContent = level.name;
    if (levelProgress) {
      const progress = mode === "victory" ? 1 : Math.max(0, Math.min(1, levelElapsed / LEVEL_DURATION));
      levelProgress.style.width = `${Math.round(progress * 100)}%`;
    }
  }

  function resizeCanvas() {
    const rect = canvasShell.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    drawScene();
  }

  function setOverlay({ kicker, title, text, button }) {
    resetPromoReward();
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

  function startCurrentLevel() {
    const level = getLevelConfig();
    mode = "running";
    lastTime = performance.now();
    levelElapsed = 0;
    speed = level.baseSpeed;
    obstacleClock = 1.05;
    pickupClock = 1.55;
    obstacles.length = 0;
    pickups.length = 0;
    particles.length = 0;
    resetPlayer();
    hideOverlay();
    if (pauseButton) {
      pauseButton.disabled = false;
      pauseButton.textContent = "Pause";
    }
    if (runStatus) runStatus.textContent = `Level ${currentLevel} — ${level.name}`;
    updateHud();
    resizeCanvas();
    showAnnouncement(`LEVEL ${currentLevel} · ${level.callout}`);
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(loop);
  }

  function startGame() {
    runSequence += 1;
    const sequence = runSequence;
    elapsed = 0;
    levelElapsed = 0;
    currentLevel = 1;
    distance = 0;
    score = 0;
    resetScoreEntry();
    resetPromoReward();
    levelCheckpointPromise = Promise.resolve(null);
    currentRunPromise = beginVerifiedRun(sequence);
    startCurrentLevel();
  }

  function completeLevel() {
    if (mode !== "running") return;
    const completedLevel = currentLevel;
    const completedConfig = getLevelConfig();
    const sequence = runSequence;
    score += 500 * completedLevel;
    const checkpointScore = Math.floor(score);
    const checkpointDurationMs = Math.floor(elapsed * 1000);
    obstacles.length = 0;
    pickups.length = 0;
    mode = "levelcomplete";
    levelCheckpointPromise = levelCheckpointPromise.then(() => reportLevelCheckpoint(
      completedLevel,
      sequence,
      checkpointScore,
      checkpointDurationMs,
    ));

    if (pauseButton) pauseButton.disabled = true;

    if (completedLevel < FINAL_LEVEL) {
      currentLevel += 1;
      levelElapsed = 0;
      const nextLevel = getLevelConfig();
      if (runStatus) runStatus.textContent = `Upgrade unlocked — ${completedConfig.upgrade}`;
      setOverlay({
        kicker: `Level ${completedLevel} complete / Upgrade installed`,
        title: `LEVEL ${currentLevel}<br /><em>${nextLevel.name.replace(" ", "<br />")}</em>`,
        text: `${completedConfig.upgrade}. ${nextLevel.challenge}`,
        button: `Start Level ${currentLevel}`,
      });
      updateHud();
      drawScene();
      return;
    }

    finishVictory(sequence);
  }

  function finishVictory(sequence) {
    mode = "victory";
    const finalScore = Math.floor(score);
    const finalDurationMs = Math.floor(elapsed * 1000);
    const isNewBest = finalScore > best;
    if (isNewBest) {
      best = finalScore;
      saveBest(best);
    }
    if (pauseButton) pauseButton.disabled = true;
    if (runStatus) runStatus.textContent = "All five levels complete — reward unlocked";
    setOverlay({
      kicker: "Level 5 complete / Coast conquered",
      title: "YOU OWN<br /><em>THE COAST</em>",
      text: `${formatScore(finalScore)} points. Your limited shop reward is being verified.`,
      button: "Run it back",
    });
    updateHud();
    drawScene();
    void claimLevelReward(sequence);
    void offerWorldwideScore(finalScore, finalDurationMs, FINAL_LEVEL, sequence);
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
      kicker: isNewBest ? `Level ${currentLevel} / New high score` : `Level ${currentLevel} / Run ended`,
      title: `${formatScore(finalScore)}<br />${isNewBest ? "NEW RECORD" : "TRY AGAIN"}`,
      text: isNewBest ? "The boulevard has a new number to beat." : "One clean jump can change the whole night.",
      button: "Run it back"
    });
    void offerWorldwideScore(finalScore, finalDurationMs, currentLevel, finishedRunSequence);
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
          durationMs: qualifiedDurationMs,
          level: qualifiedLevel,
        })
      });

      leaderboardScores = Array.isArray(payload.scores) ? payload.scores : leaderboardScores;
      renderLeaderboard(leaderboardScores);
      saveNickname(nickname);
      scoreSubmit.textContent = "Saved ✓";
      const savedLevel = Math.max(1, Math.min(FINAL_LEVEL, Number(payload.result?.level) || qualifiedLevel));
      setScoreEntryStatus(`Saved correctly at Level ${savedLevel}. Your score is now visible worldwide.`);
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
    const level = getLevelConfig();
    player.vy = level.jumpImpulse;
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
        color: index % 3 === 0 ? "#cba25b" : level.accent
      });
    }

    if (hydraulicButton) {
      hydraulicButton.classList.add("is-active");
      window.setTimeout(() => hydraulicButton.classList.remove("is-active"), 150);
    }
  }

  const OBSTACLE_DIMENSIONS = {
    cone: { width: 34, height: 50, points: 35 },
    pothole: { width: 78, height: 15, points: 40 },
    barrier: { width: 56, height: 52, points: 45 },
    drum: { width: 44, height: 58, points: 55 },
    traffic: { width: 112, height: 46, points: 90 },
  };

  const OBSTACLE_PATTERNS = {
    2: [
      [{ kind: "cone", offset: 0 }, { kind: "cone", offset: 92 }],
      [{ kind: "pothole", offset: 0 }, { kind: "cone", offset: 138 }],
    ],
    3: [
      [{ kind: "drum", offset: 0 }, { kind: "cone", offset: 118 }],
      [{ kind: "cone", offset: 0 }, { kind: "pothole", offset: 142 }],
      [{ kind: "barrier", offset: 0 }, { kind: "cone", offset: 138 }],
    ],
    4: [
      [{ kind: "pothole", offset: 0 }, { kind: "drum", offset: 156 }],
      [{ kind: "barrier", offset: 0 }, { kind: "cone", offset: 146 }],
      [{ kind: "cone", offset: 0 }, { kind: "traffic", offset: 168 }],
    ],
    5: [
      [{ kind: "cone", offset: 0 }, { kind: "cone", offset: 86 }, { kind: "pothole", offset: 204 }],
      [{ kind: "drum", offset: 0 }, { kind: "barrier", offset: 132 }, { kind: "cone", offset: 232 }],
      [{ kind: "pothole", offset: 0 }, { kind: "traffic", offset: 170 }, { kind: "cone", offset: 324 }],
    ],
  };

  function addObstacle(kind, offset = 0) {
    const dimensions = OBSTACLE_DIMENSIONS[kind] || OBSTACLE_DIMENSIONS.cone;
    obstacles.push({
      kind,
      x: VIEW_W + 80 + offset,
      width: dimensions.width,
      height: dimensions.height,
      points: dimensions.points,
      counted: false,
    });
  }

  function randomObstacleKind(level) {
    const roll = Math.random();
    if (level.number >= 4 && roll < level.trafficChance) return "traffic";
    if (level.number >= 3 && roll < level.trafficChance + .16) return "drum";
    const roadRoll = Math.random();
    return roadRoll < .4 ? "cone" : roadRoll < .7 ? "pothole" : "barrier";
  }

  function spawnObstacle() {
    const level = getLevelConfig();
    const patterns = OBSTACLE_PATTERNS[level.number] || [];

    if (patterns.length && Math.random() < level.patternChance) {
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      pattern.forEach((item) => addObstacle(item.kind, item.offset));
      const lastOffset = pattern.reduce((largest, item) => Math.max(largest, item.offset), 0);
      return .34 + (lastOffset / Math.max(speed, 1)) * .55;
    }

    addObstacle(randomObstacleKind(level));
    return 0;
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
    levelElapsed += dt;
    const level = getLevelConfig();
    speed = Math.min(level.maxSpeed, level.baseSpeed + levelElapsed * level.acceleration);
    distance += speed * dt;
    score += dt * (24 + speed * .04 + currentLevel * 2.5);

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
      const patternRecovery = spawnObstacle();
      obstacleClock = level.spawnMin + Math.random() * level.spawnRange + patternRecovery;
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
      const insets = {
        cone: { x: 6, y: 7, width: 12, height: 10 },
        pothole: { x: 12, y: 3, width: 24, height: 6 },
        barrier: { x: 7, y: 7, width: 14, height: 12 },
        drum: { x: 6, y: 5, width: 12, height: 9 },
        traffic: { x: 12, y: 10, width: 24, height: 15 },
      }[obstacle.kind] || { x: 5, y: 5, width: 10, height: 8 };
      const hitbox = {
        x: obstacle.x + insets.x,
        y: obstacleY + insets.y,
        width: obstacle.width - insets.width,
        height: Math.max(7, obstacle.height - insets.height),
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
        score += obstacle.points || 35;
        if (obstacle.kind === "traffic") showAnnouncement("+90 NEON TRAFFIC CLEAR");
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
    if (levelElapsed >= LEVEL_DURATION) completeLevel();
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
    const level = getLevelConfig();
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, level.sky[0]);
    sky.addColorStop(.48, level.sky[1]);
    sky.addColorStop(.75, level.sky[2]);
    sky.addColorStop(1, level.sky[3]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const celestialX = level.map === "desert" ? 720 : level.map === "golden" ? 790 : 755;
    const celestialY = level.map === "golden" ? 205 : 145;
    const glow = ctx.createRadialGradient(celestialX, celestialY, 8, celestialX, celestialY, level.map === "golden" ? 220 : 155);
    glow.addColorStop(0, level.map === "downtown" ? "rgba(214, 94, 233, .2)" : "rgba(237, 212, 152, .25)");
    glow.addColorStop(.2, level.map === "desert" ? "rgba(226, 115, 68, .14)" : "rgba(203, 162, 91, .1)");
    glow.addColorStop(1, "rgba(203, 162, 91, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(celestialX - 220, 0, 440, 390);

    ctx.fillStyle = level.map === "desert"
      ? "rgba(242, 139, 79, .84)"
      : level.map === "downtown"
        ? "rgba(218, 163, 234, .74)"
        : "rgba(237, 212, 152, .82)";
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, level.map === "golden" ? 38 : 24, 0, Math.PI * 2);
    ctx.fill();

    stars.forEach((star) => {
      const twinkle = .72 + Math.sin(elapsed * 1.3 + star.x) * .28;
      const visibility = ["desert", "golden"].includes(level.map) ? .68 : 1;
      ctx.globalAlpha = star.alpha * twinkle * visibility;
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

  function drawHarbor() {
    const offset = -((distance * .12) % 620);
    ctx.fillStyle = "rgba(5, 12, 20, .9)";
    ctx.fillRect(0, 328, VIEW_W, 44);

    for (let repeat = -1; repeat < 4; repeat += 1) {
      const baseX = offset + repeat * 620;
      ctx.fillStyle = "rgba(6, 10, 17, .92)";
      ctx.fillRect(baseX + 25, 292, 168, 77);
      ctx.fillRect(baseX + 218, 316, 106, 53);
      ctx.fillRect(baseX + 338, 303, 132, 66);

      ctx.strokeStyle = "rgba(4, 8, 13, .96)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(baseX + 95, 292);
      ctx.lineTo(baseX + 95, 150);
      ctx.lineTo(baseX + 245, 150);
      ctx.moveTo(baseX + 95, 175);
      ctx.lineTo(baseX + 205, 265);
      ctx.stroke();

      ctx.strokeStyle = "rgba(73, 184, 189, .34)";
      ctx.lineWidth = 2;
      ctx.strokeRect(baseX + 35, 303, 64, 28);
      ctx.strokeRect(baseX + 105, 303, 74, 28);
      ctx.strokeRect(baseX + 228, 326, 84, 27);
    }

    ctx.fillStyle = "rgba(73, 184, 189, .08)";
    ctx.fillRect(0, 345, VIEW_W, 25);
  }

  function drawCactus(x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "rgba(7, 12, 10, .88)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -73);
    ctx.moveTo(0, -43);
    ctx.lineTo(-19, -43);
    ctx.lineTo(-19, -60);
    ctx.moveTo(0, -29);
    ctx.lineTo(21, -29);
    ctx.lineTo(21, -50);
    ctx.stroke();
    ctx.restore();
  }

  function drawDesert() {
    const mountainOffset = -((distance * .045) % 1120);
    ctx.fillStyle = "rgba(25, 12, 17, .72)";
    for (let repeat = -1; repeat < 3; repeat += 1) {
      const x = mountainOffset + repeat * 1120;
      ctx.beginPath();
      ctx.moveTo(x - 120, ROAD_TOP);
      ctx.lineTo(x + 110, 218);
      ctx.lineTo(x + 280, ROAD_TOP);
      ctx.lineTo(x + 470, 265);
      ctx.lineTo(x + 690, ROAD_TOP);
      ctx.closePath();
      ctx.fill();
    }

    const cactusOffset = -((distance * .17) % 670);
    for (let repeat = -1; repeat < 4; repeat += 1) {
      drawCactus(cactusOffset + repeat * 670 + 180, ROAD_TOP + 3, .82);
      drawCactus(cactusOffset + repeat * 670 + 515, ROAD_TOP + 3, .55);
    }
  }

  function drawDowntownNeon() {
    const offset = -((distance * .1) % 820);
    const signs = [
      { x: 94, y: 222, text: "DR", color: "#d55ee9" },
      { x: 342, y: 264, text: "3072", color: "#49b8bd" },
      { x: 622, y: 204, text: "NIGHT", color: "#edd498" },
    ];

    for (let repeat = -1; repeat < 3; repeat += 1) {
      signs.forEach((sign) => {
        const x = offset + repeat * 820 + sign.x;
        ctx.save();
        ctx.shadowColor = sign.color;
        ctx.shadowBlur = 16;
        ctx.strokeStyle = sign.color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, sign.y, 72, 30);
        ctx.fillStyle = sign.color;
        ctx.font = "700 11px Space Grotesk, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(sign.text, x + 36, sign.y + 19);
        ctx.restore();
      });
    }
  }

  function drawGoldenCoast() {
    const horizon = 310;
    const ocean = ctx.createLinearGradient(0, horizon, 0, ROAD_TOP);
    ocean.addColorStop(0, "rgba(224, 170, 74, .2)");
    ocean.addColorStop(1, "rgba(5, 11, 14, .8)");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, horizon, VIEW_W, ROAD_TOP - horizon);

    ctx.strokeStyle = "rgba(237, 212, 152, .19)";
    ctx.lineWidth = 1;
    for (let row = 0; row < 4; row += 1) {
      const waveOffset = -((distance * (.04 + row * .01)) % 180);
      for (let x = waveOffset - 180; x < VIEW_W + 180; x += 180) {
        ctx.beginPath();
        ctx.moveTo(x, horizon + 13 + row * 12);
        ctx.quadraticCurveTo(x + 45, horizon + 7 + row * 12, x + 90, horizon + 13 + row * 12);
        ctx.stroke();
      }
    }

    const pierOffset = -((distance * .11) % 760);
    for (let repeat = -1; repeat < 3; repeat += 1) {
      const x = pierOffset + repeat * 760 + 410;
      ctx.fillStyle = "rgba(7, 7, 7, .88)";
      ctx.fillRect(x, 278, 214, 10);
      ctx.fillRect(x + 18, 288, 7, 82);
      ctx.fillRect(x + 176, 288, 7, 82);
      drawPalm(x + 95, ROAD_TOP + 4, .72);
    }
  }

  function drawLevelAtmosphere() {
    const level = getLevelConfig();
    ctx.save();

    if (level.map === "harbor") {
      ctx.strokeStyle = "rgba(122, 219, 225, .2)";
      ctx.lineWidth = 1.2;
      for (let index = 0; index < 30; index += 1) {
        const x = (index * 89 + distance * .48) % (VIEW_W + 100) - 50;
        const y = (index * 61 + elapsed * 235) % (VIEW_H + 80) - 40;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 12, y + 28);
        ctx.stroke();
      }
    }

    if (level.map === "desert") {
      for (let index = 0; index < 24; index += 1) {
        const span = VIEW_W + 120;
        const rawX = (index * 127 - distance * .22) % span;
        const x = (rawX + span) % span - 60;
        const y = 255 + ((index * 41) % 205) + Math.sin(elapsed * 1.8 + index) * 9;
        ctx.globalAlpha = .12 + (index % 5) * .025;
        ctx.fillStyle = index % 3 === 0 ? "#f0c075" : "#c06f49";
        ctx.beginPath();
        ctx.arc(x, y, 1.2 + (index % 4) * .45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (level.map === "downtown") {
      for (let index = 0; index < 7; index += 1) {
        const span = VIEW_W + 220;
        const rawX = (index * 181 - distance * (1.12 + index * .02)) % span;
        const x = (rawX + span) % span - 110;
        const y = 384 + (index % 3) * 29;
        const trail = ctx.createLinearGradient(x, y, x + 96, y);
        trail.addColorStop(0, "rgba(213, 94, 233, 0)");
        trail.addColorStop(1, index % 2 ? "rgba(73, 184, 189, .38)" : "rgba(213, 94, 233, .42)");
        ctx.fillStyle = trail;
        ctx.fillRect(x, y, 96, 2);
      }
    }

    if (level.map === "golden") {
      for (let index = 0; index < 18; index += 1) {
        const x = (index * 151 + distance * .13) % (VIEW_W + 80) - 40;
        const y = 250 + ((index * 47) % 185) + Math.sin(elapsed * 2.2 + index) * 8;
        ctx.globalAlpha = .18 + (index % 4) * .06;
        ctx.fillStyle = "#f4d58b";
        ctx.beginPath();
        ctx.arc(x, y, 1 + (index % 3) * .55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawBackdrop() {
    const map = getLevelConfig().map;
    if (map === "boulevard") {
      drawSkyline();
      drawPalms();
      return;
    }
    if (map === "harbor") {
      drawHarbor();
      return;
    }
    if (map === "desert") {
      drawDesert();
      return;
    }
    if (map === "downtown") {
      drawSkyline();
      drawDowntownNeon();
      return;
    }
    drawGoldenCoast();
  }

  function drawRoad() {
    const level = getLevelConfig();
    const road = ctx.createLinearGradient(0, ROAD_TOP, 0, VIEW_H);
    road.addColorStop(0, level.map === "desert" ? "#241917" : level.map === "golden" ? "#211a10" : "#14191b");
    road.addColorStop(.45, "#090b0d");
    road.addColorStop(1, "#050607");
    ctx.fillStyle = road;
    ctx.fillRect(0, ROAD_TOP, VIEW_W, VIEW_H - ROAD_TOP);

    ctx.fillStyle = "rgba(237, 212, 152, .24)";
    ctx.fillRect(0, ROAD_TOP + 3, VIEW_W, 1);

    const laneOffset = -((distance * 1.04) % 170);
    ctx.fillStyle = level.map === "downtown" ? "rgba(213, 94, 233, .28)" : "rgba(237, 212, 152, .3)";
    for (let x = laneOffset - 170; x < VIEW_W + 170; x += 170) {
      ctx.save();
      ctx.transform(1, 0, -.2, 1, 0, 0);
      ctx.fillRect(x, 478, 86, 5);
      ctx.restore();
    }

    const reflection = ctx.createLinearGradient(0, ROAD_TOP, 0, VIEW_H);
    reflection.addColorStop(0, `${level.accent}1f`);
    reflection.addColorStop(1, `${level.accent}00`);
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

  function drawDrum(obstacle) {
    const x = obstacle.x;
    const y = GROUND_Y - obstacle.height + 3;
    const body = ctx.createLinearGradient(x, y, x + obstacle.width, y);
    body.addColorStop(0, "#6e3024");
    body.addColorStop(.5, "#c7683c");
    body.addColorStop(1, "#582219");
    ctx.save();
    ctx.fillStyle = body;
    pathRoundRect(ctx, x + 3, y + 4, obstacle.width - 6, obstacle.height - 6, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(244, 213, 139, .82)";
    ctx.fillRect(x + 3, y + 16, obstacle.width - 6, 6);
    ctx.fillRect(x + 3, y + obstacle.height - 18, obstacle.width - 6, 6);
    ctx.strokeStyle = "rgba(244, 239, 229, .42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x + obstacle.width / 2, y + 6, obstacle.width / 2 - 4, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(8, 9, 10, .78)";
    ctx.font = "700 9px Space Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DR", x + obstacle.width / 2, y + 37);
    ctx.restore();
  }

  function drawTraffic(obstacle) {
    const level = getLevelConfig();
    const x = obstacle.x;
    const y = GROUND_Y - obstacle.height + 3;
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, .5)";
    ctx.beginPath();
    ctx.ellipse(x + obstacle.width / 2, GROUND_Y + 2, obstacle.width * .48, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createLinearGradient(x, y, x, y + obstacle.height);
    body.addColorStop(0, level.map === "golden" ? "#765523" : "#5f286a");
    body.addColorStop(.48, "#201124");
    body.addColorStop(1, "#08080a");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 25);
    ctx.lineTo(x + 20, y + 15);
    ctx.lineTo(x + 40, y + 12);
    ctx.lineTo(x + 54, y + 1);
    ctx.lineTo(x + 82, y + 3);
    ctx.lineTo(x + 94, y + 15);
    ctx.lineTo(x + 107, y + 20);
    ctx.lineTo(x + 110, y + 35);
    ctx.lineTo(x + 4, y + 36);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(53, 153, 170, .58)";
    ctx.beginPath();
    ctx.moveTo(x + 56, y + 4);
    ctx.lineTo(x + 79, y + 6);
    ctx.lineTo(x + 89, y + 15);
    ctx.lineTo(x + 47, y + 14);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = level.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 28);
    ctx.lineTo(x + 104, y + 27);
    ctx.stroke();

    [x + 27, x + 87].forEach((wheelX) => {
      ctx.fillStyle = "#050506";
      ctx.beginPath();
      ctx.arc(wheelX, y + 37, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d7dcd9";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wheelX, y + 37, 6, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.fillStyle = "rgba(244, 213, 139, .95)";
    ctx.fillRect(x + 103, y + 22, 7, 4);
    ctx.shadowColor = level.accent;
    ctx.shadowBlur = 12;
    ctx.fillStyle = level.accent;
    ctx.fillRect(x + 12, y + 35, 78, 2);
    ctx.restore();
  }

  function drawObstacles() {
    obstacles.forEach((obstacle) => {
      if (obstacle.kind === "cone") drawCone(obstacle);
      if (obstacle.kind === "barrier") drawBarrier(obstacle);
      if (obstacle.kind === "pothole") drawPothole(obstacle);
      if (obstacle.kind === "drum") drawDrum(obstacle);
      if (obstacle.kind === "traffic") drawTraffic(obstacle);
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
    const level = getLevelConfig();
    const vehicle = level.vehicle;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = "#050506";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = vehicle.wheel;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = vehicle.wheel;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5b6262";
    ctx.lineWidth = 1.5;
    for (let spoke = 0; spoke < vehicle.spokes; spoke += 1) {
      ctx.rotate((Math.PI * 2) / vehicle.spokes);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius - 11, 0);
      ctx.stroke();
    }
    ctx.fillStyle = "#151819";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    if (currentLevel >= 2) {
      ctx.strokeStyle = currentLevel === FINAL_LEVEL ? vehicle.trim : "rgba(243, 240, 233, .72)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius - 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLowrider() {
    const level = getLevelConfig();
    const vehicle = level.vehicle;
    const baseX = player.x;
    const baseY = 327 + player.y;
    const wheelRotation = distance * .035;
    const compression = player.compression * 6;

    ctx.save();
    ctx.translate(baseX + 98, baseY + 52);
    ctx.rotate(player.tilt);
    ctx.translate(-(baseX + 98), -(baseY + 52));

    const underglow = ctx.createRadialGradient(baseX + 102, baseY + 88, 8, baseX + 102, baseY + 88, 102);
    underglow.addColorStop(0, `${vehicle.glow}${currentLevel >= 4 ? "8c" : "66"}`);
    underglow.addColorStop(.48, `${vehicle.glow}30`);
    underglow.addColorStop(1, `${vehicle.glow}00`);
    ctx.fillStyle = underglow;
    ctx.fillRect(baseX - 20, baseY + 55, 245, 76);

    drawWheel(baseX + 49, baseY + 76 + compression, 25, wheelRotation);
    drawWheel(baseX + 153, baseY + 76 - compression * .25, 25, wheelRotation);

    const bodyGradient = ctx.createLinearGradient(baseX, baseY + 22, baseX, baseY + 78);
    bodyGradient.addColorStop(0, vehicle.top);
    bodyGradient.addColorStop(.42, vehicle.middle);
    bodyGradient.addColorStop(1, vehicle.bottom);
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

    ctx.strokeStyle = vehicle.trim;
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

    ctx.fillStyle = vehicle.trim;
    ctx.font = "700 10px Space Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DR", baseX + 112, baseY + 49);

    if (currentLevel >= 3) {
      ctx.strokeStyle = `${vehicle.trim}b8`;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(baseX + 22, baseY + 58);
      ctx.bezierCurveTo(baseX + 70, baseY + 50, baseX + 126, baseY + 67, baseX + 193, baseY + 55);
      ctx.stroke();
    }

    if (currentLevel >= 4) {
      ctx.fillStyle = `${vehicle.glow}b5`;
      ctx.fillRect(baseX + 68, baseY + 74, 70, 2);
    }

    if (currentLevel === FINAL_LEVEL) {
      ctx.strokeStyle = vehicle.trim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(baseX + 80, baseY + 23);
      ctx.lineTo(baseX + 153, baseY + 23);
      ctx.stroke();
    }

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
    drawBackdrop();
    drawRoad();
    drawLevelAtmosphere();
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
    if (["idle", "gameover", "victory"].includes(mode)) startGame();
    else if (mode === "levelcomplete") startCurrentLevel();
    else if (mode === "paused") togglePause();
    else triggerHydraulics();
  }

  if (startButton) startButton.addEventListener("click", handlePrimaryAction);
  if (hydraulicButton) hydraulicButton.addEventListener("pointerdown", handlePrimaryAction);
  canvas.addEventListener("pointerdown", handlePrimaryAction);
  if (pauseButton) pauseButton.addEventListener("click", togglePause);
  if (scoreEntry) scoreEntry.addEventListener("submit", submitWorldwideScore);
  if (leaderboardRefresh) leaderboardRefresh.addEventListener("click", () => void loadLeaderboard());
  if (copyPromoButton) copyPromoButton.addEventListener("click", () => void copyPromoCode());

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
  resetPromoReward();
  updateHud();
  resizeCanvas();
  void loadLeaderboard(false);
});
