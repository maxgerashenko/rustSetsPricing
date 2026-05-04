import 'dotenv/config'
import express from 'express'
import { STEAM_SEARCH_API, STEAM_PRICE_API, STEAM_CDN_BASE, STEAM_CDN_SUFFIX } from './constants.js'
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

app.get('/api/item', async (req, res) => {
  const { name } = req.query
  if (name == null) { res.status(400).end(); return }

  const encoded = encodeURIComponent(name)

  const [priceResult, searchRes] = await Promise.allSettled([
    fetchPrice(encoded),
    steamFetch(`${STEAM_SEARCH_API}?appid=252490&query=${encoded}&norender=1&count=5`),
  ])

  const price = priceResult.status === 'fulfilled' ? priceResult.value : null

  let hash = null
  if (searchRes.status === 'fulfilled' && searchRes.value.ok) {
    const data = await searchRes.value.json()
    const result = data.results?.find(val => val.hash_name === name)
    if (result) hash = result.asset_description.icon_url
  }

  res.json({ price, hash, url: hash ? `${STEAM_CDN_BASE}${hash}${STEAM_CDN_SUFFIX}` : null })
})

const fetchAndStoreImage = async hash => {
  const upstream = await fetch(`${STEAM_CDN_BASE}${hash}${STEAM_CDN_SUFFIX}`)

  if (upstream.ok == false) return null

  const buffer = Buffer.from(await upstream.arrayBuffer())

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `${hash}.png`,
    Body: buffer,
    ContentType: 'image/png',
  }))

  console.log(`[S3] stored image ${hash.slice(0, 12)}…`)

  return buffer
}

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
    const buffer = await fetchAndStoreImage(hash)

    if (buffer == null) { res.status(502).end(); return }

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
