# TODO

## Done

### Core Features
- [x] Input screen with live comma-separated line parsing
- [x] Paste button — clipboard read, auto-clean, user submits via "Get Prices"
- [x] Results screen with meta strip (resolved/unknown count, USD/EUR toggle), stats strip, total bar, action buttons
- [x] List view components: ListInfo, ItemsList, ListControls with proper separation of concerns
- [x] 3-action button row: Inspect (Steam Market links), Copy (total to clipboard), Edit List

### Backend & Caching
- [x] Image proxy via S3/MinIO — `/api/images/:hash` endpoint caches Steam CDN images
- [x] `fetchAndStoreImage` function with injectable S3 and fetch dependencies, 3 passing tests
- [x] Price TTL caching (4h) in PostgreSQL — persists across restarts, smart partial/full hits
- [x] `Cache-Control: public, max-age=14400` on `/api/item` for browser caching
- [x] `POST /api/sets` and `GET /api/sets/:id` backend endpoints

### Infrastructure & Organization
- [x] Docker Compose with app, Postgres 16, MinIO containers; health checks on db/minio
- [x] Frontend Docker dev setup — HMR via bind mount, Vite proxy to backend
- [x] File structure reorganized: `src/shared/` (icons, utils, constants), `src/views/input_view/`, `src/views/list_view/`
- [x] Design tokens (oklch color palette, typography, spacing) with light/dark theme support

### Animations & Styling
- [x] Screen entry fadeIn animation (320ms ease, 6px translateY)
- [x] Skeleton shimmer (1.4s linear infinite), pulse dot (1.6s opacity), button feedback

## Remaining Work

### Screen 3 — Edit (Priority)
- [ ] Create `EditScreen` component: 4-col edit rows (drag handle · thumb · input · delete), add item footer, Cancel/Save actions
- [ ] Drag-and-drop reorder via handle; drop target highlights
- [ ] Keyboard support: `Enter` adds row below, `Backspace` on empty removes row
- [ ] Update App state machine: `'input' | 'results' | 'edit'` (currently boolean `list`/`!list`)
- [ ] Edit flow: save edits → reprice items → return to Results

### API Extensions
- [ ] Extend `/api/item` to return `slot` (e.g., `Head`, `Chest`) and `trend` (24h delta)
- [ ] Wire `POST /api/sets` call from Results screen to persist item combinations
- [ ] Add `GET /api/sets/:id` to load saved sets

### Future Features
- [ ] 24h trend delta per row: `▲` green / `▼` red (requires `trend` API field)
- [ ] Show price as stale when cache TTL nearing expiry
- [ ] Load previous sets from `GET /api/sets`

### Ops
- [ ] Add `.env.example` with all required vars documented
- [ ] Add `server` container healthcheck to docker-compose
