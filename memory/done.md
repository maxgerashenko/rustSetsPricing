# Done

## Core Features
- [x] Input screen with live comma-separated line parsing
- [x] Paste button — clipboard read, auto-clean, user submits via "Get Prices"
- [x] Results screen with meta strip (resolved/unknown count, USD/EUR toggle), stats strip, total bar, action buttons
- [x] List view components: ListInfo, ItemsList, ListControls with proper separation of concerns
- [x] 3-action button row: Inspect (Steam Market links), Share (set URL to clipboard), Edit List
- [x] Sets list view — vertical list of all saved sets with item icons and total price per set
- [x] React Router navigation — `/` (input), `/list` (results), `/sets` (all sets) with query param support for set loading

## Backend & Caching
- [x] Image proxy via S3/MinIO — `/api/images/:hash` endpoint caches Steam CDN images
- [x] `fetchAndStoreImage` function with injectable S3 and fetch dependencies, 3 passing tests
- [x] Price TTL caching (4h) in PostgreSQL — persists across restarts, smart partial/full hits
- [x] `Cache-Control: public, max-age=14400` on `/api/item` for browser caching
- [x] `POST /api/sets` and `GET /api/sets/:hash` backend endpoints with share/load flow
- [x] `GET /api/sets` endpoint — fetches all saved sets with item data and prices

## Infrastructure & Organization
- [x] Docker Compose with app, Postgres 16, MinIO containers; health checks on db/minio
- [x] Frontend Docker dev setup — HMR via bind mount, Vite proxy to backend
- [x] File structure reorganized: `src/shared/` (icons, utils, constants), `src/views/input_view/`, `src/views/list_view/`, `src/views/sets_list/`
- [x] Design tokens (oklch color palette, typography, spacing) with light/dark theme support

## Animations & Styling
- [x] Screen entry fadeIn animation (320ms ease, 6px translateY)
- [x] Skeleton shimmer (1.4s linear infinite), pulse dot (1.6s opacity), button feedback
