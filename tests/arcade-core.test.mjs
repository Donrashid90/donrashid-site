import test from "node:test";
import assert from "node:assert/strict";

import {
  CREDIT_CAP,
  DAILY_CREDIT_GRANT,
  applyDailyCreditGrant,
  flipResult,
  holderTier,
  isEthereumAddress,
  rouletteColor,
  rouletteBetCost,
  rouletteResult,
  secureRandomIndex,
  shortenAddress,
  slotPayout,
  wholeTokenBalance
} from "../arcade/core.js";

test("recognizes and shortens an Ethereum address", () => {
  const address = "0x1234567890abcdef1234567890abcdef12345678";
  assert.equal(isEthereumAddress(address), true);
  assert.equal(shortenAddress(address), "0x1234…5678");
  assert.equal(isEthereumAddress("0x1234"), false);
});

test("converts an ERC-20 balance to whole DRC", () => {
  assert.equal(wholeTokenBalance(1000n * 10n ** 18n), 1000n);
  assert.equal(wholeTokenBalance("999999999999999999"), 0n);
});

test("selects the highest unlocked holder tier", () => {
  assert.equal(holderTier(0).name, "Street Access");
  assert.equal(holderTier(99).name, "Street Access");
  assert.equal(holderTier(100).name, "Chrome Access");
  assert.equal(holderTier(500).name, "Neon Access");
  assert.equal(holderTier(1000).name, "Crown Access");
});

test("grants free credits only once per UTC day and respects the cap", () => {
  const first = applyDailyCreditGrant(null, "2026-08-22");
  assert.deepEqual(first, {
    credits: DAILY_CREDIT_GRANT,
    lastGrant: "2026-08-22",
    granted: true
  });

  const sameDay = applyDailyCreditGrant(first, "2026-08-22");
  assert.equal(sameDay.credits, DAILY_CREDIT_GRANT);
  assert.equal(sameDay.granted, false);

  const nextDay = applyDailyCreditGrant({ credits: 4700, lastGrant: "2026-08-22" }, "2026-08-23");
  assert.equal(nextDay.credits, CREDIT_CAP);
  assert.equal(nextDay.granted, true);
});

test("calculates free-play machine results", () => {
  const fiveReelWin = [
    ["crown", "dr", "neon"],
    ["lowrider", "dr", "cassette"],
    ["vinyl", "lowrider", "palm"],
    ["palm", "lowrider", "crown"],
    ["cassette", "lowrider", "vinyl"]
  ];
  assert.equal(slotPayout(fiveReelWin), 650);
  assert.equal(slotPayout([["dr"]]), 0);
  assert.equal(rouletteColor(0), "green");
  assert.equal(rouletteColor(1), "gold");
  assert.equal(rouletteColor(2), "black");
  assert.equal(rouletteResult({ type: "color", value: "gold" }, 1), 60);
  assert.equal(rouletteResult({ type: "color", value: "gold" }, 2), 0);
  assert.equal(rouletteResult({ type: "number", value: 17 }, 17), 1080);
  assert.equal(rouletteResult({ type: "number", value: 17 }, 18), 0);
  const multiBets = [
    { type: "number", value: 17 },
    { type: "number", value: 18 },
    { type: "color", value: "gold" }
  ];
  assert.equal(rouletteBetCost(multiBets), 90);
  assert.equal(rouletteResult(multiBets, 17), 1080);
  assert.equal(rouletteResult(multiBets, 18), 1140);
  assert.equal(rouletteResult([], 18), 0);
  assert.equal(flipResult("dr", "dr"), 20);
  assert.equal(flipResult("chrome", "dr"), 0);
});

test("secure random index stays inside the requested range", () => {
  const fakeCrypto = {
    getRandomValues(values) {
      values[0] = 17;
      return values;
    }
  };
  assert.equal(secureRandomIndex(5, fakeCrypto), 2);
  assert.throws(() => secureRandomIndex(0, fakeCrypto), /positive/);
});
