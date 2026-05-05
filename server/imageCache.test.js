import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchAndStoreImage } from './imageCache.js'

const HASH = 'abc123def456xyz'
const IMAGE_BYTES = Buffer.from('fake-image-data')

const mockFetch = async () => ({
  ok: true,
  arrayBuffer: async () => IMAGE_BYTES.buffer,
})

const mockFetchFail = async () => ({ ok: false })

test('returns buffer and stores image on success', async () => {
  let stored = null
  const s3 = { send: async cmd => { stored = cmd.input } }

  const result = await fetchAndStoreImage(HASH, s3, 'test-bucket', mockFetch)

  assert.ok(result instanceof Buffer)
  assert.equal(stored.Key, `${HASH}.png`)
  assert.equal(stored.Bucket, 'test-bucket')
  assert.equal(stored.ContentType, 'image/png')
})

test('returns null when upstream fetch fails', async () => {
  const s3 = { send: async () => {} }

  const result = await fetchAndStoreImage(HASH, s3, 'test-bucket', mockFetchFail)

  assert.equal(result, null)
})

test('does not call S3 when upstream fetch fails', async () => {
  let called = false
  const s3 = { send: async () => { called = true } }

  await fetchAndStoreImage(HASH, s3, 'test-bucket', mockFetchFail)

  assert.equal(called, false)
})
