import styles from './list_view.module.css'
import { API_IMAGES } from '../../shared/constants.js'
import { parseDollars, formatPrice, getMarketUrl } from '../../shared/utils.js'
import { sortItems } from '../../shared/itemSorting.js'
import { getItemStats } from './list_info.jsx'

const isUnresolved = val => val.status === 'error' || (val.status === 'done' && !val.price)

export default function ItemsList({ items, currency }) {
  const { resolved, total, allDone, topItem } = getItemStats(items)
  const sortedItems = sortItems(items)

  const handleItemClick = (url) => {
    if (url) window.open(url, '_blank')
  }

  return (
    <>
      <ul className={styles.list}>
        {sortedItems.map(val => {
          const unresolved = isUnresolved(val)
          const itemLoading = val.status === 'loading'
          const priceNum = parseDollars(val.price)

          return (
            <li
              key={val.name}
              className={`${styles.item} ${itemLoading ? styles.itemLoading : ''} ${unresolved ? styles.itemUnresolved : ''}`}
              onClick={() => handleItemClick(getMarketUrl(val.name))}
            >
              <div
                className={styles.thumb}
                onClick={(e) => {
                  e.stopPropagation()
                  if (val.url) window.open(val.url, '_blank')
                }}
              >
                {val.url
                  ? <img src={`${API_IMAGES}${val.hash}`} alt={val.name} width={96} height={86} />
                  : <div className={styles.thumbPlaceholder} />
                }
              </div>
              <div className={styles.name}>
                <span>{val.name}</span>
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
