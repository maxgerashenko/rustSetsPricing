import { useEffect, useState } from 'react'
import styles from './list_view.module.css'
import appStyles from '../../app.module.css'
import { API_ITEM } from '../../shared/constants.js'
import { parseItems } from '../../shared/utils.js'
import ItemsList from './items_list.jsx'
import ListInfo from './list_info.jsx'
import ListControls from './list_controls.jsx'

const fetchItem = async (name, signal) => {
  const res = await fetch(`${API_ITEM}?name=${encodeURIComponent(name)}`, { signal })

  if (res.ok == false) throw new Error('server error')

  return res.json()
}

export default function ListView({ rawList, onBack }) {
  const [items, setItems] = useState([])
  const [currency, setCurrency] = useState('USD')

  useEffect(() => {
    const names = parseItems(rawList)
    setItems(names.map(name => ({ name, status: 'loading', price: null, url: null, hash: null })))
    const controller = new AbortController()

    const run = async () => {
      const hashes = []

      await Promise.all(names.map(async (name, idx) => {
        try {
          const data = await fetchItem(name, controller.signal)
          hashes[idx] = data.hash
          setItems(prev => prev.map(val =>
            val.name === name ? { ...val, status: 'done', ...data } : val
          ))
        } catch (err) {
          if (err.name === 'AbortError') return

          setItems(prev => prev.map(val =>
            val.name === name ? { ...val, status: 'error' } : val
          ))
        }
      }))

      const validHashes = hashes.filter(hash => hash != null)
      if (validHashes.length === 0) return

      await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: names, hashes: validHashes }),
        signal: controller.signal,
      }).catch(() => {})
    }

    run()

    return () => controller.abort()
  }, [rawList])

  return (
    <div className={`${styles.container} ${appStyles.fadeIn}`}>
      <ListInfo items={items} currency={currency} setCurrency={setCurrency} />

      <div className={styles.card}>
        <ItemsList items={items} currency={currency} />
        <ListControls items={items} currency={currency} onEdit={onBack} />
      </div>

      <button className={styles.foothint} type="button" onClick={onBack}>
        ← New list
      </button>
    </div>
  )
}
