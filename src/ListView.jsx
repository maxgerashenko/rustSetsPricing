import { useEffect, useState } from 'react'
import styles from './ListView.module.css'
import { MARKET_LISTINGS_BASE, API_ITEM, API_IMAGES } from './constants.js'

const parseItems = raw => [...new Set(
  raw.split(/[\n,]+/)
    .map(val => val.trim())
    .filter(Boolean)
)]

const parseDollars = str => {
  if (str == null) return 0

  const n = parseFloat(str.replace(/[^0-9.]/g, ''))

  return isNaN(n) ? 0 : n
}

const fetchItem = async (name, signal) => {
  const res = await fetch(`${API_ITEM}?name=${encodeURIComponent(name)}`, { signal })

  if (res.ok == false) throw new Error('server error')

  return res.json()
}

const getMarketUrl = name => `${MARKET_LISTINGS_BASE}${encodeURIComponent(name)}`

const InspectIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M6 2H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9M9 1h5v5M14 1L7.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
)

const EditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M11.5 1.5a1.5 1.5 0 0 1 2 2L5 12l-3 1 1-3 8.5-8.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
)

export default function ListView({ rawList, onBack }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    const names = parseItems(rawList)
    setItems(names.map(name => ({ name, status: 'loading', price: null, url: null, hash: null })))
    const controller = new AbortController()

    names.forEach(async name => {
      try {
        const data = await fetchItem(name, controller.signal)
        setItems(prev => prev.map(val =>
          val.name === name ? { ...val, status: 'done', ...data } : val
        ))
      } catch (err) {
        if (err.name === 'AbortError') return

        setItems(prev => prev.map(val =>
          val.name === name ? { ...val, status: 'error' } : val
        ))
      }
    })

    return () => controller.abort()
  }, [rawList])

  const total = items.reduce((sum, val) => sum + parseDollars(val.price), 0)
  const allDone = items.length > 0 && items.every(val => val.status !== 'loading')

  const openInspect = () => items
    .filter(val => val.url)
    .forEach(val => window.open(val.url, '_blank'))

  return (
    <div className={styles.container}>
      <ul className={styles.list}>
        {items.map(val => (
          <li key={val.name} className={styles.item}>
            <div className={styles.thumb}>
              {val.url
                ? <a href={val.url} target="_blank" rel="noreferrer">
                    <img src={`${API_IMAGES}${val.hash}`} alt={val.name} width={62} height={62} />
                  </a>
                : <div className={styles.thumbPlaceholder} />
              }
            </div>
            <a className={styles.name} href={getMarketUrl(val.name)} target="_blank" rel="noreferrer">
              {val.name}
            </a>
            <span className={styles.price}>
              {val.status === 'loading' && <span className={styles.skeleton} />}
              {val.status === 'done' && (val.price ?? <span className={styles.na}>N/A</span>)}
              {val.status === 'error' && <span className={styles.na}>N/A</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className={styles.total}>
        <span>Total</span>
        {allDone ? <span>${total.toFixed(2)}</span> : <span className={styles.skeleton} />}
      </div>

      <div className={styles.actions}>
        <button className={styles.inspectBtn} type="button" onClick={openInspect}>
          <InspectIcon />
          Inspect
        </button>

        <button className={styles.back} onClick={onBack}>
          <EditIcon />
          Edit List
        </button>
      </div>
    </div>
  )
}
