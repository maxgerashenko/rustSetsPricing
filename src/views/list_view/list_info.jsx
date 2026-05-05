import styles from './list_view.module.css'
import { parseDollars } from '../../shared/utils.js'

export const getItemStats = items => {
  const resolved = items.filter(val => val.status === 'done' && val.price)
  const unresolvedCount = items.filter(val => val.status === 'error' || (val.status === 'done' && !val.price)).length
  const total = resolved.reduce((sum, val) => sum + parseDollars(val.price), 0)
  const allDone = items.length > 0 && items.every(val => val.status !== 'loading')
  const topItem = resolved.reduce(
    (best, val) => (parseDollars(val.price) > parseDollars(best?.price ?? '0') ? val : best),
    null,
  )

  return { resolved, unresolvedCount, total, allDone, topItem }
}

export default function ListInfo({ items, currency, setCurrency }) {
  const { resolved, unresolvedCount } = getItemStats(items)

  return (
    <div className={styles.metaStrip}>
      <div className={styles.metaLeft}>
        <span className={styles.pulse} />
        <span>
          {resolved.length} resolved
          {unresolvedCount > 0 && ` · ${unresolvedCount} unknown`}
        </span>
      </div>
      <div className={styles.seg}>
        <button
          type="button"
          className={currency === 'USD' ? styles.segOn : ''}
          onClick={() => setCurrency('USD')}
        >USD</button>
        <button
          type="button"
          className={currency === 'EUR' ? styles.segOn : ''}
          onClick={() => setCurrency('EUR')}
        >EUR</button>
      </div>
    </div>
  )
}
