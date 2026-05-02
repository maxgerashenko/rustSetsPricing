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

Cloudflare R2 is recommended for production (no egress fees).
