# Graph Report - docsafe-main  (2026-11-11)

## Corpus Check
- 52 files · ~31,835 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 3, .example 2, .css 2)

## Summary
- 308 nodes · 524 edges · 17 communities (12 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `844191b1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Frontend ESLint Configuration
- Hardhat & Contract Tooling
- Pinata IPFS Upload Service
- wagmi
- wagmi
- Local Blockchain & MetaMask Setup
- Pinata SDK Package Setup
- safeDocBe/package.json
- generate_algorithms_pdf.py
- AuditPortal.jsx
- Product
- Design System: DocSafe Evidence Chain
- Knowledge Graph Guidelines
- Vite Brand Assets
- React Brand Assets
- react-router-dom

## God Nodes (most connected - your core abstractions)
1. `react` - 17 edges
2. `wagmi` - 16 edges
3. `fetchEvidenceMetadata()` - 11 edges
4. `Product` - 11 edges
5. `CONTRACT_ADDRESS` - 10 edges
6. `Design System: DocSafe Evidence Chain` - 9 edges
7. `scripts` - 9 edges
8. `RecipientDocuments()` - 8 edges
9. `calculateSHA256()` - 8 edges
10. `viem` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Pinata IPFS Storage Integration` --semantically_similar_to--> `Pinata Sample PDF Asset`  [INFERRED] [semantically similar]
  README.md → pinata-starter/sample.pdf
- `safeDocFe React Entry HTML` --conceptually_related_to--> `DocSafe Decentralized Document Verification`  [INFERRED]
  safeDocFe/index.html → README.md
- `fetchCompleteAuditTrail()` --calls--> `fetchEvidenceMetadata()`  [EXTRACTED]
  safeDocFe/src/services/auditService.js → safeDocFe/src/services/api.js
- `Home()` --calls--> `ConnectWallet()`  [EXTRACTED]
  safeDocFe/src/Home.jsx → safeDocFe/src/components/ConnectWallet.jsx
- `App()` --calls--> `AuditPortal()`  [EXTRACTED]
  safeDocFe/src/App.jsx → safeDocFe/src/components/audit/AuditPortal.jsx

## Import Cycles
- 4-file cycle: `safeDocFe/src/App.jsx -> safeDocFe/src/Home.jsx -> safeDocFe/src/components/ConnectWallet.jsx -> safeDocFe/src/components/Account.jsx -> safeDocFe/src/App.jsx`

## Hyperedges (group relationships)
- **DocSafe Multi-Party Verification Workflow** — readme_document_lifecycle, readme_provider_role, readme_recipient_role, readme_viewer_role [EXTRACTED 1.00]
- **Hardhat Local Development Chain Environment** — local_blockchain_hardhat_setup, local_blockchain_chain_31337, local_blockchain_test_accounts, local_blockchain_metamask_config [EXTRACTED 1.00]

## Communities (17 total, 5 thin omitted)

### Community 0 - "Frontend ESLint Configuration"
Cohesion: 0.06
Nodes (42): eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, react-dom, tailwindcss (+34 more)

### Community 1 - "Hardhat & Contract Tooling"
Cohesion: 0.07
Nodes (25): description, devDependencies, ethers@^6.17.0, hardhat@^2.26.3, @nomicfoundation/hardhat-ethers@^3.1.0, name, private, scripts (+17 more)

### Community 2 - "Pinata IPFS Upload Service"
Cohesion: 0.06
Nodes (35): App(), { File }, fs, get(), pinata, { PinataSDK }, upload(), { DatabaseSync } (+27 more)

### Community 3 - "wagmi"
Cohesion: 0.13
Nodes (32): react, viem, viem@^2.23.2, App(), AdminConsole(), AddDocumentButton(), CATEGORIES, Provider() (+24 more)

### Community 4 - "wagmi"
Cohesion: 0.33
Nodes (8): wagmi, Account(), formatAddress(), Connect(), ConnectorButton(), ConnectWallet(), Home(), queryClient

### Community 5 - "Local Blockchain & MetaMask Setup"
Cohesion: 0.15
Nodes (14): Hardhat Local Chain 31337, Contract Deployment & Artifact Sync, DocSafe Local Hardhat Setup, MetaMask Local Network Configuration, Pre-funded Development Test Accounts, Pinata Sample PDF Asset, DocSafe Decentralized Document Verification, Document Verification Lifecycle (+6 more)

### Community 6 - "Pinata SDK Package Setup"
Cohesion: 0.17
Nodes (12): author, dependencies, pinata-web3@^0.5.4, description, pinata-web3, keywords, license, main (+4 more)

### Community 7 - "safeDocBe/package.json"
Cohesion: 0.13
Nodes (18): buffer, express, multer, author, dependencies, buffer@^6.0.3, express@^4.21.2, multer@^1.4.5-lts.1 (+10 more)

### Community 9 - "AuditPortal.jsx"
Cohesion: 0.38
Nodes (6): AuditPortal(), ChainOfCustodyTimeline(), CustodyCertificateModal(), fetchAuditEvents(), fetchCompleteAuditTrail(), formatContractEvent()

### Community 10 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 11 - "Design System: DocSafe Evidence Chain"
Cohesion: 0.08
Nodes (25): Buttons, Cards / Containers, Colors, Components, Custody Certificate Modal (Signature Component), Design System: DocSafe Evidence Chain, Do:, Do's and Don'ts (+17 more)

### Community 16 - "react-router-dom"
Cohesion: 0.46
Nodes (5): react-router-dom, Home(), Navbar(), ThemeToggle(), useTheme()

## Knowledge Gaps
- **9 isolated node(s):** `Graphify Knowledge Graph Guidelines`, `Vite Logo`, `React Logo`, `Contract Deployment & Artifact Sync`, `Provider Workflow Role` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 135 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `wagmi` to `Frontend ESLint Configuration`, `AuditPortal.jsx`, `wagmi`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `Graphify Knowledge Graph Guidelines`, `Vite Logo`, `React Logo` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend ESLint Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.06464646464646465 - nodes in this community are weakly interconnected._
- **Why does `wagmi` connect `wagmi` to `Frontend ESLint Configuration`, `AuditPortal.jsx`, `wagmi`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `Hardhat & Contract Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.06854838709677419 - nodes in this community are weakly interconnected._
- **Should `Pinata IPFS Upload Service` be split into smaller, more focused modules?**
  _Cohesion score 0.05919661733615222 - nodes in this community are weakly interconnected._
- **Should `wagmi` be split into smaller, more focused modules?**
  _Cohesion score 0.12518853695324283 - nodes in this community are weakly interconnected._