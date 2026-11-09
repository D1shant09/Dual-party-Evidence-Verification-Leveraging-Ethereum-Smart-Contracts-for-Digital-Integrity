# Graph Report - docsafe-main  (2026-11-09)

## Corpus Check
- Corpus is ~8,321 words - fits in a single context window. You may not need a graph.

## Summary
- 188 nodes · 269 edges · 16 communities (12 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Frontend ESLint Configuration
- Hardhat & Contract Tooling
- Pinata IPFS Upload Service
- Web3 Wagmi & Contract ABI
- Express Backend & Storage Dependencies
- Local Blockchain & MetaMask Setup
- Pinata SDK Package Setup
- React & Styling Dependencies
- Document Verification UI Components
- Contract Deployment Scripts
- Routing & Navigation Views
- Frontend Build & NPM Scripts
- Knowledge Graph Guidelines
- Vite Brand Assets
- React Brand Assets

## God Nodes (most connected - your core abstractions)
1. `scripts` - 9 edges
2. `wagmi` - 9 edges
3. `react` - 6 edges
4. `scripts` - 5 edges
5. `react-router-dom` - 5 edges
6. `App()` - 5 edges
7. `ConnectWallet()` - 5 edges
8. `Document Verification Lifecycle` - 5 edges
9. `hardhat` - 4 edges
10. `buffer` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Pinata IPFS Storage Integration` --semantically_similar_to--> `Pinata Sample PDF Asset`  [INFERRED] [semantically similar]
  README.md → pinata-starter/sample.pdf
- `safeDocFe React Entry HTML` --conceptually_related_to--> `DocSafe Decentralized Document Verification`  [INFERRED]
  safeDocFe/index.html → README.md
- `Home()` --calls--> `ConnectWallet()`  [EXTRACTED]
  safeDocFe/src/Home.jsx → safeDocFe/src/components/ConnectWallet.jsx
- `safeDocFe React Entry HTML` --conceptually_related_to--> `safeDocFe React Vite Template`  [INFERRED]
  safeDocFe/index.html → safeDocFe/README.md
- `App()` --calls--> `Provider()`  [EXTRACTED]
  safeDocFe/src/App.jsx → safeDocFe/src/components/provider/Provider.tsx

## Import Cycles
- 4-file cycle: `safeDocFe/src/App.jsx -> safeDocFe/src/Home.jsx -> safeDocFe/src/components/ConnectWallet.jsx -> safeDocFe/src/components/Account.jsx -> safeDocFe/src/App.jsx`

## Hyperedges (group relationships)
- **DocSafe Multi-Party Verification Workflow** — readme_document_lifecycle, readme_provider_role, readme_recipient_role, readme_viewer_role [EXTRACTED 1.00]
- **Hardhat Local Development Chain Environment** — local_blockchain_hardhat_setup, local_blockchain_chain_31337, local_blockchain_test_accounts, local_blockchain_metamask_config [EXTRACTED 1.00]

## Communities (16 total, 4 thin omitted)

### Community 0 - "Frontend ESLint Configuration"
Cohesion: 0.10
Nodes (27): eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @tailwindcss/vite, @types/react (+19 more)

### Community 1 - "Hardhat & Contract Tooling"
Cohesion: 0.09
Nodes (22): description, devDependencies, ethers@^6.17.0, hardhat@^2.26.3, @nomicfoundation/hardhat-ethers@^3.1.0, name, private, scripts (+14 more)

### Community 2 - "Pinata IPFS Upload Service"
Cohesion: 0.10
Nodes (18): App(), { File }, fs, get(), pinata, { PinataSDK }, upload(), app (+10 more)

### Community 3 - "Web3 Wagmi & Contract ABI"
Cohesion: 0.21
Nodes (12): react, wagmi, react@^19.0.0, Account(), formatAddress(), Connect(), ConnectorButton(), ConnectWallet() (+4 more)

### Community 4 - "Express Backend & Storage Dependencies"
Cohesion: 0.13
Nodes (18): buffer, express, multer, author, dependencies, buffer@^6.0.3, express@^4.21.2, multer@^1.4.5-lts.1 (+10 more)

### Community 5 - "Local Blockchain & MetaMask Setup"
Cohesion: 0.15
Nodes (14): Hardhat Local Chain 31337, Contract Deployment & Artifact Sync, DocSafe Local Hardhat Setup, MetaMask Local Network Configuration, Pre-funded Development Test Accounts, Pinata Sample PDF Asset, DocSafe Decentralized Document Verification, Document Verification Lifecycle (+6 more)

### Community 6 - "Pinata SDK Package Setup"
Cohesion: 0.17
Nodes (12): author, dependencies, pinata-web3@^0.5.4, description, pinata-web3, keywords, license, main (+4 more)

### Community 7 - "React & Styling Dependencies"
Cohesion: 0.18
Nodes (11): react-dom, tailwindcss, @tanstack/react-query, viem, dependencies, react-dom@^19.0.0, react-router-dom@^7.1.5, tailwindcss@^4.0.6 (+3 more)

### Community 8 - "Document Verification UI Components"
Cohesion: 0.33
Nodes (6): App(), AddDocumentButton(), Provider(), Reciepient(), RecipientDocuments(), Home()

### Community 9 - "Contract Deployment Scripts"
Cohesion: 0.29
Nodes (3): { ethers, artifacts }, fs, path

### Community 10 - "Routing & Navigation Views"
Cohesion: 0.70
Nodes (3): react-router-dom, Home(), Navbar()

### Community 11 - "Frontend Build & NPM Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

## Knowledge Gaps
- **9 isolated node(s):** `Graphify Knowledge Graph Guidelines`, `Contract Deployment & Artifact Sync`, `Provider Workflow Role`, `Recipient Workflow Role`, `Viewer Access Role` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 73 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `wagmi` connect `Web3 Wagmi & Contract ABI` to `Frontend ESLint Configuration`, `React & Styling Dependencies`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `Graphify Knowledge Graph Guidelines`, `Contract Deployment & Artifact Sync`, `Provider Workflow Role` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend ESLint Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.10344827586206896 - nodes in this community are weakly interconnected._
- **Why does `react-router-dom` connect `Routing & Navigation Views` to `Frontend ESLint Configuration`, `Document Verification UI Components`, `React & Styling Dependencies`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `Hardhat & Contract Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Pinata IPFS Upload Service` be split into smaller, more focused modules?**
  _Cohesion score 0.09881422924901186 - nodes in this community are weakly interconnected._
- **Should `Express Backend & Storage Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.1286549707602339 - nodes in this community are weakly interconnected._