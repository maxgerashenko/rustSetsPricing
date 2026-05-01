import { useState } from 'react'
import styles from './App.module.css'

export default function App() {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!value.trim()) return
    // TODO: parse items and fetch prices
    console.log('items:', value)
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.badge}>RUST MARKET</div>
        <h1 className={styles.title}>
          Price your<br />
          <span className={styles.accent}>skin set</span>
        </h1>
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
              rows={4}
              spellCheck={false}
            />
            <button className={styles.button} type="submit" disabled={!value.trim()}>
              Get Prices
            </button>
          </div>
          <p className={styles.hint}>One item per line, or comma-separated</p>
        </form>
      </div>
    </div>
  )
}
