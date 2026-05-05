import 'dotenv/config'
import { createHash } from 'crypto'
import express from 'express'
import { STEAM_SEARCH_API, STEAM_PRICE_API } from './constants.js'
import { S3Client, GetObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { fetchAndStoreImage } from './imageCache.js'
import { pool, initDb } from './db.js'
import { BROWSER_CACHE_ENABLED } from './flags.js'

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
})

const BUCKET = process.env.S3_BUCKET ?? 'rust-items'
const PORT = process.env.SERVER_PORT ?? 3001
const PRICE_TTL_MS = 4 * 60 * 60 * 1000

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }))
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
    console.log(`Created bucket: ${BUCKET}`)
  }
}

// Render endpoint queue — serializes scrape calls to Steam, 300ms apart
let steamQueue = Promise.resolve()
let steamRequestCount = 0

function steamFetch(url) {
  const ticket = steamQueue.then(async () => {
    steamRequestCount++
    console.log(`[Steam #${steamRequestCount}] ${url}`)
    const res = await fetch(url)
    await new Promise(resolve => setTimeout(resolve, 300))
    return res
  })
  steamQueue = ticket.catch(() => {})
  return ticket
}

// priceoverview — 600ms between successes, 3 attempts/200ms on fail, 1min cooldown
let priceoverviewCooldownUntil = 0
let lastPriceSuccessAt = 0

async function fetchPrice(encoded) {
  if (Date.now() < priceoverviewCooldownUntil) {
    const remaining = Math.ceil((priceoverviewCooldownUntil - Date.now()) / 1000)
    console.log(`[Price] cooldown active — ${remaining}s remaining, skipping`)
    return null
  }

  const gap = lastPriceSuccessAt + 600 - Date.now()
  if (gap > 0) await new Promise(resolve => setTimeout(resolve, gap))

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await new Promise(resolve => setTimeout(resolve, 200))
    try {
      const res = await fetch(
        `${STEAM_PRICE_API}?appid=252490&currency=1&market_hash_name=${encoded}`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          lastPriceSuccessAt = Date.now()
          return data.lowest_price
        }
      }
      console.log(`[Price] attempt ${attempt} failed — status ${res.status}`)
    } catch (err) {
      console.log(`[Price] attempt ${attempt} error — ${err.message}`)
    }
  }

  priceoverviewCooldownUntil = Date.now() + 60_000
  console.log(`[Price] 3 attempts exhausted — cooldown until ${new Date(priceoverviewCooldownUntil).toLocaleTimeString()}`)
  return null
}

const app = express()
app.use(express.json())

app.get('/api/item', async (req, res) => {
  const { name } = req.query
  if (name == null) { res.status(400).end(); return }

  const encoded = encodeURIComponent(name)

  const { rows } = await pool.query(
    'SELECT price, hash, price_expires_at FROM items WHERE name = $1',
    [name]
  )
  const cached = rows[0] ?? null
  const priceValid = cached != null && new Date(cached.price_expires_at) > new Date()
  const hashValid = cached?.hash != null

  if (priceValid && hashValid) {
    if (BROWSER_CACHE_ENABLED) res.setHeader('Cache-Control', 'public, max-age=14400')
    res.json({ price: cached.price, hash: cached.hash, url: `/api/images/${cached.hash}` })
    return
  }

  const [priceResult, searchRes] = await Promise.allSettled([
    priceValid ? Promise.resolve(cached.price) : fetchPrice(encoded),
    hashValid ? Promise.resolve(null) : steamFetch(`${STEAM_SEARCH_API}?appid=252490&query=${encoded}&norender=1&count=5`),
  ])

  const price = priceResult.status === 'fulfilled' ? priceResult.value : (cached?.price ?? null)

  let hash = cached?.hash ?? null
  if (hashValid == false && searchRes.status === 'fulfilled' && searchRes.value?.ok) {
    const data = await searchRes.value.json()
    const result = data.results?.find(val => val.hash_name === name)
    if (result) hash = result.asset_description.icon_url
  }

  if (price == null && hash == null) {
    if (BROWSER_CACHE_ENABLED) res.setHeader('Cache-Control', 'public, max-age=14400')
    res.json({ price, hash, url: null })
    return
  }

  const fields = ['name']
  const values = [name]
  if (price != null) {
    fields.push('price', 'price_expires_at')
    values.push(price, new Date(Date.now() + PRICE_TTL_MS))
  }
  if (hash != null) { fields.push('hash'); values.push(hash) }

  const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ')
  const updateSet = fields
    .filter(field => field !== 'name')
    .map(field => `${field} = EXCLUDED.${field}`)
    .join(',\n       ')

  await pool.query(
    `INSERT INTO items (${fields.join(', ')})
     VALUES (${placeholders})
     ON CONFLICT (name) DO UPDATE SET
       ${updateSet}`,
    values
  )

  if (hash != null) {
    await pool.query(
      'INSERT INTO loc_eng (hash, name) VALUES ($1, $2) ON CONFLICT (hash) DO NOTHING',
      [hash, name]
    )
  }

  if (BROWSER_CACHE_ENABLED) res.setHeader('Cache-Control', 'public, max-age=14400')
  res.json({ price, hash, url: hash != null ? `/api/images/${hash}` : null })
})

const hash64 = val => createHash('sha256').update(val).digest().readBigUInt64BE(0).toString(16).padStart(16, '0')

app.post('/api/sets', async (req, res) => {
  const { items, hashes } = req.body
  if (Array.isArray(items) == false || items.length === 0) { res.status(400).end(); return }
  if (Array.isArray(hashes) == false || hashes.length === 0) { res.status(400).end(); return }

  const sorted = [...hashes].sort()
  const setHash = createHash('sha256')
    .update(sorted.map(hash64).join(''))
    .digest()
    .readBigUInt64BE(0)
    .toString(16)
    .padStart(16, '0')

  await pool.query(
    'INSERT INTO items_sets (set_hash, items) VALUES ($1, $2) ON CONFLICT (set_hash) DO NOTHING',
    [setHash, sorted]
  )

  res.json({ set_hash: setHash })
})

app.get('/api/sets/:hash', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM items_sets WHERE set_hash = $1', [req.params.hash])
  if (rows.length === 0) { res.status(404).end(); return }

  res.json(rows[0])
})

app.get('/api/images/:hash', async (req, res) => {
  const { hash } = req.params
  const key = `${hash}.png`

  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    res.setHeader('Content-Type', 'image/png')
    if (BROWSER_CACHE_ENABLED) res.setHeader('Cache-Control', 'public, max-age=86400')
    obj.Body.pipe(res)

    return
  } catch (err) {
    if (err.name !== 'NoSuchKey') console.error('S3 get:', err.message)
  }

  try {
    const buffer = await fetchAndStoreImage(hash, s3, BUCKET)

    if (buffer == null) { res.status(502).end(); return }

    res.setHeader('Content-Type', 'image/png')
    if (BROWSER_CACHE_ENABLED) res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(buffer)
  } catch (err) {
    console.error('Image proxy error:', err.message)
    res.status(502).end()
  }
})

Promise.all([ensureBucket(), initDb()]).then(() => {
  app.listen(PORT, () => console.log(`Server on :${PORT}`))
})
