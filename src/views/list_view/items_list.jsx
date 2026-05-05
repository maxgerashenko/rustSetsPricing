import styles from './list_view.module.css'
import { API_IMAGES } from '../../shared/constants.js'
import { parseDollars, formatPrice, getMarketUrl } from '../../shared/utils.js'
import { getItemStats } from './list_info.jsx'

const isUnresolved = val => val.status === 'error' || (val.status === 'done' && !val.price)

export default function ItemsList({ items, currency }) {
  const { resolved, total, allDone, topItem } = getItemStats(items)

  return (
    <>
      <ul className={styles.list}>
        {items.map(val => {
          const unresolved = isUnresolved(val)
          const itemLoading = val.status === 'loading'
          const priceNum = parseDollars(val.price)

          return (
            <li
              key={val.name}
              className={`${styles.item} ${itemLoading ? styles.itemLoading : ''} ${unresolved ? styles.itemUnresolved : ''}`}
            >
              <div className={styles.thumb}>
                {val.url
                  ? <a href={val.url} target="_blank" rel="noreferrer">
                      <img src={`${API_IMAGES}${val.hash}`} alt={val.name} width={44} height={44} />
                    </a>
                  : <div className={styles.thumbPlaceholder} />
                }
              </div>
              <div className={styles.name}>
                <a href={getMarketUrl(val.name)} target="_blank" rel="noreferrer">
                  {val.name}
                </a>
                {unresolved && <span className={styles.meta}>Unmatched</span>}
              </div>
              <div className={styles.price}>
                {itemLoading && <span className={styles.skeleton} style={{ width: 56, height: 14 }} />}
                {!itemLoading && !unresolved && formatPrice(priceNum, currency)}
                {!itemLoading && unresolved && <span className={styles.notFound}>not found</span>}
              </div>
            </li>
          )
        })}
      </ul>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statKey}>Items</span>
          <span className={styles.statVal}>{resolved.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statKey}>Top Item</span>
          <span className={styles.statVal} style={{ fontSize: 12 }}>
            {topItem ? topItem.name.split(' ')[0] : '—'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statKey}>Avg</span>
          <span className={styles.statVal}>
            {resolved.length ? formatPrice(total / resolved.length, currency) : '—'}
          </span>
        </div>
      </div>

      <div className={styles.total}>
        <span className={styles.totalLabel}>Total</span>
        <span className={styles.totalAmount}>
          {allDone
            ? formatPrice(total, currency)
            : <span className={styles.skeleton} style={{ width: 90, height: 22 }} />
          }
        </span>
      </div>
    </>
  )
}
