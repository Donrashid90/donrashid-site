export const DAILY_CREDIT_GRANT = 1000;
export const CREDIT_CAP = 5000;

export const HOLDER_TIERS = Object.freeze([
  Object.freeze({ minimum: 0, name: "Street Access", unlock: "Free DR Arcade" }),
  Object.freeze({ minimum: 100, name: "Chrome Access", unlock: "Gold lowrider skin" }),
  Object.freeze({ minimum: 500, name: "Neon Access", unlock: "Exclusive Neon Strip map" }),
  Object.freeze({ minimum: 1000, name: "Crown Access", unlock: "Crown machine theme and profile badge" })
]);

export const SLOT_SYMBOLS = Object.freeze([
  Object.freeze({ id: "coin", label: "DR", icon: "DR", triplePayout: 300 }),
  Object.freeze({ id: "lowrider", label: "Lowrider", icon: "◆", triplePayout: 240 }),
  Object.freeze({ id: "wheel", label: "Chrome wheel", icon: "◉", triplePayout: 180 }),
  Object.freeze({ id: "palm", label: "Palm", icon: "♠", triplePayout: 120 }),
  Object.freeze({ id: "cassette", label: "Cassette", icon: "▣", triplePayout: 90 })
]);

export const GAME_COSTS = Object.freeze({ slots: 20, roulette: 30, flip: 10 });

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

export function slotPayout(symbolIds) {
  if (!Array.isArray(symbolIds) || symbolIds.length !== 3) return 0;
  const [first, second, third] = symbolIds;

  if (first === second && second === third) {
    return SLOT_SYMBOLS.find((symbol) => symbol.id === first)?.triplePayout || 0;
  }

  if (first === second || first === third || second === third) return 35;
  return 0;
}

export function rouletteResult(choice, outcome) {
  const validChoices = ["gold", "black"];
  if (!validChoices.includes(choice) || !validChoices.includes(outcome)) {
    throw new Error("Invalid roulette selection");
  }
  return choice === outcome ? 60 : 0;
}

export function flipResult(choice, outcome) {
  const validChoices = ["dr", "chrome"];
  if (!validChoices.includes(choice) || !validChoices.includes(outcome)) {
    throw new Error("Invalid flip selection");
  }
  return choice === outcome ? 20 : 0;
}
