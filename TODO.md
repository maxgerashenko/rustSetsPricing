# TODO

## Done
- [x] Image proxy via S3/MinIO — `/api/images/:hash` caches Steam CDN images in MinIO
- [x] `fetchAndStoreImage` extracted to `server/imageCache.js` with injectable deps and 3 passing tests
- [x] Price TTL caching (4h) in PostgreSQL `item_cache` table — persists across restarts
- [x] Smart cache logic — skips Steam API entirely on full cache hit, fetches only stale fields on partial hit
- [x] `Cache-Control: public, max-age=14400` on `/api/item` for browser-side caching
- [x] `POST /api/sets` and `GET /api/sets/:id` — backend endpoints complete
- [x] Docker Compose — separate containers for app, Postgres 16, MinIO; health checks on db/minio
- [x] Frontend Docker dev — `Dockerfile.dev` + `frontend` service with bind mount HMR; proxy via `VITE_PROXY_TARGET`

## Design Redesign — Junkpile spec ([design/README.md](design/README.md))

The design upgrades a 2-screen flow (Input → List) to a 3-screen flow (Input → Results → Edit) with new tokens, components, and behaviors. Below is the diff between the current implementation and the new design.

### Tokens / Theme
- [ ] Migrate color tokens to `oklch()` (`--bg`, `--bg-elev`, `--bg-elev-2`, `--line`, `--line-strong`, `--text`, `--text-dim`, `--text-faint`, `--good`, `--bad`) — current uses flat hex
- [ ] Add accent variants: `--accent-soft`, `--accent-line`, `--accent-text` (kept `--accent: #CD412B`)
- [ ] Add `--font-display` (Space Grotesk) and `--font-mono` (JetBrains Mono); load fonts from Google Fonts
- [ ] Add `[data-theme="light"]` palette
- [ ] Replace `.title` with `.headline` using Space Grotesk, `clamp(44px, 6vw, 64px)`, line-height 0.98, letter-spacing -0.02em
- [ ] Replace `.badge` with `.tag` (uppercase, mono, accent dot with glow, 0.18em letter-spacing)

### Screen 1 — Input ([src/InputView.jsx](src/InputView.jsx))
- [ ] Add `parse-row` strip between textarea and action row: `<N> items detected · One per line · or comma-separated` (uppercase mono, accent N)
- [ ] Compute `lines` via `split(/[\n,]+/)` (currently splits on `\n` only — comma-separated input is not parsed live)
- [ ] Disable submit when `lines.length === 0` (currently `value.trim() === ''`)
- [ ] Helper text below card: `Pulls live community-market medians · refreshed every 5 min`
- [ ] Action row uses ghost (`Paste`) + primary (`Get Prices` with `→` arrow icon)
- [ ] Add `fade-in` (320ms) screen entry animation

### Screen 2 — Results (NEW — currently merged into [src/ListView.jsx](src/ListView.jsx))
- [ ] Split out a `ResultsScreen` that owns: meta strip, item rows, stats, total, action row
- [ ] Meta strip above card: green pulse dot + `<N> resolved · <N> unknown`; right-side USD/EUR segmented toggle
- [ ] Currency state with EUR conversion (`× 0.92`, swap `$ → €`); `tabular-nums` on prices/totals
- [ ] 24h trend delta per row: `▲` green / `▼` red, absolute value, no currency symbol
- [ ] Replace 62×62 image thumb with 44×44 striped CSS thumb + 2-letter monogram (`initials()`); design has no images
  - [ ] Decision needed: keep real Steam images (current behavior) or follow design's monogram thumbs — recommend keeping images and adopting design's 44×44 sizing/border/radius only
- [ ] 3-up stat strip: `Items` / `Top Item` / `24h Δ`
- [ ] Total bar: uppercase mono `TOTAL` label + large mono accent-colored amount, top border `--line-strong`, `--bg-elev-2`
- [ ] 3-col action row: Refresh (rotates icon 180° over 600ms, re-loads 700ms) / Copy (`Junkpile total: $X.XX (N items)` to clipboard, label flips to "Copied" + check for 1400ms) / Edit List (primary)
- [ ] Footer link: `← New list` (replaces current implicit back-via-Edit)
- [ ] Loading state: rows dimmed to 0.6 opacity, prices replaced by shimmer skeletons (~850ms after entry)
- [ ] Unmatched item: name in `--text-faint`, `Unmatched` mono caption, italic `not found` price
- [ ] Row meta: slot caption (`Head`, `Chest`, …) — needs slot data from API

### Screen 3 — Edit (NEW — does not exist today)
- [ ] Create `EditScreen`: 4-col edit rows (handle · thumb · `<input>` · `×`), `+ Add item` dashed footer, Cancel/`Save & Reprice` action row
- [ ] Drag-and-drop reorder via `⋮⋮` handle; drop target highlights with `--accent-soft`
- [ ] `Enter` on input adds new empty row below; `Backspace` on empty input removes the row
- [ ] State machine update in `App`: `'input' | 'results' | 'edit'` (currently boolean `list`/`!list`)
- [ ] Edit returns text → re-prices via Results
- [ ] Persist edits back through the same `POST /api/sets` flow

### Animations
- [ ] Screen entry fadeIn 320ms ease, 6px translateY
- [ ] Skeleton shimmer 1.4s linear infinite (current `.skeleton` exists — verify timing matches)
- [ ] Pulse dot 1.6s ease-in-out, opacity 0.5↔1
- [ ] Buttons: background 120ms ease, `:active` translateY(1px)

### Items shape
- Design row shape: `{ id, raw, resolved: { key, name, slot, price, trend } | null }`
- Current row shape: `{ name, status, price, url, hash }`
- [ ] Backend: extend `/api/item` to return `slot` and `trend` (24h delta) — or compute trend client-side from cached price history
- [ ] Frontend: adopt `{ id, raw, resolved }` shape so unmatched items render distinctly


## Backend
- [ ] Wire `POST /api/sets` — call from frontend when user submits item list
- [ ] `GET /api/sets` — list all saved sets
- [ ] `DELETE /api/sets/:id` — delete a saved set
- [ ] Tests for `/api/sets` and DB item cache
- [ ] Extend `/api/item` response with `slot` and 24h `trend` fields (needed by Results screen)

## Frontend
- [ ] Save set button — sends item list to `POST /api/sets`
- [ ] Load saved sets — list and restore previous inputs
- [ ] Show price as stale when TTL is near expiry

## Ops
- [ ] Add `.env.example` with all required vars documented
- [ ] Add `server` container healthcheck to docker-compose (currently only postgres/minio have one)
