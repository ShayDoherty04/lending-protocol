# DeFi Lending Protocol

A decentralised lending and yield protocol built on Ethereum, inspired by Aave and Compound. Users can deposit assets as collateral, borrow against them, earn yield, and be liquidated if their health factor drops below 1.

Built as a portfolio project to demonstrate full-stack Web3 development.

---

## Features

- Deposit ERC20 tokens as collateral and receive interest-bearing aTokens
- Borrow against collateral up to the configured LTV ratio
- Dynamic interest rates based on pool utilisation (kinked rate model)
- Liquidation mechanism for undercollateralised positions
- Chainlink price oracle integration with manual fallback for testing
- Health factor tracking per user
- Reentrancy protected

---

## Tech Stack

- **Smart Contracts** — Solidity 0.8.28
- **Development & Testing** — Hardhat, Ethers.js, Chai, Mocha
- **Price Feeds** — Chainlink AggregatorV3Interface
- **Frontend** — React, Vite, Ethers.js
- **Network** — Deployed on Sepolia testnet

---

## Contract Architecture

| Contract | Description |
|---|---|
| `LendingPool.sol` | Main entry point — deposit, withdraw, borrow, repay, liquidate |
| `AToken.sol` | Interest-bearing token minted on deposit |
| `DebtToken.sol` | Non-transferable debt token minted on borrow |
| `InterestRateStrategy.sol` | Kinked interest rate model based on utilisation |
| `ProtocolConfig.sol` | Risk parameters per asset (LTV, liquidation threshold, bonus) |
| `Oracle.sol` | Price oracle with Chainlink integration and manual fallback |
| `MockERC20.sol` | ERC20 token for local and testnet testing |

---

## Deployed Contracts (Sepolia)

| Contract | Address |
|---|---|
| LendingPool | `0x1061C7B22A68a969DC4b189Da5c1884AB1226274` |
| Oracle | `0x4065fc6baE83c3D874d6E9Dd540b709962eAA640` |
| ProtocolConfig | `0x7025fb06241E24B7Cdc973EC88FEC17D6A762AAE` |
| InterestRateStrategy | `0xaFB05656ec932D7fd018b91311C77CEbb712B2AE` |
| Mock USDC | `0x68B7cF84cE81548BfE33E038F7f414862758a86b` |
| Mock WETH | `0x4839206125e03F164363E23555b36208D8817fA9` |
| aUSDC | `0x9c51F1bd0947D9Fe40aCaEa72a44b582D1259Bd0` |
| dUSDC | `0xE17C12B7Cc566fF828D57Df5B97DF983062EF798` |

---

## Running Locally

### Prerequisites
- Node.js
- MetaMask browser extension

### Backend

```bash
cd lending_protocol_backend
npm install
npx hardhat compile
npx hardhat test
```

### Deploy to Sepolia

Create a `.env` file in `lending_protocol_backend`:

```
ALCHEMY_SEPOLIA_URL=your_alchemy_url
PRIVATE_KEY=your_private_key
```

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## How It Works

1. **Deposit** — User deposits USDC and receives aUSDC. The aUSDC balance grows over time as interest accrues via an index-based mechanism.

2. **Borrow** — User borrows against their collateral up to the LTV limit. A debt token (dUSDC) is minted to track the position.

3. **Interest Rates** — Rates are calculated dynamically based on pool utilisation. Below 80% utilisation rates rise gradually, above 80% they spike to protect liquidity.

4. **Liquidation** — If a user's health factor drops below 1.0 (collateral value × liquidation threshold < debt value), any address can liquidate the position and receive a bonus.

---

## Testing

```bash
cd lending_protocol_backend
npx hardhat test
```

Tests cover deposit, borrow, repay, withdraw, and liquidation scenarios.