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
            <span className={styles.name}>{it.name}</span>
            <span className={styles.price}>
              {it.status === 'loading' && <span className={styles.skeleton} />}
              {it.status === 'done' && it.price}
              {it.status === 'error' && <span className={styles.na}>N/A</span>}
            </span>
          </li>
        ))}
      </ul>

      <button className={styles.inspectBtn} type="button" onClick={() => items.filter(it => it.image).forEach(it => window.open(it.image.split(' ')[0], '_blank'))}>
        inspect-images
        <span style={{ display: 'none' }}>
          {items.filter(it => it.image).map(it => (
            <img key={it.name} srcSet={it.image} alt={it.name} width={62} height={62} referrerPolicy="no-referrer" />
          ))}
        </span>
      </button>

      {allDone && (
        <div className={styles.total}>
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      )}

      <button className={styles.back} onClick={onBack}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M6.5 3L2 7.5l4.5 4.5M2 7.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Edit list
      </button>
    </div>
  )
}
