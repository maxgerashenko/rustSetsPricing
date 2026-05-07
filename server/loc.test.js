import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveLocTable, fetchLocName, fetchLocNames } from './loc.js'

const req = (loc) => ({ query: loc !== undefined ? { loc } : {} })

test('defaults to loc_eng when loc is absent', () => {
  assert.equal(resolveLocTable(req()), 'loc_eng')
})

test('returns loc_eng for explicit eng', () => {
  assert.equal(resolveLocTable(req('eng')), 'loc_eng')
})

test('returns loc_rus for valid two-letter code', () => {
  assert.equal(resolveLocTable(req('ru')), 'loc_ru')
})

test('returns loc_rus for valid three-letter code', () => {
  assert.equal(resolveLocTable(req('rus')), 'loc_rus')
})

test('accepts max 5 lowercase letters', () => {
  assert.equal(resolveLocTable(req('zhtw')), 'loc_zhtw')
  assert.equal(resolveLocTable(req('abcde')), 'loc_abcde')
})

test('rejects codes longer than 5 letters', () => {
  assert.equal(resolveLocTable(req('toolong')), 'loc_eng')
})

test('rejects single-letter code', () => {
  assert.equal(resolveLocTable(req('e')), 'loc_eng')
})

test('rejects uppercase letters', () => {
  assert.equal(resolveLocTable(req('ENG')), 'loc_eng')
  assert.equal(resolveLocTable(req('Eng')), 'loc_eng')
})

test('rejects path traversal attempt', () => {
  assert.equal(resolveLocTable(req('../etc')), 'loc_eng')
})

test('rejects digits in loc', () => {
  assert.equal(resolveLocTable(req('en1')), 'loc_eng')
})

test('rejects empty string', () => {
  assert.equal(resolveLocTable(req('')), 'loc_eng')
})

// --- fetchLocName ---

const pool = (rows) => ({ query: async () => ({ rows }) })

test('fetchLocName returns localized name when found', async () => {
  const result = await fetchLocName(pool([{ name: 'Рубашка из мешковины' }]), 'loc_rus', 'abc', 'Burlap Shirt')
  assert.equal(result, 'Рубашка из мешковины')
})

test('fetchLocName returns fallback when not found', async () => {
  const result = await fetchLocName(pool([]), 'loc_rus', 'abc', 'Burlap Shirt')
  assert.equal(result, 'Burlap Shirt')
})

// --- fetchLocNames ---

const multiPool = (tableMap) => ({
  query: async (sql, [hashes]) => {
    const table = Object.keys(tableMap).find(t => sql.includes(t))
    const rows = (tableMap[table] ?? []).filter(r =>
      Array.isArray(hashes) ? hashes.includes(r.hash) : r.hash === hashes
    )
    return { rows }
  },
})

test('fetchLocNames returns hash→name map for loc_eng', async () => {
  const p = multiPool({
    loc_eng: [{ hash: 'h1', name: 'Burlap Shirt' }, { hash: 'h2', name: 'Leather Gloves' }],
  })
  const result = await fetchLocNames(p, 'loc_eng', ['h1', 'h2'])
  assert.deepEqual(result, { h1: 'Burlap Shirt', h2: 'Leather Gloves' })
})

test('fetchLocNames falls back to loc_eng for missing translations in non-eng locale', async () => {
  const p = multiPool({
    loc_rus: [{ hash: 'h1', name: 'Рубашка' }],
    loc_eng: [{ hash: 'h2', name: 'Leather Gloves' }],
  })
  const result = await fetchLocNames(p, 'loc_rus', ['h1', 'h2'])
  assert.deepEqual(result, { h1: 'Рубашка', h2: 'Leather Gloves' })
})

test('fetchLocNames does not query loc_eng when all translations found', async () => {
  let fallbackQueried = false
  const p = {
    query: async (sql, [hashes]) => {
      if (sql.includes('loc_eng') && sql.includes('ANY')) fallbackQueried = true
      return { rows: hashes.map(h => ({ hash: h, name: `name_${h}` })) }
    },
  }
  await fetchLocNames(p, 'loc_rus', ['h1', 'h2'])
  assert.equal(fallbackQueried, false)
})

test('fetchLocNames skips fallback query when loc is loc_eng', async () => {
  let queryCount = 0
  const p = { query: async () => { queryCount++; return { rows: [] } } }
  await fetchLocNames(p, 'loc_eng', ['h1'])
  assert.equal(queryCount, 1)
})
