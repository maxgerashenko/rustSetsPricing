import { useState } from 'react'
import styles from './list_view.module.css'
import { formatPrice, getMarketUrl } from '../../shared/utils.js'
import { CheckIcon, CopyIcon, EditIcon, InspectIcon } from '../../shared/icons.jsx'
import { getItemStats } from './list_info.jsx'

export default function ListControls({ items, currency, onEdit }) {
  const [copied, setCopied] = useState(false)
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
    <div className={styles.actions}>
      <button className={styles.actionBtn} type="button" onClick={openInspect} title="Open each item on the Steam Market">
        <InspectIcon />
        Inspect
      </button>
      <button className={styles.actionBtn} type="button" onClick={copyTotal}>
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <button className={styles.actionBtnPrimary} type="button" onClick={onEdit}>
        <EditIcon />
        Edit List
      </button>
    </div>
  )
}
