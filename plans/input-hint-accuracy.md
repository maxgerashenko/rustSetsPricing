---
name: Input hint accuracy
description: Replace inaccurate "refreshed every 5 min" tagline with copy that reflects Steam's 24h median + actual server cache TTL
type: project
---

# Input Hint Accuracy

## Goal

Replace the misleading hint on the input view (`Pulls live community-market medians · refreshed every 5 min`) with copy that truthfully reflects what the app shows: Steam Market's **24h median price**, served from a server-side cache.

## Current state

- [src/views/input_view/input_view.jsx:73](src/views/input_view/input_view.jsx#L73) — hardcoded string `Pulls live community-market medians · refreshed every 5 min`
- [server/index.js:22](server/index.js#L22) — `PRICE_TTL_MS = 4 * 60 * 60 * 1000` (4h, not 5 min)
- Steam's `median_price` field itself is the 24-hour median, so "live" is also slightly misleading

## Steps

1. Update copy in [src/views/input_view/input_view.jsx:73](src/views/input_view/input_view.jsx#L73). Recommended:
   - `Steam Market 24h median · cached 4h server-side`
   - or shorter: `Steam Market 24h median prices`
2. If the tagline ends up being reused (sets count bar plan also uses `parseRow` style), extract to a shared constant — otherwise keep inline.
3. If the 4h TTL is later parameterized via env, source the hint string from a shared config so it stays in sync.

## Out of scope

- Changing the actual cache TTL
- Adding a per-row "last refreshed" indicator (covered by [plans/price-trend-and-staleness.md](price-trend-and-staleness.md))
- Localization of the hint (covered by [plans/localization.md](localization.md))

## Recommended model

Haiku — single-line copy change.
