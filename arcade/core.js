export const DAILY_CREDIT_GRANT = 1000;
export const CREDIT_CAP = 5000;

export const HOLDER_TIERS = Object.freeze([
  Object.freeze({ minimum: 0, name: "Street Access", unlock: "Free DR Arcade" }),
  Object.freeze({ minimum: 100, name: "Chrome Access", unlock: "Gold lowrider skin" }),
  Object.freeze({ minimum: 500, name: "Neon Access", unlock: "Exclusive Neon Strip map" }),
  Object.freeze({ minimum: 1000, name: "Crown Access", unlock: "Crown machine theme and profile badge" })
]);

export const SLOT_SYMBOLS = Object.freeze([
  Object.freeze({ id: "dr", label: "DR Wild", icon: "DR", wild: true, payouts: Object.freeze({ 3: 180, 4: 500, 5: 1200 }) }),
  Object.freeze({ id: "crown", label: "Night Crown", icon: "♛", payouts: Object.freeze({ 3: 140, 4: 360, 5: 900 }) }),
  Object.freeze({ id: "lowrider", label: "Lowrider", icon: "◆", payouts: Object.freeze({ 3: 100, 4: 260, 5: 650 }) }),
  Object.freeze({ id: "vinyl", label: "Gold Vinyl", icon: "◉", payouts: Object.freeze({ 3: 75, 4: 190, 5: 460 }) }),
  Object.freeze({ id: "palm", label: "Midnight Palm", icon: "♠", payouts: Object.freeze({ 3: 55, 4: 140, 5: 330 }) }),
  Object.freeze({ id: "cassette", label: "Analog Tape", icon: "▣", payouts: Object.freeze({ 3: 40, 4: 100, 5: 240 }) }),
  Object.freeze({ id: "neon", label: "Neon Star", icon: "✦", payouts: Object.freeze({ 3: 30, 4: 75, 5: 180 }) })
]);

export const SLOT_PAYLINES = Object.freeze([
  Object.freeze([0, 0, 0, 0, 0]),
  Object.freeze([1, 1, 1, 1, 1]),
  Object.freeze([2, 2, 2, 2, 2]),
  Object.freeze([0, 1, 2, 1, 0]),
  Object.freeze([2, 1, 0, 1, 2])
]);

export const ROULETTE_ORDER = Object.freeze([
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]);

export const ROULETTE_GOLD_NUMBERS = Object.freeze([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const GAME_COSTS = Object.freeze({ slots: 40, roulette: 30, flip: 10 });

export function isEthereumAddress(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function shortenAddress(address) {
  if (!isEthereumAddress(address)) return "Wallet not connected";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function wholeTokenBalance(rawValue, decimals = 18) {
  const value = typeof rawValue === "bigint" ? rawValue : BigInt(rawValue || 0);
  const divisor = 10n ** BigInt(decimals);
  return value / divisor;
}

export function holderTier(balance, tiers = HOLDER_TIERS) {
  const numericBalance = typeof balance === "bigint" ? balance : BigInt(Math.max(0, Number(balance) || 0));
  return tiers.reduce((active, tier) => (
    numericBalance >= BigInt(tier.minimum) ? tier : active
  ), tiers[0]);
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function applyDailyCreditGrant(savedState, currentDay = dayKey()) {
  const parsedCredits = Number(savedState?.credits);
  const credits = Number.isFinite(parsedCredits) ? Math.max(0, Math.floor(parsedCredits)) : 0;
  const lastGrant = typeof savedState?.lastGrant === "string" ? savedState.lastGrant : "";

  if (lastGrant === currentDay) {
    return { credits, lastGrant, granted: false };
  }

  return {
    credits: Math.min(CREDIT_CAP, credits + DAILY_CREDIT_GRANT),
    lastGrant: currentDay,
    granted: true
  };
}

export function secureRandomIndex(length, cryptoObject = globalThis.crypto) {
  if (!Number.isInteger(length) || length <= 0) throw new RangeError("length must be positive");
  if (!cryptoObject?.getRandomValues) throw new Error("Secure randomness is unavailable");
  const values = new Uint32Array(1);
  cryptoObject.getRandomValues(values);
  return values[0] % length;
}

export function slotPayoutDetails(reels) {
  if (!Array.isArray(reels) || reels.length !== 5 || reels.some((reel) => !Array.isArray(reel) || reel.length !== 3)) {
    return { total: 0, wins: [] };
  }

  const symbolsById = new Map(SLOT_SYMBOLS.map((symbol) => [symbol.id, symbol]));
  const wins = [];

  SLOT_PAYLINES.forEach((rows, lineIndex) => {
    const ids = rows.map((row, reelIndex) => reels[reelIndex][row]);
    const baseId = ids.find((id) => !symbolsById.get(id)?.wild) || "dr";
    let count = 0;

    for (const id of ids) {
      if (id === baseId || symbolsById.get(id)?.wild) count += 1;
      else break;
    }

    if (count < 3) return;
    const symbol = symbolsById.get(baseId);
    const payout = Number(symbol?.payouts?.[count] || 0);
    if (payout > 0) wins.push({ line: lineIndex + 1, count, symbolId: baseId, payout, rows });
  });

  return { total: wins.reduce((sum, win) => sum + win.payout, 0), wins };
}

export function slotPayout(reels) {
  return slotPayoutDetails(reels).total;
}

export function rouletteColor(number) {
  const numericNumber = Number(number);
  if (!Number.isInteger(numericNumber) || numericNumber < 0 || numericNumber > 36) return "invalid";
  if (numericNumber === 0) return "green";
  return ROULETTE_GOLD_NUMBERS.includes(numericNumber) ? "gold" : "black";
}

export function rouletteResult(selection, outcome, stake = GAME_COSTS.roulette) {
  const number = Number(outcome);
  if (!Number.isInteger(number) || number < 0 || number > 36 || !selection || typeof selection !== "object") {
    throw new Error("Invalid roulette selection");
  }

  if (selection.type === "number") {
    const selectedNumber = Number(selection.value);
    if (!Number.isInteger(selectedNumber) || selectedNumber < 0 || selectedNumber > 36) {
      throw new Error("Invalid roulette selection");
    }
    return selectedNumber === number ? stake * 36 : 0;
  }

  if (selection.type === "color" && ["gold", "black"].includes(selection.value)) {
    return rouletteColor(number) === selection.value ? stake * 2 : 0;
  }

  throw new Error("Invalid roulette selection");
}

export function flipResult(choice, outcome) {
  const validChoices = ["dr", "chrome"];
  if (!validChoices.includes(choice) || !validChoices.includes(outcome)) {
    throw new Error("Invalid flip selection");
  }
  return choice === outcome ? 20 : 0;
}
