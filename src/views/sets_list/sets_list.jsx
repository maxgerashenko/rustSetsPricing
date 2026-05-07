import { useEffect, useState } from 'react'
import styles from './sets_list.module.css'
import appStyles from '../../app.module.css'
import SetItem from './set_item.jsx'

export default function SetsList({ onBack }) {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('USD')

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const res = await fetch('/api/sets')
        if (res.ok) {
          const data = await res.json()
          setSets(data.sets)
        }
      } catch (err) {
        console.error('Failed to fetch sets:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSets()
  }, [])

  const handleDelete = async (setHash) => {
    try {
      const res = await fetch(`/api/sets/${setHash}`, { method: 'DELETE' })
      if (res.ok) {
        setSets(sets.filter(set => set.hash !== setHash))
      }
    } catch (err) {
      console.error('Failed to delete set:', err)
    }
  }

  return (
    <div className={`${styles.container} ${appStyles.fadeIn}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Your Sets</h2>
        <div className={styles.currencyToggle}>
          <button
            className={`${styles.currencyBtn} ${currency === 'USD' ? styles.currencyBtnActive : ''}`}
            onClick={() => setCurrency('USD')}
          >
            USD
          </button>
          <button
            className={`${styles.currencyBtn} ${currency === 'EUR' ? styles.currencyBtnActive : ''}`}
            onClick={() => setCurrency('EUR')}
          >
            EUR
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading sets...</div>
      ) : (
        <div className={styles.listPanel}>
          {sets.length === 0 ? (
            <div className={styles.empty}>No sets yet. Create one to get started.</div>
          ) : (
            <div className={styles.setsList}>
              {sets.map(set => (
                <SetItem
                  key={set.hash}
                  set={set}
                  currency={currency}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
          <div className={styles.countBar}>
            <span className={appStyles.parseCount}>
              <b>{sets.length}</b> · {sets.length === 1 ? 'set' : 'sets'} saved
            </span>
            <span className={styles.tagline}>
              {sets.length === 0
                ? 'No sets yet'
                : sets.length === 1
                  ? 'Just one so far'
                  : 'All sets are unique'}
            </span>
            <button className={styles.newSetBtn} type="button" onClick={onBack}>
              + Add new set
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
