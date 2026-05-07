import { useEffect, useState } from 'react'
import styles from './sets_list.module.css'
import appStyles from '../../app.module.css'
import SetItem from './set_item.jsx'
import { useSnackbar } from '../../shared/snackbar/snackbar.jsx'
import { SNACKBAR_DELETE_DELAY_MS } from '../../shared/constants.js'

export default function SetsList({ onBack }) {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('USD')
  const { confirm } = useSnackbar()

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

  const handleDelete = (setHash) => {
    const previous = sets
    setSets(prev => prev.filter(set => set.hash !== setHash))
    confirm({
      message: 'Set will be deleted in {n}',
      actionLabel: 'Cancel',
      delayMs: SNACKBAR_DELETE_DELAY_MS,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/sets/${setHash}`, { method: 'DELETE' })
          if (!res.ok) setSets(previous)
        } catch (err) {
          console.error('Failed to delete set:', err)
          setSets(previous)
        }
      },
      onCancel: () => setSets(previous),
    })
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
