window.DR_ARCADE_CONFIG = Object.freeze({
  network: Object.freeze({
    chainId: "0x14a34",
    chainIdDecimal: 84532,
    chainName: "Base Sepolia",
    nativeCurrency: Object.freeze({ name: "Ether", symbol: "ETH", decimals: 18 }),
    rpcUrls: Object.freeze(["https://sepolia.base.org"]),
    blockExplorerUrls: Object.freeze(["https://sepolia.basescan.org"])
  }),
  token: Object.freeze({
    address: "0x9FCE62AFCc03f2F3B3CcA9738A99c543E737830B",
    name: "Don Rashid Coin",
    symbol: "DRC",
    decimals: 18,
    maxSupply: "10000000"
  }),
  holderTiers: Object.freeze([
    Object.freeze({ minimum: 0, name: "Street Access", unlock: "Free DR Arcade" }),
    Object.freeze({ minimum: 100, name: "Chrome Access", unlock: "Gold lowrider skin" }),
    Object.freeze({ minimum: 500, name: "Neon Access", unlock: "Exclusive Neon Strip map" }),
    Object.freeze({ minimum: 1000, name: "Crown Access", unlock: "Crown machine theme and profile badge" })
  ]),
  metaMaskDeepLink: "https://metamask.app.link/dapp/donrashid.com/arcade/"
});
