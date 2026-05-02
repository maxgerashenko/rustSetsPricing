import 'dotenv/config'
import express from 'express'
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3'

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
    await new Promise(r => setTimeout(r, 300))
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
  if (gap > 0) await new Promise(r => setTimeout(r, gap))

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await new Promise(r => setTimeout(r, 200))
    try {
      const res = await fetch(
        `https://steamcommunity.com/market/priceoverview/?appid=252490&currency=1&market_hash_name=${encoded}`
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

const PRICE_TTL_MS = 24 * 60 * 60 * 1000
const NO_CACHE = process.env.NO_CACHE === 'true'

async function s3GetJson(key) {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    const chunks = []
    for await (const chunk of obj.Body) chunks.push(chunk)
    return JSON.parse(Buffer.concat(chunks).toString())
  } catch {
    return null
  }
}

async function s3PutJson(key, value) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: JSON.stringify(value),
    ContentType: 'application/json',
  }))
}

const app = express()

app.get('/api/item', async (req, res) => {
  const { name } = req.query
  if (!name) { res.status(400).end(); return }

  const encoded = encodeURIComponent(name)
  const cacheKey = `items/${encoded}.json`

  if (!NO_CACHE) {
    const cached = await s3GetJson(cacheKey)
    if (cached && (cached.hash || cached.price !== undefined)) {
      const priceAge = Date.now() - (cached.cachedAt ?? 0)
      if (cached.hash && priceAge < PRICE_TTL_MS) {
        console.log(`[Cache] hit — ${name}`)
        return res.json({ price: cached.price, image: `/api/images/${cached.hash}` })
      }
    }
  }

  const [priceResult, renderRes] = await Promise.allSettled([
    fetchPrice(encoded),
    steamFetch(`https://steamcommunity.com/market/listings/252490/${encoded}/render?start=0&count=1&currency=1&format=json`),
  ])

  const price = priceResult.status === 'fulfilled' ? priceResult.value : null

  let hash = null
  if (renderRes.status === 'fulfilled' && renderRes.value.ok) {
    const data = await renderRes.value.json()
    const match = data.results_html?.match(/economy\/image\/([^/]+)\//)
    if (match) hash = match[1]
  }

  if (hash && !NO_CACHE) {
    s3PutJson(cacheKey, { price, hash, cachedAt: Date.now() }).catch(() => {})
  }

  res.json({ price, image: hash ? `/api/images/${hash}` : null })
})

app.get('/api/images/:hash', async (req, res) => {
  const { hash } = req.params
  const key = `${hash}.png`

  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    obj.Body.pipe(res)
    return
  } catch (err) {
    if (err.name !== 'NoSuchKey') console.error('S3 get:', err.message)
  }

  try {
    const upstream = await fetch(
      `https://community.fastly.steamstatic.com/economy/image/${hash}/62fx62fdpx%202x`
    )
    if (!upstream.ok) { res.status(502).end(); return }

    const buffer = Buffer.from(await upstream.arrayBuffer())

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
    }))

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(buffer)
  } catch (err) {
    console.error('Image proxy error:', err.message)
    res.status(502).end()
  }
})

ensureBucket().then(() => {
  app.listen(PORT, () => console.log(`Server on :${PORT}`))
})
