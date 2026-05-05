import { PutObjectCommand } from '@aws-sdk/client-s3'
import { STEAM_CDN_BASE, STEAM_CDN_SUFFIX } from './constants.js'

export async function fetchAndStoreImage(hash, s3, bucket, fetchFn = fetch) {
  const upstream = await fetchFn(`${STEAM_CDN_BASE}${hash}${STEAM_CDN_SUFFIX}`)

  if (upstream.ok == false) return null

  const buffer = Buffer.from(await upstream.arrayBuffer())

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `${hash}.png`,
    Body: buffer,
    ContentType: 'image/png',
  }))

  console.log(`[S3] stored image ${hash.slice(0, 12)}…`)

  return buffer
}
