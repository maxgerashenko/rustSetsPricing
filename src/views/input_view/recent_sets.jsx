import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './recent_sets.module.css'
import appStyles from '../../app.module.css'
import { parseDollars, formatPrice } from '../../shared/utils.js'
import { sortItems } from '../../shared/itemSorting.js'

export default function RecentSets({ onViewAll }) {
  const [data, setData] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch('/api/sets?limit=3')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error('Failed to fetch recent sets:', err)
      }
    }

    fetchRecent()
  }, [])

  if (!data || data.sets.length === 0) return null

  const handleSetClick = (hash) => {
    navigate(`/list?set=${hash}`)
  }

  return (
    <section className={styles.recent}>
      <div className={styles.list}>
        {data.sets.map(set => {
          const total = set.items.reduce((sum, item) => sum + (parseDollars(item.price) || 0), 0)
          const sortedItems = sortItems(set.items)

          return (
            <button
              key={set.hash}
              className={styles.row}
              type="button"
              onClick={() => handleSetClick(set.hash)}
            >
              <div className={styles.icons}>
                {sortedItems.slice(0, 4).map((item, idx) => (
                  <div key={idx} className={styles.icon}>
                    {item.url
                      ? (
                        <img
                          src={item.url}
                          alt={item.name}
                          title={item.name}
                          width={32}
                          height={32}
                        />
                      )
                      : <div className={styles.iconPlaceholder} />
                    }
                  </div>
                ))}
              </div>
              <div className={styles.price}>{formatPrice(total, 'USD')}</div>
            </button>
          )
        })}
      </div>

      <div className={styles.header}>
        <span className={styles.count}>
          <b>{data.total}</b> · {data.total === 1 ? 'set' : 'sets'} saved
        </span>
        <button className={styles.viewAll} type="button" onClick={onViewAll}>
          View all
        </button>
      </div>
    </section>
  )
}
