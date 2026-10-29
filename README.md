# DocSafe — Decentralized Document Verification & Management

DocSafe is a decentralized document verification and multi-party workflow application. It combines Ethereum smart contracts running on a local Hardhat blockchain with a React/Vite/Wagmi frontend and an optional Express backend for IPFS document storage.

Transactions run on a local blockchain with disposable development accounts using **test ETH only**—no real ETH, paid infrastructure, or mainnet wallets are required.

---

## Architecture Overview

```
docsafe-main/
├── contracts/             # Solidity smart contracts
│   └── safedoc.sol        # DocumentVerification contract (EVM Paris, Solc 0.8.28)
├── scripts/               # Blockchain automation scripts
│   └── deploy-local.cjs   # Deploys contract to Chain 31337 & syncs ABI/constants to FE
├── test/                  # Smart contract test suite
│   └── safedoc.test.cjs   # 16 unit tests covering access control & lifecycle
├── safeDocFe/             # Frontend application (React 19, Vite, Wagmi v2, Viem)
│   ├── src/ABI/           # Compiled contract ABI (auto-updated on deploy)
│   ├── src/constants/     # Deployed contract address (auto-updated on deploy)
│   └── src/components/    # Provider, Recipient, Wallet & Navigation components
├── safeDocBe/             # Backend API service (Express, Multer, Pinata IPFS)
│   ├── index.js           # Upload and retrieval endpoints with CORS & auto-cleanup
│   └── .env.example       # Pinata IPFS credentials template
├── hardhat.config.cjs     # Hardhat 2.x configuration (Chain ID: 31337)
├── LOCAL_BLOCKCHAIN.md    # Detailed local blockchain developer guide
└── package.json           # Root workspace scripts to run and test all components
```

---

## Document Lifecycle

```
[ Provider ]                          [ Smart Contract ]                       [ Recipient ]
     |                                        |                                      |
     |--- 1. addEmptyDocument(recipient) ---->|                                      |
     |                                        |--- 2. DocumentAdded Event ---------->|
     |                                        |                                      |
     |                                        |<-- 3. approveDocumentChange(docId) --|
     |                                        |                                      |
     |--- (Optional: Upload file to IPFS)     |                                      |
     |--- 4. updateDocument(docId, ipfsHash) ->|                                      |
     |                                        |                                      |
     |                                        |<-- 5. validateDocument(docId) -------|
     |                                        |                                      |
     |<-- 6. viewDocument(docId) -------------|------------------------------------->|
```

1. **Document Creation**: The Provider creates a new document entry specifying the Recipient's wallet address (`addEmptyDocument`).
2. **Recipient Approval**: The Recipient inspects the incoming request and approves the change (`approveDocumentChange`).
3. **Content Attachment**: The Provider uploads the file to IPFS (via backend or external gateway) and writes the IPFS hash to the contract (`updateDocument`).
4. **Verification**: The Recipient reviews the document content and validates it on-chain (`validateDocument`).
5. **Viewing / Access Control**: Provider, Recipient, and authorized Viewers can retrieve the IPFS hash (`viewDocument`).

---

## Prerequisites

- **Node.js**: `20.6+` (Node `20.20+`, `22+`, or `24+` are fully supported)
- **npm**: `10+`
- **MetaMask**: Browser extension installed in Chrome, Firefox, Brave, or Edge

---

## Quick Start Guide

You will need **three terminal windows** to run the complete local environment.

### Step 1: Install Dependencies

From the repository root (`~/Documents/docsafe-main`):

```bash
# 1. Install root dependencies (Hardhat, ethers)
npm install

# 2. Install frontend dependencies (React, Vite, Wagmi)
npm --prefix safeDocFe install

# 3. Install backend dependencies (Express, Pinata SDK)
npm --prefix safeDocBe install
```

---

### Step 2: Start the Local Hardhat Node (Terminal 1)

In your first terminal, run:

```bash
npm run chain
```

*Keep this terminal running.* This launches a local JSON-RPC Ethereum node on `http://127.0.0.1:8545` with Chain ID `31337`. It prints 20 pre-funded test accounts (10,000 test ETH each) and their private keys.

> [!CAUTION]
> These keys are public test credentials intended only for local development. Never send real funds to these addresses or import them into a wallet holding real assets.

---

### Step 3: Compile, Test & Deploy the Smart Contract (Terminal 2)

In a second terminal, run:

```bash
# Run the 16-case automated smart contract test suite
npm test

# Compile Solidity contracts
npm run compile

# Deploy to local chain and auto-update frontend constants
npm run deploy:local
```

The deployment script:
1. Deploys `DocumentVerification` to your running local node.
2. Writes the local contract address into `safeDocFe/src/constants/constants.jsx`.
3. Writes the latest compiled ABI into `safeDocFe/src/ABI/DocumentVerificationABI.json`.

---

### Step 4: Configure MetaMask for Local Development

Before opening the frontend, configure MetaMask to connect to your local chain:

1. Click the **Network Selector** in MetaMask (top-left) → **Add network** → **Add a network manually**.
2. Enter the following parameters:
   - **Network name**: `DocSafe Local Hardhat`
   - **New RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency symbol**: `ETH`
   - **Block explorer URL**: *(leave blank)*
3. Click **Save** and switch to **DocSafe Local Hardhat**.
4. Import the pre-funded development accounts into MetaMask via **Account Selector** → **Add account or hardware wallet** → **Import account**:

| Role | Address | Private Key (Local Node Test Key) |
| :--- | :--- | :--- |
| **Provider** (Account #0) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Recipient** (Account #1) | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |

Each imported account will show **10,000 ETH** in local test balance.

---

### Step 5: Start the Frontend (Terminal 3)

In your third terminal, start the Vite development server:

```bash
npm run fe:dev
```

Open the printed URL in your browser (usually `http://localhost:5173`).

---

### Step 6: Start the Backend (Terminal 4, Optional)

If you wish to test real IPFS file uploads to Pinata:

1. Copy the environment template:
   ```bash
   cp safeDocBe/.env.example safeDocBe/.env
   ```
2. Open `safeDocBe/.env` and insert your Pinata JWT:
   ```env
   PINATA_JWT=your_pinata_jwt_here
   PINATA_GATEWAY=your-gateway.mypinata.cloud
   ```
3. Start the Express backend:
   ```bash
   npm run be:start
   ```
   *The backend runs on `http://localhost:30123` with CORS enabled.*

*(Note: Blockchain transactions and verification workflows work completely offline on the local chain even without a Pinata account).*

---

## Step-by-Step Walkthrough in the Browser

1. **Connect Wallet**:
   - Open `http://localhost:5173`.
   - Click **Connect** and select **MetaMask**.
   - Make sure MetaMask is on `DocSafe Local Hardhat` (Chain `31337`).
   - If connected to any other chain, a warning banner will appear with a one-click **Switch to Local (31337)** button.

2. **Add a Document (as Provider)**:
   - Ensure MetaMask is on the Provider account (`0xf39F...`).
   - Click **Provider** in the navigation bar.
   - In the "Recipient Address" input, enter the Recipient address:
     ```
     0x70997970C51812dc3A010C7d01b50e0d17dc79C8
     ```
   - Click **Add Empty Document** and confirm the transaction in MetaMask.
   - The UI shows "Confirming transaction on local blockchain..." followed by a green success message with the transaction hash.

3. **Approve Document Change (as Recipient)**:
   - Switch MetaMask to the Recipient account (`0x7099...`).
   - Click **Recipient** in the navigation bar.
   - The new document appears under **Approve for Empty Documents**.
   - Click **Approve Change** and confirm the transaction in MetaMask.

4. **Verify / Validate Document (as Recipient)**:
   - Once a document has content attached, it moves to **Documents Needing Verification**.
   - Click **Validate Document** to mark it verified on-chain.
   - Validated documents appear under **Valid Documents** with full verification metadata.

---

## All Available npm Scripts

All common commands can be run directly from the repository root:

| Command | Action | Directory |
| :--- | :--- | :--- |
| `npm run chain` | Starts local Hardhat JSON-RPC node (`127.0.0.1:8545`) | Root |
| `npm run compile` | Compiles Solidity contracts with Hardhat 2 | Root |
| `npm run deploy:local` | Deploys contracts to local node & syncs frontend ABI/address | Root |
| `npm test` | Runs the 16-case Mocha/assert smart contract test suite | Root |
| `npm run fe:dev` | Starts the Vite React frontend development server | `safeDocFe/` |
| `npm run fe:build` | Runs the Vite production Rollup build | `safeDocFe/` |
| `npm run fe:lint` | Runs ESLint on frontend JavaScript and TypeScript files | `safeDocFe/` |
| `npm run be:start` | Starts the Express backend API on port 30123 | `safeDocBe/` |

---

## Troubleshooting & FAQs

### 1. `vite: command not found`
* **Why it happens**: Vite is installed inside `safeDocFe/node_modules/.bin`, not globally or at the root.
* **How to fix**: Run `npm run fe:dev` from the root directory, or run `npm run dev` after executing `cd safeDocFe`.

### 2. MetaMask "Nonce too high" or transaction stuck
* **Why it happens**: When you stop and restart `npm run chain`, the local blockchain resets to block 0, but MetaMask remembers past transaction nonces.
* **How to fix**: In MetaMask, go to **Settings** → **Advanced** → **Clear activity tab data** (or "Reset account"). This clears stale nonces without affecting your imported private keys.

### 3. "Contract call fails / no code at address"
* **Why it happens**: The local node was restarted, wiping the deployed contract from node memory.
* **How to fix**: With `npm run chain` active, run `npm run deploy:local` in another terminal, then refresh your browser.

### 4. "Wrong Network" warning in the frontend
* **How to fix**: Click the **Switch to Local (31337)** button on the warning banner, or switch networks manually in MetaMask to **DocSafe Local Hardhat**.

### 5. Node.js `--env-file` warnings
* Node.js `20.6+` automatically loads `.env` files. If you do not have a `.env` file in `safeDocBe/`, the backend gracefully continues without crashing.
