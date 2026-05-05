import { useEffect, useState } from 'react'
import styles from './list_view.module.css'
import appStyles from './app.module.css'
import { API_ITEM } from './constants.js'
import { parseItems, formatPrice, getMarketUrl } from './utils.js'
import { CheckIcon, CopyIcon, EditIcon, InspectIcon } from './icons.jsx'
import ItemsList from './items_list.jsx'
import ListInfo, { getItemStats } from './list_info.jsx'

const fetchItem = async (name, signal) => {
  const res = await fetch(`${API_ITEM}?name=${encodeURIComponent(name)}`, { signal })

  if (res.ok == false) throw new Error('server error')

  return res.json()
}

export default function ListView({ rawList, onBack }) {
  const [items, setItems] = useState([])
  const [currency, setCurrency] = useState('USD')
  const [copied, setCopied] = useState(false)

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

  const { resolved, total } = getItemStats(items)

  const openInspect = () => items
    .forEach(val => window.open(getMarketUrl(val.name), '_blank'))

  const copyTotal = async () => {
    const text = `Junkpile total: ${formatPrice(total, currency)} (${resolved.length} items)`
    try { await navigator.clipboard.writeText(text) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className={`${styles.container} ${appStyles.fadeIn}`}>
      <ListInfo items={items} currency={currency} setCurrency={setCurrency} />

      <div className={styles.card}>
        <ItemsList items={items} currency={currency} />

        <div className={styles.actions}>
          <button className={styles.actionBtn} type="button" onClick={openInspect} title="Open each item on the Steam Market">
            <InspectIcon />
            Inspect
          </button>
          <button className={styles.actionBtn} type="button" onClick={copyTotal}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button className={styles.actionBtnPrimary} type="button" onClick={onBack}>
            <EditIcon />
            Edit List
          </button>
        </div>
      </div>

      <button className={styles.foothint} type="button" onClick={onBack}>
        ← New list
      </button>
    </div>
  )
}
