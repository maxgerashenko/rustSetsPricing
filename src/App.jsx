import styles from './App.module.css'
import ListInput from './ListInput.jsx'

export default function App() {
  function handleSubmit(value) {
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

        <ListInput onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
