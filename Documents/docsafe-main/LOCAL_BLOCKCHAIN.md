# DocSafe: local Hardhat blockchain setup

This setup uses a local Hardhat node (chain ID `31337`) and its pre-funded development accounts. Transactions on this chain use **test ETH only** and do not spend real ETH. Keep the local RPC bound to your own machine; do not expose it to a public network.

## Requirements

- Node.js 20.6+ (Node 20.20+, 22+, or 24+ are all supported)
- MetaMask browser extension

## 1. Quick Start Commands (from repository root)

The root `package.json` now includes top-level convenience scripts to run contracts, test suite, frontend, and backend without path confusion:

```bash
# Terminal 1: Start local blockchain node
npm run chain

# Terminal 2: Compile contracts and deploy locally
npm run compile
npm run deploy:local

# Run contract automated tests
npm test

# Terminal 3: Start frontend (runs vite from safeDocFe)
npm run fe:dev

# Terminal 4 (Optional): Start backend API
npm run be:start
```

## 2. Start the local chain

In terminal 1, from `docsafe-main`:

```bash
npm run chain
```

Leave this terminal running. It prints 20 funded development accounts (10,000 test ETH each) and private keys. They are public test credentials intended only for this local node. **Never import one into a real wallet or use it on Mainnet.**

## 3. Compile and deploy the contract

In terminal 2, from `docsafe-main`:

```bash
npm run compile
npm run deploy:local
```

The deploy script deploys `DocumentVerification` to chain ID `31337` and automatically updates:

- `safeDocFe/src/constants/constants.jsx` with the new local contract address
- `safeDocFe/src/ABI/DocumentVerificationABI.json` with the ABI compiled from `contracts/safedoc.sol`

If you stop and restart the local chain, deploy again: a fresh node has a fresh state and the old contract deployment will not exist.

## 4. Add the local network to MetaMask

MetaMask → network selector → Add network → Add a network manually:

- Network name: `DocSafe Local Hardhat`
- New RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`
- Block explorer URL: leave blank

Save, then switch MetaMask to **DocSafe Local Hardhat**.

For testing, import one of the private keys printed by the local Hardhat node into a separate MetaMask account. This account is pre-funded with test ETH on this local node. Treat these keys as public and unsafe outside local development. Do not use your everyday wallet account for local testing.

### Test Accounts Reference:
- Account #0 (Deployer/Provider): `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
  Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Account #1 (Recipient): `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
  Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

## 5. Start the frontend

You can run the frontend directly from the root with:

```bash
npm run fe:dev
```

Or by entering the directory:

```bash
cd safeDocFe
npm run dev
```

Open the Vite URL it prints (usually `http://localhost:5173`). Connect MetaMask and ensure it is on `DocSafe Local Hardhat` (chain ID `31337`). The frontend detects if you are on an incorrect network and offers a one-click network switch button.

### Root Cause of `vite: command not found`:
The project has three separate `package.json` manifests (`root`, `safeDocFe/`, `safeDocBe/`). Vite is installed as a local dependency in `safeDocFe/node_modules/.bin/vite`. Typing `vite` from root or without `npx`/`npm run` failed because `vite` was not on the system PATH. Using `npm run fe:dev` from root or running `npm run dev` inside `safeDocFe` resolves this.

## 6. Backend / IPFS note

The blockchain transaction workflow runs locally without external dependencies. The optional document upload feature connects to Pinata IPFS. To enable IPFS uploads, configure `safeDocBe/.env` from `safeDocBe/.env.example` with a valid `PINATA_JWT`, then start the backend with:

```bash
npm run be:start
```

The backend includes CORS headers so the Vite frontend (`http://localhost:5173`) can communicate with it, and automatically cleans up temporary files to avoid disk leaks.

## Troubleshooting

- **Insufficient funds:** verify MetaMask's selected network is chain ID `31337`, and import a fresh account key printed by the currently running Hardhat node.
- **Contract call fails / no code at address:** rerun `npm run deploy:local` while the node is running, then refresh the frontend.
- **Could not connect to RPC:** keep `npm run chain` running at `127.0.0.1:8545`.
- **MetaMask nonce confusion:** Reset local account activity in MetaMask via Settings → Advanced → Clear activity and nonce data when restarting local Hardhat nodes.
