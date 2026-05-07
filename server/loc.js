export function resolveLocTable(req) {
  const loc = req.query.loc
  if (loc && /^[a-z]{2,5}$/.test(loc)) return `loc_${loc}`
  return 'loc_eng'
}

export async function fetchLocName(pool, locTable, hash, fallback) {
  const { rows } = await pool.query(
    `SELECT name FROM ${locTable} WHERE hash = $1`,
    [hash]
  )
  return rows.length > 0 ? rows[0].name : fallback
}

export async function fetchLocNames(pool, locTable, hashes) {
  let { rows } = await pool.query(
    `SELECT hash, name FROM ${locTable} WHERE hash = ANY($1)`,
    [hashes]
  )

  if (locTable !== 'loc_eng') {
    const foundHashes = new Set(rows.map(r => r.hash))
    const missingHashes = hashes.filter(h => !foundHashes.has(h))
    if (missingHashes.length > 0) {
      const { rows: fallback } = await pool.query(
        'SELECT hash, name FROM loc_eng WHERE hash = ANY($1)',
        [missingHashes]
      )
      rows = [...rows, ...fallback]
    }
  }

  return Object.fromEntries(rows.map(r => [r.hash, r.name]))
}
