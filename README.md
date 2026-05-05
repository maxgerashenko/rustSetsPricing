# rustSetsPricing

Web app for the game Rust — paste a list of item/skin names, see each item's image and Steam Market price, plus a total.

## How to run

### With Docker (recommended)

Runs the Node server, PostgreSQL, and MinIO in separate containers.

```sh
cp .env .env.local   # optional — override defaults
docker compose up
```

- App: http://localhost:3001
- Frontend (Vite, separate): `npm run front` → http://localhost:5173
- MinIO console: http://localhost:9001 — user: `minioadmin`, password: `minioadmin`

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

**1. Start MinIO**

```sh
npm run s3
```

MinIO console at http://localhost:9001 — user: `minioadmin`, password: `minioadmin`.  
The Express server auto-creates the `rust-items` bucket on first start.

**2. Install dependencies**

```sh
npm install
```

**3. Start both servers**

```sh
npm run dev
```

This runs the Express backend (port 3001) and Vite dev server (port 5173) together.  
Open http://localhost:5173.

## Clearing the cache

Item prices and image hashes are cached in MinIO under `items/*.json` (24h TTL). Images are cached as `*.png` (permanent).

**MinIO web console** — http://localhost:9001, browse the `rust-items` bucket, delete what you need.

**CLI with `mc`:**

```sh
# one-time setup
mc alias set local http://localhost:9000 minioadmin minioadmin

# clear price/hash cache only (images stay)
mc rm --recursive --force local/rust-items/items/

# clear everything
mc rm --recursive --force local/rust-items/
```

## How it works

Steam's CDN blocks browser requests (hotlink protection). The app routes images through a local proxy:

```
Browser → Vite → Express (:3001) → MinIO (first request only)
                                  ↘ Steam CDN (cache miss)
```

Item images are fetched from Steam once, stored in MinIO, and served from there on every subsequent request.

## Deploying

Swap MinIO for any S3-compatible service by changing the env vars in `.env`:

| Variable | Local | Example prod |
|---|---|---|
| `S3_ENDPOINT` | `http://localhost:9000` | `https://<account>.r2.cloudflarestorage.com` |
| `S3_BUCKET` | `rust-items` | `rust-items` |
| `S3_ACCESS_KEY` | `minioadmin` | from provider |
| `S3_SECRET_KEY` | `minioadmin` | from provider |
| `CACHE` | `false` | `true` to enable S3 cache reads/writes |

Cloudflare R2 is recommended for production (no egress fees).

Set `CACHE=false` in `.env` to always hit Steam directly — useful during development to test fresh data.
