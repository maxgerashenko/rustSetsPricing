import { useMemo, useState } from 'react'
import styles from './App.module.css'

const cleanLines = text => text.split('\n').filter(val => val.trim()).join('\n')

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M12.5 4L6 11.5 2.5 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
)

const PasteIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="5" y="1" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M3 4H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
)

const ArrowIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
)

export default function InputView({ onSubmit }) {
  const [value, setValue] = useState(() => localStorage.getItem('lastList') ?? '')
  const [pasted, setPasted] = useState(false)

  const lines = useMemo(
    () => value.split(/[\n,]+/g).map(s => s.trim()).filter(Boolean),
    [value]
  )
  const isEmpty = lines.length === 0

  const handleChange = evt => setValue(evt.target.value)

  const handleTextareaPaste = evt => {
    evt.preventDefault()
    setValue(cleanLines(evt.clipboardData.getData('text')))
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setValue(cleanLines(text))
      setPasted(true)
      setTimeout(() => setPasted(false), 1500)
    } catch {
      // user denied clipboard permission — ignore
    }
  }

  const handleSubmit = evt => {
    evt.preventDefault()

    if (isEmpty) return

    localStorage.setItem('lastList', value)
    onSubmit?.(value)
  }

  return (
    <>
      <form className={`${styles.form} ${styles.fadeIn}`} onSubmit={handleSubmit}>
        <div className={styles.inputWrapper}>
          <textarea
            className={styles.input}
            placeholder="Paste item names to get live Steam Market prices"
            value={value}
            onChange={handleChange}
            onPaste={handleTextareaPaste}
            rows={7}
            spellCheck={false}
          />
          <div className={styles.parseRow}>
            <span className={styles.parseCount}>
              <b>{lines.length}</b> · {lines.length === 1 ? 'item' : 'items'} detected
            </span>
            <span>One per line · or comma-separated</span>
          </div>
          <div className={styles.actions}>
            <button className={styles.pasteBtn} type="button" onClick={handlePaste}>
              {pasted ? <CheckIcon /> : <PasteIcon />}
              {pasted ? 'Pasted!' : 'Paste'}
            </button>
            <button className={styles.button} type="submit" disabled={isEmpty}>
              Get Prices <ArrowIcon />
            </button>
          </div>
        </div>
        <p className={styles.hint}>Pulls live community-market medians · refreshed every 5 min</p>
      </form>
    </>
  )
}
