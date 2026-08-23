import {
  DAILY_CREDIT_GRANT,
  GAME_COSTS,
  SLOT_SYMBOLS,
  applyDailyCreditGrant,
  dayKey,
  flipResult,
  holderTier,
  isEthereumAddress,
  rouletteResult,
  secureRandomIndex,
  shortenAddress,
  slotPayout,
  wholeTokenBalance
} from "./core.js";

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
  const connectWalletButton = document.getElementById("connectWallet");
  const addTokenButton = document.getElementById("addTokenButton");
  const clearWalletButton = document.getElementById("clearWalletButton");
  const walletMessage = document.getElementById("walletMessage");
  const tierCards = [...document.querySelectorAll("[data-tier-minimum]")];

  const creditBalance = document.getElementById("creditBalance");
  const creditGrantStatus = document.getElementById("creditGrantStatus");
  const arcadeStatus = document.getElementById("arcadeStatus");
  const resetCreditsButton = document.getElementById("resetCreditsButton");
  const machineTabs = [...document.querySelectorAll("[data-machine]")];
  const machinePanels = [...document.querySelectorAll("[data-panel]")];

  const slotReels = document.getElementById("slotReels");
  const reelValues = [...document.querySelectorAll("[data-reel]")];
  const spinButton = document.getElementById("spinButton");
  const slotsResult = document.getElementById("slotsResult");

  const rouletteWheel = document.getElementById("rouletteWheel");
  const rouletteButton = document.getElementById("rouletteButton");
  const rouletteResultLabel = document.getElementById("rouletteResult");
  const rouletteChoiceButtons = [...document.querySelectorAll("[data-roulette-choice]")];

  const flipCoin = document.getElementById("flipCoin");
  const flipButton = document.getElementById("flipButton");
  const flipResultLabel = document.getElementById("flipResult");
  const flipChoiceButtons = [...document.querySelectorAll("[data-flip-choice]")];

  const CREDIT_STORAGE_KEY = "don-rashid-arcade-credits-v1";
  const BASE_SEPOLIA_CHAIN_ID = network.chainId || "0x14a34";
  const tokenConfigured = isEthereumAddress(token.address)
    && !/^0x0{40}$/i.test(token.address);

  let provider = null;
  let connectedAccount = "";
  let walletVerified = false;
  let wholeBalance = 0n;
  let machineBusy = false;
  let rouletteChoice = "gold";
  let flipChoice = "dr";
  let rouletteRotation = 0;
  let creditsState = loadCredits();

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
    if (creditBalance) creditBalance.textContent = formatNumber(creditsState.credits);
    if (arcadeStatus && message) arcadeStatus.textContent = message;

    if (spinButton) spinButton.disabled = machineBusy || creditsState.credits < GAME_COSTS.slots;
    if (rouletteButton) rouletteButton.disabled = machineBusy || creditsState.credits < GAME_COSTS.roulette;
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

  function setResult(element, message, isWin = false) {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("is-win", isWin);
  }

  function randomSymbol() {
    return SLOT_SYMBOLS[secureRandomIndex(SLOT_SYMBOLS.length)];
  }

  function displayReelSymbol(element, symbol) {
    if (!element || !symbol) return;
    element.textContent = symbol.icon;
    const label = element.parentElement?.querySelector("small");
    if (label) label.textContent = symbol.label;
  }

  async function spinSlots() {
    if (!spendCredits(GAME_COSTS.slots) || !slotReels) return;
    setMachineBusy(true);
    setResult(slotsResult, "Chrome is moving…");
    slotReels.classList.add("is-spinning");

    const shuffleTimer = window.setInterval(() => {
      reelValues.forEach((element) => displayReelSymbol(element, randomSymbol()));
    }, 95);

    await wait(760);
    window.clearInterval(shuffleTimer);
    slotReels.classList.remove("is-spinning");

    const symbols = reelValues.map((element) => {
      const symbol = randomSymbol();
      displayReelSymbol(element, symbol);
      return symbol;
    });
    const payout = slotPayout(symbols.map((symbol) => symbol.id));

    if (payout > 0) {
      awardCredits(payout, `Lowrider Slots returned ${payout} free DR Credits.`);
      setResult(slotsResult, `${symbols.map((symbol) => symbol.label).join(" • ")} — +${payout} DR Credits`, true);
    } else {
      updateCredits("No match this time. DRC in your wallet was never touched.");
      setResult(slotsResult, `${symbols.map((symbol) => symbol.label).join(" • ")} — No match`);
    }

    setMachineBusy(false);
  }

  async function rollRoulette() {
    if (!spendCredits(GAME_COSTS.roulette) || !rouletteWheel) return;
    setMachineBusy(true);
    setResult(rouletteResultLabel, "The Midnight wheel is moving…");

    const outcome = secureRandomIndex(2) === 0 ? "gold" : "black";
    rouletteRotation += 1440 + (outcome === "gold" ? 18 : 8);
    rouletteWheel.style.transform = `rotate(${rouletteRotation}deg)`;

    await wait(1180);
    const payout = rouletteResult(rouletteChoice, outcome);
    if (payout > 0) {
      awardCredits(payout, `Midnight Roulette returned ${payout} free DR Credits.`);
      setResult(rouletteResultLabel, `${outcome.toUpperCase()} — Correct call. +${payout} DR Credits`, true);
    } else {
      updateCredits("The wheel landed on the other color. No real value was lost.");
      setResult(rouletteResultLabel, `${outcome.toUpperCase()} — Try the next roll.`);
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
    const activeBalance = walletVerified ? wholeBalance : 0n;
    const activeTier = holderTier(activeBalance, config.holderTiers);
    if (holderTierLabel) holderTierLabel.textContent = activeTier.name;

    tierCards.forEach((card) => {
      const minimum = BigInt(card.dataset.tierMinimum || "0");
      card.classList.toggle("is-active", activeBalance >= minimum);
    });

    document.body.dataset.holderTier = activeTier.name.toLowerCase().replace(/\s+/g, "-");
  }

  function resetWalletUi() {
    connectedAccount = "";
    walletVerified = false;
    wholeBalance = 0n;
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
  if (spinButton) spinButton.addEventListener("click", () => void spinSlots());
  if (rouletteButton) rouletteButton.addEventListener("click", () => void rollRoulette());
  if (flipButton) flipButton.addEventListener("click", () => void flipChromeCoin());

  rouletteChoiceButtons.forEach((button) => button.addEventListener("click", () => {
    rouletteChoice = button.dataset.rouletteChoice;
    chooseOption(rouletteChoiceButtons, rouletteChoice, "rouletteChoice", rouletteResultLabel, rouletteChoice[0].toUpperCase() + rouletteChoice.slice(1));
  }));

  flipChoiceButtons.forEach((button) => button.addEventListener("click", () => {
    flipChoice = button.dataset.flipChoice;
    const label = flipChoice === "dr" ? "DR" : "Chrome";
    chooseOption(flipChoiceButtons, flipChoice, "flipChoice", flipResultLabel, label);
  }));

  if (connectWalletButton) connectWalletButton.addEventListener("click", () => void connectWallet());
  if (addTokenButton) addTokenButton.addEventListener("click", () => void addTokenToWallet());
  if (clearWalletButton) clearWalletButton.addEventListener("click", resetWalletUi);
  if (resetCreditsButton) resetCreditsButton.addEventListener("click", () => {
    creditsState = { credits: DAILY_CREDIT_GRANT, lastGrant: dayKey(), granted: false };
    saveCredits();
    updateCredits("Demo balance reset to 1,000 free DR Credits.");
    if (creditGrantStatus) creditGrantStatus.textContent = "Demo balance reset";
  });

  if (creditGrantStatus) {
    creditGrantStatus.textContent = creditsState.granted
      ? `${formatNumber(DAILY_CREDIT_GRANT)} free daily credits loaded`
      : "Today's free credits already loaded";
  }

  saveCredits();
  updateCredits();
  updateHolderAccess();
});
