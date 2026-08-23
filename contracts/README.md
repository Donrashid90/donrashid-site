# Don Rashid Coin — Testnet contract

`DonRashidCoin.sol` is a fixed-supply ERC-20 access token for the DR Arcade prototype.

## Locked design

- Name: Don Rashid Coin
- Symbol: DRC
- Supply: 10,000,000 DRC
- Decimals: 18
- Initial holder: the wallet that deploys the contract
- No later minting
- No owner or administrator role
- No transfer tax, blacklist, pause switch, staking, or casino-wager function

The website only calls the read-only `balanceOf` function. It never requests an allowance and never transfers DRC.

## Safe deployment sequence

1. Compile with Solidity 0.8.24 using the official OpenZeppelin Contracts dependency.
2. Deploy from the intended treasury wallet on Base Sepolia first.
3. Keep the wallet seed phrase and private key outside the website and outside this repository.
4. Copy the resulting testnet contract address into `arcade/config.js`.
5. Test wallet connection, balance reading, and every holder tier before considering any mainnet deployment.

Do not sell, list, or add liquidity for DRC until its Swiss legal and regulatory classification has been reviewed.
