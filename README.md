# rustSetsPricing

Web app for the game Rust — paste a list of item/skin names, see each item's image and Steam Market price, plus a total.

## How to run

### 1. Start MinIO (local S3-compatible storage)

```
docker run -p 9000:9000 -p 9001:9001 \
  quay.io/minio/minio server /data --console-address ":9001"
```

MinIO console at http://localhost:9001 (user: `minioadmin`, password: `minioadmin`).  
The Express server auto-creates the `rust-items` bucket on first start.

### 2. Install dependencies

```
npm install
```

### 3. Start both servers

```
npm run dev
```

This runs the Express image proxy (port 3001) and Vite dev server (port 5173) together.  
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
| `NO_CACHE` | *(unset)* | `true` to skip S3 cache reads/writes |

Cloudflare R2 is recommended for production (no egress fees).

Set `NO_CACHE=true` in `.env` to always hit Steam directly — useful during development to test fresh data.
