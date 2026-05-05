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

## Backend
- [ ] Wire `POST /api/sets` — call from frontend when user submits item list
- [ ] `GET /api/sets` — list all saved sets
- [ ] `DELETE /api/sets/:id` — delete a saved set
- [ ] Tests for `/api/sets` and DB item cache

## Frontend
- [ ] Save set button — sends item list to `POST /api/sets`
- [ ] Load saved sets — list and restore previous inputs
- [ ] Show price as stale when TTL is near expiry

## Ops
- [ ] Add `.env.example` with all required vars documented
- [ ] Add `server` container healthcheck to docker-compose (currently only postgres/minio have one)
