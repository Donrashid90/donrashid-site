import {
  DAILY_CREDIT_GRANT,
  GAME_COSTS,
  ROULETTE_ORDER,
  SLOT_SYMBOLS,
  applyDailyCreditGrant,
  dayKey,
  flipResult,
  holderTier,
  isEthereumAddress,
  rouletteBetCost,
  rouletteColor,
  rouletteResult,
  secureRandomIndex,
  shortenAddress,
  slotPayoutDetails,
  wholeTokenBalance
} from "./core.js?v=3";

document.addEventListener("DOMContentLoaded", () => {
  const config = window.DR_ARCADE_CONFIG || {};
  const network = config.network || {};
  const token = config.token || {};

  const walletPanel = document.getElementById("walletPanel");
  const walletDot = document.getElementById("walletDot");
  const walletStateLabel = document.getElementById("walletStateLabel");
  const walletAddress = document.getElementById("walletAddress");
  const drcBalance = document.getElementById("drcBalance");
  const holderTierLabel = document.getElementById("holderTier");
  const holderCosmeticStatus = document.getElementById("holderCosmeticStatus");
  const connectWalletButton = document.getElementById("connectWallet");
  const addTokenButton = document.getElementById("addTokenButton");
  const clearWalletButton = document.getElementById("clearWalletButton");
  const walletMessage = document.getElementById("walletMessage");
  const tierCards = [...document.querySelectorAll("[data-tier-minimum]")];

  const creditBalances = [...document.querySelectorAll("[data-credit-balance]")];
  const creditGrantStatus = document.getElementById("creditGrantStatus");
  const arcadeStatus = document.getElementById("arcadeStatus");
  const resetCreditsButton = document.getElementById("resetCreditsButton");
  const machineTabs = [...document.querySelectorAll("[data-machine]")];
  const machinePanels = [...document.querySelectorAll("[data-panel]")];
  const machineFullscreenButtons = [...document.querySelectorAll("[data-machine-fullscreen]")];

  const slotReels = document.getElementById("slotReels");
  const spinButton = document.getElementById("spinButton");
  const slotsResult = document.getElementById("slotsResult");

  const rouletteWheel = document.getElementById("rouletteWheel");
  const rouletteBall = document.getElementById("rouletteBall");
  const roulettePockets = document.getElementById("roulettePockets");
  const rouletteNumberGrid = document.getElementById("rouletteNumberGrid");
  const rouletteBetLabel = document.getElementById("rouletteBetLabel");
  const rouletteCostLabel = document.getElementById("rouletteCostLabel");
  const rouletteClearButton = document.getElementById("rouletteClearButton");
  const rouletteButton = document.getElementById("rouletteButton");
  const rouletteResultLabel = document.getElementById("rouletteResult");
  const rouletteColorButtons = [...document.querySelectorAll("[data-roulette-color]")];

  const flipCoin = document.getElementById("flipCoin");
  const flipButton = document.getElementById("flipButton");
  const flipResultLabel = document.getElementById("flipResult");
  const flipChoiceButtons = [...document.querySelectorAll("[data-flip-choice]")];

  const CREDIT_STORAGE_KEY = "don-rashid-arcade-credits-v1";
  const HOLDER_ACCESS_KEY = "don-rashid-holder-access-v1";
  const HOLDER_ACCESS_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
  const BASE_SEPOLIA_CHAIN_ID = network.chainId || "0x14a34";
  const tokenConfigured = isEthereumAddress(token.address)
    && !/^0x0{40}$/i.test(token.address);

  let provider = null;
  let connectedAccount = "";
  let walletVerified = false;
  let wholeBalance = 0n;
  let machineBusy = false;
  let rouletteBets = [];
  let flipChoice = "dr";
  let rouletteRotation = 0;
  let rouletteBallRotation = 0;
  let slotCells = [];
  let creditsState = loadCredits();
  let cachedHolderAccess = readHolderAccess();
  let pseudoFullscreenPanel = null;

  function readHolderAccess() {
    try {
      const stored = JSON.parse(localStorage.getItem(HOLDER_ACCESS_KEY) || "null");
      if (!stored || !Number.isFinite(Number(stored.minimum)) || Date.now() - Number(stored.verifiedAt) > HOLDER_ACCESS_MAX_AGE) {
        localStorage.removeItem(HOLDER_ACCESS_KEY);
        return null;
      }
      return stored;
    } catch (error) {
      return null;
    }
  }

  function saveHolderAccess(activeTier) {
    cachedHolderAccess = {
      minimum: Number(activeTier.minimum || 0),
      name: activeTier.name,
      balance: wholeBalance.toString(),
      verifiedAt: Date.now(),
    };
    try {
      localStorage.setItem(HOLDER_ACCESS_KEY, JSON.stringify(cachedHolderAccess));
    } catch (error) {
      // Cosmetic access remains active for this session when storage is unavailable.
    }
  }

  function readStoredCredits() {
    try {
      return JSON.parse(localStorage.getItem(CREDIT_STORAGE_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function loadCredits() {
    return applyDailyCreditGrant(readStoredCredits(), dayKey());
  }

  function saveCredits() {
    try {
      localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify({
        credits: creditsState.credits,
        lastGrant: creditsState.lastGrant
      }));
    } catch (error) {
      // Free-play credits remain usable for the current page session.
    }
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  }

  function updateCredits(message = "") {
    creditBalances.forEach((balance) => {
      balance.textContent = formatNumber(creditsState.credits);
    });
    if (arcadeStatus && message) arcadeStatus.textContent = message;

    if (spinButton) spinButton.disabled = machineBusy || creditsState.credits < GAME_COSTS.slots;
    const activeRouletteCost = rouletteBetCost(rouletteBets);
    if (rouletteCostLabel) rouletteCostLabel.textContent = activeRouletteCost ? formatNumber(activeRouletteCost) : "—";
    if (rouletteButton) rouletteButton.disabled = machineBusy || activeRouletteCost === 0 || creditsState.credits < activeRouletteCost;
    if (flipButton) flipButton.disabled = machineBusy || creditsState.credits < GAME_COSTS.flip;
  }

  function spendCredits(cost) {
    if (machineBusy || creditsState.credits < cost) {
      updateCredits("Not enough free DR Credits. Reset the demo balance to keep playing.");
      return false;
    }
    creditsState = { ...creditsState, credits: creditsState.credits - cost };
    saveCredits();
    updateCredits();
    return true;
  }

  function awardCredits(amount, message) {
    creditsState = { ...creditsState, credits: creditsState.credits + amount };
    saveCredits();
    updateCredits(message);
  }

  function setMachineBusy(value) {
    machineBusy = value;
    updateCredits();
    machineTabs.forEach((button) => {
      button.disabled = value;
    });
  }

  function showMachine(name) {
    if (machineBusy) return;
    machineTabs.forEach((button) => {
      const active = button.dataset.machine === name;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    machinePanels.forEach((panel) => {
      const active = panel.dataset.panel === name;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  }

  function nativeFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function updateMachineFullscreenButtons() {
    const nativePanel = nativeFullscreenElement();
    machineFullscreenButtons.forEach((button) => {
      const panel = button.closest(".machine-panel");
      const active = panel === nativePanel || panel === pseudoFullscreenPanel;
      const label = button.lastElementChild;
      if (label) label.textContent = active ? "Exit fullscreen" : "Fullscreen";
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", active ? "Exit machine fullscreen" : "Open machine fullscreen");
    });
  }

  function openPseudoMachineFullscreen(panel) {
    if (!panel) return;
    if (pseudoFullscreenPanel && pseudoFullscreenPanel !== panel) {
      pseudoFullscreenPanel.classList.remove("is-pseudo-fullscreen");
    }
    pseudoFullscreenPanel = panel;
    panel.classList.add("is-pseudo-fullscreen");
    document.body.classList.add("arcade-fullscreen-lock");
    panel.scrollTop = 0;
    updateMachineFullscreenButtons();
  }

  function closePseudoMachineFullscreen() {
    if (!pseudoFullscreenPanel) return;
    pseudoFullscreenPanel.classList.remove("is-pseudo-fullscreen");
    pseudoFullscreenPanel = null;
    document.body.classList.remove("arcade-fullscreen-lock");
    updateMachineFullscreenButtons();
  }

  async function toggleMachineFullscreen(button) {
    const panel = button.closest(".machine-panel");
    if (!panel) return;

    if (panel === pseudoFullscreenPanel) {
      closePseudoMachineFullscreen();
      return;
    }

    if (nativeFullscreenElement() === panel) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) await exit.call(document);
      return;
    }

    const request = panel.requestFullscreen || panel.webkitRequestFullscreen;
    if (!request) {
      openPseudoMachineFullscreen(panel);
      return;
    }

    try {
      await request.call(panel);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      if (nativeFullscreenElement() !== panel) openPseudoMachineFullscreen(panel);
      else updateMachineFullscreenButtons();
    } catch (error) {
      openPseudoMachineFullscreen(panel);
    }
  }

  function setResult(element, message, isWin = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-win", isWin);
  }

  function randomSymbol() {
    return SLOT_SYMBOLS[secureRandomIndex(SLOT_SYMBOLS.length)];
  }

  function displaySlotSymbol(element, symbol) {
    if (!element || !symbol) return;
    element.textContent = symbol.icon;
    element.dataset.symbol = symbol.id;
    element.setAttribute("aria-label", symbol.label);
  }

  function buildSlotMachine() {
    if (!slotReels) return;
    slotReels.replaceChildren();
    slotCells = [];

    for (let reelIndex = 0; reelIndex < 5; reelIndex += 1) {
      const reel = document.createElement("div");
      reel.className = "slot-reel";
      reel.dataset.reel = String(reelIndex);
      const cells = [];

      for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
        const cell = document.createElement("span");
        cell.className = "slot-cell";
        cell.dataset.row = String(rowIndex);
        displaySlotSymbol(cell, SLOT_SYMBOLS[(reelIndex + rowIndex + 1) % SLOT_SYMBOLS.length]);
        reel.append(cell);
        cells.push(cell);
      }

      slotReels.append(reel);
      slotCells.push(cells);
    }
  }

  function randomSlotGrid() {
    return Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => randomSymbol()));
  }

  function showSlotGrid(grid, throughReel = 4) {
    slotCells.forEach((cells, reelIndex) => {
      if (reelIndex > throughReel) return;
      cells.forEach((cell, rowIndex) => displaySlotSymbol(cell, grid[reelIndex][rowIndex]));
    });
  }

  function clearWinningSlotCells() {
    slotCells.flat().forEach((cell) => cell.classList.remove("is-winning"));
  }

  function highlightSlotWins(wins) {
    wins.forEach((win) => {
      for (let reelIndex = 0; reelIndex < win.count; reelIndex += 1) {
        slotCells[reelIndex]?.[win.rows[reelIndex]]?.classList.add("is-winning");
      }
    });
  }

  async function spinSlots() {
    if (!spendCredits(GAME_COSTS.slots) || !slotReels) return;
    setMachineBusy(true);
    clearWinningSlotCells();
    setResult(slotsResult, "Five reels are moving through the night…");
    slotReels.classList.add("is-spinning");

    const shuffleTimer = window.setInterval(() => {
      showSlotGrid(randomSlotGrid());
    }, 80);

    await wait(620);
    window.clearInterval(shuffleTimer);
    const grid = randomSlotGrid();

    for (let reelIndex = 0; reelIndex < 5; reelIndex += 1) {
      showSlotGrid(grid, reelIndex);
      slotReels.querySelector(`[data-reel="${reelIndex}"]`)?.classList.add("is-stopped");
      await wait(170 + reelIndex * 35);
    }

    slotReels.classList.remove("is-spinning");
    slotReels.querySelectorAll(".slot-reel").forEach((reel) => reel.classList.remove("is-stopped"));
    const details = slotPayoutDetails(grid.map((reel) => reel.map((symbol) => symbol.id)));

    if (details.total > 0) {
      highlightSlotWins(details.wins);
      awardCredits(details.total, `Boulevard Gold returned ${details.total} free DR Credits.`);
      const lineLabel = details.wins.length === 1 ? "line" : "lines";
      setResult(slotsResult, `${details.wins.length} winning ${lineLabel} — +${details.total} DR Credits`, true);
    } else {
      updateCredits("No match this time. DRC in your wallet was never touched.");
      setResult(slotsResult, "No complete line. The next boulevard is waiting.");
    }

    setMachineBusy(false);
  }

  function buildRoulette() {
    if (!roulettePockets || !rouletteNumberGrid || !rouletteWheel) return;
    roulettePockets.replaceChildren();
    rouletteNumberGrid.replaceChildren();
    const step = 360 / ROULETTE_ORDER.length;
    const gradientStops = [];

    ROULETTE_ORDER.forEach((number, index) => {
      const color = rouletteColor(number);
      const pocket = document.createElement("span");
      pocket.className = `roulette-pocket is-${color}`;
      pocket.textContent = String(number);
      pocket.style.setProperty("--pocket-angle", `${(index + 0.5) * step}deg`);
      roulettePockets.append(pocket);

      const start = index * step;
      const end = (index + 1) * step;
      const colorValue = color === "green" ? "#295d4a" : color === "gold" ? "#b88232" : "#08090a";
      gradientStops.push(`${colorValue} ${start}deg ${end}deg`);
    });

    rouletteWheel.style.setProperty("--roulette-gradient", `conic-gradient(${gradientStops.join(",")})`);

    for (let number = 0; number <= 36; number += 1) {
      const button = document.createElement("button");
      const color = rouletteColor(number);
      button.className = `roulette-number is-${color}`;
      button.type = "button";
      button.textContent = String(number);
      button.dataset.rouletteNumber = String(number);
      button.setAttribute("aria-pressed", "false");
      rouletteNumberGrid.append(button);
    }
  }

  function updateRouletteSelection() {
    const hasBet = (type, value) => rouletteBets.some((bet) => bet.type === type && bet.value === value);

    rouletteColorButtons.forEach((button) => {
      const selected = hasBet("color", button.dataset.rouletteColor);
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    rouletteNumberGrid?.querySelectorAll("[data-roulette-number]").forEach((button) => {
      const selected = hasBet("number", Number(button.dataset.rouletteNumber));
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const numberCount = rouletteBets.filter((bet) => bet.type === "number").length;
    const colors = rouletteBets
      .filter((bet) => bet.type === "color")
      .map((bet) => bet.value === "gold" ? "Gold" : "Black");
    const parts = [];
    if (numberCount) parts.push(`${numberCount} number${numberCount === 1 ? "" : "s"}`);
    if (colors.length) parts.push(colors.join(" + "));
    const cost = rouletteBetCost(rouletteBets);
    const label = rouletteBets.length ? `${parts.join(" + ")} · ${formatNumber(cost)} credits` : "No bets selected";
    if (rouletteBetLabel) rouletteBetLabel.textContent = label;
    setResult(rouletteResultLabel, rouletteBets.length ? `${rouletteBets.length} active bet${rouletteBets.length === 1 ? "" : "s"}. Tap again to remove.` : "Choose one or more numbers and/or a color.");
    updateCredits();
  }

  function toggleRouletteBet(type, value) {
    if (machineBusy) return;
    const index = rouletteBets.findIndex((bet) => bet.type === type && bet.value === value);
    if (index >= 0) rouletteBets.splice(index, 1);
    else rouletteBets.push({ type, value });
    updateRouletteSelection();
  }

  async function rollRoulette() {
    const activeBets = rouletteBets.map((bet) => ({ ...bet }));
    const totalStake = rouletteBetCost(activeBets);
    if (!activeBets.length) {
      setResult(rouletteResultLabel, "Choose at least one number or color first.");
      return;
    }
    if (!spendCredits(totalStake) || !rouletteWheel || !rouletteBall) return;
    setMachineBusy(true);
    setResult(rouletteResultLabel, "The ball is running around Midnight Boulevard…");

    const outcome = secureRandomIndex(37);
    const pocketIndex = ROULETTE_ORDER.indexOf(outcome);
    const pocketAngle = (pocketIndex + 0.5) * (360 / ROULETTE_ORDER.length);
    rouletteRotation += 1800 + secureRandomIndex(4) * 360;
    const desiredBallAngle = rouletteRotation + pocketAngle;
    rouletteBallRotation -= 2520;
    const correction = ((rouletteBallRotation - desiredBallAngle) % 360 + 360) % 360;
    rouletteBallRotation -= correction;
    rouletteWheel.style.transform = `rotate(${rouletteRotation}deg)`;
    rouletteBall.style.transform = `rotate(${rouletteBallRotation}deg)`;
    rouletteBall.classList.add("is-rolling");

    await wait(2450);
    rouletteBall.classList.remove("is-rolling");
    const payout = rouletteResult(activeBets, outcome);
    const winningBets = activeBets.filter((bet) => rouletteResult(bet, outcome) > 0);
    const color = rouletteColor(outcome);
    if (payout > 0) {
      awardCredits(payout, `Midnight Roulette returned ${payout} free DR Credits.`);
      setResult(rouletteResultLabel, `${outcome} / ${color.toUpperCase()} — ${winningBets.length} BET${winningBets.length === 1 ? "" : "S"} HIT. +${payout} DR Credits`, true);
    } else {
      updateCredits("The ball missed your bet. No real value was lost.");
      setResult(rouletteResultLabel, `${outcome} / ${color.toUpperCase()} — The next roll is yours.`);
    }

    setMachineBusy(false);
  }

  async function flipChromeCoin() {
    if (!spendCredits(GAME_COSTS.flip) || !flipCoin) return;
    setMachineBusy(true);
    setResult(flipResultLabel, "The chrome coin is in the air…");
    flipCoin.classList.remove("is-flipping");
    void flipCoin.offsetWidth;
    flipCoin.classList.add("is-flipping");

    const outcome = secureRandomIndex(2) === 0 ? "dr" : "chrome";
    await wait(850);
    flipCoin.classList.toggle("is-chrome", outcome === "chrome");
    const payout = flipResult(flipChoice, outcome);

    if (payout > 0) {
      awardCredits(payout, `Chrome Flip returned ${payout} free DR Credits.`);
      setResult(flipResultLabel, `${outcome.toUpperCase()} — Correct call. +${payout} DR Credits`, true);
    } else {
      updateCredits("Wrong side this time. Your wallet balance did not change.");
      setResult(flipResultLabel, `${outcome.toUpperCase()} — Try the next flip.`);
    }

    setMachineBusy(false);
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function getMetaMaskProvider() {
    const ethereum = window.ethereum;
    if (!ethereum) return null;
    const candidates = Array.isArray(ethereum.providers) ? ethereum.providers : [ethereum];
    return candidates.find((candidate) => candidate?.isMetaMask) || null;
  }

  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function utf8ToHex(value) {
    return `0x${[...new TextEncoder().encode(value)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function createSignInMessage(account) {
    const nonceValues = new Uint32Array(3);
    crypto.getRandomValues(nonceValues);
    const nonce = [...nonceValues].map((value) => value.toString(16).padStart(8, "0")).join("");
    const origin = window.location.origin;

    return `${window.location.host} wants you to sign in with your Ethereum account:\n${account}\n\nAccess the free-play Don Rashid DR Arcade. This signature does not approve token transfers.\n\nURI: ${origin}/arcade/\nVersion: 1\nChain ID: ${network.chainIdDecimal || 84532}\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
  }

  function setWalletMessage(message, isError = false) {
    if (!walletMessage) return;
    walletMessage.textContent = message;
    walletMessage.classList.toggle("is-error", isError);
  }

  async function ensureTestNetwork(activeProvider) {
    const currentChain = await activeProvider.request({ method: "eth_chainId" });
    if (String(currentChain).toLowerCase() === BASE_SEPOLIA_CHAIN_ID.toLowerCase()) return;

    try {
      await activeProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }]
      });
    } catch (error) {
      if (Number(error?.code) !== 4902) throw error;
      await activeProvider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: BASE_SEPOLIA_CHAIN_ID,
          chainName: network.chainName || "Base Sepolia",
          nativeCurrency: network.nativeCurrency || { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: network.rpcUrls || ["https://sepolia.base.org"],
          blockExplorerUrls: network.blockExplorerUrls || ["https://sepolia.basescan.org"]
        }]
      });
    }
  }

  async function readTokenBalance(activeProvider, account) {
    if (!tokenConfigured) return 0n;
    const addressParameter = account.slice(2).toLowerCase().padStart(64, "0");
    const rawBalance = await activeProvider.request({
      method: "eth_call",
      params: [{
        to: token.address,
        data: `0x70a08231${addressParameter}`
      }, "latest"]
    });
    return wholeTokenBalance(BigInt(rawBalance || "0x0"), token.decimals || 18);
  }

  function updateHolderAccess() {
    const cachedMinimum = cachedHolderAccess ? BigInt(Math.max(0, Number(cachedHolderAccess.minimum) || 0)) : 0n;
    const activeBalance = walletVerified ? wholeBalance : cachedMinimum;
    const activeTier = holderTier(activeBalance, config.holderTiers);
    if (walletVerified) saveHolderAccess(activeTier);
    if (holderTierLabel) holderTierLabel.textContent = walletVerified ? activeTier.name : `${activeTier.name}${cachedHolderAccess ? " / saved" : ""}`;

    const cosmeticCopy = {
      "Street Access": "Street build active",
      "Chrome Access": "Gold lowrider skin active in Night Run",
      "Neon Access": "Gold skin + VIP Neon Strip map active",
      "Crown Access": "Crown arcade theme, badge and all cosmetics active",
    };
    if (holderCosmeticStatus) holderCosmeticStatus.textContent = cosmeticCopy[activeTier.name] || activeTier.unlock;

    tierCards.forEach((card) => {
      const minimum = BigInt(card.dataset.tierMinimum || "0");
      card.classList.toggle("is-active", activeBalance >= minimum);
    });

    document.body.dataset.holderTier = activeTier.name.toLowerCase().replace(/\s+/g, "-");
  }

  function resetWalletUi(clearSavedAccess = false) {
    connectedAccount = "";
    walletVerified = false;
    wholeBalance = 0n;
    if (clearSavedAccess) {
      cachedHolderAccess = null;
      try {
        localStorage.removeItem(HOLDER_ACCESS_KEY);
      } catch (error) {
        // Clearing a cosmetic cache is optional.
      }
    }
    walletPanel?.classList.remove("is-connected");
    if (walletStateLabel) walletStateLabel.textContent = "Wallet not connected";
    if (walletAddress) walletAddress.textContent = "CONNECT TO VERIFY";
    if (drcBalance) drcBalance.textContent = "—";
    if (connectWalletButton) {
      connectWalletButton.disabled = false;
      connectWalletButton.firstElementChild.textContent = "Connect wallet";
    }
    if (addTokenButton) addTokenButton.disabled = true;
    if (clearWalletButton) clearWalletButton.hidden = true;
    setWalletMessage("Connection and signature only. No token approval or transfer.");
    updateHolderAccess();
  }

  async function connectWallet() {
    provider = getMetaMaskProvider();
    if (!provider) {
      if (isMobileDevice()) {
        window.location.assign(config.metaMaskDeepLink || "https://metamask.app.link/dapp/donrashid.com/arcade/");
      } else {
        window.open("https://metamask.io/download/", "_blank", "noopener,noreferrer");
        setWalletMessage("MetaMask was not detected. Install the extension and return to this page.", true);
      }
      return;
    }

    if (connectWalletButton) connectWalletButton.disabled = true;
    setWalletMessage("Waiting for MetaMask connection…");

    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const account = Array.isArray(accounts) ? accounts[0] : "";
      if (!isEthereumAddress(account)) throw new Error("MetaMask did not return a valid address.");

      connectedAccount = account;
      await ensureTestNetwork(provider);
      setWalletMessage("Confirm the free login signature. It cannot move tokens.");
      const message = createSignInMessage(account);
      await provider.request({
        method: "personal_sign",
        params: [utf8ToHex(message), account]
      });

      walletVerified = true;
      walletPanel?.classList.add("is-connected");
      if (walletStateLabel) walletStateLabel.textContent = "Wallet verified / Base Sepolia";
      if (walletAddress) walletAddress.textContent = shortenAddress(account);
      if (clearWalletButton) clearWalletButton.hidden = false;

      if (tokenConfigured) {
        wholeBalance = await readTokenBalance(provider, account);
        if (drcBalance) drcBalance.textContent = `${formatNumber(Number(wholeBalance))} ${token.symbol || "DRC"}`;
        if (addTokenButton) addTokenButton.disabled = false;
        setWalletMessage("Verified. Read-only DRC balance check complete. No approval was requested.");
      } else {
        wholeBalance = 0n;
        if (drcBalance) drcBalance.textContent = "SETUP PENDING";
        setWalletMessage("Wallet verified. The DRC test contract address will be added after deployment.");
      }

      if (connectWalletButton) connectWalletButton.firstElementChild.textContent = "Wallet connected";
      updateHolderAccess();
    } catch (error) {
      const rejected = Number(error?.code) === 4001;
      if (!walletVerified) resetWalletUi();
      setWalletMessage(
        rejected ? "Connection or signature cancelled. No wallet permission was changed." : (error?.message || "Wallet connection failed."),
        true
      );
    } finally {
      if (connectWalletButton) connectWalletButton.disabled = false;
    }
  }

  async function addTokenToWallet() {
    if (!provider || !tokenConfigured) return;
    try {
      const added = await provider.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: token.address,
            symbol: token.symbol || "DRC",
            decimals: token.decimals || 18
          }
        }
      });
      setWalletMessage(added ? "DRC was added to MetaMask." : "DRC was not added. Your wallet remains connected.");
    } catch (error) {
      setWalletMessage("MetaMask could not add the DRC display token.", true);
    }
  }

  function chooseOption(buttons, selectedValue, dataKey, resultElement, label) {
    buttons.forEach((button) => {
      const selected = button.dataset[dataKey] === selectedValue;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    setResult(resultElement, `${label} selected.`);
  }

  machineTabs.forEach((button) => button.addEventListener("click", () => showMachine(button.dataset.machine)));
  machineFullscreenButtons.forEach((button) => button.addEventListener("click", () => void toggleMachineFullscreen(button)));
  if (spinButton) spinButton.addEventListener("click", () => void spinSlots());
  if (rouletteButton) rouletteButton.addEventListener("click", () => void rollRoulette());
  if (flipButton) flipButton.addEventListener("click", () => void flipChromeCoin());

  rouletteColorButtons.forEach((button) => button.addEventListener("click", () => {
    toggleRouletteBet("color", button.dataset.rouletteColor);
  }));

  rouletteNumberGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-roulette-number]");
    if (!button || machineBusy) return;
    toggleRouletteBet("number", Number(button.dataset.rouletteNumber));
  });

  if (rouletteClearButton) rouletteClearButton.addEventListener("click", () => {
    if (machineBusy) return;
    rouletteBets = [];
    updateRouletteSelection();
  });

  flipChoiceButtons.forEach((button) => button.addEventListener("click", () => {
    flipChoice = button.dataset.flipChoice;
    const label = flipChoice === "dr" ? "DR" : "Chrome";
    chooseOption(flipChoiceButtons, flipChoice, "flipChoice", flipResultLabel, label);
  }));

  if (connectWalletButton) connectWalletButton.addEventListener("click", () => void connectWallet());
  if (addTokenButton) addTokenButton.addEventListener("click", () => void addTokenToWallet());
  if (clearWalletButton) clearWalletButton.addEventListener("click", () => resetWalletUi(true));
  if (resetCreditsButton) resetCreditsButton.addEventListener("click", () => {
    creditsState = { credits: DAILY_CREDIT_GRANT, lastGrant: dayKey(), granted: false };
    saveCredits();
    updateCredits("Demo balance reset to 1,000 free DR Credits.");
    if (creditGrantStatus) creditGrantStatus.textContent = "Demo balance reset";
  });

  document.addEventListener("fullscreenchange", updateMachineFullscreenButtons);
  document.addEventListener("webkitfullscreenchange", updateMachineFullscreenButtons);
  document.addEventListener("keydown", (event) => {
    if (event.code === "Escape" && pseudoFullscreenPanel) closePseudoMachineFullscreen();
  });

  if (creditGrantStatus) {
    creditGrantStatus.textContent = creditsState.granted
      ? `${formatNumber(DAILY_CREDIT_GRANT)} free daily credits loaded`
      : "Today's free credits already loaded";
  }

  buildSlotMachine();
  buildRoulette();
  updateRouletteSelection();
  saveCredits();
  updateCredits();
  updateHolderAccess();
});
