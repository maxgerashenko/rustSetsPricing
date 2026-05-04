import { useEffect, useState } from 'react'
import styles from './ListView.module.css'

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

async function fetchItem(name, signal) {
  const res = await fetch(`/api/item?name=${encodeURIComponent(name)}`, { signal })
  if (!res.ok) throw new Error('server error')
  return res.json()
}

export default function ListView({ rawList, onBack }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    const names = parseItems(rawList)
    setItems(names.map(name => ({ name, status: 'loading', price: null, image: null })))
    const controller = new AbortController()
    names.forEach(async name => {
      try {
        const data = await fetchItem(name, controller.signal)
        setItems(prev => prev.map(it =>
          it.name === name ? { ...it, status: 'done', ...data } : it
        ))
      } catch (err) {
        if (err.name === 'AbortError') return
        setItems(prev => prev.map(it =>
          it.name === name ? { ...it, status: 'error' } : it
        ))
      }
    })
    return () => controller.abort()
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
                ? <a href={it.image} target="_blank" rel="noreferrer">
                    <img src={`/api/images/${it.image.match(/economy\/image\/([^/]+)\//)[1]}`} alt={it.name} width={62} height={62}/>
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
              {it.status === 'done' && (it.price ?? <span className={styles.na}>N/A</span>)}
              {it.status === 'error' && <span className={styles.na}>N/A</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className={styles.total}>
        <span>Total</span>
        {allDone ? <span>${total.toFixed(2)}</span> : <span className={styles.skeleton} />}
      </div>

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
