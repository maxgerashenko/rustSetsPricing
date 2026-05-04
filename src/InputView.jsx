import { useState } from 'react'
import styles from './App.module.css'

const cleanLines = text => text.split('\n').filter(val => val.trim()).join('\n')

const CheckIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M12.5 4L6 11.5 2.5 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
)

const PasteIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="5" y="1" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M3 4H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
)

export default function InputView({ onSubmit }) {
  const [value, setValue] = useState(() => localStorage.getItem('lastList') ?? '')
  const [pasted, setPasted] = useState(false)

  const isEmpty = value.trim() === ''

  const handleChange = e => setValue(e.target.value)

  const handleTextareaPaste = e => {
    e.preventDefault()
    setValue(cleanLines(e.clipboardData.getData('text')))
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

  const handleSubmit = e => {
    e.preventDefault()

    if (isEmpty) return

    localStorage.setItem('lastList', value)
    onSubmit?.(value)
  }

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit}>
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
          <div className={styles.actions}>
            <button className={styles.pasteBtn} type="button" onClick={handlePaste}>
              {pasted ? <CheckIcon /> : <PasteIcon />}
              {pasted ? 'Pasted!' : 'Paste'}
            </button>
            <button className={styles.button} type="submit" disabled={isEmpty}>
              Get Prices
            </button>
          </div>
        </div>
        <p className={styles.hint}>One item per line, or comma-separated</p>
      </form>
    </>
  )
}
