import { useNavigate } from 'react-router-dom'
import styles from './sets_list.module.css'
import { parseDollars, formatPrice } from '../../shared/utils.js'

export default function SetItem({ set, currency }) {
  const total = set.items.reduce((sum, item) => sum + (parseDollars(item.price) || 0), 0)
  const setHash = set.hash
  const navigate = useNavigate()

  const handleSetClick = () => {
    navigate(`/list?set=${setHash}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSetClick()
    }
  }

  return (
    <div className={styles.card} onClick={handleSetClick} onKeyDown={handleKeyDown} role="button" tabIndex={0}>
      <div className={styles.setContent}>
        <div className={styles.icons}>
          {set.items.map((item, idx) => (
            <div key={idx} className={styles.iconWrapper}>
              <div className={styles.icon}>
                {item.url
                  ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      title={item.name}
                      width={48}
                      height={48}
                    />
                  )
                  : <div className={styles.iconPlaceholder} />
                }
              </div>
            </div>
          ))}
        </div>

        <div className={styles.info}>
          <div className={styles.itemCount}>
            {set.items.length} item{set.items.length !== 1 ? 's' : ''}
          </div>
          <div className={styles.totalPrice}>
            {formatPrice(total, currency)}
          </div>
        </div>
      </div>
    </div>
  )
}
