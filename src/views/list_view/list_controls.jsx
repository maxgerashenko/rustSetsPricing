import { useState } from 'react'
import styles from './list_view.module.css'
import { formatPrice, getMarketUrl } from '../../shared/utils.js'
import { CheckIcon, CopyIcon, EditIcon, InspectIcon } from '../../shared/icons.jsx'
import { getItemStats } from './list_info.jsx'

export default function ListControls({ items, currency, setHash, onEdit }) {
  const [shared, setShared] = useState(false)
  const { resolved, total } = getItemStats(items)

  const openInspect = () => items
    .forEach(val => window.open(getMarketUrl(val.name), '_blank'))

  const shareSet = async () => {
    if (!setHash) return
    const url = `${window.location.origin}${window.location.pathname}?set=${setHash}`
    try { await navigator.clipboard.writeText(url) } catch {}
    setShared(true)
    setTimeout(() => setShared(false), 1400)
  }

  return (
    <div className={styles.actions}>
      <button className={styles.actionBtn} type="button" onClick={openInspect} title="Open each item on the Steam Market">
        <InspectIcon />
        Inspect
      </button>
      <button className={styles.actionBtn} type="button" onClick={shareSet} disabled={!setHash}>
        {shared ? <CheckIcon /> : <CopyIcon />}
        {shared ? 'Shared' : 'Share'}
      </button>
      <button className={styles.actionBtnPrimary} type="button" onClick={onEdit}>
        <EditIcon />
        Edit List
      </button>
    </div>
  )
}
