# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Evidence Providers**: Forensic analysts, crime scene technicians, and law enforcement officers who initiate evidence containers, upload raw digital evidence (forensic scans, audio recordings, video surveillance, ballistics data), and submit SHA-256 integrity digests.
- **Authorized Recipients**: Prosecutors, court clerks, and judicial custodians who review submissions, authorize uploads, inspect files, accept or contest revisions, grant time-bound viewer permissions, or reject defective evidence with formal justification.
- **Independent Forensic Validators**: Designated impartial multi-party arbiters who vote to achieve quorum consensus on contested or revision-phase evidence submissions (Algorithm 2 arbitration).
- **Authorized Viewers**: Defense attorneys, presiding judges, and accredited expert witnesses granted specific read-only access by the recipient to examine authenticated evidence.

## Product Purpose

DocSafe Evidence Chain ensures digital evidence remains immutable, tamper-evident, and fully verifiable throughout its entire lifecycle—from crime scene or lab intake to courtroom presentation. It replaces fragile, paper-dependent or centralized custody logs with an Ethereum smart contract and decentralized IPFS storage layer that cryptographically guarantees evidence authenticity, provenance, and consensual transfer.

## Positioning

Unlike conventional centralized digital evidence management systems (DEMS) that rely on trusting a single cloud vendor or server administrator, DocSafe implements on-chain multi-party consent, immutable SHA-256 fingerprint verification, two-phase container initiation, and decentralized Byzantine fault-tolerant validator arbitration. A neighboring system cannot truthfully claim zero single-point-of-failure tampering guarantees or cryptographic self-authentication under Federal Rules of Evidence (FRE 902(13)/(14)).

## Operating Context

- **Workflow Stages**:
  1. *Container Initiation*: Provider registers an on-chain evidence container bound to case metadata and intended recipient address;
  2. *Recipient Consent*: Recipient signs on-chain authorization;
  3. *Evidence Ingestion*: Provider computes SHA-256 hash client-side, uploads payload to IPFS, and commits the CID and digest on-chain;
  4. *Verification & Arbitration*: Recipient validates, formally rejects (requiring a linked resubmission), or triggers Algorithm 2 (force-update / contest with sworn witness statement to invoke independent validator quorum);
  5. *Access Delegation & Presentation*: Recipient manages authorized viewer whitelists and exports a court-admissible Chain-of-Custody Certificate.
- **Environments**: Forensic laboratory workstations, precinct intake terminals, prosecutorial offices, and courtroom evidence presentation displays.
- **Operating Networks**: Local Hardhat testnet (Chain ID 31337) and EVM-compatible networks, alongside decentralized IPFS nodes.

## Capabilities and Constraints

- **On-Chain Dual-Party State Machine**: Enforces strict state transitions (`addEmptyDocument`, `approveDocumentChange`, `updateDocument`, `validateDocument`, `rejectDocument`, `forceUpdateDocument`, `challengeDocument`, `createResubmission`).
- **Cryptographic Integrity**: Local browser-based SHA-256 fingerprinting matched against IPFS payload blocks; zero discrepancy tolerance.
- **Validator Quorum Management**: Owner-controlled dynamic quorum thresholds (`validationLimit`) requiring multi-validator signatures for contested evidence validation.
- **Role-Based Viewing**: Smart contract function `viewDocument()` strictly gating IPFS CID resolution to authorized addresses.
- **Technical Constraints**: Ethereum gas fees on public networks, local MetaMask connectivity required, file payload limit of 100 MB per container.

## Brand Commitments

- **Name**: DocSafe Evidence Chain.
- **Voice**: Rigorous, authoritative, precise, court-grade, and transparent.
- **Tone & Identity**: Clean cryptographic law-enforcement and judicial aesthetic. Subdued slate/neutral surfaces, high-contrast typography, crisp status badges, and authentic courtroom document formatting.

## Evidence on Hand

- **Smart Contract Suite**: Fully tested Solidity contracts (`contracts/safedoc.sol`) deployed and verified with 32 passing unit tests.
- **Decentralized Storage**: Local IPFS node gateway integration for file storage and retrieval.
- **Court-Admissible Export**: Printable Chain-of-Custody Certificate modal with digital signature blocks and chronological event ledger.
- **Audit Logging**: SQLite / on-chain dual-layer event persistence (`safeDocBe/docsafe.db`).

## Product Principles

1. **Cryptographic Proof Over Human Trust**: No evidence state is recognized without an on-chain transaction hash, cryptographic timestamp, and matching SHA-256 digest.
2. **Strict Procedural Due Process**: Neither provider nor recipient can unilaterally alter, replace, or conceal evidence without explicit counter-party consent or independent validator quorum.
3. **Courtroom Admissibility by Design**: Every lifecycle event records block height, transaction hash, and actor address to satisfy the highest standard of self-authenticating electronic evidence.
4. **Resilience to Procedural Defects**: Formal rejection does not destroy audit history; it preserves defect reasons and establishes cryptographically linked resubmission containers.
5. **Zero Frictional Ambiguity**: High-clarity status signaling, clear step-by-step guidance, and unambiguous role distinctions for investigators, prosecutors, and arbiters.

## Accessibility & Inclusion

- Adherence to WCAG 2.1 AA standards for color contrast across both Light and Dark themes.
- Clear semantic HTML, keyboard accessible modal dialogs, and screen-reader accessible form controls and status indicators.
- Non-reliant on color alone for critical evidence status (using explicit textual badges, icons, and case numbers).
