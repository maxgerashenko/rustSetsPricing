import { useState } from 'react'
import styles from './App.module.css'

export default function ListInput({ onSubmit }) {
  const [value, setValue] = useState('')
  const [pasted, setPasted] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!value.trim()) return
    onSubmit?.(value)
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      setValue(text)
      setPasted(true)
      setTimeout(() => setPasted(false), 1500)
    } catch {
      // user denied clipboard permission — ignore
    }
  }

  return (
    <>
      <p className={styles.subtitle}>
        Paste item names to get live Steam Market prices
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputWrapper}>
          <textarea
            className={styles.input}
            placeholder={`Burlap Shirt\nLeather Gloves\nWood Armor Helmet`}
            value={value}
            onChange={e => setValue(e.target.value)}
            rows={7}
            spellCheck={false}
          />
          <div className={styles.actions}>
            <button
              className={styles.pasteBtn}
              type="button"
              onClick={handlePaste}
            >
              {pasted ? (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M12.5 4L6 11.5 2.5 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="5" y="1" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M3 4H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              )}
              {pasted ? 'Pasted!' : 'Paste'}
            </button>
            <button className={styles.button} type="submit" disabled={!value.trim()}>
              Get Prices
            </button>
          </div>
        </div>
        <p className={styles.hint}>One item per line, or comma-separated</p>
      </form>
    </>
  )
}
