# rustSetsPricing

Web app for the game Rust — paste a list of item/skin names, see each item's image and Steam Market price, plus a total.

## How to run

```sh
npm run dev      # start everything (Docker) — Vite, Express, PostgreSQL, MinIO
npm run stop     # stop everything
npm run clean    # stop and delete all data (volumes)
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001 |
| MinIO console | http://localhost:9001 — `minioadmin` / `minioadmin` |

File changes in `src/` and `server/` are reflected immediately (HMR + `node --watch`).

---

### Run services independently (without Docker)

Requires PostgreSQL and MinIO running locally. Set `DB_HOST=localhost` in `.env`.

```sh
npm run pg       # start PostgreSQL via Docker only
npm run s3       # start MinIO locally
npm run server   # start Express backend (port 3001)
npm run front    # start Vite frontend (port 5173)
```

```sh
npm run kill:backend  # stop Express backend
npm run kill:front # stop Vite
```

## How it works

```
Browser → Vite (:5173) → Express (:3001) → PostgreSQL  (price + hash cache, sets)
                                          → MinIO       (image cache, first request only)
                                          → Steam CDN   (cache miss)
```

- **Item lookup** — price and image hash are cached in PostgreSQL with a 4-hour TTL. On a full cache hit, Steam is never called.
- **Images** — fetched from Steam once, stored in MinIO as `<hash>.png`, served from there on every subsequent request.
- **Sets** — lists of item names can be saved to and loaded from PostgreSQL via `POST /api/sets` and `GET /api/sets/:id`.

## Development

Browser caching (`Cache-Control` headers) is disabled automatically when `NODE_ENV=development`. `npm run dev` sets this, so the browser always fetches fresh data from the Express server during local development.

## Clearing the cache

**MinIO web console** — http://localhost:9001, browse the `rust-items` bucket, delete what you need.

**CLI with `mc`:**

```sh
# one-time setup
mc alias set local http://localhost:9000 minioadmin minioadmin

# clear images
mc rm --recursive --force local/rust-items/

# clear DB price/hash cache (psql)
TRUNCATE item_cache;
```

## Deploying

Swap MinIO for any S3-compatible service and point to a managed Postgres instance via env vars:

| Variable | Local default | Production |
|---|---|---|
| `S3_ENDPOINT` | `http://localhost:9000` | `https://<account>.r2.cloudflarestorage.com` |
| `S3_BUCKET` | `rust-items` | `rust-items` |
| `S3_ACCESS_KEY` | `minioadmin` | from provider |
| `S3_SECRET_KEY` | `minioadmin` | from provider |
| `DB_HOST` | `localhost` | managed Postgres host |
| `DB_USER` | `rust` | from provider |
| `DB_PASSWORD` | `rust` | from provider |
| `DB_NAME` | `rustsets` | from provider |

Cloudflare R2 is recommended for production (no egress fees).
