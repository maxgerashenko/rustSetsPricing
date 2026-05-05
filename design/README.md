# Handoff: Junkpile · Rust Skin Pricer

## Overview
A small utility that lets a Rust player paste a list of skin names, fetches their community-market prices, and shows a totaled inventory with 24h trend deltas. Three connected screens: **Input → Results → Edit List**.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. The task is to **recreate these HTML designs in the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.) using its established patterns, design tokens, and component primitives. If no environment exists yet, choose the most appropriate framework for the project (React + Tailwind/CSS modules is a reasonable default) and implement the designs there.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interaction states are settled. Recreate pixel-perfectly using the codebase's existing libraries.

## Screens / Views

### 1. Input
- **Purpose**: User pastes or types a list of skin names (one per line, or comma-separated).
- **Layout**: Vertically stacked, centered column, max-width 560px.
  1. Pill tag — `JUNKPILE · SKIN PRICER` with red dot
  2. Display headline — `Price your skin set` ("skin set" on its own line in red accent)
  3. Surface card containing:
     - `<textarea>` (220px min height, 18px/20px padding, 15px Inter, line-height 1.7)
     - Parse-row strip — uppercase mono caption: `<N> items detected · One per line · or comma-separated`
     - Action row (2-col grid: 1fr | 2fr) — **Paste** (ghost) and **Get Prices** (primary, accent bg)
  4. Helper text — `Pulls live community-market medians · refreshed every 5 min`
- **Components**: see Design Tokens for exact values.

### 2. Results
- **Purpose**: Show priced items, totals, and 24h trend deltas.
- **Layout**: Same shell as Input. Replaces the textarea card with:
  1. Meta strip (above card) — left: green pulse dot + `<N> resolved · <N> unknown`; right: USD/EUR segmented
  2. Surface card:
     - Item rows (44×44 striped thumb · name + slot meta · price + trend delta)
     - 3-up stat strip — `Items` / `Top Item` / `24h Δ`
     - Total bar — uppercase `TOTAL` label · large mono accent-colored amount
     - 3-col action row — Refresh / Copy / **Edit List** (primary)
  3. Footer link — `← New list`
- **States**:
  - **Loading** (~850ms after entry): rows dimmed to 0.6 opacity, prices replaced by shimmer skeletons.
  - **Refresh**: button icon rotates 180° over 600ms, loading state re-applied for 700ms.
  - **Copy**: button label flips to "Copied" + check icon for 1400ms; writes `Junkpile total: $X.XX (N items)` to clipboard.
  - **Unmatched item**: name in faint color + "Unmatched" caption; price renders as italic "not found".

### 3. Edit List
- **Purpose**: Add, remove, rename, and reorder items, then re-price.
- **Layout**: Same shell. Card contains:
  - Edit rows (4-col grid: handle · thumb · `<input>` · `×` button)
  - `+ Add item` dashed footer button
  - 2-col action row — Cancel (ghost) / **Save & Reprice** (primary)
- **Interactions**:
  - Drag any row by its `⋮⋮` handle → drop target highlights with accent-soft background.
  - `Enter` in any input → adds new empty row below.
  - `Backspace` on empty input → removes that row.
  - `×` button on a row removes it.

## Interactions & Behavior
- Navigation between screens is in-page state, not routes. State machine: `input → results ⇄ edit`, plus reset → `input`.
- Item parsing: split on newlines or commas, lookup name in catalog (exact, normalized, then substring fallback). Unmatched names render but contribute nothing to total.
- Currency toggle multiplies USD price by 0.92 for EUR; symbol swaps `$ → €`. Numbers always to 2 decimals, tabular-nums.
- Trend delta: `▲` green for positive, `▼` red for negative; absolute value shown without currency symbol.
- Animations:
  - Screen entry: fadeIn (320ms ease, 6px translateY).
  - Skeleton shimmer: 1.4s linear infinite.
  - Pulse dot (resolved indicator): 1.6s ease-in-out, opacity 0.5↔1.
  - Buttons: background color 120ms ease; `:active` translateY(1px).

## State Management
- `screen`: `'input' | 'results' | 'edit'`
- `text`: raw textarea string
- `items`: `{ id, raw, resolved: { key, name, slot, price, trend } | null }[]`
- `currency`: `'USD' | 'EUR'`
- `loading` (Results-local): boolean, true for ~850ms after items change, then on refresh.
- `copied` (Results-local): boolean, 1400ms timeout.
- `dragIdx` / `overIdx` (Edit-local): drag-and-drop indices.

## Design Tokens

### Colors (dark theme — primary)
| Token | Value | Use |
|---|---|---|
| `--bg` | `oklch(14% 0.006 40)` | Page background |
| `--bg-elev` | `oklch(18% 0.008 40)` | Card surface |
| `--bg-elev-2` | `oklch(22% 0.009 40)` | Inset / parse-row / inputs |
| `--line` | `oklch(26% 0.008 40)` | Dividers |
| `--line-strong` | `oklch(32% 0.01 40)` | Total bar top border |
| `--text` | `oklch(96% 0.004 80)` | Primary text |
| `--text-dim` | `oklch(74% 0.008 60)` | Secondary text |
| `--text-faint` | `oklch(54% 0.01 60)` | Captions / mono labels |
| `--accent` | `#CD412B` | Brick-red accent (sourced from rust.facepunch.com theme color) |
| `--accent-soft` | `rgba(205,65,43,0.14)` | Tag bg, drop-target highlight |
| `--accent-line` | `rgba(205,65,43,0.42)` | Tag border, focused input border |
| `--accent-text` | `#E5563E` | Tag text |
| `--good` | `oklch(72% 0.13 145)` | Up trend, resolved pulse |
| `--bad` | `oklch(62% 0.2 25)` | Down trend, remove hover |

Background also has a `radial-gradient(900px 500px at 50% -10%, rgba(205,65,43,0.08), transparent 60%)` red bloom behind the headline.

### Typography
- Display: `Space Grotesk` 700, 44–64px clamp, line-height 0.98, letter-spacing -0.02em
- UI: `Inter` 400/500/600/700, default 14–15px
- Mono / numerics: `JetBrains Mono` 400/500/600, with `font-variant-numeric: tabular-nums` on prices and totals
- Mono labels are uppercase with letter-spacing 0.06–0.18em

### Spacing / Radii
- `--radius-card`: 14px · `--radius-row`: 10px · `--radius-btn`: 10px
- `--pad`: 14px (regular) · 10px (compact) · 18px (cozy)
- `--gap`: same scale as `--pad`
- App container: max-width 720px, padding 56px 24px 120px, gap 28px between blocks
- Surface card max-width 560px

### Shadows
- Surface: `0 30px 60px -30px rgba(0,0,0,0.6)`

### Density variants
`[data-density="compact" | "regular" | "cozy"]` swap pad/gap tokens — affect inner card padding and stack gaps.

### Light theme
Available via `[data-theme="light"]`. Background flips to `oklch(97% 0.005 80)`, text to `oklch(22% 0.012 50)`. Accent stays `#CD412B`.

## Assets
- No images. Item thumbnails are 44×44 tiles with a striped CSS background (135° repeating-linear-gradient at 5% white) and 2-letter monogram derived from the item name.
- All icons are inline SVG — see `screens.jsx` `Icon` object: `paste`, `arrow`, `pencil`, `external`, `check`, `copy`, `refresh`. 16×16 viewBox, 1.6–1.8 stroke width, `currentColor`.
- Fonts loaded from Google Fonts: Space Grotesk, Inter, JetBrains Mono.

## Tweaks (prototype-only)
The HTML prototype includes a tweaks panel (theme, accent color, density, screen jump). This is for iteration only — not a feature to ship.

## Files in this bundle
- `Skin Pricer.html` — main entry; mounts `<App>`, owns top-level state machine, applies tweaks via CSS custom properties on `:root`
- `styles.css` — full design system (tokens, layout, components, animations)
- `screens.jsx` — `InputScreen`, `ResultsScreen`, `EditScreen`, `ItemRow`, `Thumb`, `Icon` set
- `data.jsx` — mock catalog (20 items), `parseList`, `lookup` (exact + normalized + substring fallback), `fmtPrice`, `initials`
- `tweaks-panel.jsx` — prototype-only tweak controls; ignore for production

## Replacing the mock data
`data.jsx` ships a 20-item mock catalog. In production, replace `lookup()` with a call to the real pricing API and stream results into the items array. Preserve the shape `{ key, name, slot, price, trend }` so the row component does not need to change. The 850ms simulated loading delay should be replaced with real fetch state.
