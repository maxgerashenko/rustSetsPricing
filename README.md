# rustSetsPricing

Web app for the game Rust — paste a list of item/skin names, see each item's image and Steam Market price, plus a total.

## How to run

### With Docker (recommended)

Runs all four services in separate containers: Vite frontend, Express backend, PostgreSQL, and MinIO.

```sh
docker compose up
```

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express) | http://localhost:3001 |
| MinIO console | http://localhost:9001 — user: `minioadmin`, password: `minioadmin` |

Editing any file in `src/` or `server/` is reflected immediately — the frontend uses a bind mount with HMR, and the backend uses `node --watch`.

Stop everything:

```sh
docker compose down
```

Data persists in Docker volumes (`postgres_data`, `minio_data`). To wipe:

```sh
docker compose down -v
```

---

### Without Docker (manual)

Requires a running PostgreSQL instance and MinIO (or any S3-compatible storage).

**1. Start MinIO**

```sh
npm run s3
```

MinIO console at http://localhost:9001 — user: `minioadmin`, password: `minioadmin`.

**2. Install dependencies**

```sh
npm install
```

**3. Start both servers**

```sh
npm run dev
```

Runs the Express backend (port 3001) and Vite dev server (port 5173) together.
Open http://localhost:5173.

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
