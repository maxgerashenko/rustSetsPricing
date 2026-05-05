import { useState } from 'react'
import styles from './app.module.css'
import InputView from './input_view.jsx'
import ListView from './list_view.jsx'

export default function App() {
  const [list, setList] = useState(null)

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <span className={styles.tag}>
          <span className={styles.tagDot} />
          Junkpile · Skin Pricer
        </span>
        <h1 className={styles.headline}>
          Price your
          <span className={styles.accent}>skin set</span>
        </h1>

        {list
          ? <ListView rawList={list} onBack={() => setList(null)} />
          : <InputView onSubmit={setList} />
        }
      </div>
    </div>
  )
}
