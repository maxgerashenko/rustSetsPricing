import { useEffect, useState } from 'react'
import styles from './SetView.module.css'

function parseItems(raw) {
  return [...new Set(
    raw.split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean)
  )]
}

function parseDollars(str) {
  if (!str) return 0
  const n = parseFloat(str.replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

async function fetchItem(name) {
  const encoded = encodeURIComponent(name)
  const [priceRes, imgRes] = await Promise.allSettled([
    fetch(`/api/steam/market/priceoverview/?appid=252490&currency=1&market_hash_name=${encoded}`),
    fetch(`/api/steam/market/listings/252490/${encoded}/render?start=0&count=1&currency=1&format=json`),
  ])

  let price = null
  if (priceRes.status === 'fulfilled' && priceRes.value.ok) {
    const data = await priceRes.value.json()
    if (data.success) price = data.lowest_price
  }

  let image = null
  if (imgRes.status === 'fulfilled' && imgRes.value.ok) {
    const data = await imgRes.value.json()
    const match = data.results_html?.match(/economy\/image\/([^/]+)\//)
    if (match) {
      const hash = match[1]
      image = `https://community.fastly.steamstatic.com//economy//image//${hash}//62fx62f%20202 1x, https://community.fastly.steamstatic.com//economy//image//${hash}//62fx62fdpx2x%20202 2x`
    }
  }

  if (price === null) throw new Error('not found')
  return { price, image }
}

export default function SetView({ rawList, onBack }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    const names = parseItems(rawList)
    setItems(names.map(name => ({ name, status: 'loading', price: null, image: null })))

    names.forEach((name, i) => {
      setTimeout(async () => {
        try {
          const data = await fetchItem(name)
          setItems(prev => prev.map(it =>
            it.name === name ? { ...it, status: 'done', ...data } : it
          ))
        } catch {
          setItems(prev => prev.map(it =>
            it.name === name ? { ...it, status: 'error' } : it
          ))
        }
      }, i * 600)
    })
  }, [rawList])

  const total = items.reduce((sum, it) => sum + parseDollars(it.price), 0)
  const allDone = items.length > 0 && items.every(it => it.status !== 'loading')

  return (
    <div className={styles.container}>
      <ul className={styles.list}>
        {items.map(it => (
          <li key={it.name} className={styles.item}>
            <div className={styles.thumb}>
              {it.image
                ? <a href={it.image.split(' ')[0]} target="_blank" rel="noreferrer">
                    <img srcSet={it.image} alt={it.name} width={62} height={62} referrerPolicy="no-referrer" loading="eager" />
                  </a>
                : <div className={styles.thumbPlaceholder} />
              }
            </div>
            <a
              className={styles.name}
              href={`https://steamcommunity.com/market/listings/252490/${encodeURIComponent(it.name)}`}
              target="_blank"
              rel="noreferrer"
            >
              {it.name}
            </a>
            <span className={styles.price}>
              {it.status === 'loading' && <span className={styles.skeleton} />}
              {it.status === 'done' && it.price}
              {it.status === 'error' && <span className={styles.na}>N/A</span>}
            </span>
          </li>
        ))}
      </ul>

      {allDone && (
        <div className={styles.total}>
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.inspectBtn} type="button" onClick={() => items.filter(it => it.image).forEach(it => window.open(it.image.split(' ')[0], '_blank'))}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9M9 1h5v5M14 1L7.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Inspect
          <span style={{ display: 'none' }}>
            {items.filter(it => it.image).map(it => (
              <img key={it.name} srcSet={it.image} alt={it.name} width={62} height={62} referrerPolicy="no-referrer" />
            ))}
          </span>
        </button>

        <button className={styles.back} onClick={onBack}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M11.5 1.5a1.5 1.5 0 0 1 2 2L5 12l-3 1 1-3 8.5-8.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Edit List
        </button>
      </div>
    </div>
  )
}
