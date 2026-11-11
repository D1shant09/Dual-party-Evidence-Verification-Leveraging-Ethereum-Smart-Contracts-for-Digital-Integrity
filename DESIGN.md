---
name: DocSafe Evidence Chain
description: Decentralized digital evidence preservation and chain-of-custody protocol
colors:
  primary: "#4f46e5"
  primary-hover: "#4338ca"
  primary-muted: "#eef2ff"
  integrity-emerald: "#059669"
  integrity-emerald-muted: "#ecfdf5"
  dispute-amber: "#d97706"
  dispute-amber-muted: "#fffbeb"
  defect-crimson: "#dc2626"
  defect-crimson-muted: "#fef2f2"
  review-blue: "#2563eb"
  review-blue-muted: "#eff6ff"
  category-purple: "#7e22ce"
  category-purple-muted: "#f3e8ff"
  neutral-bg: "#f8fafc"
  neutral-surface: "#ffffff"
  neutral-text: "#0f172a"
  neutral-text-muted: "#64748b"
  neutral-border: "#e2e8f0"
  dark-bg: "#0b0f19"
  dark-surface: "#111827"
  dark-surface-elevated: "#1f2937"
  dark-text: "#f8fafc"
  dark-text-muted: "#94a3b8"
  dark-border: "#334155"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.35
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.025em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card-surface:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.xl}"
    padding: "20px"
  input-field:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: DocSafe Evidence Chain

## Overview

**Creative North Star: "The Cryptographic Evidence Vault"**

DocSafe is an institutional judicial and forensic evidentiary platform. The interface balances the solemn procedural gravity of a courtroom record with the uncompromising mathematical precision of distributed cryptographic systems. Visual elements prioritize procedural clarity, auditability, and immediate human comprehension over speculative decoration or futuristic glow.

The system employs a dual-mode canvas: a soft, glare-free neutral daylight tone in Light Mode (`#f8fafc`) and a deep, focused obsidian slate in Dark Mode (`#0b0f19`). High-contrast typography pairs standard system sans-serif headers with razor-sharp monospace typography for all evidentiary primitives (SHA-256 hashes, IPFS CIDs, Ethereum addresses, block heights, and case reference numbers).

**Key Characteristics:**
- **Institutional Gravitas:** Restrained palette grounded in Courtroom Indigo and neutral slates; avoids distracting gradients and cyber-neon styling.
- **Micro-Data Density:** Monospace data blocks formatted for quick visual verification and instant copy-to-clipboard actions.
- **Unambiguous Semantic Signaling:** Rigorous status indicators where each lifecycle stage (Validated, Contested, Under Review, Defective) has a dedicated, universally consistent chromatic identity.
- **Physical Document Preservation:** Authentic document aesthetics for the printable custody certificate that remain clean white paper regardless of active screen theme.

## Colors

The palette employs a disciplined judicial hierarchy: Courtroom Indigo commands intentional action, anchored by neutral obsidian slates and calibrated semantic signals for evidence lifecycle verification.

### Primary
- **Courtroom Indigo** (`#4f46e5`): The primary system accent, used exclusively for affirmative primary calls-to-action (e.g., initiating containers, uploading evidence, submitting votes) and brand identity badges.
- **Courtroom Indigo Deep** (`#4338ca`): Pressed and hover states for primary interactive buttons.
- **Courtroom Indigo Tint** (`#eef2ff` in light / `rgba(49, 46, 129, 0.4)` in dark): Subtle highlight backgrounds for active navigation tabs and selected case pills.

### Secondary
- **Integrity Emerald** (`#059669` / `#ecfdf5` tint): Signifies verified evidence, consensus validation, and successful on-chain transaction mining.
- **Dispute Amber** (`#d97706` / `#fffbeb` tint): Signifies Algorithm 2 contested evidence, pending recipient approval, and quorum arbitration warnings.
- **Defect Crimson** (`#dc2626` / `#fef2f2` tint): Reserved strictly for formal evidence rejections, revocations, and transaction failures.
- **Reviewer Electric Blue** (`#2563eb` / `#eff6ff` tint): Denotes intermediate states, including IPFS ingestion, pending wallet signatures, and independent validator queue items.
- **Jurisdiction Purple** (`#7e22ce` / `#f3e8ff` tint): Dedicated to case category labeling and contract ownership badges.

### Neutral
- **Canvas Slate** (`#f8fafc` in light / `#0b0f19` in dark): The root background tone; avoids sterile blinding white and hollow pure black.
- **Container Surface** (`#ffffff` in light / `#111827` in dark): Structural card background providing a crisp foundation for evidence lists and form containers.
- **Elevated Slate** (`#f1f5f9` in light / `#1f2937` in dark): Secondary nested panels, drop-zones, and code-block backgrounds.
- **Text Charcoal & Soft White** (`#0f172a` in light / `#f8fafc` in dark): High-legibility text with strict WCAG AAA contrast ratios.
- **Muted Text Slate** (`#64748b` in light / `#94a3b8` in dark): Secondary metadata, field labels, and explanatory descriptions.
- **Structural Border** (`#e2e8f0` in light / `#334155` in dark): 1px structural framing defining cards, inputs, and table dividers.

### Named Rules
**The Zero-Glow Rule.** No decorative neon drop-shadows, blurred glowing borders, or pulsing halos. Visual pop is achieved strictly through crisp 1px borders, subtle surface contrast, and solid badge fills.

**The Semantic Reserved Rule.** Crimson is banned for decorative icons or secondary accents; red is reserved exclusively for defective, rejected, or revoked evidentiary states.

## Typography

**Display & UI Font:** System Sans-Serif (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`)
**Evidentiary & Hash Font:** Standard Monospace (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`)

**Character:** Highly legible, utilitarian, and dependable. The sans-serif conveys institutional legal reliability, while the monospace provides unequivocal character distinction (e.g., distinguishing `0` and `O`, `1` and `l`) for 64-character SHA-256 fingerprints and Ethereum hex addresses.

### Hierarchy
- **Display** (Bold 700, 28px / 1.75rem, line-height 1.25): Dashboard page headers and major portal titles.
- **Headline** (Bold 700, 20px / 1.25rem, line-height 1.35): Section cards, modal titles, and major stage headers.
- **Title** (Semi-Bold 600, 16px / 1rem, line-height 1.4): Evidence container titles and table column headers.
- **Body** (Regular 400, 14px / 0.875rem, line-height 1.5): Procedural descriptions, field inputs, and timeline narratives.
- **Label / Monospace Micro** (Semi-Bold 600, 11px–12px, letter-spacing 0.02em): IPFS CIDs, SHA-256 digests, transaction hashes, block numbers, and case tags.

### Named Rules
**The Dual-Identity Rule.** Monospace hashes and hexadecimal addresses must never float without an accompanying human-readable semantic label (e.g., "SHA-256 Digest:", "Recipient Address:").

## Layout

The spatial model operates on a standard 4px / 8px grid with a centered, reading-optimized single-column container (max-width `1024px` on dashboards, `672px` on modal dialogs, and `1280px` on navbar and wallet controls).

- **Margins & Gutters:** Mobile layouts use `16px` padding; desktop viewports expand to `24px` / `32px` internal padding.
- **Rhythm & Density:** Comfortable information density. Cards maintain `20px` to `24px` interior padding with `16px` to `24px` vertical gaps between distinct operational stages.
- **Responsive Stacking:** Forms, metadata grids, and action button groups stack vertically on viewports `< 640px` and convert to inline flex/grid rows on larger displays.

## Elevation & Depth

DocSafe employs a tonal layering philosophy with flat defaults. Depth is communicated primarily through subtle contrast between surface layers and crisp 1px borders, rather than dramatic multi-layered shadow casts.

### Shadow Vocabulary
- **Card Rest** (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`): Subtle baseline separation for resting container cards.
- **Modal Elevation** (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)` with `backdrop-filter: blur(4px)`): Used exclusively for centered modal dialogs (upload, challenge, reject, certificate) over a `rgba(0, 0, 0, 0.6)` backdrop.
- **Button Micro-Lift** (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`): Light tactile grounding on primary buttons.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are planar at rest. Shadow elevation is never used as pure ornamentation and appears only to indicate elevated interaction (modals, dropdown menus, or active drag-and-drop drop-zones).

## Shapes

The form language is clean and rectangular with disciplined corner rounding that maintains an approachable yet serious demeanor.

- **Primary Containers & Modals:** `12px` to `16px` border radius (`rounded-xl` to `rounded-2xl`).
- **Interactive Buttons & Inputs:** `6px` to `8px` border radius (`rounded-md` to `rounded-lg`).
- **Status Badges & Quick-Pills:** Full pill radius (`rounded-full` / `9999px`) to create clear visual separation between interactive cards and static status indicators.
- **Borders:** Consistent 1px solid borders (`border-slate-200` in light / `border-slate-800` in dark). Zero borderless cards.

## Components

### Buttons
- **Shape:** Softly squared corners with 6px–8px radius (`rounded-md` / `rounded-lg`).
- **Primary:** Solid Courtroom Indigo (`#4f46e5`) with pure white bold text (`#ffffff`), `px-4 py-2` padding, transition duration 150ms.
- **Hover / Focus:** Deepens to `#4338ca` on hover; clear 2px offset focus ring on `:focus-visible`.
- **Secondary / Action:** Muted neutral background (`bg-slate-100` / `dark:bg-slate-800`) with subtle 1px border.
- **Destructive:** Solid Defect Crimson (`#dc2626`) for irreversible formal rejections.

### Status Badges & Chips
- **Style:** Compact pill badge (`rounded-full`), `px-2.5 py-0.5`, font size 10px–11px, semi-bold font weight.
- **State Variants:**
  - *Validated:* Emerald background tint + dark emerald text + subtle emerald border.
  - *Contested / Change Phase:* Amber background tint + dark amber text + subtle amber border.
  - *Under Review / Unvalidated:* Blue background tint + dark blue text + subtle blue border.
  - *Rejected:* Crimson background tint + dark crimson text + subtle crimson border.
  - *Category Tag:* Purple background tint + dark purple text + subtle purple border.

### Cards / Containers
- **Corner Style:** `rounded-xl` (12px radius).
- **Background:** `bg-white` (Light) / `bg-slate-900` (Dark).
- **Border:** 1px solid `border-slate-200` (Light) / `border-slate-800` (Dark).
- **Internal Padding:** `p-5` to `p-6` (20px to 24px).
- **Hover Treatment:** Static at rest; interactive cards subtly highlight border to `border-indigo-300` / `border-indigo-600`.

### Inputs / Fields
- **Style:** 1px solid stroke (`border-slate-300` in light / `border-slate-700` in dark), background `bg-white` / `dark:bg-slate-800`, text `text-slate-900` / `dark:text-slate-100`, `rounded-lg`.
- **Focus:** 2px focus ring in indigo (`focus:ring-2 focus:ring-indigo-400 focus:outline-none`).
- **File Drop-Zone:** 2px dashed border (`border-dashed border-slate-300`); switches to `border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40` during drag hover.

### Navigation
- **Style:** Floating top bar with frosted glass backdrop blur (`backdrop-blur-md bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl`).
- **Links:** Active route highlighted in solid white / dark slate pill with indigo text and subtle shadow; inactive links rendered in subdued slate with hover highlight.
- **Theme Switcher:** Compact 3-state segmented pill toggle containing Sun, Moon, and Monitor inline SVG icons.

### Custody Certificate Modal (Signature Component)
- **Style:** High-resolution judicial affidavit format. Screen modal has theme-aware modal frame and controls, while the inner certificate body strictly renders as an authentic legal parchment document (`bg-white text-gray-900 border-2 border-gray-900` with official black custody seal badge).
- **Print Behavior:** Contains dedicated `print:` stylesheets ensuring standard letter/A4 printing without dark background ink or missing borders.

## Do's and Don'ts

### Do:
- **Do** always pair cryptographic hashes (SHA-256, IPFS CID, Tx Hashes) with clickable copy-to-clipboard affordances.
- **Do** display both the human-readable case number and title alongside numeric document IDs.
- **Do** maintain a strict 1px border around cards and inputs in both light and dark modes to preserve crisp structural contrast.
- **Do** preserve authentic light paper styling on the Chain-of-Custody Certificate so legal printouts remain clean and official.
- **Do** provide immediate inline transaction state feedback (uploading, signing in MetaMask, mining on chain, success, error).

### Don't:
- **Don't** use neon glowing box-shadows, scanlines, or decorative futuristic sci-fi tropes.
- **Don't** use red accents for non-destructive actions, neutral indicators, or decorative buttons.
- **Don't** render cryptographic hashes in proportional sans-serif fonts; always use standard monospace.
- **Don't** rely on color alone to communicate verification status; always pair with an explicit textual status label.
- **Don't** allow long cryptographic strings to overflow mobile viewports; enforce `break-all` or truncate with copy tooltips.
