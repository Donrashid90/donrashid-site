import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = Object.fromEntries(await Promise.all([
  "index.html",
  "game/index.html",
  "arcade/index.html",
  "arcade/arcade.js",
  "arcade/config.js",
  "contracts/DonRashidCoin.sol"
].map(async (path) => [path, await readFile(new URL(`../${path}`, import.meta.url), "utf8")])));

test("adds Arcade navigation without removing the existing Game route", () => {
  assert.match(files["index.html"], /href="\/game\/">Game<\/a>/);
  assert.match(files["index.html"], /href="\/arcade\/\?v=6">Arcade<\/a>/);
  assert.match(files["game/index.html"], /class="nav-current" href="\/game\/"/);
  assert.match(files["game/index.html"], /href="\/arcade\/\?v=6">Arcade<\/a>/);
});

test("preserves the existing five-level game, leaderboard and reward integration", () => {
  assert.match(files["game/index.html"], /Five-level campaign/);
  assert.match(files["game/index.html"], /don-rashid-leaderboard\.chummy-knoll-6431\.chatgpt\.site/);
  assert.match(files["game/index.html"], /id="promoReward"/);
});

test("every Arcade JavaScript element id exists in the Arcade document", () => {
  const ids = new Set([...files["arcade/index.html"].matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const requestedIds = [...files["arcade/arcade.js"].matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]);
  const missing = requestedIds.filter((id) => !ids.has(id));
  assert.deepEqual(missing, []);
});

test("upgrades the Arcade with five-reel slots and numbered roulette", () => {
  assert.match(files["arcade/index.html"], /id="slotReels"/);
  assert.match(files["arcade/index.html"], /5 LINES/);
  assert.match(files["arcade/index.html"], /id="rouletteNumberGrid"/);
  assert.match(files["arcade/index.html"], /id="rouletteBall"/);
  assert.match(files["arcade/index.html"], /id="rouletteClearButton"/);
  assert.match(files["arcade/arcade.js"], /toggleRouletteBet/);
  assert.match(files["arcade/arcade.js"], /\(index \+ 0\.5\) \* step/);
  assert.match(files["arcade/arcade.js"], /ROULETTE_ORDER/);
  assert.match(files["arcade/arcade.js"], /Array\.from\(\{ length: 5 \}/);
});

test("mirrors the live DR Credit balance inside every free-play machine", () => {
  const balanceMirrors = files["arcade/index.html"].match(/data-credit-balance/g) || [];
  assert.equal(balanceMirrors.length, 4);
  assert.match(files["arcade/index.html"], /class="machine-credit-strip"/);
  assert.match(files["arcade/arcade.js"], /querySelectorAll\("\[data-credit-balance\]"\)/);
  assert.match(files["arcade/arcade.js"], /creditBalances\.forEach/);
});

test("the browser integration contains no token-spending RPC method", () => {
  const integration = files["arcade/arcade.js"];
  assert.doesNotMatch(integration, /eth_sendTransaction|eth_sendRawTransaction|eth_signTransaction|transferFrom|\bapprove\s*\(/);
  assert.match(integration, /eth_call/);
  assert.match(integration, /personal_sign/);
});

test("the DRC contract has a fixed supply and no privileged owner controls", () => {
  const contract = files["contracts/DonRashidCoin.sol"];
  assert.match(contract, /10_000_000 ether/);
  assert.match(contract, /_mint\(msg\.sender, MAX_SUPPLY\)/);
  assert.doesNotMatch(contract, /onlyOwner|Ownable|function\s+mint|blacklist|taxFee|upgradeTo/);
});

test("the live configuration references the verified Base Sepolia token", () => {
  assert.match(files["arcade/config.js"], /chainId:\s*"0x14a34"/);
  assert.match(files["arcade/config.js"], /address:\s*"0x9FCE62AFCc03f2F3B3CcA9738A99c543E737830B"/);
  assert.doesNotMatch(files["arcade/config.js"], /chainId:\s*"0x2105"/);
  assert.match(files["arcade/index.html"], /FREE PLAY • NO CASH OUT/);
});
