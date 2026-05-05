import { useMemo, useState } from 'react'
import styles from './app.module.css'
import { ArrowIcon, CheckIcon, PasteIcon } from './icons.jsx'

const cleanLines = text => text.split('\n').filter(val => val.trim()).join('\n')

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
